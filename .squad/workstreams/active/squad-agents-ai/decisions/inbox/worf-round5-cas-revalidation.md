# Worf — Round 5 CAS Revalidation Decision

**Reviewer:** Worf (Security & Reliability Reviewer)
**Date:** 2026-06-04
**Workstream:** squad-agents-ai
**PR:** #1200, head 98b69ae0 (CAS fix at commit 8f7e7f71)
**Scope of decision:** Whether the Round 4 P0 data-loss hazard (B4) is closed sufficiently to unblock promoting the two-layer state backend to default.

## Verdict

**APPROVE — B4 closed. P0 hazard structurally eliminated. Two-layer is promote-eligible from a data-integrity standpoint.**

## Evidence (replay of Round 4 B4 harness)

| Config | Persisted/Expected | Loss% | Silent loss | Writer-reported written == persisted |
|--------|--------------------|------:|-------------|--------------------------------------|
| 2x10   | 19/20  | 5%  | NO | YES (19=19) |
| 5x20   | 72/100 | 28% | NO | YES (72=72) |
| 10x10  | 46/100 | 54% | NO | YES (46=46) |
| 20x10  | 56/200 | 72% | NO | YES (56=56) |

In every test every lost write was reported to its writer as a typed exception (StateBackendConcurrencyError or Circuit breaker OPEN), every affected writer exited non-zero, and the writer's self-reported success count matched the reader's persisted count exactly. The R4 signature "exit 0, write silently lost" is not reproducible on 98b69ae0.

## Non-blocking follow-ups (recommend file as separate issues, not gate on this PR)

1. **Raise CAS retry budget.** CAS_MAX_ATTEMPTS=5 with max ~800 ms backoff is too small for >5 concurrent writers. Consider wall-time budget (e.g. 5 s) instead of attempt-count, or raise to 10 attempts. Today's behavior is correct (loud failure) but reduces successful throughput at moderate contention.
2. **Classify CircuitBreaker errors as concurrency errors.** The breaker throws a generic Error whose .name is not StateBackendConcurrencyError. SDK consumers using ``instanceof StateBackendConcurrencyError`` will miss it. Make it a subclass, or document both as the same transient-retry surface.
3. **Add per-process serializing mutex for GitNotesBackend.write.** When multiple async writers in the same SDK process target the same ref, they should queue locally instead of racing CAS. Cheap correctness win; orthogonal to CAS.
4. **#1211 deleteDir leak on git-notes still present.** Orphan deleteDir is correct, notes is shallow. Not in PR #1200 scope but confirm #1211 is still tracked.

## Stress-test footnote (new datapoint, 20 writers)

Tested 200 writes across 20 processes — 56 persisted, 144 typed-error-rejected, 0 silent. Confirms the CAS surface fails safely under load far beyond the originally exercised range. Throughput ceiling at this scale is ~2.25 writes/sec aggregate, which is consistent with serialized update-ref on a single ref and not a CAS-implementation issue.

## Environment invariants

- HOME mcp-config sha256: 928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86 (MATCH, unchanged)
- Sandbox C:\Users\tamirdresher\squad-validation\round5\sandbox-W-B4 deleted at end of run
- No GitHub pushes, no new repositories
- gh auth: tamirdresher_microsoft (unchanged)

## Full report

See .squad/files/validation/ROUND-5-REVALIDATION-WORF.md
