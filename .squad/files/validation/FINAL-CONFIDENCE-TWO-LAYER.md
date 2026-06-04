# Final Confidence Dogfood — Two-Layer State Backend

**PR:** bradygaster/squad-squad#1200  
**Head commit:** c9e5b755  
**Tarballs:** bradygaster-squad-cli@0.9.6-preview.18, bradygaster-squad-sdk@0.9.6-preview.18  
**Node:** v24.14.0  
**Date:** 2026-06-04  
**Author:** B'Elanna (Durable Systems Engineer)

---

## VERDICT: ✅ YES — merge with confidence

All 4 scenarios passed. No regressions. Two design-conformant behavioral notes documented below.

---

## Scenario A — New init with `--state-backend two-layer`

**Setup:** `mkdir new-init && git init -b main && git commit --allow-empty -m "init"` + `npm install` with preview.18 tarballs

**Command run:**
```
echo "" | npx @bradygaster/squad-cli init --state-backend two-layer
```

| Check | Result |
|---|---|
| `.squad/config.json` has `stateBackend:"two-layer"` | ✅ PASS |
| `squad-state` orphan branch exists | ✅ PASS |
| 2 commits on squad-state (init + migrate) | ✅ PASS |
| `.mcp.json` has `squad_state` MCP server entry | ✅ PASS |
| Mutable files removed from working tree | ✅ PASS |
| HOME mcp-config SHA256 unchanged | ✅ PASS |

---

## Scenario B — Upgrade from legacy local backend (preview.13 → preview.18)

**Setup:** `mkdir upgrade-target && git init` + install preview.13 tarballs + run `init` (wrote to HOME — expected old behavior) + add decisions.md + agents/scribe/history.md + commit to main

**Command run:**
```
npx @bradygaster/squad-cli upgrade --state-backend two-layer
```

**Upgrade output:**
```
✓ upgraded coordinator from 0.9.6-preview.13 to 0.9.6-preview.18
✓ squad-state branch ready
✓ migrated 4 state file(s) onto squad-state branch: .squad/decisions.md, .squad/agents/Rai/history.md, .squad/agents/ralph/history.md, .squad/agents/scribe/history.md
✓ config.json updated: stateBackend = two-layer
✓ installed squad_state MCP server to .mcp.json
(git hooks: pre-push, post-merge, post-rewrite, post-checkout, pre-commit, post-commit installed)
```

| Check | Result |
|---|---|
| `config.json` → `stateBackend:"two-layer"` | ✅ PASS |
| `squad-state` branch with 2 commits (init + migrate) | ✅ PASS |
| `decisions.md` content on squad-state branch | ✅ PASS |
| `agents/scribe/history.md` content on squad-state branch | ✅ PASS |
| `.mcp.json` has `squad_state` MCP server entry | ✅ PASS |

**Behavioral notes (not bugs):**

1. **Files remain in working tree after upgrade.** `upgrade` does NOT call `fs.unlinkSync` after migrating state files (source: `migrateStateBackend` in `migrate-backend.ts`). This is correct — files were committed to main and must stay there. Only `init` removes them (via `liftInitMutableStateOntoOrphan`).

2. **`upgrade` does not clean HOME mcp-config.** The old preview.13 CLI wrote `squad_state_1db4e17d` to `~/.copilot/mcp-config.json`. The new `upgrade` command correctly writes to project-local `.mcp.json` and does NOT touch HOME. Manual cleanup was required for the test environment. SHA256 restored to `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` after removing both `mcpServers` and `_squadProjects` entries.

---

## Scenario C — MCP write end-to-end

**Setup:** Used `new-init` dir from Scenario A. Started `npx @bradygaster/squad-cli state-mcp` via JSON-RPC stdio.

**JSON-RPC exchange:**
```json
→ {"method":"tools/call","params":{"name":"squad_state_write","arguments":{"key":"agents/scribe/history.md","content":"..."}}}
← {"result":{"content":[{"type":"text","text":"State written: agents/scribe/history.md"}],"isError":false}}

→ {"method":"tools/call","params":{"name":"squad_state_read","arguments":{"key":"agents/scribe/history.md"}}}
← {"result":{"content":[{"type":"text","text":"# Scribe History\n\n## Learnings\n\n### 2026-06-04\n- confidence-test-write via MCP\n"}],"isError":false}}

→ {"method":"tools/call","params":{"name":"squad_state_health","arguments":{}}}
← {"result":{"content":[{"type":"text","text":"State backend storage: StateBackendStorageAdapter"}]}}
```

**Git evidence:**
```
738a184 (squad-state) Update agents/scribe/history.md      ← written by MCP
14c4908 migrate: import working-tree state on backend upgrade (4 file(s))
069c034 init: squad-state orphan branch
```

| Check | Result |
|---|---|
| MCP write returns `isError: false` | ✅ PASS |
| Read round-trip confirms content | ✅ PASS |
| New commit on squad-state branch | ✅ PASS |
| Health reports `StateBackendStorageAdapter` | ✅ PASS |
| NEW-4 fix active (no empty blob) | ✅ PASS |

---

## Scenario D — Branch-switch persistence

**Setup:** Used `new-init` dir after Scenario C.

**Commands run:**
```bash
git checkout -b feature/test-branch-switch
git show refs/heads/squad-state:agents/scribe/history.md  # readable ✅
# → MCP write from feature branch → PASS ✅
git checkout main
git show refs/heads/squad-state:agents/scribe/history.md  # still current ✅
```

**Git evidence (squad-state log from feature branch):**
```
098a1bd (squad-state) Update agents/scribe/history.md    ← written from feature branch
738a184 Update agents/scribe/history.md                  ← written from main
14c4908 migrate: import working-tree state on backend upgrade (4 file(s))
069c034 init: squad-state orphan branch
```

| Check | Result |
|---|---|
| squad-state readable from feature branch | ✅ PASS |
| MCP write from feature branch creates commit on squad-state | ✅ PASS |
| squad-state readable from main after switch back | ✅ PASS |
| Latest write visible after branch return | ✅ PASS |

---

## Summary

| Scenario | Result | Notes |
|---|---|---|
| A — New init | ✅ PASS | All 6 checks green |
| B — Upgrade | ✅ PASS | 5 checks green; 2 by-design behaviors documented |
| C — MCP write e2e | ✅ PASS | JSON-RPC round-trip verified; git commit confirmed |
| D — Branch persistence | ✅ PASS | squad-state independent of working-tree branch |

**VERDICT: YES — merge PR #1200.**
