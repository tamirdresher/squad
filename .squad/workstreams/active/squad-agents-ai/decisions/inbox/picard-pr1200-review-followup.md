# Decision: PR #1200 Copilot Reviewer Follow-up — 5 Inline Comments

**Date:** 2026-06-04T07:36:00+03:00  
**Author:** Picard (Lead Architect)  
**PR:** bradygaster/squad#1200 (`squad/state-backend-upgrade-fixes`)  
**Status:** Pushed — CI running

---

## Context

Copilot Code Review left 5 inline comments on PR #1200. All 5 were addressed with production fixes + regression tests in a single session.

---

## Decisions Made

### 1. `stateDir` threading through session-store (Finding 1)

**Decision:** Add optional `stateDir?` as last parameter to all 5 public session-store functions (`sessionsDir`, `saveSession`, `listSessions`, `loadLatestSession`, `loadSessionById`). When provided, sessions live at `join(stateDir, 'sessions')` instead of `join(teamRoot, '.squad', 'sessions')`. Thread through `shell/index.ts` load/save call-sites.

**Rationale:** Backward-compatible. Does not break any existing callers. Matches the pattern established by `resolveExternalStateDir`.

**Commit:** `8f3208ac`

---

### 2. Hook path resolution in `checkGitSyncHooks` (Finding 2)

**Decision:** Use the same 3-step hook-path resolution as `install-hooks`:
1. `git config --get core.hooksPath` (custom hooks path)
2. `git rev-parse --git-dir` (worktree-aware `.git` resolution)
3. Fallback to `path.join(cwd, '.git', 'hooks')`

**Rationale:** `checkGitSyncHooks` was reporting PASS on worktrees because it looked at `.git/hooks` (which is a file on worktrees, not a directory). The doctor check must use the same resolution logic as the installer or it produces false results.

**Commit:** `dab1d9e8`

---

### 3. `'approved'` normalization at adapter boundary (Finding 3)

**Decision:** Mark `'approved'` as `@deprecated` in `types.ts`. Add a normalization wrapper in `client.ts` `createSession()` that translates `{ kind: 'approved' }` → `{ kind: 'approve-once' }`. Update `samples/knock-knock` to use `'approve-once'` directly.

**Rationale:** The normalization belongs in the adapter boundary (`client.ts`), not in core session logic, to keep SDK types pure. This follows the adapter-boundary pattern used elsewhere in the SDK.

**Commit:** `55e843c0`

---

### 4+5. Env-var stubbing for `resolveGlobalSquadPath()` in tests (Findings 4+5)

**Decision:** Add top-level `beforeEach`/`afterEach` (outside all `describe` blocks) to `test/effective-squad-dir.test.ts` that stubs `APPDATA` (Windows) and `XDG_CONFIG_HOME` (Linux/macOS) to a unique temp dir. Remove manual `rmSync` cleanup calls that relied on hard-coded paths.

**Rationale:** Vitest's top-level hooks run before/after describe-level hooks, so env vars are set before any `describe`-level `beforeEach` that might call `resolveGlobalSquadPath()`. This ensures the test never pollutes the real user config directory on any platform.

**Commit:** `3a02478f`

---

### 6. Hook test isolation strategy (Engineering decision)

**Decision:** Refactor the 4 hook-related tests in `doctor.test.ts` to:
- NOT call `scaffold()` (slow; creates many unneeded files)
- Call `checkGitSyncHooks` directly instead of `runDoctor` (avoids 2000ms of async doctor checks)
- Call `git init` in `TEST_ROOT` before creating `.git/hooks` (so `git rev-parse --git-dir` resolves locally, not to the outer repo's `.git`)

**Rationale:** `scaffold()` + `git init` + `runDoctor` exceeded the 5000ms Vitest default timeout. The hook tests only need to verify `checkGitSyncHooks` logic — they don't need the full doctor pipeline. Direct calls are ~700ms vs ~2500ms+ for full doctor.

**Commits:** `c9e5b755` (regression tests)

---

## Files Changed

| File | Change |
|------|--------|
| `packages/squad-cli/src/cli/shell/session-store.ts` | Optional `stateDir?` on 5 functions |
| `packages/squad-cli/src/cli/shell/index.ts` | Thread `stateDir` through load/save |
| `packages/squad-cli/src/cli/commands/doctor.ts` | 3-step hook-path resolution |
| `packages/squad-sdk/src/adapter/types.ts` | `@deprecated` on `'approved'` |
| `packages/squad-sdk/src/adapter/client.ts` | Normalization wrapper |
| `samples/knock-knock/index.ts` | `'approve-once'` direct usage |
| `test/effective-squad-dir.test.ts` | Env-var stubbing |
| `test/session-store.test.ts` | 3 new stateDir regression tests |
| `test/cli/doctor.test.ts` | 4 refactored + 2 new git-dir tests |
