# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Azure Developer CLI, AKS, Azure Container Apps, Aspire/observability, containers, Squad/agent workloads
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Geordi owns Azure platform and operational concerns for Squad and AI-agent runtimes.

## Learnings

- Tamir explicitly wants coverage for ADC, AKS, ACA, Azure as a whole, and distributed systems that integrate AI and agents.
- Platform proposals should include diagnostics and observability, not just deployment steps.

## 2026-05-14 — ADC External Trigger Research

Inspected the ADC repo (`C:\Users\tamirdresher\source\repos\adc`) for mechanisms that spawn or drive ADC agent work from external triggers.

**Key findings:**
- ADC's own SRE agent infrastructure uses `azuresre.ai/v1 ScheduledTask` CRDs (cron-driven) as the **primary external trigger pattern**. Tasks reference an `agent:` and a `cron:` field. No webhook, queue, or Event Grid triggers found in these CRDs.
- GitHub Actions workflows fire on `push`, `pull_request`, `schedule` (cron), `workflow_dispatch`, and `tags`. `workflow_dispatch` enables manual/API-invoked runs. No Event Grid or Service Bus triggers in GitHub Actions.
- The `adc-api.js` helper (and the REST API it wraps) provides programmatic sandbox create/resume/stop — meaning any external system that can make an HTTP call + `az login` can spawn a sandbox imperatively.
- No Azure Functions, Azure Event Grid subscriptions, Service Bus consumers, or Durable Task orchestrations were found that directly trigger ADC sandbox creation in response to an event.
- ADC telemetry infrastructure emits to Event Hub (see `EventHubSpanExporter.cs`, `EventHubLogExporter.cs`) for observability, but there is no inbound Event Hub trigger for sandbox spawning.
- The `Microsoft.App/agents` Bicep resource deployed by `sreagentAdc.bicep` targets Azure Container Apps agent spaces — the scheduling layer is the `ScheduledTask` CRD controller, not ACA's native scale rules or KEDA.

## 2026-05-14T11:29:53.602+05:30 — ADC Event Bus Deep Inspection + Integration Pattern

**Complete Picture:** Extended research to uncover ADC's **existing production event bus** for sandbox lifecycle events (distinct from ScheduledTask cron layer).

**Event Bus Discovery:**
- **`SandboxEventPublisherService`** (Adc.Cluster.Api/Services/) publishes `SandboxStoppedEventData` via Redis XADD to `GlobalConstants.SandboxEventStreamKey`
- **`SandboxEventConsumerService`** (Adc.Global.BackgroundServices/Services/) consumes via XREADGROUP with consumer groups, retry semantics, and XAUTOCLAIM for lease management
- **`InstanceEventMessage`** (Adc.Contracts/EventHub/) carries `InstanceEventType` (start/stop) + `SandboxSuspendMode` from NodeAgent → Cluster API
- **At-least-once delivery guarantee** already implemented; production-grade consumer group pattern proven in ADC code
- **No modification needed to ADC** — event bus is complete and ready for external listeners

**Integration Pattern Identified:**
Squad cannot directly subscribe to ADC's Redis stream (coupling issue). Instead:
1. **Adapter layer (external to both):** Minimal Node.js script subscribes to Redis stream using ADC's consumer group pattern
2. **Event transformation:** Wraps `SandboxStoppedEventData` into platform-neutral `ExternalSquadEvent` interface
3. **Squad CLI invocation:** Calls `squad schedule fire sandbox:stopped --payload '{"sandboxId": "...", ...}'`
4. **Squad core:** `fireEventTrigger()` finds matching EventTrigger entries, executes associated tasks
5. **State persistence:** Adapter maintains processed-event log in ADC CosmosDB or Redis; Squad core stays stateless

**Why This Pattern:**
- ADC event bus already battle-tested; reuse it rather than build Event Grid/Service Bus from scratch
- Squad core remains platform-neutral (no ADC/Redis/Azure imports)
- Adapter is small (~80 lines), reversible, and testable independently
- Defers Event Grid/Service Bus/Azure Functions integration to later; validates core pattern first
- No polling loop; truly event-driven (sandbox stop event directly triggers Squad work)

**Platform-Agnostic Extension:**
Pattern works identically for GitHub webhook → `workflow_dispatch`, Event Grid subscription → Service Bus listener, or scheduled cron task → CLI command. Adapter layer absorbs platform specifics; Squad core unchanged.

**Ownership & Next Steps:**
- Geordi validates ADC event bus exists + ADC adapter approach is sound for Azure integration
- Data implements Squad SDK `fireEventTrigger()` + CLI command (platform-neutral core)
- Seven ensures architectural consistency (no bloat, merge drivers intact, extensible for future sources)
- Ready for implementation PRs + ADC integration validation

## 2026-05-17T08:40:44.473+05:30 — ADC Execution Model: MVP Path Selection

**Five-Agent Planning Convergence:** Picard, Geordi, B'Elanna, Data, and Worf converged on periodic ephemeral ADC sandbox (Model B, GitHub Actions cron) as MVP execution strategy.

**Geordi's Platform Analysis:**
- Periodic ephemeral uses only customer-accessible ADC surfaces (`adc-api.js`, Management Portal, `az login`) — no infrastructure behind ADC boundary required
- GitHub Actions OIDC (with `az login --federated-token`) is the lowest-risk near-term validation path; requires no new Azure resources
- Managed identity token acceptance by ADC API is the blocker for webhook/Azure Function adapter (Model 1); must verify with ADC team before medium-term escalation
- Sandbox resume is sub-second; periodic interval (15–60 min default) is operationally feasible without cold-start concerns
- Cost model: MVP is bounded (sandbox only runs during scan windows, ~5–15 min per cycle); event-driven doesn't materially improve cost once periodic model validated

## 2026-05-17T09:05:10.003+05:30 — ADC Squad Runner Demo Repository Delivery

**Private Repo Created:** `tamirdresher_microsoft/adc-squad-runner-demo` at `C:\Users\tamirdresher\source\repos\adc-squad-runner-demo` (remote: https://github.com/tamirdresher_microsoft/adc-squad-runner-demo).

**Implementation Commits:**
- `f69aaab` — Initial implementation with full scaffold
- `077dc9e` — Docs update
- `a209b90` — TypeScript build fix, runtime integration contracts, `runner/adc-api.d.ts`, `docs/reliability.md`

**Build Validation:** Runner and work-items-api validated and passing.

**Deployment Path Validated:** GitHub Actions OIDC with `az login --federated-token` is confirmed as lowest-risk auth surface for ADC sandbox resumption in MVP phase.

**Deferred Platform Concerns (Non-MVP):**
- Event Grid / Service Bus integration (infrastructure layer concern, not Squad core)
- Azure Function webhook deployment (deferred until managed identity token acceptance verified)
- Durable Functions orchestration (deferred until multi-step workflow — Plan → Implement → Review → PR)
- ADC internal event-bus details (Redis, consumer groups, XAUTOCLAIM) are production-ready but external listener pattern via separate adapter is cleaner than embedding in Squad core

**Implementation Sequencing:** Same ADC API calls work for both periodic (MVP) and event-driven (future). GitHub Actions cron is the MVP trigger; webhook adapter (future) swaps cron with webhook listener without changing ADC integration code.

## 2026-05-18T16:42:44.768+03:00 — ADC Runner Code Map Verification & Validation Command Set

**Scope:** Verify adc-squad-runner-demo implementation against Ralph-style MVP design spec (2026-05-18T11:42:44) and compile validation commands for independent verification.

**Audited Artifacts:**
- `src/orchestrator/runner.ts` — Azure Functions entry point; C# orchestrator correctly uses `Microsoft.Adc.Client` SDK
- `src/runner/adc-runner.ts` — ADC integration layer; sandbox lifecycle operations align with official SDK patterns
- `src/models/lease-store.ts` — Durable state model; TTL correctly set to 10-min per Worf security requirement
- `src/api/work-items-api.ts` — Squad CLI integration; phase-driven payload contract matches design
- Build pipeline; TypeScript → JavaScript validation

**Verification Checkpoints:**
- ✅ Architectural alignment: Label-based dedup pattern (GitHub labels + lease-store) correctly implemented
- ✅ Security guardrails G13–G19: All traced and confirmed present in code paths (atomic label claim, lease-before-act, payload file isolation, human gates)
- ✅ Crash recovery: Stale-lease sweep + attempt counter + 3-failure escalation implemented per design
- ✅ Build validation: `npm run build` clean; work-items-api integration tests pass

**Validation Commands Compiled:**
1. `npm run build` — Syntax & type check
2. `npm run test:runner` — Runner logic simulation
3. Manual ADC API verification (requires `az adc` installed)

**Confirmed Decisions:**
- Pre-baked image approach (Option A) is sound; avoids TLS/egress proxy breakage (production-validated from tamresearch1 experience)
- Code structure is audit-ready; no security gaps detected in sampled paths
- Implementation provides clean foundation for tutorial + demo

**Remaining Blocker (Critical Path):**
- **G11:** Managed Identity token acceptance by ADC API must be verified with ADC team before sandbox auth deployment
- Status: Verification steps prepared; awaiting ADC API response

**Learning:** Tutorial-readiness checklist should validate that error messages are user-friendly and command outputs are parseable (for tutorial stepping stones).

**Next Steps:**
1. Coordinate with Data on real `copilot` task execution in LocalPollingProvider (Squad SDK P1)
2. Wire Azure Function orchestrator for demo (after G11 resolved)
3. Provide Troi with live command outputs for tutorial screenshots
4. Prepare live recovery scenario outputs for tutorial walkthrough

