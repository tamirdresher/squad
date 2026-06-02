# ADC External Trigger Research — Session Log

**Date:** 2026-05-14  
**Participants:** Geordi, Seven, Data, Coordinator, Scribe  
**Topic:** External event trigger mechanisms for Squad-on-ADC integration  
**Outcome:** Defined minimal event-driven execution model with `squad schedule fire` CLI + ADC Redis adapter

---

## Research Findings

### ADC Trigger Landscape (Geordi)

Examined ADC platform trigger mechanisms across:
- **Cron ScheduledTask CRDs** — ADC agents use `*/30 * * * *` style periodic invocation; not Squad-specific
- **GitHub Actions** — `schedule` / `workflow_dispatch` / `push` / `pull_request` triggers available in ADC `GitHubActionsProvider`
- **Imperative ADC API** — Helper SDK for create/resume/exec/snapshot of sandboxes
- **Native webhook/Event Grid/Service Bus/Azure Functions** — No inbound trigger wired directly to ADC sandbox lifecycle yet

**Gap Identified:** ADC publishes sandbox events (idle eviction, explicit stop) via Redis streams but no native Squad listener exists.

### ADC Event Bus Architecture (Seven)

Mapped ADC event infrastructure:
- **`SandboxEventPublisherService`** — publishes `SandboxStoppedEventData` via Redis XADD
- **`SandboxEventConsumerService`** — consumes with XREADGROUP, handles retries + XAUTOCLAIM
- **`InstanceEventMessage`** — NodeAgent → Cluster API carrier; includes `InstanceEventType` (start/stop) + `SandboxSuspendMode`
- **Consumer Group Pattern** — production at-least-once delivery; state held in Redis
- **Global Stream Key** — `GlobalConstants.SandboxEventStreamKey` is the well-known entry point

Production-grade event bus; no modification needed. Just needs a Squad listener.

### Squad SDK Trigger Scaffolding (Data)

Mapped Squad SDK existing hooks:
- **`EventTrigger` type** — declared in `scheduler.ts` L56-59: `{ type: 'event'; event: string }`
- **`isDue()` for EventTrigger** — explicitly returns `false`: *"Event triggers are fired externally, not by polling."* — intentional gap left for external wiring
- **`squad schedule run <id>`** — existing manual one-shot via `LocalPollingProvider`; no external event entry point
- **`EventBus`** — in-process pub/sub; not connected to external inputs
- **`event-bus-ws-bridge.ts`** — outbound only; broadcasts SDK events over WebSocket

**Gap Identified:** EventTrigger scaffolded but `fireEventTrigger()` path missing. No CLI or SDK method to inject external events.

### Coordinator Evidence (Coordinator)

Verified cross-checks:
- ADC Redis stream consumer groups confirmed production-ready via SandboxEventConsumerService source
- Squad scheduler.ts EventTrigger marker confirmed intentionally externally-fired
- No hidden webhook wiring in Squad or ADC; gap is exact and deliberate

---

## Recommendation: Minimal Event-Driven Model

### Core Squad Changes (Small)

1. **`fireEventTrigger(manifest, state, eventName, payload)` in scheduler.ts**
   - Filters schedule entries by `trigger.type === 'event' && trigger.event === eventName`
   - Calls `executeTask()` for each match
   - ~30 lines

2. **`squad schedule fire <eventName> [--payload <json>]` CLI command**
   - Reads manifest + state
   - Calls `fireEventTrigger()`
   - Outputs results to stdout/stderr
   - ~50 lines

### ADC Adapter (Separate Package)

- Node.js script (~80 lines)
- Subscribes to ADC Redis stream using existing `GlobalConstants.SandboxEventStreamKey`
- On `SandboxStoppedEventData`: wraps into `ExternalSquadEvent` interface
- Calls `squad schedule fire sandbox:stopped --payload '{"sandboxId": "...", ...}'`
- Handles Managed Identity / Azure auth at this layer only
- State persistence (which events processed) via ADC CosmosDB or Redis

### External Event Envelope (Platform-Neutral)

```typescript
interface ExternalSquadEvent {
  eventName: string;           // Matches trigger.event in schedule.json
  timestamp: string;           // ISO timestamp from origin
  source: string;              // e.g., "adc:sandbox", "github:pr", "azuresre:scheduled-task"
  payload: Record<string, unknown>; // Arbitrary data
  idempotencyKey?: string;     // Optional dedup key
}
```

Flat, extensible, no platform assumptions. ADC adapter wraps its events; GitHub adapter wraps its webhooks.

### First Prototype Validation

**Test case:**
1. User creates schedule.json entry: `{ "id": "sandbox-stopped-handler", "trigger": { "type": "event", "event": "sandbox:stopped" }, "task": { ... } }`
2. ADC Redis event published
3. Adapter receives event, calls `squad schedule fire sandbox:stopped --payload '{"sandboxId": "..."}'`
4. Squad coordinator triggered, task executes once
5. Sandbox exits cleanly
6. Verify no polling loop active

**Success criteria:**
- End-to-end event delivery works
- No code duplication across platforms
- Squad core remains platform-neutral
- ADC specifics isolated to adapter

---

## Architecture Rationale

**Why not Cloud-Native Immediately (Event Grid/Service Bus)?**
- Adds Azure infrastructure prerequisites
- Complicates local development testing
- Defers validation of the core pattern
- Redis stream already production-tested in ADC; reuse it

**Why not Durable Task Service Wrap?**
- DTS needs lease/retry/compensation fully specified
- Prototype must validate external event → Squad coordinator path first
- DTS wrapping can wrap the validated pattern later

**Why platform-neutral core?**
- Squad is ecosystem tool, not Azure-only
- GitHub triggers, cron, webhooks, local dev all benefit from same core
- Adapter layer lets each platform add its specifics without polluting scheduler

---

## Next Phase: Implementation

### Squad Core PR
- Add fireEventTrigger() + squad schedule fire command
- Lightweight review: no async, no new dependencies

### ADC Adapter PR
- Minimal Redis subscriber + CLI wrapper
- Lightweight review: no core changes, self-contained

### Integration Test
- Validate sandbox-stopped-handler entry
- ADC environment: Redis stream, event publisher running
- Call squad schedule fire; verify coordinator executes

### Rollout Path
1. Deploy Squad core changes (CLI command only, no mandatory invocation)
2. Deploy ADC adapter script to ADC CI/CD (non-breaking; coexists with polling)
3. Parallel test: Fire events via adapter, observe Squad tasks executing
4. Decommission polling-based Coordinator trigger once events proven stable

---

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Event loss (Redis stream timeout) | ADC already handles via consumer group claims; adapter retries with exponential backoff |
| Idempotency (duplicate event delivery) | Payload includes optional idempotencyKey; Squad tasks must be side-effect-safe or dedup at adapter |
| Managed Identity auth failures | All auth logic in adapter layer; Squad core unchanged |
| Event schema mismatch across sources | ExternalSquadEvent is flat + extensible; each adapter responsible for schema mapping |
| State persistence of processed events | CosmosDB or Redis in ADC; no Squad core state needed |

---

## Files Affected

### Squad Core
- `packages/squad-sdk/src/runtime/scheduler.ts` — add fireEventTrigger()
- `packages/squad-cli/src/cli/commands/schedule.ts` — add fire subcommand
- `.squad/schedule.json` — example entry for sandbox-stopped-handler (optional)

### ADC Adapter (out-of-tree)
- `.squad/adapters/adc-sandbox-handler.mjs` — minimal Redis subscriber

### Squad Squad (this repo)
- `.squad/decisions.md` — this decision (merged from inbox)
- `.squad/log/` — this session log
- Agent history.md files — cross-agent learning recorded

---

**Scribe:** Session log compiled from Geordi, Seven, Data, Coordinator research and merged inbox decisions. Ready for implementation planning.
