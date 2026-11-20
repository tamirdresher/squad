import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { AzureClient } from '@fluidframework/azure-client';
import { TinyliciousClient } from '@fluidframework/tinylicious-client';
import { ConnectionState, type IFluidContainer } from 'fluid-framework';
import { SharedMap, type ISharedMap } from 'fluid-framework/legacy';
import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';
import { digest, required, type Chunk, type ChunkStore } from './providers.js';
import { Replica } from './storage.js';

const schema = { initialObjects: { updates: SharedMap } };
async function until(predicate: () => boolean, label: string): Promise<void> {
  const end = Date.now() + 20_000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error(`Fluid timeout: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}
/** Real custom Fluid application's DDS; not a Microsoft Loop component. */
export class FluidChunks implements ChunkStore {
  constructor(private readonly map: ISharedMap, private readonly container: IFluidContainer) {}
  private key(ns: string, name: string) { return `${digest(ns)}--${name}`; }
  async list(ns: string): Promise<Chunk[]> {
    await until(() => this.container.connectionState === ConnectionState.Connected, 'connected');
    const prefix = `${digest(ns)}--`;
    return [...this.map.keys()].filter(k => k.startsWith(prefix)).map(id => ({ id, name: id.slice(prefix.length) }));
  }
  async get(ns: string, chunk: Chunk): Promise<Uint8Array> {
    if (chunk.id !== this.key(ns, chunk.name)) throw new Error('Fluid namespace mismatch');
    const value = this.map.get<string>(chunk.id);
    if (value === undefined) throw new Error('Fluid update missing');
    return Buffer.from(value, 'base64');
  }
  async put(ns: string, name: string, bytes: Uint8Array): Promise<void> {
    if (name !== `${digest(bytes)}.bin`) throw new Error('Fluid update hash mismatch');
    await until(() => this.container.connectionState === ConnectionState.Connected, 'connected');
    const key = this.key(ns, name);
    const value = Buffer.from(bytes).toString('base64');
    const old = this.map.get<string>(key);
    if (old !== undefined && old !== value) throw new Error('Fluid immutable update collision');
    this.map.set(key, value);
    await until(() => !this.container.isDirty, 'server acknowledged updates');
  }
}
export async function connectFluid(id?: string) {
  const mode = process.env.BRAIN_FLUID_MODE ?? 'local';
  if (!['local', 'azure'].includes(mode)) throw new Error('BRAIN_FLUID_MODE must be local or azure');
  const token = async (_tenant: string, documentId?: string) => {
    const response = await fetch(required('AZURE_FLUID_RELAY_TOKEN_URL'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${required('AZURE_FLUID_RELAY_APP_TOKEN')}` },
      body: JSON.stringify({ tenantId: required('AZURE_FLUID_RELAY_TENANT_ID'), documentId }),
      signal: AbortSignal.timeout(20_000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Fluid token service HTTP ${response.status}`);
    const result = await response.json() as { jwt: string };
    if (typeof result.jwt !== 'string' || !result.jwt) throw new Error('Token service must return {jwt}');
    return { jwt: result.jwt };
  };
  if (mode === 'azure' && new URL(required('AZURE_FLUID_RELAY_TOKEN_URL')).protocol !== 'https:') throw new Error('Azure token service must use HTTPS');
  const client = mode === 'azure'
    ? new AzureClient({ connection: {
      type: 'remote', endpoint: required('AZURE_FLUID_RELAY_ENDPOINT'),
      tenantId: required('AZURE_FLUID_RELAY_TENANT_ID'),
      tokenProvider: { fetchOrdererToken: token, fetchStorageToken: token },
    } })
    : new TinyliciousClient({ connection: { port: Number(process.env.BRAIN_FLUID_PORT ?? 17070) } });
  const { container } = id ? await client.getContainer(id, schema, '2.0.0') : await client.createContainer(schema, '2.0.0');
  const containerId = id ?? await container.attach();
  await until(() => container.connectionState === ConnectionState.Connected, 'initial connection');
  return { containerId, container, store: new FluidChunks(container.initialObjects.updates, container) };
}
async function main() {
  const [command = 'show', name = 'synthetic-fluid-agent'] = process.argv.slice(2);
  const id = command === 'create' ? undefined : required('BRAIN_FLUID_CONTAINER_ID');
  const connection = await connectFluid(id);
  const replica = Replica.open(required('BRAIN_NAMESPACE'), required('BRAIN_CACHE'), connection.store);
  try {
    if (command === 'agent') await SquadState.fromStorage(replica, 'brain').agents.create(name, '# Synthetic Fluid charter');
    await replica.sync();
    console.log(JSON.stringify({ kind: 'fluid-result', mode: process.env.BRAIN_FLUID_MODE ?? 'local', containerId: connection.containerId, agents: await SquadState.fromStorage(replica, 'brain').agents.list() }));
  } finally { replica.close(); connection.container.dispose(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(() => process.exit(0)).catch(error => {
    console.error(error instanceof Error ? error.message : 'Fluid failed');
    process.exit(1);
  });
}
