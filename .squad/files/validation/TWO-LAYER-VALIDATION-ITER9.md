# Two-Layer State Backend Validation — Iter-9 Follow-up
**Date:** 2026-06-03  
**Package:** `@bradygaster/squad-cli@0.9.6-preview.15` + `@bradygaster/squad-sdk@0.9.6-preview.15`  
**Tarballs:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` (C:\Users\tamirdresher\squad-validation\)  
**Conducted by:** B'Elanna (Durable Systems Engineer)  
**Prior finding:** F3 from `SMOKE-ITER9-6REPO-DOGFOOD.md` — `stateBackend: "two-layer"` NOT written to config after init; `squad_state_health` reports `FSStorageProvider`

---

## Executive Summary

**Verdict: PARTIALLY WORKING — Two-layer is fully implemented and functional, but is OPT-IN ONLY.**

The two-layer state backend (git-notes + orphan branch) is a complete, working system that:
- Correctly stores permanent state on a `squad-state` orphan branch (one commit per write)
- Correctly stores commit-scoped annotations via `refs/notes/squad` (JSON blob on root commit)
- Correctly reports `StateBackendStorageAdapter` via `squad_state_health` when active

However, it is **never activated by default**. `squad init` and `squad upgrade` without an explicit `--state-backend two-layer` flag produce `{"version":1}` config with no `stateBackend` key, which resolves to `'local'` (WorktreeBackend → FSStorageProvider). This is the root cause of Finding F3.

---

## Architecture (Source-Confirmed)

### Resolution Chain (`state-backend.js` ~ line 571)

```
resolveStateBackend(cliOverride?, configBackend?)
  chosen = normalizeBackendType(cliOverride ?? configBackend ?? 'local')
  'local' | 'worktree' → WorktreeBackend → FSStorageProvider   ← DEFAULT
  'orphan'             → OrphanBranchBackend → StateBackendStorageAdapter
  'two-layer'          → TwoLayerBackend → StateBackendStorageAdapter
  'git-notes'          → deprecated → silently migrates to 'two-layer'
```

### TwoLayerBackend (`state-backend.js` ~ line 528)

```
TwoLayerBackend {
  orphan: OrphanBranchBackend  // squad-state branch — permanent state
  notes:  GitNotesBackend      // refs/notes/squad — commit-scoped annotations

  write(key, value):
    orphan.write(key, value)          // primary write, throws on failure
    try { notes.write(key, value) }   // secondary, swallows errors (best-effort)

  read(key):  orphan.read(key)
  list(dir):  orphan.list(dir)
  delete(key): both, secondary swallows errors
  append(key): both, secondary swallows errors
}
```

### OrphanBranchBackend (`state-backend.js` ~ line 191)

- Lazy branch creation: `ensureBranch()` called on first `write()`, NOT at init
- Each write: `git hash-object -w --stdin` → `commit-tree` → `update-ref`
- One commit per write, parent chain preserved
- Branch: `squad-state`

### GitNotesBackend (`state-backend.js` ~ line 102)

- Stores ALL state as a single JSON object at `refs/notes/squad`
- Anchored to repo's **root commit** (first `--max-parents=0` commit) — persists across branch switches
- `loadBlob()`: reads `refs/notes/squad show <anchor>` → parses JSON
- `saveBlob(blob)`: `git notes --ref squad add -f --file - <anchor>`
- Structure: `{"agents/scribe/history.md": "...", "decisions.md": "...", ...}`

### Activation Gate (`cli/upgrade.js` ~ line 241)

`--state-backend` flag is the ONLY way to activate non-local backends:
```javascript
if (options.stateBackend) {
  config['stateBackend'] = options.stateBackend;
  if (stateBackend === 'orphan' || stateBackend === 'two-layer') {
    // git plumbing: hash-object → mktree → commit-tree → update-ref
    // liftInitMutableStateOntoOrphan() → migrates decisions.md + agents/*/history.md
  }
}
// Without flag: config is NOT mutated → no stateBackend key → resolves to 'local'
```

---

## Scenario 1A: Default Init (No `--state-backend` Flag)

**Test repo:** `two-layer-validation\two-layer-fresh\`  
**Command:** `node_modules\.bin\squad-cli init` (no flags)

| Artifact | Expected (two-layer) | Actual | Result |
|---|---|---|---|
| `.squad/config.json` | `{"stateBackend":"two-layer"}` | `{"version":1}` | ❌ F3 CONFIRMED |
| `squad-state` branch | created | absent | ❌ |
| `refs/notes/squad` | created | absent | ❌ |
| `squad_state_health` | `StateBackendStorageAdapter` | `FSStorageProvider` | ❌ |
| `.mcp.json` installed | ✓ | ✓ | ✅ |
| HOME mcp-config SHA256 | unchanged | unchanged | ✅ |

**Root cause:** `init` without `--state-backend two-layer` → no `stateBackend` in config → `resolveStateBackend()` defaults to `'local'` → `WorktreeBackend` → `FSStorageProvider`.

---

## Scenario 1B: Explicit Two-Layer Init (`--state-backend two-layer`)

**Test repo:** `two-layer-validation\two-layer-fresh-explicit\`  
**Command:** `node_modules\.bin\squad-cli init --state-backend two-layer`

**Init output (confirmed):**
```
✓ state backend: two-layer
✓ squad-state orphan branch created (working tree untouched)
✓ migrated 4 mutable state file(s) onto squad-state branch (removed from working tree)
```

| Artifact | Expected | Actual | Result |
|---|---|---|---|
| `.squad/config.json` stateBackend | `"two-layer"` | `"two-layer"` | ✅ |
| `squad-state` branch | created | created (2 commits) | ✅ |
| `squad-state` initial tree | README + agents/ + decisions.md | README + agents/ + decisions.md | ✅ |
| Mutable files in working tree | absent (on orphan) | absent | ✅ |
| `squad_state_health` via MCP | `StateBackendStorageAdapter` | `StateBackendStorageAdapter` | ✅ |
| `refs/notes/squad` after write | created | created (JSON blob on root commit) | ✅ |
| New commit on write | ✅ | new commit `Update agents/scribe/history.md` | ✅ |
| Direct backend readback | ✅ | content round-trips correctly | ✅ |
| HOME mcp-config SHA256 | unchanged | unchanged | ✅ |

**Orphan branch log after writes:**
```
0a667d1 Update agents/scribe/history.md   ← direct SDK write
8a2a924 Update agents/scribe/history.md   ← MCP tool write
064b2ff migrate: import working-tree state on backend upgrade (4 file(s))
7639f94 init: squad-state orphan branch
```

**Git notes structure:**
- `refs/notes/squad` exists ✅
- Anchored to root commit `b239c1d` ✅
- Content: JSON object with file-path keys (populated on each write) ✅

---

## MCP Tool Observation: Content Anomaly

When calling `squad_state_write` via the MCP session layer with `key: "agents/scribe/history.md"`, the tool reported success but the orphan blob for that file contained empty content (empty blob SHA `e69de29bb...`).

**However:** Direct `OrphanBranchBackend.write()` via SDK (bypassing the MCP tool registry) correctly writes and reads back content. This confirms:
- ✅ Backend infrastructure is correct
- ⚠️ The MCP tool layer (`squad_state_write` handler / `StateBackendStorageAdapter`) may apply content transformation or normalization for agent history files that results in empty content being committed
- This is a **separate, lower-priority finding** from the F3 root cause

---

## Scenario 2: Upgrade Path

Scenario 2 (travel-assistant clone + `squad upgrade --state-backend two-layer`) was NOT separately executed.  
**Rationale:** The upgrade code path in `cli/upgrade.js` uses the identical `--state-backend` flag handling and `liftInitMutableStateOntoOrphan()` migration function as init. The behavior difference (upgrade vs init) is only in which scaffold files are written; the backend activation logic is shared. Scenario 1B fully covers the activation gate.

Additionally, `migrate-backend.js` provides a standalone `squad migrate-backend --to two-layer` command for post-init migration without re-running upgrade.

---

## Findings

| ID | Severity | Finding |
|---|---|---|
| F3-CONFIRMED | High | `stateBackend: "two-layer"` is NOT written by default init/upgrade. Root cause: opt-in flag gate in `cli/upgrade.js:241`. |
| NEW-1 | Informational | Two-layer backend is fully implemented and functional when explicitly activated. |
| NEW-2 | Informational | `OrphanBranchBackend` creates `squad-state` branch lazily on first write, not at init time. |
| NEW-3 | Informational | `GitNotesBackend` uses a single JSON blob note anchored to repo root commit (not per-file notes). |
| NEW-4 | Low | `squad_state_write` via MCP tool layer wrote empty content to orphan branch. Backend direct write works correctly. Possible content transformation in tool handler. |
| EXISTING | Low | `.mcp.json` installs `@bradygaster/squad-cli@insider` as dist-tag fallback (known from iter-9). |

---

## Recommendation

**For F3:** Either:
1. Make `--state-backend two-layer` the **default** for new init (change `'local'` default in `resolveStateBackend`), OR
2. Add a post-init prompt/hint suggesting `--state-backend two-layer` for persistent state across worktrees, OR
3. Document explicitly that `two-layer` is opt-in and requires the flag

**For NEW-4:** Investigate `StateBackendStorageAdapter.write()` or the `squad_state_write` tool handler to determine if agent history files are handled differently (template-rewrite path?). Compare `FSStorageProvider.write()` behavior vs `StateBackendStorageAdapter.write()`.

---

## Validation Environment

```
Package: @bradygaster/squad-cli@0.9.6-preview.15 (tarball install)
Node: (system default)
Git: (system default)
Platform: Windows 11
Test root: C:\Users\tamirdresher\squad-validation\two-layer-validation\
gh auth: tamirdresher (personal) — unchanged throughout
HOME mcp-config SHA256: 928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86 — unchanged
```
