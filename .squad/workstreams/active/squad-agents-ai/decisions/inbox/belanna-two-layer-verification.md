# Decision: Two-Layer State Backend Verification
**Author:** B'Elanna  
**Date:** 2026-06-03  
**Package:** `@bradygaster/squad-cli@0.9.6-preview.15`  
**References:** `SMOKE-ITER9-6REPO-DOGFOOD.md` (F3), `TWO-LAYER-VALIDATION-ITER9.md`

---

## Verdict: PARTIALLY VERIFIED

The two-layer state backend (git-notes + orphan branch) is **fully implemented and functional** when explicitly activated, but is **never activated by default**.

---

## What Was Verified (✅ Works)

- `squad init --state-backend two-layer` writes `"stateBackend": "two-layer"` to `.squad/config.json`
- `squad-state` orphan branch is created immediately (not lazily) when `--state-backend` flag is used
- `squad-state` branch holds `decisions.md` and `agents/*/history.md` (migrated from working tree)
- Each state write creates a new commit on `squad-state` (audit trail preserved)
- `squad_state_health` correctly reports `StateBackendStorageAdapter` (not `FSStorageProvider`) when two-layer is configured
- `refs/notes/squad` is created on first write, anchored to root commit as a JSON blob
- `OrphanBranchBackend.write()` via SDK correctly stores and round-trips content
- HOME mcp-config unchanged throughout (safety invariant holds)

## What Was NOT Verified (❌ Not Working / Not Default)

- Default `squad init` (no flags) still produces `{"version":1}` with no `stateBackend` key → uses `FSStorageProvider` → **F3 confirmed**
- `squad_state_write` via MCP tool layer produced empty orphan blob (content anomaly — separate from backend correctness)
- Upgrade path scenario (travel-assistant + `squad upgrade --state-backend two-layer`) not separately tested — code path confirmed equivalent to init via source inspection

---

## Root Cause of F3

```javascript
// cli/upgrade.js ~ line 241
if (options.stateBackend) {
  config['stateBackend'] = options.stateBackend;
  // ... orphan branch creation ...
}
// WITHOUT --state-backend flag:
// config is NOT mutated → no stateBackend key → resolves to 'local' → FSStorageProvider
```

The `--state-backend` flag is the exclusive activation gate. No default, no prompt, no docs visible during init.

---

## Required Action

Brady / CLI maintainer should decide:

1. **Make two-layer the default** — change `'local'` default in `resolveStateBackend()` to `'two-layer'`
2. **Add opt-in hint** — post-init message suggesting `--state-backend two-layer` for multi-worktree/persistent state
3. **Document explicitly** — make the opt-in requirement visible in init output and README

Finding F3 should remain open until one of these options is implemented and validated.
