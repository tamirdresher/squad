import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, readFile, rm, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { LocalMemoryStore } from '../packages/squad-sdk/src/memory/index.js';
import { FSStorageProvider } from '../packages/squad-sdk/src/storage/fs-storage-provider.js';
import { createStateMcpSession } from '../packages/squad-cli/src/cli/commands/state-mcp.js';
import { clearResolveSquadCache } from '../packages/squad-sdk/src/resolution.js';
import { discoverMemoryProviders } from '../packages/squad-sdk/src/memory/discovery.js';

let root: string;
let outside: string;
const factory = `
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
export async function createMemoryProvider({projectRoot, options}) {
  const file = path.join(projectRoot, 'replicas.json');
  let records = JSON.parse(await readFile(file, 'utf8').catch(e => {if(e.code === 'ENOENT')return '{}'; throw e;}));
  return {id: options.id ?? 'fixture-provider', name:'Synthetic fixture', supportedClasses:['LOCAL','DECISION','POLICY'],
    status: async()=>({id:'fixture-provider',name:'Synthetic fixture',available:true}),
    write: async request => { if(options.failWrite) throw Error('synthetic provider write failed');
      if(options.invalidAcknowledgement) return {id:''};
      if(!request.sourceId) throw Error('native stable identity missing');
      records[request.sourceId]={id:'replica-'+request.sourceId,title:request.title,snippet:request.content,
        class:request.classification.class,loadGuidance:request.classification.loadGuidance};
      await writeFile(file,JSON.stringify(records));return {id:'replica-'+request.sourceId};},
    search:async query=>Object.values(records).filter(r=>r.snippet.includes(query)),
    delete:async()=>false};
}`;

async function configure(entry: unknown = { module: '.squad/providers/fixture.mjs', trusted: true }) {
  await writeFile(path.join(root, '.squad', 'config.json'), JSON.stringify({ memory: { providers: [entry] } }));
}
function store() { return new LocalMemoryStore(new FSStorageProvider(root), root); }
beforeEach(async () => {
  root = path.resolve('.scratch', `native-discovery-${randomUUID()}`);
  outside = path.resolve('.scratch', `native-outside-${randomUUID()}`);
  await mkdir(path.join(root, '.squad', 'providers'), { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(path.join(root, '.squad', 'providers', 'fixture.mjs'), factory);
});
afterEach(async () => {
  clearResolveSquadCache();
  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

describe('native optional memory provider discovery', () => {
  it.each([{}, { memory: {} }, { memory: { providers: [] } }])('preserves empty optional config compatibility %j', async config => {
    await writeFile(path.join(root, '.squad', 'config.json'), JSON.stringify(config));
    expect((await store().providerStatus()).registeredProviders).toEqual([]);
  });
  it.each(['{broken', 'null', '{"memory":[]}', '{"memory":{"providers":{}}}'])('rejects invalid project configuration %s', async config => {
    await writeFile(path.join(root, '.squad', 'config.json'), config);
    await expect(store().search('control')).rejects.toThrow();
  });
  it('initializes factories once per store and reinitializes on restart', async () => {
    await writeFile(path.join(root, '.squad', 'providers', 'fixture.mjs'),
      factory.replace("const file = path.join(projectRoot, 'replicas.json');", `
      const counter = path.join(projectRoot, 'factory-count.txt');
      const count = await readFile(counter,'utf8').catch(e=>{if(e.code==='ENOENT')return '0';throw e;});
      await writeFile(counter,String(Number(count)+1));
      const file = path.join(projectRoot, 'replicas.json');`));
    await configure();
    const memory = store();
    await Promise.all([memory.providerStatus(), memory.search('control')]);
    expect(await readFile(path.join(root, 'factory-count.txt'), 'utf8')).toBe('1');
    await store().providerStatus();
    expect(await readFile(path.join(root, 'factory-count.txt'), 'utf8')).toBe('2');
  });
  it('validates all entries before executing any configured module', async () => {
    await writeFile(path.join(root, '.squad', 'providers', 'fixture.mjs'), `throw Error('module must not run');`);
    await writeFile(path.join(root, '.squad', 'config.json'), JSON.stringify({ memory: { providers: [
      { module: '.squad/providers/fixture.mjs', trusted: true },
      { module: 'https://example.invalid/provider.mjs', trusted: true },
    ] } }));
    await expect(store().search('control')).rejects.toThrow('not URLs');
  });
  it('rejects a redirected squad configuration root', async () => {
    await rm(path.join(root, '.squad'), { recursive: true });
    await writeFile(path.join(outside, 'config.json'), JSON.stringify({ memory: { providers: [
      { module: 'unused.mjs', trusted: true },
    ] } }));
    await symlink(outside, path.join(root, '.squad'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(discoverMemoryProviders(new FSStorageProvider(), path.join(root, '.squad')))
      .rejects.toThrow('configuration escapes');
  });
  it.each(['local', 'copilot', 'hostInjectedCopilotAdapter'])('rejects otherwise valid reserved provider %s', async id => {
    await configure({ module: '.squad/providers/fixture.mjs', trusted: true, options: { id } });
    await expect(store().search('control')).rejects.toThrow('reserved provider');
  });
  it('rejects missing or uncompiled modules', async () => {
    await configure({ module: 'missing.mjs', trusted: true });
    await expect(store().search('control')).rejects.toThrow('ENOENT');
    await writeFile(path.join(root, 'provider.ts'), factory);
    await configure({ module: 'provider.ts', trusted: true });
    await expect(store().search('control')).rejects.toThrow('compiled JavaScript');
  });
  it('leaves absent configuration on ordinary local behavior', async () => {
    const memory = store();
    expect((await memory.providerStatus()).registeredProviders).toEqual([]);
    expect((await memory.write({ content: 'synthetic local control', requestedClass: 'LOCAL' })).stored).toBe(true);
    expect(await memory.search('synthetic local control')).toHaveLength(1);
  });
  it.each(['relative', 'absolute'])('loads contained %s project module and records exact source identity', async kind => {
    await configure({ module: kind === 'relative' ? '.squad/providers/fixture.mjs'
      : path.join(root, '.squad', 'providers', 'fixture.mjs'), trusted: true });
    const memory = store();
    const write = await memory.write({ content: 'native shared synthetic fact', requestedClass: 'DECISION' });
    const replicas = JSON.parse(await readFile(path.join(root, 'replicas.json'), 'utf8'));
    expect(replicas[write.id!].snippet).toBe('native shared synthetic fact');
    expect((await store().providerStatus()).registeredProviders.map(provider => provider.id)).toEqual(['fixture-provider']);
    expect(await store().search('native shared')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: `replica-${write.id}`, provider: 'fixture-provider', snippet: 'native shared synthetic fact' }),
    ]));
    expect(await memory.auditLog()).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'configure', provider: 'fixture-provider' }),
    ]));
  });
  it('excludes deleted/promoted source replicas after restart and preserves legitimate successor content', async () => {
    await configure();
    const memory = store();
    const deleted = await memory.write({ content: 'obsolete deleted synthetic', requestedClass: 'DECISION' });
    const prior = await memory.write({ content: 'obsolete promoted synthetic', requestedClass: 'DECISION' });
    await memory.delete(deleted.id!);
    const successor = await memory.promote(prior.id!, 'POLICY');
    const results = await store().search('obsolete');
    expect(results.some(row => [deleted.id, prior.id, `replica-${deleted.id}`, `replica-${prior.id}`].includes(row.id))).toBe(false);
    expect(results).toEqual(expect.arrayContaining([expect.objectContaining({ id: successor.id })]));
    expect(JSON.parse(await readFile(path.join(root, 'replicas.json'), 'utf8'))).toHaveProperty(deleted.id!);
  });
  it.each([
    { module: '.squad/providers/fixture.mjs' },
    { module: '.squad/providers/fixture.mjs', trusted: false },
    { module: 'https://example.invalid/module.js', trusted: true },
    { module: '.squad/providers/fixture.mjs', trusted: true, options: [] },
  ])('rejects malformed/unacknowledged module entry %j', async entry => {
    await configure(entry);
    await expect(store().search('control')).rejects.toThrow();
    expect(await readFile(path.join(root, '.squad', 'memory', 'audit.jsonl'), 'utf8')).toContain('discovery failed');
  });
  it('rejects path traversal and directory-junction escapes before executing outside code', async () => {
    await writeFile(path.join(outside, 'fixture.mjs'), `throw Error('outside code must not run');`);
    for (const module of [path.join(outside, 'fixture.mjs'), path.relative(root, path.join(outside, 'fixture.mjs'))]) {
      await configure({ module, trusted: true });
      await expect(store().search('control')).rejects.toThrow('escapes');
    }
    await symlink(outside, path.join(root, 'junction'), process.platform === 'win32' ? 'junction' : 'dir');
    await configure({ module: 'junction/fixture.mjs', trusted: true });
    await expect(store().search('control')).rejects.toThrow('escapes');
  });
  it.each([
    'export default () => ({});',
    'export const createMemoryProvider = 12;',
    'export function createMemoryProvider(){return {id:"copilot"};}',
    'export function createMemoryProvider(){throw Error("synthetic init failure");}',
  ])('rejects malformed exports/provider shapes/factory failures', async code => {
    await writeFile(path.join(root, '.squad', 'providers', 'fixture.mjs'), code);
    await configure();
    await expect(store().write({ content: 'control', requestedClass: 'LOCAL' })).rejects.toThrow();
    expect(JSON.parse(await readFile(path.join(root, '.squad', 'memory', 'index.json'), 'utf8'))).toEqual([]);
  });
  it('rejects duplicate discovered/injected provider namespaces', async () => {
    await configure();
    const injected = { id: 'fixture-provider', name: 'Injected', supportedClasses: ['LOCAL'] as const,
      status: async () => ({ id: 'fixture-provider', name: 'Injected', available: true }),
      write: async () => ({ id: 'injected' }), search: async () => [], delete: async () => false };
    await expect(new LocalMemoryStore(new FSStorageProvider(root), root, { registeredProviders: [injected] })
      .search('control')).rejects.toThrow('unique');
    await writeFile(path.join(root, '.squad', 'config.json'), JSON.stringify({ memory: { providers: [
      { module: '.squad/providers/fixture.mjs', trusted: true }, { module: '.squad/providers/fixture.mjs', trusted: true },
    ] } }));
    await expect(store().search('control')).rejects.toThrow('unique');
  });
  it('stock state MCP writes use native discovery with no injected registry or sample bridge', async () => {
    await configure();
    const replies: Array<Record<string, unknown>> = [];
    const session = createStateMcpSession(root, reply => replies.push(reply as Record<string, unknown>));
    await session.handleRequest({ id: 1, method: 'tools/call', params: {
      name: 'memory.write', arguments: { content: 'native MCP synthetic proof', class: 'DECISION' },
    } });
    const replicas = JSON.parse(await readFile(path.join(root, 'replicas.json'), 'utf8'));
    expect(Object.values(replicas)).toEqual([expect.objectContaining({ snippet: 'native MCP synthetic proof' })]);
    expect(JSON.stringify(replies[0])).toContain('Stored DECISION memory');
    expect(await readFile(path.join(root, '.squad', 'memory', 'audit.jsonl'), 'utf8')).toContain('fixture-provider');
  });
  it('stock MCP reports replication failure while preserving the ordinary local write', async () => {
    await configure({ module: '.squad/providers/fixture.mjs', trusted: true, options: { failWrite: true } });
    const replies: Array<Record<string, unknown>> = [];
    const session = createStateMcpSession(root, reply => replies.push(reply as Record<string, unknown>));
    await session.handleRequest({ id: 1, method: 'tools/call', params: {
      name: 'memory.write', arguments: { content: 'retained local synthetic proof', class: 'DECISION' },
    } });
    expect(replies[0]!.result).toMatchObject({ isError: true });
    expect(JSON.stringify(replies[0])).toContain('external replication failed for fixture-provider');
    expect(JSON.parse(await readFile(path.join(root, '.squad', 'memory', 'index.json'), 'utf8'))).toHaveLength(1);
    expect(await readFile(path.join(root, '.squad', 'memory', 'audit.jsonl'), 'utf8')).toContain('provider-error');
  });
  it('reports invalid replica acknowledgement rather than silently binding an empty identity', async () => {
    await configure({ module: '.squad/providers/fixture.mjs', trusted: true, options: { invalidAcknowledgement: true } });
    const memory = store();
    const result = await memory.write({ content: 'synthetic acknowledgement control', requestedClass: 'DECISION' });
    expect(result.stored).toBe(true);
    expect(result.providerErrors).toEqual(['fixture-provider']);
    expect(await memory.auditLog()).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'provider-error', provider: 'fixture-provider' }),
    ]));
    const index = JSON.parse(await readFile(path.join(root, '.squad', 'memory', 'index.json'), 'utf8'));
    expect(index[0].replicas).toBeUndefined();
  });
});
