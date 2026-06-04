# Data — Agent History
**Last Updated:** 2026-06-04T21:35:00Z
**Archive:** See `history-summary.md` for consolidated learnings from all prior rounds.

## Round 5 — P0 SDK Fixes (2026-06-04)

**Status:** COMPLETE — 3 commits, 142/142 tests pass, ship ready

**Commits:**
- maxBuffer ENOBUFS fix (B1+B2)
- CAS compare-and-swap implementation (B4)  
- args tokenization refactor (P1.2)

**Learnings:**
- Single choke point: all git invocations route through 2 wrappers in state-backend.ts
- maxBuffer = 256 MB covers all current and future git invocations
- CAS via update-ref with 5-retry jittered backoff prevents lost updates under contention
- Windows PowerShell: use `execFileSync` array form to bypass cmd.exe `^` escape interpretation
