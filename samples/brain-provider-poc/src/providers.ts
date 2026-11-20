import { createHash } from 'node:crypto';
import { link, mkdir, open, readFile, readdir, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

export const digest = (data: Uint8Array | string): string => createHash('sha256').update(data).digest('hex');
export interface Chunk { id: string; name: string }
/** Immutable, content-addressed updates. Duplicate names must contain identical bytes. */
export interface ChunkStore {
  list(namespace: string): Promise<Chunk[]>;
  get(namespace: string, chunk: Chunk): Promise<Uint8Array>;
  put(namespace: string, name: string, data: Uint8Array): Promise<void>;
  putBatch?(namespace: string, updates: { name: string; data: Uint8Array }[]): Promise<void>;
}
export type TokenSource = () => Promise<string>;
export class ProviderError extends Error {
  constructor(public readonly status: number, public readonly operation: string) {
    super(`Provider ${operation} failed (HTTP ${status}); check authorization, resource access and connectivity.`);
  }
}
export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`BLOCKED: required environment setting ${name} is absent`);
  return value;
}
export const tokenFromEnv = (name: string): TokenSource => async () => required(name);
const validName = (name: string): void => {
  if (!/^[a-f0-9]{64}\.bin$/.test(name)) throw new Error('Invalid chunk name');
};
export class LocalChunks implements ChunkStore {
  constructor(private readonly root: string) {}
  private dir(ns: string): string { return join(this.root, digest(ns)); }
  async list(ns: string): Promise<Chunk[]> {
    try { return (await readdir(this.dir(ns))).filter(n => /^[a-f0-9]{64}\.bin$/.test(n)).map(name => ({ id: name, name })); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
  }
  async get(ns: string, chunk: Chunk): Promise<Uint8Array> {
    validName(chunk.id); return readFile(join(this.dir(ns), chunk.id));
  }
  async put(ns: string, name: string, data: Uint8Array): Promise<void> {
    validName(name);
    if (name !== `${digest(data)}.bin`) throw new Error('Chunk hash mismatch');
    await mkdir(this.dir(ns), { recursive: true });
    const staging = join(this.dir(ns), `${randomUUID()}.staging`);
    const handle = await open(staging, 'wx');
    try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
    try {
      try { await link(staging, join(this.dir(ns), name)); }
      catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        if (digest(await readFile(join(this.dir(ns), name))) !== digest(data)) throw new Error('Immutable chunk collision');
      }
    } finally { await unlink(staging); }
  }
}

abstract class RestChunks {
  constructor(protected readonly token: TokenSource, protected readonly fetcher: typeof fetch = fetch) {}
  protected abstract allowed(url: URL): boolean;
  protected async request(url: string, init: RequestInit = {}): Promise<Response> {
    if (!this.allowed(new URL(url))) throw new Error('Rejected untrusted pagination URL');
    // GETs and content-addressed Graph PUTs are safe to retry; Drive POST is not retried.
    const safe = !init.method || init.method === 'GET' || init.method === 'PUT';
    for (let attempt = 0; ; attempt++) {
      const response = await this.fetcher(url, {
        ...init, redirect: 'error',
        headers: { ...init.headers, Authorization: `Bearer ${await this.token()}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (safe && attempt < 2 && [429, 502, 503, 504].includes(response.status)) {
        const seconds = Number(response.headers.get('Retry-After') ?? 0);
        await response.body?.cancel();
        await new Promise(resolve => setTimeout(resolve, Math.min(5000, Math.max(100 * 2 ** attempt, seconds * 1000 || 0))));
        continue;
      }
      if (!response.ok) throw new ProviderError(response.status, init.method ?? 'GET');
      return response;
    }
  }
}

/** Uses a pre-existing, explicitly shared folder; never creates a folder by display name. */
export class GoogleDriveChunks extends RestChunks implements ChunkStore {
  constructor(token: TokenSource, private readonly folderId: string, fetcher?: typeof fetch) { super(token, fetcher); }
  protected allowed(url: URL): boolean { return url.protocol === 'https:' && url.hostname === 'www.googleapis.com'; }
  async list(ns: string): Promise<Chunk[]> {
    const prefix = `${digest(ns)}--`;
    const q = `'${this.folderId.replace(/['\\]/g, '\\$&')}' in parents and trashed = false`;
    const chunks: Chunk[] = [];
    let page = '';
    do {
      const params = new URLSearchParams({ q, fields: 'nextPageToken,files(id,name)', pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
      if (page) params.set('pageToken', page);
      const body = await (await this.request(`https://www.googleapis.com/drive/v3/files?${params}`)).json() as { files: {id: string; name: string}[]; nextPageToken?: string };
      for (const file of body.files) {
        const name = file.name.slice(prefix.length);
        if (file.name.startsWith(prefix) && /^[a-f0-9]{64}\.bin$/.test(name)) chunks.push({ id: file.id, name });
      }
      page = body.nextPageToken ?? '';
    } while (page);
    return chunks;
  }
  async get(_ns: string, chunk: Chunk): Promise<Uint8Array> {
    return new Uint8Array(await (await this.request(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(chunk.id)}?alt=media&supportsAllDrives=true`)).arrayBuffer());
  }
  async put(ns: string, name: string, data: Uint8Array): Promise<void> {
    validName(name);
    if (name !== `${digest(data)}.bin`) throw new Error('Chunk hash mismatch');
    const boundary = `squad_${digest(data)}`;
    const metadata = JSON.stringify({ name: `${digest(ns)}--${name}`, parents: [this.folderId] });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
      Buffer.from(data), Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
    });
  }
}

/** OneDrive and SharePoint document libraries both use Graph drive/item identifiers. */
export class GraphChunks extends RestChunks implements ChunkStore {
  constructor(token: TokenSource, private readonly driveId: string, private readonly folderId: string, fetcher?: typeof fetch) { super(token, fetcher); }
  protected allowed(url: URL): boolean { return url.protocol === 'https:' && url.hostname === 'graph.microsoft.com' && url.pathname.startsWith('/v1.0/'); }
  private base(): string { return `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(this.driveId)}/items/${encodeURIComponent(this.folderId)}`; }
  async list(ns: string): Promise<Chunk[]> {
    const prefix = `${digest(ns)}--`;
    const chunks: Chunk[] = [];
    let url: string | undefined = `${this.base()}/children?$select=id,name&$top=200`;
    while (url) {
      const body = await (await this.request(url)).json() as { value: {id: string; name: string}[]; '@odata.nextLink'?: string };
      for (const file of body.value) {
        const name = file.name.slice(prefix.length);
        if (file.name.startsWith(prefix) && /^[a-f0-9]{64}\.bin$/.test(name)) chunks.push({ id: file.id, name });
      }
      url = body['@odata.nextLink'];
    }
    return chunks;
  }
  async get(_ns: string, chunk: Chunk): Promise<Uint8Array> {
    // Graph /content redirects to a short-lived URL. Read the metadata URL instead
    // and fetch it WITHOUT a bearer header; never leak Graph tokens to the CDN.
    const meta = await (await this.request(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(this.driveId)}/items/${encodeURIComponent(chunk.id)}?$select=id,@microsoft.graph.downloadUrl`)).json() as Record<string, string>;
    const url = meta['@microsoft.graph.downloadUrl'];
    if (!url || new URL(url).protocol !== 'https:') throw new Error('Graph did not return an HTTPS download URL');
    const response = await this.fetcher(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
    if (!response.ok) throw new ProviderError(response.status, 'download');
    return new Uint8Array(await response.arrayBuffer());
  }
  async put(ns: string, name: string, data: Uint8Array): Promise<void> {
    validName(name);
    if (name !== `${digest(data)}.bin`) throw new Error('Chunk hash mismatch');
    const url = `${this.base()}:/${digest(ns)}--${name}:/content`;
    try {
      await this.request(url, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'If-None-Match': '*' }, body: Buffer.from(data) });
    } catch (e) {
      if (!(e instanceof ProviderError) || e.status !== 412) throw e;
      const existing = (await this.list(ns)).find(c => c.name === name);
      if (!existing || digest(await this.get(ns, existing)) !== digest(data)) throw new Error('Immutable Graph chunk collision');
    }
  }
}

export type ProviderFactory = () => ChunkStore;
export const providers = new Map<string, ProviderFactory>([
  ['local', () => new LocalChunks(required('BRAIN_LOCAL_REMOTE'))],
  ['gdrive', () => new GoogleDriveChunks(tokenFromEnv('GOOGLE_ACCESS_TOKEN'), required('GOOGLE_DRIVE_FOLDER_ID'))],
  ['graph', () => new GraphChunks(tokenFromEnv('MS_GRAPH_ACCESS_TOKEN'), required('MS_GRAPH_DRIVE_ID'), required('MS_GRAPH_FOLDER_ID'))],
]);
export function createProvider(name: string): ChunkStore {
  const factory = providers.get(name);
  if (!factory) throw new Error(`Unknown provider '${name}'. Available: ${[...providers.keys()].join(', ')}`);
  return factory();
}
