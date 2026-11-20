import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { DelegatedToolChunks, type ToolCall } from '../src/delegated-tools.js';
import { Replica } from '../src/storage.js';
import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';

test('delegated MCP contract: real Yjs batch bytes traverse create/list/read with pagination and SDK readback', async () => {
  const dir = join(process.cwd(), '.runs', randomUUID());
  await mkdir(dir, { recursive: true });
  const files = new Map<string, { name: string; content: string }>();
  const call: ToolCall = async (name, args) => {
    if (name === 'createSmallTextFile') {
      const id = randomUUID();
      files.set(id, { name: args.filename!, content: args.contentText! });
      return { id };
    }
    if (name === 'getFolderChildren') {
      if (!args.pageCursor) return { value: [], nextPageCursor: 'second-page' };
      return { value: [...files].map(([id, file]) => ({ id, name: file.name })), nextPageCursor: null };
    }
    return { content: files.get(args.fileId!)!.content };
  };
  const provider = new DelegatedToolChunks(call, 'synthetic-drive', 'synthetic-folder');
  const a = Replica.open('namespace', join(dir, 'a'), provider);
  const b = Replica.open('namespace', join(dir, 'b'), provider);
  try {
    await SquadState.fromStorage(a, 'brain').agents.create('synthetic', '# synthetic');
    await a.sync(); await b.sync();
    assert.equal(files.size, 1, 'multiple pending SDK operations use one immutable cloud bundle');
    assert.deepEqual(await SquadState.fromStorage(b, 'brain').agents.list(), ['synthetic']);
    assert.equal(await b.read('brain/.squad/agents/synthetic/charter.md'), '# synthetic');
    assert.deepEqual(await provider.list('other-namespace'), []);
    const chunk = (await provider.list('namespace'))[0]!;
    await assert.rejects(provider.get('wrong-namespace', chunk), /namespace/);
  } finally { a.close(); b.close(); await rm(dir, { recursive: true, force: true }); }
});
test('missing/failed actual MCP upload receipts retain EVERY batched outbox update', async () => {
  const dir = join(process.cwd(), '.runs', randomUUID());
  const provider = new DelegatedToolChunks(async () => ({}), 'synthetic-drive', 'synthetic-folder');
  const a = Replica.open('namespace', dir, provider);
  try {
    await a.write('brain/.squad/a.md', 'a'); await a.write('brain/.squad/b.md', 'b');
    await assert.rejects(a.sync(), /receipt/);
    assert.equal(a.pending().length, 2);
  } finally { a.close(); await rm(dir, { recursive: true, force: true }); }
});
