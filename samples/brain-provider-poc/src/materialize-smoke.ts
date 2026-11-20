import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';
import { Replica } from './storage.js';
import { required, type ChunkStore } from './providers.js';

const target = resolve(process.argv[2] ?? '.runs/model-smoke');
const allowedRoot = resolve('.runs');
if (!target.startsWith(`${allowedRoot}\\`) && !target.startsWith(`${allowedRoot}/`)) throw new Error('Smoke projection must be inside sample .runs');
const noNetwork: ChunkStore = {
  list: async () => { throw new Error('Projection must use already cloud-downloaded replica'); },
  get: async () => { throw new Error('Unexpected transport'); },
  put: async () => { throw new Error('Projection cannot upload'); },
};
const replica = Replica.open(required('BRAIN_NAMESPACE'), required('BRAIN_CACHE'), noNetwork);
try {
  const state = SquadState.fromStorage(replica, 'brain');
  const agents = await state.agents.list();
  if (agents.length !== 2) throw new Error('Expected verified synthetic cloud roster');
  async function project(path: string): Promise<void> {
    for (const name of await replica.list(path)) {
      const source = `${path}/${name}`;
      if (await replica.isDirectory(source)) await project(source);
      else {
        const content = await replica.read(source);
        const dest = join(target, source.slice('brain/'.length));
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, content!);
      }
    }
  }
  await project('brain/.squad');
  // SDK agent creation does not create team.md. This local roster is a projection
  // of the downloaded agent directory, not an extra claimed cloud roundtrip.
  await writeFile(join(target, '.squad', 'team.md'), `# Synthetic cloud Squad\n\n## Members\n\n| Name | Role | Status |\n| --- | --- | --- |\n${agents.map(name => `| ${name} | Synthetic POC agent | active |`).join('\n')}\n`);
  const agentDir = join(target, '.github', 'agents');
  await mkdir(agentDir, { recursive: true });
  await copyFile(fileURLToPath(new URL('../../../.github/agents/squad.agent.md', import.meta.url)), join(agentDir, 'squad.agent.md'));
  console.log(JSON.stringify({ kind: 'cloud-derived-cli-projection', agents, decisions: (await state.decisions.list()).map(decision => decision.title), copiedCaches: false }));
} finally { replica.close(); }
