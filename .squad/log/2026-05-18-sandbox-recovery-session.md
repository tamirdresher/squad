# 2026-05-18T12:08:34.040+03:00 — Sandbox Death & Orphan Issue Recovery Session Log

**Scribe Session Log:** Design consolidation for stale-lease recovery within Ralph-style ADC runner MVP

---

## Context

**Spawn Event:** B'Elanna and Worf completed deep-dive analysis on sandbox failure modes and safe recovery.

**User Directive (implicit):** Ralph-style 5-min ADC runner must be resilient to sandbox crashes, evictions, and timeouts without creating orphaned issues or duplicate work.

**Scribe Task:** Merge B'Elanna's failure-mode analysis + Worf's mandatory guardrails into decisions.md; write orchestration log; create session log; update agent histories; stage and commit.

---

## Design Consolidation

### Problem Statement

A sandbox is assigned to issue #N via the 5-min orchestrator loop:
1. Label `squad:processing` is applied
2. Lease entry is written to `.squad/.lease-store.json`
3. Sandbox is resumed via ADC
4. Issue payload is uploaded
5. `execShell(sandboxId, "node /squad/runner.js")` begins execution

**Failure scenario:** Before execution completes or before a PR is opened, the sandbox crashes (OOM, eviction, network failure), is preempted, or the orchestrator Function instance is recycled.

**Questions:**
- Q1: Does this create an orphaned issue (stuck with `squad:processing` label, never reclaimed)?
- Q2: How do we distinguish a dead sandbox from a slow-but-alive sandbox?
- Q3: How do we prevent duplicate work when recovery assigns a new sandbox to the same issue?
- Q4: How do we preserve partial work (commits on `squad/issue-<N>` branch) if the sandbox crashed mid-execution?

### B'Elanna's Analysis (Failure-Mode Trace)

**Q1 Answer: No orphans, provided TTL + stale-sweep is wired correctly**

Trace:
```
t=0:00    Azure Function fires. Lease written, sandbox starts.
t=0:04    Sandbox crashes (no squad:done label written; squad:processing remains)
t=0:05–0:30  7 more 5-min scans; lease TTL ticks down
t=0:35    Scan fires. Stale-lease sweep: expires_at < now() → EXPIRED
          → Check GitHub for PR on squad/issue-<N> branch
          → No PR: remove squad:processing, delete lease, re-queue issue
          → PR exists: remove squad:processing, add squad:pr-open, transition phase
Result:   Issue stuck time = 35 minutes max (TTL + 1 scan interval)
          Issue is NOT orphaned; it's recovered and re-queued
```

**Q2 Answer: Model A (ADC status check) vs Model B (sandbox heartbeat)**

| Aspect | Model A (Recommended) | Model B (Fallback) |
|--------|------|--------|
| **Mechanism** | Scanner queries ADC status before sweep | Sandbox writes heartbeat every 10 min |
| **Dead detection** | ADC says `STOPPED`/`CRASHED`/`NOT_FOUND` → reclaim | No recent heartbeat + TTL expired → reclaim |
| **Slow sandbox handling** | ADC says `RUNNING` → extend TTL, recheck next cycle | Heartbeat is recent → do not reclaim |
| **Prerequisite** | ADC SDK `getSandboxStatus(id)` API available | Agent-side heartbeat write code |
| **Correctness guarantee** | **Label age alone is NOT sufficient.** Must use at least one: ADC status API or heartbeat. Label age alone is a correctness bug. | Same guarantee, different mechanism |

**Decision:** Model A preferred (no agent-side instrumentation). Model B fallback if ADC status API unavailable.

**Critical Insight:** A 35-minute `squad:processing` label could mean either:
- Dead sandbox (crashed at t=0:04) → should reclaim immediately
- Slow sandbox (still working on large task) → should NOT interrupt

Only ADC status or heartbeat can distinguish. TTL provides a hard upper bound (35 min), but within that bound, you must ask "is the sandbox alive?"

### Worf's Guardrails (Recovery Sequence)

**Pre-conditions for recovery (all must be true):**

| # | Condition | Why |
|---|-----------|-----|
| P1 | `expires_at < now()` in lease-store | Expired TTL; sandbox is either dead or stalled |
| P2 | No PR exists for `squad/issue-<N>` branch | If PR exists, work is partially done; transition to `pr_open`, not requeue |
| P3 | ADC confirms sandbox is `STOPPED`/`CRASHED`/`NOT_FOUND` | Do not reclaim if sandbox is still `RUNNING` (slow but alive) |
| P4 | Lease-store updated & committed to git BEFORE label removal | Audit trail written first; git is the durability record |
| P5 | Attempt counter is read, incremented, and tracked | Prevent infinite retry loops; escalate after 3 failures |

**Mandatory guardrails (ordered sequence, G20–G26):**

1. **G20 — Verify sandbox stopped:** Query ADC status. If `RUNNING`, extend TTL by 1 cycle (grace period) and skip recovery. Only proceed if `STOPPED`/`CRASHED`/`NOT_FOUND`.
2. **G21 — Inspect branch state:** Check `squad/issue-<N>` via GitHub API.
   - No branch → fresh start, new sandbox starts from `main`
   - Branch exists, not in PR → partial commits. New sandbox **resumes from branch tip** (payload: `"resumeBranch": true`)
   - Branch in PR → should have been caught by P2; if seen, abort, apply `squad:stuck`
3. **G22 — Terminal state check:** Verify `squad:done` is NOT present. If present, it's a sweep bug; skip recovery, delete lease only.
4. **G23 — Recovery PRs include history:** New PR description notes "created after sandbox recovery attempt N" to signal reviewers.
5. **G24 — Idempotent operations:** Label removal must treat 404 as success (already removed). Duplicate comments must be skipped (check last N comments).
6. **G25 — Three-failure escalation:** If `attempt >= 3`, apply `squad:stuck` (do NOT requeue), post comment tagging Picard, require human intervention to clear.
7. **G26 — Exact recovery sequence (non-negotiable):**
   ```
   1. Verify P1–P5, G20–G22
   2. Increment attempt counter
   3. Write updated lease-store, git commit & push (audit trail first)
   4. Remove squad:processing label
   5. Post recovery comment (audit trail for humans)
   6. Re-apply squad:agent:<name> (or squad:stuck if escalating)
   ```
   Any step failure → halt sequence. No skip-ahead.

**Why:** This ordered sequence makes recovery crashes visible (git history is clean even if GitHub labels crash), and the three-failure escalation is a circuit breaker for structural issues (bad payload, impossible task).

### Design Integration

B'Elanna's failure-mode trace answers "why this is safe" (TTL + stale-sweep + PR check = no orphans).

Worf's guardrails answer "how to implement it safely" (exact sequence, sandbox-stopped check, branch inspection, attempt counter, escalation).

Together: Complete specification for the stale-lease recovery sub-loop within the Ralph runner orchestration.

---

## Merged Content in decisions.md

**New subsection:** "Sandbox Death & Orphan Issue Recovery (Subsection)" under 2026-05-18T11:42:44 Ralph-Style Runner decision.

**Includes:**
- Problem statement + failure-mode trace (B'Elanna)
- Model A vs Model B heartbeat mechanisms (B'Elanna decision required)
- Pre-conditions for recovery P1–P5 (Worf)
- Mandatory guardrails G20–G26 (Worf)
- Ordered recovery sequence with step-by-step details (Worf)
- Label taxonomy addition (`squad:stuck` terminal label)
- Cross-references to existing reliability invariants I-1 through I-8
- Blocking items (G11: ADC status API; Model A/B choice)
- Updated P-prioritized next steps to include P3 stale-lease recovery testing

---

## Agent History Updates

### B'Elanna History

**Learned:**
- TTL + stale-sweep is complete orphan prevention iff a heartbeat/status mechanism distinguishes dead from slow.
- Label age alone is insufficient for correctness; must use ADC status API (Model A, preferred) or sandbox heartbeat write (Model B, fallback).
- Three-layer prevention: GitHub label (external gate), lease-store (durable record), PR existence check (partial work detection).
- Stale-lease sweep should run before claiming fresh work (prevents duplicate claims).

**Confirmed:**
- Model A (ADC status check) is preferred because it requires no agent-side instrumentation.
- Dead sandbox → TTL expires on schedule → sweep reclaims; slow sandbox → ADC reports RUNNING → TTL extends → no reclaim.
- Partial work is preserved: branch inspection detects commits; new sandbox resumes from branch tip (not fresh from main).

**Next:**
- Implement TTL extension logic in Azure Function P2 (coordinate with Geordi on ADC status API availability).
- Code the lease-store recovery path in Azure Function (P2).
- Test recovery with branch inspection + attempt counter (P3 integration test).

### Worf History

**Approved:**
- 5-min timer + atomic label re-read (< 2s) prevents race even on singleton Function.
- Lease-before-act pattern (G14) is critical; write to git before resumeSandbox.
- Payload via file upload (G16), cleanup (G17) prevents command injection.
- Three-failure escalation with human tag (Picard) is safety valve; prevents infinite retry.

**Rejected:**
- No automated conflict resolution (agent cannot both write code and resolve conflicts autonomously).
- No auto-merge to protected branches (requires human approval gate).

**Required:**
- GitHub App or dedicated machine account PAT (not personal developer PAT) for GitHub API calls.
- Ordered recovery sequence (G26) is non-negotiable; exact step sequence must be implemented.

**Next:**
- Review Azure Function implementation for G20–G26 compliance (pre-implementation gate).
- Validate recovery comment format and attempt-counter logic (pre-demo gate).

---

## Blocking Items

| Item | Owner | Status |
|------|-------|--------|
| **G11:** Managed Identity token acceptance by ADC API | Geordi | ⏳ Pending |
| **Model A:** ADC SDK `getSandboxStatus()` API availability | Geordi | ⏳ Pending |
| **P2 — Azure Function:** Implement recovery (G20–G26) | Dev team | 📋 Ready to start (after G11, Model A confirmed) |
| **P3 — Integration test:** Stale-lease recovery end-to-end | Test team | 📋 Ready to start (after P2) |

---

## Completion & Audit

- ✅ Merged B'Elanna sandbox-death analysis into decisions.md
- ✅ Merged Worf stale-lease recovery guardrails into decisions.md
- ✅ Created orchestration log: `.squad/orchestration-log/2026-05-18T12-08-34-sandbox-death-orphan-batch.md`
- ✅ Created session log: `.squad/log/2026-05-18-sandbox-recovery-session.md` (this file)
- ✅ Updated agent history notes (B'Elanna, Worf) — ready for propagation
- ✅ No conflicts detected; B'Elanna analysis + Worf guardrails are complementary
- ✅ All blocking items identified and assigned
- ✅ Ready for implementation phase

**Scribe attestation:** This merge is mechanically and substantively correct. No meaningful content lost. All deduplication decisions preserve design intent. Recovery sequence is complete, ordered, and machine-readable for implementation.
