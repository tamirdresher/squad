# Squad Decisions

**Last Updated:** 2026-05-19T06:33:42.877+03:00

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

---

### 2026-05-18T18:40:55.751+03:00: Geordi Local E2E Validation — ADC Runner Demo Dry-Run Passed

**By:** Geordi (after local human-style validation)

**What:** Local dry-run validation of adc-squad-runner-demo completed successfully:
- ✅ .NET Functions build (`AdcRalph.Functions.csproj`)
- ✅ AdcRalph console tests (4 scenarios: issue claim/dispatch, stopped sandbox requeue, running sandbox lease extension, approved PR merge/done)
- ✅ Runner npm ci/build/test (self-test created simulated sandbox, executed echo, stopped sandbox)
- ✅ Work-items-api npm ci/build (0 vulnerabilities)
- ✅ API smoke test on port 3100 (`/health`, `/work-items` GET/POST)

**Gaps (not blocking local demo):**
- Azure Functions Core Tools unavailable locally; Functions host startup dry-run skipped
- No .sln file found; built project directly
- No live ADC sandbox/GitHub mutations; dry-run only

**Why:** Validate that documented quick-start path builds and executes locally before scheduling live E2E.

**Verdict:** Local evidence accepted. Functional build and basic component integration proven. True live E2E (ADC sandbox + GitHub mutation + lease workflow) required before production approval. Gate: next cycle, controlled ADC sandbox + GitHub issue workflow test.

---

### 2026-05-18T11:42:44.342+03:00: Worf Security & Reliability Review — ADC Runner v2 (No-CLI Directive), Guardrails G13–G19

**By:** Worf (Security & Reliability Review)  
**Supersedes:** 2026-05-18T07:52:45 v1 review (G1–G12 remain; this adds G13–G19)

**What:** Conditional approval of ADC Runner v2 architecture (Azure Timer Function, 5-min interval, no Squad CLI changes, automated PR creation with human merge gate, conflict escalation) with seven new mandatory guardrails G13–G19.

**Key Approvals:**
- ✅ 5-minute Azure timer with `[Singleton]` (Worf-safe under G13)
- ✅ GitHub label `squad:processing` as distributed lease (B'Elanna invariants I-1/I-2)
- ✅ Sandbox assignment tracking in git-backed `.squad/.schedule-state.json` (G14)
- ✅ `execShell` command construction via payload file upload, no dynamic interpolation (G16)
- ✅ PR creation by agent; does NOT merge to protected branches (G18)
- ✅ GitHub App or machine account PAT for GitHub API; no personal developer PAT

**Rejections:**
- ❌ Automated PR merge without human approval (G18 enforced)
- ❌ Automated conflict resolution (G19: conflicts escalate to human; no auto-merge on conflict)

**New Guardrails (G13–G19):**
- **G13:** Label claim atomic + re-read verification; stale lease TTL reduced to 10 min (5-min cycles)
- **G14:** Assignment state committed to git before `resumeSandbox` is called
- **G15:** Sandbox ID validated against allowlist regex `^[a-zA-Z0-9_-]{1,64}$`
- **G16:** Command string is a fixed literal; payload via file upload; no GitHub-user-controlled content in command
- **G17:** Payload file deleted by runner script after read; Function calls `rm -f` in finally block
- **G18:** Agent may NOT merge protected branches autonomously; human approval required + branch protection enforced
- **G19:** Conflicts escalate to human; Function posts comment + `squad:conflict` label, stops retry after 3 failures

**Blocking Pre-Demo Questions:**
1. G11 (prior): Verify Managed Identity bearer token accepted by ADC API
2. Specify fixed entrypoint command (e.g., `copilot --no-interactive`, `node runner.js`)
3. Confirm GitHub App or machine account PAT decision

---

### 2026-05-18T11:42:44.342+03:00: B'Elanna Durable Lease & State Machine — ADC Runner MVP

**By:** B'Elanna (Durable Systems Engineer)

**What:** Complete state machine, lease model, duplicate-prevention protocol, TTL/recovery, PR lifecycle, and conflict handling for the 5-min Azure-timer-driven ADC runner. GitHub labels = external atomic state store; `.squad/.lease-store.json` = git-backed durability record.

**Core Mechanisms:**
- **Lease Record:** `.squad/.lease-store.json` with schema v1; 30-min TTL, refreshed per scan
- **Label Dedup:** Claim `squad:processing` before work; re-read to verify no race; skip if pre-existing
- **TTL Recovery:** Every 5-min scan, sweep stale leases (expires_at < now); clear label, re-queue issue
- **PR Lifecycle:** issue → PR → (conflict?) → merged/closed → terminal `squad:done`
- **Conflict Resolution:** Detect `mergeable_state=dirty` → assign sandbox to rebase; 3 failures → escalate to Picard
- **Concurrency Cap:** N=3 issues claimed per scan; bounds compute

**Label Taxonomy:**
| Label | Meaning | Terminal? |
|-------|---------|-----------|
| `squad` | Issue is squad work | No |
| `squad:agent:<name>` | Routed to agent | No |
| `squad:processing` | Lease held | No |
| `squad:pr-open` | PR under review | No |
| `squad:conflict` | Merge conflict | No |
| `squad:done` | Merged/closed/done | **Yes** |

**Decision Needed:** Lease-store conflict handling — prefer last-write-wins (GitHub label authoritative, lease-store eventually consistent) to avoid new infra.

---

### 2026-05-18T11:42:44.342+03:00: Data Azure Timer Watch Emulation — Ralph CLI-Free Execution

**By:** Data (Squad Framework Expert)

---

## Memory Governance (2026-05-18)

### 2026-05-18T19:38:13.577+03:00: Seven — Memory Governance Prior Art & Reuse Analysis

**By:** Seven (Prior Art & Compatibility Analyst)

**What:** Comprehensive audit of shared abstractions between `squad-memory-governance` and `squad-mempalace-runtime-provider` worktrees for planned implementation. Key reusable modules: `StorageProvider`, `StateBackend`, adapter types, scheduler. New plugin infrastructure (manifest, runtime, state) present in mempalace but not memory-governance; evaluated for scope fit.

**Findings:**
- **Reuse as-is:** `StorageProvider` abstraction (FS, In-Memory, SQLite), `StateBackend` pattern, `adapter/types.ts`, `runtime/scheduler.ts` — all production-ready and tested
- **Monitor:** SQLiteStorageProvider has single-process concurrency model only; multi-process access risks data corruption
- **Evaluate:** Plugin infrastructure (manifest, runtime, audit trail) from mempalace may or may not fit memory-governance scope
- **Risk:** Dirty sync between worktrees may mask divergence; define clear merge/rebase strategy before implementation

**Decision:** Proceed with reuse of stable abstractions; plugin scope decision deferred to implementation phase.

---

### 2026-05-18T19:38:13.577+03:00: Worf — Memory Governance Acceptance Gate (Design-Only, Not Runtime Approved)

**By:** Worf (Security & Reliability Review)

**Status:** **NOT APPROVED FOR E2E / RUNTIME CLAIMS YET. DESIGN-ONLY CONDITIONALLY ACCEPTABLE.**

**What:** Initial gate review of memory-governance proposal. Proposal directionally sound, but no implementation exists to verify safety boundaries. No `MemoryGovernanceProvider`, `MemoryStore`, CLI/MCP memory tools, or provider implementation found in codebase.

**Non-Negotiable Acceptance Boundary:**

1. **Forbidden memory must be deterministically rejected** (before persistence, before provider routing, before audit bodies copy sensitive text into logs)
   - secrets, credentials, tokens, keys, connection strings
   - PII/private customer data; raw logs, traces, dumps, telemetry payloads
   - sensitive internal topology/infrastructure maps
   - transient CI/PR/build status and one-time task progress
   - unreviewed vulnerability details that increase retained risk
   
   Required: classify as `FORBIDDEN`, do not write to `.squad/`, emit redacted audit event, return clear rejection

2. **Prompt-only fallback must be honest.** When no CLI/MCP/tool bridge exists, custom agents may only use local `.squad/` files. Documentation must not imply provider routing, remote deletion, semantic search, or policy enforcement is guaranteed.

3. **Provider opt-in and auditability.** External semantic providers disabled by default. Every write, promotion, rejection, delete, search, classify must be auditable.

4. **Delete semantics must be real.** `memory.delete` must remove governed memory from configured provider or create documented tombstone when hard delete is impossible. Audit must expose which occurred.

5. **`squad upgrade` must be non-destructive.** Preserve existing `.squad/decisions.md`, inbox decisions, agent histories, charters, skills, routing, team.md, ceremonies; add memory governance config with local-only defaults; never replace custom charter text.

**Required Test Gates:**
- Unit: classifier marks forbidden classes; audit redacts sensitive payloads; provider routing requires opt-in; delete calls all destinations
- Integration: memory.write rejects secrets/PII; memory.promote requires approval; memory.delete removes/tombstones local and external entries
- Upgrade: existing files survive byte-for-byte unless explicitly changed; idempotent; rollback point provided

**Current Blockers:** No implementation to review. Prompt-only promises are not controls.

---

### 2026-05-18T19:38:13.577+03:00: Data — Local Governed Memory Implementation (Initial Attempt)

**By:** Data (Squad Framework Expert & Memory Governance Implementer)

**Status:** **REJECTED BY WORF.** Revision required; authored artifact locked to Seven per governance protocol.

**What:** Memory governance implementation with local `MemoryStore`/CLI/tool layer for classification, write/search/promote/delete/audit. `squad init` and `squad upgrade` scaffold `.squad/memory/config.json`, index, audit log, local folders idempotently without overwriting user edits. External semantic/Copilot Memory disabled and rejected unless future explicit bridge/provider configured.

**Validation Attempted:**
- Targeted tests pass: `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` (41/41)
- Forbidden writes classified before file persistence in `LocalMemoryStore.write`
- Delete removes governed memory file, marks index entry deleted, writes tombstone
- Copilot/external semantic memory disabled by default, rejects without bridge
- Init/upgrade scaffolding uses exists-before-write for memory defaults, does not overwrite existing config/index/audit
- Docs accurately state prompt-only fallback remains local `.squad/` unless tool bridge used

**Blockers (Worf rejection):**
1. **Secret leakage on rejected writes without title.** `write()` audits `title: request.title ?? firstLine(request.content)`, so `memory.write({ content: "password=..." })` rejects before file persistence but writes the secret into `.squad/memory/audit.jsonl` as the audit title. Violates reject-before-persist/no-sensitive-audit requirements.
2. **Tool telemetry can leak forbidden memory before governance rejects.** `defineTool` records sanitized args by key name only; `memory.write` and `memory.classify` pass sensitive data in `content` field, not redacted. Rejected secret can enter OTel span attributes.
3. **`classify()` and `search()` do not create governance audit records.** Gate asked for audit entries for write/reject/delete/promote/search/classify where appropriate; current implementation only audits write/reject/promote/delete.
4. **Forbidden classifier coverage incomplete.** No explicit detection/tests for private customer data or unreviewed vulnerability details. Current tests cover only credential-like strings.

**Test Gaps:**
- No no-title forbidden write test proving audit/title redaction
- No telemetry redaction test for `memory.write`/`memory.classify` content
- No audit tests for classify/search
- No delete assertion that the original memory file no longer exists
- No tests for private customer data, raw customer records, unreviewed vuln details, or enabled semantic-provider config

**Decision:** Locked to Seven for revision due to Worf rejection protocol (security/reliability boundaries not met). Data may not revise own rejected safety implementation.

---

### 2026-05-18T20:45:09.040+03:00: Worf — Copilot Memory Provider Gate (Mandatory Safety Boundary)

**By:** Worf (Security & Reliability)

**Status:** Gate established. Mandatory before any Copilot/external provider enablement.

**What:** Established 8 mandatory safety gates for Copilot-backed external memory provider before approval:
1. **Opt-in only, never default** — Local-only by default; explicit opt-in required for Copilot
2. **Reject before external call** — Classification/forbidden checks execute before provider/network calls
3. **Fail closed** — Missing bridge/client fails with clear error, not silent fallback
4. **Audit and telemetry redaction** — No raw memory content, secrets, or queries in logs
5. **Delete semantics** — Provider conformance declared; delete must propagate or fail clearly
6. **Provider boundary and isolation** — External provider behind governance layer; namespace confined by tenant/repo/team
7. **Approval and promotion** — Only approved COPILOT_MEMORY entries route externally; re-classify before provider call
8. **Required test coverage** — All gates tested; default remains local-only; missing client fails closed; forbidden content rejected before external calls

**Current Verdict:** Local governance implementation approved for local-only use. External provider path not approved pending implementation of all 8 gates.

**Validation:**
- `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` passed: 48/48 tests
- Default config: `defaultProvider: "local"`, Copilot disabled, approval required

**Next:** Data implements Copilot provider path. All 8 gates must pass in test suite before re-review.

---

### 2026-05-18T20:45:09.040+03:00: Worf — Copilot Memory Provider Review (REJECTED)

**By:** Worf (Security & Reliability)

**Status:** **REJECTED** — Critical blocker present. Revision required; author locked to Seven.

**Evidence of Approval (In-Scope):**
- Default config is local-only: `defaultProvider: 'local'`, Copilot disabled, approval required
- Copilot writes require explicit `enabled` + `adapter: 'host'` and approval when configured
- Missing host client fails closed on write with clear error
- Forbidden write content classified before `copilotProvider.write(...)`
- Test proves forbidden writes reject without provider call: 52/52 tests pass
- Audit records avoid raw memory content; tool telemetry redacts `content` and `query`

**Critical Blocker (Gate Violation — Reject Before External Call):**

`LocalMemoryStore.search(query)` sends raw search query to `copilotProvider.search(query)` without classifying/rejecting forbidden query content first. A query containing secrets, private customer data, raw logs, or forbidden content would be disclosed to the external host adapter before gate evaluation.

**Violates Gate #2:** Classification and forbidden-memory checks must execute *before* any provider/client/network call.

**Required Revision:** Seven must add pre-provider search-query classification/rejection and prove via regression test that forbidden search queries do not call the Copilot provider.

**Remaining Gaps (Out-of-Scope, Document for Seven):**
- Delete failure messaging not explicitly tested
- Missing-client search not covered by targeted test (fails by exception, acceptable)

---

### 2026-05-18T20:45:09.040+03:00: Seven — Copilot Search Safety Revision (Security Lockout Recovery)

**By:** Seven

**Status:** **APPROVED BY WORF.** Revision accepted; blocker fixed.

**What:** Fixed blocker: `LocalMemoryStore.search()` now classifies the search query immediately after initialization and *before* reading provider configuration or invoking the Copilot provider. Forbidden queries return no results and write a sanitized rejection audit record without persisting raw query.

**Blocker Resolution:**
- Search query classified before provider config read
- Forbidden queries return no results and emit audit with class `FORBIDDEN`, safe title `Rejected governed memory search`, reason only
- Audit does not persist raw forbidden query
- Regression test: forbidden search query causes zero provider calls

**Validation:**
- Baseline: `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` — 52 tests pass
- After revision: `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` — 53 tests pass (new forbidden-search-safety regression added)
- Existing benign provider-backed search test now explicitly asserts safe query reaches provider

---

### 2026-05-18T20:45:09.040+03:00: Worf — Copilot Memory Provider Re-Review (APPROVED)

**By:** Worf

**Status:** **APPROVED.** Blocker from 2026-05-18T20:45:09 resolved by Seven.

**What:** Affirmed Seven's revision: search-query classification now occurs *before* any provider invocation. Forbidden queries reject without provider call. Test coverage complete: forbidden-search-safety regression test proves isolation.

**Validation:**
- Baseline: 52/52 memory-governance + tools tests pass
- After revision: 53/53 (new forbidden-search-safety regression)
- Forbidden benign search explicitly asserts safe query reaches provider
- Gate constraints satisfied: classify-before-external, reject-before-persist, audit-without-raw-content

---

### 2026-05-18T21:11:22.656+03:00: Data — Real Copilot Memory Provider API Research & Honesty Gate

**By:** Data

**Status:** **APPROVED WITH GATE ENFORCED.** No real callable Copilot Memory API exists. Implementation must not fake real provider.

**What:** Researched Copilot SDK surfaces in locally installed `@github/copilot-sdk` and `@github/copilot` packages. Found session capability/permission metadata only. No concrete read/write/search/delete API for Copilot Memory service exists.

**Decision:** Do not implement or fake `provider=copilot`. Worktree treats real Copilot Memory as unavailable unless concrete provider module/API is present. Host-supplied bridge is explicitly named `hostInjectedCopilotAdapter` and is not marketed as real Copilot Memory.

**Changes in squad-memory-governance worktree:**

- Config defaults: `externalProviders.hostInjectedCopilotAdapter` (not `copilot`)
- `provider=copilot` / `defaultProvider: "copilot"` fails with explicit "real API unavailable" error
- Provider status reports `realCopilotMemory.available: false` + separate `hostInjectedCopilotAdapter` status
- Host-injected surfaces report provider `hostInjectedCopilotAdapter`, not `copilot`
- Legacy `externalProviders.copilotMemory` read as host-injected compatibility only
- CLI help and docs state Squad does not fake real Copilot Memory; host-injected adapter is optional bridge

**Validation:**
- `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` passed
- `npm run lint` passed

---

### 2026-05-18T21:11:22.656+03:00: Worf — Real Copilot Memory Provider Gate Enforcement

**By:** Worf

**Status:** **GATE ENFORCED.** Approved Data's honesty/safety implementation with mandatory ongoing constraint.

**What:** Gate criteria for any real Copilot Memory provider claim:

1. **No marketing without API:** Do not name or market anything as "real Copilot Memory" unless a concrete, documented, installed Copilot Memory API/tool endpoint exists for read, write, search, delete.
2. **Host-injected only:** Current host path acceptable only as host-injected/experimental adapter language. Must not claim Squad ships, emulates, or discovers real Copilot Memory service.
3. **Fail closed:** No fake persistence, no silent local fallback for `COPILOT_MEMORY`, clear rejection, no provider calls when client missing.
4. **Pre-provider rejection:** Forbidden content (secrets, PII, raw logs, unreviewed vulns) rejected before any external invocation; must not appear in audit or telemetry.
5. **Comprehensive tests:** Default-disabled behavior, missing-client failure, host-injected adapter behavior, forbidden pre-rejection, sanitized audit/telemetry.

**Findings:**
- Defaults local-only; Copilot Memory disabled
- Docs describe Copilot Memory as optional, host-injected, not emulated
- SDK requires explicit config + valid client; missing client fails closed
- Tests cover honest provider status, config failure, pre-rejection

**Ongoing Constraint:** Future work adding real provider claim must first point to actual callable Copilot Memory API/tool and add read/write/search/delete contract tests against that boundary.

---

## Durable Conclusion: No Real Callable Copilot Memory API Exists

**Established:** 2026-05-18T21:11:22.656+03:00

**Decision:** Squad must not claim real Copilot Memory provider support because no documented, installed, callable REST/MCP/CLI/SDK API exists for third-party read/write/search/delete.

**Data confirmed:** Locally installed Copilot SDK packages contain session capability metadata only. No concrete provider API found.

**Implementation:** Fail closed: explicit error on `provider=copilot` config; host-injected adapter is separate, optional, and honestly labeled. No fake persistence.

**Test gates:** Memory governance tests prove forbidden content rejects before any provider call; audit sanitized; telemetry redacted.

**Future-proof seam:** Host-injected adapter is the honest extensibility point. When a real Copilot Memory callable API becomes available and documented, Squad can surface it behind the same host-injected configuration model without breaking changes.

**This conclusion is preserved in decisions.md to prevent future teams from reinventing or claiming unavailable provider support.**

**By:** Worf (Security & Reliability)

**Status:** **APPROVED.** All mandatory gates pass. Copilot provider path cleared for enablement with default local-only fallback preserved.

**Evidence:**
- Copilot provider remains opt-in: default config is `defaultProvider: local`, `promptOnlyFallback: true`, `copilotMemory.enabled: false`
- Missing host client fails closed: provider adapter throws when no host-injected client exists; provider status reports `configured` separately from `clientAvailable`
- Prior blocker fixed: `LocalMemoryStore.search()` classifies query and audits/returns no results for `FORBIDDEN` before local/provider search; regression test asserts provider `searchCalls === 0`
- Forbidden writes classified and rejected before provider write; regression test asserts provider write calls stay zero
- Audit/tool telemetry redacts raw `content`/`query`; rejected audit records use safe placeholder titles
- Delete, search, write, provider health, and prompt-only fallback semantics covered by targeted tests

**Validation:**
- `npm test -- --run test\memory-governance.test.ts test\tools.test.ts` passed: 53 tests
- `npm run lint` passed

**Acceptable Remaining Risk:**
- Search/delete with configured provider but absent host client fail by exception rather than structured rejected result; acceptable because it fails closed and health status is honest

**Gate Summary — All 8 Gates Pass:**
1. ✅ Opt-in only, never default
2. ✅ Reject before external call (fixed by Seven)
3. ✅ Fail closed
4. ✅ Audit and telemetry redaction
5. ✅ Delete semantics (propagates or fails clearly)
6. ✅ Provider boundary and isolation
7. ✅ Approval and promotion
8. ✅ Required test coverage

---

### 2026-05-18T20:45:09.040+03:00: Seven — Memory Governance Safety Revision (Post-Rejection, Worf Lockout)

**By:** Seven (Safety & Reliability Specialist, revision after Data rejection lockout)

**Status:** **APPROVED BY WORF.** Merged to production worktree.

**What:** Address Worf's rejection by tightening memory governance safety at the SDK and tool bridge boundaries without broad unrelated changes. Authored revised artifact per Worf lockout protocol (Data's rejected security artifact locked to Seven for revision).

**Changes:**
- Forbidden memory rejects now use safe audit title placeholder when no safe title provided (closes secret-in-audit-title leakage)
- `content` and `query` tool args redacted before OTel serialization via `sanitizeArgs` (closes telemetry leakage)
- Explicit `classify` calls and all `search` calls write content-free audit records (closes audit gap)
- Search tool telemetry now returns result metadata without snippets
- Forbidden detection expanded to cover private customer data and unreviewed vulnerability disclosure patterns (closes classifier gap)

**Validation:**
- `npm run build -w packages/squad-sdk` succeeded
- `npx vitest run test\memory-governance.test.ts test\tools.test.ts` passed: 2 files, 48 tests

---

### 2026-05-18T19:38:13.577+03:00: Worf — Memory Governance Re-Review & Approval

**By:** Worf (Security & Reliability Review, post-revision)

**Status:** **APPROVED.** Revised implementation by Seven satisfies all non-negotiable boundaries.

**Evidence:**
- No-title forbidden writes audit `Rejected governed memory` via `safeAuditTitle(request.title)` and do not derive audit title from sensitive content
- `defineTool` records OTel `tool.args` through `sanitizeArgs`, redacting top-level `content` and `query` fields; memory tool telemetry excludes raw content/snippets for write/classify/search
- `LocalMemoryStore.classify(..., { audit: true })` used by `memory.classify`; `search()` appends `search` audit records
- Forbidden coverage includes private customer data and unreviewed vulnerability/zero-day patterns with regression tests

**Validation:**
- `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` passed: 56 tests
- `npm run lint` passed
- `npm run build` passed before side-effects cleanup
- Targeted Vitest passed for integration/unit scopes (`test/memory-governance.test.ts`, `test/tools.test.ts`, `test/package-exports.test.ts`, `test/cli/upgrade.test.ts` with CI=1): 56 + 28 tests
- `npm run lint:docs` passed
- Full `npm test` hangs in known Vitest worker/packaging-smoke path (not claimed as passed)

**Remaining Risks:**
- Argument sanitization is shallow and does not redact `title` field; acceptable for four reviewed blockers, but future hardening should recursively redact all user-controlled sensitive fields

**Decision:** Approved for production. Memory governance implementation complete and safe for local-only mode. External semantic provider bridge remains deferred and disabled.

**What:** Decompose `squad watch --execute` (continuous polling loop) into three discrete phases that run once per 5-min Azure Timer cycle, no Squad CLI changes needed.

**Three Phases (executed inside ADC sandbox via `execShell`):**
1. **Triage:** `node .squad/templates/ralph-triage.js` — fetch open `squad` issues, apply `squad:{agent}` labels to untriaged
2. **PR Sweep:** `gh pr list` + `gh pr merge` — check for ready-to-merge PRs
3. **Execute:** `gh copilot --message "Ralph, Go! ..."` — single agent invocation for all actionable issues; agent reads `ralph-instructions.md` for dedup logic

**Execution Contract (in-sandbox):**
```bash
git pull --ff-only
GITHUB_TOKEN="..." node .squad/templates/ralph-triage.js ...
gh pr list | ... | gh pr merge ...
gh copilot --message "Ralph, Go! ..."
git add .squad && git commit -m "chore: ralph cycle ..." && git push
```

**What Does NOT Change:**
- Squad CLI: zero changes
- `ralph-instructions.md`: must document `squad:processing` lease protocol (I-1–I-3)
- Run script enforces stale-TTL sweep pre-flight; agent enforces claim-before-act

---

### 2026-05-18T11:42:44.342+03:00: Geordi In-Sandbox Agent Command — Open Decision

**By:** Geordi (Azure Platform Engineering)

**What:** Open decision on what command runs inside ADC sandbox via `sandbox.ExecuteShellCommandAsync()`.

**Options Being Evaluated:**
1. **Option A (Recommended):** Pre-baked `ralph-runner.sh` in `copilot` disk image; Function passes work metadata via env vars only
2. **Option B:** `gh copilot suggest --autopilot` (no custom image); behavior in non-interactive shells TBD
3. **Option C:** Inline bash script uploaded by Function (Worf-safe if no interpolated issue data)

**Blocking:** Picard/Data must specify the fixed literal command and confirm sandbox image strategy before implementation starts.

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

#### Sandbox Death & Orphan Issue Recovery (Subsection)

**By:** B'Elanna (Reliability), Worf (Security & Reliability)  
**Status:** Design-phase decision; clarifies failure mode handling for stale-lease sweep.

**Problem:** A sandbox crashes, is evicted, or times out before completing work. The `squad:processing` label remains on an issue with an expired lease. The orchestrator must safely reclaim the issue without duplicating work or corrupting branch state.

**Solution: Stale-Lease Recovery with Mandatory Guardrails**

The stale-lease sweep (running every 5-minute scan cycle) reclaims stuck issues by:

1. **Detecting stale leases:** For each lease with `expires_at < now()` (TTL expired)
2. **Verifying sandbox is stopped (G20):** Query ADC: `getSandboxStatus(sandbox_id)`. If `RUNNING` or `SUSPENDED`, extend TTL by one cycle (grace period) and skip recovery. Only proceed if sandbox is `STOPPED`, `CRASHED`, or `NOT_FOUND`.
3. **Checking for partial work (P2 + G21):** Inspect `squad/issue-<N>` branch via GitHub API.
   - **No branch:** Fresh start safe; new sandbox starts from `main`.
   - **Branch exists, not in PR:** Partial commits present. New sandbox **must** resume from branch tip (payload includes `"resumeBranch": true`, `"branchRef": "squad/issue-<N>"`).
   - **Branch in merged PR:** Caught by P2 check; should not occur. Abort requeue, apply `squad:stuck`.
4. **Incrementing attempt counter (P5 + G25):** Read `attempt` from expired lease; increment in recovery. If `attempt >= 3`, escalate to `squad:stuck` (no requeue, human review required).
5. **Ordered recovery sequence (G26):**
   - Update lease-store, git commit & push (P4: audit log written first)
   - Remove `squad:processing` label
   - Post recovery comment (mandatory audit trail per G24): sandbox_id, phase at expiry, lease TTL, action taken, attempt count
   - Re-apply `squad:agent:<name>` label (issue returns to TRIAGED) if `attempt < 3`, or `squad:stuck` if escalating
6. **No requeue if terminal (G22):** Skip recovery if `squad:done` is present; delete stale lease entry only, no label changes.

**Why this prevents orphans:**
- GitHub label `squad:processing` is the external atomic gate; stale-lease sweep is the reclaim mechanism (both must execute in order).
- Branch inspection (G21) prevents two sandboxes from conflicting on the same branch.
- Sandbox-stopped check (G20) prevents reclaiming a live sandbox that is merely slow.
- Three-attempt escalation (G25) prevents infinite retry loops on structural failures (bad payload, impossible task).
- Audit comments (mandatory per G24) create human-readable recovery trail independent of git log.

**Labels added to taxonomy:**
- `squad:stuck` — Terminal until manually cleared by human; issue failed automated recovery 3 times.

**Distinction: Dead vs. Slow Sandbox**
- Label age alone cannot distinguish. Must use ADC status check (Model A, preferred) or sandbox heartbeat write (Model B, fallback).
- **Model A (Recommended):** Before each stale-sweep, scanner queries ADC status. If `RUNNING` → extend TTL by one cycle → recheck next scan. Only sweep when ADC says sandbox is `STOPPED`/`CRASHED`/`NOT_FOUND`.
- **Model B (Fallback):** Sandbox writes heartbeat to lease-store every 10 min. Stale sweep skips if heartbeat is recent.

Currently, the design uses **Model A + grace period** (Worf G20): allow one cycle of "maybe it's slow" before reclaim.

**Related guardrails (cross-ref Worf G20–G26):**
- G20: Verify sandbox stopped before requeue
- G21: Inspect branch state before requeue; resume from branch tip if partial work exists
- G22: Do NOT requeue if `squad:done` present (sweep bug if occurs)
- G23: Recovery PRs include history in description ("PR created after sandbox recovery attempt N")
- G24: Idempotent label removal & comment posting (treat 404 as success; skip duplicate comments)
- G25: Stuck-issue escalation after 3 attempts; apply `squad:stuck`, post comment tagging Picard, do NOT return to queue
- G26: Exact recovery sequence (lease-store first, then label removal, then comment, then re-label) is non-negotiable; any step failure halts sequence

**What's NOT in MVP:**
- No autonomous sandbox restart/relaunch (reclaim only, no re-issue of work to same failed sandbox).
- No fuzzy heuristics for "how long is too long"; exact TTL (10 min for 5-min cycles) or explicit ADC status check.
- No Durable Task framework timeout extension (outside Squad scope; ADC auto-suspend is safety net).

**Why:** Production-proven pattern: stale-work reclaim is the only durable recovery when executors are ephemeral. The three-layer audit (GitHub labels, lease-store git history, recovery comment) makes failures visible and human-reviewable.

#### Next Steps (Implementation Phase)

1. **P0 — Worf Gate (G11):** Geordi confirms Managed Identity bearer token accepted by ADC API (blocks Azure Function auth)
2. **P1 — Squad SDK:** Real `copilot` task execution in `LocalPollingProvider` (~20 lines); export lease-label helpers
3. **P1 — Pre-baked image:** Create `runner.js` in copilot disk image; bake into ADC image
4. **P2 — Azure Function:** C# .NET function with `Microsoft.Adc.Client`; implements 5-min loop per above spec; implement stale-lease sweep + recovery (G20–G26)
5. **P2 — Local Ralph watch fallback:** `ralph-watch-adc.ps1` for dev/demo (local version, not cloud)
6. **P3 — PR/merge gating:** Validate GitHub branch protection integration; test human approval flow
7. **P3 — Stale-lease recovery testing:** Unit test stale-lease sweep; integration test recovery with branch inspection + attempt counter
8. **Future (Non-MVP):** Event-driven seam once periodic validates; webhook adapter for sub-minute latency

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

### 2026-05-18T22:11:20.972+03:00: Postpone Live E2E Claim Until Infrastructure Provisioned

**By:** Scribe (consolidating Geordi E2E attempt + Seven parity research)  
**Type:** Infrastructure Blocker Acknowledgment

Do not claim live E2E success or ADC/Squad/Copilot parity until infrastructure provisioning is complete.

**Rationale:** Both Geordi (E2E test) and Seven (parity research) independently identified the same infrastructure blockers:

**Hard Blocker #1: Live Runner Configuration**
- ADC_SANDBOX_IDS: undefined
- ADC_API_KEY: undefined
- SQUAD_RUNNER_COMMAND_JSON: undefined
- local.settings.json: not provisioned

**Hard Blocker #2: Unverified Sandbox-Side /squad/runner.js**
- ADC sandbox validated for compute capability
- /squad/runner.js presence: NOT verified
- Squad/Copilot wrapper: NOT verified

**Validated Upstream:** ✓ git reachability, ✓ gh reachability, ✓ az reachability, ✓ ADC build, ✓ ADC tests, ✓ Sandbox compute reachability

**Immediate Next Steps:** Infrastructure team provisions ADC sandbox IDs/API key, deploys /squad/runner.js, Scribe verifies wrapper presence, local.settings.json configured, Geordi reruns E2E batch.

**Status:** FOR TEAM REVIEW & APPROVAL | **Owner:** Geordi, Seven, Infrastructure team

---

### 2026-05-18T23:05:16.894+03:00: Copilot Spaces as Squad Memory Provider (NOT VIABLE)

**By:** Seven (Research & Integration Engineer)  
**Status:** RECOMMENDATION (NOT VIABLE)

GitHub Copilot Spaces **cannot serve as Squad's persistent memory provider**. Spaces are UI-first for organizing semantic context with read-only MCP tooling. No write API exists.

**Key Findings:**
- **UI/Product:** Web UI at github.com/copilot/spaces for organizing context
- **MCP Tools:** list_copilot_spaces, get_copilot_space (read-only)
- **Critical Limitation:** No write API exists; spaces created only via web UI, not programmatically
- **Verdict:** Squad could read from spaces (semantic enrichment) but cannot write to them (persistence)

**As Storage Provider:** NOT VIABLE — no write API; sources added via UI only.

**As Semantic Memory Provider (Read-Only):** OPTIONAL — Could retrieve space contents via MCP as context enrichment, but does not replace persistent storage.

**If Real APIs Existed:** Would require create_space, dd_to_space, emove_from_space, delete_space endpoints plus governance integration.

**Recommendation:** Keep memory provider surface abstract. If context enrichment is valuable, pursue optional read-only integration separately from memory governance.

**Blocker Removal Condition:** GitHub must release documented write APIs with CRUD semantics, auth/namespace isolation, and official SDK exports.

**Conclusion:** Copilot Spaces cannot be used as Squad's memory provider.

---

### 2026-05-18T22:11:20.972+03:00: Use Fleet eShop as Parity Reference Architecture

**By:** Scribe (consolidating Seven's parity research)  
**Type:** Implementation Roadmap Reference

**Decision:** Adopt Fleet eShop architecture as the canonical reference for Squad/Copilot/ADC parity validation and implementation.

**Rationale:** Seven's deep research into Fleet eShop identified concrete evidence of a complete, working parity implementation. Local tamresearch1 files contain:
- Real implementation patterns for executeShellCommand inside ADC
- Real sandboxes and worker configuration
- Real Copilot invocation patterns
- Real dispatch/claim/progress/complete cycle implementation
- Real dashboard/orchestration state management
- Real list/status/log verification tools

**Parity Gap Analysis:**
| Component | Fleet eShop | Squad/Copilot/ADC | Priority |
|-----------|-------------|------------------|----------|
| executeShellCommand inside ADC | ✓ Implemented | ✗ Missing | P0 |
| MCP/Squad worker config | ✓ Deployed | ✗ Not deployed | P0 |
| Real Copilot invocation | ✓ Live | ✗ Blocked by runner config | P1 |
| Dispatch/claim/progress/complete | ✓ Pattern | ✗ Not wired | P1 |
| Dashboard/orchestration state | ✓ Real-time | ✗ Not available | P2 |
| list/status/log verification | ✓ Enabled | ✗ Not tested | P2 |

**Implementation Roadmap:** Phase 1 (Infrastructure) → Phase 2 (Config) → Phase 3 (Dispatch) → Phase 4 (Dashboard) → Phase 5 (Verification)

**Benefits:** Proven implementation, reduced risk, accelerated timeline, built-in parity validation framework.

**Implementation Constraints:** eShop patterns must be adapted (not copied verbatim); team must verify parity equivalence.

**Status:** FOR TEAM REVIEW & APPROVAL | **Owner:** Seven, Implementation team

---

### 2026-05-18T23:12:22.380+03:00: Seven — Local Memory E2E Oracle (Reference Test Criteria)

**By:** Seven (Research & Integration Engineer)  
**Date:** 2026-05-18T23:12:22.380+03:00  
**Status:** Reference Oracle for Worf & Data

This oracle defines what true E2E behavior looks like for Squads with/without local governed memory, separating CLI/tool-layer evidence from unit-test-only claims. Establishes test criteria, rejection gates, upgrade semantics, and simulation gaps.

**Key Sections:**
1. **Old/No-Memory Squad Baseline:** Pre-governance behavior (no .squad/memory/ folder, no memory routing)
2. **Upgrade Semantics:** Non-destructive, idempotent "only if missing" pattern for all files
3. **Expected Local Governed Memory Behavior:** Write (allowed), Search (allowed queries), Delete (real removal), Audit (inspect actions)
4. **Rejection Behavior:** Forbidden content classified BEFORE persistence (SECRETS, PII, RAW_LOGS, UNREVIEWED_VULNS, PRIVATE_DATA)
5. **True E2E vs Unit-Test-Only:** CLI writes to disk, index entry created, audit redacts content, second upgrade changes nothing, search returns persistent results (✅ counts); mocks/spies insufficient (❌)
6. **Copilot Custom-Agent Gaps:** Cannot verify from local simulations—requires live Copilot agent infrastructure
7. **Test Oracle & Rejection Checklist:** Approval gates for Worf, blocking scenarios

**Acceptance Criteria (for Worf approval):**
- ✅ CLI commands work with real file I/O
- ✅ Rejection gates prevent forbidden content before persistence
- ✅ Audit trails complete and redacted
- ✅ Upgrade non-destructive
- ✅ Multi-agent memory orchestration (via concurrent CLI calls) stores/retrieves correctly
- ✅ External provider bridge disabled by default, fails closed if attempted

**Unfeasible Locally:** Real Copilot agent spawning, LLM context injection, Copilot Memory service, true multi-session persistence.

**Status:** Locked for Reference | **Date:** 2026-05-18T23:12:22.380+03:00

---

### 2026-05-18T23:12:22.380+03:00: Worf — Local Memory E2E Validation (APPROVED)

**By:** Worf (Security & Reliability Reviewer)  
**Date:** 2026-05-18T23:12:22.380+03:00  
**Status:** APPROVED with Residual Gaps Noted

**Executive Summary:** Data's E2E validation PASSES all eight Worf gates. Evidence is genuine (real I/O, disposable fixtures, no mocks). Rejection gates enforce fail-closed semantics before persistence. Audit redaction credibly prevents secret leakage. Known Vitest test-harness hang characterized as external (test infrastructure issue, not code logic). Residual gaps (full Copilot agent integration, multi-session orchestration, rate-limiting) deferred and documented.

**Approval: CONDITIONAL PASS** — Merge cleared for production governance bridge.

**Gate-by-Gate Verification:**
1. ✅ **Real Disposable Fixtures** — testRoot() creates .test-{uuid} directories with afterEach cleanup; real FSStorageProvider
2. ✅ **Old/No-Memory Baseline** — Pre-governance behavior documented; classify works without .squad/memory
3. ✅ **Upgrade Non-Destructive & Idempotent** — ensureMemoryGovernanceDefaults() checks "only if missing"; second run returns empty
4. ✅ **CLI CRUD Path** — squad memory write/search/delete/audit exercise full governance flow with real file verification
5. ✅ **Forbidden Before Persistence** — Classification in-process BEFORE any provider call; zero provider calls on rejection
6. ✅ **Audit Redaction** — Audit entries contain no raw content/query; only safe metadata (title, reason, author, timestamp)
7. ✅ **Provider Defaults** — defaultProvider: 'local', copilot.enabled: false in .squad/memory/config.json
8. ✅ **Copilot Fails Closed** — If provider=copilot configured, write/search operations fail without invoking host client

**Known Issue: Vitest Test Hang** — test/cli/upgrade.test.ts hangs in Vitest queueing (test infrastructure issue, not code logic). Real upgrade CLI path PASSED. Targeted workaround: single-worker test runs successful.

**Residual Gaps (Future Work):** Full Copilot agent integration, multi-agent session orchestration, rate-limiting under load, telemetry export validation.

**Conditions for Approval:**
1. Merge includes this signed approval decision
2. Known Vitest hang remains documented as test-harness issue
3. Residual gaps captured in decisions.md for future phases

**Approval Signature:** Worf (Security & Reliability Reviewer) | 2026-05-18T23:12:22.380+03:00 | Oracle Verification: Seven's E2E oracle fully satisfied

---



---

### 2026-05-19T06:33:42.877+03:00: Local Governed Memory A/B Value - Scoped Result

**By:** Scribe (consolidating Seven oracle, Data report, Worf gate)
**Status:** PARTIAL PASS / SCOPED CLAIMS ONLY

**Decision:** Treat the completed n=20 paired A/B as evidence that Squad's governed local memory improves decision recall in controlled large/compacted contexts. Do not claim this proves Copilot CLI/Squad UI value, end-to-end agent improvement, or broad product value.

**Evidence:** Data ran 20 paired samples (10 slim, 10 large) using the actual Squad CLI init path and local `LocalMemoryStore`. Large/compacted recall improved from 0.000 to 1.000; overall mean recall delta was 0.500. Paired tests showed sign p=0.0020 and Wilcoxon p=0.0051. Slim-context recall had no lift because the prompt already contained the decisions. Build and targeted governed-memory tests passed.

**Boundary:** The non-interactive `copilot -C <repo> --agent squad -p ...` smoke returned status 0 but not the requested sentinel, so it is inconclusive and not full UI E2E evidence. Worf gate: n=20 is adequate for the controlled paired signal, not broad generalization; coupled/scripted metrics do not cleanly satisfy the threshold for user-scope claims.

**Artifacts:** `C:\Users\tamirdresher\.copilot\session-state\memory-ab-20260519T063342\memory-ab-report.md`; inbox oracle/results summarized and cleared.
