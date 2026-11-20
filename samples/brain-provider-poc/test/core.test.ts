import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';
import { LocalChunks, ProviderError, type ChunkStore } from '../src/providers.js';
import { Replica, UnsupportedSemantics } from '../src/storage.js';

const exec = promisify(execFile);
const file = 'brain/.squad/notes.md';
async function fixture(fn: (dir: string, store: LocalChunks) => Promise<void>) {
  const dir = join(process.cwd(), '.runs', randomUUID());
  await mkdir(dir, { recursive: true });
  try { await fn(dir, new LocalChunks(join(dir, 'remote'))); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
test('real SquadState facade: agent CRUD, decisions append, directories, copy and explicit unsupported atomic operations', async () => fixture(async (dir, store) => {
  const a = Replica.open('team/repo', join(dir, 'a'), store);
  const b = Replica.open('team/repo', join(dir, 'b'), store);
  try {
    await a.mkdir('brain/.squad');
    const state = await SquadState.create(a, 'brain');
    await state.agents.create('data', '# Synthetic data charter');
    await state.decisions.add({ title: 'Synthetic choice', author: 'POC', body: 'Use chosen storage', configRelevant: false });
    await state.decisions.add({ title: 'Synthetic follow-up', author: 'POC', body: 'Keep provider pluggable', configRelevant: false });
    assert.deepEqual((await state.decisions.list()).map(d => d.title), ['Synthetic choice', 'Synthetic follow-up']);
    await a.copy('brain/.squad/agents/data/charter.md', file);
    assert.equal(await a.read(file), '# Synthetic data charter');
    assert.equal((await a.stat(file))?.size, Buffer.byteLength('# Synthetic data charter'));
    assert.throws(() => a.createIfAbsent(file, 'never'), UnsupportedSemantics);
    await assert.rejects(a.rename(file, `${file}.new`), UnsupportedSemantics);
    await a.sync(); await b.sync();
    assert.deepEqual(await SquadState.fromStorage(b, 'brain').agents.list(), ['data']);
    await state.agents.delete('data');
    await a.delete(file); await a.sync(); await b.sync();
    assert.deepEqual(await SquadState.fromStorage(b, 'brain').agents.list(), []);
    assert.equal(await b.read(file), undefined);
    assert.equal(await b.exists('brain/.squad/agents/data'), false);
  } finally { a.close(); b.close(); }
}));
test('offline concurrent same/different entries converge, explicit write conflicts, tombstones and isolation', async () => fixture(async (dir, store) => {
  const a = Replica.open('shared', join(dir, 'a'), store);
  const b = Replica.open('shared', join(dir, 'b'), store);
  const other = Replica.open('separate', join(dir, 'other'), store);
  try {
    await a.write(file, 'base\n'); await a.sync(); await b.sync();
    await a.append(file, 'from-a\n'); await b.append(file, 'from-b\n');
    await a.write('brain/.squad/a.md', 'a'); await b.write('brain/.squad/b.md', 'b');
    await Promise.all([a.sync(), b.sync()]); await a.sync(); await b.sync();
    assert.equal(await a.read(file), await b.read(file));
    assert.match((await a.read(file))!, /base\n/);
    assert.match((await a.read(file))!, /from-a\n/); assert.match((await a.read(file))!, /from-b\n/);
    assert.deepEqual(await a.list('brain/.squad'), ['a.md', 'b.md', 'notes.md']);
    await a.write(file, 'replacement-a'); await b.write(file, 'replacement-b');
    await a.sync(); await b.sync(); await a.sync();
    assert.match((await a.read(file))!, /SQUAD CONCURRENT VERSIONS/);
    assert.match((await a.read(file))!, /replacement-a/); assert.match((await a.read(file))!, /replacement-b/);
    assert.equal(await a.read(file), await b.read(file));
    await a.write(file, 'resolved'); await a.sync(); await b.sync();
    assert.equal(await b.read(file), 'resolved');
    await a.delete(file); await b.append(file, '+concurrent edit');
    await a.sync(); await b.sync(); await a.sync();
    assert.match((await a.read(file))!, /includes tombstone/);
    assert.match((await a.read(file))!, /\+concurrent edit/);
    await a.delete(file); await a.sync(); await b.sync();
    assert.equal(await b.read(file), undefined);
    assert.ok(b.inspect(file).some(o => o.kind === 'delete'));
    await other.sync(); assert.deepEqual(await other.list('brain/.squad'), []);
  } finally { a.close(); b.close(); other.close(); }
}));
test('durable offline restart and failed authorization retain outbox; corrupt chunks fail closed', async () => fixture(async (dir, store) => {
  const broken: ChunkStore = { list: ns => store.list(ns), get: (ns, c) => store.get(ns, c), put: async () => { throw new ProviderError(401, 'PUT'); } };
  let a = Replica.open('shared', join(dir, 'a'), broken);
  await a.write(file, 'durable offline');
  await assert.rejects(a.sync(), /HTTP 401/);
  assert.equal(a.pending().length, 1);
  a.close();
  a = Replica.open('shared', join(dir, 'a'), store);
  try {
    assert.equal(await a.read(file), 'durable offline'); assert.equal(a.pending().length, 1);
    await a.sync(); assert.equal(a.pending().length, 0);
    const bad: ChunkStore = { ...broken, list: async () => [{ id: 'bad', name: `${'0'.repeat(64)}.bin` }], get: async () => Buffer.from('not-yjs') };
    const b = Replica.open('shared', join(dir, 'b'), bad);
    try { await assert.rejects(b.sync(), /Corrupt remote update/); }
    finally { b.close(); }
  } finally { a.close(); }
}));
test('duplicate and reversed remote updates are idempotent and cache leases prevent shared-cache lost writes', async () => fixture(async (dir, store) => {
  const a = Replica.open('shared', join(dir, 'a'), store);
  await a.write(file, 'first'); await a.append(file, '+second'); await a.sync();
  assert.throws(() => Replica.open('shared', join(dir, 'a'), store), /Cache already active/);
  a.close();
  const reordered: ChunkStore = {
    list: async ns => { const chunks = (await store.list(ns)).reverse(); return [...chunks, ...chunks]; },
    get: (ns, c) => store.get(ns, c), put: (ns, name, data) => store.put(ns, name, data),
  };
  const b = Replica.open('shared', join(dir, 'b'), reordered);
  try {
    await b.sync(); await b.sync();
    assert.equal(await b.read(file), 'first+second'); assert.equal(b.inspect(file).length, 2);
  } finally { b.close(); }
}));
test('independent Node processes and caches exchange actual SDK state through local immutable transport (not real users/machines)', async () => fixture(async (dir) => {
  const run = async (cache: string, ...args: string[]) => exec(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(), env: { ...process.env, BRAIN_NAMESPACE: 'shared-process-poc', BRAIN_CACHE: join(dir, cache), BRAIN_PROVIDER: 'local', BRAIN_LOCAL_REMOTE: join(dir, 'remote') },
  });
  await Promise.all([run('process-a', 'agent', 'synthetic-a'), run('process-b', 'agent', 'synthetic-b')]);
  await Promise.all([run('process-a', 'append', 'notes.md', 'process-a\n'), run('process-b', 'append', 'notes.md', 'process-b\n')]);
  await Promise.all([run('process-a', 'sync'), run('process-b', 'sync')]);
  await Promise.all([run('process-a', 'sync'), run('process-b', 'sync')]);
  const a = JSON.parse((await run('process-a', 'show')).stdout);
  const b = JSON.parse((await run('process-b', 'show')).stdout);
  assert.deepEqual(a, b); assert.deepEqual(a.agents, ['synthetic-a', 'synthetic-b']);
  assert.match(a.content, /process-a/); assert.match(a.content, /process-b/); assert.equal(a.pending, 0);
}));
