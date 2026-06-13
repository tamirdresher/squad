# Decision — Round 5 P0 SDK Fixes (state-backend hardening)

**Agent:** Data (Squad Framework Expert)
**Date:** 2026-06-04
**Workstream:** squad-agents-ai
**Scope:** `packages/squad-sdk/src/state-backend.ts` in `squad-state-backend-fix` worktree on branch `squad/state-backend-upgrade-fixes`
**Status:** Implemented, committed locally (3 commits), awaiting Picard's P0.3 + coordinator-driven push.

## Commits

| # | SHA | Title |
|---|-----|-------|
| 1 | `abd37ea8` | fix(sdk): add maxBuffer to git exec wrappers (B1+B2 ENOBUFS) |
| 2 | `8f7e7f71` | fix(sdk): add CAS to GitNotesBackend + OrphanBranchBackend writers (B4) |
| 3 | `3f13cdf7` | fix(sdk): tokenize git args properly in gitExecMaybeMissing |

## Test result

`vitest run test/state-backend.test.ts test/upgrade-eperm-state-backend-continues.test.ts test/upgrade-state-backend.test.ts` → **142/142 passing** (119 pre-existing + 16 new CAS/tokenization + 7 across the two upgrade files). The single "Unhandled Error" surfaced is the vitest-worker RPC timeout that was already present in baseline (environmental, not a test failure). Both SDK and CLI `tsc --noEmit` lint clean.

## P0.1 — maxBuffer (B1+B2)

**Root cause.** `gitExecWithRetry` and `gitExecWithInputAndRetry` invoked `execFileSync` without setting `maxBuffer`, so Node's 1 MiB default capped every git stdout/stderr. Large `ls-tree` listings and `notes show` payloads tripped ENOBUFS in the bench scenarios and surfaced as opaque "git command failed" errors.

**Fix.** Define a single `GIT_MAX_BUFFER = 256 * 1024 * 1024` constant and pass it to both wrappers (and to the new `tryUpdateRef` helper). One constant covers every present and future git exec call.

## P0.2 — CAS for GitNotesBackend + OrphanBranchBackend (B4)

**Root cause.** `git notes add -f` silently overwrites prior notes; `git update-ref <ref> <new>` unconditionally moves the ref. Two writers reading-then-writing in parallel both end with whichever write completed last — the other writer's update is lost. Worf's bench measured 50–86% data loss across 2/5/10 writer fan-outs.

**Design rationale: retry-on-mismatch via update-ref expected-old.** I considered three approaches:

1. **External lockfile** (e.g., `.git/squad-state.lock` via O_CREAT|O_EXCL). Cross-process safe but adds a non-git invariant, leaks on crash, and gives serial throughput.
2. **In-process mutex** (Atomics-backed). Inappropriate — the contention is across processes (multiple coordinator/agent invocations), not threads.
3. **Optimistic compare-and-swap via `git update-ref <ref> <new> <expected-old>`.** Git's native ref-CAS primitive. Cross-process safe by definition, no extra files, zero blocking — just retry when the ref moved under us.

I chose **(3)**. It's the canonical pattern git refs were designed for, has no external state, and gives the highest throughput under low contention while gracefully degrading to retries under high contention.

**Implementation shape.**
- New helper `tryUpdateRef(ref, new, expectedOld | null, cwd) → {ok, stderr}` that wraps `git update-ref` with array-form `execFileSync`. Returns `{ok:false, stderr}` on CAS-shaped stderr (`/is at .* but expected|cannot lock ref|reference already exists/i`), throws for non-CAS git failures.
- `null` expected-old translates to `GIT_NULL_OID` (40 zeros), git's "must not exist" sentinel — used for ref creation in `ensureBranch`.
- `GitNotesBackend`: deleted `loadBlob`/`saveBlob`-via-`notes add -f`. Replaced with `loadBlobAt(refSha)` that reads from a pinned SHA (foundation of the loop) and `atomicSaveBlob(blob, expectedOldRefSha)` that builds the notes commit via plumbing (`hash-object` → `mktree` → `commit-tree`) then calls `tryUpdateRef`. Public `write`/`delete`/`append` each run through a `mutateBlob(operation, mutator)` private that owns the retry loop.
- `OrphanBranchBackend.write` and `.delete`: inline retry loops around their existing tree-build dance. Each iteration re-reads `refs/heads/squad-state`, rebuilds the tree on top of the latest parent, and CAS-publishes.
- `ensureBranch` similarly: initial ref creation uses `tryUpdateRef` with `expected-old=null` and gracefully detects a concurrent creator by re-verifying.

**Backoff.** Jittered exponential — 50 / 100 / 200 / 400 / 800 ms base with ±25% jitter to avoid thundering herd. 5 attempts total. On exhaustion, throw the **new exported `StateBackendConcurrencyError`** (distinct from `GitExecError`) carrying `operation`, `attempts`, and `lastStderr`.

**Tests.** Vitest cannot `vi.spyOn` `child_process.execFileSync` under ESM (module namespace not configurable). I exported a test-only `_setCasInjectorForTesting(fn)` hook that lets a test return forced `{ok, stderr}` results per ref name. This gives deterministic coverage of: success first try, success after 1 conflict, success at the budget edge (4 conflicts), and exhaustion at attempt 5. Plus an out-of-band convergence test that advances the ref via raw git plumbing between the SDK's read and write to prove the loop rebuilds correctly against real ref churn.

## P1.2 — args.split(' ') tokenization

**Root cause.** `gitExecMaybeMissing(args: string, ...)` and `gitExecOrThrow(args: string, ...)` called `args.split(' ')`. `validateStateKey` forbids `\n/\r/\t/\0` but explicitly allows spaces, so a state key like `agents/data picard.md` would split into separate git arguments and either error out or operate on the wrong target.

**Fix.** Change both helpers to accept `string[]`. Converted all 25 internal call sites to array literals. Error messages reconstruct the displayed command via `args.join(' ')`. Added round-trip regression tests covering write/read/exists/list/delete for spaced keys in both backends.

## Out of scope (delegated)

- **P0.3 Ralph wiring** — Picard owns. Will follow up after these commits land.
- **Push to GitHub** — coordinator owns the auth-dance push after Picard's commits land. I committed locally only.

## Invariants verified

- HOME `mcp-config.json` sha256 = `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` (unchanged before/after).
- `npm run lint` (root, both packages) passes.
- 142/142 tests pass.
