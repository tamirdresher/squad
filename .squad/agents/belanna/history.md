# B'Elanna — Agent History
**Last Updated:** 2026-06-16T09:00:00+03:00
**Archive:** See `history-summary.md` for consolidated learnings from all prior rounds.

## Learnings — vitest 3→4 Upgrade (2026-06-16)

**Context:** Dependabot PR #1337 bumped `@vitest/coverage-v8` to `^4.1.9` but left `vitest` at `^3.0.0`, causing `ERESOLVE` in CI. Fix delivered as replacement PR #1352.

**The coordinated bump:**
Both `vitest` and `@vitest/coverage-v8` must always be bumped together — they require matching major versions. Dependabot bumped only the coverage plugin; vitest itself needs a matching bump in every `package.json` that references it (root + sample workspaces in this repo).

**Vitest 4 breaking changes encountered (and fixed):**

1. **Arrow functions no longer usable as constructor mocks.**
   `vi.fn(() => someObject)` used as a class mock (e.g., `FSStorageProvider: vi.fn(() => mockStorage)`) throws `TypeError: () => ... is not a constructor` in vitest 4 because of the spying implementation rewrite. Fix: use `function` keyword → `vi.fn(function() { return mockStorage; })`.

2. **`vi.restoreAllMocks()` no longer clears `vi.fn()` call history.**
   In vitest 4, `vi.restoreAllMocks()` only restores `vi.spyOn` implementations to originals; it does NOT reset `vi.fn()` mock call counts/results between tests. If a test expects `expect(someFn).not.toHaveBeenCalled()` but a prior test in the same file called it, the assertion fails. Fix: add `vi.clearAllMocks()` to `afterEach` alongside `vi.restoreAllMocks()`.

**Push strategy:**
Dependabot branch requires Dependabot-owned auth — `--force-with-lease` push from a human token returns 403. Pattern: create replacement PR from fork. EMU accounts cannot fork external repos; use the personal (non-EMU) `tamirdresher` account to push to fork, then open PR with `--head "tamirdresher:branch-name"`.

**No vitest.config changes needed:**
The `defineConfig` from `vitest/config` and the `test.coverage.provider = 'v8'` pattern remain valid in vitest 4. The `workspace` → `projects` rename and the `vite-node` removal did not apply to this repo.



**Context:** Dependabot PR #1348 bumped `@opentelemetry/sdk-node` 0.57.2 → 0.219.0 (and related exporters). This pulled in `@opentelemetry/resources` 2.x, which broke the `Resource` constructor.

**The break:**
`@opentelemetry/resources` 2.x removed `Resource` as an instantiable class. It is now exported only as a TypeScript `type`. Calling `new Resource({...})` throws `TypeError: Resource is not a constructor`.

**The fix:**
Replace `new Resource(attrs)` with `resourceFromAttributes(attrs)` — a function exported from `@opentelemetry/resources` 2.x that returns the same Resource-shaped object.

```typescript
// OLD (breaks on @opentelemetry/resources 2.x):
import { Resource } from '@opentelemetry/resources';
const resource = new Resource({ 'service.name': 'foo' });

// NEW:
import { resourceFromAttributes } from '@opentelemetry/resources';
const resource = resourceFromAttributes({ 'service.name': 'foo' });
```

**Via sdk-node re-export:**
`@opentelemetry/sdk-node` 0.219.0 re-exports `* as resources from '@opentelemetry/resources'`, so `resources.resourceFromAttributes` also works when using the sdk-node barrel import.

**Version note:**
The package versioning is asymmetric — the SDK packages (`sdk-node`, `exporter-*`) use `0.219.0`, but `@opentelemetry/resources` moved to its own `2.x` series (`2.8.0` at time of this migration). Don't assume version parity across the OTel JS monorepo packages.

**Option A (patch dependabot branch) still works:**
Pushed directly to `dependabot/npm_and_yarn/minor-patch-711f8ce790`. Dependabot did not recreate the branch. CI `test` job passed. Policy Gates failure (changelog) is pre-existing process requirement, not a code issue — add `skip-changelog` label to unblock merge.

## Round 5 — P0 Revalidation (2026-06-04)

**Status:** COMPLETE — all 3 P0 closed with empirical evidence, ship ready

**Revalidation Results:**
- A3 (promoteNotes wiring): 2 production callers verified, idempotent ✓
- B1 (30k-commit ENOBUFS): succeeded 5.28s (was crash) ✓
- B2 (2.33MB orphan blob ENOBUFS): <1s byte-exact round-trip (was crash) ✓

**Key Insights:**
- Two-layer backend has two coexisting note storage schemes (no conflict, different refs)
- TwoLayerBackend's orphan-branch CAS pattern explains crash immunity
- Git-notes lacks CAS → data loss guaranteed without external coordination
- Windows vitest: multi-subprocess tests need 30000ms timeout (default 5000ms insufficient)

**Dogfood Findings (Iter-9):** F1 deferred, F2–F5 resolved/approved
