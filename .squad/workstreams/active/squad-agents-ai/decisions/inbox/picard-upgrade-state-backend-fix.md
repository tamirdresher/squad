# Decision: `squad upgrade --state-backend` fix (UPGRADE-FLAG-IGNORED)

**Author:** Picard  
**Date:** 2026-06-04  
**Status:** RESOLVED — code merged to PR #1200

---

## Problem

`squad upgrade --state-backend two-layer` silently dropped the `--state-backend` flag.  
`stateBackend` was never written to `.squad/config.json`.

## Root Cause

`runUpgrade()` in `core/upgrade.ts` is backend-agnostic and only reads config; it never writes `stateBackend`. The CLI entry point (`cli-entry.ts`) was not calling `migrateStateBackend` when the flag was supplied.

## Fix

**Commit `e010b161`** — After `runUpgrade` completes, `cli-entry.ts` now calls:

```ts
await migrateStateBackend(dest, upgradeStateBackend);
```

`migrateStateBackend` (in `migrate-backend.ts`) JSON-merges `{ stateBackend: target }` into config.json and installs git hooks.

## Architectural Ruling (LOCKED)

`stateBackend` migration is intentionally kept **separate from `runUpgrade()`**. `runUpgrade` must stay backend-agnostic. All future upgrade-related state-backend changes must follow this split pattern.

## Tests

**Commit `bc5e81ee`** added `{ timeout: 30_000 }` to all tests in `test/upgrade-state-backend.test.ts` (git plumbing ops exceed the default 5 s limit) and added a 5th test:

- **UPGRADE-FLAG-IGNORED (clean target):** verifies that when config.json has **no** `stateBackend` field (original bug condition), migration writes the field and preserves other fields like `teamRoot`.

All 5 tests pass (≈ 30 s total on Windows).
