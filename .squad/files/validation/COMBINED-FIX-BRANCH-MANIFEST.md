# Combined Fix Branch Manifest — `squad/state-backend-upgrade-fixes`

**Branch**: `squad/state-backend-upgrade-fixes`
**PR**: [bradygaster/squad#1200](https://github.com/bradygaster/squad/pull/1200)
**Head SHA**: `8ab9a305`
**Tarball**: `C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz` (563 KB)
**Date**: 2026-06-02T15:38:00+03:00
**Author agent**: Data
**Iteration**: 2 (both punted P0s now fixed)

## Bugs fixed (P0)

| ID | SHA | Source |
|---|---|---|
| (pre-existing) toRelative Windows | `fc406355` | already on branch |
| (pre-existing) git-notes silent migration warn | `dc2b3f50` | already on branch |
| (pre-existing) sdk semver workspace | `7a6b013f` | already on branch |
| #1192 approve-once permission contract | `70a37812` | cherry-pick |
| #1192 regression test | `e0291f3f` | cherry-pick |
| UPGRADE-EPERM-FALSE-SUCCESS | `cf99139e` | iteration 1 |
| WI-1 (commit hooks) | `e2ff8277` | iteration 1 |
| UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION | `e010b161` | iteration 1 |
| **MCP-BRIDGE-BROKEN** | **`b987fe67`** | **iteration 2** |
| **INSIDER3-INIT-LEAK** | **`e291b962`** | **iteration 2** |

## Iteration 2 — root causes

### MCP-BRIDGE-BROKEN (was punted in iteration 1)
**Root cause**: not a server bug. `npm view @bradygaster/squad-cli dist-tags` returns `{ latest: "0.9.4", insider: "0.9.6-insider.3" }`. The init template writes `npx -y @bradygaster/squad-cli state-mcp` (unpinned) which resolves to the npm `latest` dist-tag (0.9.4) — and **0.9.4 has NO `state-mcp` command** (verified by extracting the tarball). Result: Copilot launches the wrong CLI version, the MCP server never starts, agents see zero `squad_state_*` tools at runtime.

**Repro technique** (newline-delimited JSON-RPC, NOT Content-Length framing — `StdioServerTransport` uses newlines):
```js
const child = spawn('node', ['packages/squad-cli/dist/cli-entry.js', 'state-mcp'], { stdio: 'pipe' });
child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'}) + '\n');
```
Confirms all 7 tools registered correctly. The bug is **config-level**, not code-level.

**Fix**: pin `@bradygaster/squad-cli@<cliVersion>` in `mcp-config.json`:
- `packages/squad-sdk/src/config/init.ts` — `buildMcpServerSpecs(isGitHub, cliVersion?)` accepts and embeds the running CLI version
- `packages/squad-cli/src/cli/core/upgrade.ts` — same fix in the upgrade-time mirror function; new exported `ensureSquadStateMcpPinned(dest, cliVersion)` retrofits existing installs via `runEnsureChecks` (idempotent; bails on JSON parse error so manual edits are preserved)

### INSIDER3-INIT-LEAK (was punted in iteration 1)
**Root cause**: `sdkInitSquad()` runs BEFORE the CLI writes `.squad/config.json` with the `stateBackend` choice. So the SDK has no knowledge of the future backend at the time it writes `decisions.md` + each agent's `history.md` — those files always land in the working tree. For `worktree`/`local` backends this is correct, but for `orphan`/`two-layer` they shadow the orphan branch and bypass the runtime state bridge.

**Fix**: post-hoc lift in the CLI (`packages/squad-cli/src/cli/core/init.ts`), immediately after `installGitHooks` succeeds for orphan/two-layer:
- New exported `liftInitMutableStateOntoOrphan(dest)` in `migrate-backend.ts` reuses the existing `collectWorktreeState` + `writeFilesToOrphanBranch` git-plumbing helpers (already exporting from the migration command path)
- Static files preserved on disk per the source-of-truth hierarchy: `team.md`, `ceremonies.md`, `casting/*`, `agents/*/charter.md`, `templates/*`
- Only mutable state migrates: `decisions.md` + `agents/*/history.md`
- Best-effort: failures are warn-only and never abort `squad init`

## Validation

- ✅ `npm run lint` clean (tsc --noEmit, both packages)
- ✅ `npm run build` clean
- ✅ 26/26 targeted tests pass: iteration-1 16 + iteration-2 10
  - `test/mcp-bridge-pinning.test.ts` (7) — pins on init, pins on upgrade, idempotent, preserves other servers, no-ops when absent/missing/dev-version
  - `test/init-leak-mutable-state.test.ts` (3) — lifts mutable state, preserves static files, no-op when nothing to lift
- ⚠️ Full suite: 95 pre-existing failures unrelated to these changes (environment-dependent path resolution in tests like `team-root-resolution.test.ts`). None of them touch the modified files.
- 📦 `npm pack` → `bradygaster-squad-cli-0.9.6-preview.3.tgz` (527 files, 563 KB) → mirrored as `bradygaster-squad-cli-combined-fixes.tgz`

## Files touched

### Iteration 1 (already on branch)
- `packages/squad-cli/src/cli/core/upgrade.ts` — `selfUpgradeCli` throws on install failure
- `packages/squad-cli/src/cli-entry.ts` — upgrade-self try/catch + `process.exit(1)`
- `packages/squad-cli/src/cli/commands/install-hooks.ts` — `HOOK_TEMPLATES` extended with pre-commit/post-commit; `ensureHooksForBackend` checks all 6 hooks
- `packages/squad-cli/src/cli/commands/migrate-backend.ts` — full rewrite with orphan-branch git plumbing
- `test/install-hooks-wi1.test.ts`, `test/upgrade-state-backend.test.ts`, `test/upgrade-eperm-false-success.test.ts`

### Iteration 2 (new)
- `packages/squad-sdk/src/config/init.ts` — `buildMcpServerSpecs(isGitHub, cliVersion?)` pins package spec
- `packages/squad-cli/src/cli/core/upgrade.ts` — mirror fix + new `ensureSquadStateMcpPinned` helper invoked from `runEnsureChecks`; threaded `cliVersion` through `buildMcpFrontmatterBlock` / `injectMcpFrontmatter` / `writeAgentTemplate`
- `packages/squad-cli/src/cli/commands/migrate-backend.ts` — export `ensureOrphanBranch` + new `liftInitMutableStateOntoOrphan` helper
- `packages/squad-cli/src/cli/core/init.ts` — invoke the helper after `installGitHooks` for orphan/two-layer
- `test/mcp-bridge-pinning.test.ts` — 7 regression tests
- `test/init-leak-mutable-state.test.ts` — 3 regression tests
- `test/cli/upgrade.test.ts` — relax frontmatter assertion to accept version-pinned args

## Follow-up

1. Land #1200 → close #1192.
2. Consider unifying the duplicated `buildMcpServerSpecs` between `squad-sdk/init.ts` and `squad-cli/upgrade.ts` in a future PR — they drift easily.
3. Iteration 2 has no remaining punted bugs from the original bundle. Any new bugs surfaced during downstream validation should open fresh issues.
