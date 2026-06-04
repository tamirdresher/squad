# Decision Drop: Real Old Repo Upgrade Validation — PR #1200

**From:** B'Elanna  
**Date:** 2026-06-04T09:20:00+03:00  
**Re:** PR #1200 — upgrade command two-layer state backend fix  
**Full report:** `.squad/files/validation/REAL-OLD-REPO-UPGRADE-TEST.md`

---

## Summary

Ran empirical upgrade validation against 3 real production squad repos (sandbox copies, originals never touched). PR #1200 (v0.9.6-preview.18) upgrade command:

- **Sets `stateBackend: two-layer`** on repos that don't have it ✅
- **Preserves existing `stateBackend: two-layer`** without re-migrating ✅
- **Creates `.mcp.json`** with `squad_state` server entry ✅
- **Migrates state files** to `squad-state` orphan branch ✅ (18 files, 2 workspace monorepos)
- **MCP read/write round-trip works** on standard local-mode repos ✅ (2/2 applicable repos)

---

## Findings Requiring Decisions

### Finding 1: Workspace Monorepo CLI Invocation (Operator Guidance Needed)

`npm install --save-dev <squad-cli-tarball>` in a workspace monorepo is shadowed by the workspace package. Operators must invoke `node <cli-entry.js>` directly.

**Decision needed:** Should upgrade instructions/README explicitly call out this workspace monorepo case? Or add a workspace-detection guard in the CLI wrapper?

### Finding 2: `teamRoot:"."` Config — MCP Round-Trip Fails

Repos with `teamRoot: "."` in config.json fail MCP read/write because `ToolRegistry.squadRoot` (set to `teamDir = repoRoot`) diverges from `StateBackendStorageAdapter.squadDir` (set to `projectDir = .squad/`). Path constructed for write/read falls outside `.squad/` → `toRelative()` throws.

**Decision needed:** Is `teamRoot:"."` a supported production config? If yes, this is a bug in `StateBackendStorageAdapter` construction in `resolveSquadState()` — should use `teamDir`, not `projectDir`, as the `squadDir` parameter. File a separate issue? If `teamRoot:"."` is legacy/unsupported, document that `upgrade` cannot serve this config.

### Finding 3: squad-state Remote-Only Branch (Informational)

Repos where `squad-state` exists only as `refs/remotes/origin/squad-state` (not a local branch) will not get the branch re-created by upgrade. The upgrade skips migration when `stateBackend: two-layer` is already set. The remote state is preserved; the local branch simply doesn't exist until a `git fetch && git checkout squad-state` or similar.

**Decision needed:** Should upgrade create a local `squad-state` tracking branch if one doesn't exist? Or document that users need to `git fetch origin squad-state:squad-state` manually if they want a local ref?

---

## Recommendation

**Merge PR #1200.** Core upgrade mechanics are confirmed working. Findings 1 and 3 are operator guidance issues, not code bugs. Finding 2 requires a follow-up issue if `teamRoot:"."` configs are still in production use.
