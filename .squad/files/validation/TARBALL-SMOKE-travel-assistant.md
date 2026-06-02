# FRESH-PATH TARBALL VALIDATION — travel-assistant (smoke 1/2)

**Date**: 2026-06-02T15:35:00+03:00
**Author**: Data (Squad Framework Expert)
**Requested by**: Tamir Dresher
**Source repo**: `tamirdresher/travel-assistant` (public, personal account, cloned read-only)
**Tarball**: `C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz`
**Tarball SHA256**: `BF738283A270B636DD83D95BB1CBD8CF8E4F4D69B268CD4C1CAD1942892449E7`
**Tarball CLI version**: `0.9.6-preview.3`
**Combined-fix branch head**: `squad/state-backend-upgrade-fixes` @ `8ab9a305`
**Copilot CLI version under test**: 1.0.57

## Duplicate repos (browsable proof)

| Scenario | Repo |
|---|---|
| Fresh-path | https://github.com/tamirdresher_microsoft/travel-assistant-tarball-test-20260602T1610 |
| Upgrade-path | https://github.com/tamirdresher_microsoft/travel-assistant-upgrade-test-20260602T1610 |

## Setup notes — install path

`npm install` of the tarball **fails with ETARGET** at every documented entry point:
- `npm install -g <tarball>` → `npm error notarget No matching version found for @bradygaster/squad-sdk@>=0.9.6-preview`
- `npm install --no-save <tarball>` → same
- `npm install -g --force <tarball>` → same

**Root cause**: tarball `package.json` declares `"@bradygaster/squad-sdk": ">=0.9.6-preview"`. The npm registry currently has SDK versions `0.8.x`, `0.9.0`, `0.9.1`, `0.9.{2..6}-insider.{1..3}`, `0.9.4`. By semver pre-release ordering, `insider` (i) sorts before `preview` (p), so `0.9.6-insider.3 < 0.9.6-preview`. **No published SDK satisfies the range**, and the tarball isn't bundling its own SDK.

**Workaround** (per failure-mode guidance — "do NOT modify the tarball"): created a sidecar `.squad-tarball-wrap/package.json` in each duplicate with an npm `overrides` directive forcing `@bradygaster/squad-sdk` → `0.9.6-insider.3`, then ran the squad binary via `.squad-tarball-wrap/node_modules/.bin/squad`. `squad --version` returns `0.9.6-preview.3` confirming the CLI is the tarball.

**Validation consequence**: iteration-2 SDK-side fixes (specifically the new `buildMcpServerSpecs(isGitHub, cliVersion?)` in `packages/squad-sdk/src/config/init.ts` that pins the `squad_state` MCP package spec at init time) are NOT EXERCISED in this validation. The CLI-side mirror (`ensureSquadStateMcpPinned` in `upgrade.ts`) IS exercised. All CLI-only iteration-2 fixes (INSIDER3-INIT-LEAK lift, WI-1 hooks, UPGRADE-* fixes) are fully exercised.

## Phase 2 — Fresh init path (`squad init --state-backend two-layer`)

### Post-init outcome (`02-post-init.md`)

- `.squad/config.json` → clean `{ "version": 1, "stateBackend": "two-layer" }`, no duplicate keys ✅
- `.git/hooks/` non-sample listing: **`pre-commit, post-commit, pre-push, post-merge, post-rewrite, post-checkout`** — all 6 present ✅ (**WI-1 fixed**)
- `git branch -a`: local `squad-state` orphan branch exists ✅; **NOT pushed to remote** (origin has only `main`, `chore/repo-hygiene`)
- `git status --porcelain`: ⚠️ 8 `D .squad/agents/*/history.md` + `D .squad/decisions.md` + 3 `??` for newly-written `.squad/agents/Rai/`, `.squad/memory/`, `.squad/rai/`. **INSIDER3-INIT-LEAK partially addressed**: pre-existing committed mutable state WAS lifted to the orphan (`84a6e5a migrate: import working-tree state on backend upgrade (10 file(s))`), but the working-tree deletions weren't committed back to main, and freshly-generated dirs leaked.
- `.copilot/mcp-config.json`: **untouched** (pre-existing on this repo, no `squad_state` server present). Init template said "skipping". **MCP-BRIDGE pinning not applied.**

### 3 work sessions

| # | Prompt | Outcome | Working-tree commit | Orphan commit |
|---|---|---|---|---|
| 1 | "build me a team from the Simpsons universe for a TypeScript travel-planning app" | ✅ Lisa / Bart / Frink / Skinner / Apu cast; +549 −15 in working tree | none (changes uncommitted) | none |
| 2 | "Lead, draft a quick architecture proposal for the trip-suggestion endpoint" | ✅ Lisa proposal delivered; Scribe ran and committed | `f6ca53d` (touches `.squad/agents/*/history.md` + `.squad/decisions.md`) | none |
| 3 | "Tester, list edge cases for trip suggestions" | ✅ Skinner edge-case catalog; Scribe committed | `314b649` | none |

**Result**: After 3 sessions, orphan branch unchanged (still 2 commits from init). All runtime state landed on `main` as normal commits. The two-layer backend infrastructure is in place (config + hooks + orphan branch + initial migration) but the **runtime does not actually route state to the orphan**. Identical to insider.3 baseline pattern but with infrastructure pre-staged.

**Sub-finding**: Scribe's session-2 and session-3 commits include exactly the paths the pre-commit hook is supposed to refuse (`.squad/agents/*/history.md`, `.squad/decisions.md`). Either Scribe set `SQUAD_SYNC_ACTIVE=1` (documented bypass) or the hook silently no-op'd. Worth a follow-up.

## Phase 3 — Upgrade path (`squad upgrade --state-backend two-layer`)

### Setup
- Second duplicate created; `squad init` (default worktree backend) — `.squad/config.json` = `{ "version": 1 }`; **0 hooks** installed (correct for worktree).
- Pre-upgrade: 2 work sessions on worktree backend accumulated decisions.md + agent histories, committed to main as `7cf9e65`, `6a96602`, `c6921f3`.

### `squad upgrade --self --insider --state-backend two-layer`
The `--self` step fails on Windows with EPERM (current process holds binary lock):
```
npm error code EPERM ... unlink 'C:\ProgramData\global-npm\squad'
⚠️ Upgrade failed. Try running manually: npm install -g @bradygaster/squad-cli@insider
❌ Self-upgrade failed: Self-upgrade failed: Upgrade failed. ...
EXIT=1
```
**UPGRADE-EPERM-FALSE-SUCCESS fix CONFIRMED ✅**: no longer prints `✅ Upgraded` after `⚠️ Upgrade failed`; exit code is 1 (was 0 on insider.3). However, the failure aborts the run BEFORE the state-backend migration step.

### `squad upgrade --state-backend two-layer` (no `--self`)
```
Already up to date (v0.9.6-preview.3)
✓ upgraded squad workflows (11 files)
...
Migrating state backend: local → two-layer
  ✓ squad-state branch ready
  ✓ migrated 10 state file(s) onto squad-state branch:
      .squad/decisions.md
      .squad/agents/{bart,eddy,frink,lisa,marge,Rai,ralph,scribe,skinner}/history.md
  ✓ config.json updated: stateBackend = two-layer

Installing squad sync hooks
  ✓ pre-push / post-merge / post-rewrite / post-checkout / pre-commit / post-commit: installed

✓ Migration complete. Backend is now 'two-layer'. EXIT=0
```

Post-upgrade state (`07-post-upgrade.md`):
- `.squad/config.json`: `{ "version": 1, "stateBackend": "two-layer" }` ✅ (**UPGRADE-FLAG-IGNORED fixed**)
- All 6 hooks installed ✅ (**WI-1 retrofit fixed**)
- `git show squad-state:decisions.md` returns the pre-upgrade decisions.md verbatim ✅ (**UPGRADE-NO-MIGRATION fixed**) — note: orphan tree is rooted at `decisions.md`, not `.squad/decisions.md`; the validation script's `git show squad-state -- .squad/decisions.md` will fail looking at the wrong path
- `.copilot/mcp-config.json`: still no `squad_state` entry ❌ (MCP-BRIDGE not auto-added by upgrade either)
- Orphan branch NOT pushed to remote

### Post-upgrade continuity sessions

| # | Prompt | Outcome |
|---|---|---|
| 1 | "Lead, summarize what we decided so far" | ✅ Lisa read & summarized **pre-upgrade decisions verbatim** (Phase 1 demo pivot, POST /api/trip-suggestion, Simpsons re-cast). UPGRADE-NO-MIGRATION confirmed end-to-end. ⚠️ Scribe refused to log session: "the `squad_state_*` runtime tools aren't exposed in this session, and the backend is `two-layer`, so per protocol it refused to hand-write mutable state." |
| 2 | "Tester, list edge cases for trip suggestions" | ✅ Bart produced catalog; Scribe ran but state writes again gated |

## Bug verdict matrix (see `11-bug-verdict.md` for full table)

| Bug | Verdict |
|---|---|
| A (permission contract) | ✅ NOT MANIFESTED under autopilot |
| C (silent migration warn) | N/A — not exercised |
| F (Windows path) | ✅ NOT MANIFESTED |
| WI-1 (hooks) | ✅ **FIXED** (fresh + upgrade) |
| UPGRADE-FLAG-IGNORED | ✅ **FIXED** |
| UPGRADE-NO-MIGRATION | ✅ **FIXED** |
| UPGRADE-EPERM-FALSE-SUCCESS | ✅ **FIXED** |
| MCP-BRIDGE-BROKEN | ❌ **STILL BROKEN** (caveat: SDK-side fix not exercised) |
| INSIDER3-INIT-LEAK | ⚠️ **PARTIAL FIX** |

**Tally: 5 ✅ / 1 ⚠️ / 1 ❌ / 2 N/A**

## Bottom-line verdict

The combined fix bundle **substantially improves** two-layer behavior over the insider.3 baseline on a real-world target repo. Concretely:

1. **Upgrade path is now functional** where insider.3 was a silent no-op: `--state-backend` is honoured, pre-upgrade decisions migrate verbatim onto the orphan branch, all 6 hooks install, and the EPERM-on-self-upgrade false-success contradiction is gone (exits 1 with no `✅ Upgraded`).
2. **WI-1 commit hooks ship on both fresh init and upgrade** — the largest single regression vs. insider.3.
3. **INSIDER3-INIT-LEAK is partially closed** — pre-existing committed mutable state DOES get lifted to the orphan at init time, but freshly-generated `.squad/agents/*` dirs and uncommitted working-tree deletions remain.

The bundle does **NOT** restore end-to-end two-layer functionality on this repo, for two reasons:
1. **Packaging blocker** — tarball declares an unpublished SDK version range (`>=0.9.6-preview`). It is not installable through any documented path; users must apply an `overrides` workaround. Fix bundle as published is shippable only after the SDK is republished (or after the CLI's SDK dep is loosened to `>=0.9.6-insider.3 || >=0.9.6-preview`).
2. **MCP-BRIDGE-BROKEN persists** — neither init nor upgrade *adds* a missing `squad_state` server entry to a pre-existing `.copilot/mcp-config.json`; `ensureSquadStateMcpPinned` only PINS existing entries. On any repo that had Copilot configured before Squad (the travel-assistant case), the runtime bridge stays unwired and Scribe refuses to persist. Post-upgrade Lisa CAN read decisions but Scribe CANNOT write them — same persistence-gap user-visible behavior as the insider.3 baseline session 6 ("decision content above is final and correct, but it currently lives only in this chat, not in the ledger").

Compared to the insider.3 consolidated baseline: 4 of the 6 NOT-FIXED items in the baseline's must-fix list are now ✅ fixed (items #1 UPGRADE-FLAG-IGNORED, #2 UPGRADE-NO-MIGRATION, #3 UPGRADE-EPERM-FALSE-SUCCESS, #4 WI-1 hooks). Item #7 INSIDER3-INIT-LEAK is partial. Items #5/#6 (MCP wiring + MCP bridge tools) are still broken in the pre-existing-config case. Item #9 (push orphan to remote) is still not happening from the hooks.

## Cross-repo input for smoke synthesis

- **Universal failures (will hit multiplayer-sudoku and all 6 target repos)**:
  - Tarball ETARGET install blocker — bundle is unshippable via `npm install` until SDK is republished
  - `ensureSquadStateMcpPinned` non-insert when squad_state entry missing — any repo with pre-existing `.copilot/mcp-config.json` lacking squad_state will replicate this failure
  - Orphan branch never pushed to remote in any scenario
- **Likely repo-specific**:
  - travel-assistant had pre-committed `.squad/` state from a prior init; that's what enabled the lift-to-orphan exercise. A pristine repo won't have anything to migrate at init time but will still leak new history files. Re-check on a true greenfield (e.g., multiplayer-sudoku if it had no prior init).
- **Recommendation if multiplayer-sudoku smoke comes back with the same MCP-BRIDGE failure**: do NOT expand to the remaining 4 repos until `ensureSquadStateMcpPinned` is upgraded to *insert* a missing `squad_state` entry (not just pin an existing one) AND the tarball is republished with a satisfiable SDK range.
