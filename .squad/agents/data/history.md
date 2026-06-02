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

## 2026-06-02 — Tarball smoke 1/2: travel-assistant (Node project) patterns

**Outcome**: 5 ✅ / 1 ⚠️ / 1 ❌ / 1 BLOCKED — bundle measurably improves baseline but does NOT install as-shipped, and MCP-BRIDGE still broken on repos with pre-existing `.copilot/mcp-config.json`.

**Bug verdicts (vs insider.3 baseline)**:
- ✅ WI-1 hooks (all 6 installed on init AND on upgrade)
- ✅ UPGRADE-FLAG-IGNORED (`--state-backend two-layer` honored, config written)
- ✅ UPGRADE-NO-MIGRATION (10 files migrated to orphan; runtime Lisa read pre-upgrade decisions verbatim)
- ✅ UPGRADE-EPERM-FALSE-SUCCESS (`--self` exits 1 with `❌ Self-upgrade failed` — no more contradictory ✅)
- ✅ A/F-MIGRATION not manifested in this run
- ⚠️ INSIDER3-INIT-LEAK (lift commit migrated 10 files but new dirs `Rai/`, `memory/`, `rai/` still leaked)
- ❌ MCP-BRIDGE-BROKEN (root cause persists: `ensureSquadStateMcpPinned` only PINS existing entries, does NOT INSERT)
- 🚫 SDK init-time pinning fix NOT exercised (tarball declared `@bradygaster/squad-sdk@>=0.9.6-preview` which is unpublished → ETARGET; workaround via npm `overrides` forces SDK to insider.3 → SDK code path bypassed)

**Canonical 5-session test sequence (reusable for future tarball validations)**:
1. fresh-init: `squad init --state-backend two-layer` → capture config.json, hooks, branches, porcelain, mcp-config, orphan tree
2. session 1 ("build me a team from <fictional universe> for a TypeScript <domain> app") → Init Mode cast
3. session 2 ("Lead, draft a quick architecture proposal for <feature>") → Scribe write path 1
4. session 3 ("Tester, list edge cases for <feature>") → Scribe write path 2
5. pre-upgrade: separate duplicate, `squad init` (worktree default), 2 sessions accumulating state
6. `squad upgrade --self --insider --state-backend two-layer` → capture EPERM behavior
7. `squad upgrade --state-backend two-layer` (no `--self`) → capture migration + hook install
8. 2 post-upgrade sessions; first asks "summarize what we decided so far" → tests UPGRADE-NO-MIGRATION via runtime read

**Critical patterns**:

- **Tarball install workaround**: declares `@bradygaster/squad-sdk@>=0.9.6-preview`; per npm semver pre-release ordering `insider` < `preview`, so range excludes all published SDK builds → ETARGET. Sidecar `package.json` with `"overrides": { "@bradygaster/squad-sdk": "0.9.6-insider.3" }` then `npm install <tgz>` succeeds. Caveat: SDK-side fixes are NOT exercised.

- **`squad upgrade --self` and `--state-backend` coupling**: when `--self` aborts (EPERM on Windows always — current shell holds binary lock), the state-backend migration NEVER runs because `--self` aborts the whole command. Always test the two paths separately: `--self --insider` alone, then `--state-backend two-layer` alone.

- **Orphan branch path layout**: orphan tree is rooted WITHOUT the `.squad/` prefix. `git show squad-state:.squad/decisions.md` FAILS; `git show squad-state:decisions.md` SUCCEEDS. Same for `agents/<name>/history.md`. Validation scripts that include the `.squad/` prefix give false negatives.

- **Copilot autopilot commits node_modules**: `--yolo --autopilot` may `git add -A` and capture `.squad-tarball-wrap/node_modules/` containing the 140MB `copilot.exe` binary. Push hits GitHub 100MB hard limit. Defenses: (1) add `.squad-tarball-wrap/` + `node_modules/` to `.gitignore` immediately after install, (2) reset+squash to clean commit before pushing.

- **gh auth mid-session swap**: `copilot` sessions sometimes flip the active gh user. Always `gh auth switch --user tamirdresher_microsoft` after every copilot invocation before any git remote operation; otherwise `git push`/`git ls-remote` fail with `Repository not found`.

- **WI-1 hook bypass evidence**: Scribe committed `.squad/agents/*/history.md` + `.squad/decisions.md` directly (commits f6ca53d, 314b649) despite the pre-commit hook targeting those paths. Either `SQUAD_SYNC_ACTIVE=1` bypass used or hook silent no-op on Windows sh. Worth a Worf/Data-7 follow-up — current hook contract may not match runtime behavior.

- **ensureSquadStateMcpPinned does NOT INSERT**: only pins versions on EXISTING `squad_state` entries. On repos with pre-existing `.copilot/mcp-config.json` lacking squad_state (common for repos that used Copilot for non-Squad purposes first), MCP-BRIDGE-BROKEN persists across init AND upgrade. Iteration-3 fix needed: helper should add the entry if backend requires it.

- **Orphan branch never pushed to remote** in any of 5 sessions across both duplicates. Post-commit hook calls `squad sync --quiet` but no push evidence in `git log origin/squad-state`. Possibly silent failure or no-op; worth verifying what `squad sync` actually does in this bundle.

**Artifacts**:
- fresh-path duplicate: https://github.com/tamirdresher_microsoft/travel-assistant-tarball-test-20260602T1610
- upgrade-path duplicate: https://github.com/tamirdresher_microsoft/travel-assistant-upgrade-test-20260602T1610
- stable copy of final report: `.squad/files/validation/TARBALL-SMOKE-travel-assistant.md`
- decision drop: `.squad/decisions/inbox/data-tarball-smoke-travel-assistant.md`

---

## 2026-06-02T15:35:00+03:00 — Tarball smoke 2/2: multiplayer-sudoku (non-Node project) patterns

**Mission outcome:** 6 fixes confirmed, 2 new/incomplete-fix gaps surfaced.

### Patterns specific to non-Node-project tarball validation
- **Global `npm install -g <tgz>` cannot work** when the tarball's peerDependency (`@bradygaster/squad-sdk@>=0.9.6-preview`) isn't published. Workaround: `npm pack` the SDK from the source workspace and install both tarballs together: `npm install -g <sdk.tgz> <cli.tgz>`. If even that fails on EPERM (concurrent agent contention), use a local prefix: `npm install --prefix C:\path\.npm-prefix <sdk.tgz> <cli.tgz>` and prepend `<prefix>\node_modules\.bin` to `PATH`.
- **The MCP pin (`npx -y @bradygaster/squad-cli@<version>`) requires the version to exist on the npm registry** — local cache doesn't help because `npx` does a registry resolve first. So MCP-BRIDGE smoke-testing requires either publishing the preview/insider tag OR rewriting the pin to use a file path/local install. Document as a publishing prerequisite.
- **The post-commit hook calls `squad sync --quiet`** which is not a registered command in this bundle. The hook's `|| true` swallows the silent failure. This means installed hooks ≠ working sync. Always run `squad sync` manually after init to verify, and run a `main` commit + check `git log squad-state` to confirm propagation works end-to-end.
- **`ensureSquadStateMcpPinned` no-ops when the `squad_state` entry is absent.** For repos that have an existing `.copilot/mcp-config.json` (e.g. with only `EXAMPLE-github`), neither `squad init` nor `squad upgrade` adds the entry. Result: agents on those repos cannot reach the bridge regardless of backend. Recommend the fix should be: if backend requires the bridge, ADD the entry; otherwise pin.
- **`squad init` skips existing files** including `.copilot/mcp-config.json`, `team.md`, `casting/`, `routing.md`. This is correct for static files but means partial-init repos won't benefit from any new init-time wiring without `--force` or a separate ensure step. The lift fix (`liftInitMutableStateOntoOrphan`) DOES retroactively work even when init is mostly a no-op — it operates on whatever mutable state exists.
- **EPERM on `npm install -g` under concurrent agent runs is now exit-1 with no contradictory `✅ Upgraded`** — confirmed under real contention with travel-assistant peer. The fix is verified in the wild, not just in unit tests.
- **Source repo with pre-existing `squad-state` orphan branch:** when you push a fresh clone+init to a new duplicate, the remote already has the orphan (because the source had it). Local lift then re-creates it; you need `git push origin squad-state --force` to align. Document this in validation runbooks.


---

## 2026-06-02 — Iteration 3 (combined-fix tarball) closeout

**Mission:** close iter-2 gaps (sync command missing, MCP retrofit no-op when entry absent, tarball SDK dep unpublished), produce v0.9.6-preview.5 twin tarball, re-smoke, decide GO/NO-GO.

**Result:** 🟢 GO. GAP-1 + GAP-2 both closed; GAP-3 has workaround + tracked follow-up #1203.

### Commits shipped (`squad/state-backend-upgrade-fixes`)
- `3b44f45e` — registered `squad sync` in `cli-entry.ts` + rewrote `ensureSquadStateMcpPinned` to insert/update when entry missing/wrong
- `a0fa7e3e` — wired `ensureSquadStateMcpPinned` into `squad init` (in addition to `runEnsureChecks`)

### Key learnings to preserve for future iterations

1. **Recurring pattern: "code exists, wiring missing".** `runSync` was a complete pre-existing implementation in `packages/squad-cli/src/cli/commands/sync.ts` but had never been registered in `cli-entry.ts`. Whenever a command is documented but `Unknown command` happens at runtime, check the entry-point router first before assuming missing implementation.

2. **MCP-config retrofit has TWO call sites, not one.** The SDK `packages/squad-sdk/src/config/init.ts` writes `.copilot/mcp-config.json` via `writeIfNotExists` semantics — if the file already exists (common in real repos with other MCP servers), the SDK skips entirely. So any retrofit helper that ensures a specific entry MUST be called from BOTH `squad init` (CLI `core/init.ts`, after `liftInitMutableStateOntoOrphan`) AND `runEnsureChecks` (upgrade path). Iter-3 missed this initially — re-smoke caught it, requiring 0fa7e3e.

3. **Twin-tarball install pattern** (until #1203 lands): `npm install --prefix <dir> <sdk.tgz> <cli.tgz>` — both side-by-side. Single CLI tarball install fails ETARGET because CLI declares `@bradygaster/squad-sdk@>=0.9.6-preview` and per npm semver pre-release ordering, `insider` < `preview` so no published version satisfies.

4. **Auto-version bumping** — every `npm run build` bumps the patch. Iter-3 went preview.3 → preview.4 → preview.5. PR body, manifest, and tarball filenames all need to track this carefully. Always confirm the actual version with `squad --version` after install before writing reports.

5. **Re-smoke seeded state strategy** — pre-populating `.copilot/mcp-config.json` with only `EXAMPLE-github` (no `squad_state`) before running `squad init` reliably reproduces the GAP-2 insert-behavior condition without needing a full multi-session copilot drive. Useful low-cost validation pattern for MCP-related changes.

6. **`runSync` does NOT lift working-tree state.** It only push/pulls the orphan branch refs. The post-commit hook calling `squad sync --quiet` will be a no-op on local-only repos with no remote — that's expected. The state-accrual mechanism is the **MCP bridge** (which is now reachable because GAP-2 is closed). When reporting on GAP-1, frame it as "hook stops failing silently", not "post-commit propagation works".

7. **gh auth dance for cross-account work:** `tamirdresher` for fork pushes (`tamirdresher/squad` — PR head); `tamirdresher_microsoft` for `tamirdresher_microsoft/squad-squad` (decisions/manifest). Always `gh auth switch --user <name>` before each push.

8. **`.squad/decisions/inbox/` is gitignored** — needs `git add -f` to commit decision drops to this repo.
## 2026-06-02T17:30:00+03:00 — Tarball validation 6/6 (tamir-squad-hq, worst-case retrofit)

Repo: `tamirdresher_microsoft/tamir-squad-hq` (Tamir's personal HQ — heavily pre-squadified).
Dup (kept): `tamir-squad-hq-tarball-test-20260602T183202`. Twin tarballs at 0.9.6-preview.5.

**Verdict: 🟢 Gap 2 retrofit nailed the worst case.** Pre-existing `.copilot/mcp-config.json` had 5 user-added MCP servers (azure-devops, bitwarden, bitwarden-shadow, EXAMPLE-trello, chrome-devtools), no `squad_state`. Post-upgrade: all 5 preserved untouched + `squad_state` inserted with correct pin `@bradygaster/squad-cli@0.9.6-preview.5`. Zero clobbering.

Upgrade migrated decisions.md (~1 MB) + 17 agent histories to orphan branch in one shot. `stateBackend: two-layer` added cleanly (no Bug E). 6/6 hooks installed; pre-commit actively blocked illegal commits of `.squad/decisions.md`. `--self` exited 1 loudly on EPERM (UPGRADE-EPERM-FALSE-SUCCESS fix confirmed).

4 continuity sessions: agents READ pre-upgrade decisions correctly (session 1 surfaced March 2026 Picard inter-squad protocol + Seven patent assessment). Orphan branch did not grow across any session — Scribe explicitly refused in session 4: *"STATE_BACKEND is two-layer but the squad_state_* runtime tools aren't available in this Copilot CLI session, so Scribe refused to hand-write mutable state."* This is correct governance.

state-mcp server itself works (verified via direct JSON-RPC — all 7 tools register). The runtime MCP loading gap is NOT a regression of this PR and NOT caused by retrofit; it's in Copilot CLI's MCP discovery/loading layer. Recommend separate follow-up.

Reports: `.squad/files/validation/TARBALL-FULL-tamir-squad-hq.md` (full) + inbox drop `.squad/decisions/inbox/data-tarball-full-tamir-squad-hq.md`. Snapshots at `C:\Users\tamirdresher\squad-validation\snapshots-squadhq-20260602T183202\` include PRE/POST of mcp-config.json showing exact retrofit behavior.
