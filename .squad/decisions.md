# Squad Decisions

## Active Decisions

### 2026-05-14T09:22:24.987+05:30: Star Trek Squad for Squad development

**By:** Tamir Dresher (via Copilot)

**What:** This repo's Squad uses a Star Trek roster: Picard, Data, B'Elanna, Geordi, Seven, Worf, Troi, Scribe, and Ralph. The team focuses on developing Squad itself and related work: Durable Tasks/DTD, distributed AI agent systems, ADC, AKS, ACA, Azure integrations, agent frameworks, and Clawpilot/m.

**Why:** Tamir requested a team based on Star Trek that learns from `C:\Users\tamirdresher\tamresearch1` and `C:\Users\tamirdresher\source\repos\squad`.

### 2026-05-14T09:22:24.987+05:30: Data owns Brady Squad expertise

**By:** Tamir Dresher (via Copilot)

**What:** Data is the explicit Squad Framework Expert responsible for learning from Brady's Squad repo and applying Squad SDK/CLI, coordinator, runtime, and template knowledge here.

**Why:** Tamir asked for a member who is an expert in Squad from the Brady GitHub Squad repo.

### 2026-05-14T09:22:24.987+05:30: Troi owns Tamir voice writing

**By:** Tamir Dresher (via Copilot)

**What:** Troi owns blogs, posts, and public writing in Tamir's voice, style, and humor. Troi should learn from how this was done in `tamresearch1` and related Squad content before drafting.

**Why:** Tamir requested a dedicated member for blogs/posts using his voice, style, and humor.

### 2026-05-14T09:22:24.987+05:30: Foundational Directives (Type Safety, Hooks, ESM, Merge Drivers, Proposal-First)

**By:** Seven (seeded from squad/.squad/decisions.md)

**What:** These durable principles must guide all work:

1. **Type Safety — Strict Mode Non-Negotiable**
   - `strict: true`, `noUncheckedIndexedAccess: true`, no `@ts-ignore` allowed
   - Types are contracts; if it compiles, it works

2. **Hook-Based Governance Over Prompt Instructions**
   - Security, PII, file-write guards implemented via hooks module (not prompts)
   - Prompts can be ignored; hooks execute deterministically

3. **Node.js ≥20, ESM-Only, Streaming-First**
   - Runtime target Node.js 20+
   - Async iterators over buffers for cleaner patterns

4. **Merge Driver for Append-Only Files**
   - `.gitattributes` uses `merge=union` for `.squad/decisions.md`, `agents/*/history.md`, `log/**`, `orchestration-log/**`
   - Enables conflict-free merging across branches

5. **Proposal-First Workflow**
   - Meaningful changes require `docs/proposals/` before execution
   - Creates alignment before code is written

**Why:** Production-proven patterns from squad and tamresearch1 repositories.

### 2026-05-14T09:22:24.987+05:30: Routing Discipline (Platform-Neutral Dispatch)

**By:** Seven (seeded from squad/.squad/decisions.md)

**What:** Dispatcher prompt enforces platform-neutral dispatch mechanisms:
- "You are a DISPATCHER, not a DOER"
- List dispatch mechanisms per platform: CLI (`ask` tool), VS Code (`unSubagent` tool), or fallback (inline work)
- Platform-neutral substitution logic prevents enforcement gaps
- Top-and-bottom reinforcement in prompt (LLMs weight beginning/end more)

**Why:** VS Code coordination failure analysis reveals CLI-centric language fails in non-CLI contexts. Platform-neutral rules prevent enforcement gaps.

**Action for squad-squad:** When coordinator prompt is refined, embed this platform-neutral dispatch model explicitly. Avoid CLI-specific language.

### 2026-05-14T09:22:24.987+05:30: PR Deduplication + Proposal-First Enforcement

**By:** Seven (seeded from squad/.squad/decisions.md)

**What:** High-quality contributors (tamirdresher) follow proposal-first discipline:
- Merge comprehensive, high-quality PRs with correct file locations and superset scope
- Close duplicates with citations; preserve unique value
- Enforce `docs/proposals/` requirement retroactively on incoming work
- Reduces PR count, eliminates conflicts, preserves functionality

**Why:** Reduces coordination overhead; ensures quality and alignment before implementation.

### 2026-05-14T09:22:24.987+05:30: Cross-Squad Skills Marketplace

**By:** Seven (seeded from tamresearch1/.squad/)

**What:** Durable pattern for shared skill distribution:
- Central marketplace at `tamirdresher/squad-skills` (GitHub repo)
- Each skill requires 4 files: `SKILL.md`, `manifest.json`, `plugin.json`, `README.md`
- Manifest includes triggers for discoverability (e.g., `cross squad`, `inter squad`)
- Teams install via: `copilot plugin install tamirdresher/squad-skills:plugins/{skill-name}`

**Why:** Standardized skill distribution enables reuse across squads.

**Action for squad-squad:** Squad-squad skills should follow this structure when published to marketplace.

### 2026-05-14T09:22:24.987+05:30: Respect Brady Squad Framework Contracts

**By:** Data (seeded from Brady Squad expertise)

**What:** Framework work should preserve Brady Squad's established contracts:
- Strict TypeScript/ESM with Node >=22.5.0
- Coordinator-as-dispatcher behavior
- Hook/code-based governance over prompt-only safety
- Canonical `.squad-templates/` template syncing
- Exact `## Members` roster header compatibility
- `.github/agents/squad.agent.md` as the only discoverable coordinator prompt copy
- Worktree/remote-aware `TEAM ROOT` path resolution
- Decision drops through `.squad/decisions/inbox/`

**Why:** These are active runtime, prompt, workflow, and test contracts in the Brady Squad repo. Diverging would break client compatibility, routing discipline, template discovery, or governance semantics.

### 2026-05-14T09:22:24.987+05:30: Troi Voice Pattern for Public Writing

**By:** Troi (seeded from tamresearch1 voice analysis)

**What:** Public Squad writing should follow Tamir's established voice pattern:
- First-person, technically specific, story-driven
- Funny in a natural/self-deprecating way
- Honest about rough edges before celebrating wins
- Source material is untrusted input; must read `.squad/decisions.md` and relevant prior posts before drafting
- Security, compliance, sensitive internal-work claims, unverifiable metrics, patent/novelty claims, and public-risk topics require Worf review before publication
- Avoid generic AI hype, corporate marketing language, and bullet-heavy "feature list" posts unless format genuinely serves the story

**Why:** Prior Tamir public posts show the durable pattern is concrete experience, specific technical scars, earned humor, and honest narrative arc.

### 2026-05-14T10:34:19.384+05:30: User directive — Squad repo as source of truth

**By:** Copilot (directive capture)

**What:** For questions about Squad product features or CLI behavior, do not guess from generic concepts. Read the Squad repo and relevant docs/source first, then answer from the implementation.

**Why:** User request — establishes Squad repo/docs as authoritative for feature questions.

### 2026-05-14T10:34:19.384+05:30: Agent Framework demo decisions

**By:** Data (Agent Framework PoC)

**What:**
1. Keep the workflow example on the current Microsoft Agent Framework in-process streaming contract by calling `InProcessExecution.RunStreamingAsync(workflow, input, "writer-squad-workflow", ct)` directly instead of carrying a local compatibility shim.
2. Make the Aspire AppHost child project exercise the workflow scenario by default with `--example workflow` so Foundry Local wiring validates the intended PoC path.
3. Ignore `*.jsonl` trace dumps to avoid committing Copilot event streams.
4. Validated via: `dotnet restore .\squad-agent-framework.slnx && dotnet build .\squad-agent-framework.slnx --no-restore` succeeded.

**Why:** Reduces maintenance burden, validates demo-ready PoC path, and prevents accidental trace-dump commits.

**Files changed in target repo:** `.gitignore`, `WorkflowExample.cs`, `Squad.AgentFramework.Demo.AppHost/AppHost.cs`.

### 2026-05-17T08:40:44.473+05:30: ADC-Squad Execution Model — Periodic Ephemeral MVP with Event-Driven Seam

**By:** Picard, Geordi, B'Elanna, Data, Worf (consolidated)

**What:** Design and sequence the execution model for running Squad on ADC sandboxes, with short-term MVP (periodic ephemeral scan) and long-term event-driven extensibility.

**MVP Decision: Periodic Ephemeral Sandbox (Model B)**

Trigger Squad to run every N minutes (default 15–60 min) via GitHub Actions cron or Azure Timer Function. The sandbox:
1. Resumes (or creates) a named ADC sandbox via `adc-api.js`
2. Runs `squad schedule run <schedule-id>` to poll GitHub for issues, process them, and persist state
3. Suspends the sandbox on completion
4. Cost is bounded: sandbox only runs during scan windows (~5–15 min per cycle)

**Rationale:**
- **Lowest operational surface.** No Azure Function to deploy/maintain, no webhook secret to rotate, no managed identity token verification blockers.
- **Fits ADC's ephemeral design.** Suspend/resume is sub-second. Scales naturally as workload grows without long-lived cost.
- **Naturally resilient to duplicate events.** The model ignores GitHub event delivery entirely; duplicate webhooks have zero effect. Ground truth is re-derived from GitHub on each scan.
- **Maps to existing Squad primitives.** `CronTrigger` and `IntervalTrigger` in scheduler.ts are already in place. GitHub Actions workflow or Azure Timer Function are natural providers.
- **Fully reversible to event-driven.** The same `adc-api.js` calls (`resumeSandbox` + `execShell` + `stopSandbox`) are event-triggered instead of time-triggered with minimal adapter code (~80 lines).

**Event-Driven Seam (Future, Non-Blocking):**

Once the periodic model proves reliable and event-driven latency becomes a requirement, add:
1. **Squad Core:** `fireEventTrigger(manifest, state, eventName)` in scheduler.ts (~20 lines) + `squad schedule fire <eventName> [--payload <json>]` CLI command (~60 lines). Platform-neutral, no ADC/Redis references in core.
2. **ADC Adapter (Separate):** Minimal script (~80 lines) subscribes to ADC Redis stream, wraps `SandboxStoppedEventData`, calls `squad schedule fire sandbox:stopped --payload <json>`.
3. **Webhook Adapter (Azure Function, Future):** GitHub webhook → Azure Function → `squad schedule fire github:issue-opened --payload <json>` with managed identity and rate limiting.

**Reliability Invariants (All Models):**

| # | Invariant | Mechanism |
|---|-----------|-----------|
| I-1 | **Claim before act** | Apply `squad:processing` GitHub label before any work; verify label applied before proceeding |
| I-2 | **Terminal state is permanent** | `squad:done` label written before sandbox exits; stale-lease sweep re-queues if `done` is never set |
| I-3 | **Stale lease TTL enforced** | Every scan checks for `squad:processing` > 30 min old; unconditionally clear and re-queue |
| I-4 | **Duplicate events have no effect** | Model B ignores event delivery; re-derives ground truth from GitHub per scan |
| I-5 | **Ground truth from GitHub only** | No in-memory/in-sandbox state trusted across invocations; fresh API query on startup |
| I-6 | **Cancellation respected** | Before posting writes, re-check issue is still open and labeled; exit cleanly if cancelled |
| I-7 | **Idempotent guards on writes** | Before comment/PR/label, pre-read to detect if already applied; no duplicate writes |
| I-8 | **Concurrency cap per scan** | Claim max N issues per cycle (e.g., N=3) to bound compute and prevent backlog floods |

**Implementation Sequencing (MVP Phase):**

1. **Immediate (Squad SDK):**
   - Implement real `copilot` task type execution in `LocalPollingProvider` (~20 lines). **Critical gap:** without this, `squad schedule run` runs but agent is never invoked in ADC.
   - Add `--json` flag to `schedule run` for structured output (P1).
   - Export helpers for reliability invariants: `applyLeaseLabel()`, `checkLeaseExpiry()`, etc. (P1).

2. **MVP Adapter (ADC + GitHub Actions, ~150 lines total):**
   - GitHub Actions workflow (`.github/workflows/squad-adc-loop.yml`): cron trigger → `az login` → `adc-api.js` → `resumeSandbox` → `squad schedule run daily-triage` → `stopSandbox`.
   - State file (`.squad/.schedule-state.json`) survives suspend/resume; adapter wraps state commits in `git add / git commit / git push`.
   - Manifest entry in `schedule.json`: `daily-triage` with `CronTrigger` interval (e.g., every 15 min) or `IntervalTrigger`.

3. **Security Guardrails (Pre-MVP):**
   - Apply Worf's mandatory guardrails: G1 (no secret interpolation), G2 (idempotency), G3 (Key Vault), G4 (sandbox TTL), G5 (execution timeout).
   - Issue payloads written to files, never interpolated into commands.
   - Auto-suspend policy on every sandbox: `enabled: true, idleTimeout: 30 min`.

4. **Future (Non-MVP):**
   - Event-driven seam (`fireEventTrigger` + CLI) once periodic model is proven.
   - Azure Function webhook adapter when sub-minute latency is required (blocked by managed identity token acceptance by ADC API — must verify first).
   - Durable Functions orchestration when workflow becomes multi-step (Plan → Implement → Review → PR).

**What NOT in MVP:**
- Event Grid / Service Bus integration (blocked on ADC managed identity token acceptance verification).
- Durable Task Scheduler (deferred until multi-step workflow needed).
- Long-lived continuous loop sandbox (rejected by Worf: unbounded cost, no crash recovery, single point of failure).
- Webhook adapter (deferred to after MVP validation).

**Risks & Mitigations:**

| Risk | Mitigation |
|------|-----------|
| `copilot` task type remains stubbed in production ADC | **P0:** Implement real execution path before any ADC validation run |
| Payload env var leaked to subprocesses | Document `SQUAD_EVENT_PAYLOAD` scope; clear after task or pass via temp file |
| Concurrent `fire` invocations cause `.schedule-state.json` corruption | ADC/Function must not double-fire same event; GitHub labels provide external idempotency gate |
| Command injection via issue payload | Apply Worf's G1: issue payloads only written to files, never interpolated into shell |
| Unbounded agent runtime | Apply Worf's G5: hard timeout on `execShell` (30 min suggested); ADC auto-suspend as safety net |
| Stale leases accumulate if scan crashes | Lease TTL check (30 min) on every scan startup; unconditional clear |

**Stakeholders & Approvals:**

- ✅ **Picard (Architecture):** Endorses periodic ephemeral MVP; event-driven seam is reversible.
- ✅ **Geordi (ADC/Azure):** Confirms periodic model uses only customer-accessible ADC surfaces (`adc-api.js`, Portal, `az login`).
- ✅ **B'Elanna (Reliability):** Eight reliability invariants are non-negotiable; GitHub labels as state store is sufficient MVP.
- ✅ **Data (Squad SDK):** Owns implementation of `fireEventTrigger()` + CLI + real `copilot` task execution.
- ✅ **Worf (Security):** Model 1 (webhook, future) and Model 2 (periodic, MVP) conditionally approved with mandatory guardrails G1–G5; Model 3 (long-lived) rejected.

### 2026-05-18T11:42:44.342+03:00: Ralph-Style Periodic 5-Minute ADC Runner — MVP Directive & Comprehensive Design Review

**By:** Picard (architecture), Data (CLI semantics), Geordi (Azure/ADC platform), B'Elanna (state machines/reliability), Worf (security guardrails), Tamir Dresher (user directive)

**Status:** Consolidated decision from inbox; implementation phase authorized.

**What:** The ADC Squad runner MVP is a **Ralph-style periodic dispatcher** running every 5 minutes. It scans GitHub for actionable issues/PRs labeled `squad`, deduplicates work via labels and a durable lease store, dispatches unclaimed work to available ADC sandboxes, and orchestrates the broader Ralph lifecycle: issue handling, PR creation, merge gating, and conflict escalation. No Squad CLI changes. No dependency on `squad schedule run daily-triage`.

#### Core Orchestration Loop (Every 5 Minutes)

```
[Timer fires (Azure Functions TimerTrigger)]
  1. Resume/acquire sandbox pool connection (via Microsoft.Adc.Client)
  2. Load .squad/.lease-store.json (git pull to ensure freshness)
  3. Stale-lease sweep: check all leases where expires_at < now()
     - If no PR exists → remove squad:processing label, delete lease, re-queue issue
     - If PR exists → remove squad:processing, add squad:pr-open, phase = pr_open
  4. PR state sweep: for all issues with phase == pr_open
     - Query GitHub: check mergeable_state
     - If dirty → apply squad:conflict, assign rebase sandbox
     - If clean + approved → merge via API, apply squad:done, close issue
  5. Candidate query: GitHub issues with squad label, NOT squad:processing, NOT squad:done
  6. For up to N=3 candidates:
     a. Apply squad:processing label atomically (G13: re-read to verify, check timestamp < 2s)
     b. Write lease entry to .squad/.lease-store.json (G14: commit before resumeSandbox)
     c. git push the updated lease-store
     d. Resume idle sandbox via adc-api.js / Microsoft.Adc.Client
     e. Upload issue payload via sandbox.UploadFileAsync(...) — never interpolate (G16)
     f. Execute fixed entrypoint: execShell(id, "node /squad/runner.js") — constant string (G17)
  7. Commit updated lease-store, git push
  8. Sandbox suspends when idle
```

#### Durable State Model

**GitHub Labels (External Atomic Gate):**
- `squad` — Issue is Squad work
- `squad:agent:<name>` — Triaged to specific agent
- `squad:processing` — Sandbox holds exclusive lease (30-min TTL per G13, reduced to 10 min for 5-min cycles per Worf)
- `squad:pr-open` — PR created, under review
- `squad:pr-approved` — Approved, ready to merge
- `squad:conflict` — PR has merge conflicts, rebase needed
- `squad:conflict:escalated` — 3 rebase failures; human/Picard review required
- `squad:done` — Terminal state; never re-queued

**Lease-Store Schema** (`.squad/.lease-store.json`):
```json
{
  "schema": 1,
  "last_scan": "<ISO-8601>",
  "leases": {
    "<issue_number>": {
      "sandbox_id": "<adc-sandbox-id>",
      "agent": "<squad-agent-name>",
      "branch": "squad/issue-<N>",
      "phase": "claimed | working | pr_open | conflict",
      "claimed_at": "<ISO-8601>",
      "expires_at": "<ISO-8601>",
      "pr_number": null,
      "attempt": 1,
      "conflict_count": 0
    }
  }
}
```

#### Duplicate Prevention (Claim-Before-Act)

1. **Atomic label claim** (G13): Apply `squad:processing` via GitHub API. Re-read immediately; verify label present AND timestamp < 2s. Race-safe on 5-min cycles with `[Singleton]` Function + re-read check.
2. **Lease write** (G14): Write lease entry to `.squad/.lease-store.json` and git push **before** calling `resumeSandbox`. This persists the claim across crashes.
3. **Same-issue guard**: Sandbox verifies its `sandbox_id` is recorded in the lease before proceeding. If not, abort and remove label.
4. **Stale TTL** (I-3): 30-minute baseline; reduced to 10 minutes for 5-minute cycle safety per Worf G13. Every scan unconditionally clears expired leases.

**Why this prevents duplicates:** GitHub label is the external atomic primitive; lease-store is the process-local durability record. Both must be written before work begins. On race, the scanner that writes the lease-store first owns the issue; the second sees it already leased and skips.

#### Sandbox Execution Contract

**What runs inside ADC** (fixed entrypoint, no interpolation per G16):

```bash
# Pre-baked in copilot disk image: /squad/runner.js
# Function uploads issue payload to /squad/payload.json (JSON, not interpolated)
execShell(sandboxId, "node /squad/runner.js")

# runner.js pseudo-code:
1. Read /squad/payload.json (issue number, repo, agent assignment)
2. git pull --ff-only
3. git checkout -b squad/issue-<N>
4. Execute Ralph instructions: fetch issue, identify work, spawn Copilot agent(s)
5. On completion: commit, push PR, apply squad:pr-open label
6. rm -f /squad/payload.json (cleanup per G17)
7. Exit with status for Function to inspect
```

**Security (Worf guardrails G13–G19):**
- G13: Label claim with re-read; 10-min TTL for 5-min cycles
- G14: Lease state written before resumeSandbox
- G16: Payload via file upload; command is literal constant, never interpolated
- G17: Payload deleted by sandbox runner after read; Function also deletes in finally
- G18: Agent may create/push PRs; may NOT merge without human approval on protected branches
- G19: Merge conflicts escalate to human; no automated conflict resolution (agent cannot both write and resolve)

#### Orchestrator Host Options

| Host | When | Notes |
|------|------|-------|
| `ralph-watch-adc.ps1` (local) | Dev/demo on Tamir's machine | Exact PowerShell port of tamresearch1 ralph-watch.ps1; no infra needed |
| Azure Functions TimerTrigger (.NET) | Production/cloud | Primary MVP path; uses `Microsoft.Adc.Client` + `DefaultAzureCredential`; requires G13–G19 implementation |

**MVP Phase:** Prioritize Azure Functions path. Local PowerShell is a fallback for dev/demo only.

#### PR / Merge / Conflict Lifecycle

1. **Issue → PR**: Agent completes work, opens PR on `squad/issue-<N>`, applies `squad:pr-open` label, removes `squad:processing`.
2. **PR Review**: Each 5-min scan checks `mergeable_state` via GitHub API.
3. **Conflict Detection**: If `mergeable_state == 'dirty'`, apply `squad:conflict`, dispatch sandbox to rebase.
   - Success: remove label, increment counter
   - Failure: retry up to 2 more times (3 total)
   - After 3 failures: apply `squad:conflict:escalated`, comment tagging Picard, stop retry
4. **Merge Gate** (G18): Agent may NOT merge to protected branches without human approval. Only merge if PR approved + CI green + human review registered in GitHub.
5. **Terminal**: On merge or close, apply `squad:done`, remove lease, never re-queue.

#### Reliability Invariants (Inherited from 2026-05-17 Decision)

| # | Invariant | Mechanism |
|---|-----------|-----------|
| I-1 | Claim before act | Apply `squad:processing` before work; verify applied before proceeding |
| I-2 | Terminal state permanent | `squad:done` written before sandbox exits; stale sweep re-queues if `done` unset |
| I-3 | Stale lease TTL enforced | 10-min TTL for 5-min cycles; every scan unconditionally clears expired |
| I-4 | Duplicate events → no effect | Scan re-derives ground truth from GitHub fresh each cycle; duplicate timer fires idempotent |
| I-5 | Ground truth from GitHub only | No in-memory/in-sandbox state trusted across invocations |
| I-6 | Cancellation respected | Re-check issue open before posting writes; exit cleanly if cancelled |
| I-7 | Idempotent guards on writes | Pre-read before comment/PR/label to detect if already applied |
| I-8 | Concurrency cap per scan | Claim max N=3 issues per cycle; bounds compute, prevents backlog floods |

#### What's NOT in MVP

- No Squad CLI changes
- No `squad schedule run` as orchestrator; ADC Function is the orchestrator
- No event-driven triggers (5-min polling suffices; event-driven is future seam)
- No long-lived sandbox (each sandbox is ephemeral: resume → work → suspend)
- No pre-existing sandbox pool; MVP uses 1 singleton sandbox (scalable to pool of 3+ via label `squad:runner-pool-size=N`)

#### Rationale

`ralph-watch.ps1` from tamresearch1 is production-proven: 150+ rounds, dedup via assignees, parallel agent dispatch, circuit breaker — all working. This ADC adaptation is a **direct port** of that model: replace local copilot CLI invocation with ADC sandbox resume → execShell, replace assignee-based dedup with GitHub label-based dedup (`squad:processing` + 10-min TTL), replace mutex with label atomicity (GitHub API is the coordination primitive). The design preserves:

1. **Thin orchestrator:** 5-min loop, no state engine
2. **Battle-tested dedup:** label-based vs. assignee-based is a swap, same pattern
3. **Auditable:** all decisions logged in GitHub labels + `.squad/.lease-store.json` (git-tracked)
4. **Resilient to crashes:** lease TTL + stale sweep recovers any stuck issue; ADC auto-suspend + disk-backed suspend enables crash recovery

#### Decisions Required (Resolved)

1. **Option for in-sandbox command:** A (pre-baked agent script in image) ✅ Selected
2. **Sandbox pool size:** 1 singleton for MVP ✅ Confirmed
3. **Lease-store conflict model:** Eventually consistent, GitHub label as authoritative gate ✅ Confirmed
4. **Conflict escalation target:** Picard (approver agent, can summon human intervention) ✅ Confirmed
5. **N (concurrency cap):** N=3 issues per cycle ✅ Confirmed
6. **Managed Identity bearer token for ADC API:** Geordi to verify G11 (prerequisite for Azure Function auth to ADC) ⏳ Blocking

#### Stakeholders & Approvals

- ✅ **Tamir (User):** Directive confirmed: 5-min timer, no Squad CLI changes, broader Ralph lifecycle (issues/PRs/merges/conflicts)
- ✅ **Picard (Architecture):** Endorsed Ralph-style MVP; confirmed thin orchestrator, auditable, reversible to event-driven
- ✅ **Data (CLI Semantics & SDK):** Mapped current `squad watch --execute` phases; confirmed Ralph instructions path; identified Squad CLI gaps to fill (P1: real `copilot` task execution in LocalPollingProvider)
- ✅ **Geordi (Azure/ADC Platform):** Confirmed ADC surfaces; recommends singleton sandbox for MVP; awaiting Managed Identity token acceptance verification (G11)
- ✅ **B'Elanna (Reliability & State Machines):** Authored comprehensive state machine; confirmed durable lease model, TTL/recovery, PR lifecycle, conflict handling; lease-store as durability aid (GitHub label is ground truth)
- ✅ **Worf (Security & Reliability):** Conditional approval with mandatory guardrails G13–G19; rejected automated merge and automated conflict resolution; requires human approval gate on protected branches and conflict escalation to human
- ✅ **Seven (Governance):** Audited ADC corrections against tamresearch1 source of truth; confirmed pre-baked image approach, disk-backed suspend, no late-startup installs

#### Next Steps (Implementation Phase)

1. **P0 — Worf Gate (G11):** Geordi confirms Managed Identity bearer token accepted by ADC API (blocks Azure Function auth)
2. **P1 — Squad SDK:** Real `copilot` task execution in `LocalPollingProvider` (~20 lines); export lease-label helpers
3. **P1 — Pre-baked image:** Create `runner.js` in copilot disk image; bake into ADC image
4. **P2 — Azure Function:** C# .NET function with `Microsoft.Adc.Client`; implements 5-min loop per above spec
5. **P2 — Local Ralph watch fallback:** `ralph-watch-adc.ps1` for dev/demo (local version, not cloud)
6. **P3 — PR/merge gating:** Validate GitHub branch protection integration; test human approval flow
7. **Future (Non-MVP):** Event-driven seam once periodic validates; webhook adapter for sub-minute latency

### 2026-05-18T06:10:18.038+03:00: ADC means AgentDevCompute — corrected source-of-truth and demo constraints

**By:** Tamir Dresher directive, audited by Seven, Geordi, and Data

**What:** For all ADC/ASC work, treat ADC as **AgentDevCompute** and use the installed `agentdevcompute` skill plus `C:\Users\tamirdresher\tamresearch1` as source-of-truth context before design or implementation. "ASC" is not a separate product in the inspected history; use it as user shorthand for the same AgentDevCompute context unless Tamir says otherwise.

**Corrections to the 2026-05-17 execution-model decision:**

1. **Run Squad inside the sandbox.** GitHub Actions or any customer-owned scheduler may orchestrate, but the actual `squad schedule run <id>` command must be invoked through `adc-api.js` `execShell(...)` inside the AgentDevCompute sandbox. Resuming a sandbox and then running Squad on the CI host is invalid.
2. **Use only supported AgentDevCompute surfaces.** No invented ADC CLI, no raw REST/curl/fetch to ADC management endpoints, no traditional SSH. Use `assets/adc-api.js`, Portal, Azure CLI token flow, or explicitly documented customer surfaces.
3. **Current Squad CLI is narrower than the earlier design.** `squad schedule run --json`, `--repo`, and `squad schedule fire` are aspirational unless implemented in the Squad repo. Current manifests must use `task.ref`; event triggers use `trigger.event`, not `trigger.eventName`.
4. **Prefer AgentDevCompute Connections for sandbox-internal credentials.** GitHub/Copilot credentials for code running inside the sandbox should come from Portal Connections attached to the sandbox, not PAT/env-var injection, so secrets stay outside the VM boundary.
5. **Use disk-backed suspend for Squad workers.** Prior tamresearch experience showed memory suspend causes zombie connections, stale TLS certs, and PID/session confusion. Prefer disk-backed/API snapshot suspend behavior for periodic Squad workers.
6. **Prefer the `copilot` disk image or pre-baked images.** AgentDevCompute egress proxy / TLS inspection can break late startup installs in long-lived sandboxes. For Squad runs, start from `copilot` or a pre-baked image with required tools.

**Why:** The previous demo mixed valid periodic-ephemeral ideas with generic Azure assumptions and aspirational Squad CLI contracts. This correction preserves the customer-accessible AgentDevCompute runner pattern while removing unsupported/invented behavior.

### 2026-05-18T07:52:45.015+03:00: ADC Squad MVP uses Azure Functions and official C# SDK when available

**By:** Tamir Dresher directive, verified by Seven/Geordi/Data/Worf and direct repo inspection

**What:** For the AgentDevCompute Squad runner MVP, use an Azure Functions or similar Azure-hosted timer/orchestrator as the primary scheduler. GitHub Actions is not the primary MVP path; it may be documented later as an alternative/blog variant. Direct inspection of `C:\Users\tamirdresher\source\repos\adc` found official .NET SDK projects:

1. `client-sdk\csharp\csharp-sdk\src\Microsoft.Adc.Client\Microsoft.Adc.Client.csproj`
2. `client-sdk\csharp\csharp-arm-sdk\src\Microsoft.Adc.Arm.Client\Microsoft.Adc.Arm.Client.csproj`

The preferred C# cloud architecture is therefore:

1. Azure Functions TimerTrigger in .NET.
2. `Microsoft.Adc.Arm.Client` with `DefaultAzureCredential`/Managed Identity when sandbox group/ARM-scoped operation is needed.
3. `Microsoft.Adc.Client` where data-plane-only bearer/API-key operation is sufficient and supported.
4. `squad schedule run <schedule-id>` still executes inside the AgentDevCompute sandbox via the SDK's sandbox command execution API.

Keep `adc-api.js` only as the local-dev/sample fallback or if SDK auth/package availability is blocked in the target environment. Do not hand-roll raw REST when an official SDK is available.

**Why:** This aligns the demo with Tamir's C#/eShop style, removes GitHub Actions from the primary flow, and avoids the earlier unnecessary Node bridge assumption now that official ADC C# SDKs have been found in the ADC repo.

## Governance

- All meaningful changes require team consensus or an explicit owner/reviewer path.
- Document architectural and behavior-changing decisions here.
- Keep history focused on agent-specific learnings; keep decisions focused on shared direction.
- Preserve reviewer rejection lockout: rejected artifacts must be revised by a different eligible agent.
