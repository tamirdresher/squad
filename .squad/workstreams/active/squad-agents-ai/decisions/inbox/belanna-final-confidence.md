# B'Elanna Final Confidence Decision Drop

**Author:** B'Elanna  
**Date:** 2026-06-04  
**Subject:** PR #1200 two-layer state backend — final confidence verdict  
**Evidence file:** `.squad/files/validation/FINAL-CONFIDENCE-TWO-LAYER.md`

---

## Decision

**VERDICT: YES — merge PR #1200 with confidence.**

Four dogfood scenarios ran against fresh preview.18 tarballs built from c9e5b755:

- **Scenario A (new init):** All 6 checks pass. `--state-backend two-layer` flag wires config, creates squad-state orphan branch, installs MCP server to `.mcp.json`, removes mutable files from working tree. HOME mcp-config unchanged. ✅
- **Scenario B (upgrade from legacy):** All 5 checks pass. `upgrade --state-backend two-layer` migrates 4 files, updates config, installs MCP entry. Files intentionally stay in working tree (committed to main — by design). Old CLI HOME pollution is not cleaned by `upgrade` — documented as expected behavior, not a regression. ✅
- **Scenario C (MCP write e2e):** `squad_state_write` via JSON-RPC stdio delivers a commit to squad-state branch. Round-trip read confirmed. `squad_state_health` reports `StateBackendStorageAdapter`. NEW-4 fix active. ✅
- **Scenario D (branch persistence):** squad-state branch is independent of the working-tree branch. Writes from feature branches land on squad-state. Content visible from all branches. ✅

## Known behavioral differences (not bugs)

1. **init vs upgrade file removal:** `init` removes mutable state files from working tree after migration. `upgrade` does not. This is correct — files committed to main must not be deleted by an upgrade operation.
2. **HOME mcp-config cleanup:** `upgrade` command does not clean HOME mcp-config entries left by older CLI versions. Users migrating from preview.13 or earlier may need to manually remove stale `squad_state_*` entries from `~/.copilot/mcp-config.json` mcpServers section.

## Recommendation

Merge PR #1200. No blockers. The two behavioral notes above are worth mentioning in the PR description or CHANGELOG for transparency.
