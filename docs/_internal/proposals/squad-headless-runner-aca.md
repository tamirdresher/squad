---
status: draft
author: tamirdresher (Tamir Dresher)
date: 2026-06-15
target_release: TBD (post-v0.10.1)
workstream_branch: feat/headless-runner-aca
---

# Squad Headless Runner + Azure Container Apps Sandbox

> "Idea to production-ready agent in seconds." — Microsoft Build 2026 keynote framing for ACA Sandbox / Dynamic Sessions

## Problem

Squad today ships as a local TTY (`squad shell`) and a partially-built remote control (`squad rc`). The remote control is ~70% complete: it has a WebSocket bridge, PWA UI, session-token auth, ticket-based WS auth, audit logging, devtunnel + QR-code for phone access. What it does **not** have is a smart backend — `rc.ts:204` literally spawns `copilot --acp` as a child process and the bridge forwards bytes back and forth. The "real" coordinator logic does not run server-side.

We want Squad to run as a headless service so that:

1. It can be deployed to a container runtime (Docker → ACA → ACA Sandbox).
2. Multiple users can connect to a centrally-hosted Squad without each one needing the CLI installed locally.
3. The SDK abstractions (`StorageProvider`, `MemoryProvider`, `SquadState`, OTel) become useful beyond a single-machine TTY.
4. Tenant isolation, snapshot suspend/resume, sub-second cold start, and scale-to-zero come "for free" from ACA Sandbox instead of being problems we have to solve in Squad itself.

## Why now — Azure Container Apps Sandbox (Build 2026)

Verified 2026-06-15 against `learn.microsoft.com/azure/container-apps/ai-integration` and `azurefeeds.com/2026/06/03/introducing-azure-container-apps-sandboxes`:

| Capability | What it gives Squad |
|---|---|
| microVM isolation | Enterprise-grade multi-tenant boundary per session |
| Sub-second startup | Interactive UX is viable (vs. classic ACA cold start) |
| Scale to zero | Free when idle |
| Custom OCI images | Our Dockerfile lands as-is — no SaaS lock-in |
| Snapshot suspend/resume | Preserves coordinator state across reconnects |
| Managed identities | No hardcoded creds in the image |
| Network egress controls | Limits what spawned agents can reach |
| Hyper-V isolation (Dynamic Sessions) | Per-agent code execution sandbox (Phase 4) |

Reference repos:
- [microsoft/Build26-BRK221-idea-to-production-ready-agent-in-seconds-on-ai-native-runtime](https://github.com/microsoft/Build26-BRK221-idea-to-production-ready-agent-in-seconds-on-ai-native-runtime)
- [Azure-Samples/dynamic-sessions-custom-container](https://github.com/Azure-Samples/dynamic-sessions-custom-container)

## Solution sketch

Replace the dumb `copilot --acp` passthrough with an **in-process** coordinator runner that uses `SquadClient` from `@bradygaster/squad-sdk/client` directly — the same path that `squad shell` already uses today (`packages/squad-cli/src/cli/shell/index.ts:19,24`). The smart-backend swap is, mechanically, a copy of `shell/spawn.ts`'s session-creation pattern into the `RemoteBridge.config.onPrompt` callback.

Bundle the result in a container image. Deploy to Azure Container Apps. Per-tenant isolation comes from ACA Sandbox.

## Current-state citations

- `packages/squad-cli/src/cli/shell/index.ts:19,24` — `SquadClient` and `FSStorageProvider` imported directly from the SDK. **This proves the in-process path works today; the shell is the reference impl.**
- `packages/squad-cli/src/cli/commands/rc.ts:204-238` — the ACP passthrough we want to replace in Phase 2.
- `packages/squad-sdk/src/remote/bridge.ts` — WebSocket bridge, auth, audit log, rate limiting, session TTL, origin validation. Production-shaped, not a prototype.
- `packages/squad-sdk/src/remote/protocol.ts` — full wire protocol. Server→client: `status`, `history`, `delta`, `complete`, `agents`, `tool_call`, `permission`, `usage`, `error`, `pong`. Client→server: `prompt`, `direct`, `command`, `permission_response`, `ping`.
- `packages/squad-sdk/src/storage/storage-provider.ts` — abstract interface; three concrete implementations (`FSStorageProvider`, `InMemoryStorageProvider`, `SqliteStorageProvider`).
- `packages/squad-sdk/src/memory/index.ts:134` — pluggable `MemoryProvider` interface.
- `packages/squad-cli/src/cli/commands/state-mcp.ts:67-73` — the MCP server is a thin JSON-RPC wrapper around `ToolRegistry`. In-process tool registration (via the SDK's `ToolDefinition`) eliminates the need for the stdio MCP child entirely when the LLM lives in the same Node process.

## Phasing

### Phase 1 — Container foundation (this PR)

| Deliverable | Status |
|---|---|
| `Dockerfile` (multi-stage, `node:22-alpine`) | This PR |
| `.dockerignore` | This PR |
| This RFC | This PR |
| Smoke: `docker build` + `docker run squad --version` + `docker run squad doctor` | Verified before merge |

**Out of scope for Phase 1** (explicitly): `squad serve`, smart backend, Copilot CLI bundling, agent execution, ACA deployment manifest, multi-tenancy.

This phase answers exactly one question: *"does the CLI run cleanly in a container?"*

### Phase 2 — Smart backend (`squad serve`)

- New `squad serve` subcommand (separate from `squad rc` — preserves backward compat for current rc users).
- `RemoteBridge.config.onPrompt` wired to `SquadClient.createSession()` + `session.sendAndWait()` (or streaming via `session.on('message_delta')` → `bridge.sendDelta()`).
- Squad tools (`squad_state_*`, `memory.*`) registered as in-process `ToolDefinition`s on the session — no child MCP process.
- Updated Dockerfile exposes the bridge port; `HEALTHCHECK` added.
- Storage backend selectable via `SQUAD_STORAGE=fs|memory|sqlite` env var, consumed by the bridge factory.
- Smoke test extended: spawn the container, send a prompt via WebSocket, expect a real coordinator response.
- Still single-tenant: one user per container.

### Phase 3 — Cloud deployment

- ACA Bicep deployment manifest (`infra/aca.bicep`).
- Real auth (OAuth, per-user identity, per-user `TEAM_ROOT`).
- Per-connection vs. per-container session model (decision point).
- Telemetry → Application Insights via the SDK's existing OTel wiring (`runtime/otel-*.ts`).
- Managed Identity for any Azure-side dependencies.

### Phase 4 — Research

- Durable Functions saga refactor: convert the coordinator's `task` dispatches into Durable activity calls. Squad's orchestration IS a saga (fan-out → fan-in → audit-log via Scribe → reviewer-rejection compensation). Free checkpointing + restart resilience.
- ACA Dynamic Sessions for spawned-agent code execution (per-agent sandbox).

## Open questions (Phase 1 surfaces them, Phase 2/3 resolves them)

1. **Auth.** Whose GitHub Copilot subscription pays when User X kicks off a containerized squad? Options: per-user token forwarded into the container, service principal pool, Foundry Hosted Agents integration. *This is the biggest unknown.*
2. **Cold start budget.** ACA Sandbox sub-second startup is the sandbox itself; the Node.js process + initial coordinator load is added on top. Needs end-to-end measurement.
3. **State persistence.** One container per user/session means `.squad/` lives in the container volume. Where does it survive restarts — mounted Azure Files? Blob upload on shutdown? SQLite blob round-trip?
4. **Per-agent sandboxing.** Squad spawns agents today via in-process `task` calls. Should each agent get its own ACA Dynamic Session for code-execution isolation, or do we trust the parent Sandbox?
5. **Skill/charter discovery in container.** Bundled in the image (today's plan) vs. mounted from a config volume vs. pulled from a known registry per tenant.

## Non-goals

- Not replacing `squad shell` or `squad rc` — they continue to exist unchanged.
- Not changing the SDK's public API in Phase 1.
- Not bundling the Copilot CLI in Phase 1 (deferred to Phase 2 with `squad serve`).
- Not solving multi-tenancy in Phase 1 (single user per container).

## Acceptance criteria for Phase 1

1. `docker build -t squad:phase1 .` from the repo root succeeds on a clean Node 22+ host.
2. `docker run --rm squad:phase1 --version` prints a valid semver.
3. `docker run --rm squad:phase1 --help` prints CLI help.
4. Image runs as non-root user (`squad`, uid synthesized).
5. `VOLUME /workspace` declared so users can mount a host `.squad/` directory.

> **Note on image size:** Phase 1 image is ~1.3 GB (Alpine ~150 MB + full `node_modules` including devDeps ~1 GB + dist + templates ~150 MB). This is acceptable for Phase 1 ("can it run in a container?"). **Image-size optimization is explicitly Phase 2 work**, where `npm prune --production` after build, removing the `scripts/` directory, and possibly switching to `node:22-alpine` distroless or `gcr.io/distroless/nodejs22` runtime can take it under 400 MB. We avoid premature optimization in Phase 1 to keep the diff small and the failure surface narrow.

## References

- ACA AI Integration docs: https://learn.microsoft.com/en-us/azure/container-apps/ai-integration
- Build 2026 BRK221 repo: https://github.com/microsoft/Build26-BRK221-idea-to-production-ready-agent-in-seconds-on-ai-native-runtime
- ACA Dynamic Sessions custom container sample: https://github.com/Azure-Samples/dynamic-sessions-custom-container
- LangChain × ACA Dynamic Sessions blog: https://www.langchain.com/blog/integrating-langchain-with-azure-container-apps-dynamic-sessions
- Squad RemoteBridge: `packages/squad-sdk/src/remote/bridge.ts`
- Squad RC CLI: `packages/squad-cli/src/cli/commands/rc.ts`
- Squad RC wire protocol: `packages/squad-sdk/src/remote/protocol.ts`
- Squad SDK client: `packages/squad-sdk/src/adapter/client.ts`
- Existing sample Dockerfile pattern: `samples/knock-knock/Dockerfile`
