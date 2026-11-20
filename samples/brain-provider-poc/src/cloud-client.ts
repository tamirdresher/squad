import assert from 'node:assert/strict';
import { join } from 'node:path';
import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';
import { Replica } from './storage.js';
import { required } from './providers.js';
import { DelegatedToolChunks, mailboxTools } from './delegated-tools.js';

const [action = 'show', label = 'a'] = process.argv.slice(2);
const root = required('BRAIN_CACHE');
const store = new DelegatedToolChunks(mailboxTools(join(root, 'mailbox')), required('BRAIN_TOOL_DRIVE_ID'), required('BRAIN_TOOL_FOLDER_ID'));
const replica = Replica.open(required('BRAIN_NAMESPACE'), root, store);
const state = SquadState.fromStorage(replica, 'brain');
try {
  if (action === 'seed') {
    await state.agents.create('synthetic-cloud-a', '# Synthetic cloud agent A');
    await state.decisions.add({ title: 'Synthetic baseline', author: 'POC', body: 'Initial real cloud state', configRelevant: false });
  } else if (action === 'edit') {
    if (label === 'b') await state.agents.create('synthetic-cloud-b', '# Synthetic cloud agent B');
    await state.decisions.add({ title: `Synthetic offline ${label}`, author: 'POC', body: `Independent offline process ${label}`, configRelevant: false });
    await replica.append('brain/.squad/notes.md', `offline-${label}\n`);
    await replica.write('brain/.squad/conflict.md', `concurrent-version-${label}`);
  } else if (action === 'resolve-delete') {
    assert.match((await replica.read('brain/.squad/conflict.md'))!, /SQUAD CONCURRENT VERSIONS/);
    await replica.write('brain/.squad/conflict.md', 'resolved-after-cloud-convergence');
    await replica.delete('brain/.squad/notes.md');
  } else if (action === 'sync') {
    console.log(JSON.stringify({ kind: 'live-cloud-sync', transport: 'delegated-mcp-not-direct-graph', ...await replica.sync() }));
  } else if (!['show', 'verify', 'verify-final', 'verify-empty'].includes(action)) throw new Error('Unknown cloud-client action');
  const agents = await state.agents.list();
  const decisions = (await state.decisions.list()).map(decision => decision.title);
  const notes = await replica.read('brain/.squad/notes.md');
  const conflict = await replica.read('brain/.squad/conflict.md');
  if (action === 'verify' || action === 'verify-final') {
    assert.deepEqual(agents, ['synthetic-cloud-a', 'synthetic-cloud-b']);
    assert.equal(decisions.length, 3);
    for (const title of ['Synthetic baseline', 'Synthetic offline a', 'Synthetic offline b']) assert.ok(decisions.includes(title));
    if (action === 'verify') {
      assert.match(notes!, /offline-a/); assert.match(notes!, /offline-b/);
      assert.match(conflict!, /concurrent-version-a/); assert.match(conflict!, /concurrent-version-b/);
      assert.match(conflict!, /SQUAD CONCURRENT VERSIONS/);
    } else {
      assert.equal(notes, undefined);
      assert.equal(conflict, 'resolved-after-cloud-convergence');
      assert.ok(replica.inspect('brain/.squad/notes.md').some(operation => operation.kind === 'delete'));
    }
  }
  if (action === 'verify-empty') { assert.deepEqual(agents, []); assert.deepEqual(decisions, []); }
  console.log(JSON.stringify({ action, agents, decisions, notes: notes ?? null, conflict: conflict ?? null, pending: replica.pending().length, assertions: action.startsWith('verify') ? 'PASS' : 'NOT_ASSERTED' }));
} finally { replica.close(); }
