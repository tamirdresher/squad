# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Durable Tasks, DTD, distributed systems, Squad/agent orchestration, Azure-hosted AI workflows
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

B'Elanna owns durable/distributed workflow thinking for Squad-related agent systems. Her work should connect Durable Tasks/DTD concepts to AI agents, long-running orchestration, and cloud runtimes.

## Learnings

2026-06-02: Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations (per user directive).

- Tamir wants this team to work on distributed systems that integrate AI and agents, not only local prompt orchestration.
- Durable workflow designs must cover retries, deduplication, compensation, and restart behavior explicitly.
- ADC execution model requires explicit failure-mode taxonomy. Eight reliability invariants (claim-before-act, terminal states, stale lease TTL, duplicate immunity, ground truth derivation, cancellation respect, idempotent guards, concurrency cap) are non-negotiable. GitHub labels + `.squad/.schedule-state.json` provide sufficient MVP durability for periodic ephemeral model.
- Long-lived continuous loop sandboxes are unsuitable for cloud platforms: unbounded cost, no crash recovery story, violates ADC's ephemeral-by-design philosophy. Periodic ephemeral with bounded latency is more resilient.

### Squad.Agents.AI — Build/CI/Packaging Inherited (2026-06-02)

Captured at 2026-06-02T12:04:38.931+03:00 from `C:\Users\tamirdresher\tamresearch1`, PR #3 in `tamirdresher/squad`, and local verification.

#### A. Build configuration baseline

- PR #3 head is `db7940a7` (`feature/squad-agents-ai`), with package source in `src/Squad.Agents.AI/Squad.Agents.AI.csproj` and tests in `test/Squad.Agents.AI.Tests/Squad.Agents.AI.Tests.csproj`.
- `Squad.Agents.AI` targets `net10.0`, sets `IsPackable=true`, `PackageId=Squad.Agents.AI`, `Version=0.1.0-preview`, MIT license, repository URL `https://github.com/bradygaster/squad`, README packing, XML docs, nullable, implicit usings, and `LangVersion=latest`.
- Central package management is off for PR #3: no `Directory.Build.props`, `Directory.Packages.props`, `global.json`, or `nuget.config` exists on the PR branch. Package versions are inline in each `.csproj`.
- Key PR #3 pins: `Microsoft.Agents.AI.GitHub.Copilot` `1.7.0-preview.260526.1`, `Microsoft.Extensions.AI` `10.6.0`, and `Microsoft.Extensions.Options` / `DependencyInjection.Abstractions` / `Hosting.Abstractions` / `Logging.Abstractions` `10.0.8`. Test pins: `Microsoft.NET.Test.Sdk` `17.12.0`, `xunit` `2.9.2`, `xunit.runner.visualstudio` `2.8.2`, and test-side `Microsoft.Extensions.*` `10.0.0`.
- Inherited Track B lesson from `tamirdresher/Aspire-1` commit `c671762c`: when using the OpenTelemetry stack, baseline `OpenTelemetryVersion` must be `1.15.1`; selectively pin `OpenTelemetry.Api`, `OpenTelemetry.Exporter.OpenTelemetryProtocol`, `OpenTelemetry.Extensions.Hosting`, and `OpenTelemetry.Exporter.InMemory` to `1.15.3`, plus `OpenTelemetry.Instrumentation.AspNetCore` to `1.15.2`. `OpenTelemetry.Instrumentation.Http` and `OpenTelemetry.Instrumentation.Runtime` stay at `1.15.1` because higher versions were not available.
- PR #3 has no explicit `NuGetAudit`, `NuGetAuditLevel`, `TreatWarningsAsErrors`, or `WarningsAsErrors` policy. Local verification with .NET SDK `10.0.204` found no vulnerable packages; `dotnet build` passed with 9 XML-doc/cref warnings, so turning warnings into errors would currently fail without cleanup.
- The working demo at `C:\Users\tamirdresher\source\repos\squad-agent-framework-demo` also uses inline package versions, no `Directory.Build.props`, no `Directory.Packages.props`, no `global.json`, and no `nuget.config`, but targets `net9.0` and older MAF/Copilot pins (`Microsoft.Agents.AI` `1.5.0`, `Microsoft.Agents.AI.GitHub.Copilot` `1.5.0-preview.260507.1`).

#### B. Five NuGetAuditSuppress entries inherited from Track B

- `GHSA-6c8g-7p36-r338` — `SharpCompress` via MongoDB driver transitives. Suppressed because it was third-party transitive debt outside our package API surface; remove when MongoDB updates the transitive or the MongoDB path is dropped.
- `GHSA-pggp-6c3x-2xmx` — `Snappier` via MongoDB driver transitives. Same suppression rationale; remove when MongoDB updates/drops the vulnerable transitive.
- `GHSA-37gx-xxp4-5rgx` — `System.Security.Cryptography.Xml` via PowerShell SDK. Suppressed because the PowerShell SDK owned the dependency chain; remove when the SDK carries a fixed XML crypto dependency or PowerShell support is removed.
- `GHSA-w3x6-4m5h-cxqf` — `System.Security.Cryptography.Xml` via PowerShell SDK. Same removal trigger as above.
- `GHSA-g94r-2vxg-569j` — `OpenTelemetry.Api` `1.12.0` via `KurrentDB.Client`. Direct OTel was fixed by higher pins, but KurrentDB still carried the older transitive; remove when KurrentDB moves to a fixed OTel API or the dependency is dropped.

#### C. CI workflow surface

- PR #3 itself changed only `.gitignore`, `pr-body.md`, `src/Squad.Agents.AI/**`, and `test/Squad.Agents.AI.Tests/**`. It did not add or modify workflows.
- GitHub PR status is green: checks `docs-quality` and `test` are `SUCCESS`, merge state is `CLEAN`, while the PR remains open/draft for local test sign-off.
- The active PR workflow is `.github/workflows/squad-ci.yml`: on `pull_request` and `push`, job `docs-quality` runs Node-based markdown/spell checks, and job `test` runs Node install, docs install, Playwright install, `npm run build`, and `npm test`.
- There is no PR-side `dotnet restore`, `dotnet build`, `dotnet test`, `dotnet pack`, NuGet audit, or package validation gate yet.
- `dotnet pack` appears only in `pr-body.md` local test instructions (`dotnet pack -c Release -o ../../artifacts`) and local verification; it is not invoked by CI or release automation.
- Existing release workflows are npm/GitHub-release oriented (`.github/workflows/squad-npm-publish.yml`, `squad-release.yml`, `squad-insider-publish.yml`, `squad-insider-release.yml`) and use `NPM_TOKEN` / `GITHUB_TOKEN`. No workflow uses `NUGET_API_KEY`, `dotnet nuget push`, or publishes `Squad.Agents.AI`.

#### D. Known failure modes and package-bump playbook

- Do not trust family-wide version bumps. OpenTelemetry core and instrumentation packages are not synchronized; the stale pin path was merge base `290ca0b8` carrying upstream commit `69a01b20` with `1.15.3`, while fixed upstream main had moved to `5e651f6f`. Verify exact package/version availability on nuget.org before changing any shared version property.
- Before calling a CI failure upstream noise, compare the PR merge base with current upstream main. Stale upstream pins can be our branch problem even when the failing line originated upstream.
- For NU1902/NU1903, run `dotnet list package --vulnerable --include-transitive`, inspect the full audit log, classify direct vs transitive ownership, and upgrade direct packages before suppressing anything.
- Suppress only named, third-party transitives that cannot be overridden safely; include the GHSA, transitive source, owner, and explicit removal trigger beside each `NuGetAuditSuppress`.
- Remember NuGet audit data and upstream CI policy can move at different times; re-check registry availability and advisory state during every bump.

#### E. Release readiness gaps for our squad

- Add .NET CI for `Squad.Agents.AI`: pinned SDK setup or `global.json`, restore, vulnerable-package audit, build, test, pack, and artifact upload.
- Decide versioning: the csproj hardcodes `0.1.0-preview`; releases need a deterministic SemVer/prerelease source from tags or workflow input, with no auto-increment during retry.
- Add a NuGet release workflow: `dotnet pack`, package checksum/artifact retention, `dotnet nuget push --skip-duplicate`, target selection (`nuget.org` vs GitHub Packages), and `NUGET_API_KEY` secret/environment approval.
- Add release notes/CHANGELOG policy for the NuGet package and decide whether docs-quality is enough for package README validation.
- Add package polish before stable publication: XML doc warnings cleanup if warnings become errors, SourceLink/symbol package, signing/provenance decision, package validation, and owner/metadata verification.

#### F. Reliability/idempotency angle

- If `pack` succeeds and `push` is interrupted, the package version may already exist because NuGet versions are immutable. Retries must use the same deterministic artifact and `--skip-duplicate`, then verify registry state rather than minting a new version.
- Release pipelines need a single publisher job with concurrency keyed by package ID + version. Matrix jobs may build/test, but only one job should push.
- Push should be release-only or environment-approved manual dispatch; PRs and forks must never receive NuGet secrets.
- Publish should be stateful and auditable: create the `.nupkg` once, retain it as a workflow artifact or GitHub Release asset, push that exact file, then verify the registry contains the intended version.
- For multi-registry publishing, treat each registry as an independent idempotent state transition: pending → pushed → verified, with retry safe per target and no implicit side effects across targets.

### Squad.Agents.AI — .NET CI gate added (2026-06-02)

- Added `.github/workflows/squad-agents-ai-ci.yml` to PR #3 via commit `12d803bf` on `feature/squad-agents-ai`.
- The workflow restores, builds, tests, packs, and uploads TestResults/nupkg artifacts on ubuntu-latest and windows-latest with .NET `10.0.x` and `NuGetAudit=true` restore posture.
- Local sanity validation used SDK `10.0.204`: YAML parsed with `ConvertFrom-Yaml`, `dotnet restore src/Squad.Agents.AI/Squad.Agents.AI.csproj` passed, and `dotnet build src/Squad.Agents.AI/Squad.Agents.AI.csproj -c Release` passed with the inherited 9 XML-doc warnings.
- Quirks: the target worktree had unrelated concurrent changes, so the commit was made in a clean sibling worktree; Git credentials initially selected the wrong GitHub account until `gh auth setup-git` restored the push identity; `gh pr checks` hit GraphQL rate limiting, but the unauthenticated Actions REST check showed `Squad.Agents.AI CI` in progress for `12d803bf`.

## 2026-05-17T09:05:10.003+05:30 — ADC Squad Runner Demo Reliability Invariants Finalized

**Eight Invariants Documented and Approved:**
1. **Claim before act** — Apply `squad:processing` label before work; verify label applied before proceeding
2. **Terminal state is permanent** — `squad:done` label written before sandbox exit; stale-lease sweep re-queues if never set
3. **Stale lease TTL enforced** — Every scan checks for `squad:processing` > 30 min old; unconditionally clear and re-queue
4. **Duplicate events have no effect** — Model B (periodic) ignores event delivery; re-derives ground truth from GitHub per scan
5. **Ground truth from GitHub only** — No in-memory/in-sandbox state trusted across invocations; fresh API query on startup
6. **Cancellation respected** — Before posting writes, re-check issue still open and labeled; exit cleanly if cancelled
7. **Idempotent guards on writes** — Before comment/PR/label, pre-read to detect if already applied; no duplicate writes
8. **Concurrency cap per scan** — Claim max N issues per cycle to bound compute and prevent backlog floods

**State Persistence:** GitHub labels + `.squad/.schedule-state.json` provide sufficient MVP durability for periodic ephemeral model (sandbox suspend/resume cycles).

**Deferred Concerns:** Multi-step orchestration (Plan → Implement → Review → PR) and Durable Functions coordination deferred until workflow complexity exceeds single-stage triage processing.

## 2026-05-18T12:08:34.040+03:00 — Sandbox Failure Mode Analysis & Orphan Prevention Proof

**Deep-Dive Analysis:** Authored comprehensive failure-mode trace addressing "Does a crashing sandbox create orphan issues?"

**Answer:** No orphans, provided TTL + stale-lease sweep + PR existence check are wired correctly. Maximum stuck time = 35 minutes (TTL + 1 scan interval). Three-layer prevention: GitHub label (external atomic gate), lease-store (durable record), PR detection (partial work preservation).

**Key Learnings:**
- **Label age alone is insufficient for correctness.** A 35-minute `squad:processing` label could be dead sandbox (should reclaim) or slow sandbox (should NOT interrupt). Must distinguish using either:
  - **Model A (Recommended):** ADC status check — query `getSandboxStatus(id)`. If `RUNNING` → extend TTL → recheck. Only sweep when `STOPPED`/`CRASHED`/`NOT_FOUND`.
  - **Model B (Fallback):** Sandbox heartbeat write — sandbox writes `expires_at = now() + TTL` every 10 min. Stale sweep skips if heartbeat is recent.
- **Partial work must be detected and preserved.** Branch inspection on recovery detects commits on `squad/issue-<N>`. New sandbox **resumes from branch tip** (not fresh from main) if partial work exists. Prevents restarting and losing prior progress.
- **Attempt counter is the circuit breaker.** Three consecutive failures indicate structural issue (bad payload, impossible task), not transient crash. Escalate to human review after 3 attempts.

**Confirmation:**
- Model A preferred (no agent-side instrumentation needed; dead sandbox simply stops writing extensions).
- TTL provides hard upper bound on stuck time; heartbeat/status mechanism determines when to reclaim *within* that bound.
- Stale-lease sweep is the durable recovery mechanism; must run before claiming fresh work to prevent race.

**Next Implementation:**
- Implement TTL extension logic in Azure Function P2 (requires Geordi confirmation of ADC status API availability).
- Code recovery path with branch inspection + attempt counter (P2 Azure Function, P3 integration test).
- Write integration test validating recovery with partial commits + attempt escalation (P3).



---

2026-05-31: Coordinated gate blocker fix with Geordi (ESM patch, coordinator template). All blockers resolved; forward for Picard approval.

## 2026-06-02T09:10:57Z — Bug C & Bug F Gap Fixes in PR #1200 (state-backend upgrade path)

**Task:** Fill gaps left by PR #1200 ("harden state backend upgrade path") for two confirmed bugs:
- **Bug C (P1):** `console.warn()` fired on every `normalizeBackendType()` call instead of once per process.
- **Bug F (P3):** `toRelative()` silently returned absolute paths for out-of-squad files, corrupting the git-notes key namespace.

**Approach:**
- Appended two commits to branch `squad/state-backend-upgrade-fixes` in existing worktree, preserving PR #1200 history.
- Commit 1 (Bug C, `dc2b3f50`): Added `_warnedGitNotesMigration` module-level flag with one-shot guard; exported `_resetGitNotesMigrationWarnForTesting()` for test isolation; test asserts warn fires exactly once across 3 calls.
- Commit 2 (Bug F, `fc406355`): Changed `toRelative()` fallback to throw `[squad] toRelative: path is outside squadDir` for absolute paths outside `squadDir`; relative paths still normalise backslashes. Two new tests (cross-platform backslash normalisation + platform-branching outside-squadDir throw).

**Results:** 92/92 tests passing. Branch pushed to `bradygaster/squad`.

**Key Learnings:**
- One-shot warn guard pattern: module-level `let _warned = false` + `if (!_warned) { _warned = true; console.warn(...); }` — standard Node.js singleton side-effect approach. Test isolation requires exported reset function; avoids `vi.resetModules()` complexity.
- `path.isAbsolute()` returns `false` for Windows-style `C:\...` paths on POSIX hosts — Bug F tests must branch on `process.platform` for the "outside squadDir absolute" case. Cross-platform safe subset (backslash normalisation in relative paths) can be tested everywhere.
- `git add -p` in a Windows PowerShell async shell requires explicit `{enter}` after each character input; bare `y` is not confirmed until Enter is sent.
- Worktree-based fix approach (appending to existing PR branch) is cleaner than opening a new PR when filling gaps in a WIP branch — keeps the changeset review coherent.

---

### [2026-06-02 Session] Cross-Reference: Squad.Agents.AI Onboarding Fan-Out

**Session Log:** `.squad/log/2026-06-02T09-04-38Z-squad-agents-ai-onboarding.md`  
**Decision Entry:** `.squad/decisions.md` section "2026-06-02 — Squad.Agents.AI NuGet Onboarding: 5-Agent Fan-Out"  
**Coordinating Agents:** Data (technical baseline), Worf (security), Picard (strategy), Seven (provenance), B'Elanna (this agent).

This session synthesized five coordinated reports into a single onboarding decision batch. B'Elanna's build/CI baseline and release pipeline requirements aligned with Data's technical findings and Worf's security gate clearance. Key consensus: v0.1 ready to merge and publish; v0.2 blocked on NuGet CI gate and publish workflow implementation (B'Elanna critical path).

