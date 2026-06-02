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

---
**Last Updated:** 2026-06-02T10:50:37Z  
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
