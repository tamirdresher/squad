# Re-Val Iter-4 — multiplayer-sudoku — Mirror

Full report lives at `C:\Users\tamirdresher\squad-validation\multiplayer-sudoku-tarball-test-iter4-20260602T213310\validation\RE-VAL-iter4-multiplayer-sudoku.md`.

## One-screen summary

- **Tarball version on disk:** `0.9.6-preview.9` (manifest claimed preview.8 — auto-bump on pack).
- **Init path:** ❌ 0/3 sessions grew the orphan branch (`e5725a96` → `e5725a96` → `e5725a96` → `e5725a96`). MCP server fails to start because `npx -y @bradygaster/squad-cli@0.9.6-preview.9` E404s on the npm registry. The `REGISTRY-PIN-UNPUBLISHED` fallback was only wired into `upgrade.ts`, not `squad-sdk/init.ts:buildMcpServerSpecs`.
- **Upgrade path:** ✅ 8 state files migrated to orphan; mcp-config.json pinned to `@bradygaster/squad-cli@insider`; first follow-up session pushed `+1` commit to `origin/squad-state` (`0de57272` → `0f62575f`).
- **Bug matrix:** 8 ✅ · 3 ⚠ · 2 ❌ · 9 n/a (out of 14 prior + 1 iter4-new = 15 tracked).
- **New bug:** UPGRADE-TEMPLATE-DOC-FLATTEN — upgrade dumped ~20 template docs and per-agent charter scaffolds into `.squad/` root (should go to `.squad/templates/` and `.squad/agents/<name>/`).
- **End-to-end delivery:** 🟡 init path needs iter-5 (mirror `resolveSquadStateMcpSpec` into init); 🟢 upgrade path delivers.

## Dups (retained)
- https://github.com/tamirdresher_microsoft/multiplayer-sudoku-tarball-test-iter4-20260602T213310
- https://github.com/tamirdresher_microsoft/multiplayer-sudoku-upgrade-test-iter4-20260602T213310

## Auth
`gh auth switch --user tamirdresher_microsoft` confirmed at end of run; `gh api user` returned `tamirdresher_microsoft` (id 188938611).
