import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';
import { connectFluid } from '../src/fluid.js';
import { Replica } from '../src/storage.js';

const dir = join(process.cwd(), '.runs', `fluid-${randomUUID()}`);
await mkdir(dir, { recursive: true });
const first = await connectFluid();
const second = await connectFluid(first.containerId);
const a = Replica.open('team/fluid-synthetic', join(dir, 'a'), first.store);
let b = Replica.open('team/fluid-synthetic', join(dir, 'b'), second.store);
try {
  await SquadState.fromStorage(a, 'brain').agents.create('synthetic-fluid-a', '# synthetic a');
  await SquadState.fromStorage(b, 'brain').agents.create('synthetic-fluid-b', '# synthetic b');
  first.container.disconnect(); second.container.disconnect();
  await a.append('brain/.squad/notes.md', 'offline-a\n');
  await b.append('brain/.squad/notes.md', 'offline-b\n');
  b.close();
  b = Replica.open('team/fluid-synthetic', join(dir, 'b'), second.store);
  assert.match((await b.read('brain/.squad/notes.md'))!, /offline-b/);
  first.container.connect(); second.container.connect();
  await Promise.all([a.sync(), b.sync()]);
  // Saved acknowledges the writer, not remote observer catch-up; bounded polling
  // inspects the actual remote state instead of claiming a fixed sleep is evidence.
  const deadline = Date.now() + 15_000;
  while (true) {
    await a.sync(); await b.sync();
    const agents = await SquadState.fromStorage(b, 'brain').agents.list();
    const text = await a.read('brain/.squad/notes.md');
    if (agents.length === 2 && text?.includes('offline-a') && text.includes('offline-b')) break;
    if (Date.now() > deadline) throw new Error('Fluid peers did not converge');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.deepEqual(await SquadState.fromStorage(a, 'brain').agents.list(), ['synthetic-fluid-a', 'synthetic-fluid-b']);
  assert.deepEqual(await SquadState.fromStorage(b, 'brain').agents.list(), ['synthetic-fluid-a', 'synthetic-fluid-b']);
  assert.equal(await a.read('brain/.squad/notes.md'), await b.read('brain/.squad/notes.md'));
  assert.equal(a.pending().length, 0); assert.equal(b.pending().length, 0);
  const exec = promisify(execFile);
  const run = async (cache: string, ...args: string[]) => exec(process.execPath, ['--import', 'tsx', 'src/fluid.ts', ...args], {
    cwd: process.cwd(), env: { ...process.env, BRAIN_NAMESPACE: 'team/fluid-processes', BRAIN_CACHE: join(dir, cache), BRAIN_FLUID_CONTAINER_ID: first.containerId },
    timeout: 60_000,
  });
  await Promise.all([run('process-a', 'agent', 'synthetic-process-a'), run('process-b', 'agent', 'synthetic-process-b')]);
  // Reopen fresh Fluid connections in independent processes to verify server state.
  const [processA, processB] = await Promise.all([run('process-a', 'show'), run('process-b', 'show')]);
  const parseResult = (stdout: string) => JSON.parse(stdout.split(/\r?\n/).find(line => line.startsWith('{"kind":"fluid-result"'))!);
  assert.deepEqual(parseResult(processA.stdout).agents, ['synthetic-process-a', 'synthetic-process-b']);
  assert.deepEqual(parseResult(processA.stdout).agents, parseResult(processB.stdout).agents);
  console.log(JSON.stringify({
    status: 'PASS', evidence: 'real Fluid libraries and local Tinylicious service; two clients/caches on one host',
    agents: await SquadState.fromStorage(a, 'brain').agents.list(),
    content: await a.read('brain/.squad/notes.md'),
    offlineRestart: 'PASS', independentProcesses: 'PASS', azure: 'NOT_RUN', actualSecondMachine: 'NOT_RUN', actualSeparatePrincipals: 'NOT_RUN',
  }));
} finally {
  a.close(); b.close(); first.container.dispose(); second.container.dispose();
  await rm(dir, { recursive: true, force: true });
}
// Fluid can retain background summarizer/telemetry timers under Node 26.
// All assertions, server acknowledgments and cleanup above have completed.
process.exit(0);
