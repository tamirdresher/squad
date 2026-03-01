# Marquez — History

## Project Context
- **Project:** Squad — programmable multi-agent runtime for GitHub Copilot
- **Owner:** Brady
- **Stack:** TypeScript (strict, ESM), Node.js ≥20, Ink 6 (React for CLI), Vitest
- **CLI:** Ink-based interactive shell with AgentPanel, MessageStream, InputPrompt components
- **Key files:** packages/squad-cli/src/cli/shell/components/*.tsx

### 2026-02-24: Comprehensive UX Audit — Honest Quality Assessment

**Task:** End-to-end UX quality audit requested by Brady. Brutally honest assessment.

**Files Reviewed (all re-read in full):**
- `packages/squad-cli/src/cli-entry.ts` — CLI entry, help, version, command routing
- `packages/squad-cli/src/cli/shell/index.ts` — Main shell loop, SDK integration, streaming
- `packages/squad-cli/src/cli/shell/commands.ts` — Slash commands (/status, /help, /agents, /history, /clear, /quit)
- `packages/squad-cli/src/cli/shell/components/App.tsx` — Shell layout, welcome banner, header
- `packages/squad-cli/src/cli/shell/components/AgentPanel.tsx` — Agent roster, pulsing dots, completion flash
- `packages/squad-cli/src/cli/shell/components/MessageStream.tsx` — Message rendering, streaming cursor, activity feed
- `packages/squad-cli/src/cli/shell/components/InputPrompt.tsx` — Input handling, spinner, history navigation
- `packages/squad-cli/src/cli/shell/components/ThinkingIndicator.tsx` — Thinking spinner, elapsed time, color cycling
- `packages/squad-cli/src/cli/shell/useAnimation.ts` — Typewriter, fade-in, completion flash, message fade hooks
- `packages/squad-cli/src/cli/core/init.ts` — Init ceremony, scaffolding, typewriter effect
- `packages/squad-cli/src/cli/shell/terminal.ts` — Terminal detection, NO_COLOR, resize
- `packages/squad-cli/src/cli/shell/router.ts` — Input parsing (@agent, /command, natural language)
- `packages/squad-cli/src/cli/shell/lifecycle.ts` — Team discovery, welcome data, role emoji mapping
- `packages/squad-cli/src/cli/core/output.ts` — ANSI codes, success/error/warn helpers
- `packages/squad-cli/src/cli/core/errors.ts` — SquadError, fatal()

### 📌 Team update (2026-03-01T02:04:00Z): Screenshot review session 2 — UX messaging and state clarity P0s
- **Status:** Completed — Joined Keaton, Kovash, Cheritto, Waingro in parallel review of 15 REPL screenshots from human testing.
- **Finding:** P0 blockers from UX perspective:
  - Orphaned period in UI text (punctuation/clarity issue)
  - Confusing @your lead placeholder (messaging clarity)
  - These connect to root cause: contradictory state messaging across roster/team display
- **P1 Friction identified (4 points):**
  - Duplicate header (redundancy)
  - Coordinator label (clarity)
  - Wall of text (information density)
  - Redundant CTAs (user guidance confusion)
- **Cross-team alignment:** Keaton and Waingro independently flagged contradictory roster messaging (assembled vs empty). Suggests systemic state representation issue requiring messaging + state coherence alignment.
- **Next:** Coordinate with Keaton and Waingro on messaging/state coherence redesign. Prioritize clarity and density before addressing P1s.
- **Session log:** `.squad/log/2026-03-01T02-04-00Z-screenshot-review-2.md`

---

## OVERALL GRADE: B

A solid B. Not a B+ because of accumulated rough edges. Not a B- because the architectural foundation and design intent are genuinely strong. This is a product built by someone who cares about UX, but it needs a polish pass before it can stand next to best-in-class CLIs.

---

## THE GOOD (What's Working Well)

### 1. Init Ceremony Is Best-in-Class
The `squad init` experience is legitimately delightful. Typewriter animation on "Let's build your team," staggered landmark reveals, the "Your team is ready. Run squad to start." payoff — this is the kind of emotional design that builds user loyalty. The NO_COLOR fallback is handled correctly. The celebration doesn't overstay its welcome. This is an A.

### 2. Information Architecture Is Sound
The shell layout makes sense: header (identity + context) → agent panel (who's doing what) → message stream (conversation) → input prompt. This is the right hierarchy. Users always know where they are, who's available, and what's happening.

### 3. Thoughtful Accessibility
NO_COLOR support is implemented consistently across ALL components. Every animation hook checks `isNoColor()` first. Static fallbacks exist for every animated element. Windows Terminal detection (`WT_SESSION`) for Unicode. This is professional-grade accessibility work.

### 4. Responsive Layout Has a Strategy
Three breakpoints (compact ≤60, normal 61-99, wide ≥100) with intentional content degradation. Compact mode strips descriptions and shortens prompts (`sq>` vs `◆ squad>`). This is well-thought-out.

### 5. Error Messages Guide Users
Almost every error includes a next step: "Run `squad doctor`", "Run `squad init`", "Try again or check your connection." The catch handler in main() includes a tip about `squad doctor`. This is better than most CLIs.

### 6. Ghost Retry is Invisible UX Excellence
The `withGhostRetry` mechanism handles SDK flakiness silently, with progressive user notification. Retry 1 shows a warning. All exhausted shows an error. The user never gets a blank response without explanation. This is the kind of defensive UX that separates good products from great ones.

### 7. Streaming UX is Strong
Live cursor (▌), real-time activity hints ("Reading file...", "Searching codebase..."), elapsed time tracking, color cycling as time passes (cyan → yellow → magenta) — this gives the user constant feedback that something is happening. The ThinkingIndicator is well-designed.

---

## THE BAD (Issues That Hurt the Experience)

### P0: Critical Issues

**P0-1: Help text is a wall of undifferentiated text**
The `help` output in cli-entry.ts (lines 70-119) is 50 lines of raw console.log. No grouping by category. No visual hierarchy between "things you'll use daily" (init, status) and "things you'll use once" (scrub-emails, aspire). Compare to GitHub CLI's `gh help` which groups commands into "CORE COMMANDS" and "ADDITIONAL COMMANDS." Users scanning this wall will miss the command they need.

**P0-2: Stub commands pollute the experience**
`triage`, `loop`, and `hire` are stubs that print a message and exit. `triage` says "(full implementation pending)" — this is a confession to the user that the product is incomplete. Either ship it or don't show it in help. Having 3 non-functional commands in the help listing destroys trust.

**P0-3: Two taglines**
Line 55: "Add an AI agent team to any project"
Line 71: "Team of AI agents at your fingertips"
These are displayed in different contexts (empty args vs. help). A product should have ONE tagline. This signals an unfinished brand identity.

### P1: Significant Issues

**P1-1: Separator character inconsistency**
`AgentPanel.tsx` line 97: `'-'.repeat(sepWidth)` (dash characters)
`MessageStream.tsx` line 97: `'-'.repeat(sepWidth)` (dash characters)
But `App.tsx` uses Ink's `borderStyle="round"` with rounded box-drawing characters.
The init ceremony uses `─` (Unicode box-drawing horizontal).
Three different visual vocabularies for "line across the screen." Pick one.

**P1-2: The prompt character changes meaning**
- Input prompt: `◆ squad>` (diamond is the brand mark)
- Init ceremony: `◆ SQUAD` (diamond is the brand mark)
- User messages: `❯` (right-pointing angle)
- System messages: `▸ system:` (right-pointing triangle)
This is fine as a system, but there's no documentation or consistency guide. The `▸` for system and `❯` for user are too visually similar. At a glance in a fast-scrolling conversation, they blend.

**P1-3: Agent status labels are inconsistent**
- AgentPanel compact mode: `streaming`, `working`
- AgentPanel normal mode: `▶ Active` (not "streaming" or "working")
- AgentPanel NO_COLOR: `[Active]`, `[Error]`, `[WORK]`, `[STREAM]`, `[ERR]`, `[IDLE]`
Wait — compact mode shows `streaming`/`working` as lowercase text, but the `handleAgents` command in commands.ts shows `[WORK]`, `[STREAM]`, `[ERR]`, `[IDLE]` in uppercase brackets. Normal mode collapses both into `▶ Active`. There are THREE different status vocabularies depending on where you look.

**P1-4: /agents and AgentPanel show different things**
AgentPanel renders the live roster with pulsing dots and color. The `/agents` command returns a text list with `[WORK]`/`[STREAM]`/`[ERR]`/`[IDLE]` brackets. Same data, completely different presentation. This creates cognitive dissonance — the user sees one thing at the top of the screen and something different when they type `/agents`.

**P1-5: "No team members yet" is wrong**
`handleAgents()` returns "No team members yet." when registry is empty. But agents are discovered at lifecycle initialization from team.md. If the registry is empty, it's because initialization failed, not because there are no team members. The message should say "No agents connected. Try sending a message to wake them up."

**P1-6: Completion flash only works in normal mode**
`useCompletionFlash` is called in AgentPanel but the `completionFlash` Set is only rendered in the non-compact branch (line 132). Compact mode users never see the "✓ Done" flash. This is a responsive design gap.

**P1-7: The roster line in the header is a string concatenation crime**
```tsx
const rosterText = welcome?.agents
  .map((a, i) => `${a.emoji} ${a.name}${i < (welcome?.agents.length ?? 0) - 1 ? ' · ' : ''}`)
  .join('') ?? '';
```
This produces `🏗️ Keaton · 💬 Riley · 🔧 Devon` — emoji + name separated by middots. But it's one giant `<Text>` node with `wrap="wrap"`. If the terminal is narrow enough to wrap, it'll break mid-agent (e.g., `🏗️ Keaton · 💬` on one line and `Riley · 🔧 Devon` on the next). This should use `<Box flexWrap="wrap">` with individual agent nodes, like AgentPanel does.

### P2: Polish Issues

**P2-1: Exit behavior is fragmented**
- `Ctrl+C` exits (useInput handler in App.tsx)
- `/quit` exits (commands.ts)
- `/exit` exits (commands.ts)
- `exit` exits (EXIT_WORDS in App.tsx)
- But `quit` alone does NOT exit (not in EXIT_WORDS)

If `/quit` works, `quit` should too. The asymmetry between `exit`/`quit` as bare words vs. slash commands is confusing.

**P2-2: The goodbye message is underwhelming**
`console.log('👋 Squad out.')` — after a rich, animated, color-coded experience, the exit is a plain console.log. No animation, no summary of what happened in the session. Claude CLI shows a brief session summary. This is a missed opportunity.

**P2-3: `scrub-emails` default directory is `.ai-team`**
Line 252: `const targetDir = args[1] || '.ai-team';` — defaults to the deprecated directory name. Should default to `.squad`.

**P2-4: No confirmation for destructive operations**
`/clear` sends `\x1Bc` (ANSI clear screen) with no confirmation. `/quit` exits immediately. For `/clear`, a "Clear screen? (y/n)" or at least "Screen cleared. Messages preserved in /history." would prevent the "I just lost my conversation" panic.

**P2-5: Keyboard hints could be smarter**
The header shows `↑↓ history · @Agent to direct · /help · Ctrl+C exit` regardless of context. On first run after init, it should emphasize `@Agent` since that's the primary interaction. Once the user has sent a few messages, the hints could adapt.

**P2-6: `squad status` and `/status` show different information**
`squad status` (cli-entry.ts lines 276-300) shows repo path, squad type (repo vs personal vs global).
`/status` (commands.ts) shows team root, size, active count, conversation length.
These are both called "status" but show completely different things. Users will be confused.

---

## COMPARISON TO GOLD STANDARD

### vs. Claude CLI
- Claude has a cleaner first-run experience — minimal, focused, no banner overload
- Claude's streaming feels more responsive because it doesn't batch by agent name
- Claude's `/help` is structured with categories
- Squad's multi-agent panel has no equivalent in Claude — this is a differentiator
- **Squad advantage:** The agent roster and routing system is genuinely novel UI. Claude can't do this.

### vs. GitHub Copilot CLI
- Copilot CLI's suggestions flow is tighter — fewer concepts to learn
- Copilot CLI doesn't need a "coordinator" concept — it's simpler
- Copilot CLI has better tool-call visibility ("Reading file...", "Running command...")
- **Squad advantage:** Squad already has activity hints, and the multi-agent orchestration is a category-defining feature. Copilot doesn't do team coordination.

### What Best-in-Class CLIs Have That Squad Doesn't
1. **Session persistence** — Claude saves conversations. Squad conversations disappear on exit.
2. **Structured help** — `gh help` groups by category. Squad dumps a flat list.
3. **Command autocomplete** — There's a `createCompleter` export but it's unclear if TAB completion works in the Ink shell.
4. **Progress bars** — For long operations (init, upgrade), a determinate progress indicator would beat the indeterminate spinner.
5. **Configuration command** — No `squad config` to set defaults, change themes, or adjust behavior.
6. **Onboarding wizard** — First `squad init` should ask "What does your project do?" to personalize the welcome.

---

## SUMMARY

**Strengths:** The architectural intent is right. The init ceremony, streaming UX, ghost retry, and NO_COLOR accessibility are genuinely impressive. The multi-agent panel is a novel UI concept that no competitor has. The responsive layout strategy is well-thought-out.

**Weaknesses:** Death by a thousand paper cuts. Three status vocabularies. Two taglines. Stub commands in help. Inconsistent separators. Different information behind the same "status" label. These small inconsistencies accumulate into an experience that feels 85% polished rather than 100%.

**To get to an A:** Fix P0s (structured help, remove stubs, one tagline). Fix P1-3 and P1-4 (unified status vocabulary). Add session persistence. That's probably 2-3 days of focused work.

## Learnings

### 2026-02-24: First 30 Seconds UX Audit — Critical Path Issues Filed

**Task:** Brady directive — "The impatient user bails at second 7." Audit the first-time user experience from install to first "wow" moment. File GitHub issues for every un-delightful moment in the first 30 seconds.

**Critical Paths Audited:**
1. `squad --help` — information architecture and scannability
2. `squad` with no args — default behavior clarity
3. Cold SDK connection — wait state feedback
4. Welcome screen animation — input blocking
5. Processing spinner — activity context

**Issues Filed (6 total):**

- **#419: Help text is overwhelming — users scan, not read** (P0)
  - 50-line flat list with no visual hierarchy
  - Core commands buried alongside power-user utilities
  - Solution: Group into GETTING STARTED / TEAM MANAGEMENT / ADVANCED sections
  - Impact: First 7 seconds of user journey

- **#420: Cold SDK connection — 5 seconds of silence feels like forever** (P0)
  - No feedback during 3-5 second SDK initialization on first message
  - User thinks: "Did it freeze?"
  - Solution: Show "Connecting to GitHub Copilot..." and "Waking up [Agent]..." status
  - Impact: #1 reason users think Squad is broken

- **#421: squad --help buries the default behavior** (P0)
  - Help text doesn't lead with "just run squad"
  - `(default)` note hidden in 50-line command list
  - Solution: Lead with primary usage pattern at top of help
  - Impact: Users waste time looking for "start" command

- **#422: Spinner with no context — what is it doing?** (P0)
  - Processing spinner shows ⠋ with zero explanation
  - User sees spinner but doesn't know: connecting? routing? working?
  - Solution: Activity hints already exist, need to show during spinner
  - Impact: 3-second silence creates "is it broken?" anxiety

- **#423: Welcome screen typewriter blocks input for 800ms** (P1)
  - Typewriter animation on "◆ SQUAD" delays prompt render
  - 500ms title + 300ms fade-in = 800ms before user can type
  - Solution: Skip animation on subsequent launches (first-run only), OR make non-blocking
  - Impact: Every launch feels slow

- **#426: Two different taglines — pick one and stick with it** (P1)
  - "Add an AI agent team to any project" vs "Team of AI agents at your fingertips"
  - Inconsistent brand voice across help vs empty-args output
  - Solution: Choose one, apply everywhere (README, help, banner)
  - Impact: Brand consistency, perceived polish

**Key Insight: The First 30 Seconds**

Brady's hypothesis is correct: The critical window is seconds 1-30, and we're losing users at second 7.

**Timeline of a first-time user:**
- **0:00** — User runs `squad --help`
- **0:03** — Eyes glaze over at 50-line wall of text
- **0:07** — Can't find "how to start", runs `squad` hoping for guidance
- **0:10** — Shell launches, sees typewriter animation
- **0:11** — Waits for animation to finish before typing (feels blocked)
- **0:12** — Types first message, hits enter
- **0:15** — Sees spinner with no context
- **0:18** — Still spinning. No feedback. User wonders if it's broken.
- **0:22** — Either bails (Ctrl+C) OR content finally streams

**The impatient user bails at 0:18** — after 6 seconds of silence post-enter.

**What needs to change:**
1. Help text must be scannable in 3 seconds (grouped sections)
2. Default behavior must be obvious (lead with "just run squad")
3. SDK connection must show status ("Connecting...")
4. Welcome animation should be instant after first run
5. Spinner must explain what it's doing ("Keaton connecting...")

All 6 issues address the 0-30 second window. Fixing these removes the bail-out moments.

**Files Identified for Changes:**
- `packages/squad-cli/src/cli-entry.ts` — help text structure, tagline consistency
- `packages/squad-cli/src/cli/shell/components/App.tsx` — welcome animation gating
- `packages/squad-cli/src/cli/shell/components/InputPrompt.tsx` — spinner context display
- `packages/squad-cli/src/cli/shell/index.ts` — SDK connection status messages

**Next Actions:**
- Cheritto (TUI Engineer): Address #423 (welcome animation), #422 (spinner context)
- Fenster/Edie (Core Dev): Address #419 (help structure), #421 (help intro), #426 (tagline)
- Kujan (SDK Expert): Address #420 (SDK connection feedback)

### 2026-02-23: Initial CLI UX Audit Completed

**Task:** Comprehensive UX audit of Squad CLI across all entry points and interactive shell components.

**Files Reviewed:**
- `packages/squad-cli/src/cli-entry.ts` — Command routing, help text, version output, error handling
- `packages/squad-cli/src/cli/shell/components/App.tsx` — Shell layout, header, welcome text, keyboard hints
- `packages/squad-cli/src/cli/shell/components/AgentPanel.tsx` — Agent roster, status display, separators
- `packages/squad-cli/src/cli/shell/components/MessageStream.tsx` — Message rendering, thinking indicators, timestamps
- `packages/squad-cli/src/cli/shell/components/InputPrompt.tsx` — Input handling, placeholders, disabled states
- `packages/squad-cli/src/cli/shell/commands.ts` — Slash command implementations (/status, /help, /agents)
- `packages/squad-cli/src/cli/shell/terminal.ts` — Terminal capability detection

**Key UX Patterns Identified:**

1. **Visual Hierarchy System:**
   - ◆ for primary prompts/system (cyan)
   - ❯ for user input (cyan)
   - Role emoji + name for agents (green)
   - Status indicators: pulsing dots for active, dim for idle

2. **Color Semantics:**
   - Cyan = user/system/prompts
   - Green = agent responses
   - Yellow = processing/warnings
   - Red = errors
   - Dim = secondary info/hints

3. **Information Density Philosophy:**
   - Header: identity + context (version, description, roster, focus)
   - Panel: current agent states + activity
   - Stream: conversation history with timestamps
   - Prompt: current input + placeholder hints

4. **Interaction Model:**
   - Natural language (coordinator routing)
   - @Agent direct addressing
   - Slash commands for meta-actions (/status, /help, /agents, /history, /clear, /quit)
   - Keyboard shortcuts (↑/↓ history, Ctrl+C quit)

**Issues Found:** 21 total (5 P0, 9 P1, 7 P2)

**Common UX Anti-Patterns Detected:**
- **Inconsistent verbs** in command descriptions (P1) — no pattern across help text
- **Hardcoded dimensions** (50-char separators) instead of terminal-aware layout (P1)
- **Technical jargon** exposed to users ("Connecting", "Routing" phase labels) (P2)
- **Redundant information** (agent count shown twice) (P1)
- **Missing remediation hints** in error messages (P0)
- **80-char violations** in help output (P0)
- **Inconsistent visual vocabulary** (◇ vs ●, ─ vs ┄, color emoji vs text) (P1-P2)

**UX Gates Defined:** 7 testable assertions for CI
1. Help line length (≤80 chars)
2. Version format (semver only)
3. Error remediation hints (must contain actionable verbs)
4. Empty state actionability (must mention "squad init")
5. Terminal width compliance (80x24 golden test)
6. Separator consistency (single character across components)
7. Command verb consistency (imperative verbs)

**Design Principles Extracted:**
- **Crisp, confident, delightful** — not just functional
- **Consistent visual language** reduces cognitive load
- **Every error includes next action** — never leave users stuck
- **Empty states are onboarding opportunities** — show the path forward
- **Terminal-aware layout** — respect width constraints, degrade gracefully
- **Minimal but meaningful** — information should earn its space

**Next Actions:**
- Breedan implements UX gates as Vitest tests
- Brady or assigned dev addresses P0 blockers before next release
- P1/P2 polish in subsequent iterations

**Files Written:**
- `.squad/decisions/inbox/marquez-ux-review-initial.md` — Full audit report with actionable diffs

### 2026-02-23: Visual Polish Pass — "Make It Look Good"

**Task:** Brady directive: "Put my name on it. Make it look good." Walk every component, file issues, fix them all.

**Branch:** `squad/marquez-visual-love`
**PR:** #413

**Issues Filed (6):**
- #391 — Separator characters use hyphens instead of box-drawing
- #393 — /help output is unstyled plain text
- #388 — /agents command uses ugly bracket notation
- #392 — ThinkingIndicator default label nearly invisible
- #389 — 'quit' bare word doesn't exit but '/quit' does
- #390 — /status output is unstyled wall of text

**Files Changed (7):**
- `packages/squad-cli/src/cli/shell/components/AgentPanel.tsx` — `─` separators (both compact and normal)
- `packages/squad-cli/src/cli/shell/components/MessageStream.tsx` — `─` turn separator
- `packages/squad-cli/src/cli/shell/components/ThinkingIndicator.tsx` — Remove double-dim on "Thinking..."
- `packages/squad-cli/src/cli/shell/components/App.tsx` — Add 'quit' to EXIT_WORDS
- `packages/squad-cli/src/cli/shell/commands.ts` — Redesigned /help, /status, /agents with visual hierarchy
- `test/cli-shell-comprehensive.test.ts` — Updated assertions for new output format
- `test/repl-ux.test.ts` — Updated separator assertion

**Design Decisions:**
- Box-drawing `─` (U+2500) everywhere instead of ASCII `-` — one visual vocabulary
- `/help` leads with "Talk to your team" (primary action) above meta commands
- `/agents` uses same emoji + status language as AgentPanel (○ ready / ● active / ✖ error)
- `/status` uses ◆ brand mark and clean aligned key-value layout
- ThinkingIndicator: `italic` only, no `dimColor` — waiting feedback must be visible

**What I didn't touch (and why):**
- Init ceremony — already an A. Don't fix what works.
- useAnimation.ts — clean hooks, 15fps cap is right, NO_COLOR handled properly.
- Welcome banner layout — other agent (Cheritto) was actively improving the roster rendering.
- InputPrompt — solid as-is. The cursor, placeholder, spinner all work.

**Verification:** Build clean. All new test assertions pass. 3 pre-existing test failures (ThinkingIndicator isThinking=false, Tab autocomplete x2) confirmed unrelated.

### 2026-02-24: Issue #422 — Spinner Context (Routing Label)

**Task:** Brady issue — "The ThinkingIndicator shows a spinner but doesn't say WHAT it's doing. Add contextual text like 'Routing to agent...' or 'Agent thinking...'"

**Branch:** `fix/issue-422`
**PR:** #436

**Root Cause:** ThinkingIndicator defaulted to "Thinking..." when no `activityHint` was provided. During the critical 3-5 second cold SDK connection, users saw a generic spinner with no explanation of what was happening — routing, connecting, or processing.

**Solution:** Changed default label from "Thinking..." to "Routing to agent..." — matches what the system is actually doing during that phase (coordinator routing the request to an appropriate agent).

**Files Changed:**
- `packages/squad-cli/src/cli/shell/components/ThinkingIndicator.tsx` — Default label updated in both NO_COLOR and color branches
- `test/regression-368.test.ts` — Updated 4 test assertions
- `test/repl-ux.test.ts` — Updated 3 test assertions

**Why "Routing to agent..." wins:**
1. **Accurate:** That's literally what happens during cold SDK connection
2. **Short:** 3 words, fits the 3-5 word guideline
3. **Human:** No jargon, explains system state clearly
4. **Covers the gap:** Activity hints already handle specific agent work ("Keaton thinking...", "Reading file...") — this fills the routing/connection phase

**Activity hint priority preserved:** When SDK or MessageStream provides an explicit `activityHint`, it still overrides the default. The new label only shows when no specific context is available.

**Impact:** Eliminates the "is it broken?" anxiety during first message send. Users now see clear feedback during every phase of request processing.

**Tests:** All 127 tests pass (21 in regression-368, 106 in repl-ux).

## Design Principles

From the audits and fixes above, core UX principles for Squad CLI:

1. **Never silent, never vague:** Every waiting state must explain WHAT is happening, not just THAT something is happening.
2. **Default labels should match reality:** "Thinking..." is wrong during routing. Labels should describe system state accurately.
3. **3-5 words max:** Feedback text must be scannable at a glance.
4. **Specific beats generic:** Activity hints ("Keaton reading file...") always override defaults.
5. **Test the first 30 seconds brutally:** The impatient user bails at second 7. Every moment from `squad --help` to first response must be clear, fast, and confidence-building.

### 2026-02-24T17-25-08Z : Team consensus on public readiness
📌 Full team assessment complete. All 7 agents: 🟡 Ready with caveats. Consensus: ship after 3 must-fixes (LICENSE, CI workflow, debug console.logs). No blockers to public source release. See .squad/log/2026-02-24T17-25-08Z-public-readiness-assessment.md and .squad/decisions.md for details.

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
