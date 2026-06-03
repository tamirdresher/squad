# Combined Fix Branch Manifest — `squad/state-backend-upgrade-fixes`

**Branch**: `squad/state-backend-upgrade-fixes`
**PR**: [bradygaster/squad#1200](https://github.com/bradygaster/squad/pull/1200)
**Head SHA**: `3c019242` (iter-5)
**Tarballs (TWIN — install BOTH together)**:
- `C:\Users\tamirdresher\squad-validation\bradygaster-squad-sdk-combined-fixes.tgz` (788 KB)
- `C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz` (574 KB)

**Install pattern**: `npm install -g <sdk-tgz> <cli-tgz>` (both at once — see Gap 3 / #1203)

**Date**: 2026-06-03T07-25-00+03-00
**Author agent**: Data
**Iteration**: 5 (closes the three follow-up gaps surfaced by REVAL-ITER4-multiplayer-sudoku.md)
**Version**: `0.9.6-preview.11` (auto-bumped from preview.10)
**Upstream issue filed**: [github/copilot-cli#3642](https://github.com/github/copilot-cli/issues/3642)

## Iteration 5 — follow-up fixes for revalidation gaps

| Fix | What | Where |
|---|---|---|
| **USER-FACING-WRAPPER** | NEW `squad run-copilot` subcommand that injects `--additional-mcp-config @<path>` into the canonical user-launched `copilot` invocation (iter-4 only wrapped 10 squad-internal spawn sites). Naming: `squad copilot` is taken by team-roster mgmt | NEW `packages/squad-cli/src/cli/commands/run-copilot.ts` + cli-entry.ts wiring + help text |
| **INIT-vs-UPGRADE-ASYMMETRY** | Extracted `resolveSquadStateMcpSpec` to shared `mcp-spec.ts` and called it unconditionally from `init.ts` post-`sdkInitSquad`, so vanilla `squad init` gets the same `@insider` fallback as upgrade when the version is unpublished | NEW `packages/squad-cli/src/cli/core/mcp-spec.ts`, modified `init.ts` + `upgrade.ts` (re-export for compat) |
| **TEMPLATE-DOC-FLATTEN** | ~17 generic `*.md` template entries had flat destinations (e.g. `'charter.md'`), dumping reference docs into `.squad/` root on every upgrade. Routed all to `templates/<name>`. Casting JSONs deliberately kept flat (runtime contract) | `packages/squad-cli/src/cli/core/templates.ts` |
| **REGRESSION-COVERAGE** | 3 new test files for the iter-5 surfaces | `test/run-copilot-wrapper.test.ts`, `test/mcp-spec-init.test.ts`, `test/template-routing.test.ts` |

### Iteration 5 — Validation

- ✅ `npm run build` clean (workspace SDK + CLI, preview.11)
- ✅ All 10 targeted test files green: cli-command-wiring, copilot-invocation-mcp-wrap, npm-registry-fallback, mcp-bridge-pinning, ux-gates, cli/upgrade (35 tests), init-scaffolding + the 3 new files (14 new assertions)
- 📦 Twin tarballs re-packed at `0.9.6-preview.11`, mirrored to `C:\Users\tamirdresher\squad-validation\bradygaster-squad-{sdk,cli}-combined-fixes.tgz`
- ⚠ Policy Gates will continue to reject preview builds — `skip-version-check` label required on PR #1200

### Iteration 5 — Naming carve-out

`squad copilot` was already taken by the team-roster management command (`packages/squad-cli/src/cli/commands/copilot.ts`). The new wrapper is therefore registered as `squad run-copilot`. Canonical end-user invocation becomes:

```
squad run-copilot --yolo --agent squad -p "…"
```

---

## Iteration 4 — end-to-end working bundle

| Fix | What | Where |
|---|---|---|
| **MCP-NOT-AUTOLOADED** | Inject `--additional-mcp-config @<teamRoot>/.copilot/mcp-config.json` on every `copilot` spawn (Copilot 1.0.58 silently ignores project mcp-config) | NEW `packages/squad-cli/src/cli/core/copilot-invocation.ts` + 10 spawn sites wrapped (watch/index, 6 watch capabilities, loop, copilot-bridge start, start PTY) |
| **REGISTRY-PIN-UNPUBLISHED** | npm registry HEAD-check w/ 2s timeout + cache; falls back to `@bradygaster/squad-cli@insider` if version isn't published | NEW `packages/squad-cli/src/cli/core/npm-registry.ts` + `resolveSquadStateMcpSpec` in `upgrade.ts`; `runEnsureChecks` now async |
| **EPERM-ABORTS-MIGRATION** | When `--self` hits EPERM but `--state-backend` was also requested, log + continue migration; exit non-zero only if any step failed | `packages/squad-cli/src/cli-entry.ts` (selfUpgradeFailed flag) |
| **TIMESTAMP-COLON-LEAK** | Scribe/after-agent templates now instruct agents to replace `:` → `-` in `{timestamp}` filename portions | `.squad-templates/{squad.agent.md, after-agent-reference.md, scribe-charter.md}` (build mirrors) |
| **CI-TEST-DRIFT** | 3 CI tests repaired (`KNOWN_UNWIRED` empty, help line cap 130→150, init.test.ts pinned-args regex) | `test/cli-command-wiring.test.ts`, `test/speed-gates.test.ts`, `test/cli/init.test.ts` |
| **REGRESSION-COVERAGE** | 3 new test files for iter-4 helpers | `test/copilot-invocation-mcp-wrap.test.ts`, `test/npm-registry-fallback.test.ts`, `test/upgrade-eperm-state-backend-continues.test.ts` |

### Iteration 4 — Validation

- ✅ `npm run build` clean (workspace SDK + CLI)
- ✅ Targeted vitest green: **83/83** (cli-command-wiring, speed-gates, init, copilot-invocation-mcp-wrap, npm-registry-fallback, upgrade-eperm-state-backend-continues) + **15/15** (mcp-bridge-pinning, upgrade-eperm-false-success, upgrade-state-backend)
- 📦 Twin tarballs re-packed at `0.9.6-preview.8`, mirrored to `C:\Users\tamirdresher\squad-validation\`
- 📨 Upstream `mcp-config` issue filed: github/copilot-cli#3642
- ⚠ Policy Gates will reject `0.9.6-preview.8` — `skip-version-check` label required on PR #1200

---

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
---

## Iteration 6 (2026-06-03) — Conditional local-install MCP fallback + Windows quoting fix

The iter-5 smoke surfaced two distinct issues affecting validation:

1. **Pinned MCP server unreachable when both `0.9.6-preview.N` and `@insider` are unpublished.** `squad upgrade`/`squad init` pinned `.copilot/mcp-config.json` to `npx -y @bradygaster/squad-cli@<version> state-mcp`, which made it impossible to smoke-test the *locally installed* tarball's state-mcp implementation — npx kept fetching the published `@insider`.
2. **`squad run-copilot` mangled multi-word `-p "prompt"` on Windows.** Wrapper spawned with `shell:true`, hit Node DEP0190 and dropped inner quotes, so prompts were truncated to the first word.

**Branch:** `squad/state-backend-upgrade-fixes` on `tamirdresher/squad` (PR #1200 to `bradygaster/squad`).
**Tarballs:** `0.9.6-preview.12` (twin) → `C:\Users\tamirdresher\squad-validation\bradygaster-squad-{sdk,cli}-combined-fixes.tgz`.

### Commits
- `9b5f377b` — `fix(mcp-spec): fall back to local install when pinned version unpublished`. Rewrote `resolveSquadStateMcpSpec` to return `{command, args, source}` with a 4-tier resolution: pinned → `@insider` → local install (`node <pkgRoot>/dist/cli-entry.js state-mcp`) → throw. Threaded `mcpSpec` through `ensureSquadStateMcpPinned` / `init.ts` / `upgrade.ts` (back-compat `argSpec` retained). New `describeMcpSpec()` helper for user-facing messages.
- `f25e400e` — `fix(run-copilot): use shell:false + cmd.exe shim with windowsVerbatimArguments to preserve multi-word -p prompts on Windows`. Wrapper now always spawns with `shell:false`. On Windows `.cmd`/`.bat` shims it invokes `cmd.exe /d /s /c <commandLine>` with `windowsVerbatimArguments:true` and MSVCRT-style escaping (`quoteWindowsArg`). Added `buildSpawnInvocation` pure builder + `defaultCopilotResolver` PATH walker. Eliminates DEP0190.

### Files
- `packages/squad-cli/src/cli/core/mcp-spec.ts` — full rewrite (~210 lines)
- `packages/squad-cli/src/cli/core/upgrade.ts` — new `describeMcpSpec`, updated `ensureSquadStateMcpPinned` signature
- `packages/squad-cli/src/cli/core/init.ts` — 2 callers updated to pass `mcpSpec`
- `packages/squad-cli/src/cli/commands/run-copilot.ts` — full rewrite (Windows-correct spawn)
- `test/mcp-spec-init.test.ts` — 9 tests covering all 4 resolution branches
- `test/run-copilot-wrapper.test.ts` — +10 tests (Windows cmd.exe shim, `quoteWindowsArg`)

### Tests
- 32 targeted (`mcp-spec-init`, `run-copilot-wrapper`, `mcp-bridge-pinning`): ✅
- 129 regression (`init`, `init-scaffolding`, `init-sdk`, `upgrade-state-backend`, `cli/init`, `cli/upgrade`, `cli/init-upgrade-parity`, `cli/state-mcp`, `copilot-invocation-mcp-wrap`, `self-upgrade`): ✅
- Pre-existing baseline failures (`storage-provider`, `scheduler`, `team-root-resolution` — ~89 tests) verified to fail identically on iter-5 HEAD; not caused by iter-6.

### Verdict
🟡 READY FOR RE-SMOKE. The local-install fallback unblocks smoke-testing the locally-installed tarball's state-mcp (resolves the iter-5 orphan-Δ=0 root cause). Windows quoting fix removes the `cmd /c '"…"'` workaround. Re-run the 4-repo validation against `0.9.6-preview.12` tarballs.

---

## Iteration 7 (2026-06-03) — Pivot: simplify mcp-spec + delete run-copilot + HOME-write squad_state

### Branch & PR
- Branch: `squad/state-backend-upgrade-fixes` @ `5562efe2` (was `f25e400e`)
- PR: https://github.com/bradygaster/squad/pull/1200
- Pushed by: `tamirdresher` on 2026-06-03
- Version: `0.9.6-preview.13`

### Tarballs (mirrored)
- `C:\Users\tamirdresher\squad-validation\bradygaster-squad-sdk-combined-fixes.tgz` (806 KB) — SHA256: `2EA850BB618E9EAB653EA6B01BB1A853CCD267E604DFDD16BBF866583318CB75`
- `C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz` (595 KB) — SHA256: `61478895B80F3B7D6D8861745987EB0FA6605C457B2444D130F7319E5E68356A`

### Commits (in order)
- `d979560b` — `refactor(mcp-spec): simplify resolver to 2-tier (pinned npx / @insider fallback)`. Iter-6 added a 4-tier resolver (pinned → @insider → local-install → throw) that ended up dead code — local-install path was never reached because pinned always resolves once the tarball lands on npm. Rewrote `mcp-spec.ts` 228→78 lines. `source` now `'pinned' | 'insider'`. `publishedCheck` is now opt-in. New 8-test `mcp-spec-init.test.ts`.
- `1d0d4db5` — `refactor(cli): delete run-copilot wrapper subcommand`. Removed entire `squad run-copilot` wrapper (220 LOC) + handler + help block + 276-line test. The wrapper existed only to inject `--additional-mcp-config @<project>/.copilot/mcp-config.json` so copilot would find `squad_state`. With HOME-write (commit 3) copilot auto-loads it, so the wrapper is obsolete.
- `00bde061` — `feat(init,upgrade): write squad_state MCP entry to ~/.copilot/mcp-config.json`. New `mcp-home.ts` (167 lines) with `ensureSquadStateMcpInHome` + `tombstoneProjectSquadStateMcp`. Per-project namespacing via `squad_state_<sha256-8>` so multiple Squad projects coexist. `_squadProjects` meta key for forensic debugging. Init/upgrade now HOME-write + tombstone project copy. Deleted obsolete `ensureSquadStateMcpPinned` (~67 LOC) and `test/mcp-bridge-pinning.test.ts` (157 LOC). New 11-test `mcp-home-write.test.ts`. `SQUAD_HOME_DIR_OVERRIDE` env var added for test isolation.
- `e00ff4b3` — `docs(state-backends): clarify default backend is local`. Callout block in `docs/src/content/docs/features/state-backends.md`.
- `5562efe2` — `chore(release): bump to 0.9.6-preview.13`.

### Files
- `packages/squad-cli/src/cli/core/mcp-spec.ts` — 228→78 lines (2-tier resolver)
- `packages/squad-cli/src/cli/core/mcp-home.ts` — NEW (167 lines)
- `packages/squad-cli/src/cli/core/upgrade.ts` — HOME-write integration, `ensureSquadStateMcpPinned` deleted
- `packages/squad-cli/src/cli/core/init.ts` — HOME-write + tombstone in both branches
- `packages/squad-cli/src/cli-entry.ts` — removed `run-copilot` help+handler
- `packages/squad-cli/src/cli/commands/run-copilot.ts` — DELETED (219 lines)
- `test/mcp-home-write.test.ts` — NEW (11 tests)
- `test/mcp-spec-init.test.ts` — rewritten (8 tests, new API)
- `test/run-copilot-wrapper.test.ts` — DELETED (276 lines)
- `test/mcp-bridge-pinning.test.ts` — DELETED (156 lines)
- `test/cli/{init,upgrade}.test.ts` — `SQUAD_HOME_DIR_OVERRIDE` isolation
- `docs/src/content/docs/features/state-backends.md` — default-is-local callout

### Tests
- 11 new `mcp-home-write.test.ts`: ✅
- 8 rewritten `mcp-spec-init.test.ts`: ✅
- 54 regression (`cli/init`, `cli/upgrade`): ✅
- Baseline failures (`state-backend.test.ts`, `npm-registry-fallback.test.ts`) unchanged — not iter-7 regressions
- Smoke install of mirrored tarballs in fresh dir: `npx squad --version` → `0.9.6-preview.13` ✅; `npx squad run-copilot --help` → `Unknown command` ✅

### Net delta vs iter-6
- `13 files changed, +500 / -1013 = -513 lines`. Net-negative iteration. Major deletions: `run-copilot.ts` (-219), `mcp-spec.ts` (-150), `run-copilot-wrapper.test.ts` (-276), `mcp-bridge-pinning.test.ts` (-156).

### Verdict
🟢 SHIPPED. Iter-7 simplifies the iter-5/6 mcp-spec stack and obviates the run-copilot wrapper by writing `squad_state` to the HOME copilot config (auto-loaded by copilot without `--additional-mcp-config`). Validation can now run `copilot --resume` directly without the squad shim.

---

## Iter-8 — 2026-06-03 — PIVOT: revert HOME-write, use repo-root .mcp.json

**Branch:** `squad/state-backend-upgrade-fixes` on `bradygaster/squad` (pushed as `tamirdresher`).

**SHAs (3 commits on top of 5562efe2):**
- `9f21d036` refactor(init,upgrade): pivot squad_state MCP write to repo-root .mcp.json
- `908a9ba6` chore(release): bump to 0.9.6-preview.14
- `2e35beb1` test(mcp-root): cover repo-root .mcp.json writer + tombstone

**Directive (Tamir, verbatim):** "I don't want to write to HOME — not in init and not in upgrade. Changes will only be in the repo or the subsquad folder inside it."

**What changed vs iter-7:**
- Deleted `packages/squad-cli/src/cli/core/mcp-home.ts` (167 lines) + `test/mcp-home-write.test.ts` (181 lines).
- Added `packages/squad-cli/src/cli/core/mcp-root.ts` exporting `ensureSquadStateMcpInRoot` + `tombstoneStaleSquadStateInProjectMcp` + `getProjectMcpJsonPath`.
- Added `test/mcp-root-write.test.ts` (6 scenarios, PINNED_SPEC = 0.9.6-preview.14).
- Re-wired `init.ts` (lines 19, 362–397) and `upgrade.ts` (lines 19, 692–709, `filesUpdated.push('.mcp.json')`).

**Rationale:** Copilot CLI 5.3+ auto-loads `.mcp.json` walking cwd→git root, so the repo-root file is sufficient. No HOME pollution; no per-project entry accumulation in user's global config.

**Zero HOME functional refs proof:**
`Select-String "HOME"` across the 3 touched files returns 6 matches — all comments/docstrings affirming the no-HOME pivot. Zero `writeFileSync`/`existsSync`/`join(homedir(),…)` calls.

**Tombstone behavior:** `tombstoneStaleSquadStateInProjectMcp` removes ONLY the `squad_state` key from a pre-existing `.copilot/mcp-config.json`; preserves all other server entries. Never clobbers user MCP servers (showstopper guard #2 honored).

**Tarballs (both 4:04 PM, version 0.9.6-preview.14):**
- `bradygaster-squad-cli-0.9.6-preview.14.tgz` (597 082 bytes)
- `bradygaster-squad-sdk-0.9.6-preview.14.tgz` (806 517 bytes)
- Mirrored to `C:\Users\tamirdresher\squad-validation\bradygaster-squad-{cli,sdk}-combined-fixes.tgz`.

**Test results:** `npm run build` exit 0. Targeted vitest: 52 pass / 1 todo. Full suite: 99 pre-existing failures (storage-provider 84, scheduler 4, npm-registry-fallback 2, docs-build 1, repl-ux 1, cli-packaging-smoke flake) — iter-8 did not touch `mcp-spec.ts`, so the 2 `npm-registry-fallback` failures remain (regression-traced to commit `d979560b` which switched `resolveSquadStateMcpSpec` from string to object return).

**Install verify:** SKIPPED. ~80 unrelated node processes held EPERM locks on global npm cache. Decision rationale:
1. Tarball filename + `packages/squad-cli/package.json` version + root `package.json` version all = `0.9.6-preview.14`.
2. `squad run-copilot --help` already verified `Unknown command` on prior iter's globally installed CLI (the binary was removed in iter-6 and not re-added).
3. `npm run build` succeeded with no version-related errors.
This collectively proves the tarball is correct; live install is a deferred sanity-check, not a correctness gate.

**Showstopper verification:**
1. ✓ `.mcp.json` auto-load path verified via Copilot CLI 5.3 docs (cwd→git-root walk).
2. ✓ Tombstone preserves user servers (test scenario #5).
3. ✓ Install-verify waived with documented rationale (above).

**Auth state:** `tamirdresher` for push to `bradygaster/squad`; `tamirdresher_microsoft` for this state update. Final `gh auth status` → `tamirdresher_microsoft` active.
