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

**Last Updated:** 2026-06-03T21:05:00Z  
**Archive:** `.squad/agents/picard/history-archive.md` (2026-06-02 decisions and learnings)
