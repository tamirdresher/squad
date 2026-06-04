# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI architecture, routing invariants, extensibility design, API surface decisions
- **Created:** 2026-06-02T10:30:00Z

## Picard — Core Mission

Picard (Lead Architect) owns product architecture decisions, extension-point evaluation, routing invariant protection, and implementation readiness gates. Architecture reviewer for Squad.Agents.AI auth expansion.

## 2026-06-03 — Docs-Must-Match-Implementation Directive (Code-First Priority)

**Status:** LOCKED for all future PR work

Critical behavioral directive from Copilot: Implementation drives documentation; if code and docs conflict, fix code first, never revert code to match outdated docs. Applied to PR #1200 and all future Squad.Agents.AI work. Picard must enforce this as architectural law.

---

## 2026-06-04 — PR #1200: Fix `squad upgrade --state-backend` (UPGRADE-FLAG-IGNORED)

**Status:** COMPLETE — pushed to `tamirdresher/squad` branch `squad/state-backend-upgrade-fixes`

**Problem:** `squad upgrade --state-backend two-layer` silently dropped the flag and never wrote `stateBackend` to `.squad/config.json`.

**Root cause:** `runUpgrade()` was backend-agnostic; the CLI entry never called `migrateStateBackend`.

**Fix (commit e010b161):** `cli-entry.ts` calls `migrateStateBackend(dest, upgradeStateBackend)` after `runUpgrade` when `--state-backend` is supplied. `migrateStateBackend` JSON-merges `stateBackend` into config.json and installs git hooks.

**Test work (commit bc5e81ee):** All 4 regression tests in `test/upgrade-state-backend.test.ts` were timing out at the default 5 s Vitest limit because git plumbing ops (orphan branch, hook installation) take > 5 s. Added `{ timeout: 30_000 }` to all tests and added a 5th test (`UPGRADE-FLAG-IGNORED (clean target)`) covering the case where config.json has **no** `stateBackend` field at all — the original bug scenario.

**Architectural decision:** `stateBackend` migration is deliberately split from `runUpgrade()` to keep the upgrade operation backend-agnostic. This is locked pattern for all future upgrade work.

---

---

## 2026-06-04 — PR #1200: Fix 4 Stale Test Expectations (iter-9 drift)

**Status:** COMPLETE — commit `3f0a16d6` pushed to `bradygaster/squad` branch `squad/state-backend-upgrade-fixes`

**Date:** 2026-06-03T23:25:00+03:00

**Problem:** 4 tests were failing in CI due to iter-9 drift — the tests had not been updated to match the implementation changes made in commit `9f21d036` (iter-9 pivot to repo-root `.mcp.json` and `resolveSquadStateMcpSpec` object return shape).

**No production bug found.** Directive honored: test drift only.

---

### Test 1 — `copilot-invocation-mcp-wrap.test.ts`: `returns --additional-mcp-config @<absolute path> when config exists`

**Wrong assertion:**
```ts
mkdirSync(path.join(workdir, '.copilot'), { recursive: true });
const cfg = path.join(workdir, '.copilot', 'mcp-config.json');
writeFileSync(cfg, '{"mcpServers":{}}');
const args = buildAdditionalMcpConfigArgs('copilot', workdir);
expect(args).toEqual(['--additional-mcp-config', `@${cfg}`]);
```

**Fixed assertion:**
```ts
const cfg = path.join(workdir, '.mcp.json');
writeFileSync(cfg, '{"mcpServers":{}}');
const args = buildAdditionalMcpConfigArgs('copilot', workdir);
expect(args).toEqual(['--yolo', '--additional-mcp-config', `@${cfg}`]);
```

**Drift:** iter-9 moved config from `.copilot/mcp-config.json` → repo-root `.mcp.json` AND added `--yolo` to the returned args array.

---

### Test 2 — `copilot-invocation-mcp-wrap.test.ts`: `withAdditionalMcpConfig prepends the flag to user args when applicable`

**Wrong assertion:**
```ts
mkdirSync(path.join(workdir, '.copilot'), { recursive: true });
const cfg = path.join(workdir, '.copilot', 'mcp-config.json');
writeFileSync(cfg, '{}');
const result = withAdditionalMcpConfig('copilot', ['-p', 'hi'], workdir);
expect(result[0]).toBe('--additional-mcp-config');
expect(result[1]).toBe(`@${cfg}`);
expect(result.slice(2)).toEqual(['-p', 'hi']);
```

**Fixed assertion:**
```ts
const cfg = path.join(workdir, '.mcp.json');
writeFileSync(cfg, '{}');
const result = withAdditionalMcpConfig('copilot', ['-p', 'hi'], workdir);
expect(result[0]).toBe('--yolo');
expect(result[1]).toBe('--additional-mcp-config');
expect(result[2]).toBe(`@${cfg}`);
expect(result.slice(3)).toEqual(['-p', 'hi']);
```

**Drift:** Same as Test 1 — path changed + `--yolo` added at index 0, shifting all subsequent indices.

---

### Test 3 — `npm-registry-fallback.test.ts`: `falls back to @insider when version is empty / 0.0.0`

**Wrong assertion:**
```ts
const spec = await resolveSquadStateMcpSpec('0.0.0');
expect(spec).toBe('@bradygaster/squad-cli@insider');
```

**Fixed assertion:**
```ts
const spec = await resolveSquadStateMcpSpec('0.0.0');
expect(spec).toEqual({
  command: 'npx',
  args: ['-y', '@bradygaster/squad-cli@insider', 'state-mcp'],
  source: 'insider',
});
```

**Drift:** `resolveSquadStateMcpSpec` now returns `SquadStateMcpSpec` object (`{ command, args, source }`) instead of a bare string. Defined in `packages/squad-cli/src/cli/core/mcp-spec.ts`.

---

### Test 4 — `npm-registry-fallback.test.ts`: `falls back to @insider when version is not published on the registry`

**Wrong assertion:**
```ts
const spec = await resolveSquadStateMcpSpec('999.999.999-not-a-real-version');
expect(spec).toBe('@bradygaster/squad-cli@insider');
```

**Fixed assertion:**
```ts
const spec = await resolveSquadStateMcpSpec('999.999.999-not-a-real-version');
expect(spec).toEqual({
  command: 'npx',
  args: ['-y', '@bradygaster/squad-cli@insider', 'state-mcp'],
  source: 'insider',
});
```

**Drift:** Same as Test 3 — object return shape.

---

### Results

- **Production bug found:** No
- **Target tests:** 4/4 PASS
- **Picard's prior work (`test/upgrade-state-backend.test.ts`):** 5/5 PASS (no regression)
- **Data's work (`test/state-backend.test.ts`):** Pre-existing vitest-worker timeouts on heavy integration tests (confirmed pre-existing: 4 failures baseline before this commit). Not caused by these changes.
- **Commit SHA:** `3f0a16d6`
- **Pushed to:** `bradygaster/squad` branch `squad/state-backend-upgrade-fixes` (PR #1200) via `tamirdresher` auth
- **CI status:** ✅ ALL GREEN — `test` job PASS (4m39s), all 6 CI jobs passed. Run: https://github.com/bradygaster/squad/actions/runs/26912848805

---

**2026-06-03T21:05:00Z — PR #1200 FULLY GREEN (all 6 CI jobs pass) after this iter-9 test drift fix (commit 3f0a16d6).**

---

## 2026-06-04 — PR #1200: Copilot Reviewer Follow-up (5 inline comments)

**Status:** COMPLETE — 5 commits pushed, CI running

**Date:** 2026-06-04T07:36:00+03:00

**Reviewer comments addressed:**

| # | Comment | Fix | Commit |
|---|---------|-----|--------|
| 1 | `loadLatestSession` / `saveSession` ignore `stateDir` | Added optional `stateDir?` to all 5 session-store functions; threaded through `shell/index.ts` | `8f3208ac` |
| 2 | `checkGitSyncHooks` uses hardcoded `.git/hooks`, breaks worktrees | 3-step resolution: `core.hooksPath` → `git rev-parse --git-dir` → fallback | `dab1d9e8` |
| 3 | `'approved'` kind not deprecated / no backward-compat normalization | `@deprecated` in `types.ts`; normalize wrapper in `client.ts`; `knock-knock` updated | `55e843c0` |
| 4 | `resolveGlobalSquadPath()` writes to real user APPDATA in tests | Top-level `beforeEach`/`afterEach` stubs `APPDATA`/`XDG_CONFIG_HOME` | `3a02478f` |
| 5 | Same as #4 for `XDG_CONFIG_HOME` | Same commit | `3a02478f` |

**Regression tests:** `c9e5b755` — 3 new stateDir tests in `session-store.test.ts`; 4 refactored + 2 new git-dir tests in `doctor.test.ts`. All 54 tests pass.

**Key engineering decisions:**
- Hook tests use `checkGitSyncHooks` directly (not `runDoctor`) to avoid `scaffold()` + `git init` exceeding 5000ms vitest timeout.
- Each hook test calls `git init` in `TEST_ROOT` so `git rev-parse --git-dir` resolves locally and doesn't bleed into the outer repo's `.git`.
- `'approved'` normalization lives in `client.ts` adapter boundary — not in core session logic — to keep the SDK type-pure.

---

## 2026-06-04 — Task 1: tamresearch1 live upgrade to insider.3

**Objective:** Upgrade production repo `tamresearch1` from squad-cli 0.9.4 to 0.9.6-insider.3 with full safety protocol.

**Outcome:** ✅ Complete (with 2 manual interventions)

**Key findings:**
1. `squad upgrade` updates templates/workflows/skills/agent.md but does NOT create `.mcp.json` or update the npm devDependency pin.
2. `.mcp.json` manually created with validated SMOKE-ITER8 spec (`squad_state` → `npx @bradygaster/squad-cli@insider state-mcp`).
3. npm pin updated via `npm install --save-dev @bradygaster/squad-cli@insider` → `0.9.6-insider.3`.
4. `config.json` with `stateBackend: "two-layer"` preserved unchanged. HOME mcp-config untouched. Ralph watch unaffected.
5. E2E MCP write proof (steps 23-24) requires interactive Copilot CLI session — deferred to Tamir.

**Artifacts:** `decisions/inbox/picard-tamresearch1-upgrade-evidence.md`

---

## 2026-06-04 — Task 2: MCP front-matter injection research

**Objective:** Determine if MCP server config can be injected when squad spawns CLI subagents.

**Outcome:** ❌ Not possible with current platform. Recommendation: Option A+B (graceful fallback + documentation).

**Key findings:**
1. CLI `task` tool has no `additional_mcp_config` parameter — subagents are isolated processes.
2. VS Code `runSubagent` inherits parent MCP tools; CLI `task` does not.
3. The "Passing MCP Context" block in squad.agent.md is informational only — tells subagents about tools but doesn't inject them.
4. Recommended approach: document the limitation, instruct subagents to use file-based state writes, and file a platform feature request.

**Artifacts:** `decisions/inbox/picard-mcp-front-matter-investigation.md`

**Last Updated:** 2026-06-04T08:30:00+03:00  
**Archive:** `.squad/agents/picard/history-archive.md` (2026-06-02 decisions and learnings)

**2026-06-04:** B'Elanna's preview.18 tarballs (c9e5b755) empirically close published-insider-3 gap; real-world tamresearch1 upgrade validation confirms GAP-1/GAP-2 fixes needed
