# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## 2026-06-02 — Squad.Agents.AI Auth Expansion Proposal (CLEARED)

**Verdict:** PROPOSAL (Decision merged to `.squad/decisions.md`)

**Research Outcome:**
- 11-auth-mode inventory (5 pass-through, 2 awkward, 4 blocked) from Copilot SDK auth surface
- Gap analysis: 4 modes currently supported; 5 modes blocked (BYOK + UseLoggedInUser)
- 3 extension-point candidates evaluated; Candidate 1 (configure delegate `Action<CopilotClientOptions>`) recommended
- 8 invariants (F1–F8) identified for routing protection; convention-only enforcement proposed
- Open questions for Picard (BYOK scope, naming) and Worf (security gates) answered via reviewer gates
- Migration risk: LOW (all changes additive to unpublished v0.1-preview)

**Next:** Data will implement; Picard and Worf will gate implementation PR.

## Learnings

### PR #3 Round 1 — Cleanup + multi-named connections (2026-06-02)

- PR body rewrite: before 3,112 chars; after 1,779 chars as read back from GitHub. Initial scrub scan flagged 13 suspect lines; post-edit strict scan found 0 remaining internal/wrong-surface refs.
- README scrub summary: removed public `.squad/` wording, switched quickstart to ambient signed-in Copilot auth with no token, linked GitHub Copilot SDK auth docs, marked `GitHubTokenProvider`/`GitHubToken` advanced only, and narrowed later-preview language to multi-targeting + Aspire telemetry.
- XML warnings: baseline `dotnet build src\\Squad.Agents.AI\\Squad.Agents.AI.csproj -c Release` reported 0 CS1591 warnings; final sequential build also had 0 warnings. Added XML docs for the new public named-connection overloads while changing the API.
- `cliArgs` verdict: already worked end-to-end (`SquadConnectionFactory` parses, options configurator merges, `SquadAgent` copies to `CopilotClientOptions.CliArgs`); added a code comment and regression test `AddSquadAgent_CopiesConnectionStringCliArgsToCopilotClientOptions`.
- Multi-named connection contract: `AddSquadAgent("research")` reads `ConnectionStrings:squad-research`; default `AddSquadAgent()` keeps `ConnectionStrings:squad`. Tests added: `AddSquadAgent_WithName_BindsNamedConnectionString` and `AddSquadAgent_WithName_UserCallbackOverridesNamedConnectionString`.
- Verification: final sequential `dotnet build` succeeded with 0 warnings; final `dotnet test` succeeded with 22 tests. 60s PR check watch: ubuntu + docs passed; windows + repo test still pending, no failures observed.
- Commit: `88424b79d7cc532d8d23b70f80a002dc7800fc05` (`docs+fix: PR #3 review pass — hygiene, XML docs, cliArgs, multi-named connections`) pushed to `origin/feature/squad-agents-ai`.

### Squad.Agents.AI — Release-readiness docs pass (2026-06-02)

| Doc item | Phase 1 status | Action taken |
|---|---|---|
| Package README | 🟡 partial | Rewrote to a tight 80-line NuGet README with purpose, install, quickstart, prereqs, config, links, package contents, and v0.2 deferrals. |
| XML docs on four public types/members | 🟡 partial | Added concise summaries, params, returns, and examples across `SquadAgent`, `SquadAgentOptions`, `SquadConnectionFactory`, and DI extensions without changing executable code. |
| Repo-root README mention | 🔴 missing | Added a short `.NET package preview` section linking to `src/Squad.Agents.AI/README.md`. |
| CHANGELOG v0.1-preview entry | 🟡 partial | Added `## [0.1.0-preview] - 2026-06-02` with public surface and PR #3 lineage. |
| LICENSE packaging | 🟡 partial | Kept MIT expression and packed the root `LICENSE` into the `.nupkg`. |
| .csproj packaging metadata | 🟡 partial | Set `Authors`, `PackageProjectUrl`, `RepositoryUrl`, requested tags, and packed README/LICENSE. |
| Sample app / quickstart | 🟡 partial | Kept the consumer path as README quickstart rather than adding a sample project. |

What changed in target repo `tamirdresher/squad`: docs/metadata-only commit `6f8994e5740a5b5149836efc2cb8d01e29b5bf58` on `feature/squad-agents-ai`.

Pack verification observations: `dotnet build` and `dotnet pack` succeeded; `Squad.Agents.AI.0.1.0-preview.nupkg` contained `README.md`, `LICENSE`, and `lib/net10.0/Squad.Agents.AI.xml`; nuspec metadata showed `authors=Tamir Dresher`, tags `squad agents ai copilot maf multi-agent`, and `<readme>README.md</readme>`, so NuGet README rendering is wired correctly.

Push/check observations: local `origin` points at upstream `bradygaster/squad`, so PR #3 push used the `fork` remote for `tamirdresher/squad`; initial push required switching GitHub auth to `tamirdresher`, then auth was restored. The 60s PR check watch ended with no failures; three checks were green and `Squad CI/test` was still pending.

### PR #3 Round 2 — Keyed DI, BYOK, routing gate, security hardening (2026-06-03)

**Commit:** `4ac667cd` on `feature/squad-agents-ai` (pushed to `tamirdresher/squad`)

**Changes implemented:**
- **ConfigureCopilotClient** (`Action<CopilotClientOptions>`) delegate on `SquadAgentOptions` — BYOK extension point (Picard C2 scope-expanded to v0.1)
- **Routing gate** (Picard C1): snapshot/restore `Cwd`/`CliPath`/`CliArgs` after delegate runs; LogWarning on changes (SC-3)
- **Keyed DI**: 4 `AddKeyedSquadAgent` overloads using .NET 8+ `ServiceDescriptor` with `serviceKey`; shared `RegisterOptionsInfrastructure` helper
- **Environment credential leak fix** (SC-1/SC-2): `[JsonIgnore]` on `Environment`, `GitHubTokenProvider`, `ConfigureCopilotClient`; `ToString()` redacts token-pattern keys
- **Extensibility seam comment** (Picard C3) in `SquadAgent.CreateCopilotClient`
- **21 new tests** (43 total): 9 security redaction (SC-7/SC-8), 5 keyed DI, 7 BYOK/routing gate
- **README**: streaming, keyed DI, BYOK, security sections; updated options table

**Auth gate compliance:** Picard C1-C4 ✅, Worf SC-1 through SC-8 ✅. SC-9 (CopilotClientOptions.ToString) deferred — SDK type; not controllable from Squad wrapper.

**Verification:** `dotnet build` 0 warnings 0 errors; `dotnet test` 43 passed 0 failed. PR body updated with Round 2 section.

---
**Last Updated:** 2026-06-03  
**Archive:** `.squad/agents/data/history-archive.md` (detailed research notes)


## Learnings — 2026-06-02 Upgrade-Path Two-Layer Baseline (insider.3)

**Test repo:** https://github.com/tamirdresher_microsoft/twolayer-upgrade-test-20260602T1308 (private)
**Report:** validation/UPGRADE-PATH-BASELINE-INSIDER3-REPORT.md in test repo
**Driver:** copilot --yolo --autopilot --agent squad -p "..." — --autopilot confirmed real flag in copilot 1.0.57 help; behaviour indistinguishable from --yolo alone in these runs (Init Mode never invoked sk_user).

### What squad upgrade --self --insider --state-backend two-layer actually does on insider.3
- Attempts 
pm install -g @bradygaster/squad-cli@insider (which often EPERMs on Windows because the squad binary is in use).
- Prints CONTRADICTORY status: ⚠️ Upgrade failed IMMEDIATELY followed by ✅ Upgraded. Exit code 0 regardless.
- DOES NOTHING ELSE. Specifically:
  - Does NOT write stateBackend to .squad/config.json (flag is silently ignored — Seven's #1185 / Finding 1.2 confirmed at upgrade level).
  - Does NOT create the squad-state orphan branch.
  - Does NOT install ANY hooks (not even the sync hooks that fresh-init on two-layer installs).
  - Does NOT migrate .squad/decisions.md, agent histories, casting/routing/team state to the new layer.
  - Does NOT modify .copilot/mcp-config.json.

### What squad upgrade SHOULD do on a backend-change flag
1. Update config.json (merge, not append — guard against Bug E duplicate keys).
2. Run the new backend's initializer (orphan branch, sync hooks, pre/post-commit hooks, MCP registration).
3. **Migrate pre-existing state** from old layer to new layer — without this, post-upgrade agents cannot see pre-upgrade decisions.
4. Fail loudly on any step failure — don't print ✅ after ⚠️.

### Upgrade vs fresh-init delta (both on insider.3, both targeting two-layer)
- Fresh init: config flag honoured ✅, orphan branch created ✅, 4 sync hooks installed ✅, pre/post-commit MISSING ❌, MCP bridge broken at runtime ❌.
- Upgrade: config flag IGNORED ❌, NO branch ❌, ZERO hooks ❌, MCP bridge same broken ❌, pre-existing state STRANDED ❌.
- → Upgrade path is strictly WORSE than fresh init.

### Mid-session SDK fallback observation
- When agents detect MCP bridge broken, they refuse to hand-write state (correct governance).
- But in session 6, Spock fell back to invoking the SDK directly via an inline 
ode script. THAT path DID succeed in creating the orphan branch + writing 1 inbox file + appending 1 history. So the SDK two-layer code path works; it's the **MCP bridge** that is broken (likely @bradygaster/squad-cli state-mcp does not actually expose the documented squad_state_* tools).
- Implication for insider.4: a useful regression is to call 
ode -e "import('@bradygaster/squad-cli').then(m => m.startStateMcp())" and verify the MCP handshake actually advertises the tools.

### Driver flag note
- --autopilot is a real Copilot CLI flag (verified in copilot --help); auto-continues up to 5 messages by default (--max-autopilot-continues 5). Combined with --yolo it produced no hangs and no sk_user blocks across all 6 sessions. Use both as belt-and-suspenders per Tamir's directive.

### EVIDENCE-FIRST rule earned its keep
- Without the post-upgrade observability capture (config.json diff, hook listing, branch listing, notes listing), the "✅ Upgraded" stdout line would have been the only signal — and it was wrong. The full bug picture only emerged after running the capture script. Bake this into every upgrade test.


## 2026-06-02T14:59:33.169+03:00 — Combined fix branch for state-backend P0 bugs

**Mission**: bundle all known state-backend P0 fixes onto `squad/state-backend-upgrade-fixes` (PR #1200) with a local tarball for validation.

**Done**:
- Cherry-picked PR #1192 (approve-once + regression test) → `70a37812` + `e0291f3f`
- UPGRADE-EPERM-FALSE-SUCCESS → `cf99139e`: `selfUpgradeCli` throws on EPERM/EACCES/EBUSY (detected via `.code` AND regex — Windows `npm install -g` gives inconsistent signals); `cli-entry` upgrade-self wrapped in try/catch + `process.exit(1)`
- WI-1 → `e2ff8277`: `HOOK_TEMPLATES` now has 6 hooks (added `pre-commit` + `post-commit`); `ensureHooksForBackend` retrofits any missing hook
- UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION → `e010b161`: `migrate-backend.ts` full rewrite — accepts worktree/local → orphan/two-layer; migrates `decisions.md` + `agents/<n>/history.md` onto `squad-state` orphan via git plumbing using temp `GIT_INDEX_FILE` (`read-tree` → `hash-object -w --stdin` → `update-index --add --cacheinfo` → `write-tree` → `commit-tree` → `update-ref`); JSON-merges config (no duplicate keys); reinstalls hooks with force=true
- Lint clean, build clean, 16/16 new tests + existing self-upgrade tests pass
- `npm pack` → `C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz` (574 KB)
- Pushed to `tamirdresher/squad` (fork = PR head), updated PR #1200 title/body, commented on #1192

**Punted (architecturally heavy)**:
- MCP-BRIDGE-BROKEN — couldn't localize without reproduction. Two transport paths in `state-mcp.ts` both look correct.
- INSIDER3-INIT-LEAK — `init.ts` hand-writes via `fs.writeFile` instead of `runtimeState.write()`. Requires audit + SDK routing refactor.

**Gotchas**:
- 95 pre-existing full-suite test failures (e.g. `team-root-resolution.test.ts`) are environment-dependent and unrelated to changes — proceeded per failure-mode guidance.
- gh auth: `tamirdresher` is active for fork ops; switched back to `tamirdresher_microsoft` before squad-squad push.
- PowerShell: `grep` not on PATH (use `Select-String`); multi-Filter `Get-ChildItem` fails (use `Where-Object`).

**Artifacts**: manifest at `.squad/files/validation/COMBINED-FIX-BRANCH-MANIFEST.md`; decision at `.squad/decisions/inbox/data-combined-fix-branch.md`.

---

## 2026-06-02 — Bundle iteration 2: both punted P0s fixed

**Outcome**: ✅ MCP-BRIDGE-BROKEN (b987fe67) + INSIDER3-INIT-LEAK (e291b962) committed to squad/state-backend-upgrade-fixes. PR #1200 body updated. Head SHA 8ab9a305. Tarball refreshed (563 KB). 10 new regression tests pass.

**Key technique**: StdioServerTransport (MCP SDK) uses **newline-delimited JSON-RPC**, not LSP-style Content-Length framing. First repro used Content-Length and got silent no-response, hiding the real root cause. Switched to newline framing → all 7 tools registered correctly → proved server was fine.

**MCP-BRIDGE root cause**: 
pm view @bradygaster/squad-cli dist-tags → latest=0.9.4 / insider=0.9.6-insider.3. Template wrote unpinned 
px -y @bradygaster/squad-cli state-mcp → resolved to 0.9.4 → 0.9.4 has no state-mcp command. Config-level bug, not server. Fix: embed running CLI version into launch args at both init (SDK) and upgrade (CLI + retrofit via runEnsureChecks).

**INIT-LEAK root cause**: sdkInitSquad() runs BEFORE CLI writes stateBackend to config.json. SDK has no way to know the backend choice. Fix: post-hoc lift in CLI right after installGitHooks, reusing existing collectWorktreeState + writeFilesToOrphanBranch plumbing from migrate-backend.ts. Static files (charters, team.md, ceremonies.md, casting) preserved on disk.

**Gotchas**:
- uildMcpServerSpecs exists in TWO places (SDK init.ts + CLI upgrade.ts) — both needed the fix.
- Existing 	est/cli/upgrade.test.ts > 'preserves agent-frontmatter MCP config on upgrade' asserted the broken unpinned spec literally; relaxed to a regex tolerating any version.
- squad-squad pushes need 	amirdresher_microsoft auth; squad upstream pushes need 	amirdresher auth.

**Artifacts**: manifest updated at `.squad/files/validation/COMBINED-FIX-BRANCH-MANIFEST.md` (commit c4392e3); decision at `.squad/decisions/inbox/data-bundle-iteration-2.md`.

---

## 2026-06-02 — Workstreams Bootstrap: squad-agents-ai as first active workstream

**Mission:** Implement Picard's session-aware workstreams architecture (APPROVE_WITH_CONDITIONS, 7 conditions). Bootstrap `squad-agents-ai` as the first workstream without migrating the flat ledger. Additive-only: new directories, coordinator edits, tombstone `identity/now.md`, update `.gitignore`.

**Completed:**
- Created `.squad/workstreams/` directory tree: `README.md`, `_template/` (3 files + inbox), `evergreen/global/` (3 files + inbox), `active/squad-agents-ai/` (4 files + inbox).
- `active/squad-agents-ai/now.md` — live focus pointer (PR #3 R2, ConfigureCopilotClient delegate).
- `active/squad-agents-ai/decisions.md` — 8 seeded entries covering all R1/R2 work.
- Updated `.squad/identity/now.md` → tombstone redirecting to workstream path.
- Added `.squad/workstreams/active/*/.session-lock` to `.gitignore` (Picard condition 2).
- Edited `.github/agents/squad.agent.md` — 5 surgical changes: session start, session catch-up, directive capture, new Workstream Discovery section, spawn templates.

**Picard conditions:**
- C1 SQUAD_WORKSTREAM env var as primary binding - done
- C2 .session-lock gitignored - done
- C3 Scoped git add in spawn template - done
- C4 Bootstrap 1 workstream only - done
- C5 Agent histories remain agent-global - done
- C6 now.md tombstone at identity/now.md - done
- C7 Worf security review of advisory lock - DEFERRED

---
