# Decision: iter-9 non-interactive MCP trust gate fix

**Date:** 2026-06-03
**Author:** Data
**Workstream:** squad-agents-ai / combined-fixes branch (PR #1200)
**Status:** SHIPPED (`f8347d84`, preview.15)

---

## Context

Iter-8 (preview.14) wrote `.mcp.json` at repo root but smoked ❌ in all three sessions: `squad_state_*` tools were unavailable and `origin/squad-state` never grew. Root cause traced to two bugs in `packages/squad-cli/src/cli/core/copilot-invocation.ts`:

1. **Path regression:** helper checked for `.copilot/mcp-config.json` (iter-7 path); iter-8 pivoted to repo-root `.mcp.json` but the helper was never updated.
2. **Missing `--yolo`:** non-interactive `copilot -p` hangs waiting for per-tool consent prompts without `--yolo`; the helper never injected it.

Empirical test matrix confirmed (Copilot CLI 1.0.59):
- `copilot -p "..."` → ❌ workspace MCP NOT loaded
- `copilot --yolo -p "..."` → ❌ workspace MCP NOT loaded
- `copilot --additional-mcp-config @.mcp.json --yolo -p "..."` → ✅ LOADED

## Decision

Inject `--yolo --additional-mcp-config @<abs-path>/.mcp.json` in `copilot-invocation.ts` — the single choke-point through which all squad-internal `copilot` spawns flow (`watch/index.ts:620`, `copilot.ts:146`, `loop.ts:146`). Fixing one helper fixes all three.

## Rationale

- The `--additional-mcp-config @<file>` flag bypasses Copilot CLI's folder-trust security gate for the explicitly named file. This is the only non-interactive workaround verified against 1.0.59.
- `--yolo` is required for automation: it suppresses the per-tool consent prompt that would block `copilot -p` indefinitely.
- The `@` prefix in `--additional-mcp-config @<path>` means "read from file". Must use absolute path; `path.join(teamRoot, '.mcp.json')` provides it.
- Dedup guard (`args.filter(a => a !== '--yolo')`) prevents `--yolo --yolo` if caller already supplies it.
- No HOME writes; no new wrapper subcommand (both explicitly prohibited by prior decisions).

## What NOT to do

- ❌ Do NOT restore `squad run-copilot` wrapper (deleted in iter-6, must stay deleted).
- ❌ Do NOT write to `~/.copilot/mcp-config.json` (reverted in iter-8, Tamir's explicit directive).
- ❌ Do NOT add `--yolo` to user-facing docs as a routine flag (it skips safety prompts; docs should mention `--additional-mcp-config` only).

## Files changed

- `packages/squad-cli/src/cli/core/copilot-invocation.ts` — core fix
- `packages/squad-cli/src/cli/core/init.ts` — `squad:copilot` tip
- `packages/squad-cli/templates/ralph-reference.md` — trust gate note
- `packages/squad-cli/templates/squad.agent.md.template` — twin of agent.md
- `.github/agents/squad.agent.md` — watch mode MCP note
- `docs/src/content/docs/features/copilot-mcp-trust.md` — user-facing doc
- `.changeset/iter9-non-interactive-mcp-load.md` — changeset
- `packages/squad-cli/package.json` — `0.9.6-preview.15`
