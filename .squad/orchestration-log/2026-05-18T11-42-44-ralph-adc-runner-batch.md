# 2026-05-18T11:42:44.342+03:00 — Ralph-Style ADC Runner Design Review Batch

**Orchestrator:** Coordinator (Copilot CLI)  
**Session:** squad-squad ADC runner MVP design consolidation  
**Outcome:** Comprehensive design decision merged; implementation phase authorized

---

## Agent Dispatch & Routing

| Agent | Role | Input | Output | Status |
|-------|------|-------|--------|--------|
| Picard | Architecture lead; ADC/Ralph orchestrator | Tamir directive: 5-min timer, no Squad CLI, broader Ralph lifecycle | Ralph-style MVP spec: thin orchestrator, 5-min loop, label-based dedup, durable lease store | ✅ Endorsed |
| Data | Squad SDK & CLI semantics expert | Tamir directive; current `squad watch --execute` codebase | Mapped three phases (triage, PR sweep, execute); identified Squad SDK gaps (P1: real `copilot` task execution in LocalPollingProvider) | ✅ Delivered |
| Geordi | Azure/ADC platform engineer | Design spec; Azure Function + ADC SDK constraints | Azure Functions TimerTrigger path; confirmed `Microsoft.Adc.Client` is official surface; singleton sandbox recommended; G11 (Managed Identity token acceptance) remains blocking | ✅ Confirmed |
| B'Elanna | Reliability & state machines engineer | Tamir directive + Picard spec | Comprehensive state machines for issues/sandboxes/PRs; durable lease-store schema; TTL/recovery model; PR lifecycle with conflict detection; 10-min TTL for 5-min cycles per Worf | ✅ Authored |
| Worf | Security & guardrails reviewer | B'Elanna state machine + Geordi Azure design | Conditional approval with mandatory guardrails G13–G19: atomic label claim (G13), lease state before resumeSandbox (G14), no command interpolation (G16), payload file cleanup (G17), human merge gate (G18), conflict escalation to human (G19). Rejected auto-merge and auto-conflict-resolution. | ✅ Approved w/ constraints |
| Seven | Governance & source-of-truth auditor | ADC correction directive (2026-05-18T06:10:18) + prior decisions | Audited 5 prior ADC decisions; cross-checked against tamresearch1 source; confirmed pre-baked image, disk-backed suspend, no late-startup installs; no invented ADC CLI surfaces | ✅ Audited |

---

## Decision Consolidation (Inbox → decisions.md)

**Inbox files merged:**
1. `picard-adc-watch-loop-mvp.md` — Ralph-style MVP architecture (5-min loop, label dedup, no CLI changes)
2. `data-azure-timer-watch-emulation.md` — Watch CLI phase decomposition; triage/PR-sweep/execute path; Squad SDK contract mapping
3. `geordi-azure-fn-adc-impl-model.md` — Azure Functions + C# SDK choice; singleton vs. pool; pre-baked vs. runtime command
4. `belanna-durable-lease-state-machine-2026-05-18.md` — State machines, lease schema, TTL/recovery, PR lifecycle, conflict handling
5. `worf-adc-runner-v2-directive-review.md` — Security guardrails G13–G19; atomic label claim, sandbox assignment state, command injection guards, merge gate, conflict escalation
6. `copilot-directive-2026-05-18T11-42-44-342+03-00.md` — User directive summary (captured by coordinator)

**Deduplicated under:** 2026-05-18T11:42:44.342+03:00: Ralph-Style Periodic 5-Minute ADC Runner — MVP Directive & Comprehensive Design Review

**Key deduplication logic:**
- All five inbox files converge on the same 5-min periodic loop, label-based dedup, durable lease, no Squad CLI changes
- Picard's Ralph-style framing + Data's CLI phase mapping → unified orchestration spec
- Geordi's Azure Functions + B'Elanna's state machines + Worf's guardrails → complete implementation contract
- No conflicts; each agent's proposal strengthens the same core design
- Preserved all meaningful nuances: 10-min TTL per Worf, singleton sandbox for MVP, pre-baked image, three-failure conflict escalation, human merge gate

---

## Design Integrity Checks

| Check | Result |
|-------|--------|
| **No Squad CLI changes** | ✅ ADC Function is the orchestrator; `squad schedule run` is NOT called; agent logic lives in pre-baked `runner.js` inside sandbox |
| **5-min timer + dedup** | ✅ Azure Functions TimerTrigger every 5 min; GitHub label `squad:processing` + lease-store ensures no duplicate work |
| **Broader Ralph lifecycle** | ✅ Issues, PRs, merges, conflict detection/escalation all in scope; 5-min scan covers all phases |
| **ADC surfaces only** | ✅ No invented CLI; uses `Microsoft.Adc.Client` (official SDK), Portal, Azure CLI; disk-backed suspend (not memory suspend) per tamresearch1 experience |
| **Security guardrails (G13–G19)** | ✅ Atomic label claim, lease-before-act, payload file isolation, human merge/conflict gates; no auto-merge, no auto-conflict-resolution |
| **Idempotent & crash-resilient** | ✅ Label claim is idempotent; stale-lease sweep recovers crashed issues; 10-min TTL + 5-min cycle = max 15-min stuck time |
| **Audit trail** | ✅ All decisions logged in GitHub labels + git-tracked `.squad/.lease-store.json` |

---

## Blocking Items for Implementation Phase

| Item | Owner | Severity | Notes |
|------|-------|----------|-------|
| **G11: Managed Identity token acceptance by ADC API** | Geordi | **P0 (blocks Azure Function auth)** | Required before any Azure Function can authenticate to ADC. Direct inspection of C# SDK and ADC repo needed. |
| **Real `copilot` task execution in LocalPollingProvider** | Data | **P1 (Squad SDK gap)** | Currently stubbed; must implement to make `squad schedule run` inside ADC sandbox actually invoke Copilot agent. ~20 lines. |
| **Pre-baked image with `runner.js`** | B'Elanna/Geordi | **P1 (ADC image build)** | Create `/squad/runner.js` in copilot disk image; bake into ADC image. Include Node, `gh` CLI, squad CLI. |
| **Azure Function C# implementation** | Data/Geordi | **P2 (orchestrator implementation)** | Code the 5-min loop per above spec; wire sandbox assignment state (G14), payload upload (G16), cleanup (G17). |

---

## Next Cycle (Implementation Kickoff)

1. **Worf P0 gate:** Geordi confirms G11 (Managed Identity token accepted by ADC API)
2. **Squad SDK P1:** Data implements real `copilot` task execution in `LocalPollingProvider`
3. **ADC image:** Pre-bake `runner.js` into copilot image
4. **Azure Function:** Implement C# orchestrator per design spec
5. **Local fallback:** `ralph-watch-adc.ps1` for dev/demo (optional, deferred)
6. **Validation:** Test full cycle on ADC sandbox; measure 5-min round-trip latency; validate dedup behavior

---

## Cross-Agent Learning & History Updates

- **Data learns:** Squad `watch --execute` is a continuous loop designed for local dev; ADC adaptation must decompose into discrete shell commands (triage, PR-sweep, execute). Current Squad CLI is narrower than aspirational earlier designs; `task.ref` not `task.eventName`, no `--json` flag yet.
- **Geordi learns:** Azure Functions + `Microsoft.Adc.Client` SDK is the preferred path over GitHub Actions; pre-baked images avoid egress proxy/TLS inspection breakage from late-startup installs.
- **B'Elanna learns:** GitHub label as external atomic gate + durable lease-store (git-tracked) together prevent duplicates; neither alone is sufficient. Stale-lease sweep on every scan cycle is the crash-recovery mechanism.
- **Worf learns:** 5-min timer cycles require 10-min TTL (not 30-min) to prevent single stalled issue from blocking 3+ cycles. Atomic label re-read check (< 2s timestamp) essential on singleton Function with at-least-once semantics.
- **Picard learns:** Ralph-style MVP scales cleanly from local PowerShell (tamresearch1) to cloud (Azure Functions + ADC); label-based dedup replaces assignee-based seamlessly; no architectural compromise needed.
- **Seven learns:** ADC correction directive surfaces real production gaps: memory suspend causes zombie connections; pre-baked images required; disk-backed suspend preferred; no late-startup installs in long-lived workers.

---

## Scribe Log Entry

Consolidated 6 inbox decision files into 1 unified design decision section. No conflicts detected; all converge on same 5-min periodic loop, label-based dedup, durable lease store, pre-baked image, no Squad CLI changes, human approval gates for merges and conflicts. Ready for implementation phase with P0/P1 blockers identified.
