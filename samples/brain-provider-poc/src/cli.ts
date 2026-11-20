import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';
import { createProvider, required } from './providers.js';
import { Replica } from './storage.js';

const [command = 'show', ...args] = process.argv.slice(2);
const replica = Replica.open(required('BRAIN_NAMESPACE'), required('BRAIN_CACHE'), createProvider(required('BRAIN_PROVIDER')));
const state = SquadState.fromStorage(replica, 'brain');
try {
  if (command === 'sync') console.log(JSON.stringify({ kind: 'transport-result', provider: process.env.BRAIN_PROVIDER, ...await replica.sync() }));
  else if (command === 'agent') await state.agents.create(args[0] ?? 'synthetic-agent', args[1] ?? '# Synthetic POC charter');
  else if (command === 'append') await replica.append(`brain/.squad/${args[0] ?? 'notes.md'}`, args[1] ?? 'synthetic note\n');
  else if (command === 'write') await replica.write(`brain/.squad/${args[0] ?? 'notes.md'}`, args[1] ?? 'synthetic note\n');
  else if (command === 'delete') await replica.delete(`brain/.squad/${args[0] ?? 'notes.md'}`);
  else if (command === 'show') console.log(JSON.stringify({
    agents: await state.agents.list(),
    content: await replica.read(`brain/.squad/${args[0] ?? 'notes.md'}`),
    pending: replica.pending().length,
  }));
  else throw new Error(`Unknown command ${command}`);
} finally { replica.close(); }
