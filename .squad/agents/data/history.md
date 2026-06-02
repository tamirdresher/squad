# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## 2026-06-02 — Squad.Agents.AI Auth Expansion Proposal (CLEARED → see archive)

11-mode auth inventory; Candidate 1 configure-delegate recommended; Picard + Worf gated; implemented in PR #3 R2 (`4ac667cd`). Full research notes archived in `history-archive.md`.

## Learnings — 2026-06-02 Upgrade-Path Two-Layer Baseline (insider.3) → see archive

`squad upgrade --self --insider --state-backend two-layer` prints contradictory ⚠️/✅ (exit 0), does NOT update config/hooks/branch/MCP. Upgrade strictly worse than fresh init. MCP bridge broken (npm 0.9.4 lacks state-mcp cmd). Full bug analysis + fix strategy in `history-archive.md`.
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
