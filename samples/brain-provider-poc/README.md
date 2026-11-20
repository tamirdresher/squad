# Squad brain-provider POCs

Isolated **POCs, not a migration or production backend**. No real `.squad` file,
runtime configuration, Git state backend, root package manifest, or root lockfile
is modified. All payloads in the proofs are synthetic.

**Live follow-up:** the OneDrive delegated-tool lane was actually executed against
an existing business OneDrive: four immutable Yjs bundles, independent durable
Node-process clients, offline concurrent edits, conflict preservation/resolution,
cloud tombstones, restart, and a fresh late join all passed exact SDK assertions.
This used **one existing authenticated principal on one physical host**, simulating
multiple machines. It is not direct Graph REST adapter validation.

## Intended ordinary-user experience versus this developer POC

The desired product path is **sign in with Microsoft or Google → choose/create
a shared folder → choose that folder for this repo's Squad**. Teammates choose
the same folder and namespace with their own sign-ins. It should use services
they already have, **not require an Azure subscription, relay deployment, or
copy/pasting bearer tokens**. Custom Fluid/Azure is an optional application lane,
not the default setup.

What exists here: an injectable delegated-tool adapter that reuses the host's
already authorized SharePoint/OneDrive tools without extracting a token. The live
run needed no Azure provisioning, signing keys, or tenant-admin action.
What does **not** exist: a standalone OAuth sign-in implementation, account/folder
picker, saved end-user setup wizard, or automatic background synchronization.
The raw environment-variable REST commands below are **developer proof harnesses**,
not an implemented easy-user authentication experience.

## What actually connects to Squad

`OperationStorage` implements the existing SDK `StorageProvider` contract.
The sample imports the checkout's **unmodified**
`packages/squad-sdk/src/state/squad-state.ts`: `SquadState.create/fromStorage`,
`agents.create/list/delete`, and `decisions.add/list` execute against the adapter.
The virtual root is always `brain/.squad`, never an absolute machine checkout path.
This proves SDK state integration, **not an entire interactive Squad CLI/model
session**. The production synchronous `StateBackend` factory is not changed.

```
existing SquadState collections
        ↓ existing StorageProvider interface
OperationStorage (causal file operations)
        ↓
real Yjs immutable operation-map updates + durable cache/outbox
        ↓ ChunkStore contract
registry: gdrive | graph | local       custom Fluid application
Google Drive REST                    real Fluid SharedMap DDS
Graph REST → OneDrive/SharePoint      Tinylicious OR Azure Fluid Relay
delegated host tools → existing OneDrive/SharePoint (live-verified)
```

Provider selection never changes Yjs merge logic. Register another zero-argument
factory with `providers.set(name, factory)` or inject any `ChunkStore`.
Credentials are asynchronous `TokenSource` callbacks; CLI factories use environment
variables. Supply a refreshing callback for long-lived sessions. Never put tokens
in a config file, command line, committed file, or `.env` used by this sample.

## Install and execute

From this directory (Node 22 LTS recommended; verified here on Node 26.13.0):

```powershell
npm ci --registry=https://packagefeedproxy.microsoft.io/npm/ --workspaces=false --no-audit --no-fund
npm test
npm run typecheck
```

Only the sample has dependencies and a lockfile; `.npmrc` pins Microsoft CFS.
The CFS metadata resolved all 409 tarball entries to Microsoft's
`ms-feed-25.pkgs.visualstudio.com` backing feed, not public npm.
There is no public npm fallback. Node 26 produced an `opossum` transitive
engine-range warning, but the executed proofs passed. The CLI/test Fluid scripts
explicitly exit **after awaiting acknowledgments, assertions and cleanup** because
Fluid background timers can retain a Node 26 process.

### Local storage mode

```powershell
$env:BRAIN_PROVIDER = 'local'
$env:BRAIN_NAMESPACE = 'synthetic-team/repo-poc-1' # SAME value on all clients
$env:BRAIN_LOCAL_REMOTE = "$PWD\.runs\shared-transport"
$env:BRAIN_CACHE = "$PWD\.runs\client-a"          # DISTINCT per process/machine
npm run brain -- agent synthetic-a
npm run brain -- append notes.md 'offline-a'
npm run brain -- sync
npm run brain -- show
```

Repeat with `.runs\client-b` in another process. Edits are local/durable until
explicit `sync`. Sync uploads pending updates, then enumerates/downloads updates.
After concurrent uploads, sync both clients again to observe peers' last updates.
There is no polling daemon or notification subscription.

## Google Drive, OneDrive and SharePoint

Use an **existing explicitly shared test folder**. Sharing/consent/provisioning is
out of scope. Supply credentials through your approved authorization flow;
the sample neither discovers nor extracts tokens from another tool or cache.
Different users must each authorize their own account with access to the same
folder. A team label, cache name, or two processes is **not** proof of two principals.

| Selection | Required settings |
|---|---|
| `gdrive` | `GOOGLE_ACCESS_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID` |
| `graph` | `MS_GRAPH_ACCESS_TOKEN`, `MS_GRAPH_DRIVE_ID`, `MS_GRAPH_FOLDER_ID` |
| Both | `BRAIN_NAMESPACE`, `BRAIN_CACHE` |

Drive uses genuine files list/media/multipart-create endpoints, including shared
drive flags and `nextPageToken`. A pre-shared folder ID avoids duplicate folder
creation races. Access depends on the token's file scope and whether that folder
is accessible to the app (for example `drive.file` with explicitly granted files,
or an appropriately authorized broader scope).

Graph uses genuine drive-item children, upload-content and download-URL metadata
endpoints, follows `@odata.nextLink`, and never forwards its bearer to the
preauthenticated download URL. OneDrive and SharePoint libraries use the same
adapter: explicitly provide the appropriate drive and folder item IDs.
An authorized delegated write scope such as `Files.ReadWrite` must actually cover
the chosen resource; broader/cross-site access can require different permissions.
No tenant-wide consent is requested here.

HTTP 401/403/404/quota/storage failures propagate. There is **no silent local
success fallback**. Only GET/content-addressed PUT HTTP 429/502/503/504 responses
get up to two bounded retries. Network exceptions propagate; pending updates
remain durable. Drive POST is not automatically retried: after an ambiguous
response, a later explicit sync may create a duplicate immutable chunk; identical
hash-named bytes are idempotent on replay. Graph writes deterministic
content-addressed paths, supplies `If-None-Match: *`, and verifies an existing
chunk on HTTP 412. Correctness is based on immutable hash-addressed content, **not
on pretending Graph provides a distributed conditional filesystem operation**.

One-client cloud smoke test (writes synthetic state to your explicit test folder,
then verifies the exact charter by downloading to a fresh local cache):

```powershell
$env:BRAIN_NAMESPACE = 'synthetic-team/repo-poc-1'
$env:BRAIN_CACHE = "$PWD\.runs\cloud-client-a"
# Set required provider credentials/resource settings using your authorized flow.
npm run cloud:probe -- gdrive
# Or:
npm run cloud:probe -- graph
```

Missing settings produce structured `BLOCKED` and exit 2. A real request failure
produces `FAIL` and exit 1. This probe cannot establish second-machine or
separate-principal evidence by itself.

### Reproducible two-machine/two-user run

1. Both machines check out the same code and install the sample from CFS.
2. Both configure the **same provider, stable namespace, drive/folder IDs**.
   The namespace should be explicitly agreed (for example a team UUID + repo
   UUID + synthetic test session), never inferred from an absolute path.
3. Each user supplies **their own independently obtained credential**, and a
   distinct local `BRAIN_CACHE`. Do not copy caches between live replicas.
4. With networking unavailable, machine A runs
   `npm run brain -- agent synthetic-machine-a` and
   `npm run brain -- append notes.md 'synthetic-offline-a'`.
   Machine B similarly writes `synthetic-machine-b` and `synthetic-offline-b`.
   These commands do not call the remote.
5. Reconnect both. Set `BRAIN_PROVIDER=gdrive` or `graph`, then run
   `npm run brain -- sync` on each twice.
6. On both run `npm run brain -- show` and verify **both** agents and text
   fragments, with pending 0 and identical content. Restart both processes and
   repeat. Delete `notes.md` on one (`brain -- delete notes.md`), sync both,
   and confirm the content field is absent. Use a *different namespace* in a
   fresh cache and verify it has no agents.
7. Preserve sanitized outputs and independent host/principal attestations
   outside the repo. Do not mark separate-host/principal evidence PASS merely
   because step 6 converged. These steps were **not** executed on two machines
   or two authenticated user accounts in this run.

## Live OneDrive using existing delegated host tools

`src/delegated-tools.ts` exports `DelegatedToolChunks`, another real `ChunkStore`.
Inject the host's **actual authorized** `createSmallTextFile`,
`getFolderChildren`, and `readSmallTextFile` calls. `putBatch` merges pending Yjs
updates, gzip/base64-encodes them in an immutable hash-named JSON bundle, and
requires the real drive-item upload receipt **before** the replica acknowledges
any outbox entries. Enumeration handles `nextPageCursor`; downloads validate
namespace and SHA-256 after bounded decompression.

The standalone developer harness uses a mailbox to bridge independent Node
processes to this conversation's authorized MCP host:

```powershell
# Configure these privately; do not commit real folder IDs or tool output.
$env:BRAIN_TOOL_DRIVE_ID = '<existing-drive-id>'
$env:BRAIN_TOOL_FOLDER_ID = '<explicit-shared-test-folder-id>'
$env:BRAIN_NAMESPACE = 'synthetic-shared-team/repo-test'
$env:BRAIN_CACHE = "$PWD\.runs\live-a"
npm run cloud:client -- seed
npm run cloud:client -- sync
```

During sync the client writes `.runs\<client>\mailbox\request.json` and waits.
The host/operator must **execute that requested authorized MCP call**, capture its
actual result in an ignored JSON file, then deliver it:

```powershell
node --import tsx src\tool-response.ts `
  .runs\live-a\mailbox createSmallTextFile .runs\actual-upload-result.json
# Similarly getFolderChildren and readSmallTextFile, as requested.
```

The helper matches the outstanding request ID and method. Folder enumeration
results can retain just `{value:[{id,name}],nextPageCursor}`; text reads may be
plain JSON strings, parsed bundle objects, or `{content:<text>}`. Uploads require
the actual `{id}` receipt. **Never synthesize these responses from a local
replica/export and call that a cloud test.** A missing/failed/expired tool response
fails sync and leaves pending updates intact. The host can fan a single current
cloud enumeration/read response out to multiple outstanding requests; this is
explicit host relay, not independent per-client authorization.

Executed protocol (all peers acquired other peers' bytes from actual MCP cloud
reads, not shared local storage or copied replica caches):

1. Process A seeded a real SDK agent and baseline decision, uploaded a bundle,
   listed it, and downloaded it back.
2. Empty-cache B downloaded that baseline from OneDrive.
3. Separate A/B processes edited offline, exited, and reopened their durable
   caches. Both appended a decision and note; both replaced the same conflict
   file, and B created a second SDK agent.
4. Both uploaded actual immutable bundles and received genuine cloud read
   results for peers. `cloud:client -- verify` passed on both: **two agents,
   three decision titles, both note fragments, and both conflicting versions**.
5. A resolved the conflict and deleted notes, then uploaded a fourth cloud
   bundle. B recovered the resolution/tombstone through a real cloud read.
6. Empty-cache late-joining process C independently downloaded all four bundles.
   `cloud:client -- verify-final` passed after reopening A, B and C:
   two agents, three decisions, resolved content, deleted notes and a retained
   tombstone, pending 0.
7. An independent cache with a different namespace enumerated the same real
   cloud folder and remained empty (`verify-empty`: PASS).

These are real-service/real-SDK roundtrips with simulated peers on one host and
one authenticated principal. Actual separate user accounts and physical machines
remain unproven. The four tiny synthetic cloud files remain in the explicit test
folder for inspection; no production brain was uploaded. Private IDs and raw
tool receipts are not included in source or `results.json`.

### Real CLI/model readback smoke

`src/materialize-smoke.ts` projects **only an already cloud-downloaded replica**
to `.runs\model-smoke\.squad`, copies this checkout's actual Squad custom-agent
definition, and derives a local team roster from synchronized agent directories.
It does not copy another client's cache or claim that roster was an additional
cloud write. The ordinary Squad CLI resolves this synthetic squad correctly:

```powershell
# BRAIN_CACHE points to the independently downloaded late-join cache.
node --import tsx src\materialize-smoke.ts .runs\model-smoke
Push-Location .runs\model-smoke
node ..\..\..\..\cli.js status
Pop-Location
copilot -C "$PWD\.runs\model-smoke" --agent Squad `
  -p 'Direct-mode factual status: read the local team, decisions and synthetic agent charters; return their names and decision titles. Do not initialize, delegate or write.' `
  --available-tools view --allow-tool view --no-ask-user `
  --no-custom-instructions --trust-folder --silent
```

This is explicitly a read-only materialized projection, **not transparent
cloud-backed writes from the production interactive CLI**. See the measured CLI
outcome in `results.json`; SDK assertions alone are never counted as a model
session. The real Squad CLI `status` resolved this synthetic squad correctly,
and a real Copilot model-auth request returned `AUTH_SMOKE_OK`. Two custom
`--agent Squad` readback attempts were **BLOCKED** before tool discovery by a
managed MCP policy-settlement timeout (30 seconds). The policy was not disabled
or bypassed; authentication success is not reported as full Squad-model e2e.
A separate **standard Copilot CLI** view-only request (without `--agent Squad`)
then succeeded: `CLOUD_BRAIN_READBACK_OK`, both exact synthetic agent names and
all three exact date-prefixed decision titles. Those values were read from the
cloud-derived projection, not supplied in that prompt. This is measured
model/file readback, not a claim that the custom coordinator session succeeded.

## Separate custom Fluid application

This is a custom application with a real Fluid `SharedMap` initial object,
using the same SDK bridge/durable Yjs outbox. It stores content-addressed updates
in its DDS; it is **not Microsoft Loop**, a Loop workspace, or an invented
"Loop Graph document" endpoint.

Terminal 1:

```powershell
npm run fluid:server
```

The wrapper starts official Tinylicious on port **17070**, overrides all of its
`/var/tmp` defaults to this sample's `.runs\tinylicious`, and uses an in-memory
service DB. Tinylicious is an **unauthenticated development service**; it listens
on all interfaces. Run only on a trusted/firewalled development machine, never
expose it publicly. Stop it after the proof. Server restart durability is not
claimed; **local replica/outbox restart durability is tested**.

Terminal 2:

```powershell
npm run test:fluid
# Optional custom application:
$env:BRAIN_NAMESPACE = 'synthetic-team/fluid-repo-poc-1'
$env:BRAIN_CACHE = "$PWD\.runs\fluid-client-a"
npm run fluid -- create
# Copy returned containerId (not a credential):
$env:BRAIN_FLUID_CONTAINER_ID = '<returned-container-id>'
npm run fluid -- agent synthetic-a
npm run fluid -- show
```

Another machine/user must use the **same container ID AND namespace**, but its
own cache and authorization. A new container is a distinct application document,
even with the same namespace. Tinylicious does not prove real authentication.
`BRAIN_FLUID_PORT` overrides the development port for both wrapper and client.

Azure connection entry point (implemented/typechecked, **not live-verified**):

```powershell
$env:BRAIN_FLUID_MODE = 'azure'
# Set AZURE_FLUID_RELAY_ENDPOINT, AZURE_FLUID_RELAY_TENANT_ID,
# AZURE_FLUID_RELAY_TOKEN_URL, AZURE_FLUID_RELAY_APP_TOKEN using your approved flow.
npm run fluid -- create
```

The sample's ordinary Azure entry point uses an existing relay and HTTPS application token
service. The sample POSTs `{tenantId, documentId}` with the user's application
bearer and expects `{jwt}`; the service must authenticate the caller, enforce
document ACLs, mint/refresh correctly scoped relay JWTs, and keep relay signing
keys server-side. No keys are accepted by this entry point, which does not
provision infrastructure. That application token-service path was not exercised.
A separate HTTPS auth service is not required for every hosted proof: an
in-memory server-side test token provider would suffice for the isolated comparison.

The approved optional hosted comparison was **attempted and BLOCKED before
container creation**: Azure API `2022-06-01` Basic provisioning in East US 2
returned HTTP 500 twice; a supported West Europe alternative using the **same
relay resource ID** returned HTTP 409 / `InvalidResourceLocation`. **Zero hosted
content assertions ran**, and no signing keys were retrieved. The exact temporary
resource group was deleted; its absence was independently verified, and GET of
the exact attempted relay returned 404. No billable test resources remain.
`Microsoft.FluidRelay` subscription provider registration remains enabled; this
is not a deployed relay resource. Hosted Fluid remains optional: the ordinary
user default is existing OneDrive/SharePoint or Google Drive, without Azure provisioning.

## Conflict and durability contracts

* Each local operation uses a UUID and a real unique Yjs client update.
  Durable hash-named chunks are written and fsynced before a write returns.
  A chunk without an acknowledgment marker **is** the offline outbox; uploaded
  chunks are retained as replay cache. Failed uploads never remove them.
  Cache leases reject concurrent processes sharing a cache; a dead local PID's
  lease can be reclaimed. Do not share a cache over a network filesystem.
* Append preserves both offline fragments. Causally later writes replace all
  observed earlier content; concurrent full writes produce explicit
  `SQUAD CONCURRENT VERSIONS` markers preserving both versions.
  A concurrent delete/edit preserves the edit and surfaces a tombstone conflict.
  A subsequent write/delete after synchronization resolves the conflict.
  SDK markdown collections are not conflict resolvers: inspect/resolve markers
  before consuming conflicting structured team/config/decision documents.
* Deletes are tombstone operations, not remote chunk deletion. New directories
  and concurrent child creations can survive an unobserved recursive delete;
  recursive deletion is not a distributed transaction. No GC/compaction is
  performed, so history remains recoverable and storage grows.
* Duplicate/reordered Yjs updates converge. Hash corruption fails closed.
  Stable namespace hashes separate documents in a shared folder; namespaces
  are **not access-control boundaries**. Folder/document sharing controls access.
* `read/write/append/list/delete/exists/mkdir/isDirectory/copy/stat`, plus the
  legacy synchronous equivalents, operate on the local replica. `stat.mtimeMs`
  is explicitly 0 (no trustworthy cross-host filesystem timestamp).
* **Atomic rename and distributed create-if-absent are explicitly rejected**,
  not emulated with a racy read/write. Offline CRDTs cannot promise global
  conditional exclusion without an online arbiter.
* This intentionally simple operation-log representation is unbounded and
  O(history²) in causal metadata. It is for small synthetic documents only;
  no chunking of oversized individual Fluid messages, service quota handling,
  credential UI, background sync, ACL administration, schema migration,
  malicious-writer validation, power-loss/filesystem guarantees beyond file
  fsync, or production performance claims are included.

See `results.json` for measured evidence and explicit BLOCKED lanes.
The failed-upload/outbox test was also mutation-checked against the actual source:
acknowledging a chunk before upload made it fail (`pending 0 !== 1`); the mutation
was reverted and the original suite rerun green. The expanded delegated-transport
suite now has 12 passing tests, separate from the actual live-service run.
