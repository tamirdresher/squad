# Round 5 final email draft (mail MCP failing)

**To:** tamirdresher@microsoft.com
**Subject:** [Round 5 COMPLETE] PR #1200 SHIP READY — all 3 P0 closed, revalidated, HOLD lifted

---

Tamir,

Round 5 COMPLETE. All 3 P0 issues fixed, pushed, revalidated. Ship recommendation flipped from HOLD to SHIP.

## PR #1200 — SHIP READY

- URL: https://github.com/bradygaster/squad/pull/1200
- Head: `98b69ae0`
- Mergeable: TRUE, state: clean
- ALL 6 CI jobs GREEN
- 6 Round 5 commits ahead of Round 4 head (aaec183f)

## What landed in Round 5 (6 commits)

**Data's SDK fixes** (~25 min, 142/142 tests pass):
- `abd37ea8` fix(sdk): add maxBuffer to git exec wrappers (B1+B2 ENOBUFS)
- `8f7e7f71` fix(sdk): add CAS to GitNotesBackend + OrphanBranchBackend (B4)
- `3f13cdf7` fix(sdk): tokenize git args properly in gitExecMaybeMissing

**Picard's CLI + Ralph wiring** (~22 min, 19/19 targeted tests pass):
- `c71ea2c1` feat(cli): add 'squad notes promote' command (P0.3 A3 production caller)
- `7e3e8a4d` feat(cli): wire promoteNotes into Ralph heartbeat (P0.3 A3 path B)
- `98b69ae0` fix(cli): clean stale .squad/ working-branch files after upgrade (F1)

## Revalidation results

**Worf — B4 concurrent writer harness:**

| Concurrency | R4 silent loss | R5 result |
|-------------|----------------|-----------|
| 2 writers | 50% (silent) | **5% (loud, typed CAS error)** |
| 5 writers | 78% (silent) | 28% (loud) |
| 10 writers | 86% (silent) | 54% (loud, all exit 3) |
| 20 writers | n/a | 72% (loud, all exit 3) |

**Critical conservation law** "writer-self-reported == reader-counted" held in all 4 runs. Round 4's silent-loss signature is **structurally eliminated**.

**B'Elanna — A3 + B1 + B2:**

| Test | R4 | R5 |
|------|-----|-----|
| A3 | 0 callers (dead code) | 2 production callers verified, both idempotent |
| B1 | crashed at 30k commits | succeeded in 5.28s |
| B2 | crashed at ~1MB orphan | 2.33MB round-trip <1s, byte-exact |

## Two Round-5 status-changing facts

1. **`promoteNotes` IS NOW CALLED IN PRODUCTION** — `squad notes promote` CLI + Ralph heartbeat capability. Two-layer's "permanent layer" actually receives promotions. No longer structurally hollow.

2. **Concurrent writer SILENT loss is STRUCTURALLY ELIMINATED** — all losses are LOUD (typed error with exit 3). The single-user-with-squad-watch case (2-writer 50% silent loss) is GONE.

## Deferred to #1211 (still appropriate)

- Raise CAS retry budget
- Inherit breaker error from concurrency error
- Per-repo in-process mutex
- B3 recursive deleteDir on git-notes backend
- E recursive deleteDir on local backend
- F external-stub rename before #1194
- Tier 3 PR-merge workflow step (CRLF churn)

## What you should decide

1. **MERGE PR #1200 now** (squash recommended, 16 total commits)
2. TAG v0.9.6-insider.4
3. PUBLISH `@bradygaster/squad-cli@insider` + `@bradygaster/squad-sdk@insider`
4. Update #1211 body with closed/open status

**The HOLD recommendation from Round 4 is now LIFTED.** Two-layer works in production for all flows we tested.

— Squad
