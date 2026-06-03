# Project Context

Scribe executes Squad's post-session orchestration workflow. Session context: 2026-06-03T19:15:00Z. Current focus: Policy-gate insider fix + docs-must-match-implementation directive. Goals: log decisions, capture directive constraints, compact archived metadata. All infrastructure in place. Running final orchestration tasks.

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

---

## 2026-06-03 — Policy Gate Insider Expansion COMPLETE + skip-version-check CI Label

**PR #1200 Commits:** 5bef8f28 (add `-preview.N`), 4da11839 (add `-insider.N` + tests)  
**Label:** `skip-version-check` (gates pre-release CI bypass)  
**Status:** MERGED to PR #1200; ready for maintainer sign-off

Policy Gate regex now accepts `-preview.N` and `-insider.N` patterns, enabling preview and insider builds to bypass strict version locking. All 14 assertions passing. Worf security review APPROVED_WITH_CONDITIONS (3 blocking, 2 recommended).

## Policy Gate Fix — 2026-06-03T22:04:13+03:00

### Prerelease Version Guard — Regex Expanded (PR #1200)

**Task:** Expand the CI Policy Gates "Prerelease Version Guard" to allow `-preview.N` and `-insider.N` suffix patterns.

**Files changed (branch: `squad/state-backend-upgrade-fixes` @ tamirdresher/squad):**

| File | Change |
|------|--------|
| `.github/workflows/squad-ci.yml` | Updated regex + comment + error message |
| `CONTRIBUTING.md` | Updated "Local Development Versioning" to mention `preview.N` and `insider.N` |

**Old regex:**
```js
/-/.test(pkg.version) && !/^\d+\.\d+\.\d+-preview$/.test(pkg.version)
```

**New regex:**
```js
!/^\d+\.\d+\.\d+(-(preview|insider)(\.\d+)?)?$/.test(pkg.version)
```

**Versions now accepted:**
- `0.9.6` — clean semver ✅
- `0.9.6-preview` — canonical dev suffix ✅
- `0.9.6-preview.15` — numbered preview iteration ✅ (was blocked)
- `0.9.6-insider.3` — insider dist-tag ✅ (was blocked)

**Versions still rejected:**
- `0.9.6-alpha`, `0.9.6-beta`, `0.9.6-rc.1`, any other suffix ❌

## Iter-9 — 2026-06-03 — Root-cause fix: inject `--yolo --additional-mcp-config @.mcp.json` in all copilot spawns

**Branch:** `squad/state-backend-upgrade-fixes` on `bradygaster/squad` (HEAD `f8347d84`, pushed as `tamirdresher`).
**Version:** `0.9.6-preview.15` (bumped from preview.14).

### Root cause confirmed

`copilot-invocation.ts` (the helper through which ALL squad-internal `copilot` spawns flow) was checking for `.copilot/mcp-config.json` (iter-7 path). Iter-8 pivoted to repo-root `.mcp.json` but this file was never updated. Result: path check returned nothing, `--additional-mcp-config` injection was silently skipped, all three smoke sessions failed with `squad_state_*` tools unavailable.

A second bug: `--yolo` was never injected. Without it, `copilot -p` waits for per-tool consent prompts and hangs in non-interactive mode.

### Changes shipped

| File | Change |
|---|---|
| `packages/squad-cli/src/cli/core/copilot-invocation.ts` | Fix path: `.copilot/mcp-config.json` → `.mcp.json`; prepend `--yolo`; add missing-file warning; add `--yolo` dedup guard |
| `packages/squad-cli/src/cli/core/init.ts` | Add `squad:copilot` script tip to post-init output |
| `packages/squad-cli/templates/ralph-reference.md` | Add MCP trust gate note in Watch Mode section |
| `packages/squad-cli/templates/squad.agent.md.template` | Mirror trust gate note (twin of squad.agent.md) |
| `.github/agents/squad.agent.md` | Add watch mode MCP note under Ralph section |
| `docs/src/content/docs/features/copilot-mcp-trust.md` | NEW: user-facing doc with trust gate explanation, test matrix, workaround |
| `.changeset/iter9-non-interactive-mcp-load.md` | NEW: minor changeset |
| `packages/squad-cli/package.json` | Version bump to `0.9.6-preview.15` |

### Build & tarballs

- `npm run build` exit 0 (workspace, SDK + CLI, preview.15)
- Tarballs repacked at preview.15, mirrored to `C:\Users\tamirdresher\squad-validation\bradygaster-squad-{cli,sdk}-combined-fixes.tgz`

**Auth state:** pushed as `tamirdresher`, restored to `tamirdresher_microsoft`.

## 2026-06-03 — Iter-9 Docs Audit Complete

**Agent:** Data | **Workstream:** squad-agents-ai / combined-fixes docs pass
**Branch:** `squad/state-backend-upgrade-fixes` | **Commit:** `1c628000`
**Pushed as:** `tamirdresher`

Audited all iter-9 (v0.9.6-preview.15) user-facing docs for accuracy against shipped code.

**Source-of-truth verified:**
- `packages/squad-cli/src/cli/core/copilot-invocation.ts`: `buildAdditionalMcpConfigArgs()` injects `['--yolo', '--additional-mcp-config', '@<abs-path>/.mcp.json']` when `cmd === 'copilot'` AND `.mcp.json` exists at `teamRoot`. Missing file → warning + empty array. `withAdditionalMcpConfig()` deduplicates `--yolo` if caller already supplied it.
- `packages/squad-sdk/src/state-backend.ts`: `StateBackendType = 'local' | 'external' | 'orphan' | 'two-layer'`. `'worktree'` silently normalizes to `'local'` (no warning). `'git-notes'` normalizes to `'two-layer'` with deprecation warning.

**Files audited:**
- `features/copilot-mcp-trust.md` — accurate, is the canonical link target. Not modified.
- `features/state-backends.md` — no iter-9 issues. Not modified.
- `features/worktrees.md` — clean. Not modified.

**Files modified (3 cross-link additions):**
- `features/ralph.md` — Watch Mode `--execute` section: added sentence noting `--yolo --additional-mcp-config @.mcp.json` auto-injection + link to `copilot-mcp-trust.md`.
- `features/loop.md` — Prerequisites section: added blockquote noting `squad loop` auto-injects MCP flags + link to `copilot-mcp-trust.md`.
- `reference/cli.md` — `squad loop` section: added `**MCP auto-injection:**` paragraph + link to `../features/copilot-mcp-trust.md`.

**Explicitly excluded (per Tamir directive `copilot-directive-2026-06-03T205959-skip-c2-c3.md`):**
- C-2: selective squad_state-only inline JSON
- C-3: extra security callouts / warnings

---

## 2026-06-03 — NEW-4: MCP squad_state_write empty-blob fix

**Bug:** `squad_state_write` via MCP tool layer wrote empty content (blob SHA `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`) to the orphan branch while direct `OrphanBranchBackend.write()` worked correctly.

**Root cause (confirmed by call-chain trace):**
`parseObject()` in `state-mcp.ts` casts `params['arguments']` to `Record<string,unknown>` with no validation. When the MCP payload omits `content`, `args.content` is `undefined` at runtime despite `StateWriteRequest` typing it `string`. `StateBackendStorageAdapter.writeSync(path, undefined)` passes `undefined` to `OrphanBranchBackend.write()`, then to `gitExecWithInput(['hash-object', '-w', '--stdin'], undefined, cwd)`. Node.js `execFileSync` with `input: undefined` passes no stdin bytes → git hashes empty input → empty blob.

**Fix:** Added runtime content guards in `stateWrite` and `stateAppend` handlers (`packages/squad-sdk/src/tools/index.ts`) that check `args.content == null || typeof args.content !== 'string'` and return `{ resultType: 'failure', error: 'content is required' }` before reaching the backend. Does NOT coerce to `""` (would mask caller error).

**Files changed:**
| File | Change |
|------|--------|
| `packages/squad-sdk/src/tools/index.ts` | Add runtime content guard in `stateWrite` (+8 lines) and `stateAppend` (+8 lines) handlers |
| `test/state-backend.test.ts` | Add 3 regression tests in `ToolRegistry state tools with git-native backend` describe block |

**Commit:** `debd05c4` on branch `squad/state-backend-upgrade-fixes` in `tamirdresher/squad`  
**Tests:** 3 new tests all pass; 2 pre-existing failures in `state-backend.test.ts` unchanged  
**Auth state:** pushed as `tamirdresher`, restored to `tamirdresher_microsoft`

---

**2026-06-03T21:05:00Z — PR #1200 FULLY GREEN (all 6 CI jobs pass) after Picard's iter-9 test drift fix (commit 3f0a16d6).**

**Last Updated:** 2026-06-03T21:05:00Z  
**Archive:** See `.squad/agents/data/history-archive.md` for all 2026-06-02 and earlier entries.
