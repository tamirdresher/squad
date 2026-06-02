# Data Agent Learning Log — Recent Sessions

**Last Summarized:** 2026-06-02T08:46:00Z  
**Archive Reference:** See history-archive.md for prior learning sessions and research context.

## 2026-06-02T08:46:00Z — Scribe Archival Session

**Summary (18KB → Archive):**
Data owns Squad framework expertise. Key learnings:
- **P0 permission bug:** `'approved'` → `'approve-once'` fix cherry-picked to PR #1192 with regression test (commit e1faf5d9); all CI green; PR #1193 closed
- **State-backend triage:** Parallel community signal confirmed P0 blocker; 5 dominant problem themes mapped across GitHub issues (#1190, #1185, #1163, etc.)
- **Memory governance work:** Expanded-memory A/B harness validated; substitute evidence at ceiling per Worf gate; multi-repo real CLI E2E deferred (Copilot CLI limitation: no per-repo session store partitioning)
- **Gotcha documented:** vitest in junction-linked worktrees resolves SDK dist stale (fails local, passes CI fresh)
- **Skill created:** `extract-test-from-competing-pr` (PR deduplication pattern)

### [2026-06-02 Session] Cross-Reference: Squad.Agents.AI Onboarding Fan-Out

**Session Log:** `.squad/log/2026-06-02T09-04-38Z-squad-agents-ai-onboarding.md`  
**Decision Entry:** `.squad/decisions.md` section "2026-06-02 — Squad.Agents.AI NuGet Onboarding: 5-Agent Fan-Out"  
**Coordinating Agents:** Data (this agent, technical baseline), Worf (security), Picard (strategy), Seven (provenance), B'Elanna (build/CI).

This session synthesized five coordinated reports into a single onboarding decision batch. Data's technical baseline (4 public types, SDK pins, package identity) paired with B'Elanna's build/CI findings and Worf's security gate clearance. Key open: confirm Squad routing functionally without explicit agent config; decide GitHub.Copilot.SDK direct-pin strategy.

## Recent Sessions (Last 30 days)
- Wrote readiness/blocker note to `.squad/decisions/inbox/data-real-repo-validation-readiness.md`; Worf must reopen Tier 2 real-repo substitute validation before execution.
- Prepared scope uses isolated copies of `squad-memory-governance` first and optionally `squad`, removes `.github\workflows`, keeps A/B prompts identical, retains all guards, and marks `realCopilotCliE2E: false`.
- Prepared Worf-gated runnable artifacts under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\real-repo-validation-20260519T115829\`.
- Did not run a real-repo substitute batch because Worf's current final decision says substitute evidence ceiling was reached and further substitute expansion is not approved.
- Read the new user directive, Picard confidence framework, Worf's final multi-repo gate, and prior expanded-memory artifacts.

## 2026-05-19T11:58:29.988+03:00 — Real-repo substitute validation readiness

- Wrote Worf next-gate input to `.squad/decisions/inbox/data-multirepo-scaleout-results.md`.
- Guards retained: redaction=True, forbidden rejection=True, workflow disabled/removed=True, timeouts=0, silence hangs=0, hang escalations=0, token proxy total=106665.
- Results: pass=True; A recall=0, B recall=27; task success A=150/150, B=150/150; forbidden rejection turns=6; supersession turns=6; forward-link recall=3; failures=0.
- Scope/constraints passed: 3 isolated fixtures/repos, 2 variants each, exactly 150 paired turns / 300 rows, byte-identical prompts within pair, `realCopilotCliE2E: false`, no statistical/production/ship/release claims.
- Ran Worf-conditionally-approved multi-repo substitute direct-layer A/B scale-out under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\multirepo-scaleout-20260519T101227\`.

## 2026-05-19T10:12:27.018+03:00 — Multi-repo substitute-harness scale-out

- Wrote Worf next-gate input to `.squad/decisions/inbox/data-50turn-scaleout-results.md`.
- Guards retained: redaction=True, forbidden rejection=True, workflow disabled=True, timeouts=0, silence hangs=0, hang escalations=0, token proxy total=26419.
- Results: pass=True; A recall=0, B recall=9; task success A=50/50, B=50/50; forbidden rejection turns=2; supersession turns=2; failures=0.
- Scope/constraints passed: 1 fixture repo, 2 variants, exactly 50 paired turns / 100 rows, byte-identical prompts, `realCopilotCliE2E: false`, no statistical/production/ship/release claims.
- Ran Worf-approved single-repo substitute direct-layer A/B scale-out under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\scaleout-50turn-20260519T101227\`.

## 2026-05-19T10:12:27.018+03:00 — 50-turn substitute-harness scale-out

- Boundary preserved: substitute memory-layer evidence only; no Copilot CLI E2E claim; 50-turn scale-out still requires Worf re-gate.
- Results: 20 rows / 10 paired turns, byte-identical prompts, overall pass true, A recall 0, B recall 3, forbidden/transient rejection passed, no timeout, no silence hang, no escalation, token proxy total 4605.
- Added harness support for R-1 silence detector, R-2 three-hang escalation, and R-3 per-turn token/cost proxy accounting; R-4 load-guidance tags and R-5 superseded forward-link behavior were exercised in the prompts/results.
- Implemented and ran the permitted autonomous 10-turn substitute direct-layer A/B pilot under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\pilot-10turn-20260519T101227\`.

## 2026-05-19T10:12:27.018+03:00 — 10-turn substitute-harness pilot

- Ran substitute direct-layer simulation only (not Copilot CLI E2E) under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\autonomous-sim-20260519T090004\`; Worf must re-gate before 10-turn pilot or 50-turn scale-out.
- Validated with `npm run lint`, targeted Vitest memory/tool tests (59/59), SDK build, CLI build.
- Added CLI `--load-guidance`, docs, tests, and updated expanded-memory A/B scaffold seed/prompts to carry load-guidance tags.
- Fixed promotion supersession metadata so the archived prior entry links forward with `supersededBy` and the active successor records `supersedes`; tombstones preserve previous status and forward-link metadata.
- Implemented load-guidance semantics in `squad-memory-governance`: `[ALWAYS]` for policy/decision, `[ON-DEMAND]` for retrievable local/semantic entries, `[ARCHIVE]` for superseded/deleted/tombstoned entries, and `[NEVER]` for forbidden/transient rejected memory.
## 2026-05-19T09:00:04.581+03:00 — Memory load guidance tags and supersession simulation

- Worf gate readout: HB-1, HB-2, HB-3, HB-4, HB-5, and HB-7 look evidenced for dry-run review; HB-6 and HB-8 need cost accounting and explicit silence telemetry before any 10-turn pilot.
- Substitute A/B result: A returned `NOT_IN_CONTEXT` for seeded recall, B recalled the prior n=20 honesty boundary plus the blog two-layer concept, and forbidden/transient memory was rejected without repeating the synthetic secret.
- Real Copilot CLI smoke passed for the no-memory orientation turn, but the full paired 3-turn conclusion uses the clearly labeled substitute direct-layer harness; do not treat this as full Copilot UI proof.
- Included blog-post memory concepts in the prompts and B seed: Tamir's two-layer architecture, with git notes for commit-scoped why and an orphan branch for permanent decisions/history.
- Used a tiny fixture copied under the session artifact folder; fixture commit `8961ee9d45a3bbf2929808889e46057283936dcc`, tree `fa25d87e390e3ea48712f6a086ca2ac58f6cc051`; removed `.github/workflows` from both variants.
- Ran only the permitted 3-turn dry-run stage under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\dry-run-3turn-20260519T075511\`; did not run the 10-turn pilot or 50-turn scale-out.

## 2026-05-19T07:55:11.928+03:00 — Expanded memory A/B 3-turn dry run

- Feasibility verdict: 50-turn paired sessions are plausible but not yet proven reliable; require 3-turn dry run and 10-turn pilot before scaling. If reliability fails, use the direct Squad CLI/SDK replay path and label it memory-layer evidence only, not Copilot UI proof.
- Important client-compatibility boundary: PowerShell wrapper rejected `-C` and `--name`; harness must set cwd externally and resume by parsed session id. Share files are per-turn, not full resumed transcripts.
- Copilot CLI smoke evidence improved from prior inconclusive sentinel: from cwd, `copilot --agent squad -p ... --share ...` returned the exact sentinel, and `--resume=<session-id>` worked for turn 2.
- Designed a gated larger A/B harness in session artifacts only: `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\`.

## 2026-05-19T07:11:25.375+03:00 — Expanded Copilot+Squad memory A/B harness design

- Raw artifacts: `C:\Users\tamirdresher\.copilot\session-state\memory-ab-20260519T063342\`.
- Controlled results: slim-context recall had no lift because decisions were in prompt; large-context/compacted recall improved from 0.000 to 1.000 with 120 distractors, and governed policy rejected forbidden/transient writes with audit evidence.
- Full Copilot CLI + `--agent squad` was smoke-tested non-interactively but returned only `● S`, so the measurable study is a clearly marked direct-layer substitute, not full UI E2E proof.
- Built and ran a 20-pair A/B harness against `C:\Users\tamirdresher\source\repos\squad-memory-governance` using real `squad init` plus the actual `LocalMemoryStore`; full repo `npm test` was intentionally avoided.

## 2026-05-19T06:33:42.877+03:00 — Local governed memory value A/B experiment


**Local Memory E2E Validation (18-May):** Real local-memory A/B against squad-memory-governance fixtures; 20-pair controlled study; slim-context no lift (decisions in prompt), large-context recall 0.000→1.000 (120 distractors); governed policy rejects forbidden writes with audit evidence. Full Copilot CLI + --agent squad smoke-tested non-interactively (inconclusive sentinel). Artifacts: `C:\Users\tamirdresher\.copilot\session-state\memory-ab-20260519T063342\`.

**Governed Memory Boundary (18-May):** Copilot Memory API undocumented; provider=copilot fails closed until real contract exists; hostInjectedCopilotAdapter opt-in only; unsafe content/queries classified BEFORE external calls; audit/telemetry redacted; all eight Worf gates satisfied; tests pass.

**ADC Integration:** ADC event bus (Redis streams) is production-ready; Squad needs fireEventTrigger() SDK + CLI command; separate platform-specific adapter layer; periodic ephemeral sandbox approved as MVP over webhook/long-lived models; Worf guardrails G1–G5 required.

**Brady Squad Framework:** TypeScript ESM monorepo with SDK/CLI; Node >=22.5.0; agent spawning loads charters via FSStorageProvider; coordinator is dispatcher, not doer; `.squad/decisions/inbox/` governance; append-only merge rules; resolution worktree-aware + legacy-aware.

## Prior Work Summary (2026-05-14–2026-05-18)

6. **Draft status + UNSTABLE is a double disqualifier.** A draft PR signals the author knows it is not ready. UNSTABLE merge state reinforces it. Both flags together mean "do not merge without human escalation."
5. **Cherry-pick the valuable piece from the loser.** When the losing PR has one genuinely good contribution (e.g., a regression test), extract and land it rather than losing it entirely.
4. **Backward compat trumps correctness theater.** Adding `'approve-once'` alongside `'approved'` is correct for a P0 fix. Removing `'approved'` and the `denied-*` kinds is a separate semver-major concern that needs its own review cycle.
3. **CI green is a hard gate.** A PR with zero CI runs (regardless of how correct the code looks) cannot be trusted for P0 merge. Always check `mergeStateStatus` and `statusCheckRollup` before recommending.
2. **Core-maintainer authorship matters.** A PR from a repo owner carries implicit merge authority and reviewability; an autonomous bot draft does not.
1. **Minimal wins over comprehensive at P0.** When a bug is blocking a release, the smallest correct fix that passes CI beats a larger "while we're here" refactor. Scope creep risks introducing new breakage on the critical path.
**General patterns for resolving duplicate fix PRs:**

**Winner:** PR #1192. The only gap was the absence of a regression test; #1193 did write a useful one that can be cherry-picked.

**What was found:** Two competing PRs existed for the same one-line P0 fix (`'approved'` → `'approve-once'`). PR #1192 (bradygaster, core maintainer) was minimal (+9/−2), backward-compatible, CI-green, in CLEAN mergeable state, and had active reviewer engagement. PR #1193 (autonomous Copilot bot) was a draft, had zero CI runs (UNSTABLE), and expanded scope to a full type-system rewrite — replacing the `SquadPermissionRequestResult` interface with a discriminated union while dropping three `denied-*` kind values and the `rules?` property, which constitutes a breaking API change beyond P0 scope.

### 2026-06-02T11:29:11.224+03:00 — Duplicate-PR triage: permission contract P0 (#1192 vs #1193)

- Squad framework work should preserve strict routing discipline: the coordinator routes; specialists build and review.
- The `squad` repo's team uses Mission Control roles such as Flight, CAPCOM, CONTROL, FIDO, and others. This project uses Star Trek names, but Data owns equivalent Squad SDK/CLI expertise here.

## Learnings

2026-06-02: Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations (per user directive).

### Squad.Agents.AI NuGet — Technical Onboarding (2026-06-02)

Captured timestamp: 2026-06-02T12:04:38.931+03:00.

#### Source base read

- Authoritative PR: `tamirdresher/squad#3`, title `[DRAFT - needs local test] feat: Squad.Agents.AI community NuGet`, state `OPEN`, draft `true`, head branch `feature/squad-agents-ai`, base `main`.
- PR #3 commits inspected: `8f2679db87c451b0774752e71d2bcc6eee14993a` (initial package), `ad05d3d4342a57b5ae708db38cc2272d33d9c4bd` (PR body), `f5b6c5f0a3dbd1f5e9d7e098360b9f57e5d8ced7` (inherit `AIAgent`, remove `IChatClient` force-cast), `257fc684c96844d55fe786bc1ec01384d0519462` (README rewrite), `d6e59b3392790c548df21429273a4d31c1b0cf6e` (`GitHubTokenProvider` + redacted `ToString()`), `c97fee6bafbb827716a273cf99419f1f541d8487` (README token-provider docs), `2c357c057cae8e66db29640992940e86aa76d1b5` (`ConnectionStrings__squad`/`IConfigureOptions` binding), `db7940a78ee34766794c6cf9fd27cd4d08be73e4` (README removes deleted `WithTeamRoot`).
- PR #3 file paths: `.gitignore`; `pr-body.md`; `src/Squad.Agents.AI/README.md`; `src/Squad.Agents.AI/Squad.Agents.AI.csproj`; `src/Squad.Agents.AI/SquadAgent.cs`; `src/Squad.Agents.AI/SquadAgentOptions.cs`; `src/Squad.Agents.AI/SquadAgentOptionsConfigurator.cs`; `src/Squad.Agents.AI/SquadConnectionFactory.cs`; `src/Squad.Agents.AI/SquadServiceCollectionExtensions.cs`; `test/Squad.Agents.AI.Tests/Squad.Agents.AI.Tests.csproj`; `test/Squad.Agents.AI.Tests/SquadConnectionFactoryTests.cs`; `test/Squad.Agents.AI.Tests/SquadServiceCollectionExtensionsTests.cs`.
- PR #3 diff size: 12 files changed, 1025 insertions. `.gitignore` adds root `bin/`, `obj/`, and `artifacts/` ignores. All `src/Squad.Agents.AI/` and `test/Squad.Agents.AI.Tests/` files are new.
- Local Squad repo: `C:\Users\tamirdresher\source\repos\squad` is currently checked out on `squad/781-watch-verbose-reliability`, not PR #3. The PR branch exists locally as `remotes/fork/feature/squad-agents-ai`; the current worktree does not contain `Squad.Agents.AI` at repo root. Inspect PR files via the remote branch instead of checking out because the local repo has unrelated modified/untracked files.
- Sample scaffold source: `C:\Users\tamirdresher\tamresearch1\.squad\research\maf-contribution-drafts\03-sample-pr-scaffold\dotnet\samples\02-agents\SquadAgent\` (`SquadAgent.cs`, `SquadAgentOptions.cs`, `Program.cs`, `README.md`, `SquadAgent.csproj`).
- Working demo comparison: `C:\Users\tamirdresher\source\repos\squad-agent-framework-demo\Squad.AgentFramework.Demo.csproj` and `C:\Users\tamirdresher\source\repos\squad-agent-framework-demo\SquadAgent.cs`.
- Tamresearch1 source decisions/history read: `C:\Users\tamirdresher\tamresearch1\.squad\decisions.md`, `C:\Users\tamirdresher\tamresearch1\.squad\agents\data\history.md`, and `history-archive.md`.

#### A. Public API surface

| Public type | PR #3 path | Purpose | Key members | Mutability / contract note |
|---|---|---|---|---|
| `Squad.Agents.AI.SquadAgent` | `src/Squad.Agents.AI/SquadAgent.cs` | Squad-flavored `Microsoft.Agents.AI.AIAgent` wrapper over a GitHub Copilot `CopilotClient`/inner `AIAgent`. It centralizes Squad-ish options, DI construction, logging, and disposal. | Constructors: `SquadAgent(SquadAgentOptions options, ILoggerFactory? loggerFactory = null)`, `SquadAgent(IOptions<SquadAgentOptions> options, ILoggerFactory? loggerFactory = null)`. Public overrides: `Name`, `Description`. Inherited public agent entry points come from `AIAgent`; protected core overrides delegate to `_inner`: `CreateSessionCoreAsync`, `RunCoreAsync`, `RunCoreStreamingAsync`, `SerializeSessionCoreAsync`, `DeserializeSessionCoreAsync`. Public lifecycle: `ValueTask DisposeAsync()`. | No public settable properties on the agent. Sealed class. Owns a `CopilotClient` when constructed from options. Delegates session and run behavior to `_inner = _copilotClient.AsAIAgent(instructions: options.Instructions, name: options.AgentName ?? "Squad")`. |
| `Squad.Agents.AI.SquadAgentOptions` | `src/Squad.Agents.AI/SquadAgentOptions.cs` | Options bag for `SquadAgent`, bindable from DI/app configuration and Aspire connection strings. | `SquadFolderPath`, `CliPath`, `CliArgs`, `Cwd`, `Environment`, `GitHubToken`, `GitHubTokenProvider`, `TraceEvents`, `AgentName`, `Instructions`, and redacting `ToString()`. | PR #3 uses mutable options, not init-only: string/bool/function properties are `get; set;`; `CliArgs` is get-only but the `IList<string>` instance is mutable; `Environment` is get-only but the `IDictionary<string,string?>` instance is mutable. `GitHubToken` is `[JsonIgnore]`; `ToString()` prints `GitHubToken = [REDACTED]`. This differs from the sample scaffold, whose `SquadAgentOptions` used init-only properties (`CliPath`, `WorkingDirectory`, `AgentName`, `BoundaryInstructions`). |
| `Squad.Agents.AI.SquadConnectionFactory` | `src/Squad.Agents.AI/SquadConnectionFactory.cs` | Static parser for connection strings emitted by the Aspire Squad resource or supplied manually. | `public static SquadAgentOptions FromConnectionString(string connectionString)`. Supports literal PATH form and `squad://localhost?...` URI form. URI query parameters parsed today: `teamRoot`, `cliPath`, `cwd`, `cliArgs` (semicolon-separated), `env` (`key=value;key2=value2`). | Static type; no instance state. Throws `ArgumentException` on null/empty/whitespace. Host and `protocol` are ignored/reserved. PATH form sets both `SquadFolderPath` and `Cwd` to the full string. |
| `Squad.Agents.AI.SquadServiceCollectionExtensions` | `src/Squad.Agents.AI/SquadServiceCollectionExtensions.cs` | DI registration surface for consumers. | `AddSquadAgent(this IServiceCollection services, Action<SquadAgentOptions>? configure = null)` and `AddSquadAgent(this IServiceCollection services, ServiceLifetime lifetime, Action<SquadAgentOptions>? configure = null)`. Registers `SquadAgent` and `AIAgent` with the selected lifetime; default lifetime is scoped. Registers `SquadAgentOptionsConfigurator` as `IConfigureOptions<SquadAgentOptions>` via `TryAddEnumerable`; applies user callback via `services.Configure(configure)`. Adds `PostConfigure<ILoggerFactory>` warning when `TraceEvents` is true. | Static extension type; no instance state. No keyed DI overloads in v0.1. Warning text says production caution, but code currently warns whenever `TraceEvents` is true; it does not inspect `IHostEnvironment`. |

Not public but important: `Squad.Agents.AI.SquadAgentOptionsConfigurator` in `src/Squad.Agents.AI/SquadAgentOptionsConfigurator.cs` is `internal sealed`. It reads `IConfiguration.GetConnectionString("squad")`, parses it with `SquadConnectionFactory`, fills only unset scalar options, appends missing CLI args, and fills only missing environment keys. This is the `ConnectionStrings__squad`/Aspire binding bridge.

Public types that existed in earlier designs but are **not** present in PR #3: `SquadTelemetry`, `SquadDefaults`, `WithTeamRoot`, `AddSquadAgentFromConnectionString`, keyed DI registration types, an `ExtensionSlug` property, and any public session type.

#### B. SDK contract

- Direct package references in `src/Squad.Agents.AI/Squad.Agents.AI.csproj`:
  - `Microsoft.Agents.AI.GitHub.Copilot` = `1.7.0-preview.260526.1`.
  - `Microsoft.Extensions.AI` = `10.6.0`.
  - `Microsoft.Extensions.Options` = `10.0.8`.
  - `Microsoft.Extensions.DependencyInjection.Abstractions` = `10.0.8`.
  - `Microsoft.Extensions.Hosting.Abstractions` = `10.0.8`.
  - `Microsoft.Extensions.Logging.Abstractions` = `10.0.8`.
- `GitHub.Copilot.SDK` is used by source (`using GitHub.Copilot.SDK;`, `CopilotClient`, `CopilotClientOptions`) but is **not** a direct PR #3 package reference. It is expected transitively through `Microsoft.Agents.AI.GitHub.Copilot`. This is a version-control risk: the package does not directly pin the SDK whose public types it imports.
- `Microsoft.Agents.AI` core is also used by source (`AIAgent`, `AgentSession`, `AgentRunOptions`, `AgentResponse`, `AgentResponseUpdate`) and likely arrives transitively via the GitHub Copilot MAF package; there is no direct `Microsoft.Agents.AI` package reference in PR #3.
- `AIAgent` base class contract used by `SquadAgent`: PR #3 subclasses `AIAgent` directly, overrides `Name` and `Description`, and implements the protected core methods by forwarding to `_inner`. It does not force-cast to `IChatClient`; PR body text about `(IChatClient)(object)agent` is stale after commit `f5b6c5f0a3dbd1f5e9d7e098360b9f57e5d8ced7`.
- `CopilotClientOptions` usage in PR #3: `CliPath = options.CliPath`; `Cwd = options.Cwd ?? options.SquadFolderPath`; `GitHubToken = resolvedToken`; `CliArgs = options.CliArgs.ToArray()` when non-empty; `Environment = Dictionary<string,string>` copied from non-null option values; `Logger = loggerFactory.CreateLogger<CopilotClient>()` when `TraceEvents` is true.
- Token resolution order: `GitHubTokenProvider(CancellationToken.None).GetAwaiter().GetResult()` wins over `GitHubToken`. That means token retrieval is synchronous during construction and does not receive the per-run cancellation token.
- `SessionConfig` usage: PR #3 does not construct `SessionConfig` directly. Boundary/system text is passed as `instructions: options.Instructions` to `AsAIAgent`; per tamresearch1 Decision 441 this maps to the underlying `GitHubCopilotAgent` system message/session config. The original sample scaffold did use `SessionConfig.WorkingDirectory`, manual `SquadAgentSession.IsFirstTurn`, and `FormatUserMessage`; Decision 441 said that first-turn preamble should be deleted in favor of `instructions:`.
- Assumptions and flagged contracts:
  - The sample scaffold's `SessionConfig.WorkingDirectory` and `CopilotClientOptions.CliPath` assumptions were explicitly flagged for verification by the requested 1054 item. Decision 441 later verified `CopilotClientOptions` operational properties (`CliPath`, `CliArgs`, `Cwd`, `Environment`, `GitHubToken`, etc.). PR #3 avoids direct `SessionConfig.WorkingDirectory` by setting `CopilotClientOptions.Cwd`.
  - `AsAIAgent(name: ...)` is identity metadata, not routing. Decision 447/Q5 resolved that routing happens through `CopilotClientOptions.CliPath`/`CliArgs`/`Cwd`/`Environment`, not through `name`. PR #3 sets name to `Squad`, but that alone does not route to a Squad Copilot extension.
  - If invoking the actual Squad extension requires `SessionConfig.Agent = "Squad"` or a specific CLI arg, PR #3 currently does not do that explicitly. `SquadFolderPath` only defaults `Cwd`; it is not included in system instructions and is not validated for `.squad/` existence.
  - `TraceEvents` does not wire `OnEvent`, `Streaming`, or `IncludeSubAgentStreamingEvents` like the working demo; it only assigns `CopilotClientOptions.Logger`. This is narrower than the demo's trace implementation.

#### C. Packaging metadata

From `src/Squad.Agents.AI/Squad.Agents.AI.csproj`:

| Field | PR #3 value |
|---|---|
| SDK | `Microsoft.NET.Sdk` |
| `TargetFramework` | `net10.0` |
| `Nullable` | `enable` |
| `ImplicitUsings` | `enable` |
| `LangVersion` | `latest` |
| `IsPackable` | `true` |
| `PackageId` | `Squad.Agents.AI` |
| `Title` | `Squad Agents AI` |
| `Description` | `Community SquadAgent for Microsoft Agent Framework. Exposes the Squad multi-agent CLI as an AIAgent that can be composed into any MAF app or workflow.` |
| `Authors` | `Squad contributors` |
| `PackageTags` | `squad;agent-framework;maf;copilot;ai-agent` |
| `RepositoryUrl` | `https://github.com/bradygaster/squad` |
| `RepositoryType` | `git` |
| `PackageLicenseExpression` | `MIT` |
| `PackageReadmeFile` | `README.md` |
| `GenerateDocumentationFile` | `true` |
| `Version` | `0.1.0-preview` |
| README packing | `<None Include="README.md" Pack="true" PackagePath="\" />` |

Packaging notes/blockers:

- There is no `Directory.Build.props` in the PR #3 file list or `src/Squad.Agents.AI` tree, so no shared .NET metadata/versioning is being imported for this package.
- `GeneratePackageOnBuild` is absent, so package generation on build is not enabled by the project; the documented path is explicit `dotnet pack -c Release -o ../../artifacts`.
- `RepositoryUrl` points to `https://github.com/bradygaster/squad`, while the PR and branch live under `tamirdresher/squad`. This is a release metadata blocker unless upstream is the intended final package source.
- `Authors` is generic (`Squad contributors`); no `PackageProjectUrl`, source link, symbol package settings, changelog, release notes, or NuGet publish workflow are present.
- NuGet.org flat-container lookup for `squad.agents.ai` returned 404, so the package is not published there under that ID at the time of this onboarding.
- PR #3 is still draft/open. Root workflows in the branch are existing Squad Node/npm workflows; no workflow references `dotnet`, `nupkg`, `NuGet`, or `Squad.Agents.AI`.
- The PR body is stale: it says unit tests are deferred, but PR #3 now adds `test/Squad.Agents.AI.Tests/` with xUnit tests.

#### D. Integration patterns

- Standalone DI:
  ```csharp
  using Microsoft.Agents.AI;
  using Microsoft.Extensions.DependencyInjection;
  using Squad.Agents.AI;

  var services = new ServiceCollection();
  services.AddLogging();
  services.AddSquadAgent(options =>
  {
      options.SquadFolderPath = @"C:\path\to\team-root";
      options.Cwd = @"C:\path\to\team-root";
      options.GitHubToken = Environment.GetEnvironmentVariable("GH_TOKEN");
      options.Instructions = "You are the repo-local Squad facade.";
  });

  var provider = services.BuildServiceProvider();
  var squad = provider.GetRequiredService<AIAgent>();
  var session = await squad.CreateSessionAsync();
  var response = await squad.RunAsync("hello squad", session);
  ```
- Aspire/config binding:
  - `AddSquadAgent()` with no callback reads `ConnectionStrings:squad` via `IConfiguration.GetConnectionString("squad")`; in environment-variable form this is `ConnectionStrings__squad`.
  - PATH connection string (`C:\team-root` or `/Users/me/team-root`) maps to `SquadFolderPath` and `Cwd`.
  - URI connection string (`squad://localhost?teamRoot=...&cliPath=...&cwd=...&cliArgs=--verbose;--trace&env=KEY=value`) maps to the corresponding options.
  - The connection-string configurator runs before user callbacks; callbacks can override scalar values and append additional CLI args/environment values.
- Lifetime and multiple squads:
  - Default `AddSquadAgent()` lifetime is `Scoped`; overload accepts any `ServiceLifetime`.
  - Registers both concrete `SquadAgent` and base `AIAgent`, so consumers can resolve either.
  - No keyed DI exists; multiple teams in one app require manual service-registration workarounds today.
- Working-directory isolation:
  - `CopilotClientOptions.Cwd` defaults to `options.Cwd ?? options.SquadFolderPath`.
  - There is no validation that the directory exists, contains `.squad/`, is a git repo, or is isolated/containerized. Consumer must pick a safe team root and process identity.
- Session-scoped chat history:
  - Consumers should create/pass `AgentSession` for multi-turn coherence.
  - `SquadAgent` delegates session creation, serialization, deserialization, sync run, and streaming run to `_inner`.
  - The original sample scaffold held a custom `SquadAgentSession` with `IsFirstTurn`; PR #3 removed that in favor of inner MAF session behavior.
- Boundary/system instructions:
  - Sample scaffold injected boundary instructions manually into the first user turn via `FormatUserMessage`.
  - PR #3 passes `SquadAgentOptions.Instructions` into `AsAIAgent(instructions: ...)`, so instructions are expected to become the inner agent's system message/session config.
  - PR #3 has no default Squad boundary text. If `Instructions` is null, no explicit Squad governance preamble is set by this wrapper.
- Demo comparison:
  - `squad-agent-framework-demo\Squad.AgentFramework.Demo.csproj` targets `net9.0`, references `GitHub.Copilot.SDK 1.0.0-beta.2`, `Microsoft.Agents.AI 1.5.0`, `Microsoft.Agents.AI.GitHub.Copilot 1.5.0-preview.260507.1`, and workflow packages.
  - Demo `SquadAgent.cs` constructs `GitHubCopilotAgent` directly with `SessionConfig { Agent = "Squad", OnPermissionRequest = PermissionHandler.ApproveAll, OnEvent = ..., Streaming = ..., IncludeSubAgentStreamingEvents = ... }`, adds a hard-coded read-only boundary system message, and has richer event tracing.
  - PR #3 packaging is narrower and cleaner for NuGet, but it drops demo-specific `SessionConfig.Agent`, `PermissionHandler.ApproveAll`, native event tracing, `Capabilities`, `IdCore`, and hard-coded boundary behavior.

#### E. Known v0.1 release risks and v0.2 backlog

From tamresearch1 Decision 453 / requested persona-validation entries:

- Persona validation result: Noob, Senior, and Expert personas found no v0.1 blockers, but identified risks to validate/document and a v0.2 backlog.
- v0.1 risks to document/validate:
  - Data: cancellation propagation — prove `CancellationToken` on `RunAsync()`/streaming cancels the CLI subprocess and does not orphan it.
  - B'Elanna: thread safety under parallel load — profile multiple concurrent `SquadAgent` calls and track process count/resource exhaustion.
  - Data: CLI error-message clarity — break the team root/auth and verify the wrapper surfaces actionable errors rather than opaque failures.
  - Data history also tracks AOT/Trimming readiness as a release-risk concern, while the decision table places it in the v0.2 Track A backlog.
- v0.2 feature backlog by owner:
  - Data / Track A: keyed DI registration for two or more `SquadAgent` instances with different team roots; session-serialization docs for `GitHubTokenProvider` closures; AOT/Trimming readiness (`DynamicallyAccessedMembers` audit/fixes); cancellation and error-message improvements.
  - B'Elanna / Track B: parallel concurrency profile; Aspire dashboard resource updates for SquadAgent telemetry.
  - Worf / Track C: token-provider caching semantics; token source audit trail; URI parsing security to prevent query params from becoming shell injection vectors.
- Decision 441/447 technical risks still relevant:
  - `GitHubCopilotAgent` is sealed; wrapper/delegation is correct.
  - `AsAIAgent(name: ...)` does not route to Squad; routing must be operational (`CliPath`, `CliArgs`, `Cwd`, `Environment`).
  - `net10.0` honors the locked preference but raises the adoption bar above MAF's broader target floor.
  - Preview SDK package `Microsoft.Agents.AI.GitHub.Copilot 1.7.0-preview.260526.1` can break before stable.

#### F. What is missing for this squad to continue

Concrete continuation gaps:

1. Publish state: `Squad.Agents.AI` is not published on NuGet.org under that ID; PR #3 remains draft/open.
2. Release workflow: no dotnet build/test/pack/publish workflow exists in PR #3; existing workflows are Squad Node/npm workflows.
3. Package metadata hardening: confirm final repository URL (`tamirdresher/squad` vs `bradygaster/squad`), authorship, project URL, source link, symbol package, release notes, and README package rendering.
4. Versioning/changelog: no package-specific `CHANGELOG.md`, release notes, MinVer/Nerdbank/GitVersion strategy, or preview-to-stable policy.
5. Dependency pins: direct `GitHub.Copilot.SDK` pin is absent despite source using its public types; confirm transitive version and lock strategy.
6. Build/test wiring: xUnit tests exist (14 smoke tests) but need CI inclusion and a solution or explicit test command in repo docs.
7. Behavioral validation: run local `dotnet restore`, `dotnet build -c Release`, `dotnet test`, `dotnet pack`, then a consumer smoke app with a real `.squad/` team root.
8. Runtime contract validation: verify whether PR #3 actually invokes Squad (not just bare Copilot) without `SessionConfig.Agent = "Squad"` or an explicit CLI arg.
9. Security validation: token-provider deadlock/blocking behavior, direct token storage, URI env/CLI arg injection, and trace logging content need Worf review.
10. Documentation/sample apps: README has quick start and troubleshooting, but PR #3 has no dedicated sample app project; the external demo remains separate and targets older package versions.
11. AOT/trimming/multi-target: no trimming annotations; `net10.0` only; no `net8.0`/`net9.0` compatibility plan in package metadata.
12. Observability: demo event-tracing/Aspire dashboard behavior is not in PR #3; decide whether v0.1 intentionally excludes it or tracks it for v0.2.

- `origin/squad/949-fix-externalized-state-paths` — externalized path resolution (not merged)
- `origin/squad/864-state-backend-hardening` — retry + circuit-breaker (not merged)
- `origin/copilot/bug-squad-cli-permission-issues` — same permission fix (different branch)
- `origin/squad/1191-fix-cli-permission-contract` — permission contract one-liner fix
- `origin/bradygaster/squad-p1-coordinator-bugs` — P1 coordinator + state bugs; also adds State & Team Root Resolution section to coordinator template
**Relevant in-flight branches:**

Seven independently identified the same P0 permission contract blocker via community issue research (#1191). Her findings corroborate this analysis and validate the urgency of the fix. Seven also mapped 5 dominant problem themes from GitHub issues; Data's bug taxonomy aligns with all 5 themes. Both agents recommend immediate prioritization of the one-line permission contract fix before any further insider.3 user testing.
**Cross-Agent Note (2026-05-31T14:03:06.842+03:00):**

**`StateBackendStorageAdapter.toRelative()` Windows edge case:** Strips `squadDir` prefix using `path.normalize().slice(normalizedBase.length + 1)` then converts slashes. If absolute path has a different-case drive letter or UNC form, normalization may produce a non-matching prefix and leak an absolute path into the orphan/notes backend, corrupting git notes refs.

- Coordinator template still documents `"worktree"` and `"git-notes"` as valid config values (stale docs — fixed in p1 branch)
- State backend hardening (retry + circuit-breaker): `origin/squad/864-state-backend-hardening` not merged
- Externalized state path resolution broken: `origin/squad/949-fix-externalized-state-paths` not merged
**P2 bugs (not yet merged at insider.3):**

- Fix in `bradygaster/squad-p1-coordinator-bugs`: removes the `explicitBackend` throw logic and `requireGitRepository()` entirely
- At insider.3, if `stateBackend` is explicitly set to `'orphan'` or `'two-layer'` in config.json AND the backend init fails (not a git repo, or `requireGitRepository` throws), the code rethrows instead of falling back to `'local'`
**P1 bug — `resolveStateBackend` throws on explicit backend failure:**

- Single-character fix: `'approved'` → `'approve-once'` in `shell/index.ts`
- All spawned agent operations (including state writes) hang or fail on v1.0.54+
- Copilot CLI v1.0.54+ changed the contract to require `{ kind: 'approve-once' }`
- `approveAllPermissions` returns `{ kind: 'approved' }` at insider.3
**P0 bug — permission contract broken (not in insider.3, fix in branch `squad/1191-fix-cli-permission-contract`):**

**GitNotesBackend anchor change:** Old code wrote notes on `HEAD` (lost on branch switch). New code uses `rev-list --max-parents=0 HEAD` (root commit as stable anchor). Caveat: per-instance `cachedAnchor` — if a new instance is created mid-session after HEAD changed, it still uses the cached root commit from that instance. Nondeterministic on repos with multiple root commits (unrelated histories merge).

**TwoLayerBackend architecture:** Orphan branch is the permanent read store; git notes are a best-effort commit-scoped annotation. `write/delete/append` all try orphan first (hard), then notes (swallowed catch). `read/list/exists` go to orphan only. `promote_to_permanent` concept: Ralph moves notes to orphan after PR merge.

- `isValidBackendType()` accepts legacy values, so parse-time validation passes
- Migration is transparent via `normalizeBackendType()` in `resolveStateBackend()`, but users whose config says `"git-notes"` now silently get orphan branch creation — a significant behavioral side-effect
- `'two-layer'` added (orphan permanent + git-notes best-effort annotation layer)
- `'git-notes'` removed as standalone type; migrated to `'two-layer'` via `normalizeBackendType()`
- `'worktree'` → `'local'` (WorktreeBackend.name also changed)
**StateBackendType rename (v0.9.4 → insider.3):**

- Upgrade flow (reads config.json): `packages/squad-cli/src/cli/core/upgrade.ts`
- MCP state command: `packages/squad-cli/src/cli/commands/state-mcp.ts`
- CLI permission handler: `packages/squad-cli/src/cli/shell/index.ts` (`approveAllPermissions`)
- State backend implementations: `packages/squad-sdk/src/state-backend.ts` (all 4 backends + adapter)
**Key code locations (insider.3):**

**Baseline clarification:** Tag `v0.9.6-insider.2` does not exist in the Squad repo. Only `v0.9.6-insider.3` is tagged (on `origin/feature/coordinator-as-agent`, commit `ce326d56`). Triage used `v0.9.4` as the prior stable baseline.

## 2026-05-31T14:09:11Z — State-backend insider.2→insider.3 triage

Data is the explicit Squad framework expert for this team. Data should learn from `C:\Users\tamirdresher\source\repos\squad`, including the Brady Squad repo's SDK/CLI design, governance files, prompt templates, and existing team decisions.

## Core Context

- **Created:** 2026-05-14T09:22:24.987+05:30
- **Stack:** Squad CLI/SDK, GitHub Copilot agent workflows, TypeScript/Node.js, prompt/runtime templates, client compatibility, agent orchestration
- **Project:** squad-squad
- **Owner:** Tamir Dresher

# Project Context



## 2026-06-03 — P0 Permissions fix: cherry-pick regression test onto PR #1192
- Inspected PR #1193 diff; identified regression test in `test/adapter-client.test.ts` as safe to extract (no type-rewrite dependency).
- Manually ported test to #1192 branch (worktree `C:\Users\tamirdresher\source\repos\squad-1191`); committed as `e1faf5d9`.
- Discovered local test failure is a worktree artifact: node_modules junction resolves `@bradygaster/squad-sdk` to the main repo's stale compiled dist; test is correct and CI passes.
- Pushed to `squad/1191-fix-cli-permission-contract`; all 5 CI checks green.
- Closed PR #1193 with comment pointing to #1192.
- Created skill `extract-test-from-competing-pr` and decision note `data-p0-fix-merged.md`.

### Squad.Agents.AI — Routing tests added (2026-06-02)

- Test file: `test/Squad.Agents.AI.Tests/SquadAgentRoutingTests.cs`.
- New tests: 5 routing-boundary tests; local suite moved from 14/14 to 19/19 passing.
- Commit: `3f5e61d6d15e5c603f76d3a6f34acb7f97ca025e` on `tamirdresher/squad` PR #3 branch `feature/squad-agents-ai`.
- Surprises: `SquadAgent` exposes routing only through SDK object state, so the tests validate the DI-created wrapper by reflecting the inner `CopilotClientOptions` and `SessionConfig`; `AgentName` is metadata on the inner agent while operational routing remains `CliPath`/`CliArgs`/`Cwd`/`Environment`, matching Decision 447.

## Learnings — 2026-06-02 Fresh-Path Two-Layer Baseline (insider.3)

**Test repo:** https://github.com/tamirdresher_microsoft/twolayer-fresh-test-20260602T1146 (private)

### Driver invocation patterns that worked
- `copilot --yolo --agent squad -p "<prompt>"` is the canonical non-interactive driver. `--yolo` = `--allow-all-tools --allow-all-paths --allow-all-urls`.
- `--yolo` auto-approves PERMISSION prompts but does NOT auto-respond to `ask_user`. In this run the Squad coordinator never invoked `ask_user` during Init Mode, so no workaround was needed. If a future build adds `ask_user` to Phase 1 confirmation, the driver will hang and the `--no-ask-user` flag becomes necessary (with attendant behaviour change).
- 5-minute timeout is plenty for most sessions; complex multi-agent sessions (3 spawns + tests) ran ~8 minutes. Size `initial_wait` accordingly.

### Gotchas with the test driver
- **`squad <subcommand> --help` EXECUTES the subcommand** instead of printing help. `squad init --help` will (re-)initialise squad in CWD. Always test new subcommand flags in a throwaway scratch dir.
- Insider builds do not lock to a tagged version — re-install with `npm install -g @bradygaster/squad-cli@<version>` is needed to switch between insiders.
- `squad init` on a repo where `.squad` already partially exists silently "creates" the new state files (Rai agent dir, memory tree) but skips existing ones. This can pollute a working tree if invoked accidentally.

### Two-layer behaviour on insider.3
- `--state-backend two-layer` flag IS recognised; config.json gets `"stateBackend": "two-layer"` cleanly with no duplicates.
- `squad-state` orphan branch IS created at init, pushed to remote on first push via the pre-push hook.
- Sync hooks installed: `pre-push`, `post-merge`, `post-rewrite`, `post-checkout`.
- MISSING: `pre-commit` and `post-commit` hooks (matches Picard WI-1 prediction).
- MISSING: `squad_state_*` MCP tools in `.copilot/mcp-config.json`. Coordinator agents (Scribe especially) explicitly detect this via `squad_state_health` check and refuse to hand-write mutable state — GRACEFUL failure but failure nonetheless.
- Init Mode itself bypasses the runtime bridge and writes `.squad/` files directly to the working tree. So even with two-layer chosen, the working tree comes out dirty on the very first init. This is INSIDER3-INIT-LEAK (new P1 finding).
- After 6 sessions of real work, the orphan `squad-state` branch still contains only `README.md` — zero state writes ever land on it. `refs/notes/squad/*` is empty too. Net effect: cross-session memory is broken.
- Branch-switch test (Phase 5 vs Bug #643) passes the surface symptom because state lives in a dirty working tree (which carries across branches), NOT because the orphan branch holds it. `git stash` or `git clean -fdx` would erase everything.

### Bug A re-examination needed
- Copilot CLI 1.0.57 (well above the 1.0.54 trigger threshold) under `--yolo` — all agent spawns, file edits, shell commands ran cleanly across 6 sessions. Bug A's "all agent ops fail/hang" symptom did NOT manifest. Either `--yolo` bypasses the per-call permission `kind` handler, or the original repro is environment-specific. Before claiming insider.4 "fixes" Bug A, build a focused regression that reproduces the failure WITHOUT `--yolo` first.
