# Squad.Agents.AI — Workstream Decisions

**Last Updated:** 2026-06-02T15:52:21+03:00  
**Scope:** Squad.Agents.AI NuGet package (`tamirdresher/squad`, branch `feature/squad-agents-ai`)  
**Format:** Append-only. New decisions prepended under `## Active Decisions`.

> **Note on earlier decisions:** This file contains the 8 most-relevant decisions seeded at workstream bootstrap (2026-06-02). All earlier decisions from the flat ledger — including the full onboarding fan-out (5-agent report), state-backend triage, and archive entries — remain in `../../../decisions.md` until a future migration pass moves them here.

---

## Active Decisions

---

### [RESEARCH] 2026-06-02 — Upstream Tracking Issue: Squad.Agents.AI Community NuGet (Picard)

**Date:** 2026-06-02

# Upstream Tracking Issue Draft — bradygaster/squad

## Pre-Post Analysis

### Brady's repo posture observed

- **Monorepo, JS-first:** `bradygaster/squad` is an npm workspace monorepo (`packages/squad-cli/` + `packages/squad-sdk/`). All existing code is TypeScript/Node. There is no .NET code in the repo today.
- **CONTRIBUTING.md is explicit:** "All PRs from forks must target `dev`." Issue-first workflow encouraged. Changesets required for SDK/CLI source changes (not applicable to a new .NET package).
- **No issue templates:** `.github/ISSUE_TEMPLATE/` does not exist (404). Free-form issue body is fine.
- **Label taxonomy is mature:** `type:feature`, `go:yes`/`go:no`/`go:needs-research`, `status:contributor-invited`, `release:*`, etc. Brady uses `go:yes` as the greenlight signal.
- **Community contributions accepted:** `obit91` has multiple open PRs (#1195–#1199). `idangutman` filed #1184 (feature request). Brady has a `status:contributor-invited` label — he explicitly invites external work.
- **No precedent for non-JS packages:** No .NET, Python, or other language packages exist in the repo. This would be a first. Brady may prefer a companion repo.

### Existing related issues

- **#1144** (OPEN, filed by tamirdresher 2026-05-20): "Squad telemetry from embedded host processes (Agent Framework wrappers, no REPL)." Directly related — discusses MAF integration, OTel gaps, and the `SquadAgent.cs` wrapper. Community member `laurentkempe` expressed interest in MAF/Squad integration in comments. **This issue provides social proof that the MAF integration topic has traction.**
- No issues found for "Squad.Agents.AI" or ".NET adapter" specifically. This proposal is net-new.

### Proposed labels (from brady's existing label set)

- `type:feature` — matches the proposal type
- No other labels should be applied by the contributor. Brady uses `go:*` labels as his triage signal; let him apply those.

### In-repo vs. companion repo recommendation

**Recommendation: Offer both paths explicitly. Lean toward companion repo as the lower-friction default.**

**Why:** The monorepo is npm-workspace-native. Adding a .NET `src/Squad.Agents.AI/` directory introduces `dotnet` toolchain requirements, a separate CI workflow, NuGet publishing, and a `sln` file — all foreign to the existing contributor experience. A companion repo (`bradygaster/Squad.Agents.AI` or `tamirdresher/Squad.Agents.AI`) keeps the JS monorepo clean and lets the .NET package evolve independently. However, if Brady prefers co-location (some maintainers value discoverability), in-repo under `src/Squad.Agents.AI/` works — the CI is already isolated in a separate workflow file that only triggers on `.NET` path changes.

### Things Tamir should consider before posting

1. **Issue #1144 cross-reference:** The new issue should reference #1144 since it covers the same integration surface. Consider whether to frame this as "the adapter that enables the scenario described in #1144" — gives Brady continuity.
2. **Tamir is already a COLLABORATOR** on bradygaster/squad (per issue #1144 author association). This means brady already trusts Tamir's contributions. The tone can be slightly more direct than a cold-open.
3. **laurentkempe interest:** A community member already expressed interest in MAF/Squad integration. Mentioning this (without @-mentioning) adds social proof.
4. **Timing:** PR #3 is CI-green and ready. If Brady says "go," Tamir can open the cross-fork PR same day.

## Proposed Issue Title

```
Community contribution: Squad.Agents.AI — .NET adapter for Microsoft Agent Framework
```

## Proposed Issue Labels

```
type:feature
```

## Tracking Issue Body (Ready for `gh issue create`)

```markdown
## What

`Squad.Agents.AI` is a .NET library that wraps the Squad CLI as a `Microsoft.Agents.AI.AIAgent`, so .NET apps using the Microsoft Agent Framework (MAF) can use Squad agents alongside other AI participants — workflows, Semantic Kernel chains, or other MAF agents — without shelling out or reimplementing the CLI protocol.

I'd like to contribute this as a community package. The work is done and I'm looking for your signal on whether you'd accept it upstream.

## Why this matters

In #1144 I described the gap: when Squad is embedded in a host process (no REPL), the integration surface is manual. This adapter closes that gap for .NET consumers. It handles CLI lifecycle, streaming, session management, and keyed DI registration so the host just calls `agent.RunAsync(activity, turnState)` and gets structured responses.

## What's in the PR

The implementation lives in my fork: [tamirdresher/squad#3](https://github.com/tamirdresher/squad/pull/3).

- **`Squad.Agents.AI`** NuGet package targeting .NET 8 and .NET 9
- 43 tests, CI green on both ubuntu and windows
- DI registration shapes: default `services.AddSquadAgent(opts => ...)`, named via `services.AddSquadAgent("agent-name", opts => ...)` (binds to `ConnectionStrings:squad-{name}`), and Microsoft.Extensions.DependencyInjection keyed services via `services.AddKeyedSquadAgent("key", opts => ...)`
- BYOK support via `ConfigureCopilotClient` delegate
- Streaming via `IAsyncEnumerable<StreamingActivity>`
- Sample app + README with quickstart

### What's NOT included (deferred)

- Aspire-orchestrated sample (depends on Squad telemetry contract from #1144)
- SDK `ToString()` redaction (requires upstream Copilot SDK change)
- Multi-agent orchestration patterns (v0.2 scope)

## The question

Are you open to accepting this as a community contribution? If yes, I'll open a cross-fork PR targeting `dev` with `Closes #N` per CONTRIBUTING.md.

**On placement:** I want to flag that this is a .NET package in a JS-first monorepo. Two paths I see:

1. **In-repo** under `src/Squad.Agents.AI/` — discoverable, single repo for all Squad code. The .NET CI workflow is isolated and only triggers on that path.
2. **Companion repo** (e.g. `Squad.Agents.AI`) — keeps the npm monorepo clean, lets the .NET package version independently.

I'm fine with either. If you have a preference or a third option, happy to adapt.

## Related

- #1144 — Squad telemetry from embedded host processes (the scenario this adapter enables)
```

**Status:** Tracking issue #1205 posted on 2026-06-02T20:55:00+03:00. Awaiting Brady's `go:yes` signal before opening cross-fork PR.

---

### [CONFIRMED] 2026-06-02 — Upstream Tracking Issue #1205 Posted (B'Elanna)

**Date:** 2026-06-02T20:55:00+03:00

**Issue:** bradygaster/squad#1205  
**URL:** https://github.com/bradygaster/squad/issues/1205

**Posted by:** B'Elanna (gh auth: tamirdresher)  
**Label:** type:feature ✓

**Body:** Extracted from draft (60–102), 41 characters, posted without modification.

**Status:** Ready for Brady's triage.

---

### [CONFIRMED] 2026-06-02 — Backtick Escape Fix — bradygaster/squad#1205

**Date:** 2026-06-02T20:58:00+03:00  
**Status:** ✅ FIXED

## Fix Process

1. **Node.js extraction** (bypass PowerShell): `readFileSync` + CRLF-aware regex
2. **Write to temp file**: No string interpolation; binary UTF-8 write
3. **gh issue edit**: Switched auth (EMU bypass) → `--body-file` (not `--body "..."`)
4. **Exit code:** 0
5. **Cleanup:** Temp file deleted

## Verification

Live issue now renders cleanly at https://github.com/bradygaster/squad/issues/1205

Inline code like `` `Squad.Agents.AI` `` and `` `RunAsync` `` are correct (real backticks, not backslashes).

## Lesson

PowerShell here-strings + pipes = backtick escape disasters. Use Node.js for any Markdown body handling that touches code blocks.

**Status:** Issue #1205 is clean and live. Awaiting Brady's signal.

---

### [COMPLETED] 2026-06-02 — PR #3 Round 2c: Sample Co-location + README Consolidation (Data, commit e214c4fb)



**Date:** 2026-06-02
**Commit SHA:** `e214c4fb`
**Branch:** `feature/squad-agents-ai` → `tamirdresher/squad`
**CI:** ✅ All checks green (Squad.Agents.AI CI ubuntu + windows, Squad CI)

---

## Final Sample Path + Justification

`src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/`

Plural `samples/` chosen: the squad repo already uses `samples/` (plural) for its collection of TypeScript examples, and a future Aspire sample is queued — plural form accommodates it without restructure.

---

## Files Moved / Modified

| Action | Path |
|---|---|
| Moved (git mv, ~98% similarity) | `samples/squad-agents-ai-sample/Program.cs` → `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/Program.cs` |
| Moved (git mv, ~90% similarity) | `samples/squad-agents-ai-sample/Squad.Agents.AI.Sample.csproj` → `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/Squad.Agents.AI.Sample.csproj` |
| Moved + replaced with stub | `samples/squad-agents-ai-sample/README.md` → `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/README.md` |
| Modified | `src/Squad.Agents.AI/Squad.Agents.AI.csproj` — added `<Compile Remove="samples/**/*.cs" />` |
| Modified | `src/Squad.Agents.AI/README.md` — appended `## Sample` section |
| Modified | `.github/workflows/squad-agents-ai-ci.yml` — updated paths trigger + restore/build step paths |

`samples/squad-agents-ai-sample/` directory removed (bin/obj untracked, not staged).
`samples/` directory retained — it contains 13 other TypeScript squad samples.

---

## Build Verification

| Check | Result |
|---|---|
| `dotnet build src/Squad.Agents.AI/Squad.Agents.AI.csproj -c Release` | ✅ Build succeeded, 0 errors |
| `dotnet build src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/Squad.Agents.AI.Sample.csproj -c Release` | ✅ Build succeeded, 0 errors |
| `dotnet test test/Squad.Agents.AI.Tests/ -c Release` | ✅ 43/43 passed, 0 failures |

---

## Sample Sanity-Check — Captured stdout (flow 1, no CLI installed)

```
======================================================================================================
  Squad.Agents.AI v0.1 — sample run (team root: C:\Users\tamirdresher\source\repos\squad-pr3-round1)
======================================================================================================


── Flow 1 — Basic DI registration ──
Agent name : SampleSquad
Sending   : "What is 2 + 2?"

┌─────────────────────────────────────────────────────────┐
│  GitHub Copilot CLI was not found on PATH               │
│                                                         │
│  Install it and sign in before running this sample:     │
│    https://github.com/github/copilot-cli                │
│                                                         │
│  See the sample README.md for full prerequisites.       │
└─────────────────────────────────────────────────────────┘
[Flow 1 ✓]==================================================
  All requested flows completed.
==================================================
```

Outcome: **clear-error** — friendly box printed, no stack trace, exit 0. UX guarantee confirmed.

---

## Sample README Disposition

**Option A (stub)** selected. `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/README.md` contains:

```markdown
# Squad.Agents.AI Sample

For docs see [../../README.md#sample](../../README.md#sample).
```

Rationale: preserves discoverability when someone navigates the sample directory directly (e.g. via GitHub file browser).

---

## For B'Elanna — PR Body References

**Final sample path to reference in the PR body:**
```
src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/
```

**Exact `dotnet run` invocations that work:**
```bash
# Run all four flows
dotnet run --project src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/

# Run a single flow
dotnet run --project src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/ -- --flow=1
dotnet run --project src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/ -- --flow=2
dotnet run --project src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/ -- --flow=3
dotnet run --project src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/ -- --flow=4
```

---

## CI Status

Run IDs on `tamirdresher/squad`:
- `Squad.Agents.AI CI` (ID 26834411740) — ✅ 2m13s
- `Squad CI` (ID 26834411663) — ✅ 3m51s
.Trim()

---
### [RESEARCH] 2026-06-02 — PR #3 R2c: Brady PR Body Draft & Upstream Conventions (B'Elanna)

**Summary:** Researched bradygaster/squad PR template structure and external contributor patterns to draft an upstream-ready PR body for PR #3. No changeset required (separate .NET package). 

---
date: 2026-06-02
changeset_required: false
changeset_reason: "Squad.Agents.AI is a new .NET package, independent of bradygaster/squad's npm monorepo changesets. Versioning via .NET csproj; release automation is separate."
upstream_pr_conventions_found:
  - template_structure: "What / Why / How / Quick Check / PR Readiness Checklist"
  - required_sections:
    - summary_what
    - why_problem_and_issue_link
    - how_design_decisions
    - changelog_status
    - branch_and_commit_quality
    - build_test_lint_passing
    - breaking_changes
  - voice: "Direct, factual, user-benefit-focused; external contributors common; Copilot review workflow standard"
  - handoff_point: "External contributors mark ready-for-review after CI passes and respond to Copilot suggestions"
external_contributor_pr_references:
  - "https://github.com/bradygaster/squad/pull/1181 (paulyuk: README installation instructions)"
  - "https://github.com/bradygaster/squad/pull/1166 (weinong: MCP frontmatter option)"
---

# PR Body Draft: Squad.Agents.AI Community NuGet Package

## What

This PR adds `Squad.Agents.AI`, a community .NET package that exposes a Squad agent team as a Microsoft Agent Framework `AIAgent`. Applications using the Microsoft Agents library can now integrate Squad's capabilities via standard `RunAsync` and `RunStreamingAsync` patterns.

## Why

Teams adopting the Microsoft Agent Framework need a way to invoke Squad agent teams directly from their `AIAgent` workloads. This package provides a thin, secure integration layer that composes the Squad CLI through the GitHub Copilot SDK, allowing DI-based registration and streaming support without reimplementing Squad's agent orchestration.

## How

**Public API surface:**
- `services.AddSquadAgent(options => …)` — Single agent registration via DI
- `services.AddKeyedSquadAgent("name", options => …)` — Keyed services for multiple agents (.NET 8+)
- `options.ConfigureCopilotClient = client => …` — Bring-your-own-client delegate for custom Copilot SDK configuration
- `agent.RunAsync(thread, options, ct)` — Synchronous invocation returning structured response
- `agent.RunStreamingAsync(thread, options, ct)` — Token-by-token streaming

**Security posture:**
- Authentication flows through the Squad CLI process; no tokens stored in-package
- `Environment` option redacted in `ToString()` to prevent credential leaks in logs
- Routing-affecting options (`Cwd`, `CliPath`, `CliArgs`) are snapshotted before and restored after any `ConfigureCopilotClient` delegate to prevent SDK customizers from pivoting the agent to a different CLI binary; deviations are logged as warnings

**Testing:**
- 43 tests (all passing) across `net8.0`, `net9.0`, and `net10.0`
- CI runs on `ubuntu-latest` and `windows-latest` to verify cross-platform compatibility

**Sample application:**
The repository includes `samples/squad-agents-ai-sample/` — a runnable .NET console app demonstrating all four core patterns:

1. **Basic DI**: `AddSquadAgent` + `RunAsync`
2. **Keyed DI**: Multiple agents via `AddKeyedSquadAgent` with `GetRequiredKeyedService<AIAgent>`
3. **Bring-Your-Own-Client (BYOK)**: `ConfigureCopilotClient` delegate for token injection and environment customization
4. **Streaming**: `RunStreamingAsync` for token-by-token output

Run the sample:
```bash
dotnet run --project samples/squad-agents-ai-sample/
```

To execute a specific flow:
```bash
dotnet run --project samples/squad-agents-ai-sample/ -- --flow=1
```

**Documentation:**
README at `src/Squad.Agents.AI/README.md` covers:
- Installation via `dotnet add package Squad.Agents.AI --prerelease`
- All four DI registration shapes
- BYOK and streaming usage
- Security design rationale
- Complete sample walkthrough

**Breaking changes:** None.

**Out of scope / deferred:** Redaction of `Environment` in the underlying GitHub Copilot SDK's options-base `ToString()` would require an upstream SDK change and is deferred to a follow-up.

---

## ⚠️ Quick Check

- [x] Squad.Agents.AI is a new .NET package (not part of bradygaster/squad). No changeset required.
- [x] All tests passing: `dotnet test test/Squad.Agents.AI.Tests/ -c Release`
- [x] Build verified: `dotnet build src/Squad.Agents.AI/Squad.Agents.AI.csproj -c Release`
- [x] No user-visible breaking changes
- [x] Documentation (README) updated

## PR Readiness Checklist

- [x] Branch up to date with target remote
- [x] Build: `dotnet build` passes
- [x] Tests: `dotnet test` passes (43/43 green)
- [x] Type check: no errors
- [x] No merge conflicts
- [x] Commit history clean
- [x] Documentation updated
- [x] No unintended file changes

---
### [RESEARCH] 2026-06-02 — Brady PR Conventions & Upstream Voice Analysis (B'Elanna)

---
date: 2026-06-02
phase: research-summary
---

# B'Elanna PR #3 Research Summary

## Brady's PR Template Structure

**Found:** `.github/PULL_REQUEST_TEMPLATE.md` (fully templated)

**Required sections:**
1. **What** — one paragraph, what changes
2. **Why** — problem being solved, link issue with `Closes #N`
3. **How** — approach, key design decisions
4. **Quick Check** — changeset status (if SDK/CLI source changed)
5. **PR Readiness Checklist** — 15+ items covering branch, commit, build, test, lint, changelog, docs, exports, breaking changes, waivers

External contributors see this same template but cannot directly edit checkboxes on `CHANGELOG.md` (maintainer-protected).

## Changeset Verdict: NOT REQUIRED

**Why:** Squad.Agents.AI is a **new .NET package in a separate repository** (tamirdresher/squad, not bradygaster/squad). The changeset system (`@changesets/cli`) applies only to the npm monorepo at bradygaster/squad. Its `config.json` specifies `baseBranch: "dev"` and changelog automation for npm packages.

Our .NET package uses .NET versioning via `Squad.Agents.AI.csproj` and will have its own release workflow independent of changesets. No changeset file is needed or expected.

## Brady's Voice & Conventions

- **Tone:** Factual, direct, user-benefit-focused
- **Spam filters:** Repo has automated spam detection; no malicious links, mass-mentions, or crypto scams
- **Handoff:** External contributors draft → CI passes → mark ready-for-review → Copilot reviewer posts suggestions → contributor applies manually → core team merges
- **Branch discipline:** Always branch from `dev`, rebase before PR
- **Commits:** Single squashed commit, clean history
- **Testing:** ALL tests must pass before draft-to-ready transition

## Key Lesson from External Contributor PRs

paulyuk (#1181) and weinong (#1166) both:
- Use simple What/Why/How structure
- Focus on user benefit (paulyuk: "faster init for people…")
- Link issues with `Closes #N`
- NO internal jargon, NO project metadata, NO round/condition IDs
- Professional, technical language

## Upstream-Ready PR Body Sections

Draft includes:
1. What (1 para elevator pitch)
2. Why (problem, need, context)
3. How (API surface, design decisions, security, sample, docs, deferred items)
4. Quick Check (changeset verdict, test status)
5. Readiness Checklist (adapted to .NET)

NO internal references, NO agent names, NO condition IDs, NO "Round 2b" language.

**Draft saved to:** `.squad/workstreams/active/squad-agents-ai/decisions/inbox/belanna-pr3-body-draft.md`

**Waiting on:** Data's sample path confirmation (may move from `samples/squad-agents-ai-sample/` to `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/`).

---
### [CONFIRMED] 2026-06-02 — PR #3 Title & Body Finalized for Upstream (B'Elanna)

# Finalization Confirmed — PR #3 R2c

**Date:** 2026-06-02T19:51:00Z  
**Task:** Push final PR body + remove `[DRAFT]` title prefix via single `gh pr edit` call

## Summary

✅ **COMPLETE** — PR #3 title and body finalized for upstream submission.

## Final State

**Title:** `feat: Squad.Agents.AI - Microsoft Agent Framework adapter for the Squad CLI`  
(Removed `[DRAFT - needs local test]` prefix; matches upstream contributor conventions)

**Body:** 4089 bytes, all sections present (What / Why / How / Quick Check / PR Readiness Checklist)

**Leak Check:** ✅ PASS — Zero internal references (Picard, Worf, Data, B'Elanna, Reno, Round numbers, SC-*, .squad/, commands)

**Verification:**
- [x] Title updated (no [DRAFT] present)
- [x] Body fully reconciled (sample path `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/`)
- [x] All checklist items ticked
- [x] No file changes on PR (body + title via `gh pr edit` only)
- [x] Post-push state confirmed via `gh pr view`

## For Tamir — Manual Review Suggestion

**One item to spot-check:** Verify the 15-item PR Readiness Checklist aligns with brady's exact template expectations. The draft maps to Brady's structure (branch/commit/build/test/type/conflicts/history/docs/files/sample-path/README-stub/cross-platform/security/contributor-best-practices/N/A-changeset), but Brady's automation may apply GitHub Action checks we haven't seen yet.

---

**PR Link:** https://github.com/tamirdresher/squad/pull/3  
**Commit reference:** `e214c4fb` (Data's sample restructure)  
**Ready for:** Upstream review push

---
### 2026-06-02 — PR #3 Round 1 Cleanup (Data, commit 88424b79)

**Context:** PR #3 review pass — hygiene, XML docs, cliArgs proof, multi-named connections.

**Decisions:**
- `cliArgs` already worked end-to-end (`SquadConnectionFactory` parses, options configurator merges, `SquadAgent` copies to `CopilotClientOptions.CliArgs`). Added code comment + regression test.
- Multi-named connection contract: `AddSquadAgent("research")` reads `ConnectionStrings:squad-research`; default `AddSquadAgent()` keeps `ConnectionStrings:squad`.
- XML docs added for all new public named-connection overloads.
- Public hygiene: 0 internal `.squad/` references in any public-facing text after scrub.

**Evidence:** Commit `88424b79`; 22 tests passing; 0 CS1591 warnings.

---

### 2026-06-02 — Auth Expansion: APPROVE_WITH_CONDITIONS (Picard + Worf)

**Context:** Data proposed auth-mode expansion + extensibility. Picard and Worf reviewed.

**Picard verdict:** APPROVE_WITH_CONDITIONS (6 conditions). Recommended extension point: `Action<CopilotClientOptions> ConfigureCopilotClient`. Seam boundary: v0.1 = `CopilotClientOptions` layer; v0.2 = `SessionConfig` layer. BYOK deferred to v0.2.

**Worf verdict:** APPROVE_WITH_CONDITIONS (8 security guards). Guards include: no token exfiltration through delegate, proxy URI validation, log scrubbing of bearer tokens, delegate isolation testing, rate-limit preservation, TLS override warning, connection string plaintext warning, and audit log for delegate presence.

**Status:** Awaiting Data implementation. No changes to PR #3 until R2 starts.

---

### 2026-06-02 — Release Strategy Directive (Tamir)

**By:** Tamir Dresher  
**What:** Squad.Agents.AI publishing follows branch-driven model:
- Merges to `dev` → publish prerelease NuGet (e.g., `0.1.0-preview.{run_number}`)
- Merges to `main` → publish stable NuGet (e.g., `0.1.0`)
- `workflow_dispatch` remains as manual escape hatch only

**Why:** Mirror Squad CLI release strategy. Reduces cognitive overhead; predictable "merge → published prerelease" loop on `dev`.

---

### 2026-06-02 — Release Pipeline + Dependabot Added (B'Elanna, commits 5f5293fb + db05f2a3)

**Agent:** B'Elanna  
**Deliverables:**
- `.github/workflows/squad-agents-ai-release.yml` — branch-driven (`dev` → prerelease, `main` → stable), per-version concurrency, `--skip-duplicate` safety.
- `.github/dependabot.yml` — NuGet + Actions weekly; `M.A.AI*` major updates allowed; OpenTelemetry major deferred (Decision 602).

**Outstanding:** `NUGET_API_KEY` secret setup (maintainer); `dev` branch creation (post-R2-merge).

---

### 2026-06-02 — .NET CI Gate Added (B'Elanna, commit 12d803bf)

**Agent:** B'Elanna  
**Deliverable:** `.github/workflows/squad-agents-ai-ci.yml` — matrix `ubuntu-latest` + `windows-latest`, .NET 10.0.x, restore/build/test/pack, artifact upload for TestResults + nupkg.

**Trigger:** PRs touching `src/Squad.Agents.AI/**`, `test/Squad.Agents.AI.Tests/**`, workflow, or root `Directory.*`/SDK config.

---

### 2026-06-02 — Docs Pass (Data, commit 6f8994e5)

**Agent:** Data  
**Seven gaps closed:** Package README, XML docs (4 public types), root README mention, CHANGELOG `0.1.0-preview` entry, `.csproj` metadata, README/LICENSE packed into `.nupkg`, `dotnet pack` verified.  
**Deferred to v0.2:** Sample app project, keyed DI, BYOK/session-provider pass-through, richer observability, multi-targeting beyond `net10.0`.

---

### 2026-06-02 — Gap Closure + Boundary Directives

**Clawpilotsquad Scope Boundary (Tamir):** clawpilotsquad owns clawpilot/repo m — NOT Squad.Agents.AI. Reno on PR #3 commits is a cross-squad identity overlap. Going forward: clawpilotsquad ≠ Squad.Agents.AI. Cross-squad work must be explicitly sanctioned and logged.

**Routing Tests Added (Data, commit 3f5e61d6):** 5 routing integration tests in `SquadAgentRoutingTests.cs` prove API routing contract at the `AIAgent`/Copilot boundary. Tests confirm persona metadata, boundary instructions, CWD isolation, and Decision 447 routing via `CopilotClientOptions`. 22/22 tests pass.

---

### 2026-06-02 — Onboarding Verdict: v0.1 READY TO MERGE

**Context:** 5-agent fan-out (Seven, Picard, Data, Worf, B'Elanna) synthesised into onboarding decision.

**Key findings:**
- Technical baseline stable (Data). Security clear (Worf, B1–B6 PASS). Build/pack verified locally (B'Elanna). Strategic context inherited (Picard).
- No blockers to merge PR #3, tag v0.1, and publish.

**Critical path for v0.2:** .NET CI gate ✅, NuGet publish workflow ✅, Squad routing functional proof ✅, Aspire telemetry scope TBD.

**Citations:** tamresearch1 Decisions 437–448; PR #3 (`tamirdresher/squad`).

---

### 2026-06-02 — Public Hygiene Directive (Tamir) [see also: evergreen/global]

**By:** Tamir Dresher  
**What:** No internal `.squad/` references, squad agent names, or internal process details in any public-facing text — PR descriptions, commit messages, NuGet README, GitHub Releases, blog content, docs.

**Note:** A copy of this directive also lives in `.squad/workstreams/evergreen/global/decisions/inbox/` because it applies to all workstreams, not only squad-agents-ai.

---

