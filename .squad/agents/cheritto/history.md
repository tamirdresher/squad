# Cheritto — History

## Project Context
- **Project:** Squad — programmable multi-agent runtime for GitHub Copilot
- **Owner:** Brady
- **Stack:** TypeScript (strict, ESM), Node.js ≥20, Ink 6 (React for CLI), Vitest
- **CLI:** Ink-based interactive shell with AgentPanel, MessageStream, InputPrompt components
- **Key files:** packages/squad-cli/src/cli/shell/components/*.tsx, packages/squad-cli/src/cli/shell/terminal.ts

## Core Context

**Wave A–C Archive (Feb 23–26):** Completed timeout hardening (#325), thinking feedback UI (#331), ghost response retry logic (#332), P1 UX polish (#330 — help verbs, focus labels, keyboard hints, system prefix, separators, input placeholder, prompt colors, command examples), progress indicators (#335 — activity hints in panel + stream), animations (#337 — typewriter/fade/flash/message-fade hooks with NO_COLOR support), terminal adaptivity (#336 — 40–120 col responsive layouts), P2 nice-to-haves (#340 — user message chevron cleanup, ASCII-only separators, thinking label simplification, /agents text status labels, activity feed indicator change), product love first-run UX (#414 — /clear fix, natural language routing hints, narrow terminal hint handling, exit emoji, roster wrapping), shell loading indicator (#427 — instant stderr feedback), welcome animation removal (#423), TUI final fixes (#405/#404/#407 — exit ASCII, compact-mode first-run, emoji-free roster, separator normalization). All components (App.tsx, AgentPanel, MessageStream, InputPrompt, ThinkingIndicator) updated. Shell responsive and fully tested (151–2744 tests passing).

### 📌 Team update (2026-03-01T02:04:00Z): Screenshot review session 2 — Frame corruption and terminal lifecycle P0
- **Status:** Completed — Joined Keaton, Kovash, Marquez, Waingro in parallel review of 15 REPL screenshots from human testing.
- **Finding:** P0 blocker in screenshot 015 — overlapping UI frames
  - Confirmed TUI rendering issue (not terminal transparency like 008-010)
  - Requires TUI frame layout refactor
- **Cross-team diagnosis:**
  - Kovash independently identified static key collisions + missing terminal clear + no alt screen buffer (008-010/015)
  - Both findings point to same root cause: terminal state lifecycle mismanagement
  - Likely affects frame ordering, buffer management, and state coherence
- **Next:** High-priority collaboration with Kovash (REPL Expert) on terminal lifecycle redesign. P0 blocker.
- **Session log:** `.squad/log/2026-03-01T02-04-00Z-screenshot-review-2.md`

## Learnings


### 2026-02-26: Recent PR work — progress, animations, terminal, P2 polish, first-run UX, loading, animations, TUI fixes (#335–#446)
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

### 2026-02-26: Shell launch loading indicator (#427)
- Fixed 2-4 second "dead air" when launching shell with `squad` (no args)
- Added immediate `console.error('◆ Loading Squad shell...')` at start of `runShell()` — appears <100ms
- Message clears via `process.stderr.write('\r\x1b[K')` after Ink `render()` call
- Pattern: synchronous stderr logging before any async operations = instant user feedback
- ANSI clear sequence: `\r` (carriage return) + `\x1b[K` (clear line from cursor to end)
- File: `packages/squad-cli/src/cli/shell/index.ts` lines 108, 436
- PR #435 on branch `fix/issue-427`
### 2026-02-23: Welcome typewriter blocking input (#423, #399)
- Fixed 500-800ms input blocking during shell launch caused by typewriter animation
- Removed `useTypewriter()` and `useFadeIn()` calls from `App.tsx` welcome banner rendering (lines 165-167)
- Welcome banner now displays instantly: `bannerReady = true`, `bannerDim = false`, `titleRevealed = '◆ SQUAD'`
- Removed unused imports: `useTypewriter`, `useFadeIn` from `useAnimation.ts`
- Pattern: instant feedback beats cosmetic delay — matches #427 shell loading indicator fix
- File: `packages/squad-cli/src/cli/shell/components/App.tsx` lines 16, 164-166
- Build succeeded, 2735/2744 tests pass (3 pre-existing failures unrelated to this change)
- PR #439 on branch `fix/issue-423`

### 2026-02-27: TUI fixes — exit emoji, first-run hint, welcome banner (#405, #404, #407)
- **#405 Exit message:** Replaced `◆ Squad out.` with ANSI-colored ASCII `-- Squad out.` — respects NO_COLOR, removes non-ASCII from exit path
- **#404 First-run hint:** Added compact mode (≤60 cols) — shorter suggestion text (`help me start` vs `what should we build first?`), removes padding and verbose description
- **#407 Welcome roster:** Removed emoji from agent names in roster, replaced `·` separators with `-`, switched `gap` to `columnGap` for better wrapping
- All separators in banner normalized to ASCII hyphens per P2 conventions
- Files changed: `App.tsx`, `index.ts`
- 151/151 tests pass, build clean
- PR #446 on branch `squad/tui-fixes-405-404-407`

---

📌 Team update (2026-02-24T07:20:00Z): Wave D Batch 1 work filed (#488–#493). Cheritto: #488–#490 (UX precision — status display, keyboard hints, error recovery). Kovash: #491–#492 (hardening — message history cap, per-agent streaming). Fortier: #493 (streamBuffer cleanup on error). See .squad/decisions.md for details. — decided by Keaton

📌 Team update (2026-02-24T08:12:21Z): Wave D Batch 1 COMPLETE — all 3 PRs merged to main, 2930 tests passing (+18 new). Cheritto: #498 shipped Adaptive Keyboard Hints. — decided by Scribe


### 2026-02-24T17-25-08Z : Team consensus on public readiness
📌 Full team assessment complete. All 7 agents: 🟡 Ready with caveats. Consensus: ship after 3 must-fixes (LICENSE, CI workflow, debug console.logs). No blockers to public source release. See .squad/log/2026-02-24T17-25-08Z-public-readiness-assessment.md and .squad/decisions.md for details.

### 2026-03-01: REPL scrollback rendering fixes — compaction removal + header memoization
- **Branch:** `squad/repl-scrollback-fixes`
- **Context:** Brady directive: "The app should scroll. Stop compacting text vertically — the user can scroll."
- **Changes verified on branch (prior commit `745e773`):**
  - All `!compact` guards removed from App.tsx banner — description, spacing, roster, help text always render fully
  - Compact agent-count-only branch removed — always shows full roster with names
  - `paddingY={1}` always on first-run hint (was `compact ? 0 : 1`)
  - Help text always full string (was truncated to `/help - Ctrl+C exit` in compact)
  - First-run hint always shows full text + routing explanation (was suppressed in compact)
  - `paddingLeft={2}` on agent/system messages in Static for visual hierarchy — user messages left-aligned, responses indented
  - Session-scoped Static keys (`${sessionId}-${i}`) prevent Ink item confusion across session boundaries
- **New commit (`3bfc0a1`):** Memoized header box and first-run hint with `useMemo`
  - Header depends on stable values (welcome data, width) — created once, reused across renders
  - Prevents unnecessary Ink layout work on every state change (message add, streaming update, etc.)
- **Not changed:** InputPrompt.tsx — prompt pattern `◆ squad> ` is clean, no `:>` artifact found
- **Not changed:** MessageStream.tsx — no compaction logic present, streaming/activity rendering correct
- **`compact` variable kept** in App.tsx (line 233) for future use — just not gating content anymore
- **Pattern:** In Ink 6, only one `<Static>` allowed per render tree. Content before Static is dynamic (re-renders in-place). useMemo reduces reconciliation cost but doesn't prevent Ink re-layout. For true render-once semantics, items must go through Static's `items` prop.
- Build clean (tsc --noEmit passes). 12 test failures are pre-existing acceptance test timeouts, unrelated.

### 2026-03-01: Elapsed time placement standardization (#605)
- **Branch:** `squad/605-elapsed-time-placement`
- **Problem:** Elapsed time annotations `(Xs)` were inconsistent — ThinkingIndicator showed them during processing, but completed messages in Static block had no duration. MessageStream had duration code that was dead (`messages={[]}`).
- **Fix:** Exported `formatDuration` from MessageStream.tsx, added inline `(duration)` to App.tsx Static block for agent messages.
- **Duration computation:** Walk backward from agent message to find preceding user message, compute `formatDuration(user.timestamp, agent.timestamp)`.
- **Format:** Inline dimColor after message content — `Agent: response text (4.4s)` — matches MessageStream's original intent.
- **Key insight:** After the Static scrollback refactor, all completed messages render through App.tsx's `<Static items={staticMessages}>` block, NOT MessageStream. MessageStream only renders live streaming content + ThinkingIndicator.
- **Files changed:** `App.tsx` (import + duration computation + inline display), `MessageStream.tsx` (export `formatDuration`)
- Build clean, 110/110 repl-ux tests pass.

### 2026-03-01: SQLite ExperimentalWarning subprocess leak fix (#624)
- **Branch:** `squad/624-sqlite-warning-leak`
- **Problem:** `ExperimentalWarning` for SQLite leaked into terminal via Copilot SDK subprocess. The SDK (`@github/copilot-sdk/dist/client.js:764-799`) spawns a CLI subprocess using `process.execPath` and forwards stderr with `[CLI subprocess]` prefix. The existing `process.emitWarning` override in `cli-entry.ts` only suppressed warnings in the main process — child processes didn't inherit it.
- **Fix:** Added `process.env.NODE_NO_WARNINGS = '1';` as line 2 of `cli-entry.ts` (right after shebang). This env var is inherited by all child processes spawned by the SDK, suppressing warnings at the Node.js runtime level before they reach stderr.
- **Belt-and-suspenders:** Kept the existing `process.emitWarning` override (lines 4-9) for main-process coverage.
- **Key insight:** `process.emitWarning` overrides are per-process and don't propagate to child processes. Environment variables DO propagate. `NODE_NO_WARNINGS=1` is the Node.js-native way to suppress warnings globally across process trees.
- **File changed:** `packages/squad-cli/src/cli-entry.ts` (1 line added)
- Build clean (tsc --noEmit passes).

### 2026-03-01: Banner polish — visual overload + command formatting (#626, #627)
- **Branch:** `squad/626-627-banner-polish`
- **Problem:** Banner crammed three concerns (branding, init/roster, usage guide) into one box with four inconsistent command syntax styles.
- **Fix:** Three surgical line edits in `headerElement` useMemo (App.tsx lines 300, 302, 304):
  1. Simplified empty-roster message: removed `or exit and run 'squad init'` dual-path CTA — `/init` is the primary path
  2. Removed spacer line between roster/init and usage line — tightens vertical layout
  3. Rewrote usage line: `"Type naturally · @Agent to direct · /help · Ctrl+C to exit"` — middle-dot separators, punchier copy, consistent syntax
- **Pattern:** Middle dot `·` as standard inline separator for banner hint lines (replaces mixed `—` and `-`)
- Build clean, commit `4753e55`.

### 2026-03-01: Multi-line user message rendering in Static scrollback
- **Problem:** User messages with embedded `\n` rendered in a single horizontal `<Box gap={1}>` — multi-line content could collapse or misalign because the `❯` prefix and content were side-by-side siblings.
- **Fix:** Wrapped user message rendering in `<Box flexDirection="column">`. First line keeps `❯` prefix via inner `<Box gap={1}>`. Subsequent lines (from `split('\n').slice(1)`) render in separate `<Box key={li} paddingLeft={2}>` elements, aligning with the first line's text.
- **Key detail:** `paddingLeft={2}` matches the visual width of `❯ ` (chevron + gap), so continuation lines align cleanly.
- **TypeScript:** Used `?? ''` for `split('\n')[0]` due to `noUncheckedIndexedAccess: true` in tsconfig.
- **File changed:** `App.tsx` lines 349-360 (Static scrollback user message block)
- Build clean (tsc passes for both squad-sdk and squad-cli).
📌 Team update (2026-03-01T05:57:23): Nap feature complete — dual sync/async export pattern, 38 comprehensive tests, all 3229 tests pass. Issue #635 closed, PR #636 merged. — decided by Fenster, Hockney


### 📌 Team update (2026-03-01T20-24-57Z): CLI UI Polish PRD finalized — 20 issues created, team routing established
- **Status:** Completed — Parallel spawn of Redfoot (Design), Marquez (UX), Cheritto (TUI), Kovash (REPL), Keaton (Lead) for image review synthesis
- **Outcome:** Pragmatic alpha-first strategy adopted — fix P0 blockers + P1 quick wins, defer grand redesign to post-alpha
- **PRD location:** docs/prd-cli-ui-polish.md (authoritative reference for alpha-1 release)
- **Issues created:** GitHub #662–681 (20 discrete issues with priorities P0/P1/P2/P3, effort estimates, team routing)
- **Key decisions merged:**
  - Fenster: Cast confirmation required for freeform REPL casts
  - Kovash: ShellApi.setProcessing() exposed to prevent spinner bugs in async paths
  - Brady: Alpha shipment acceptable, experimental banner required, rotating spinner messages (every ~3s)
- **Timeline:** P0 (1-2 days) → P1 (2-3 days) → P2 (1 week) — alpha ship when P0+P1 complete
- **Session log:** .squad/log/2026-03-01T20-13-00Z-ui-polish-prd.md
- **Decision files merged to decisions.md:** keaton-prd-ui-polish.md, fenster-cast-confirmation-ux.md, kovash-processing-spinner.md, copilot directives

### P1/P2 TUI Batch — Separator consolidation, empty space fix, info hierarchy, whitespace (#655, #670, #671, #677)
- **Branch:** `squad/cheritto-p1-tui-fixes`
- **Issues:** #655 (empty space above content), #670 (information hierarchy), #671 (whitespace breathing room), #677 (separator consolidation)
- **Fix #677 — Separator component:**
  - Created `Separator.tsx` — shared horizontal rule component using `detectTerminal()` + `boxChars()` internally
  - Accepts optional `width`, `marginTop`, `marginBottom` props
  - Replaced all inline `<Text dimColor>{box.h.repeat(sepWidth)}</Text>` in App.tsx, AgentPanel.tsx, MessageStream.tsx
  - Removed `detectTerminal`, `boxChars` imports and `caps`, `box`, `sepWidth` variables from all three consumer files
- **Fix #655 — Empty space above content:**
  - Removed `flexGrow={1}` from MessageStream's outer `<Box>` — this was causing the empty expanding box that pushed InputPrompt to the bottom of the viewport
  - Since MessageStream receives `messages={[]}` (all completed messages go through Static), flexGrow created dead space
- **Fix #670 — Information hierarchy:**
  - Header usage line: `@Agent` and `/help` now wrapped in `<Text bold>` within the dimColor parent
  - First-run element: "Try:" now bold (was normal weight)
  - AgentPanel empty state: split into two lines — "No agents active." (dim) + "Send a message" (bold) + "/help" (bold)
- **Fix #671 — Whitespace breathing room:**
  - Header wrapper in Static block gets `marginBottom={1}` — breathing room before first message
  - All turn separators upgraded to `<Separator marginTop={1} />` — blank line before separator
  - AgentPanel bottom separator upgraded from `marginTop={0}` to `marginTop={1}`
- **Test update:** Updated `first-run-gating.test.ts` — regex for usage line updated to handle nested `<Text bold>` elements within dimColor parent
- **Files changed:** `Separator.tsx` (new), `App.tsx`, `AgentPanel.tsx`, `MessageStream.tsx`, `first-run-gating.test.ts`
- Build clean (tsc --noEmit), 293/293 shell tests pass.
- **Pattern:** `Separator` component is the canonical way to render horizontal rules — no more inline box char repetition.
