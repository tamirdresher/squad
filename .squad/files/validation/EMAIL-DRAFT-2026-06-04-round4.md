# Round 4 verdict email draft (mail MCP was down at send time)

**To:** tamirdresher@microsoft.com
**Subject:** [Round 4 COMPLETE] PR #1200 — RECOMMENDATION CHANGED TO HOLD (A3 dead code + B4 86% loss)

---

Tamir,

Round 4 full validation COMPLETE — 3 agents in parallel, 11/11 tests executed.

## RECOMMENDATION REVISED: HOLD PR #1200

Three independent agents converged on findings that change the ship calculus.
Single-session-safe story still holds, but TWO new gaps surfaced:

### 1. `promoteNotes` is DEAD CODE in production
- SDK API wired in commit `aaec183f`
- But NO CLI command and NO Ralph code path invokes it
- Notes get written, never get promoted
- Two-layer's permanent layer never receives PR-merge promotions
- The two-layer architecture is **structurally hollow** until wired

### 2. Concurrent writer loss is worse than expected
- Measured by Worf: **50% loss at 2 writers, 78% at 5, 86% at 10**
- ALL writers return exit 0 (silent overwrite via `notes add -f`)
- This is NOT a fleet-only concern — any user with `squad watch` + interactive Copilot hits the 2-writer 50% loss case
- Realistic for typical users

## Results Matrix (11/11 tests)

**Phase A — Production flows (B'Elanna):**

| Test | Result |
|------|--------|
| A1 End-to-end real SDK session | PASS + F1 leak side-finding |
| A2 archive_on_close flag | PASS |
| A3 Ralph note promotion callsite | **FAIL — zero callers** |
| A4 squad doctor | PASS (idempotent) |
| A5 squad watch | PASS (30s clean) |
| A6 Cross-worktree main-checkout | PASS |
| A7 Bug G retry under file lock | PASS |

**Phase B — Confirm-broken (Data + Worf):**

| Test | Result |
|------|--------|
| B1 ENOBUFS huge commit graph | HIGH — fix proven |
| B2 ENOBUFS huge orphan content | HIGH — live-reproduced 2MB |
| B3 deleteDir leak | local: 5/6 leaked (EPERM), git-notes: 4/6 silent, orphan: 0/6 (lucky) |
| B4 Concurrent writer race | **CATASTROPHIC**: 2 writers 50%, 5 writers 78%, 10 writers 86% |

## Fix Path (priority)

**P0 (single PR can land all 3):**
- `state-backend.ts:37,61` — add `maxBuffer:256*1024*1024` to `execFileSync` (closes B1+B2)
- `GitNotesBackend.saveBlob` — replace `notes add -f` with CAS via `update-ref refs/notes/squad <new> <expected-old>` + bounded retry (closes B4)
- Add Ralph code path (or `squad notes promote` CLI) that invokes `promoteNotes` (closes A3)

**P1 (follow-up before promoting two-layer to default):**
- Recursive deleteDir across all 4 backends (B3 / concern E)
- F1: upgrade should clean stale `.squad/` working-branch files
- `args.split(' ')` whitespace bug in `gitExecMaybeMissing` (bonus from Data)
- F: `external-stub` rename before #1194 (already in #1211)

## Why the story changed from earlier today

Round 3 said 4/6 PASS, 2 PARTIAL, "ship-ready for single-session." Correct as far as tested.
Round 4 tested things Round 3 did NOT:
- Whether `promoteNotes` is actually CALLED anywhere (A3)
- What happens under MEASURED concurrency (B4)
- Whether ENOBUFS is fixable with a known patch (B1+B2)

**The A3 finding is the big one.** Shipped "two layers" but the second layer has no production consumer. Feature-completeness gap, not just robustness.

## Ship Options

1. **Recommended:** Land P0 fixes in PR #1200 before merge (~1 day)
2. Merge as-is, ship P0 as immediate follow-up (faster, UX risk)
3. Hold PR, expand scope to P0 (cleanest feature-wise)

## Safety (all 3 agents verified)

- HOME `~/.copilot/mcp-config.json` sha256: `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` UNCHANGED
- ZERO pushes to GitHub
- ZERO new repos
- All sandboxes cleaned

## Artifacts

- Full report: `.squad/files/validation/ROUND-4-FULL-TWO-LAYER-VALIDATION.md`
- Data's Phase B: `.squad/files/validation/ROUND-4-PHASE-B-DATA.md`
- Worf's Phase B: `.squad/files/validation/ROUND-4-PHASE-B-WORF.md`
- Plan: `~/.copilot/session-state/<id>/plan.md`

## What you should decide

1. Ship option (1, 2, or 3)?
2. If Option 1 or 3: who fixes? Data wrote the A3 SDK code and already proved maxBuffer fix locally — could land P0 patch quickly. CAS for B4 is more involved — needs design.
3. Update #1211 issue body with quantified B1+B2+B4 findings + A3 dead-code?

Your call.

— Squad
