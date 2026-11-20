import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import * as Y from 'yjs';
import type { StorageProvider, StorageStats } from '../../../packages/squad-sdk/src/storage/storage-provider.js';
import { digest, type ChunkStore } from './providers.js';

export interface Operation {
  id: string;
  path: string;
  kind: 'write' | 'append' | 'delete' | 'mkdir';
  text: string;
  seen: string[];
}
export interface OperationLog { all(): Operation[]; add(op: Operation): void }
export class UnsupportedSemantics extends Error {
  constructor(operation: string) { super(`${operation}: distributed atomic/conditional semantics are unsupported by this POC`); }
}
const norm = (p: string): string => {
  const key = posix.normalize(p.replace(/\\/g, '/')).replace(/\/+$/, '');
  if (!key.startsWith('brain/.squad') || (key !== 'brain/.squad' && !key.startsWith('brain/.squad/'))) {
    throw new Error('Sample storage is restricted to virtual brain/.squad paths');
  }
  return key;
};

/** Actual SDK StorageProvider, consumed by the unmodified SquadState facade. */
export class OperationStorage implements StorageProvider {
  constructor(protected readonly log: OperationLog) {}
  private ops(p: string): Operation[] { const key = norm(p); return this.log.all().filter(o => o.path === key); }
  private mutate(p: string, kind: Operation['kind'], text = ''): void {
    const path = norm(p);
    this.log.add({ id: randomUUID(), path, kind, text, seen: this.ops(path).map(o => o.id) });
  }
  /** Raw operations retain tombstones and replaced versions for inspection/recovery. */
  inspect(p: string): Operation[] { return this.ops(p); }
  readSync(p: string): string | undefined {
    const ops = this.ops(p);
    const superseded = new Set(ops.filter(o => o.kind === 'write' || o.kind === 'delete').flatMap(o => o.seen));
    const live = ops.filter(o => (o.kind === 'write' || o.kind === 'append') && !superseded.has(o.id))
      .sort((a, b) => a.seen.length - b.seen.length || a.id.localeCompare(b.id));
    if (!live.length) return undefined;
    const writes = live.filter(o => o.kind === 'write');
    const concurrentDelete = ops.some(o => o.kind === 'delete' && live.some(l => !l.seen.includes(o.id)));
    if (writes.length > 1 || concurrentDelete) {
      return `<<<<<<< SQUAD CONCURRENT VERSIONS${concurrentDelete ? ' (includes tombstone)' : ''}\n`
        + live.map(o => `[${o.kind} ${o.id}]\n${o.text}`).join('\n=======\n') + '\n>>>>>>> RESOLVE WITH WRITE\n';
    }
    return live.map(o => o.text).join('');
  }
  writeSync(p: string, data: string): void { this.mutate(p, 'write', data); }
  appendSync(p: string, data: string): void { this.mutate(p, 'append', data); }
  deleteSync(p: string): void { this.mutate(p, 'delete'); }
  listSync(p: string): string[] {
    const prefix = `${norm(p)}/`;
    return [...new Set(this.log.all().map(o => o.path).filter(k => k.startsWith(prefix) && this.existsSync(k))
      .map(k => k.slice(prefix.length).split('/')[0]!))].sort();
  }
  isDirectorySync(p: string): boolean {
    return this.ops(p).some(o => o.kind === 'mkdir' && !this.ops(p).some(d => d.kind === 'delete' && d.seen.includes(o.id)))
      || this.listSync(p).length > 0;
  }
  existsSync(p: string): boolean { return this.readSync(p) !== undefined || this.isDirectorySync(p); }
  mkdirSync(p: string, _options?: {recursive?: boolean}): void { this.mutate(p, 'mkdir'); }
  statSync(p: string): StorageStats | undefined {
    if (!this.existsSync(p)) return undefined;
    return { size: Buffer.byteLength(this.readSync(p) ?? ''), mtimeMs: 0, isDirectory: this.isDirectorySync(p) };
  }
  deleteDirSync(p: string): void {
    const prefix = `${norm(p)}/`;
    for (const key of new Set(this.log.all().map(o => o.path).filter(k => k.startsWith(prefix)))) this.deleteSync(key);
    this.deleteSync(p);
  }
  copySync(src: string, dest: string): void {
    const value = this.readSync(src);
    if (value === undefined) throw new Error('ENOENT: copy source missing');
    this.writeSync(dest, value);
  }
  renameSync(_src: string, _dest: string): never { throw new UnsupportedSemantics('rename'); }
  createIfAbsent(_p: string, _text: string): never { throw new UnsupportedSemantics('createIfAbsent'); }
  async read(p: string) { return this.readSync(p); }
  async write(p: string, text: string) { this.writeSync(p, text); }
  async append(p: string, text: string) { this.appendSync(p, text); }
  async delete(p: string) { this.deleteSync(p); }
  async list(p: string) { return this.listSync(p); }
  async exists(p: string) { return this.existsSync(p); }
  async isDirectory(p: string) { return this.isDirectorySync(p); }
  async mkdir(p: string, options?: {recursive?: boolean}) { this.mkdirSync(p, options); }
  async stat(p: string) { return this.statSync(p); }
  async deleteDir(p: string) { this.deleteDirSync(p); }
  async copy(src: string, dest: string) { this.copySync(src, dest); }
  async rename(src: string, dest: string) { this.renameSync(src, dest); }
}

function durableWrite(file: string, bytes: Uint8Array | string): void {
  const staging = `${file}.${randomUUID()}.staging`;
  const fd = openSync(staging, 'wx');
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(staging, file);
}
export class Replica extends OperationStorage {
  private constructor(
    readonly namespace: string,
    readonly cache: string,
    private readonly doc: Y.Doc,
    private readonly store: ChunkStore,
    private readonly release: () => void,
  ) {
    const map = doc.getMap<Operation>('operations');
    super({
      all: () => [...map.values()],
      add: op => {
        // Persist before publishing the local mutation, so acknowledged offline edits
        // can always be replayed after a restart, without a separate outbox race.
        const fork = new Y.Doc();
        try {
          Y.applyUpdate(fork, Y.encodeStateAsUpdate(doc));
          fork.getMap<Operation>('operations').set(op.id, op);
          const bytes = Y.encodeStateAsUpdate(fork, Y.encodeStateVector(doc));
          durableWrite(join(cache, `${digest(bytes)}.bin`), bytes);
          Y.applyUpdate(doc, bytes);
        } finally { fork.destroy(); }
      },
    });
  }
  static open(namespace: string, cacheRoot: string, store: ChunkStore): Replica {
    if (!namespace.trim()) throw new Error('A stable configured team/repo namespace is required');
    const cache = join(cacheRoot, digest(namespace));
    mkdirSync(cache, { recursive: true });
    const lease = join(cache, 'owner.lock');
    if (existsSync(lease)) {
      const pid = Number(readFileSync(lease, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Invalid cache owner lock');
      try { process.kill(pid, 0); throw new Error('Cache already active; each process/machine must use a distinct cache'); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e; }
      unlinkSync(lease);
    }
    writeFileSync(lease, String(process.pid), { flag: 'wx' });
    const doc = new Y.Doc();
    try {
      for (const file of readdirSync(cache).filter(f => /^[a-f0-9]{64}\.bin$/.test(f))) {
        const bytes = readFileSync(join(cache, file));
        if (`${digest(bytes)}.bin` !== file) throw new Error('Corrupt local update');
        Y.applyUpdate(doc, bytes);
      }
      return new Replica(namespace, cache, doc, store, () => unlinkSync(lease));
    } catch (e) { doc.destroy(); unlinkSync(lease); throw e; }
  }
  pending(): string[] { return readdirSync(this.cache).filter(f => /^[a-f0-9]{64}\.bin$/.test(f) && !existsSync(join(this.cache, `${f}.ack`))); }
  async sync(): Promise<{uploaded: number; downloaded: number}> {
    let uploaded = 0, downloaded = 0;
    // Failures propagate; pending chunks are never acknowledged on failed upload.
    const pending = this.pending();
    if (pending.length && this.store.putBatch) {
      await this.store.putBatch(this.namespace, pending.map(name => ({ name, data: readFileSync(join(this.cache, name)) })));
      for (const name of pending) durableWrite(join(this.cache, `${name}.ack`), '');
      uploaded = pending.length;
    } else {
      for (const name of pending) {
        await this.store.put(this.namespace, name, readFileSync(join(this.cache, name)));
        durableWrite(join(this.cache, `${name}.ack`), '');
        uploaded++;
      }
    }
    for (const chunk of await this.store.list(this.namespace)) {
      if (!/^[a-f0-9]{64}\.bin$/.test(chunk.name)) throw new Error('Invalid remote chunk name');
      const file = join(this.cache, chunk.name);
      if (existsSync(file)) continue;
      const bytes = await this.store.get(this.namespace, chunk);
      if (`${digest(bytes)}.bin` !== chunk.name) throw new Error('Corrupt remote update');
      // Check the Yjs envelope before admitting it to durable local state.
      const check = new Y.Doc();
      try { Y.applyUpdate(check, bytes); } finally { check.destroy(); }
      durableWrite(file, bytes);
      Y.applyUpdate(this.doc, bytes);
      durableWrite(`${file}.ack`, '');
      downloaded++;
    }
    return { uploaded, downloaded };
  }
  close(): void { this.doc.destroy(); this.release(); }
}
