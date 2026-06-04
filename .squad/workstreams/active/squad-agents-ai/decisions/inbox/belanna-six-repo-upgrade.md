# Decision: Six-Repo Upgrade Validation — PR #1200

**From:** B'Elanna  
**Date:** 2026-06-04  
**Re:** `upgrade --state-backend two-layer` empirical validation across 6 production repos  
**Full report:** `.squad/files/validation/SIX-REPO-UPGRADE-TEST.md`

---

## Verdict: PARTIAL PASS — Merge with open issue

### What passed (3/6 full)
`travel-assistant`, `gh-ai-adoption2026`, `multiplayer-sudoku` — all 9 structural checks + MCP JSON-RPC round-trip. Proof blobs confirmed on `squad-state` branch. State migration, hooks, gitignore, config — all correct.

### What passed structurally but failed MCP (3/6)
`holocaust-research-wasserman`, `squad-ai-vulns`, `tamir-squad-hq` — C1–C9 all pass. MCP fails with `toRelative: path is outside squadDir` because stale `teamRoot` from original install location was preserved unchanged by upgrade.

---

## New Finding: stale-teamRoot MCP block bug

**Symptom:** After `upgrade --state-backend two-layer`, `squad_state_write` and `squad_state_read` both fail with `path is outside squadDir` when `teamRoot` in config.json points to a path different from the current clone location.

**Root cause:** `upgrade` preserves `teamRoot` as-is, no validation. `StateBackendStorageAdapter` derives `squadDir` from `teamRoot`, making all keys "outside" the expected directory.

**Affected scenarios:**
- Repo cloned to different path than initialized (common)
- Repo shared between machines (different usernames/paths)
- Repo cloned from another contributor's machine

**Recommended fix:**
```
// In upgrade.js, after reading config.json:
if (config.teamRoot && !isRelative(config.teamRoot)) {
  const resolved = path.resolve(config.teamRoot);
  if (resolved !== repoRoot) {
    console.warn('⚠ clearing stale teamRoot (was: ' + config.teamRoot + ')');
    delete config.teamRoot;  // or set to '.'
  }
}
```

**Urgency:** Medium. The structural upgrade (state migration, hooks, config, mcp.json) is fully correct. The MCP block only manifests for repos with stale absolute `teamRoot`. Users can self-heal by manually editing `config.json`. But this should not require manual intervention.

---

## Recommendation

**YES — merge PR #1200 as-is**, file a follow-up issue for the `teamRoot` validation fix.

Rationale: The core two-layer state backend migration is correct and validated across all 6 repos. The teamRoot bug is pre-existing behavior (it existed before this PR) and the fix belongs in a separate focused change. Blocking merge on this would hold back the correct migration logic.

**Action items:**
1. File GitHub issue: "upgrade: validate/clear stale absolute teamRoot during two-layer migration"
2. Link issue to PR #1200 as a follow-up
3. Update user docs: note that `teamRoot` should be relative or cleared when cloning to a new path
