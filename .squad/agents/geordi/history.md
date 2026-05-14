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


