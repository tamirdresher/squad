# Decision: Approve PR #1200 — Squad CLI v0.9.6-preview.15

**Author:** B'Elanna  
**Date:** 2025-07-09  
**References:** PR #1200, iter-9 dogfood smoke test, `SMOKE-ITER9-6REPO-DOGFOOD.md`

## Recommendation

**APPROVE and MERGE PR #1200.**

## Evidence

6-repo dogfood smoke test completed. All upgrade/init commands exited 0. The `squad_state` MCP server:
- Installs correctly to `.mcp.json` in all repos ✅
- Tombstone-cleans `squad_state` from `.copilot/mcp-config.json` ✅
- Responds to MCP protocol initialize, tools/list, tools/call ✅
- Exposes 7 tools (read/write/append/delete/list/health + decide) ✅
- Reports `FSStorageProvider` backend operational ✅
- HOME mcp-config.json byte-identical pre/post test ✅

## Caveats (non-blocking)

1. **`@insider` dist-tag fallback** — Tarball installs write `@bradygaster/squad-cli@insider` to `.mcp.json` (currently resolves to `0.9.6-insider.3`). Registry installs not affected. Track as follow-up.
2. **NTFS colon-in-filename** — `squad-ai-vulns` repo has ISO 8601 colon timestamps in decision filenames; uncloneable on Windows. Pre-existing issue, not a CLI regression. Recommend standardizing decision filenames to use hyphens.

## Full Report

`.squad/files/validation/SMOKE-ITER9-6REPO-DOGFOOD.md`
