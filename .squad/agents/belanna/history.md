# B'Elanna — Agent History
**Last Updated:** 2026-06-04T21:35:00Z
**Archive:** See `history-summary.md` for consolidated learnings from all prior rounds.

## Round 5 — P0 Revalidation (2026-06-04)

**Status:** COMPLETE — all 3 P0 closed with empirical evidence, ship ready

**Revalidation Results:**
- A3 (promoteNotes wiring): 2 production callers verified, idempotent ✓
- B1 (30k-commit ENOBUFS): succeeded 5.28s (was crash) ✓
- B2 (2.33MB orphan blob ENOBUFS): <1s byte-exact round-trip (was crash) ✓

**Key Insights:**
- Two-layer backend has two coexisting note storage schemes (no conflict, different refs)
- TwoLayerBackend's orphan-branch CAS pattern explains crash immunity
- Git-notes lacks CAS → data loss guaranteed without external coordination
- Windows vitest: multi-subprocess tests need 30000ms timeout (default 5000ms insufficient)

**Dogfood Findings (Iter-9):** F1 deferred, F2–F5 resolved/approved
