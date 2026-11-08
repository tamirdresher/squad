import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  LocalMemoryStore,
  type CopilotMemoryProviderWriteRequest,
  type MemoryProvider,
  type MemoryProviderSearchResult,
} from '../packages/squad-sdk/src/memory/index.js';
import { InMemoryStorageProvider } from '../packages/squad-sdk/src/storage/in-memory-storage-provider.js';

class StaleProvider implements MemoryProvider {
  readonly name = 'Synthetic stale provider';
  readonly supportedClasses = ['DECISION', 'LOCAL'] as const;
  readonly records = new Map<string, MemoryProviderSearchResult>();
  returned: MemoryProviderSearchResult[] = [];

  constructor(readonly id = 'synthetic-provider') {}
  async status() { return { id: this.id, name: this.name, available: true }; }
  async write(request: CopilotMemoryProviderWriteRequest) {
    const id = request.metadata?.memoryId ?? 'remote-key';
    this.records.set(id, {
      id, title: request.title, snippet: request.content, class: request.classification.class,
      loadGuidance: request.classification.loadGuidance,
    });
    return { id };
  }
  async search() {
    this.returned = [...this.records.values()];
    return this.returned;
  }
  async delete() { return false; } // Deliberately never forgets.
}

class FailingIndexStorage extends InMemoryStorageProvider {
  failIndexRename = false;
  override async rename(from: string, to: string): Promise<void> {
    if (this.failIndexRename && to.endsWith('index.json')) throw new Error('Synthetic index persistence failure');
    await super.rename(from, to);
  }
}

describe('backend-neutral durable replica lifecycle exclusion', () => {
  test.each(['delete', 'promote'] as const)('%s excludes exact retired replica after restart, not content/provider/scope collisions', async operation => {
    const storage = new InMemoryStorageProvider();
    const provider = new StaleProvider();
    const other = new StaleProvider('other-provider');
    const root = path.join(process.cwd(), 'synthetic-project-a');
    const providers = [provider, other];
    const store = new LocalMemoryStore(storage, root, { registeredProviders: [provider] });
    const payload = 'Synthetic distinctive retired decision';
    const local = await store.write({ content: payload, requestedClass: 'DECISION', metadata: { memoryId: 'old-key' } });
    if (!local.id) throw new Error('Missing local id');
    provider.records.set('different-key', { id: 'different-key', title: 'Same text, different identity',
      snippet: payload, class: 'DECISION', loadGuidance: 'ALWAYS' });
    other.records.set('old-key', { id: 'old-key', title: 'Same id, different provider',
      snippet: 'Synthetic legitimate other-provider decision', class: 'DECISION', loadGuidance: 'ALWAYS' });
    if (operation === 'delete') expect(await store.delete(local.id)).toBe(true);
    else expect((await store.promote(local.id, 'POLICY')).stored).toBe(true);
    const fresh = await store.write({
      content: 'Synthetic intentionally reviewed replacement', requestedClass: 'DECISION',
      metadata: { memoryId: 'fresh-reviewed-key' },
    });
    expect(fresh.stored).toBe(true);

    const restarted = new LocalMemoryStore(storage, root, { registeredProviders: providers });
    const results = await restarted.search('Synthetic');
    expect(provider.returned).toContainEqual(expect.objectContaining({ id: 'old-key', snippet: payload }));
    expect(results.filter(result => result.provider === provider.id).map(result => result.id)).toEqual(['different-key', 'fresh-reviewed-key']);
    expect(results).toContainEqual(expect.objectContaining({ id: 'old-key', provider: other.id }));
    expect(results).toContainEqual(expect.objectContaining({ id: 'different-key', snippet: payload }));
    if (operation === 'promote') {
      expect(results).toContainEqual(expect.objectContaining({
        provider: 'local', class: 'POLICY', snippet: expect.stringContaining(payload),
      }));
    }
    const scoped = new LocalMemoryStore(storage, path.join(process.cwd(), 'synthetic-project-b'), { registeredProviders: [provider] });
    expect(await scoped.search('Synthetic')).toContainEqual(expect.objectContaining({ id: 'old-key', provider: provider.id }));
    const persisted: unknown = JSON.parse(await storage.read(path.join(root, '.squad', 'memory', 'index.json')) ?? 'null');
    expect(persisted).toContainEqual(expect.objectContaining({
      id: local.id, replicas: [{ provider: provider.id, id: 'old-key' }],
      status: operation === 'delete' ? 'deleted' : 'superseded',
    }));
  });

  test('tombstone intent excludes local and replica content when later index persistence fails', async () => {
    const storage = new FailingIndexStorage();
    const provider = new StaleProvider();
    const root = path.join(process.cwd(), 'synthetic-failure');
    const store = new LocalMemoryStore(storage, root, { registeredProviders: [provider] });
    const local = await store.write({ content: 'Synthetic failure-boundary payload', requestedClass: 'DECISION' });
    if (!local.id) throw new Error('Missing local id');
    storage.failIndexRename = true;
    await expect(store.delete(local.id)).rejects.toThrow('index persistence failure');
    storage.failIndexRename = false;
    expect(await storage.exists(path.join(root, '.squad', 'memory', 'tombstones', `${local.id}.json`))).toBe(true);
    const restarted = new LocalMemoryStore(storage, root, { registeredProviders: [provider] });
    expect(await restarted.search('failure-boundary')).toEqual([]);
    expect(provider.returned).toContainEqual(expect.objectContaining({ snippet: 'Synthetic failure-boundary payload' }));
  });

  test('provider search failures remain audited without rolling back ordinary local retrieval', async () => {
    const storage = new InMemoryStorageProvider();
    const provider = new StaleProvider();
    const root = path.join(process.cwd(), 'synthetic-error');
    const store = new LocalMemoryStore(storage, root, { registeredProviders: [provider] });
    await store.write({ content: 'Synthetic valid local control', requestedClass: 'LOCAL' });
    provider.search = async () => { throw new Error('Synthetic raw provider detail'); };
    expect(await store.search('valid local control')).toContainEqual(expect.objectContaining({ provider: 'local' }));
    const audit = await storage.read(path.join(root, '.squad', 'memory', 'audit.jsonl'));
    expect(audit).toContain('"action":"provider-error"');
    expect(audit).not.toContain('Synthetic raw provider detail');
  });

  test('ambiguous registered provider namespaces are rejected', () => {
    expect(() => new LocalMemoryStore(new InMemoryStorageProvider(), process.cwd(), {
      registeredProviders: [new StaleProvider(), new StaleProvider()],
    })).toThrow('provider ids must be unique');
  });
});
