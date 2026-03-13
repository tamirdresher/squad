# Cheritto — History

## Core Context

### Project & Stack
- **Project:** Squad — programmable multi-agent runtime for GitHub Copilot
- **Owner:** Brady
- **Stack:** TypeScript (strict, ESM), Node.js ≥20, Ink 6 (React for CLI), Vitest
- **CLI:** Ink-based interactive shell with AgentPanel, MessageStream, InputPrompt components

### Mission
- Cheritto owns TUI implementation, terminal adaptivity, animations, and visual polish
- Focus: Shell components (AgentPanel, MessageStream, InputPrompt, ThinkingIndicator)
- Goals: Responsive 40–120 col range, NO_COLOR support, graceful degradation

### Key File Paths
- Shell components: `packages/squad-cli/src/shell/components/*.tsx` (AgentPanel, MessageStream, InputPrompt, ThinkingIndicator, Separator)
- Terminal utilities: `packages/squad-cli/src/shell/terminal.ts` (getTerminalWidth, useTerminalWidth hooks)
- Main app: `packages/squad-cli/src/shell/App.tsx`
- Commands: `packages/squad-cli/src/shell/commands.ts`
- Animation hooks: `packages/squad-cli/src/shell/components/useAnimation.ts` (useTypewriter, useFadeIn, useCompletionFlash, useMessageFade)

### Terminal Adaptivity Patterns
- **Width tiers:** Compact (≤60 cols), Standard (61–99), Wide (≥100)
- **Canonical hook:** `useTerminalWidth()` for React components, `getTerminalWidth()` for non-React code
- **Responsive behaviors:**
  - AgentPanel: Compact = single-line per agent, no hints; Standard = truncated hints; Wide = full detail
  - InputPrompt: Prompt shrinks `◆ squad>` → `sq>` at <60 cols; placeholder shortens
  - Banner: Compact = header + agent count + help; Standard = adds roster; Wide = adds focus line
  - `/help`: <80 cols = single-column; ≥80 cols = 2-column table

### Animation & Visual Patterns
- **Animation hooks:** All respect NO_COLOR via `isNoColor()` — animations disabled, static content returned
- **Frame rate:** Capped at ~15fps (67ms intervals) for GPU-friendly Ink rendering
- **Separator component:** `Separator.tsx` is canonical for horizontal rules — uses `detectTerminal()` + `boxChars()` internally, accepts `width`, `marginTop`, `marginBottom` props
- **Bordered boxes:** Use `borderStyle="round"` with `borderColor`, set to `undefined` in NO_COLOR mode for graceful fallback
- **Visual vocabulary:**
  - User messages: `❯` chevron prefix
  - System messages: `▸` prefix
  - Status labels: `[WORK]`, `[STREAM]`, `[ERR]`, `[IDLE]` (text labels, not emoji)
  - Activity feed: `▸` prefix
  - Separators: `-` (dash) characters consistently

### NO_COLOR Support
- All animations disabled when `isNoColor()` returns true
- Border styles set to `undefined` for plain text fallback
- Bold text (terminal weight) works regardless of NO_COLOR
- Emoji removed from status indicators—text labels only

### Known Anti-Patterns
- FlexGrow on MessageStream causes empty expanding box—removed
- Static key collisions in React lists cause frame corruption
- Alt-buffer mode breaks scrollback and fails on SSH—use standard buffer with borders instead
- Inline box char repetition—use `Separator` component instead

## Learnings

### 2026-03-05: Fixed Bottom Input Box — Copilot/Claude CLI Style (#679)

**Context:** Implemented approved design spec from `docs/proposals/fixed-input-box-design.md` — wrap InputPrompt in bordered Box to match Copilot/Claude CLI UX.

**Changes:**
- `App.tsx`: Wrapped InputPrompt in `<Box borderStyle="round" borderColor="cyan" paddingX={1}>` with `marginTop={1}` breathing room
- Border degrades to `undefined` in NO_COLOR mode for graceful fallback
- `InputPrompt.tsx`: Refactored to `flexDirection="column"` layout—prompt + value + cursor on first line, hint text on second line (when input empty), processing state shows `[working...]` hint below spinner

**Design compliance:**
- ✅ Bordered box with `borderStyle="round"` (╔═╗ characters)
- ✅ NO_COLOR mode: border removed, plain text layout preserved
- ✅ Works at 40, 80, 120 column widths
- ✅ Hint text inside box (not floating below)
- ✅ Standard buffer (no alt-screen) — preserves scrollback

**Pattern:** Bordered Box is canonical way to create visually distinct interaction zones. Border props (`borderStyle`, `borderColor`) automatically render box-drawing characters and degrade to plain layout when undefined.

### 2026-03-01: P1/P2 TUI Batch — Separator Consolidation, Empty Space Fix, Hierarchy, Whitespace (#655, #670, #671, #677)

**Issues:** #655 (empty space above content), #670 (information hierarchy), #671 (whitespace breathing room), #677 (separator consolidation)

**Fix #677 — Separator component:**
- Created `Separator.tsx` — shared horizontal rule component using `detectTerminal()` + `boxChars()` internally
- Accepts optional `width`, `marginTop`, `marginBottom` props
- Replaced all inline separator rendering in App.tsx, AgentPanel.tsx, MessageStream.tsx

**Fix #655 — Empty space:**
- Removed `flexGrow={1}` from MessageStream's outer `<Box>` — was causing expanding dead space pushing InputPrompt down

**Fix #670 — Information hierarchy:**
- Header usage line: `@Agent` and `/help` now bold within dimColor parent
- First-run element: "Try:" now bold
- AgentPanel empty state: split into two lines with bold emphasis

**Fix #671 — Whitespace breathing room:**
- Header wrapper gets `marginBottom={1}`, all turn separators upgraded to `<Separator marginTop={1} />`

### 2026-03-01: Visual Table Header Styling (#673)

**Problem:** Table headers looked identical to data rows—hard to scan tables quickly.

**Fix:** Added `boldTableHeader()` helper in `MessageStream.tsx` that detects separator rows (cells matching `/^[-:]+$/`), identifies header row above, wraps cell contents in `**...**` markdown. `renderMarkdownInline()` renders as `<Text bold>`.

**NO_COLOR:** Bold is terminal weight, not color—works regardless of NO_COLOR setting.

**Pattern:** Markdown bold syntax `**...**` is canonical way to emphasize table headers in streaming content.
