# Decision: iter-9 docs audit — MCP trust gate cross-links

**Date:** 2026-06-03
**Author:** Data
**Workstream:** squad-agents-ai / combined-fixes docs pass
**Branch:** `squad/state-backend-upgrade-fixes` (tamirdresher/squad)
**Commit:** `1c628000`
**Status:** SHIPPED

---

## Context

Iter-9 (v0.9.6-preview.15) shipped the auto-injection fix in `copilot-invocation.ts` and a new user-facing doc `features/copilot-mcp-trust.md`. The three docs that describe `squad watch`, `squad loop`, and the CLI reference for `squad loop` each contained no mention of the new auto-injection behavior, leaving users unable to understand why `--yolo --additional-mcp-config` flags appear in their Copilot process list.

## Scope

**In-scope:** Documentation accuracy only — add cross-links from the three affected docs to the existing `copilot-mcp-trust.md` page, describing observed behavior.

**Explicitly out-of-scope (per directive `copilot-directive-2026-06-03T205959-skip-c2-c3.md`):**
- C-2: selective squad_state-only inline JSON blocks
- C-3: extra security callouts / `--yolo` risk warnings

## Verified Behavior (source: `copilot-invocation.ts`)

`buildAdditionalMcpConfigArgs()` injects `['--yolo', '--additional-mcp-config', '@<abs-path>/.mcp.json']` into every `copilot` spawn, subject to three guards:
1. `cmd === 'copilot'` — custom `--agent-cmd` is unaffected
2. `teamRoot` is set
3. `.mcp.json` actually exists at `teamRoot` — missing file logs a warning and returns `[]`

`withAdditionalMcpConfig()` deduplicates `--yolo` if the caller already supplied it.

## Decision

Add a single-sentence or short-paragraph cross-link note in each of the three affected docs. Keep it factual: state what is injected and under what conditions, then link to `copilot-mcp-trust.md` for the full explanation. Do not add security warnings or conditional JSON examples.

## Files Changed

| File | Change |
|------|--------|
| `docs/src/content/docs/features/ralph.md` | Watch Mode `--execute` paragraph: added injection note + link |
| `docs/src/content/docs/features/loop.md` | Prerequisites section: added blockquote injection note + link |
| `docs/src/content/docs/reference/cli.md` | `squad loop` section: added `**MCP auto-injection:**` paragraph + link |

## Files Audited and Left Unchanged

| File | Reason |
|------|--------|
| `docs/src/content/docs/features/copilot-mcp-trust.md` | Accurate; the link target for all three edits |
| `docs/src/content/docs/features/state-backends.md` | No iter-9 issues; all backend types and deprecations documented correctly |
| `docs/src/content/docs/features/worktrees.md` | Clean; no iter-9 impact |

## State Backend Verification (informational)

`StateBackendType = 'local' | 'external' | 'orphan' | 'two-layer'`. `'worktree'` silently normalizes to `'local'` (no warning, not user-visible in docs). `'git-notes'` normalizes to `'two-layer'` with deprecation warning. These are correctly reflected in `state-backends.md` — no changes needed.
