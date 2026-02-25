# Decision: Shell Observability Metrics Design

**Author:** Saul (Aspire & Observability)
**Date:** 2026-02-24
**Issues:** #508, #520, #526, #530, #531

## Context

Five overlapping issues requested telemetry instrumentation of the REPL shell: session lifetime, agent response latency, error rate tracking, and basic retention metrics. The SDK already had OTel infrastructure (Phases 1–4), but no user-facing shell metrics.

## Decision

### Metrics Added (all under `squad.shell.*` namespace)

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `squad.shell.session_count` | Counter | — | Incremented once per shell session start (retention proxy) |
| `squad.shell.session_duration_ms` | Histogram | ms | Recorded on shell exit with total session lifetime |
| `squad.shell.agent_response_latency_ms` | Histogram | ms | Time from message dispatch to first visible response token |
| `squad.shell.error_count` | Counter | — | Errors during dispatch (agent, coordinator, general) |

### Opt-in Gate

**All shell metrics are gated behind `SQUAD_TELEMETRY=1`** — not just the OTLP endpoint. This is a stronger privacy guarantee than the SDK-level metrics (which activate whenever `OTEL_EXPORTER_OTLP_ENDPOINT` is set). Rationale: shell metrics describe user behavior patterns, so they require explicit consent.

### Architecture

- New module: `packages/squad-cli/src/cli/shell/shell-metrics.ts`
- Uses `getMeter('squad-shell')` from SDK — shares the same MeterProvider and OTLP pipeline
- Wired into `runShell()` lifecycle in `index.ts`
- Latency measured at first `message_delta` event (first visible token), not at connection time
- No PII collected — only agent names, dispatch types, and timing data

### Alternatives Considered

1. **SDK-level only** — Rejected because SDK metrics track API sessions, not user-visible experience
2. **Separate OTLP endpoint for shell** — Over-engineered; sharing the SDK's MeterProvider is simpler
3. **Always-on with OTLP endpoint** — Rejected for privacy; shell metrics need explicit opt-in

## Impact

- 18 new tests covering all metrics + opt-in gating
- Zero impact when `SQUAD_TELEMETRY` is unset (no instruments created)
- Compatible with existing Aspire dashboard — metrics appear under `squad-shell` meter
