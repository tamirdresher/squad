# Kovash — History

## Core Context

### Project & Stack
- **Project:** Squad — programmable multi-agent runtime for GitHub Copilot
- **Owner:** Brady
- **Stack:** TypeScript (strict mode, ESM-only), Node.js ≥20, @github/copilot-sdk, Vitest, esbuild
- **My focus:** REPL shell in `packages/squad-cli/src/shell/`

### REPL Shell Architecture
- **Shell modules:** index.ts (entry), coordinator.ts, router.ts, spawn.ts, sessions.ts, render.ts, stream-bridge.ts, lifecycle.ts, memory.ts, terminal.ts, autocomplete.ts, commands.ts, types.ts
- **Ink components:** App.tsx, AgentPanel.tsx, MessageStream.tsx, InputPrompt.tsx, ThinkingIndicator.tsx
- **SDK adapter:** `CopilotSessionAdapter` maps `sendMessage()` → `inner.send()`, event names via EVENT_MAP
- **SDK event mapping:** `message_delta` → `assistant.message_delta`, `turn_end` → `assistant.turn_end`, `idle` → `session.idle`
- **Message deltas:** `message_delta` events carry content in `deltaContent` key (priority: `deltaContent` > `delta` > `content`)

### Key Patterns
- **Async command signals:** When slash commands need async work, return signal object in `CommandResult`. Caller (App.tsx) handles async dispatch. Keeps command handler synchronous while enabling async workflows.
- **Processing state management:** Any code path that bypasses `handleSubmit` must manage processing state itself via `ShellApi.setProcessing(true/false)`. All exit paths must be covered: success → finally clears, error → finally clears, early return → manual clear.
- **Terminal adaptivity:** Use `useLayoutTier()` hook for width-aware rendering. Three tiers: Narrow (<80 cols) = cards, Normal (80-119) = compact, Wide (120+) = full chrome.
- **Static key scoping:** Ink's `<Static>` tracks items by key. Use session-scoped keys (`${sessionId}-${i}`) to prevent collisions across session restores.
- **Viewport height management:** Live region must fit within `process.stdout.rows`. Bound content areas with `overflow="hidden"`, keep anchored elements (InputPrompt) outside bounded box.

### Known Anti-Patterns
- **Fire-and-forget dispatch:** `dispatchToCoordinator` originally didn't await response. Use `sendAndWait()` with timeout instead.
- **Duplicate guidance across UI layers:** Banner and prompt placeholder should not repeat same info. Single source of truth per concept.
- **Key collisions in Static:** Bare index keys (`sm-${i}`) cause frame corruption across session boundaries.
- **Input buffering race:** Fast typing during disabled→enabled transition can lose characters. Use `pendingInputRef` queue to catch transition-window input.

### Configuration & Tooling
- **SQUAD_DEBUG:** Logging infrastructure via .env file parser (no dotenv dep)
- **SQUAD_REPL_TIMEOUT:** Configurable timeout in seconds (env var or `--timeout` CLI flag)
- **Dev workflow:** `dev:link` / `dev:unlink` scripts for local npm link
- **VS Code:** launch.json has OTEL_EXPORTER_OTLP_ENDPOINT config

## Learnings

### 2026-03-01: P0 Screen Corruption Fix — Static Key Collisions & Terminal Clear

**Root cause:** Three factors — (1) `<Static>` keys used bare index (`sm-${i}`) so Ink couldn't distinguish items across session boundaries, (2) no terminal clear on shell start left old scrollback visible, (3) session restore via `/resume` added messages on top without clearing first.

**Fix:** Added `process.stdout.write('\x1b[2J\x1b[H')` before `render()` in index.ts. Changed Static keys to session-scoped (`${sessionId}-${i}`) using `useMemo(() => Date.now().toString(36), [])`. Added `clearMessages()` to ShellApi that resets both `messages` and `archivedMessages`. Called `clearMessages()` + terminal clear in `onRestoreSession()` before restoring messages. Fixed `/clear` command to clear `archivedMessages` too.

**Key insight:** Ink's `<Static>` component tracks items by key. If keys collide across sessions (e.g., restored session reuses `sm-0`, `sm-1`...), Ink silently drops or overlaps items. Session-scoped keys make each render pass unique. Brady's directive respected: Full scrollback preserved—content flows naturally into terminal scroll buffer.

### 2026-03-01: Issue #674/#675 — Viewport-Aware Layout with Input Anchoring

**Root cause:** App.tsx live region (AgentPanel + MessageStream + InputPrompt) had no height constraint. When AgentPanel or streaming content grew large, InputPrompt could be pushed below visible terminal viewport.

**Fix:** Added `useTerminalHeight()` hook in `terminal.ts` (mirrors existing `useTerminalWidth()`). In App.tsx, wrapped AgentPanel + MessageStream in height-bounded `<Box>` with `overflow="hidden"`. Height budget: `terminalHeight - 3` (3 rows reserved for InputPrompt). InputPrompt sits outside bounded box so it always renders at bottom.

**Key insight:** Ink's `<Static>` renders into terminal scroll buffer and doesn't occupy live region space. Live region (everything after Static) must fit within `process.stdout.rows`. Without explicit height budgeting, Ink has no way to know live region is too tall—it just overflows.

**Pattern:** Always bound live region height to terminal rows. Use `overflow="hidden"` on content areas that can grow unboundedly. Keep anchored elements (InputPrompt) outside bounded box.

### 2026-03-01: Multi-line Paste Fix in InputPrompt

**Root cause:** `useInput` fires per-character. On first `\n` in a paste, `key.return` triggered immediate `onSubmit` + `setValue('')`, then `setProcessing(true)` disabled input. Remaining paste characters hit disabled branch where `key.return` was ignored, stripping newlines and garbling lines.

**Fix (two parts):**
1. **Enabled state — paste detection via debounce:** 10ms debounce timer on `key.return`. If more input arrives before timer fires, it's a paste—newline preserved in `valueRef` and accumulation continues. If timer fires without more input, it's real Enter—submit. Added `valueRef` to track real-time value synchronously (React state `value` is stale in closures).
2. **Disabled state — newline preservation:** Changed `key.return` from being ignored to appending `\n` to `bufferRef`, so pasted text arriving during processing retains line structure.

**Key insight:** Ink's `useInput` delivers paste characters synchronously within single event loop tick, so 10ms debounce cleanly separates paste (characters arrive in <1ms) from real Enter (next input after human reaction time). All value mutation paths now sync `valueRef` alongside React state.
