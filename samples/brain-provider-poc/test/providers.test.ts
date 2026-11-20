import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { SquadState } from '../../../packages/squad-sdk/src/state/squad-state.js';
import { GoogleDriveChunks, GraphChunks, ProviderError, digest, providers, createProvider, LocalChunks } from '../src/providers.js';
import { Replica } from '../src/storage.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
for (const mode of ['gdrive', 'graph'] as const) {
  test(`${mode}: actual REST adapter + SquadState across isolated caches using mocked HTTP (pagination, tokens, binary uploads/downloads)`, async () => {
    const dir = join(process.cwd(), '.runs', randomUUID());
    await mkdir(dir, { recursive: true });
    const files = new Map<string, { name: string; bytes: Buffer }>();
    let pages = 0, downloads = 0;
    const seenTokens = new Set<string>();
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const headers = new Headers(init?.headers);
      if (url.hostname === 'synthetic-download.invalid') {
        assert.equal(headers.has('Authorization'), false, 'Graph bearer MUST NOT be sent to download host');
        downloads++;
        return new Response(Uint8Array.from(files.get(url.pathname.slice(1))!.bytes));
      }
      seenTokens.add(headers.get('Authorization')!);
      assert.match(headers.get('Authorization')!, /^Bearer mock-credential-[ab]$/);
      if (method === 'POST') {
        const body = Buffer.from(init!.body as Buffer);
        const boundary = headers.get('Content-Type')!.split('boundary=')[1]!;
        const metadataStart = body.indexOf('\r\n\r\n') + 4;
        const metadataEnd = body.indexOf('\r\n--', metadataStart);
        const metadata = JSON.parse(body.subarray(metadataStart, metadataEnd).toString()) as {name: string; parents: string[]};
        assert.deepEqual(metadata.parents, ['test-folder']);
        const bytesStart = body.indexOf('\r\n\r\n', metadataEnd) + 4;
        const bytesEnd = body.lastIndexOf(Buffer.from(`\r\n--${boundary}--`));
        files.set(randomUUID(), { name: metadata.name, bytes: body.subarray(bytesStart, bytesEnd) });
        return json({ id: 'synthetic-upload' });
      }
      if (method === 'PUT') {
        assert.equal(headers.get('If-None-Match'), '*');
        const name = decodeURIComponent(url.pathname.split(':/')[1]!.split(':/content')[0]!);
        if ([...files.values()].some(f => f.name === name)) return json({}, 412);
        files.set(randomUUID(), { name, bytes: Buffer.from(init!.body as Buffer) });
        return json({ id: 'synthetic-upload' });
      }
      if (url.searchParams.get('alt') === 'media') {
        downloads++; return new Response(Uint8Array.from(files.get(url.pathname.split('/').pop()!)!.bytes));
      }
      if (url.searchParams.get('$select')?.includes('downloadUrl')) {
        return json({ '@microsoft.graph.downloadUrl': `https://synthetic-download.invalid/${url.pathname.split('/').pop()}` });
      }
      pages++;
      const all = [...files].map(([id, f]) => ({ id, name: f.name }));
      const second = url.searchParams.has('pageToken') || url.searchParams.has('skiptoken');
      const items = second ? all.slice(1) : all.slice(0, 1);
      if (mode === 'gdrive') return json({ files: items, nextPageToken: !second && all.length > 1 ? 'page-two' : undefined });
      return json({ value: items, '@odata.nextLink': !second && all.length > 1 ? 'https://graph.microsoft.com/v1.0/drives/test-drive/items/test-folder/children?skiptoken=two' : undefined });
    };
    const make = (credential: string) => mode === 'gdrive'
      ? new GoogleDriveChunks(async () => credential, 'test-folder', fetcher)
      : new GraphChunks(async () => credential, 'test-drive', 'test-folder', fetcher);
    const a = Replica.open('team/shared', join(dir, 'a'), make('mock-credential-a'));
    const b = Replica.open('team/shared', join(dir, 'b'), make('mock-credential-b'));
    try {
      await SquadState.fromStorage(a, 'brain').agents.create('synthetic-a', '# synthetic charter a');
      await SquadState.fromStorage(b, 'brain').agents.create('synthetic-b', '# synthetic charter b');
      await a.sync(); await b.sync(); await a.sync();
      assert.deepEqual(await SquadState.fromStorage(a, 'brain').agents.list(), ['synthetic-a', 'synthetic-b']);
      assert.deepEqual(await SquadState.fromStorage(b, 'brain').agents.list(), ['synthetic-a', 'synthetic-b']);
      assert.equal(await b.read('brain/.squad/agents/synthetic-a/charter.md'), '# synthetic charter a');
      assert.ok(pages >= 4); assert.ok(downloads >= 4);
      assert.deepEqual([...seenTokens].sort(), ['Bearer mock-credential-a', 'Bearer mock-credential-b']);
      for (const f of files.values()) assert.ok(f.name.endsWith(`${digest(f.bytes)}.bin`));
      // Reupload a known immutable chunk: Drive duplicates are harmless, Graph 412 verifies content.
      const first = [...files.values()][0]!;
      await make('mock-credential-a').put('team/shared', `${digest(first.bytes)}.bin`, first.bytes);
      assert.equal(a.pending().length, 0);
    } finally { a.close(); b.close(); await rm(dir, { recursive: true, force: true }); }
  });
}
test('REST auth/storage failures propagate without retry or local fallback; safe GET retries only', async () => {
  for (const status of [401, 403, 404, 507]) {
    let calls = 0;
    const fetcher: typeof fetch = async () => { calls++; return json({}, status); };
    const drive = new GoogleDriveChunks(async () => 'mock-only', 'folder', fetcher);
    await assert.rejects(drive.list('shared'), (error: unknown) => error instanceof ProviderError && error.status === status);
    assert.equal(calls, 1);
  }
  let attempts = 0;
  const graph = new GraphChunks(async () => 'mock-only', 'drive', 'folder', async () => {
    attempts++; return attempts < 3 ? json({}, 503) : json({ value: [] });
  });
  assert.deepEqual(await graph.list('shared'), []); assert.equal(attempts, 3);
  let posts = 0;
  const drive = new GoogleDriveChunks(async () => 'mock-only', 'folder', async () => { posts++; return json({}, 503); });
  const bytes = Buffer.from('synthetic');
  await assert.rejects(drive.put('shared', `${digest(bytes)}.bin`, bytes), /503/);
  assert.equal(posts, 1, 'ambiguous Drive POST must not auto-retry');
});
test('Graph pagination cannot exfiltrate authorization to a foreign host', async () => {
  let calls = 0;
  const store = new GraphChunks(async () => 'mock-only', 'drive', 'folder', async () => {
    calls++; return json({ value: [], '@odata.nextLink': 'https://foreign.invalid/steal' });
  });
  await assert.rejects(store.list('shared'), /untrusted pagination URL/); assert.equal(calls, 1);
});
test('registry extensions do not change Yjs or SDK bridge and unknown providers fail explicitly', () => {
  providers.set('extension-proof', () => new LocalChunks('.runs/unused-extension'));
  try { assert.ok(createProvider('extension-proof') instanceof LocalChunks); }
  finally { providers.delete('extension-proof'); }
  assert.throws(() => createProvider('does-not-exist'), /Unknown provider/);
});
