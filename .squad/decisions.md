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

### 2026-05-14T11:29:53.602+05:30: ADC-Squad Event-Driven Execution Model

**By:** Data, Geordi, Seven, Coordinator, with B'Elanna + Nick Greenfield input

**What:** Adopt event-driven execution model for Squad on Azure Developer CLI / Azure Container Apps using `squad schedule fire` CLI entry point with ADC Redis stream adapter.

**Evidence:**
- ADC implements `SandboxEventPublisherService` (Redis streams + XADD/XREADGROUP) for sandbox lifecycle events
- Squad SDK already declares `EventTrigger` in scheduler.ts but isDue() returns false (externally fired)
- No native Squad webhook/Event Grid/Service Bus/Azure Functions trigger presently wired to sandbox lifecycle
- Proposed solution adds small core seam (`fireEventTrigger`/`squad schedule fire`) plus ADC-specific adapter

**Decision:**
1. **Squad core:** Add `fireEventTrigger(manifest, state, eventName, payload)` to scheduler.ts; add `squad schedule fire <eventName> [--payload <json>]` CLI command
   - Finds EventTrigger entries matching eventName, executes associated tasks
   - No ADC/Azure/Redis references in core; platform-neutral
   - ExternalSquadEvent interface: flat, source-agnostic envelope

2. **ADC adapter (separate):** Minimal Node.js script (~80 lines) subscribes to ADC's Redis stream (`GlobalConstants.SandboxEventStreamKey`), wraps `SandboxStoppedEventData` into ExternalSquadEvent, calls `squad schedule fire sandbox:stopped --payload '{"sandboxId": "..."}'`

3. **First prototype target:** Validate end-to-end Redis event → adapter → Squad coordinator invoked once, sandbox exits cleanly

**Rationale:**
- Aligns with platform design (event-triggered, ephemeral compute)
- Eliminates wasteful polling during idle periods  
- Small, reversible, validates full path without DTS/ACA prerequisites
- Defers complexity (DTS wrapping, Event Grid/Service Bus, Managed Identity) to later when pattern proven

**Next Actions:**
1. Implement `fireEventTrigger()` in Squad SDK
2. Implement `squad schedule fire` CLI command (~50 lines)
3. Write ADC adapter script (~80 lines)
4. Add schedule.json entry for sandbox-stopped-handler
5. Validate end-to-end

**Risks:** Auth/Managed Identity handling, state persistence alignment, event schema extensibility — addressed in integration layer, not core.

## Governance

- All meaningful changes require team consensus or an explicit owner/reviewer path.
- Document architectural and behavior-changing decisions here.
- Keep history focused on agent-specific learnings; keep decisions focused on shared direction.
- Preserve reviewer rejection lockout: rejected artifacts must be revised by a different eligible agent.
