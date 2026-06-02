# Combined Fix Branch Manifest — `squad/state-backend-upgrade-fixes`

**Branch**: `squad/state-backend-upgrade-fixes`
**PR**: [bradygaster/squad#1200](https://github.com/bradygaster/squad/pull/1200)
**Head SHA**: `e010b161`
**Tarball**: `C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz` (574 KB)
**Date**: 2026-06-02T14:59:33.169+03:00
**Author agent**: Data

## Bugs fixed (P0)

| ID | SHA | Source |
|---|---|---|
| (pre-existing) toRelative Windows | `fc406355` | already on branch |
| (pre-existing) git-notes silent migration warn | `dc2b3f50` | already on branch |
| (pre-existing) sdk semver workspace | `7a6b013f` | already on branch |
| #1192 approve-once permission contract | `70a37812` | cherry-pick |
| #1192 regression test | `e0291f3f` | cherry-pick |
| UPGRADE-EPERM-FALSE-SUCCESS | `cf99139e` | new |
| WI-1 (commit hooks) | `e2ff8277` | new |
| UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION | `e010b161` | new |

## Bugs PUNTED

### MCP-BRIDGE-BROKEN
**Why punted**: `state-mcp.ts` has two code paths (`createStateMcpSession` raw JSON-RPC, `runStateMcp` via `@modelcontextprotocol/sdk` Server). `MCP_TOOL_ALIASES` keys/values match. Squad tools are defined in `packages/squad-sdk/src/tools/index.ts` (lines 631/759/787/1167/1171/1172). Could not localize the failure observed by Spock without a reproduction. **Needs**: the exact failing client transcript + which transport path triggered it.

### INSIDER3-INIT-LEAK
**Why punted**: `init.ts` line 334 installs hooks correctly, but the leak is that `init.ts` hand-writes charters, `team.md`, and the decisions seed via direct `fs.writeFile` instead of routing through `runtimeState.write()`. Fix requires auditing every `fs.writeFile` in the init code path and routing each through the SDK. Too large for this PR — should be a dedicated refactor.

## Validation

- ✅ `npm run lint` clean (tsc --noEmit, both packages)
- ✅ `npm run build` clean
- ✅ 16/16 new tests pass: `install-hooks-wi1.test.ts` (5), `upgrade-state-backend.test.ts` (4), `upgrade-eperm-false-success.test.ts` (3), `self-upgrade.test.ts` (4)
- ⚠️ Full suite: 95 pre-existing failures unrelated to these changes (environment-dependent path resolution in tests like `team-root-resolution.test.ts`). None touch modified files.
- 📦 `npm pack` → `bradygaster-squad-cli-0.9.6-preview.1.tgz` (527 files, 574 KB)

## Files touched (production code)

- `packages/squad-cli/src/cli/core/upgrade.ts` — `selfUpgradeCli` throws on install failure (EPERM/EACCES/EBUSY via `.code` + regex)
- `packages/squad-cli/src/cli-entry.ts` — upgrade-self block now try/catch + `process.exit(1)`
- `packages/squad-cli/src/cli/commands/install-hooks.ts` — `HOOK_TEMPLATES` adds `pre-commit` (guards committing state-backend files) + `post-commit` (best-effort `squad sync`); `ensureHooksForBackend` retrofits all 6 hooks
- `packages/squad-cli/src/cli/commands/migrate-backend.ts` — full rewrite. Accepts worktree/local → orphan/two-layer. Migrates `.squad/decisions.md` + `agents/<n>/history.md` onto `squad-state` orphan via git plumbing using temp `GIT_INDEX_FILE`. JSON-merges config to avoid duplicates.

## Files touched (tests, new)

- `test/install-hooks-wi1.test.ts`
- `test/upgrade-state-backend.test.ts`
- `test/upgrade-eperm-false-success.test.ts`

## Follow-up

1. Land #1200 → close #1192.
2. File new issues for MCP-BRIDGE-BROKEN (needs repro) and INSIDER3-INIT-LEAK (dedicated refactor).
