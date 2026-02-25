# Saul — History

## Project Context

- **Project:** Squad SDK — the programmable multi-agent runtime for GitHub Copilot
- **Owner:** Brady
- **Stack:** TypeScript (strict mode, ESM-only), Node.js ≥20, @github/copilot-sdk, Vitest, esbuild
- **Joined:** 2026-02-22

## Key Context

- OTel Phases 1-3 complete: provider init, telemetry bridge, agent lifecycle traces, session traces, tool enhancements, metric wiring
- OTel Phase 4 complete: Aspire command (`squad aspire`), file watcher (squad-observer), event payloads, WS bridge
- Aspire dashboard: `mcr.microsoft.com/dotnet/aspire-dashboard:latest`
  - UI: port 18888, OTLP/gRPC: port 18889 (mapped to host 4317)
  - Anonymous mode: `ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true`
- The `squad aspire` CLI command handles Docker lifecycle (start/stop container)
- OTel exports from SDK: initializeOTel, shutdownOTel, getTracer, getMeter, bridgeEventBusToOTel, initSquadTelemetry
- 2022 tests passing across 74 files (before Wave 2)

## Learnings

- Aspire dashboard Playwright integration tests: `test/aspire-integration.test.ts` (5 tests)
  - Uses `@opentelemetry/sdk-node` (0.57.2) with gRPC exporters for version-aligned OTel setup
  - Direct URL navigation (`/traces`, `/metrics`) is more reliable than sidebar click selectors — Aspire uses Fluent UI web components
  - NodeSDK registers global providers automatically; `trace.getTracer()` / `metrics.getMeter()` work without separate registration
  - `forceFlush` on global providers works via `trace.getTracerProvider()` cast — the SDK's NodeSDK doesn't expose flush directly
  - Dashboard needs ~3s after flush to index traces, ~5s for metrics
  - Test auto-skips when `SKIP_DOCKER_TESTS=1` or Docker is unavailable
  - 2141 tests passing across 79 files (post Aspire integration test)
- Wave 3 work (2026-02-23):
  - Created `docs/scenarios/aspire-dashboard.md` — scenario-style guide for using Squad with Aspire
  - Updated `docs/build.js` SECTION_ORDER to include aspire-dashboard in scenarios ordering
  - Doc covers: what Aspire is, Docker launch, SDK integration, dashboard features (traces, metrics, resources), troubleshooting, pro tips
  - Tone: action-oriented, welcoming, prompt-first (matching existing Squad docs)
  - Referenced `packages/squad-sdk/src/runtime/otel-*.ts` and `test/aspire-integration.test.ts` for implementation details
  - Docs build verified — 39 pages generated, aspire-dashboard.html confirmed in dist
- **Critical bug fix (2026-02-XX): Telemetry not appearing in Aspire dashboard.** Root cause analysis:
  1. **Protocol mismatch** — SDK was using OTLP/HTTP exporters (`exporter-trace-otlp-http`), Aspire only accepts OTLP/gRPC on port 18889. Switched to `exporter-trace-otlp-grpc` / `exporter-metrics-otlp-grpc`.
  2. **Wrong endpoint in `squad aspire`** — `ASPIRE_OTLP_ENDPOINT` was `http://localhost:18888` (the dashboard UI port). Fixed to `http://localhost:4317` (host-mapped gRPC port).
  3. **OTLP auth mode was `ApiKey`** — Docker command set `DASHBOARD__OTLP__AUTHMODE=ApiKey` but SDK sent no API key header. Changed to `Unsecured` for local dev.
  4. **Docs used stale env var** — `ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` replaced with `DASHBOARD__FRONTEND__AUTHMODE=Unsecured`.
  5. Added "Quick Debug Checklist" to `docs/scenarios/aspire-dashboard.md` for future troubleshooting.
  - gRPC packages (`@opentelemetry/exporter-trace-otlp-grpc`, `@grpc/grpc-js`) were already in node_modules transitively via `@opentelemetry/sdk-node`.
  - All 84 OTel/Aspire tests pass after fix.
- **OTEL pipeline silent failure diagnosis (2026-02-XX):** Brady reported "telemetry pump not working" — REPL printed telemetry-active message but nothing appeared in Aspire.
  - **Root cause:** Aspire container started without `DASHBOARD__OTLP__AUTHMODE=Unsecured`, gRPC exporter got `16 UNAUTHENTICATED (HTTP 401)` on every export attempt. Error was completely invisible — swallowed by OTel's internal error handling.
  - **Fix 1:** `ensureSDK()` in `otel.ts` now auto-enables OTel `DiagConsoleLogger` at WARN level when `SQUAD_DEBUG=1` is set. This surfaces gRPC transport errors (401, ECONNREFUSED, etc.) to stderr. When `debug: true` is passed explicitly, full DEBUG level is enabled.
  - **Fix 2:** `ensureSDK()` now resets `_sdk = undefined` if `start()` throws, preventing the "initialized but broken" state where the SDK thinks it's running but providers were never registered.
  - **Fix 3:** `shutdownOTel()` catches and logs shutdown/flush errors when `SQUAD_DEBUG=1` instead of propagating them to callers. Previously, a flush error (e.g. 401) would throw from `shutdownOTel()` potentially breaking cleanup chains.
  - **Fix 4:** Added `test/otel-export.test.ts` — 5 tests validating the SDK's internal span pipeline with in-memory exporter (span capture, multi-span, multi-tracer, error recording, clean shutdown).
  - **Key diagnostic technique:** Standalone `tmp-otel-diag.mjs` script creating a single span + flush immediately revealed the 401. This should be the first step whenever "telemetry not appearing" is reported.
  - Code review of `client.ts` span instrumentation: all spans properly `.end()`'d in `finally` blocks; tracer proxy pattern works correctly (module-level `trace.getTracer()` delegates to whatever provider is registered later by `NodeSDK.start()`).
  - 2424 tests passing across 89 files after fix.
- **Dual-mode OTel telemetry (Issue #343, PR #352):**
  - Added `mode` field to `OTelConfig` — written as `squad.mode` resource attribute in `buildResource()`
  - Created `initAgentModeTelemetry()` convenience in `otel-init.ts` — pre-sets `serviceName: 'squad-copilot-agent'` and `mode: 'copilot-agent'`
  - `runShell()` now passes `mode: 'cli'` to `initSquadTelemetry`, so CLI spans are tagged
  - Exported `initAgentModeTelemetry` from SDK barrel (`index.ts`)
  - Added 3 tests in `test/otel-export.test.ts`: mode attribute on spans, dual-mode distinguishability, handle validity
  - No dedicated Copilot agent-mode entry point exists yet — `initAgentModeTelemetry()` is ready for when it's created

---

📌 Team update (2026-02-23T09:25Z): OTel gRPC protocol fix completed, Aspire dashboard working. Streaming diagnostics infrastructure finished by Kovash (SQUAD_DEBUG logging), 13 regression tests added by Hockney. Version bump to 0.8.5.1. — decided by Scribe

### 2026-02-24T17-25-08Z : Team consensus on public readiness
📌 Full team assessment complete. All 7 agents: 🟡 Ready with caveats. Consensus: ship after 3 must-fixes (LICENSE, CI workflow, debug console.logs). No blockers to public source release. See .squad/log/2026-02-24T17-25-08Z-public-readiness-assessment.md and .squad/decisions.md for details.

### Shell Observability Metrics (Issues #508, #520, #526, #530, #531)
- Created `packages/squad-cli/src/cli/shell/shell-metrics.ts` — 4 metrics under `squad.shell.*` namespace
  - `squad.shell.session_count` (counter): incremented on shell start, basic retention proxy
  - `squad.shell.session_duration_ms` (histogram): recorded on shell exit
  - `squad.shell.agent_response_latency_ms` (histogram): time from dispatch to first visible token, attributed by agent name + dispatch type
  - `squad.shell.error_count` (counter): errors during agent/coordinator dispatch, attributed by source
- **Opt-in gated via `SQUAD_TELEMETRY=1`** — stronger than SDK-level gate (which only requires `OTEL_EXPORTER_OTLP_ENDPOINT`). Shell metrics describe user behavior, so explicit consent is required.
- Uses `getMeter('squad-shell')` from SDK — shares the same MeterProvider and OTLP/gRPC pipeline to Aspire
- Wired into `runShell()` in `index.ts`: session count on start, duration on exit, latency in `dispatchToAgent`/`dispatchToCoordinator` (measured at first `message_delta`), errors in catch blocks
- Added subpath export `./shell/shell-metrics` to CLI package.json
- 18 new tests in `test/shell-metrics.test.ts` covering all metrics, opt-in gating, no-op behavior when disabled, and reset
- All 2943 tests pass (only pre-existing Docker/Aspire integration test skipped due to no Docker in env)
