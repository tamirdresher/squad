import { gzipSync, gunzipSync } from 'node:zlib';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import * as Y from 'yjs';
import { digest, type Chunk, type ChunkStore } from './providers.js';

export type ToolCall = (name: 'createSmallTextFile' | 'getFolderChildren' | 'readSmallTextFile', args: Record<string, string>) => Promise<unknown>;
type Bundle = { version: 1; namespace: string; sha256: string; gzipBase64: string };
/** Host-authenticated MCP transport. No bearer extraction and no claim of direct REST execution. */
export class DelegatedToolChunks implements ChunkStore {
  constructor(private readonly call: ToolCall, private readonly drive: string, private readonly folder: string) {}
  async put(ns: string, name: string, data: Uint8Array): Promise<void> {
    await this.putBatch(ns, [{ name, data }]);
  }
  async putBatch(ns: string, updates: { name: string; data: Uint8Array }[]): Promise<void> {
    for (const update of updates) if (update.name !== `${digest(update.data)}.bin`) throw new Error('Invalid batch chunk hash');
    const bytes = Y.mergeUpdates(updates.map(update => update.data));
    const bundle: Bundle = { version: 1, namespace: digest(ns), sha256: digest(bytes), gzipBase64: gzipSync(bytes).toString('base64') };
    const result = await this.call('createSmallTextFile', {
      documentLibraryId: this.drive, parentfolderId: this.folder,
      filename: `${bundle.namespace}--${bundle.sha256}.squad-poc.json`,
      contentText: JSON.stringify(bundle),
    }) as { id?: string };
    if (!result?.id) throw new Error('Cloud tool upload did not return a drive-item receipt; outbox retained');
  }
  async list(ns: string): Promise<Chunk[]> {
    const chunks: Chunk[] = [], cursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const args: Record<string, string> = { documentLibraryId: this.drive, parentFolderId: this.folder };
      if (cursor) args.pageCursor = cursor;
      const result = await this.call('getFolderChildren', args) as { value: { id: string; name: string }[]; nextPageCursor?: string | null };
      if (!Array.isArray(result.value)) throw new Error('Invalid cloud folder enumeration response');
      const prefix = `${digest(ns)}--`;
      for (const item of result.value) {
        const hash = item.name.slice(prefix.length).replace(/\.squad-poc\.json$/, '');
        if (item.name.startsWith(prefix) && item.name.endsWith('.squad-poc.json') && /^[a-f0-9]{64}$/.test(hash)) {
          chunks.push({ id: item.id, name: `${hash}.bin` });
        }
      }
      cursor = result.nextPageCursor ?? undefined;
      if (cursor && cursors.has(cursor)) throw new Error('Repeated cloud pagination cursor');
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return chunks;
  }
  async get(ns: string, chunk: Chunk): Promise<Uint8Array> {
    const result = await this.call('readSmallTextFile', { documentLibraryId: this.drive, fileId: chunk.id });
    const text = typeof result === 'string' ? result : ((result as { content?: string }).content ?? JSON.stringify(result));
    if (typeof text !== 'string') throw new Error('Cloud read must return text or {content}');
    const bundle = JSON.parse(text) as Bundle;
    if (bundle.version !== 1 || bundle.namespace !== digest(ns)) throw new Error('Cloud bundle namespace/schema mismatch');
    const bytes = gunzipSync(Buffer.from(bundle.gzipBase64, 'base64'), { maxOutputLength: 5 * 1024 * 1024 });
    if (bundle.sha256 !== digest(bytes) || chunk.name !== `${bundle.sha256}.bin`) throw new Error('Cloud bundle hash mismatch');
    return bytes;
  }
}

/**
 * An external MCP host fulfills these exact requests with its authorized tools.
 * The OS process waits for a matching response; it NEVER invents a cloud receipt.
 * Keep this mailbox under ignored .runs: request arguments contain private IDs.
 */
export function mailboxTools(directory: string): ToolCall {
  return async (name, args) => {
    await mkdir(directory, { recursive: true });
    const id = randomUUID();
    const staging = join(directory, `${id}.staging`);
    await writeFile(staging, JSON.stringify({ id, name, args }));
    await rename(staging, join(directory, 'request.json'));
    console.log(JSON.stringify({ kind: 'awaiting-authorized-mcp-tool', id, name }));
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      try {
        const response = JSON.parse(await readFile(join(directory, 'response.json'), 'utf8')) as { id: string; result?: unknown; error?: string };
        if (response.id === id) {
          if (response.error) throw new Error(`Delegated cloud tool failed: ${response.error}`);
          return response.result;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Authorized cloud tool timeout (${name}); outbox retained`);
  };
}
