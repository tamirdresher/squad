# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad framework, Azure, Durable Tasks/DTD, cloud deployments, CI/security gates
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Worf owns security and reliability review for this Squad's work.

## Learnings

- Prior `tamresearch1` decisions include real credential-exposure handling and strict persistence expectations for behavior-changing directives.
- This team should never commit secrets and should preserve strong reviewer-gating behavior.
- ADC execution model security review: conditionally approve periodic ephemeral (Model 2, MVP) and webhook (Model 1, future) with 5 mandatory guardrails (G1: no secret interpolation, G2: HMAC validation, G3: Key Vault for secrets, G4: sandbox TTL + auto-suspend, G5: agent execution timeout). Explicitly reject long-lived sandbox loop (Model 3) — unbounded cost, no crash recovery, violates ADC's ephemeral design philosophy. Guardrails G1–G5 are P0-P1 blocking for any production issue processing.

## 2026-05-17T09:05:10.003+05:30 — ADC Squad Runner Demo Security Review Approved

**Approval Status:** Periodic ephemeral MVP (Model B) and future webhook adapter (Model 1) conditionally approved with mandatory guardrails G1–G5.

**Guardrails Mandated (P0-P1 Blocking for Production):**
- G1: No secret interpolation into shell commands; issue payloads written to files only
- G2: HMAC validation on GitHub webhook payloads (when implemented)
- G3: Azure Key Vault for storing GitHub token, ADC credentials, webhook secrets
- G4: Sandbox TTL enforcement (30 min auto-suspend on idle); prevents unbounded cost
- G5: Agent execution timeout (30 min suggested hard limit); prevents runaway task processing

**Model Rejection:** Long-lived continuous loop sandbox (Model 3) explicitly rejected — unbounded cost, no crash recovery, violates ADC's ephemeral-by-design philosophy.

**Implementation Path:** Guardrails apply before any live GitHub issue processing begins. Demo repo ready for validation phase pending Squad SDK fixes and ADC auth setup.

## 2026-05-18T12:08:34.040+03:00 — Stale-Lease Recovery Guardrails & Three-Failure Escalation

**Mandatory Guardrails for Safe Sandbox Crash Recovery (G20–G26):**

Synthesized recovery sequence ensuring sandbox crashes don't create orphans or duplicate work:

**Pre-Conditions for Recovery (All Required):**
- P1: Lease TTL expired (`expires_at < now()`)
- P2: No PR exists for the issue's branch (if PR exists, transition to `pr_open`, not requeue)
- P3: ADC confirms sandbox is `STOPPED`/`CRASHED`/`NOT_FOUND` (G20: never reclaim while sandbox is `RUNNING`)
- P4: Lease-store committed to git **before** label removal (audit trail written first; if Function crashes, git history is clean)
- P5: Attempt counter incremented and tracked (enable three-failure circuit breaker)

**Mandatory Sequence (Non-Negotiable Order, G26):**
1. Verify sandbox stopped (G20) — ADC status check; grace period if RUNNING
2. Inspect branch state (G21) — GitHub API; resume from branch tip if partial commits exist
3. Verify `squad:done` NOT present (G22) — sweep bug if it is; skip recovery, delete lease only
4. Increment attempt counter (P5)
5. Build recovery payload (include `resumeBranch` if applicable)
6. Write updated lease-store, git commit & push (P4: audit trail before label change)
7. Remove `squad:processing` label (idempotent: treat 404 as success)
8. Post recovery comment on GitHub (mandatory audit trail with sandbox_id, phase, lease times, attempt, action)
9. If `attempt < 3`: re-apply `squad:agent:<name>` (return to TRIAGED)
10. If `attempt >= 3`: apply `squad:stuck`, post human escalation comment, do NOT requeue (G25)

**Key Safeguards:**
- **G23:** Recovery PRs must include history note ("created after sandbox recovery attempt N") so reviewers know partial work was restarted
- **G24:** Idempotent label removal (404 = success) and duplicate comment detection (skip if same sandbox_id + claimed_at already exists)
- **G25:** Three-failure escalation is circuit breaker; prevents infinite retry on structural issues. Escalation tags Picard (approver agent) for human judgment
- **G26:** Any step failure halts sequence; no skip-ahead. If step 8 (git push) fails, sweep aborts and retries next cycle

**Label Taxonomy Addition:**
- `squad:stuck` — Terminal label (until manually cleared); issue failed automated recovery 3 times and requires human review before re-queuing

**Why This Works:**
- Ordered sequence makes failure modes detectable: git history is clean even if GitHub labels crash
- Sandbox-stopped check (G20) prevents race where slow sandbox is declared dead while still executing
- Branch inspection (G21) prevents two sandboxes writing same branch (data corruption)
- Attempt counter (G25) is circuit breaker for structural failures
- Mandatory recovery comment creates human-readable audit trail independent of git and label history

**Approved:** All G20–G26 guardrails are non-negotiable for production. Recovery sequence is complete, ordered, and machine-readable for Azure Function implementation.

**Next Implementation:**
- Review Azure Function implementation for G20–G26 compliance (pre-implementation gate)
- Code recovery sequence in C# (P2 priority, after G11 Managed Identity confirmation)
- Unit test stale-lease sweep logic (P2)
- Integration test recovery with branch inspection + attempt escalation (P3)

