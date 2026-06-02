# Combined Fix Branch Manifest — `squad/state-backend-upgrade-fixes`

**Branch**: `squad/state-backend-upgrade-fixes`
**PR**: [bradygaster/squad#1200](https://github.com/bradygaster/squad/pull/1200)
**Head SHA**: `3b44f45e`
**Tarballs (TWIN — install BOTH together)**:
- `C:\Users\tamirdresher\squad-validation\bradygaster-squad-sdk-combined-fixes.tgz` (787 KB)
- `C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz` (564 KB)

**Install pattern**: `npm install -g <sdk-tgz> <cli-tgz>` (both at once — see Gap 3 / #1203)

**Date**: 2026-06-02T16:50:00+03:00
**Author agent**: Data
**Iteration**: 3 (smoke-test gaps closed)

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
| MCP-BRIDGE-BROKEN (pin behavior) | `b987fe67` | iteration 2 |
| INSIDER3-INIT-LEAK | `e291b962` | iteration 2 |
| **GAP-1 `squad sync` command missing + GAP-2 MCP retrofit INSERT** | **`3b44f45e`** | **iteration 3** |

## Iteration 3 — closes smoke-test gaps

### GAP-1: `squad sync` subcommand never registered (iter-2 smoke surfaced)
**Root cause**: WI-1 (iter 1) installed `post-commit` + `pre-push` hooks that invoke `squad sync --quiet 2>/dev/null || true`. The `runSync` implementation existed in `packages/squad-cli/src/cli/commands/sync.ts` but was never wired into `cli-entry.ts`. The hook's `|| true` swallowed the "Unknown command: sync" failure silently → 0 commits propagated to the orphan branch across 3 sessions in the multiplayer-sudoku smoke.

**Fix**: register `sync` in `cli-entry.ts` between `state-mcp` and `migrate` (Option A from the directive). Flags: `--push`, `--pull`, `--remote <name>`, `--quiet`. Documented in `squad --help`. New unit test `test/sync-command.test.ts` covers no-op for local backend, no-op for missing config, no-throw for two-layer without remote.

### GAP-2: `ensureSquadStateMcpPinned` no-op when entry absent (iter-2 smoke surfaced)
**Root cause**: existing implementation bailed early (`if (!server || !Array.isArray(server.args)) return false`). For repos with a pre-existing `.copilot/mcp-config.json` from prior (non-squad) Copilot use, the retrofit was a no-op → bridge stayed unwired → Scribe correctly refused to persist (`squad_state_*` tools unavailable).

**Fix**: ALWAYS construct the expected `{command: 'npx', args: ['-y', '@bradygaster/squad-cli@<cliVersion>', 'state-mcp']}` and insert/overwrite if different. Other configured MCP servers preserved untouched. Two new tests cover (a) insert when entry missing alongside other servers; (b) insert when `mcpServers` key is absent entirely.

## Iteration 3 — Validation

- ✅ `npm run lint` (tsc --noEmit, both packages) clean
- ✅ `npm run build` clean
- ✅ 19/19 targeted tests pass: mcp-bridge-pinning (8 — was 7, +1 insert-with-other-servers, +1 insert-no-mcpServers-key, -1 obsolete no-op test), sync-command (3 — NEW), init-leak-mutable-state (3), install-hooks-wi1 (5)
- 📦 Twin tarballs packed (CLI 564 KB, SDK 787 KB) → mirrored to `C:\Users\tamirdresher\squad-validation\bradygaster-squad-{sdk,cli}-combined-fixes.tgz`

## Follow-up / out-of-scope

- **[bradygaster/squad#1203](https://github.com/bradygaster/squad/issues/1203)** — release-pipeline: squad-cli tarball declares unpublished `@bradygaster/squad-sdk@>=0.9.6-preview` (ETARGET on standalone install). NOT a state-backend bug — filed separately. Real fix: publish SDK + CLI atomically (or vendor SDK into CLI tarball). Workaround for validation: twin-tarball install pattern documented above.
- Land #1200 → close #1192.
- Consider unifying the duplicated `buildMcpServerSpecs` between `squad-sdk/init.ts` and `squad-cli/upgrade.ts` in a future PR.

## Files touched

### Iteration 3 (new)
- `packages/squad-cli/src/cli-entry.ts` — register `sync` subcommand + help text
- `packages/squad-cli/src/cli/core/upgrade.ts` — `ensureSquadStateMcpPinned` now INSERTS/UPDATES (no longer early-bails when entry absent); other mcpServers preserved
- `test/mcp-bridge-pinning.test.ts` — replaced obsolete no-op-when-absent test with 2 new insert-path tests
- `test/sync-command.test.ts` — NEW (3 tests for sync command resolution + backend gating)
- Version bumps: `package.json`, `packages/squad-cli/package.json`, `packages/squad-sdk/package.json` → `0.9.6-preview.4`

### Iteration 1 + 2 (already on branch)
See git log; covered in prior manifest entries above.


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


---

## Iteration 3 final addendum (2026-06-02)

After the iter-3 re-smoke surfaced that the SDK `init.ts` skips `.copilot/mcp-config.json` rewrite via `writeIfNotExists` semantics, the MCP retrofit helper was wired into `squad init` in addition to `runEnsureChecks`.

- **New commit:** `a0fa7e3e` on `squad/state-backend-upgrade-fixes` — ix(init): wire ensureSquadStateMcpPinned into 'squad init' too
- **Tarballs at:** `0.9.6-preview.5` (twin)
- **Final re-smoke (travel + sudoku, fresh clones, seeded stale mcp-config):** GAP-1 ✅ closed · GAP-2 ✅ closed (insert path verified on init) · GAP-3 ➖ workaround + #1203 follow-up
- **Verdict:** 🟢 GO for the remaining 4-repo validation. See `TARBALL-SMOKE-ITERATION-3-VERDICT.md`.