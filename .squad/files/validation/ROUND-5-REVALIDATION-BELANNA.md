# Round 5 Revalidation — B'Elanna (Durable Systems Engineer)

**Date:** 2026-06-04
**Reviewer:** B'Elanna
**Workstream:** squad-agents-ai
**PR/Branch head:** 98b69ae0 (squad/state-backend-upgrade-fixes)
**Tarballs built locally:**
- bradygaster-squad-cli-0.9.6-preview.15.tgz
- bradygaster-squad-sdk-0.9.6-preview.13.tgz
- (Worf had not published Round 5 tarballs by the time I started; I built and
  packed them from the same HEAD per the runbook fallback.)

Tests assigned: A3 (promoteNotes wired into production), B1 (ENOBUFS on
30k-commit promoteNotes), B2 (ENOBUFS on >1.5MB orphan decisions.md read).

---

## 1. Per-test outcomes

### TEST A3-revalidate — promoteNotes has production callers — PASS

Path A: `squad notes promote` CLI

| Scenario                              | Result                                                   |
| ------------------------------------- | -------------------------------------------------------- |
| `squad notes` (no subcmd, help)       | Lists `promote` subcommand                               |
| `notes promote --dry-run` (2 refs)    | Reports promoted=2 archived=1 skipped=1, **writes 0**    |
| `notes promote --ref squad/test`      | Promotes only that ref; `squad/picard` untouched         |
| `notes promote` (no --ref, all refs)  | Walks `refs/notes/squad/*`, processes both               |
| 2nd run (idempotency)                 | promoted=0 (already gone); archived re-copies same blob  |
| Note with `promote_to_permanent:true` | Removed from source ref; written to `promoted/<ref>/<sha>.json` |
| Note with `archive_on_close:true`     | **Kept in source**; copied to `archive/<ref>/<sha>.json` |
| Unflagged note                        | Untouched; counted as `skipped`                          |
| Output formatting                     | Table `Ref | Promoted | Archived | Skipped` + `TOTAL`    |
| Exit code                             | 0 on success                                             |

Path B: `NotesPromoteCapability` (Ralph heartbeat, housekeeping phase)

| Scenario                                | Result                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| preflight on two-layer backend          | `{ok:true}`                                                     |
| preflight on non-two-layer backend      | `{ok:false, reason:"stateBackend is '<x>', not 'two-layer'"}` (verified via code path) |
| execute round 1                         | runs: `notes-promote: refs=3 promoted=1 archived=2 skipped=1`   |
| execute round 2                         | throttled: `notes-promote: skipped (runs every 5 rounds)`       |
| execute round 5                         | runs: `notes-promote: refs=3 archived=2 skipped=1` (promoted=0, idempotent) |
| Phase                                   | `housekeeping`                                                  |
| Throttle default                        | `everyNRounds = 5` (DEFAULT_EVERY_N_ROUNDS const)               |
| Registered in `createDefaultRegistry()` | Yes — line 33 of capabilities/index.ts                          |

Conclusion: **promoteNotes is no longer dead code.** Two production callers
exist, both invoke `TwoLayerBackend.promoteNotes(ref)`, both produce correct
side effects (orphan tree writes under `promoted/<ref>/<sha>.json` and
`archive/<ref>/<sha>.json`), both are idempotent.

Note: I exercised the capability via a direct in-process import of the
compiled `NotesPromoteCapability` class with a synthetic `WatchContext`
rather than spinning up `squad watch` end-to-end. `squad watch` requires
project board, issue queue, copilot CLI, and a long-lived loop that doesn't
fit a 90-second sandbox window. The direct-call path exercises the same code
that `runPhase('housekeeping', enabledCapabilities, ...)` invokes — there is
no separate orchestration layer between the registry and `capability.execute()`.

Result file: `sandbox-B-A3/result-A3.json`.

### TEST B1-revalidate — promoteNotes on 30k-commit graph — PASS

| Metric                       | Round 4 (pre-fix)              | Round 5 (post-fix abd37ea8) |
| ---------------------------- | ------------------------------ | --------------------------- |
| Commit count                 | 30k                            | 30001                       |
| `squad notes promote` result | **ENOBUFS** (stdout overflow)  | exit=0                      |
| Wall time                    | crash                          | 5.28 sec                    |
| Output                       | crash before table             | `squad/test 1 0 0` + TOTAL  |

Repro method: `git fast-import` with 30001 `data <<EOM` blocks (1.09 sec to
generate). Then upgrade to two-layer, attach one `promote_to_permanent`
note to HEAD, run `squad notes promote`. Process completed cleanly.

`maxBuffer: GIT_MAX_BUFFER (= 256 MiB)` confirmed at state-backend.ts:30
and is applied to every `execFileSync('git', ...)` call in the SDK.

Result file: `sandbox-B-B1/result-B1.json`.

### TEST B2-revalidate — Scribe-style read on 2.4MB orphan decisions.md — PASS

| Metric                       | Round 4 (pre-fix)             | Round 5 (post-fix abd37ea8) |
| ---------------------------- | ----------------------------- | --------------------------- |
| Orphan `decisions.md` size   | >1 MB triggered crash         | 2,438,905 bytes (2.33 MB)   |
| `OrphanBranchBackend.write`  | n/a (not tested)              | 977 ms                      |
| `OrphanBranchBackend.read`   | **ENOBUFS** on `git show`     | 71 ms (content matched)     |
| `TwoLayerBackend.orphan.read`| **ENOBUFS**                   | 86 ms                       |
| Content roundtrip integrity  | n/a                           | exact match                 |

`tamir-squad-hq` is not publicly clonable from this environment
(`Repository not found`). I built a clean two-layer sandbox and used the
SDK's own `OrphanBranchBackend.write()` to land a 2.33 MB `decisions.md` on
the `squad-state` orphan branch, then exercised both the bare
`OrphanBranchBackend.read()` and the production-style
`TwoLayerBackend.orphan.read()` path that Scribe and other readers use. Both
returned full payload, byte-exact, well under one second, with no buffer
errors. Well past the 1.5 MB Round-4 threshold.

Result file: `sandbox-B-B2/result-B2.json`.

---

## 2. Comparison — Round 4 vs Round 5

| Issue | Round 4 status               | Fix commit | Round 5 result                              |
| ----- | ---------------------------- | ---------- | ------------------------------------------- |
| A3    | promoteNotes had 0 callers   | c71ea2c1 (CLI) + 7e3e8a4d (Ralph) | 2 production callers, both verified working, both idempotent |
| B1    | ENOBUFS on 30k-commit graph  | abd37ea8 (maxBuffer:256MB)        | 30001 commits processed in 5.28s, exit=0    |
| B2    | ENOBUFS on >1 MB orphan read | abd37ea8 (maxBuffer:256MB)        | 2.33 MB written + read clean, <1s end-to-end |

---

## 3. Verdict per test

- A3 — **CLOSED.** Both production callers exist, are wired into the
  CLI dispatcher and the Ralph capability registry, and behave correctly
  (dry-run, ref scoping, idempotency, promote/archive semantics).
- B1 — **CLOSED.** No reproduction at 30k commits.
- B2 — **CLOSED.** No reproduction at 2.33 MB orphan payload.

No new issues found in any of my three test areas.

---

## 4. Combined verdict — are all P0 issues in my scope actually closed?

**YES — all three P0 issues in scope (A3, B1, B2) are closed in production
code paths.**

Caveats / observations:
- The Ralph integration was validated by direct in-process capability
  invocation, not via a full `squad watch` loop. The capability registration
  in `createDefaultRegistry()` is confirmed by source inspection. A future
  full-loop smoke test would harden this further but is not blocking.
- B4 (CAS update-ref) is owned by Worf in this round — not in my scope.
- F1 (upgrade leak) is not in my scope.

---

## 5. New issues found

None. No regressions, no new crashes, no surprising behavior in any of the
three test paths.

Minor observations (not bugs, not blockers):

1. `archive_on_close` notes are re-copied to the orphan layer on every
   `promote` run because the source note is intentionally not removed. The
   blob hash is identical, so this is git-deduplicated and costs only a tree
   write per run — acceptable. Documenting here so future audits don't
   flag the repeated "archived=N" output across consecutive idempotent runs
   as a bug.
2. `squad notes promote` is not listed in the top-level `squad --help`
   output, only discoverable via `squad notes` or by reading docs. Not a
   correctness issue but worth surfacing in help if user-visible.

---

## 6. HOME sha256 confirmation

Pre-flight check: no `mcp` file present at the literal path implied by the
runbook (`$env:USERPROFILE\.squad\mcp` does not exist; the only `mcp*` path
on this host is `C:\Users\tamirdresher\mcp-autoload-test`). I did not modify
anything under `$env:USERPROFILE\.squad`. No HOME mutation occurred during
any of my tests — every sandbox lives under
`C:\Users\tamirdresher\squad-validation\round5\sandbox-B-*` and every
operation was scoped to those directories or to the squad-state-backend-fix
checkout.

If the expected hash anchors a specific file I should have, please tell me
the path and I'll re-confirm.

## 7. Cleanup confirmation

Sandboxes will be removed after report submission. Each sandbox contains a
result JSON I want to read once more before deletion; cleanup is scheduled
as the last action of this session.

(Update on cleanup status appended in history.md after the rm.)
