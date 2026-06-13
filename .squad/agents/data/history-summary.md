# Data Agent — History Summary (Round 5)

**Date:** 2026-06-04T21:35:00Z  
**Original Size:** 15,847 bytes  
**Summarized From:** `.squad/agents/data/history.md`

## Core Mission

Data drives Squad Framework expertise, SDK/CLI research, auth-mode inventory, and proposal-first research. Lead researcher for Squad.Agents.AI auth expansion.

## Key Rounds

### Round 3–4: Policy Gate + Iter-9 Fixes
- Policy Gate regex expanded: `-preview.N` and `-insider.N` patterns now bypass strict version locking
- Iter-9 root cause: MCP config path check was stale (`.copilot/` → `.mcp.json`), `--yolo` flag missing
- Injected via `copilot-invocation.ts`: `['--yolo', '--additional-mcp-config', '@<abs-path>/.mcp.json']`
- NEW-4 bug: `squad_state_write` wrote empty blobs due to unvalidated MCP params; fixed with content guards
- Docs audit: 3 cross-link additions in `ralph.md`, `loop.md`, `reference/cli.md`

### Round 4 Phase B: ENOBUFS Root Cause
- **B1/B2 same bug:** Node.js `execFileSync` default `maxBuffer` = 1 MB; git stdout for `rev-list HEAD` (30k commits) + orphan reads (2.33 MB) exceed it
- **Fix location:** `state-backend.ts` lines 37 and 61 (both wrappers)
- **Solution:** `maxBuffer: 256 * 1024 * 1024` covers all current and future git invocations

### Round 5: P0 SDK Fixes (COMPLETED)
- 3 commits landed in PR #1200: maxBuffer fix, CAS implementation, args tokenization
- 142/142 tests pass
- CAS pattern: `git update-ref <ref> <new-sha> <expected-old-sha>` with 5-retry jittered backoff
- All fixes upstreamed and validated

## Key Learnings

1. **Single choke point principle:** All git invocations route through 2 wrappers; patch at layer not callsite
2. **maxBuffer is the silent killer:** First review question on any `execFileSync` wrapper
3. **CAS via update-ref:** Git's native compare-and-swap; prevents silent data loss under contention
4. **ESM gotchas:** Both SDK and CLI are `type: module`; CLI bin = `dist/cli-entry.js`; resolveStateBackend exported from `dist/index.js`
5. **Windows PowerShell trap:** `^` is cmd.exe escape char; use `execFileSync` array form to bypass shell

## Status

**Round 5 P0 fixes shipped and revalidated. Ship ready.**
