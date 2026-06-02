# Tarball Validation Report — multiplayer-sudoku (smoke 2/2)

**Bundle under test:** `bradygaster-squad-cli-combined-fixes.tgz` (squad-cli `0.9.6-preview.3`, squad-sdk `0.9.6-preview.3`)
**Bundle head SHA:** `8ab9a305c6fce7e80a3b1e1403bc9b47e8bb4bdf` (branch `squad/state-backend-upgrade-fixes`, PR #1200)
**Date:** 2026-06-02T15:35:00+03:00
**Tester:** Data (Squad Framework Expert)
**Mission:** validate combined-fix bundle on a non-Node, .NET / Azure flavoured project to check the two-layer state backend end-to-end.

## 1. Setup

| Item | Value |
|---|---|
| Source repo | https://github.com/tamirdresher_microsoft/multiplayer-sudoku |
| Fresh-init duplicate | https://github.com/tamirdresher_microsoft/multiplayer-sudoku-tarball-test-20260602T1610 |
| Upgrade-path duplicate | https://github.com/tamirdresher_microsoft/multiplayer-sudoku-upgrade-test-20260602T1610 |
| Active gh account | tamirdresher_microsoft (EMU) |
| Squad install path | local prefix: `C:\Users\tamirdresher\squad-validation\.npm-prefix-multiplayer\node_modules\.bin\squad` |
| Install method | `npm install --prefix <localPrefix> <sdk-tgz> <cli-tgz>` — global install failed because (a) `@bradygaster/squad-sdk@0.9.6-preview.3` is NOT published to npm; (b) EPERM contention from the parallel travel-assistant agent. Sibling SDK tarball was packed locally from `squad-state-backend-fix\packages\squad-sdk` and installed in tandem. |
| Driver | `copilot --yolo --autopilot --agent squad -p "..."` |

### Publishing prerequisite surfaced

Before this bundle can be smoke-tested by anyone outside the bundle author's workstation:
1. `@bradygaster/squad-sdk@0.9.6-preview.3` must be published to npm, OR the CLI's peer/dep on the SDK must be widened. Otherwise `npm install -g` fails with `ETARGET no matching version`.
2. `@bradygaster/squad-cli@0.9.6-preview.3` must be published too, otherwise the MCP pin `npx -y @bradygaster/squad-cli@0.9.6-preview.3 state-mcp` will 404 at runtime.

This is **not a bundle defect** — it's a pre-flight that must happen before insider.4 tag cut.

## 2. Phase-by-phase results

### Phase 2 — Fresh init (`squad init --state-backend two-layer`)
Captured in `validation/01-init-output.log` and `validation/02-post-init.md`.
- `.squad/config.json` → `{ "version": 1, "stateBackend": "two-layer" }` ✅ single key, no dup.
- `.git/hooks` → `pre-commit`, `post-commit`, `pre-push`, `post-merge`, `post-rewrite`, `post-checkout` — all 6 present. **WI-1 fix verified.**
- `squad-state` orphan branch present locally and on origin.
- `git ls-tree -r squad-state` shows `decisions.md`, `agents/*/history.md` (9 files total). **INSIDER3-INIT-LEAK fix verified** — lift commit `37e23b2 migrate: import working-tree state on backend upgrade (9 file(s))` shows `liftInitMutableStateOntoOrphan` ran.
- `.copilot/mcp-config.json` was **NOT updated** with a `squad_state` entry — repo already had this file (with only `EXAMPLE-github`), `squad init` skipped it, retrofit no-op'd per documented "no-op when absent" behaviour. This is the MCP-BRIDGE incomplete-retrofit gap.

### Phase 2 — 3 work sessions

| # | Prompt | Outcome | Orphan accrued? |
|---|---|---|---|
| 1 | Simpsons cast for multiplayer Sudoku | ✅ Init Mode rebuild — Lenny/Carl/Milhouse/Flanders/Frink chosen; team.md + routing.md + casting/registry.json rewritten | ❌ 0 new commits on `squad-state` |
| 2 | Lead, real-time board sync architecture | ✅ Architecture proposal delivered; Scribe committed `0bd2a11` to `main` | ❌ 0 new commits on `squad-state` |
| 3 | Tester, multiplayer-sync edge cases | ✅ 16 edge cases enumerated; Scribe committed `5a1192c` to `main` | ❌ 0 new commits on `squad-state` |

**Critical finding:** the post-commit hook calls `squad sync --quiet 2>/dev/null || true` to push state to the orphan branch — but `squad sync` is **not a registered command** (`squad --help` lists no such command; running it returns `Unknown command: sync`). The `|| true` swallows the failure silently. So even though the hooks are installed, no commits propagate to the orphan branch in practice. Across 3 sessions, `squad-state` accrued **zero new commits**.

### Phase 3 — Upgrade path
Captured in `validation/09-init-output.log`, `10-upgrade-output.log`, `10b-upgrade-backend-only.log`, `10-post-upgrade.md`.

**Step 1:** `squad upgrade --self --insider --state-backend two-layer`
- Failed with EPERM on `npm install -g` (binary held by parallel agent).
- **Exit code: 1** (baseline was 0). **Only `⚠ Upgrade failed` printed; no contradictory `✅ Upgraded`**. `❌ Self-upgrade failed` line emitted. ⇒ **UPGRADE-EPERM-FALSE-SUCCESS fix verified.**

**Step 2:** `squad upgrade --state-backend two-layer` (backend-only, since self-upgrade had exited)
- Exit code 0.
- Explicit `Migrating state backend: local → two-layer` log line. ⇒ **UPGRADE-FLAG-IGNORED fix verified.**
- `✓ migrated 9 state file(s)` listing each file: `decisions.md` + all 8 agent histories. ⇒ **UPGRADE-NO-MIGRATION fix verified.**
- `✓ config.json updated: stateBackend = two-layer` (single key, no dup).
- `Installing squad sync hooks` with all 6 hooks reported installed. ⇒ **WI-1 retrofit on upgrade verified.**
- `Done. Squad state will sync automatically on push/pull. ✓ Migration complete.`

**Step 3:** post-upgrade continuity sessions

| # | Prompt | Outcome |
|---|---|---|
| 1 | Lead, summarize what we decided so far | Lead summarized from pre-upgrade decisions.md content; Scribe pre-checked and refused to mutate ("squad_state_* runtime tools aren't available for the two-layer backend in this session"). |
| 2 | Tester, 3 edge cases for board sync | Edge cases delivered; Scribe again refused (state tools unavailable). |

Scribe's behaviour is **correct** — it refused to fabricate writes against a missing bridge, as governance requires. The root cause is the MCP-BRIDGE gap: `ensureSquadStateMcpPinned` doesn't add a missing `squad_state` entry, and the upgrade flow didn't insert one either. Same gap as fresh-init.

## 3. Bug verdict matrix

See `validation/13-bug-verdict.md`. Summary:
- ✅ Confirmed FIXED: **6** — WI-1 fresh, WI-1 upgrade, INSIDER3-INIT-LEAK, UPGRADE-FLAG-IGNORED, UPGRADE-NO-MIGRATION, UPGRADE-EPERM-FALSE-SUCCESS.
- ❌ Still failing / new gap: **2** — MCP-BRIDGE incomplete retrofit when `.copilot/mcp-config.json` already exists without a `squad_state` entry; `squad sync` command missing (post-commit hook is a silent no-op).

## 4. Bottom-line verdict

The bundle **moves two-layer from decoration to mostly-functional**, but two issues block end-to-end persistence:

1. **MCP retrofit is conservative.** It pins an existing entry but never adds a missing one. Any repo that was partially squadified before (i.e. has a `.copilot/mcp-config.json` lacking `squad_state`) won't get the bridge wired. The init-time and upgrade-time code paths need to ADD the entry, not just pin it. Without this, agents on those repos still can't write through the bridge.
2. **`squad sync` command is missing.** The newly-installed post-commit hook invokes `squad sync --quiet` to flush working-tree state to the orphan branch, but that subcommand doesn't exist in the tarball. Result: working-tree commits never propagate. This is a real regression in the hooks-completeness fix — the hooks now exist but their effect is null. Either implement `squad sync` or change the hook to call the actual sync entrypoint (likely the SDK helper).

Init-time lift, upgrade-time migration, exit-code correctness, hook installation, and config integrity all work. Those are the highest-impact baseline P0s and they are demonstrably fixed by this bundle.

## 5. Cross-repo input for smoke synthesis

For Tamir's roll-up across multiplayer-sudoku + travel-assistant:
- **Carry forward to insider.4 must-fix:** `squad sync` command must exist (or hook must call the right entrypoint); MCP retrofit must add a missing `squad_state` entry when the bridge is required by the chosen backend.
- **Publishing gate:** insider.4 must publish `@bradygaster/squad-sdk@0.9.6-insider.4` alongside the CLI, otherwise standalone `npm install -g` will keep failing the same way the preview.3 tarball did.
- **"Pre-existing .copilot/" scenario** is common in real repos (multiplayer-sudoku had one from prior squad work). The bundle's fixes only fully apply to clean `squad init` against a never-squadified repo. Recommend re-testing in insider.4 against at least one repo with a prior partial squad install.
- **Hooks installed but ineffective** is a worse state than "hooks missing" because it gives a false sense of safety. Prioritise the `squad sync` fix.
- **EPERM correctness in concurrent multi-agent workflows** is now solid — confirmed under real contention with the parallel agent. This is a meaningful Windows reliability win.
