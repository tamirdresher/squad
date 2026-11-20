import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';
import { createProvider, required } from './providers.js';
import { Replica } from './storage.js';

const provider = process.argv[2];
const settings: Record<string, string[]> = {
  gdrive: ['GOOGLE_ACCESS_TOKEN', 'GOOGLE_DRIVE_FOLDER_ID'],
  graph: ['MS_GRAPH_ACCESS_TOKEN', 'MS_GRAPH_DRIVE_ID', 'MS_GRAPH_FOLDER_ID'],
};
if (!provider || !settings[provider]) throw new Error('Use cloud-probe gdrive|graph');
const missing = [...settings[provider]!, 'BRAIN_NAMESPACE', 'BRAIN_CACHE'].filter(key => !process.env[key]);
if (missing.length) {
  console.log(JSON.stringify({ provider, status: 'BLOCKED', missingSettings: missing, realCloud: 'NOT_RUN', actualSecondMachine: 'NOT_RUN', actualSeparatePrincipals: 'NOT_RUN' }));
  process.exitCode = 2;
} else {
  const replica = Replica.open(required('BRAIN_NAMESPACE'), required('BRAIN_CACHE'), createProvider(provider));
  try {
    const name = `synthetic-probe-${randomUUID()}`;
    await SquadState.fromStorage(replica, 'brain').agents.create(name, '# Synthetic cloud authorization probe');
    const result = await replica.sync();
    const reader = Replica.open(required('BRAIN_NAMESPACE'), join(required('BRAIN_CACHE'), `readback-${randomUUID()}`), createProvider(provider));
    try {
      await reader.sync();
      assert.equal(await reader.read(`brain/.squad/agents/${name}/charter.md`), '# Synthetic cloud authorization probe');
    } finally { reader.close(); }
    console.log(JSON.stringify({ provider, status: 'PASS', evidence: 'uploaded synthetic SquadState; fresh local cache downloaded and verified exact charter with same supplied authorization', result, agent: name, actualSecondMachine: 'NOT_VERIFIED', actualSeparatePrincipals: 'NOT_VERIFIED' }));
  } catch (error) {
    console.log(JSON.stringify({ provider, status: 'FAIL', error: error instanceof Error ? error.message : 'Unknown error', outboxRetained: replica.pending().length }));
    process.exitCode = 1;
  } finally { replica.close(); }
}
