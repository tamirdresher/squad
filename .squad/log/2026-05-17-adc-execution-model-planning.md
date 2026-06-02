# Session Log: ADC-Squad Execution Model Planning

**Date:** 2026-05-17T08:40:44.473+05:30  
**Participants:** Picard, Geordi, B'Elanna, Data, Worf, Scribe  
**Topic:** Design execution model for running Squad on Azure Developer CLI sandboxes; recommend MVP path and architectural seams

---

## Planning Narrative

### Initial Scope

The team faced a design question: How should Squad execute workflows triggered by external events (GitHub issues, scheduled checks) on ADC sandboxes?

Three candidate models emerged:
1. **Webhook/Azure Function:** GitHub webhook → Azure Function (managed identity) → `adc-api.js` → `execShell` Squad command (blocked by unknown ADC token acceptance)
2. **Periodic Ephemeral:** GitHub Actions cron or Azure Timer → `az login` → resume ADC sandbox → `squad schedule run` → suspend (lowest-risk MVP)
3. **Long-Lived Loop:** Single background container subscribing to ADC Redis stream, forever polling; re-invokes Squad on each event (high cost, crash risk)

Each model had distinct trade-offs: reliability, latency, operational burden, auth complexity, and scalability.

### Agent Perspectives

**Picard (Architecture):** Focused on MVP selection and reversibility. Eliminated Model 3 for unbounded cost and single-point-of-failure risk. Recommended Model 2 (periodic ephemeral) as MVP, with Model 1 (webhook) as a future, higher-latency alternative once authentication blockers are resolved.

**Geordi (Platform/Azure):** Analyzed customer-accessible ADC surfaces and cold-start latency under load. Confirmed Model 2 uses only public API (`adc-api.js`). Identified managed identity token acceptance as the blocker for Model 1. Recommended GitHub Actions OIDC as the near-term validation path (no new Azure infra required).

**B'Elanna (Reliability):** Systematically analyzed failure modes (duplicate events, retry storms, stale leases, crashes, partial results). Found that Model 2 naturally satisfies duplicate-event immunity if ground truth is re-derived from GitHub on each scan. Derived eight non-negotiable reliability invariants (claim-before-act, terminal states, stale lease TTL, concurrency caps, etc.) that apply to all models.

**Data (SDK/Runtime):** Mapped architectural choices to exact Squad core changes. Identified that `fireEventTrigger()` and `squad schedule fire` CLI are platform-neutral; ADC/Redis-specific logic lives in an adapter. Flagged that `copilot` task execution is stubbed in `LocalPollingProvider` — this must be fixed before any ADC validation run.

**Worf (Security):** Reviewed threat surface for each model. Conditionally approved Models 1 and 2 with mandatory guardrails (no secret interpolation, HMAC validation, Key Vault, sandbox TTL, execution timeout). Explicitly rejected Model 3 on cost and crash-recovery grounds; inconsistent with ADC's ephemeral-by-design philosophy.

### Convergence Point

All five agents converged on **Model 2 (periodic ephemeral) as the MVP path**:
- Operationally simple: no new Azure infrastructure, no long-running process, no managed identity token verification blockers
- Naturally resilient: duplicate GitHub events have zero effect; ground truth re-derived from GitHub on each scan
- Fully reversible: exact same ADC API calls (`resumeSandbox` + `execShell` + `stopSandbox`) work for both time-triggered (cron) and event-triggered (webhook) invocations
- Cost-bounded: sandbox only runs during scan windows (~5–15 min per cycle)
- Maps to existing Squad primitives: `CronTrigger` and `IntervalTrigger` already in place

### Deferred Decisions

1. **Azure Function webhook (Model 1):** Deferred until managed identity token acceptance is verified with ADC API; medium-term path once auth blockers clear
2. **Durable Functions orchestration:** Deferred until workflow becomes multi-step (e.g., Plan → Implement → Review → PR); single-step execution doesn't justify DTS overhead
3. **Event Grid / Service Bus integration:** Infrastructure concern; separate from Squad core MVP
4. **Long-lived sandbox loop (Model 3):** Explicitly rejected; violates ADC cost model and reliability philosophy

### Implementation Roadmap

**Phase 1 (MVP, blocking):**
- Data implements three P0 Squad SDK changes: `fireEventTrigger()`, `squad schedule fire` CLI, real `copilot` task execution in `LocalPollingProvider`
- Adapter author implements GitHub Actions workflow (`.github/workflows/squad-adc-loop.yml`) with `az login` + suspend/resume logic
- Apply Worf's mandatory guardrails (G1–G5: no secret interpolation, HMAC, Key Vault, TTL, timeout)
- Validate end-to-end: GitHub Actions → ADC sandbox → Squad execution → clean exit

**Phase 2 (Event-driven seam, non-blocking):**
- Platform-neutral `fireEventTrigger()` and `squad schedule fire` already designed; adapter wraps ADC Redis stream → `fireEventTrigger()` call
- Validation: ADC sandbox-stop event → adapter → Squad triggered without polling

**Phase 3 (Medium-term):**
- Managed identity token acceptance verification with ADC team → unlock Azure Function webhook adapter
- Measure periodic model latency and cost under production load; decide whether event-driven is worth migration cost

### Open Questions (Resolved Later)

1. Does ADC `adc-api.js` accept non-user AAD tokens (managed identity)? (blocks Model 1)
2. What is sandbox resume p99 latency under load? (drives polling interval tuning)
3. Does `execShell` have server-side timeout? (feeds Worf's G5 guardrail)
4. ADC billing model: per-create vs. per-compute-second? (cost calculator input)

### Stakeholder Consensus

✅ **Picard:** Endorses Model 2 MVP with reversible event-driven seam  
✅ **Geordi:** Confirms Model 2 uses only customer-accessible ADC surfaces  
✅ **B'Elanna:** Eight reliability invariants drive implementation and testing  
✅ **Data:** Owns SDK P0 changes; adapter is separate  
✅ **Worf:** Models 1 & 2 conditionally approved with mandatory guardrails G1–G5; Model 3 rejected

---

## Outcome

**Decision:** Adopt periodic ephemeral ADC sandbox (Model B, GitHub Actions cron) as MVP for ADC-Squad execution.  
**Seams:** `fireEventTrigger()` + `squad schedule fire` CLI (platform-neutral, already designed, non-blocking).  
**State:** GitHub labels + `.squad/.schedule-state.json` for durability across suspend/resume.  
**Invariants:** Eight reliability requirements (B'Elanna) bind implementation and acceptance tests.  
**Security:** Five mandatory guardrails (Worf, G1–G5) precede any production issue processing.  
**Reversibility:** Same ADC API calls work for both periodic (MVP) and event-driven (future) models.

**Next:** Data begins Squad SDK implementation. Adapter author prepares GitHub Actions workflow. Worf reviews implementation against guardrails before UAT.

---

*Scribed by Scribe — 2026-05-17T08:40:44.473+05:30*
