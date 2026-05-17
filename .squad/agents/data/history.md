# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad CLI/SDK, GitHub Copilot agent workflows, TypeScript/Node.js, prompt/runtime templates, client compatibility, agent orchestration
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Data is the explicit Squad framework expert for this team. Data should learn from `C:\Users\tamirdresher\source\repos\squad`, including the Brady Squad repo's SDK/CLI design, governance files, prompt templates, and existing team decisions.

## Learnings

- The `squad` repo's team uses Mission Control roles such as Flight, CAPCOM, CONTROL, FIDO, and others. This project uses Star Trek names, but Data owns equivalent Squad SDK/CLI expertise here.
- Squad framework work should preserve strict routing discipline: the coordinator routes; specialists build and review.

## 2026-05-14T09:22:24.987+05:30 — Brady Squad framework seed

- Brady Squad is a TypeScript ESM monorepo with workspaces `packages/squad-sdk` and `packages/squad-cli`; root scripts are `npm run build`, `npm test`, `npm run lint`, plus template/doc scripts. The current package metadata requires Node.js `>=22.5.0`, even though older decisions mention Node >=20.
- SDK public API is side-effect-light through `packages/squad-sdk/src/index.ts`; it exports resolution, config, agents, casting, skills, coordinator response tiers, runtime/telemetry/offline/cost, marketplace/build/sharing/upstream/remote/streams, builder APIs, roles, platform, storage, and state facades.
- CLI entry is `packages/squad-cli/src/cli-entry.ts`; it enforces Node >=22.5.0, patches Copilot SDK ESM resolution at runtime, uses `--team-root` via `SQUAD_TEAM_ROOT`, and launches the interactive shell by default when no command is provided.
- `squad init` is SDK-backed (`initSquad`) and creates `.squad/`, `.github/agents/squad.agent.md`, optional workflows/templates/MCP config, identity files, ceremonies, `.gitattributes`, and `.gitignore` entries. Re-init is skip-existing by default; upgrade boundaries distinguish Squad-owned files from user-owned team state.
- `.squad/team.md` must contain a header exactly named `## Members`; workflow label automation and CLI roster detection depend on that text. Empty `## Members` means Init Mode, not Team Mode.
- Coordinator prompt contract: Squad is a dispatcher, not a doer. Domain work must be routed to specialists through the available platform mechanism (`task` in CLI, `runSubagent` in VS Code); inline work is a last-resort fallback only when no dispatch mechanism exists.
- `.github/agents/squad.agent.md` is the only discoverable agent prompt copy. Canonical templates live in `.squad-templates/`; mirrors use `squad.agent.md.template` to avoid Copilot CLI discovering duplicate `*.agent.md` files. `scripts/sync-templates.mjs` and `test/template-sync.test.ts` enforce byte-for-byte parity.
- Agent spawning loads `.squad/agents/{name}/charter.md` through `SquadState`/`FSStorageProvider`, builds a system prompt from the charter plus context, creates SDK sessions through `SquadClient`, streams deltas, and tracks status in `SessionRegistry`.
- Resolution is worktree-aware and legacy-aware: `.squad/` is preferred, `.ai-team/` remains fallback, git worktrees may resolve to the main checkout, and remote mode uses `.squad/config.json` with separate `projectDir` and `teamDir`. Agents should trust `TEAM ROOT` from spawn prompts for `.squad/` paths.
- Governance patterns are durable: decisions affecting the team go to `.squad/decisions/inbox/{agent}-{slug}.md`; append-only state uses union merge rules; runtime logs/inbox/session state are ignored; rejected artifacts require a different eligible agent for revision.
- Validation convention: Vitest drives broad coverage under `test/`; init/template/coordinator behavior has dedicated tests (`test/cli/init.test.ts`, `test/init-sdk.test.ts`, `test/template-sync.test.ts`, `test/coordinator-routing.test.ts`). For framework changes, run the narrow relevant tests first, then `npm run lint`/`npm test` when feasible.

## 2026-05-14T10:34:19.384+05:30 — Agent Framework PoC Decisions Merged

Scribe merged Data's Agent Framework demo decisions into canonical `.squad/decisions.md`:
- **Workflow Streaming Contract:** Direct `InProcessExecution.RunStreamingAsync()` call (no compat shim) validates current Microsoft Agent Framework in-process streaming.
- **Demo-Ready Path:** Aspire AppHost defaults to `--example workflow` for Foundry Local validation.
- **Trace Safety:** Added `*.jsonl` to `.gitignore` to prevent accidental event stream commits.
- **Build Validation:** All changes validated via dotnet restore/build.
- **Cross-Agent Impact:** User directive captured — Squad repo docs are authoritative for feature questions; Data should reference `/repos/squad` docs first before answering framework behavior questions here.

## 2026-05-14T11:29:53.602+05:30 — ADC External Event Trigger Integration

**Deep Dive:** Mapped ADC event bus architecture + Squad SDK trigger scaffolding to identify exact gap for event-driven execution.

**Evidence Found:**
- ADC `SandboxEventPublisherService` publishes sandbox lifecycle events (idle eviction, explicit stop) via Redis streams using XADD
- ADC `SandboxEventConsumerService` consumes via XREADGROUP with production-grade consumer groups, retries, and XAUTOCLAIM
- `InstanceEventMessage` carries `InstanceEventType` (start/stop) + `SandboxSuspendMode` from NodeAgent → Cluster API
- Squad `EventTrigger` type exists in `scheduler.ts` L56-59 but `isDue()` intentionally returns false for externally-fired events
- No `fireEventTrigger()` path exists; `squad schedule run` exists but no external event entry point

**Key Insight:**
ADC event bus is production-ready and requires no modification. Bridge is small Squad core addition + ADC-specific adapter. Platform-neutral core (`fireEventTrigger` + `squad schedule fire` CLI), platform-specific adapter layer (Redis subscriber wrapping `SandboxStoppedEventData`).

**Implementation Ownership:**
Data owns Squad SDK side: implement `fireEventTrigger(manifest, state, eventName, payload)` in scheduler.ts (~30 lines) + `squad schedule fire <eventName> [--payload <json>]` CLI command (~50 lines). Must maintain strict TypeScript, no new dependencies, backward compatibility with `LocalPollingProvider`.

**Decision Merged:**
Unified decision in `.squad/decisions.md` combining Data's technical evidence + Geordi's platform research + Seven's architectural verification. Inbox files deduplicated and cleared. Ready for implementation planning.

## 2026-05-17T08:40:44.473+05:30 — ADC Execution Model Convergence: MVP Path + Seam Refinement

**Consolidation:** Five-agent planning session (Picard, Geordi, B'Elanna, Data, Worf) converged on periodic ephemeral ADC sandbox (Model B) as MVP with event-driven seam (fireEventTrigger + `squad schedule fire`) as non-blocking future path.

**Cross-Agent Synthesis:**
- **Picard + Geordi** aligned on periodic ephemeral as operationally simplest (no new infra, no managed identity token blockers, fully reversible to event-driven)
- **B'Elanna** derived 8 reliability invariants from failure-mode analysis; GitHub labels + GitHub API queries provide durable state across suspend/resume
- **Data** refined SDK surface: core changes are strictly platform-neutral (`fireEventTrigger`, CLI); ADC/Redis/auth concerns stay in adapter layer; flagged `copilot` task executor stub in LocalPollingProvider as P0 blocking issue
- **Worf** conditionally approved Models 1 (webhook, future) and 2 (periodic, MVP) with mandatory guardrails G1–G5; explicitly rejected Model 3 (long-lived) for cost and crash-recovery reasons

**Implementation Sequencing:**
1. P0: Fix `copilot` task executor in LocalPollingProvider (blocks validation)
2. P0: Implement `fireEventTrigger(manifest, state, eventName)` (~20 lines) + `squad schedule fire` CLI (~60 lines)
3. MVP Adapter: GitHub Actions workflow + suspend/resume logic (~150 lines total)
4. Security: Apply Worf's G1–G5 guardrails before touching live issues
5. Deferred: Managed identity verification (Model 1 blocker), Durable Functions (multi-step requirement), multi-sandbox parallelism

**Key Refinement:** Event-driven seam is already architecturally sound from Feb planning. Periodic MVP accelerates first validation without waiting for ADC managed identity token acceptance. Same ADC API surface (resumeSandbox + execShell + stopSandbox) works for both trigger types; adapter is the only difference.

