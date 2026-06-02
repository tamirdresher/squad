# Two-Layer State Backend — Consolidated Baseline Report (insider.3)

**Date:** 2026-06-02
**Squad CLI version under test:** @bradygaster/squad-cli@0.9.6-insider.3
**Copilot CLI version under test:** 1.0.57
**Author:** Data (Squad Framework Expert)
**Requested by:** Tamir Dresher

## Executive Summary

Two-layer state backend on insider.3 **fails its core contract on both the fresh-init path and the upgrade path**. Fresh init at least sets the `stateBackend` config key, creates the `squad-state` orphan branch, and installs four sync hooks (pre-push, post-merge, post-rewrite, post-checkout); but the `squad_state_*` MCP runtime bridge is non-functional, the commit-side hooks (pre-commit, post-commit) are missing, and Init Mode leaks `.squad/` mutable state into the working tree. The upgrade path is **strictly worse**: `squad upgrade --state-backend two-layer` silently ignores the flag, performs no migration, installs zero hooks, leaves the config untouched, and prints `✅ Upgraded` immediately after `⚠️ Upgrade failed` while exiting 0 on an EPERM `npm install -g`. Across 12 real agent sessions (6 fresh + 6 upgrade) the orphan branch received exactly two real writes; `decisions.md` never reached the orphan branch in either scenario; one post-upgrade Spock session said verbatim "this decision lives only in this chat, not in the ledger."

## Test Repositories (browsable proof)

| Scenario | Repo | Report |
|---|---|---|
| Fresh path  | https://github.com/tamirdresher_microsoft/twolayer-fresh-test-20260602T1146  | [FRESH-PATH-BASELINE-INSIDER3-REPORT.md](https://github.com/tamirdresher_microsoft/twolayer-fresh-test-20260602T1146/blob/main/validation/FRESH-PATH-BASELINE-INSIDER3-REPORT.md) |
| Upgrade path | https://github.com/tamirdresher_microsoft/twolayer-upgrade-test-20260602T1308 | [UPGRADE-PATH-BASELINE-INSIDER3-REPORT.md](https://github.com/tamirdresher_microsoft/twolayer-upgrade-test-20260602T1308/blob/main/validation/UPGRADE-PATH-BASELINE-INSIDER3-REPORT.md) |

## Scenario 1 — Fresh path

### Setup
- Scratch dir: `C:\Users\tamirdresher\squad-validation\twolayer-fresh-20260602T1146`
- Backend selected via `squad init --state-backend two-layer` (flag honoured; `.squad/config.json` got `"stateBackend": "two-layer"` cleanly, no duplicates).
- Driver: `copilot --yolo --agent squad -p "<prompt>"`. `--yolo` = `--allow-all-tools --allow-all-paths --allow-all-urls`.
- First prompt: *"build me a team from the Star Trek universe for a Node.js TypeScript web app"*.
- 6 sessions executed (5 work prompts + 1 branch-switch pair).

### Sessions completed
| # | Prompt | Outcome | Elapsed |
|---|---|---|---|
| 1 | Star Trek team build | ✅ Spock/LaForge/O'Brien/Data + scribe/ralph/Rai cast; files written to working tree | 4m 0s |
| 2 | Spock — JWT login endpoint proposal | ⚠️ Proposal delivered; inbox file written; **Scribe REFUSED to persist** (two-layer bridge missing) | 3m 41s |
| 3 | O'Brien — Express `/api/health` route | ⚠️ Code shipped, `npm test` green; Scribe again refused state writes | 7m 55s |
| 4 | Data — edge cases for `/api/health` | ⚠️ List delivered; Scribe refused | 3m 35s |
| 5 | Spock — bcrypt vs argon2id | ⚠️ Decision (argon2id) made; coordinator **pre-emptively** refused even to write the inbox file ("persistence gap: two-layer state bridge isn't reachable") | 2m 49s |
| 6 | Phase 5 branch switch — Spock status report on `experiment` then `main` | ✅ State consistent across branches — **only because state lives in dirty working tree, not on the orphan branch** | 12m 28s |

### Key findings (verdict table)

| Claim | Verdict | Evidence |
|---|---|---|
| `--state-backend two-layer` flag honoured at init | ✅ | `.squad/config.json` written cleanly with no duplicate keys |
| Sync hooks installed (pre-push, post-merge, post-rewrite, post-checkout) | ✅ | All four present in `.git/hooks/` |
| `squad-state` orphan branch created and pushed | ✅ | Initial commit `ba434fd0` pushed to remote |
| Commit-side hooks installed (pre-commit, post-commit) | ❌ | Absent — Bug WI-1 confirmed |
| `squad_state_*` MCP tools available to agents at runtime | ❌ | Scribe halted in sessions 2–5 citing missing bridge |
| Orphan branch accrues content across sessions | ❌ | Remote `squad-state` still at initial commit after 6 sessions |
| `refs/notes/squad/*` populated | ❌ | None ever created |
| `decisions.md` updated by Scribe | ❌ | Inbox files accumulated; merge never happened |
| Agent `history.md` files appended | ❌ | Scribe blocked |
| Init Mode keeps working tree clean | ❌ | 5 modified + 4 untracked `.squad/` files after init (INSIDER3-INIT-LEAK) |
| `squad <cmd> --help` prints help | ❌ | Executes the command instead (INSIDER3-HELP-MISSING) |
| Branch switch (Bug #643 surface) | ✅ (false pass) | Works only because dirty working tree carries across branches |

### Bugs observed
- **WI-1 confirmed** — `squad_state_*` MCP server not wired into `.copilot/mcp-config.json`; pre-commit/post-commit hooks absent.
- **INSIDER3-INIT-LEAK (new, P1)** — Init Mode hand-writes `.squad/` to working tree even when `stateBackend: two-layer`.
- **INSIDER3-HELP-MISSING (new, P3)** — `squad init --help` re-initialised the squad-squad repo in CWD.
- **Bug A NOT observed under `--yolo`** — agents spawned, edited files, ran shell commands on Copilot CLI 1.0.57 (above the >1.0.54 trigger). Either Bug A is mis-characterised or `--yolo` bypasses the per-call `kind` check.

## Scenario 2 — Upgrade path

### Setup
- Scratch dir: `C:\Users\tamirdresher\squad-validation\twolayer-upgrade-20260602T1308`.
- Initial backend: **DEFAULT (worktree)** — `.squad/config.json` after `squad init` was just `{ "version": 1 }`, no `stateBackend` key.
- Driver: `copilot --yolo --autopilot --agent squad -p "<prompt>"` (autopilot added per 2026-06-02 user directive).
- Upgrade command: `squad upgrade --self --insider --state-backend two-layer`.

### Pre-upgrade state (3 sessions on worktree backend)
| # | Prompt | Outcome | Elapsed |
|---|---|---|---|
| 1 | Star Trek team build | ✅ Spock/Seven/LaForge/Data cast; routing/team/casting populated | 279 s |
| 2 | Lead — JWT login endpoint proposal | ✅ Proposal filed to inbox; Scribe merged to `decisions.md` (234 → 673 B) | 283 s |
| 3 | Backend — Express `/api/health` scaffold | ✅ `src/server.ts` + `src/routes/health.ts` + tsconfig; build verified; decision recorded (673 → 1105 B) | 588 s |

Worktree backend behaved correctly: every state change landed on `main` as a normal commit. Immutable pre-upgrade snapshot of `.squad/` (135 files) copied to `validation/pre-upgrade-snapshot/`.

### The upgrade outcome (verdict table)

`squad upgrade --self --insider --state-backend two-layer` → **exit code 0**, but stdout contained `⚠️ Upgrade failed. Try running manually: npm install -g @bradygaster/squad-cli@insider` IMMEDIATELY followed by `✅ Upgraded. Please restart your terminal for changes to take effect.` Underlying `npm install -g` failed with `EPERM` because the current shell's `squad` binary held the lock. `squad --version` after: `0.9.6-insider.3` (unchanged).

| Verdict point | Outcome | Evidence |
|---|---|---|
| `--state-backend two-layer` honoured? | ❌ **Silently ignored** | `.squad/config.json` IDENTICAL before/after: `{ "version": 1 }`. `git diff` empty. |
| Migration integrity (decisions verbatim on orphan branch)? | ❌ **No migration attempted** | `squad-state` branch did not exist post-upgrade; `git show squad-state:.squad/decisions.md` → `fatal: invalid object name`. |
| Pre-commit / post-commit hooks installed (WI-1)? | ❌ | `.git/hooks/` non-sample listing EMPTY. |
| Sync hooks (pre-push, post-merge, post-rewrite, post-checkout) installed? | ❌ | None present. **Strictly worse than fresh-init**, which installed all 4. |
| `squad_state` MCP bridge registered? | ⚠️ Pre-existing from init; upgrade did not touch it. Runtime detection: **non-functional** (see §post-upgrade). |
| Config clean (no duplicate keys, portable `teamRoot`)? | ⚠️ Partial — nothing written, so nothing to duplicate; Bug #1190 masked. |
| Working tree clean after upgrade? | ✅ | Only deliberate `validation/` files added. |

**Net effect:** the upgrade is functionally a **no-op for state-backend migration** — confirms Bug WI-1 at upgrade level + Seven's community-signal triage finding #1185.

### Post-upgrade continuity (3 sessions, what worked / what didn't)

Workaround applied (per failure-mode guidance): hand-edited `.squad/config.json` to add `"stateBackend": "two-layer"` and committed.

| # | Prompt | Outcome | Elapsed |
|---|---|---|---|
| 4 | Lead — "summarize what we decided so far" | ❌ **HARD FAIL** — Spock REFUSED. `squad_state_read` / `squad_state_list` unavailable. Per governance, refused to fall back to working-tree reads or fabricate. Pre-upgrade decisions invisible. | 81 s |
| 5 | Tester — 3 edge cases for `/api/health` | ✅ Stateless reasoning task; output produced. Persistence unverified. | 127 s |
| 6 | Lead — finalize JWT vs session cookie | ⚠️ **CONTENT-OK, PERSISTENCE-FAIL** — Spock produced final decision; Scribe REFUSED to persist via MCP. Spock then ran an inline `node` script to call the SDK directly: this DID create the orphan branch and write 1 inbox file + 1 history append, but `decisions.md` was NEVER updated. Final agent message: **"decision content above is final and correct, but it currently lives only in this chat, not in the ledger."** | 479 s |

**State on the orphan branch after all 6 sessions:**
```
$ git log squad-state --oneline
63733d0 Update agents/spock/history.md
000e334 Update decisions/inbox/spock-jwt-vs-session-cookie.md
e69fe7d Initialize squad-state branch
```
- `decisions.md` **NEVER** made it to the orphan branch (neither pre- nor post-upgrade).
- 6 of 7 agent histories never made it — only Spock's session-6 turn landed.
- Orphan branch **never pushed to remote**; no `origin/squad-state` ref.
- Hooks still absent → future commits on `main` will not auto-sync either.

### Bugs observed
- **UPGRADE-FLAG-IGNORED (new, P0)** — `--state-backend` silently no-op on upgrade.
- **UPGRADE-NO-MIGRATION (new, P0)** — pre-upgrade `decisions.md` / histories / casting not migrated; invisible to post-upgrade agents.
- **UPGRADE-EPERM-FALSE-SUCCESS (new, P0)** — contradictory `⚠️ Upgrade failed` + `✅ Upgraded` + exit 0.
- **UPGRADE-MCP-NO-OP** (probable, needs stripped-mcp-config repro) — upgrade does not register / repair `squad_state` MCP entry.
- **WI-1 confirmed worse** than fresh-path: zero hooks installed by upgrade.
- **MCP-BRIDGE-NON-FUNCTIONAL** — `squad_state` server registered but `squad_state_read` / `squad_state_list` / `squad_state_health` unavailable at session time (sessions 4 and 6).

## Cross-Scenario Bug Matrix

| Bug ID | Severity | Description | Fresh-path | Upgrade-path | Fix location |
|---|---|---|---|---|---|
| A | P0 | Permission contract approve-once regression | NOT manifested under --yolo (CLI 1.0.57) | NOT manifested under --yolo --autopilot | PR #1192 (merged?) — re-verify trigger before claiming user-visible fix |
| B | P1 | Hard throw on explicit backend failure (`resolveStateBackend()` rethrows) | not exercised (init succeeded) | not exercised (SDK only mid-session, succeeded) | PR #1132 (merged) |
| C | P1 | Silent git-notes→two-layer migration | N/A (explicit two-layer init) | N/A (no pre-existing `git-notes` config) | PR #1200 commit dc2b3f50 |
| D | P2 | Stale coordinator template names | not directly probed | not directly probed | PR #1132 (merged) |
| E | P2 | Duplicate `stateBackend` key after upgrade (#1190) | not exercised | ⚠️ MASKED by WI-1 (nothing written → nothing duplicated). Will resurface once WI-1 is fixed. | PR #1200 + #949 |
| F | P3 | Windows `toRelative` edge case | not observed | not observed | PR #1200 commit fc406355 |
| G | P3 | Backend hardening (retry / circuit-breaker) | not exercised | not exercised | branch squad/864 |
| WI-1 | P0 | Two-layer hooks not installed (pre-commit + post-commit) | ✅ MANIFESTED | ✅✅ MANIFESTED WORSE (zero hooks at all, not even sync) | NOT FIXED |
| INSIDER3-INIT-LEAK | P1 | Init Mode writes `.squad/` to working tree on two-layer | ✅ MANIFESTED | n/a (Init Mode did not run) | NOT FIXED |
| INSIDER3-HELP-MISSING | P3 | `squad <cmd> --help` executes the command | ✅ MANIFESTED | applies same way (not re-tested this run) | NOT FIXED |
| UPGRADE-FLAG-IGNORED | P0 | `--state-backend` silently ignored on `squad upgrade` | — | ✅ MANIFESTED | NOT FIXED |
| UPGRADE-NO-MIGRATION | P0 | upgrade doesn't migrate pre-existing state (decisions/histories/casting) | — | ✅ MANIFESTED (session-4 hard fail) | NOT FIXED |
| UPGRADE-EPERM-FALSE-SUCCESS | P0 | Contradictory exit signals on EPERM (`⚠️ failed` + `✅ upgraded` + exit 0) | — | ✅ MANIFESTED | NOT FIXED |
| MCP-BRIDGE-BROKEN | P1 | `squad_state_*` advertised in MCP config but tools unavailable at runtime | ✅ MANIFESTED (Scribe sess. 5) | ✅ MANIFESTED (Spock sess. 4; Scribe sess. 6) | NOT FIXED |

**Data inconsistency to reconcile:** the fresh-path report says the `squad_state` MCP server was NOT registered in `.copilot/mcp-config.json` at init; the upgrade-path report says it IS present after `squad init` on the default (worktree) backend. Possible causes: (a) different init code paths between the two backends, (b) snapshot-timing difference, (c) one of the two observations is wrong. Re-verify in insider.4 by inspecting `.copilot/mcp-config.json` immediately after `squad init` for both `worktree` and `two-layer` defaults.

## Cross-Session Continuity Verdict

On insider.3 two-layer, **state does not carry across sessions in any meaningful way**. The orphan branch accrued zero writes across 6 fresh-path sessions and only 2 writes (1 inbox file + 1 history append) across 6 upgrade-path sessions — and only because Spock manually invoked the SDK inline as a workaround. `decisions.md` never reached the orphan branch in either scenario. The definitive proof is the upgrade-path session 6 where Spock, after producing a final JWT-vs-session-cookie decision, told the user verbatim: **"decision content above is final and correct, but it currently lives only in this chat, not in the ledger."** Where state appeared to survive (fresh-path Phase 5 branch switch), it survived only because it lived in a dirty working tree — `git stash` or `git clean -fdx` would erase it.

## Insider.4 Must-Fix List (consolidated, prioritized)

1. **[P0] Honour `squad upgrade --state-backend <value>`** — `UPGRADE-FLAG-IGNORED`. Update `.squad/config.json` (JSON merge, not textual append, to also avoid Bug E), run the matching backend initializer (orphan branch, hooks, MCP registration), emit explicit per-step log lines, and fail loudly (non-zero exit) on any failure.
2. **[P0] Migrate existing state on cross-backend transitions** — `UPGRADE-NO-MIGRATION`. Copy `.squad/decisions.md`, all `.squad/agents/*/history.md`, and casting/routing/team metadata onto the new layer so post-upgrade agents can read pre-upgrade content.
3. **[P0] Fix the false-success EPERM path** — `UPGRADE-EPERM-FALSE-SUCCESS`. Pick one: fail and exit non-zero, OR succeed and exit 0; do not print `✅ Upgraded` after `⚠️ Upgrade failed`. Detect "binary in use" on Windows and tell the user to close other squad shells.
4. **[P0] Install `pre-commit` + `post-commit` hooks when backend is two-layer** — `WI-1`. Required on BOTH fresh init and upgrade. Without them, working-tree commits never flow into the orphan branch.
5. **[P0] Wire `squad_state_*` MCP server into `.copilot/mcp-config.json` at init time** when `stateBackend != worktree` (fresh-path observation) — also re-verify the upgrade-path discrepancy noted above.
6. **[P1] Make the `squad_state` MCP bridge actually expose `squad_state_read` / `squad_state_list` / `squad_state_health`** — `MCP-BRIDGE-BROKEN`. Server is registered but agents detect tools as unavailable at session time. Verify `@bradygaster/squad-cli state-mcp` performs the MCP handshake correctly.
7. **[P1] Fix Init Mode to write through the runtime bridge**, not the working tree, when `two-layer` is selected — `INSIDER3-INIT-LEAK`.
8. **[P1] `squad doctor` cross-checks** (per Seven): when `stateBackend=two-layer`, verify orphan branch exists locally + on remote, both commit hooks installed, MCP server resolves the documented tools.
9. **[P1] Push the orphan branch and `refs/notes/squad/*` to `origin`** on backend init / first write so team-state is collaborative, not per-machine.
10. **[P2] Resolve Bug E (duplicate `stateBackend` key)** before fixing the P0 #1 above — otherwise repeated upgrades will accumulate duplicate keys.
11. **[P3] Fix `squad <subcommand> --help`** to print help, not execute the command — `INSIDER3-HELP-MISSING`.
12. **[P3] Re-examine Bug A trigger conditions** under non-`--yolo` invocation before claiming PR #1192 is the user-visible fix.

## What insider.4 Re-run Will Prove

For each P0/P1 fix above, the demonstration step:

- **#1 UPGRADE-FLAG-IGNORED:** `squad upgrade --state-backend two-layer` on a worktree-init repo → `.squad/config.json` shows `"stateBackend": "two-layer"`, exit 0, explicit log lines emitted.
- **#2 UPGRADE-NO-MIGRATION:** after upgrade, `git show squad-state:.squad/decisions.md` returns the pre-upgrade contents (3 decision entries verbatim).
- **#3 UPGRADE-EPERM-FALSE-SUCCESS:** force the `npm install -g` EPERM (run a second squad shell to hold the lock); upgrade exits non-zero AND stdout shows only the failure message, no `✅ Upgraded`.
- **#4 WI-1:** after fresh init OR upgrade on two-layer, `ls .git/hooks/` shows pre-commit + post-commit (alongside the four sync hooks). Make a working-tree commit; observe the change propagated to `squad-state` orphan branch automatically.
- **#5 MCP wiring:** after `squad init --state-backend two-layer`, `.copilot/mcp-config.json` contains `mcpServers.squad_state` (and same after `squad upgrade --state-backend two-layer`).
- **#6 MCP-BRIDGE-BROKEN:** run `copilot --yolo --agent squad -p "Lead, summarize decisions so far"` post-upgrade; Spock returns a real summary instead of refusing. Equivalently, `squad_state_health` reports green.
- **#7 INSIDER3-INIT-LEAK:** `git status` immediately after `squad init --state-backend two-layer` is clean (no modified/untracked `.squad/` files).
- **#8 doctor:** `squad doctor` on a deliberately broken two-layer setup flags exactly which of {orphan branch, commit hooks, MCP server tools} are missing.
- **#9 remote push:** after first state write, `git ls-remote origin refs/heads/squad-state` and `refs/notes/squad/*` return non-empty.

## Validation Methodology

- **Driver:** `copilot --yolo --autopilot --agent squad -p "<prompt>"` (autopilot added per 2026-06-02 user directive)
- **Scratch repos:** PRIVATE under `tamirdresher_microsoft` (will be deleted after insider.4 re-run + report)
- **Per-session evidence:** git status, git notes, branches, working-tree leak check, remote refs (snapshots committed under `validation/session-*-state.md`)
- **Bug A caveat:** did NOT manifest under `--yolo` on Copilot CLI 1.0.57 in either scenario — re-examine the trigger conditions before claiming PR #1192 is the user-visible fix

## Artifacts

- Two test repos linked above (browsable)
- This consolidated report
- 50 orchestration-log entries committed under `.squad/orchestration-log/`
- `decisions.md` entries from data-2, data-3, picard, seven

## Sign-off Status

- ❌ **Insider.3: two-layer is decoration not function** — flag honoured at fresh init, no hooks/migration/runtime bridge actually persists anything; upgrade path silently ignores the flag entirely
- ⏳ **Insider.4 re-run pending tag cut**
