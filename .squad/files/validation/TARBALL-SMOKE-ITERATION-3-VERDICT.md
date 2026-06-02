# Tarball Smoke — Iteration 3 Verdict

**Date:** 2026-06-02
**Branch:** `squad/state-backend-upgrade-fixes` @ `a0fa7e3e`
**Tarballs:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` (both at `0.9.6-preview.5`)
**PR:** [bradygaster/squad#1200](https://github.com/bradygaster/squad/pull/1200)
**Re-smoke repos:** `travel-assistant`, `multiplayer-sudoku` (fresh clones, stale `.copilot/mcp-config.json` seeded)

---

## Gap closure summary

| Gap | Iter-2 status | Iter-3 status | Fix commit |
|---|---|---|---|
| **GAP-1**: `squad sync` not a registered command (post-commit hook fails silently) | ❌ open — `Unknown command 'sync'` | ✅ **closed** — registered in `cli-entry.ts`; `--help` lists it; exit 0; 3 new unit tests pass | `3b44f45e` |
| **GAP-2**: `ensureSquadStateMcpPinned` did nothing when `squad_state` entry was absent | ❌ open — entry never inserted, MCP bridge offline | ✅ **closed** — helper now inserts/updates; wired into BOTH `runEnsureChecks` AND `squad init`; 8 unit tests pass | `3b44f45e` + `a0fa7e3e` |
| **GAP-3**: CLI tarball declares unpublished SDK dependency `>=0.9.6-preview` → single-tarball install fails ETARGET | ❌ open | ➖ **workaround only** — twin-install pattern documented; follow-up filed as [#1203](https://github.com/bradygaster/squad/issues/1203) for release-pipeline fix | n/a (issue) |

---

## Side-by-side re-smoke results

### GAP-2 — MCP bridge pinning (insert path)

Both repos started with a hand-seeded `.copilot/mcp-config.json` containing only `EXAMPLE-github` (no `squad_state`).

| Repo | `squad_state` after `squad init --state-backend two-layer` | Pin | `EXAMPLE-github` preserved |
|---|---|---|---|
| `travel-assistant` | ✅ inserted | `@bradygaster/squad-cli@0.9.6-preview.5` | ✅ yes |
| `multiplayer-sudoku` | ✅ inserted | `@bradygaster/squad-cli@0.9.6-preview.5` | ✅ yes |

### GAP-1 — `squad sync` command

| Repo | `squad sync --quiet` exit | "Unknown command" error? |
|---|---|---|
| `travel-assistant` | `0` | no |
| `multiplayer-sudoku` | `0` | no |

**Note on post-commit propagation:** the post-commit hook now invokes `squad sync --quiet` without error, but `squad-state` does not grow from a single working-tree commit. This is **by design**: `runSync` only push/pulls the `squad-state` orphan branch refs to/from a remote. With no remote configured (and no actual state mutations yet), it is a no-op. The state-accrual mechanism remains the **MCP bridge**, which is now reachable because GAP-2 is closed. The GAP-1 fix's purpose is to ensure the hook stops failing silently — verified ✅.

---

## What changed in iteration 3

1. **`packages/squad-cli/src/cli-entry.ts`** — registered `sync` subcommand (+ help entry)
2. **`packages/squad-cli/src/cli/core/upgrade.ts`** — `ensureSquadStateMcpPinned` now constructs the expected pinned entry and inserts/updates when missing or wrong; preserves other `mcpServers`
3. **`packages/squad-cli/src/cli/core/init.ts`** — calls `ensureSquadStateMcpPinned` after `liftInitMutableStateOntoOrphan` in the orphan/two-layer branch (the SDK's `writeIfNotExists` was skipping rewrites of pre-existing mcp-configs)
4. **`test/mcp-bridge-pinning.test.ts`** — replaced obsolete no-op test with 2 insert-path tests (8 tests total)
5. **`test/sync-command.test.ts`** — NEW, 3 tests

Build + lint clean. **19/19 targeted tests pass.**

---

## Bottom line — GO/NO-GO

🟢 **GO** for expanding the combined-fix tarball validation to the remaining 4 test repos.

Both blocking gaps from iter-2 are closed in the v0.9.6-preview.5 twin tarball. GAP-3 has a stable workaround (twin-install) and a tracked follow-up (#1203). No further changes are required to the fix bundle before broader testing.

### Install pattern for downstream testing

```powershell
$prefix = "C:\path\to\test-env\.npm-prefix"
npm install --prefix $prefix `
  C:\Users\tamirdresher\squad-validation\bradygaster-squad-sdk-combined-fixes.tgz `
  C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz
& "$prefix\node_modules\.bin\squad.cmd" --version  # expect: 0.9.6-preview.5
```

Both tarballs MUST be installed side-by-side — installing only the CLI tarball fails ETARGET until #1203 is resolved.
