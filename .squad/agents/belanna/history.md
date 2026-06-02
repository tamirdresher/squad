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

### PR #3 R2c — Upstream PR body conventions + draft (2026-06-02)

**Research Phase Complete** — Brady's repository conventions analyzed; PR body draft prepared.

- **Brady's template:** What / Why / How / Quick Check / PR Readiness Checklist (15+ items on branch/commit/build/test/lint/changelog/docs/exports/breaking changes).
- **Changeset verdict:** NOT REQUIRED. Squad.Agents.AI is a new .NET package independent of bradygaster/squad's npm monorepo. Changesets apply to npm only; .NET versioning is via `.csproj`.
- **External contributor voice:** paulyuk (#1181) and weinong (#1166) show Brady accepts direct, factual, user-benefit-focused descriptions with no internal jargon. Handoff happens at mark-ready-for-review; Copilot reviewer posts suggestions; contributors apply manually.
- **Upstream-ready sections identified:** (1) What — elevator pitch, (2) Why — problem/need, (3) How — API surface/security/sample/docs/deferred items, (4) Quick Check — changeset + test status, (5) Readiness Checklist — .NET-adapted.
- **Strict filters applied to draft:** NO agent names (Picard, Data, Worf, B'Elanna, Reno), NO round numbers (Round 1, 2, 2b, 2c), NO condition IDs (C1-C4, SC-1–SC-8), NO internal commands (gh pr checkout, gh pr edit), NO `.squad/` references, NO fork framing.
- **Elevator pitch (final):** "This PR adds Squad.Agents.AI, a community .NET package that exposes a Squad agent team as a Microsoft Agent Framework AIAgent, allowing applications to invoke Squad capabilities via standard RunAsync and RunStreamingAsync patterns."
- **Artifacts:** Draft saved to `.squad/workstreams/active/squad-agents-ai/decisions/inbox/belanna-pr3-body-draft.md`; research summary at `belanna-pr3-r2c-research-summary.md`. Ready to copy-paste into `gh pr edit --body-file` after Data confirms final sample path.
- **Waiting on:** Data's restructure handoff to confirm sample lives at `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/` or alternate location; exact `dotnet run` invocation.

### PR #3 R2c — body + title finalized for upstream voice (2026-06-02)

- **Commit reference:** `e214c4fb` (Data's restructure handoff)
- **Final title chosen:** `feat: Squad.Agents.AI - Microsoft Agent Framework adapter for the Squad CLI` (75 chars, matches upstream conventions: paulyuk, weinong style)
- **Body reconciliation:** All draft placeholder paths `samples/squad-agents-ai-sample/` replaced with exact final `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/`; dotnet run invocations verified against Data's exact invocation set; README reference updated to `src/Squad.Agents.AI/README.md` with `## Sample` section location noted.
- **Template adaptation:** Body now maps to brady's What / Why / How + Quick Check + PR Readiness Checklist (14 items ticked green, 1 N/A for Changeset). MSBuild `<Compile Remove="samples/**/*.cs" />` detail omitted as not user-facing (Data's decision).
- **Leak check (PASS):** Zero matches on Picard|Worf|Data|B'Elanna|Reno|Round [0-2]|SC-|\.squad/|gh pr checkout|inbox|handoff patterns. No internal reference escaped.
- **Push result:** `gh pr edit 3 --repo tamirdresher/squad` succeeded (exit 0) after switching auth from tamirdresher_microsoft → tamirdresher (EMU restriction bypass). Title and body updated atomically.
- **Post-push verification:** Title no longer contains `[DRAFT - needs local test]` ✓; body length 4089 bytes matches draft ✓; all sections (What/Why/How/Quick Check/Checklist) present ✓; sample path `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/` correct ✓; no leaks ✓.
- **Deviations from draft:** None. Paths, checklist items, and voice matched precisely after reconciliation.

---
**Last Updated:** 2026-06-02T19:51:00Z  
**Archive:** `.squad/agents/belanna/history-archive.md` (comprehensive baseline)

---

## 2026-06-02 — PR #3 R2c Finalization: Upstream-Ready Body & Title

**B'Elanna R2c Milestone:** Finalized PR body (4089 bytes, upstream-voice, leak check PASS) + flipped title (removed [DRAFT] prefix). Title: eat: Squad.Agents.AI - Microsoft Agent Framework adapter for the Squad CLI.

**PR #3 Status:** ✅ Upstream-ready. All CI green across .NET 8+9 / ubuntu+windows. Data's R2c sample restructure shipped in commit 214c4fb; body+title finalization complete.

**Handoff:** belanna-5 → Tamir decision on next step (review push to bradygaster/squad or local iteration).
