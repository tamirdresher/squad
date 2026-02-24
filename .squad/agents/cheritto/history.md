# Cheritto — History

## Project Context
- **Project:** Squad — programmable multi-agent runtime for GitHub Copilot
- **Owner:** Brady
- **Stack:** TypeScript (strict, ESM), Node.js ≥20, Ink 6 (React for CLI), Vitest
- **CLI:** Ink-based interactive shell with AgentPanel, MessageStream, InputPrompt components
- **Key files:** packages/squad-cli/src/cli/shell/components/*.tsx, packages/squad-cli/src/cli/shell/terminal.ts

## Learnings

### 2026-02-23: Fix 2-minute timeout (#325)
- Replaced hard-coded `120_000ms` in `sendAndWait()` with `TIMEOUTS.SESSION_RESPONSE_MS` (default 600_000ms / 10 min)
- New constant added to `packages/squad-sdk/src/runtime/constants.ts` under `TIMEOUTS`
- Configurable via `SQUAD_SESSION_TIMEOUT_MS` env var
- Shell entry: `packages/squad-cli/src/cli/shell/index.ts` line 123 (`awaitStreamedResponse`)
- Test file: `test/repl-streaming.test.ts` — 6 assertions updated to use constant
- Pattern: all timeouts in this project live in `TIMEOUTS` object in constants.ts, env-overridable via `parseInt(process.env[...] ?? 'default', 10)`
- PR #347 on branch `squad/325-fix-timeout`

### 2026-02-24: Engaging thinking feedback (#331)
- Created standalone `ThinkingIndicator.tsx` component in `packages/squad-cli/src/cli/shell/components/`
- Two-layer design: Layer 1 rotates 10 thinking phrases every 2.5s (Claude-style), Layer 2 shows SDK activity hints (Copilot-style, takes priority)
- Props: `isThinking`, `elapsedMs`, `activityHint` — elapsed tracked in MessageStream via `useEffect` + `setInterval`
- Added `setActivityHint` to `ShellApi` interface in App.tsx for pipeline integration
- Shell `index.ts` listens for `tool_call` SDK events and pushes activity hints (e.g., "Reading file...", "Spawning specialist...")
- Hints clear automatically when content starts streaming (in `onDelta`)
- Color shifts over time: cyan (<5s) → yellow (<15s) → magenta (15s+) — borrowed from original spinner
- 16 new tests in `test/repl-ux.test.ts` sections 7 + 8
- PR #351 on branch `squad/331-thinking-feedback`

### 2026-02-25: Ghost response detection and retry logic (#332)
- Created `withGhostRetry()` — exported, testable function with callback-based UI integration
- Detects empty responses (both accumulated deltas and fallback content empty) from `awaitStreamedResponse()`
- Retries up to 3 times with exponential backoff: 1s, 2s, 4s (configurable via `GhostRetryOptions`)
- Shows user-facing retry status: "⚠ No response received. Retrying (attempt N/3)..."
- Shows exhaustion message: "❌ Agent did not respond after 3 attempts. Try again or run `squad doctor`."
- Logs ghost metadata via `debugLog`: timestamp, attempt number, prompt preview (truncated to 80 chars)
- Wired into both `dispatchToAgent()` and `dispatchToCoordinator()` via `ghostRetry()` convenience wrapper
- 14 new tests in `test/ghost-response.test.ts` covering unit + integration + backoff timing
- Pattern: `withGhostRetry` is pure (no closure deps); `ghostRetry` is the shell-bound wrapper inside `runShell()`
- PR on branch `squad/332-ghost-response`

### 2026-02-25: P1 UX polish from Marquez audit (#330)
- Fixed all 8 P1 items identified in Marquez's comprehensive UX audit
- Files changed: `commands.ts`, `AgentPanel.tsx`, `InputPrompt.tsx`, `MessageStream.tsx`, `App.tsx`
- Key changes:
  - Help descriptions now use consistent imperative verbs (Check, Review, List, Clear, Show, Exit)
  - Added `▶ Active` text label alongside pulsing dot for focus indicator clarity
  - Keyboard hints split into two lines to avoid wrapping in narrow terminals
  - System message prefix changed from `◇` to `▸` (small right triangle)
  - Separators use `process.stdout.columns` (capped at 120) instead of hardcoded 50
  - Input placeholder now reads "Type a message or @agent-name..." to reinforce @-addressing
  - Disabled prompt stays cyan (was incorrectly turning yellow, breaking visual consistency)
  - Every slash command in /help now includes an example usage line
- 2 pre-existing test failures in `repl-ux.test.ts` (empty AgentPanel expects `''` but gets empty-state message) — not related to this PR
- PR #356 on branch `squad/330-p1-ux-polish`

### 2026-02-23: Rich progress indicators (#335)
- Added `activityHint?: string` to `AgentSession` type in `types.ts`
- Added `updateActivityHint()` to `SessionRegistry` in `sessions.ts` — clears on idle/error
- AgentPanel status line now shows: `Name (working, 12s) — Reviewing architecture`
  - Format: `(statusLabel, elapsed) — activityHint` — only for active agents
- MessageStream: new `agentActivities` prop (Map<string, string>) renders `📋 Name is activity` lines
  - Activity feed sits between messages and ThinkingIndicator
  - Empty map or missing prop = no feed (backward compatible)
- App.tsx: new `agentActivities` state + `setAgentActivity()` in ShellApi interface
- shell/index.ts: tool_call events now push per-agent activities via `setAgentActivity` + `updateActivityHint`
  - Activity hints stripped of trailing `...` for clean display
  - Cleared on agent finish via `setAgentActivity(name, undefined)`
- 11 new tests in `test/repl-ux.test.ts` section 9 covering AgentPanel progress + MessageStream activity feed
- 4 pre-existing test failures (2 empty panel, 2 idle→ready text mismatch from #338 copy polish)
- PR #357 on branch `squad/335-progress-indicators`

### 2026-02-26: Tasteful animations and transitions (#337)
- Created `useAnimation.ts` with four reusable hooks: `useTypewriter`, `useFadeIn`, `useCompletionFlash`, `useMessageFade`
- All hooks respect NO_COLOR via `isNoColor()` — animations disabled, static content returned immediately
- Frame rate capped at ~15fps (67ms intervals) for GPU-friendly Ink rendering
- Welcome animation (App.tsx): typewriter reveals "◆ SQUAD" title over 500ms, banner body fades in via `useFadeIn(300ms)`
  - `bannerReady` gates all banner elements — nothing renders until title finishes typing
  - When `welcome` is null (no `.squad/` dir), title renders statically
- Message appearance (MessageStream.tsx): new messages start with `dimColor` for 200ms fade-in
  - `useMessageFade` tracks total message count via ref, returns number of "fading" messages from end of visible list
  - System messages always dimColor, so fade only applies to user and agent messages
- Agent completion flash (AgentPanel.tsx): "✓ Done" badge appears for 1.5s when agent transitions working/streaming → idle
  - `useCompletionFlash` uses React's setState-during-render pattern for synchronous detection
  - Flash badge renders in both compact and full-width layouts
  - Timer cleanup via `useEffect` watching `flashing` state + unmount cleanup
- Hooks moved before early returns in AgentPanel to comply with Rules of Hooks
- 9 new tests in `test/repl-ux.test.ts` section 10 covering message fade, completion flash, NO_COLOR suppression, hook exports
- 4 pre-existing test failures (2 empty panel, 2 idle→ready text mismatch) — not related
- PR on branch `squad/337-animations`

### 2026-02-23: Terminal adaptivity 40→120 col range (#336)
- Added `getTerminalWidth()` (pure, clamped ≥40) and `useTerminalWidth()` (React hook, resize-aware) to `terminal.ts`
- Hook listens for `process.stdout` `resize` event, dynamically bumps `maxListeners` to avoid warnings in test
- AgentPanel: 3 width tiers — compact (≤60 cols): single-line per agent, no hints/elapsed; standard (61–99): current layout with truncated hints; wide (≥100): full detail
- App.tsx welcome banner: compact (≤60): header + agent count + "/help · Ctrl+C exit"; standard (60–99): adds roster + description; wide (≥100): adds focus line
- InputPrompt: prompt shrinks from "◆ squad> " to "sq> " at <60; placeholder from "Type a message or @agent..." to "@agent..."
- commands.ts `/help`: <80 cols → single-column compact list; ≥80 cols → padded 2-column table (existing)
- MessageStream: separator uses `useTerminalWidth()` hook instead of raw `process.stdout.columns`
- 66/70 tests pass (same 4 pre-existing failures: 2 empty-panel, 2 idle→ready text mismatch)
- Pattern: `useTerminalWidth()` is the canonical hook for width-responsive Ink components; `getTerminalWidth()` for non-React code
- PR #360 on branch `squad/336-terminal-adaptivity`

### 2026-02-26: P2 nice-to-haves from Marquez audit (#340)
- Fixed all 6 P2 items identified in Marquez's UX audit
- Files changed: `commands.ts`, `AgentPanel.tsx`, `App.tsx`, `MessageStream.tsx`, `ThinkingIndicator.tsx`
- Key changes:
  - Removed "you:" prefix from user messages — now shows just `❯` chevron (cleaner, less redundant)
  - Consistent separator characters: all separators use `-` (was mixed `─` in MessageStream and `┄` in AgentPanel)
  - Simplified ThinkingIndicator: removed 10-phrase rotation carousel, replaced with static "Thinking..." label (1 timer instead of 3)
  - `/agents` command uses text status labels `[WORK]` `[STREAM]` `[ERR]` `[IDLE]` instead of emoji circles `🔵🟢🔴⚪`
  - Status line indentation normalized from 2-space to 1-space indent in AgentPanel
  - Replaced emoji indicators: `📋` → `▸` (activity feed), `📍` → `Focus:` (banner), `🔌` → removed (SDK message)
  - `THINKING_PHRASES` export kept as single-element array `['Thinking']` for backward compat
- 4 pre-existing test failures (2 empty panel, 2 idle→ready text mismatch) — not related
- PR #364 on branch `squad/340-p2-nice-to-haves`

### 2026-02-23: Product love — first-time user experience polish
- Walked through complete first-time user journey: `squad init` → REPL launch → welcome → first command
- Filed 6 issues (#400, #402, #404, #405, #406, #407), closed #406 (ErrorBoundary doesn't exist on disk)
- Fixed 5 issues in one PR:
  - **`/clear` was broken** (#400): ANSI escape code was added as message content (no-op in Ink). Added `clear?: boolean` to `CommandResult`, `handleClear()` returns `{ clear: true }`, App.tsx resets `messages` state to `[]`.
  - **Natural language routing hidden** (#402): Coordinator auto-routing is the killer feature but was invisible. Updated welcome hints to "Just type · @Agent to direct", `/help` explains routing, first-run shows "Or just type naturally", input placeholder changed to "Type anything or @agent..."
  - **First-run hint breaks on narrow terminals** (#404): Changed from horizontal Box to `flexDirection="column"` with breathing room
  - **Exit emoji inconsistency** (#405): `👋 Squad out.` → `◆ Squad out.` (matches P2 emoji removal)
  - **Roster wraps mid-name** (#407): Replaced single dense string with per-agent `<Text>` elements in `<Box flexWrap="wrap">` for clean word-boundary wrapping
- Files changed: `commands.ts`, `App.tsx`, `InputPrompt.tsx`, `index.ts`, `cli-shell-comprehensive.test.ts`
- Pattern: `CommandResult.clear` flag for shell-level state resets (vs output strings)
- 125/125 tests pass, build clean
- PR #414 on branch `squad/cheritto-product-love`
