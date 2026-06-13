# B'Elanna Agent — History Summary (Round 5)

**Date:** 2026-06-04T21:35:00Z  
**Original Size:** 24,983 bytes  
**Summarized From:** `.squad/agents/belanna/history.md`

## Core Mission

B'Elanna drives Squad.Agents.AI delivery to bradygaster/squad: .NET adapter via Microsoft Agent Framework. Handles library design, sample flows, CI/publish, PR coordination, upstream community voice.

## Key Rounds

### Round 2–3: Upstream Issue + Sample Coordination
- Researched bradygaster/squad community contribution patterns
- Posted tracking issue #1205 (community contribution proposal)
- PR #3 Round 2c: sample co-location under `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/`
- All 43 tests pass, CI green on ubuntu + windows
- Upstream PR conventions documented (What/Why/How/Checklist format)

### Round 4 Full Validation: Two-Layer State Backend
- **B1+B2 ENOBUFS revalidation:** 30,001 commits succeeded 5.28s (was crash); 2.33MB orphan round-trip <1s byte-exact
- **A3 promoteNotes wiring:** 2 production callers verified (CLI + Ralph), both idempotent
- **B4 B'Elanna review concern:** TwoLayerBackend has two coexisting note storage schemes; flag semantics (promote_to_permanent=MOVE+DELETE, archive_on_close=COPY+KEEP) documented
- **Reachability filter:** `git rev-list HEAD` filters to commits reachable from HEAD (avoids orphaned commits)
- **Windows vitest gotcha:** Default 5000ms timeout insufficient; multi-subprocess tests need 30000ms
- **Sub-layer fields public readonly:** Enables both `verifyStateBackend()` probing and clean test spies

### Round 5: P0 Revalidation (COMPLETED)
- **A3:** 2 production callers re-verified, idempotent
- **B1:** 30k commits, succeeded 5.28s (was crash)
- **B2:** 2.33MB orphan round-trip <1s byte-exact (was crash)
- All 3 P0 issues confirmed closed with empirical evidence

## Core Learnings

1. **Spec the call graph, not the syscall:** Trace where results flow (e.g., deleteDir→replaceEntry→parent tree)
2. **maxBuffer is the silent killer:** First review question on `execFileSync` wrappers
3. **Read-modify-write on single anchor needs CAS:** Orphan-branch uses commit-tree + update-ref CAS; git-notes lacks CAS → data loss guaranteed
4. **CLI wiring is validation surface:** promoteNotes perfect SDK API with zero CLI callers = incomplete shipment until Ralph invokes
5. **Upgrade cleanup is part of correctness:** Divergence between on-disk and backend unacceptable
6. **Code-verify brittle stuff:** Windows lock races + 25k-commit repros don't need live repros if code is inspectable
7. **Use junctions for cheap worktree setup:** `mklink /J` vs copy avoids 504 MB duplication
8. **Harness lessons:** C1 use direct refs, C2 needs baseline, payload >3000 chars needs file passing, use `git cat-file -s` for 0-byte checks

## Dogfood Findings (Iter-9)

- F1: Sample v0.2 deferred (not blocker)
- F2: Upgrade `--flag` resolved
- F3: E2E two-layer validation confirmed (root cause eliminated)
- F4: MCP layer anomaly captured as NEW-4 (backend sound)
- F5: Teams drafts ready (pending approval)

## Status

**Round 5 P0 revalidation complete. All 3 P0 closed with empirical evidence. Ship ready.**
