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

### Bradygaster tracking issue posted (2026-06-02)

- **Bullet fix**: DI registration bullet replaced (line 77) with comprehensive three-shape summary: default, named, and keyed registration
- **gh auth**: Verified active account is 	amirdresher (personal)
- **Issue created**: bradygaster/squad#1205 — https://github.com/bradygaster/squad/issues/1205
- **Label outcome**: type:feature applied successfully
- **Body verification**: Extracted markdown body (lines 60–102) matches draft, posted without modifications

### Urgent fix: Mangled backticks on bradygaster/squad#1205 (2026-06-02)

- **Root cause**: PowerShell backtick escape-char ate inline `` `Squad.Agents.AI` `` → `\Squad.Agents.AI\` and mangled inline code references like `RunAsync` → `\^Ggent.RunAsync\` (character loss in piped strings)
- **Extraction method**: Bypassed PowerShell string piping entirely; used Node.js `readFileSync` on draft file, extracted markdown block via regex `/```markdown\r?\n([\s\S]*?)\r?\n```/m` (CRLF-aware for Windows), wrote to temp file, zero string interpolation
- **Pre-fix backtick count**: Draft had 30 real backticks, 0 backslashes (verified via Node.js)
- **Live issue edit**: Switched auth from tamirdresher_microsoft (EMU, blocked) → tamirdresher, then `gh issue edit 1205 --repo bradygaster/squad --body-file $env:TEMP\bradygaster-issue-1205-fix.md`
- **Exit code**: 0 (success)
- **Post-fix verification**: Live issue body now shows 30 backticks, 0 backslashes ✓ (confirmed via `gh issue view ... --json body --jq` piped to Node.js counter)
- **Cleanup**: Deleted temp file `$env:TEMP\bradygaster-issue-1205-fix.md`
- **Lesson**: PowerShell here-strings, Get-Content with default encoding, and cmd.exe pipes WILL mangle backticks in Markdown. Node.js file I/O + regex extraction + binary file write is the clean workaround for GitHub issue body corrections.

---

**Last Updated:** 2026-06-02T20:58:00+03:00

## 2026-06-02T20:58:00+03:00 — Tracking Issue #1205 Live & Clean (Belanna-6 & Belanna-7 Final)

**Status:** Issue posted successfully; backtick bug fixed; live clean at https://github.com/bradygaster/squad/issues/1205.

- belanna-6: Posted tracking issue to bradygaster/squad with type:feature label
- belanna-7: Fixed mangled backticks via Node.js extraction + `gh issue edit` (exit 0, clean post-fix verification)

**Next:** Monitor bradygaster/squad#1205 for Brady's signal. If `go:yes`, Tamir opens cross-fork PR targeting bradygaster/squad:dev.

---

### Cross-fork PR opened: bradygaster/squad PR #1207 (2026-06-02)

**Execution:** Tamir directive `"yes, just remove the 'The implementation lives in my fork: tamirdresher/squad#3.' and then make the PR"` — TWO atomic operations completed:

1. **Cross-fork PR created** → https://github.com/bradygaster/squad/pull/1207
   - Head: `tamirdresher:feature/squad-agents-ai`
   - Base: `bradygaster/squad:dev`
   - Title: `feat: Squad.Agents.AI - Microsoft Agent Framework adapter for the Squad CLI`
   - Body: 4126 chars, prepended `Closes bradygaster/squad#1205` line (upstream convention)
   - Backticks: 88 verified in prepared body; 29 lines with backticks confirmed on live PR
   - Auth: tamirdresher (personal), not tamirdresher_microsoft (EMU block bypassed via `gh auth switch`)

2. **Issue #1205 fork-reference line trimmed** → https://github.com/bradygaster/squad/issues/1205
   - Target line: `The implementation lives in my fork: [tamirdresher/squad#3](https://github.com/tamirdresher/squad/pull/3).`
   - Trim method: PowerShell pipeline filter (Node.js had temp-file encoding issues); removed 147 chars (2526 → 2379 bytes)
   - Verification: `gh issue view 1205 ... --jq '.body | contains("The implementation lives in my fork")' → false` ✓
   - Companion comment posted on issue: "Companion PR opened — see linked PR above. Happy to adapt structure or placement based on your preference."

**Verification Checklist:**
- ✅ Auth account: tamirdresher (personal, NOT EMU)
- ✅ dev branch exists: `gh api repos/bradygaster/squad/branches/dev --jq '.name'` → `dev`
- ✅ PR body "Closes" link prepended: confirmed in live PR via grep
- ✅ PR backticks: 29 lines with backticks on live PR (no mangling)
- ✅ Issue fork-line removed: `contains()` test returns `false`
- ✅ Comment posted on issue: exit 0
- ✅ Temp files cleaned: 4 files deleted

**Gotchas for Tamir's GitHub.com review:**
1. PR #1207 body shows 4126 chars; first line is `Closes bradygaster/squad#1205` followed by separator (`---`), then full What/Why/How/Sample structure
2. Issue #1205 now clean (fork reference removed); companion comment visible below issue body
3. Auth remains on tamirdresher (personal) per instructions; do NOT switch back to EMU

**Last Updated:** 2026-06-02T21:05:00+03:00

---

## 2026-06-03T07:55:04+03:00 — Drafted Teams DMs to MAF team in Tamir's voice

**Deliverable:** Two length variants (short ~65w, medium ~130w) ready to paste into Teams DM.

- **Variant A:** Quick ping — "hey [name], built X, would value your eyes, here's the link, is it useful?"
- **Variant B:** Bit more context — Names the thing, says what it does, asks 3 specific questions (API shape / blockers / scenarios), signs off naturally
- **Artifacts:** `.squad/workstreams/active/squad-agents-ai/decisions/inbox/belanna-maf-teams-dm-drafts.md`

**Key voice choices applied:**
- Lowercase "i" in both (`i built`, `i'd`) — natural typing, not faked
- Casual punctuation — fragments with dashes, no formal closers
- Direct asks — no hedging language ("I'd love if you could maybe..."), just straight Tamir ("curious if", "really love your take on")
- Zero AI-isms — avoided "excited to share", "Looking forward to", "Hope all is well", "Just wanted to reach out"
- Peer-to-peer — assumes audience knows MAF, AIAgent, DI registration terminology; no over-explanation
- One PR reference per draft — not peppered through
- Left rough on purpose — maintains his rhythm without forced typos

**Tamir ready to use:** Copy one variant, replace `[colleague name]`, paste into Teams. Choice between A (for close colleagues he pings often) or B (for people he respects but doesn't message daily).

## Learnings

- Drafted Teams DM to MAF team in Tamir's voice — captured key voice patterns: lowercase i, casual punctuation, no AI-isms, peer-to-peer tone.

### Drafted Teams group chat ask to Shawn/Glenn for MAF review (2026-06-03)

- **Artifact:** `.squad/workstreams/active/squad-agents-ai/decisions/inbox/belanna-shawn-glenn-maf-review-ask.md`
- **Chat:** "Brady, Glenn, and Shawn" — chatId `19:d00f3ddc39ac4e9c95e3b49e83c5b11d@thread.v2`
- **Anchor message:** Shawn Henry, 2026-05-31 08:47 (re: reviewing commandline.ms docs and API shape)
- **Draft length:** ~60 words, opens with `hey Shawn, Glenn —` to bridge existing thread momentum
- **Concrete ask:** MAF-expert eye on PR #1207, confirm API shape + no workflow breakage
- **Status:** DRAFT ONLY — no Teams message posted, file saved for Tamir approval before send

---

## 2025-07-09 — iter-9 Dogfood Smoke Test: v0.9.6-preview.15 (PR #1200)

**Status:** ✅ COMPLETE — APPROVE recommended

**Test:** 6-repo dogfood validation of `@bradygaster/squad-cli@0.9.6-preview.15` + `@bradygaster/squad-sdk@0.9.6-preview.15`. Local test clones only (`C:\Users\tamirdresher\squad-validation\iter9-dogfood\`), originals untouched.

### Results Matrix

| Repo | Command | From | Exit | .mcp.json | Tombstone | Runtime | Score |
|------|---------|------|------|-----------|-----------|---------|-------|
| travel-assistant | upgrade | 0.9.4-insider.1 | 0 | ✅ | ✅ | ✅ | ✅ |
| holocaust-research-wasserman | upgrade | 0.8.25 | 0 | ✅ | ✅ | ✅ | ✅ |
| gh-ai-adoption2026 | upgrade | 0.9.4-insider.1 | 0 | ✅ | ✅ | ✅ | ✅ |
| squad-ai-vulns | init* | N/A | 0 | ✅ | ✅ | ✅ | ⚠️ |
| multiplayer-sudoku | upgrade | 0.9.4-insider.1 | 0 | ✅ | ✅ | ✅ | ✅ |
| tamir-squad-hq | upgrade | 0.9.6-preview.11 | 0 | ✅ | ✅ | ✅ | ✅ |

*Repo 4 ran `init` — NTFS colon-in-filename blocked checkout of `.squad/decisions/resolved/2026-05-16T00:50Z-upstream-blockers.md`

### Runtime Verification (repo 1, v0.9.6-preview.15)

- MCP server starts and responds ✅
- 7 tools exposed: `squad_decide`, `squad_state_read/write/append/delete/list/health` ✅
- `squad_state_health` → `FSStorageProvider` ✅
- `squad_state_read config.json` → `{"version":1}` ✅
- HOME mcp-config.json SHA256 unchanged (byte-identical) ✅

### Key Findings

1. **`@insider` dist-tag fallback** — Tarball installs write `@bradygaster/squad-cli@insider` to `.mcp.json`. `@insider` currently resolves to `0.9.6-insider.3`. Registry users not affected. Follow-up polish item, non-blocking.
2. **NTFS colon-in-filename** — Pre-existing issue in `squad-ai-vulns` repo: ISO 8601 timestamps with `:` in decision filenames are illegal on Windows. Not a CLI regression. Recommend hyphen-based timestamp convention for decision files.
3. **`stateBackend: "two-layer"` not written** — Config stays `{"version":1}`. Current impl uses `FSStorageProvider`. Two-layer was older spec expectation, superseded.

### Artifacts

- Full report: `.squad/files/validation/SMOKE-ITER9-6REPO-DOGFOOD.md`
- Decision drop: `.squad/workstreams/active/squad-agents-ai/decisions/inbox/belanna-iter9-dogfood-results.md`

**Last Updated:** 2025-07-09
