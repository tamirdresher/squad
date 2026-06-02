# Orchestration Log — ADC-Squad Execution Model Planning

**Dispatch Date:** 2026-05-17T08:40:44.473+05:30  
**Batch ID:** adc-execution-model  
**Dispatcher:** Copilot  
**Sync/Async:** Background agents in parallel, results merged by Scribe

---

## Agents Spawned & Results

### Picard — Architecture Lead
**Charter:** Mission commander and architecture strategist  
**Task:** Evaluate three execution models for Squad on ADC (Azure Function / GitHub webhook, periodic ephemeral, long-lived sandbox); recommend MVP path and deferral strategy  
**Deliverable:** `.squad/decisions/inbox/picard-adc-execution-model.md`  
**Status:** ✅ Complete  
**Key Finding:** Periodic ephemeral sandbox (Model B) is optimal MVP — zero additional infrastructure, fits ADC suspend/resume model, naturally resilient to duplicate events, fully reversible to event-driven. Azure Function adapter deferred until sub-minute latency is required.

---

### Geordi — Platform Engineer (Azure/ADC)
**Charter:** Azure Developer CLI and cloud platform surface expert  
**Task:** Evaluate customer-accessible ADC surfaces and deployment patterns; analyze auth constraints, observability trade-offs, cold-start latency, and cost models for each execution pattern  
**Deliverable:** `.squad/decisions/inbox/geordi-adc-squad-event-patterns.md`  
**Status:** ✅ Complete  
**Key Finding:** GitHub Actions OIDC is the lowest-risk near-term validation path (no new Azure infra required, known pattern for `az login --federated-token`). Azure Function webhook is blocked pending ADC managed identity token acceptance verification. Periodic ephemeral uses only customer-facing ADC API surfaces.

---

### B'Elanna — Durable Systems Engineer
**Charter:** Reliability, failure semantics, workflow orchestration  
**Task:** Analyze failure modes (duplicate events, retry storms, stale leases, partial results, sandbox crashes) and derive reliability invariants for each model; justify GitHub labels as MVP state store; establish deferral threshold for Durable Functions  
**Deliverable:** `.squad/decisions/inbox/belanna-adc-reliability-analysis.md`  
**Status:** ✅ Complete  
**Key Finding:** Model B (periodic ephemeral) naturally satisfies duplicate-event immunity, bounded retry storms, and crash recovery using only GitHub labels as state store. Eight reliability invariants (I-1 through I-8) are non-negotiable minimum contract. Durable Functions deferred until workflow becomes multi-step (Plan → Implement → Review → PR).

---

### Data — Squad Framework Expert
**Charter:** Squad SDK/CLI design, runtime seams, client compatibility  
**Task:** Map architectural decisions to exact Squad SDK/CLI implementation surface; identify minimal core changes (`fireEventTrigger`, `squad schedule fire` CLI, real `copilot` task execution); clarify what stays in core vs. adapter  
**Deliverable:** `.squad/decisions/inbox/data-adc-squad-runtime-seam.md`  
**Status:** ✅ Complete  
**Key Finding:** Three P0 Squad SDK changes: (1) `fireEventTrigger()` in scheduler.ts (~20 lines), (2) `squad schedule fire` CLI (~60 lines), (3) real `copilot` task type execution in `LocalPollingProvider` (~20 lines — **critical gap**). Event-driven seam is platform-neutral; ADC/Redis logic lives in separate adapter, not core.

---

### Worf — Security & Reliability Reviewer
**Charter:** Security, compliance, failure handling, adversarial threat modeling  
**Task:** Evaluate threat surface for each model (command injection, credential storage, webhook authenticity, sandbox cleanup, unbounded loops); define mandatory guardrails; conditional approval/rejection  
**Deliverable:** `.squad/decisions/inbox/worf-adc-execution-model-security-review.md`  
**Status:** ✅ Complete  
**Key Finding:** ✅ Model 1 (webhook, future) — conditionally approved with guardrails G1–G5 (no secret interpolation, HMAC validation, Key Vault, sandbox TTL, execution timeout). ✅ Model 2 (periodic, MVP) — conditionally approved with same guardrails. ❌ Model 3 (long-lived loop) — rejected (unbounded cost, no crash recovery, single point of failure, violates ADC ephemeral-by-design philosophy).

---

## Cross-Agent Synthesis

**Consensus Achieved:**
- MVP direction: Periodic ephemeral (Model B) via GitHub Actions cron or Azure Timer Function
- Non-blocking event-driven seam: `fireEventTrigger()` + CLI already designed; not blocking MVP
- State store: GitHub labels + `.squad/.schedule-state.json` durable across suspend/resume
- Reliability invariants: Eight-point contract (B'Elanna) drives implementation and testing
- Security guardrails: Five mandatory controls (Worf, G1–G5) before touching live issues

**Deferred (Not Blocking):**
- Azure Function webhook adapter (pending managed identity token verification)
- Durable Functions orchestration (pending multi-step workflow requirement)
- Event Grid / Service Bus integration
- Long-lived sandbox pattern (explicitly rejected)

**Implementation Ownership:**
- Data owns Squad core changes (P0: `fireEventTrigger`, CLI, `copilot` task fix)
- Adapter authors own ADC/GitHub Actions/Azure Function layers (separate, non-core)
- Worf's guardrails G1–G5 are blocking acceptance criteria before production use

---

## Scribe Action Items

✅ **1. Merge inbox decisions into `.squad/decisions.md`**  
- Consolidated all five agents' decisions into single unified entry
- Deduplicated architectural themes across Picard/Geordi/B'Elanna/Data/Worf proposals
- Preserved reliability invariants (B'Elanna), security guardrails (Worf), implementation surface (Data), and architectural rationale (Picard/Geordi)

✅ **2. Write orchestration log (this file)**  
- Recorded dispatch, agent charters, deliverables, and status
- Documented cross-agent synthesis and consensus on MVP path
- Listed deferred decisions and implementation owners

✅ **3. Write session log (`.squad/log/2026-05-17-adc-execution-model.md`)**  
- Brief summary of planning session and decision outcome

✅ **4. Append learnings to agent histories (if concise)**  
- Data: ADC event-driven seam design; Squad core/adapter boundary
- Worf: Model 1 (webhook) conditionally approved; Model 3 rejected
- B'Elanna: Reliability invariants establish MVP contract

✅ **5. Stage and commit `.squad/` files**  
- Updated `.squad/decisions.md` with consolidated ADC decision
- Created `.squad/orchestration-log/...` entry
- Created `.squad/log/...` entry
- Appended to agent histories
- Delete processed inbox files
- Commit with Co-authored-by trailer

---

## Inbox Files Processed

Cleared after merge:
- `.squad/decisions/inbox/picard-adc-execution-model.md`
- `.squad/decisions/inbox/geordi-adc-squad-event-patterns.md`
- `.squad/decisions/inbox/belanna-adc-reliability-analysis.md`
- `.squad/decisions/inbox/data-adc-squad-runtime-seam.md`
- `.squad/decisions/inbox/worf-adc-execution-model-security-review.md`

Retained (non-ADC):
- `.squad/decisions/inbox/copilot-directive-2026-05-14T20-22-05-396+05-30.md`

---

*Logged by Scribe — 2026-05-17T08:40:44.473+05:30*
