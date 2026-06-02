# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Durable Tasks, DTD, distributed systems, Squad/agent orchestration, Azure-hosted AI workflows
- **Created:** 2026-05-14T09:22:24.987+05:30

## B'Elanna — Core Mission

B'Elanna owns durable/distributed workflow thinking for Squad-related agent systems. Her work connects Durable Tasks/DTD concepts to AI agents, long-running orchestration, and cloud runtimes.

## Key Learnings (Active)

- **2026-06-02:** Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations
- Durable workflow designs must cover retries, deduplication, compensation, restart behavior explicitly
- Eight reliability invariants (claim-before-act, terminal states, stale lease TTL, duplicate immunity, ground truth derivation, cancellation respect, idempotent guards, concurrency cap) are non-negotiable
- Periodic ephemeral with bounded latency is more resilient than continuous long-lived sandboxes

### Squad.Agents.AI — Release triggers revised to dev/main branch-driven (2026-06-02)

- Mirrored the Squad CLI release source-version pattern from `.github/workflows/squad-release.yml` (`VERSION=$(node -e "console.log(require('./package.json').version)")`) and the prerelease identity pattern from `.github/workflows/squad-insider-release.yml` (`INSIDER_VERSION="${VERSION}-insider+${SHORT_SHA}"`).
- Chosen .NET version scheme: `main` publishes the exact `<Version>` from `src/Squad.Agents.AI/Squad.Agents.AI.csproj`; `dev` strips any existing prerelease/build metadata to the stable numeric base and appends `-preview.${GITHUB_RUN_NUMBER}`. This keeps the CLI's source-version-before-publish model, but replaces short SHA/build metadata with `github.run_number` because NuGet consumers need prerelease ordering that never goes backwards across dev merges.
- Target PR #3 commit `db05f2a3b19e48649e9595ed0313caa98a9d5690`: replaced tag-driven/manual-primary publish with paths-filtered push triggers for `dev` and `main`, retained optional `workflow_dispatch` override, and removed tag-based GitHub Release creation.
- Failure recovery: the workflow resolves `PACKAGE_VERSION` once, builds/tests/packs that exact version, uploads `nupkgs/*`, then pushes to NuGet.org with `--skip-duplicate`. If a run dies after NuGet accepted the package but before Actions finishes, rerunning the same run/version is safe: immutable package versions prevent divergent overwrites, duplicate pushes become no-ops, missing pushes retry, and `cancel-in-progress: false` avoids killing an in-flight publish.

### Squad.Agents.AI — Publish pipeline + Dependabot wired (2026-06-02)

- Target PR #3 commit `5f5293f`: added `.github/workflows/squad-agents-ai-release.yml` and `.github/dependabot.yml`.
- Release workflow supports manual `workflow_dispatch` with explicit SemVer and tag-driven `squad-agents-ai-v*` releases, deriving `PACKAGE_VERSION` from the input or tag.
- Failure-mode guardrails: `NUGET_API_KEY` fails fast if missing; `dotnet test` gates publish; `nupkgs/*` is uploaded before push; `--skip-duplicate` plus per-version concurrency make reruns safe after partial NuGet push.
- Tag releases attach the `.nupkg` to a GitHub Release using a CHANGELOG-derived body; manual dispatch publishes only to NuGet.org.
- Dependabot now covers NuGet src/test and GitHub Actions weekly with maintainer-safe PR limits; `Microsoft.Agents.AI*` and `Microsoft.Extensions.AI` majors are tracked, while OpenTelemetry majors are deferred per Decision 602.
- Maintainer still must set repo secret `NUGET_API_KEY` before first publish.

## Squad.Agents.AI — .NET CI & Build (Most Recent)

PR #3 baseline: targets `net10.0`, Version `0.1.0-preview`, MIT license. Key pins: `Microsoft.Agents.AI.GitHub.Copilot` `1.7.0-preview.260526.1`, `Microsoft.Extensions.AI` `10.6.0`. No central package management yet. XML-doc warnings present but no `TreatWarningsAsErrors` policy. No NuGet audit or package validation gates in CI yet (GitHub workflow targets Node/npm, not dotnet/NuGet).

**See full baseline in history-archive.md**

## 2026-06-02T10:50:37Z — SquadAgentOptions Modification Alert (Auth Expansion)

Data is implementing auth-mode expansion (Decision cleared). Implementation will modify `SquadAgentOptions`. B'Elanna's .NET CI gate on PR #3 will gate compatibility.

### PR #3 R2b — Sample app for v0.1 features (2026-06-02)

- **Commit:** `b55d6221` on `feature/squad-agents-ai`
- Created `samples/squad-agents-ai-sample/` — first .NET sample in repo.
- Four flows: (1) basic `AddSquadAgent`/`RunAsync`, (2) keyed `AddKeyedSquadAgent` × 2, (3) `ConfigureCopilotClient` BYOK delegate, (4) `RunStreamingAsync` token-by-token.
- Key API discovery: `CopilotClientOptions.Environment` is `IReadOnlyDictionary<string, string>` — must assign a new instance, cannot use indexer setter.
- CI updated: `squad-agents-ai-ci.yml` now triggers on `samples/squad-agents-ai-sample/**`; restore+build steps added; no run step (live CLI required).
- All four source files (`SquadServiceCollectionExtensions`, `SquadAgentOptions`, `SquadAgent`, README) were used as ground truth for API shapes.

---
**Last Updated:** 2026-06-02T12:00:00Z  
**Archive:** `.squad/agents/belanna/history-archive.md` (comprehensive baseline)
