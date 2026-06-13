# Round 5 Revalidation — Worf (Security & Reliability)

**Reviewer:** Worf
**Date:** 2026-06-04T20:35:00+03:00
**Workstream:** squad-agents-ai
**HEAD under test:** squad/state-backend-upgrade-fixes @ 98b69ae0a5837cb4ca0c467d5a3e114b8580c5ba
**Tarballs:** bradygaster-squad-sdk-0.9.6-preview.13.tgz, bradygaster-squad-cli-0.9.6-preview.15.tgz (built from HEAD)
**Scope:** Replay of Round 4 B4 (concurrent git-notes writer race) + stress + B3 spot-check.

------------------------------------------------------------------------

## 1. Per-test results table

Harness: same shape as Round 4 — `writer.mjs` calls `GitNotesBackend.write('writers/<id>/<seq>', payload)` M times per process; PowerShell harness spawns N processes via `Start-Process -NoNewWindow -PassThru`, joins on `WaitForExit`, then `reader.mjs` enumerates `list('writers')` recursively and counts leaves. Each test starts with `refs/notes/squad` deleted (clean slate).

| Test | Writers | Per-writer | Expected | Persisted | Lost | Loss% | Writer-self-reported written | CAS-exhaust errors | Circuit-breaker / other typed errors | Non-zero exits | Silent loss? |
|------|---------|-----------|---------:|----------:|-----:|------:|---------------------------:|-------------------:|-------------------------------------:|----------------|--------------|
| B4-1 | 2       | 10        | 20       | **19**    | 1    | 5     | 19                         | 1                  | 0                                    | 1/2            | **NO**       |
| B4-2 | 5       | 20        | 100      | **72**    | 28   | 28    | 72                         | 28                 | 0                                    | 5/5            | **NO**       |
| B4-3 | 10      | 10        | 100      | **46**    | 54   | 54    | 46                         | 44                 | 10                                   | 10/10          | **NO**       |
| Stress | 20    | 10        | 200      | **56**    | 144  | 72    | 56                         | 110                | 34                                   | 20/20          | **NO**       |

Critical invariant verified in every row:
    writer-self-reported `written` == reader-counted `persisted`
There is no row where a writer claimed success for a key that the reader could not find. Every lost write was surfaced to its writer process as a typed error and produced a non-zero exit code. Round 4's signature failure mode — "exit 0, write lost" — is **not reproducible** on 98b69ae0.

Typed error breakdown in the "other" column:
- `StateBackendConcurrencyError: ... after 5 attempts: ... cannot lock ref 'refs/notes/squad': is at X but expected Y` (CAS budget exhausted; the optimistic loop in `state-backend.js` correctly detected stale-base race and surrendered).
- `Circuit breaker OPEN after 5 consecutive git failures. Operation 'git-notes:write(...)' rejected. Will retry after 30s cooldown.` (defense-in-depth: once CAS exhaustion repeats 5x, the `CircuitBreaker` trips and short-circuits subsequent writes for 30 s).

Both error types are *typed, observable, retriable* failure surfaces. Neither is a silent overwrite.

------------------------------------------------------------------------

## 2. Comparison: Round 4 vs Round 5

| Config | R4 persisted | R4 loss% | R4 exit codes | R5 persisted | R5 loss% | R5 exit codes | Behavior change |
|--------|-------------:|---------:|---------------|-------------:|---------:|---------------|------------------|
| 2x10   | 10           | 50%      | all 0 (silent) | 19           | 5%       | 0,3            | silent-loss → loud-loss, persisted +9 |
| 5x20   | 22           | 78%      | all 0 (silent) | 72           | 28%      | all 3          | silent-loss → loud-loss, persisted +50 |
| 10x10  | 14           | 86%      | all 0 (silent) | 46           | 54%      | all 3          | silent-loss → loud-loss, persisted +32 |
| 20x10  | not run in R4 | n/a     | n/a           | 56           | 72%      | all 3          | new datapoint; loud loss |

Two distinct improvements:
1. **Silent loss eliminated.** Loss in R4 was invisible to callers; in R5 every lost write is an exception with a typed name and a stderr line. A multi-writer caller can now detect and react.
2. **Throughput materially improved at the same concurrency.** CAS retry+backoff converts most R4 silent collisions into successful retried writes. 5x20 went from 22% persisted to 72% persisted (+227%). 10x10 went from 14% to 46% (+229%). The catastrophic data-loss curve has flattened by ~3x at moderate concurrency.

------------------------------------------------------------------------

## 3. Verdict: B4 closed?

**Closed for the security-critical surface. Not closed as a hardening question.**

Closed:
- The Round 4 P0 hazard — *git notes silently overwriting each other with exit code 0* — is structurally fixed. The optimistic-CAS loop at `state-backend.js` (5 attempts, jittered 50/100/200/400/800 ms backoff, `update-ref <new> <expected-old>`) does what it claims. Under every concurrency I ran, the conservation law `written-by-process == read-by-reader` held exactly. PR #1200 / commit 8f7e7f71 is sufficient to unblock the "promote two-layer to default" decision *from a data-integrity standpoint*.

Not closed (separate work items, not regressions of the CAS fix):
- **Retry budget is too small for >5 contending writers.** At 10 concurrent writers ~half of attempted writes are rejected; at 20 writers ~72% are rejected. A retry budget of 5 with max ~800 ms backoff caps the loop at ~1.5 s, which is well below the wall time some writes need under contention. Recommend raising `CAS_MAX_ATTEMPTS` (currently 5) or capping by wall time, and/or pairing it with the circuit breaker so callers can distinguish "tried 5x, give up" from "wait 30 s and retry whole batch."
- **Circuit breaker trip is single-process scoped.** Once a writer trips its own breaker it gives up for 30 s. Callers that swallow this without surfacing a "transient, retry later" signal upward will see partial work as if it were permanent failure. This is correct relative to R4 (loud > silent) but the docs should explicitly tell SDK consumers to retry `StateBackendConcurrencyError` and `Circuit breaker OPEN` errors with their own outer loop, not just propagate.
- **No global write coordinator.** The contention is in `git update-ref` on a single ref. At sustained high concurrency the only structural fix is serialization (in-process queue per repo) or moving the hot-path off git notes. Recommend filing a follow-up to add a per-repo serializing mutex in `GitNotesBackend.write` so multi-writer SDK consumers in the same process do not even attempt CAS contention.

Verdict: **B4 PASS — promote eligible. Hardening follow-up tracked as recommendation, not blocker.**

------------------------------------------------------------------------

## 4. Stress-test finding (20 writers x 10)

200 attempted, 56 persisted (28%), 144 lost. **Zero silent loss.** All 20 writers exited with code 3 and reported the loss in their JSON summary.

Error mix under stress:
- 110 `StateBackendConcurrencyError` (CAS retry budget exhausted)
- 34 `Circuit breaker OPEN` (downstream of repeated CAS exhaustion)

Wall clock: 88.8 s for 200 attempted writes spread across 20 processes — the throughput ceiling at this scale is ~2.25 writes/sec aggregate, which matches expectations for serialized `update-ref` on a single git ref with backoff.

Diagnosis: at this contention level the CAS loop is not the bottleneck — the bottleneck is *that there is only one ref*. CAS correctly rejects the colliders, the colliders correctly surface a typed error, the circuit breaker correctly damps the storm. The system fails *safely and loudly*. This is the desired property; the absolute throughput is a separate scaling question.

New finding worth surfacing to Data: under stress the writer process can be in a state where:
- 4 of 10 keys are persisted
- 1 is rejected by CAS
- 5 are rejected by the breaker (because the CAS rejections tripped it)

The error message text differs between the two failure modes. SDK consumers who only check `instanceof StateBackendConcurrencyError` will miss the breaker errors. Recommend either making `CircuitBreaker` throw a subclass of `StateBackendConcurrencyError`, or documenting both as "transient, retry whole operation."

------------------------------------------------------------------------

## 5. Secondary B3 spot-check (deleteDir leak)

Quick re-test against the new tarballs using `StateBackendStorageAdapter.deleteDir('dir1')` after seeding `dir1/a`, `dir1/sub/b`, `dir1/sub/c`, and `dir2/keep`:

| Backend | dir1/a after delete | dir1/sub/b after delete | dir1/sub/c after delete | dir2/keep after delete | Verdict |
|---------|---------------------|--------------------------|--------------------------|------------------------|---------|
| git-notes | gone (correct)    | **STILL PRESENT (leak)** | **STILL PRESENT (leak)** | preserved (correct)    | **STILL BROKEN** |
| orphan    | gone (correct)    | gone (correct)           | gone (correct)           | preserved (correct)    | FIXED / not affected |

`deleteDir` on the git-notes backend is shallow — it removes direct children of the named prefix but does not recurse into nested keys. This matches Round 4's B3 finding (not in this PR's scope) and confirms #1211 still has work. Orphan is fine. Two-layer reads from git-notes first, so a consumer that calls `deleteDir` then later `read('dir1/sub/b')` will get the *stale* nested data back through the notes layer until something else clobbers it. Recommend not letting the CAS work fool reviewers into thinking the broader state-backend surface is closed.

------------------------------------------------------------------------

## 6. HOME mcp-config sha256 confirmation

Expected: `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86`
Actual (post-run): `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86`
**MATCH** — environment invariant preserved.

------------------------------------------------------------------------

## 7. Cleanup

Sandbox `C:\Users\tamirdresher\squad-validation\round5\sandbox-W-B4` removed at end of run. New tarballs preserved in `C:\Users\tamirdresher\squad-validation\round5\` for cross-reference with Data's results. No GitHub pushes. No new repositories. `gh auth status` still on `tamirdresher_microsoft`.

------------------------------------------------------------------------

## Bottom line

P0 hazard from Round 4 is closed. CAS is in place, it works, and silent overwrite is eliminated across the entire concurrency range I tested (2 through 20 writers). Two-layer can be promoted from a data-loss-safety standpoint. Three non-blocking follow-ups recommended: raise the retry budget, classify `Circuit breaker OPEN` under the concurrency-error family, and finish the orthogonal `deleteDir` recursion fix on the notes backend (#1211).
