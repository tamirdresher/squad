# Marquez — History

## Core Context

### Mission
- Marquez owns first-time user experience, the first 30 seconds from install to "wow" moment
- Key principle: "The impatient user bails at second 7"
- Goal: Every moment from `squad --help` to first response must be clear, fast, and confidence-building

### Core UX Principles for Squad CLI
1. **Never silent, never vague:** Every waiting state must explain WHAT is happening, not just THAT something is happening
2. **Default labels should match reality:** "Thinking..." is wrong during routing. Labels should describe system state accurately
3. **3-5 words max:** Feedback text must be scannable at a glance
4. **Specific beats generic:** Activity hints ("Keaton reading file...") always override defaults
5. **Test the first 30 seconds brutally:** Every moment must be clear, fast, confidence-building

### Recurring UX Anti-Patterns
- **Inconsistent status vocabularies:** Different labels in different contexts (AgentPanel, /agents, help text)
- **Information architecture sprawl:** Flat lists without grouping or visual hierarchy
- **Silent waiting states:** Cold SDK connection (3-5s) without feedback feels like freezing
- **Stub commands in help:** Non-functional commands destroy trust
- **Inconsistent visual vocabulary:** Multiple separator styles, prompt characters, status labels

### Key File Paths
- CLI entry: `packages/squad-cli/src/cli-entry.ts` (help text, status command)
- Shell app: `packages/squad-cli/src/shell/App.tsx` (header, welcome, exit)
- Input prompt: `packages/squad-cli/src/shell/components/InputPrompt.tsx`
- Agent panel: `packages/squad-cli/src/shell/components/AgentPanel.tsx`
- Commands: `packages/squad-cli/src/shell/commands.ts` (in-REPL commands like /help, /status, /quit)

### Gold Standard Comparison
**vs. Claude CLI:**
- Claude has cleaner first-run (minimal, no banner overload), more responsive streaming, structured /help with categories
- Squad advantage: Multi-agent panel and routing system is genuinely novel UI—Claude can't do this

**vs. GitHub Copilot CLI:**
- Copilot has tighter suggestion flow, simpler (no coordinator concept), better tool-call visibility ("Reading file...")
- Squad advantage: Multi-agent orchestration is category-defining. Copilot doesn't do team coordination.

**What Best-in-Class CLIs Have That Squad Doesn't:**
1. Session persistence (conversations disappear on exit)
2. Structured help (`gh help` groups by category)
3. Command autocomplete (TAB completion)
4. Progress bars for long operations (init, upgrade)
5. Configuration command (`squad config`)
6. Onboarding wizard ("What does your project do?")

## Learnings

### 2026-03-05: Design Spec — Fixed Bottom Input Box (#679)

**Task:** Brady request — "Input is a simple prompt line, not anchored in a squared-off box at bottom like Copilot CLI / Claude CLI." Design fixed-position input box per Copilot/Claude style.

**Deliverable:** `docs/proposals/fixed-input-box-design.md`

**Spec Contents:**
1. ASCII wireframes at three terminal widths (120, 80, 40 columns): Idle, Typing, Processing, Error states
2. Interaction states documented: Idle (`◆ squad> [cursor]`), Typing (text flows, hint hides), Processing (spinner + activity hint), Error (system message above box)
3. Technical feasibility analysis:
   - Alt-buffer NOT recommended (breaks scrollback, incompatible with streaming, fails on SSH)
   - Recommended: Render InputPrompt in bordered `<Box borderStyle="round">` within standard buffer
4. NO_COLOR & Accessibility: Color mode uses rounded box-drawing (╔═╗), NO_COLOR uses ASCII dashes (─────), prompt shortens at ≤60 columns
5. Implementation phasing: Phase 1 (MVP) = add border wrapper; Phase 2 (Future) = static positioning if Ink adds height APIs

**Key Insight:** Copilot/Claude's fixed-box UX doesn't require alt-buffer. A bordered container in standard buffer delivers same visual hierarchy while preserving Squad's streaming architecture and scrollback history.

### 2026-03-01: CLI UI Polish PRD finalized — 20 Issues Created

**Status:** Completed. Parallel spawn with Redfoot (Design), Cheritto (TUI), Kovash (REPL), Keaton (Lead) for image review synthesis.

**Outcome:** Pragmatic alpha-first strategy adopted—fix P0 blockers + P1 quick wins, defer grand redesign to post-alpha.

**PRD location:** `docs/prd-cli-ui-polish.md` (authoritative reference for alpha-1 release)

**Issues created:** GitHub #662–681 (20 discrete issues with priorities P0/P1/P2/P3, effort estimates, team routing)

**Key decisions merged:**
- Fenster: Cast confirmation required for freeform REPL casts
- Kovash: ShellApi.setProcessing() exposed to prevent spinner bugs in async paths
- Brady: Alpha shipment acceptable, experimental banner required, rotating spinner messages (every ~3s)

**Timeline:** P0 (1-2 days) → P1 (2-3 days) → P2 (1 week) — alpha ship when P0+P1 complete

### 2026-02-24: First 30 Seconds UX Audit — Critical Path Issues Filed

**Task:** Brady directive — "The impatient user bails at second 7." Audit first-time user experience from install to first "wow" moment.

**Critical Paths Audited:**
1. `squad --help` — information architecture and scannability
2. `squad` with no args — default behavior clarity
3. Cold SDK connection — wait state feedback
4. Welcome screen animation — input blocking
5. Processing spinner — activity context

**Issues Filed (6 total):**

- **#419: Help text is overwhelming — users scan, not read** (P0)
  - 50-line flat list with no visual hierarchy
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

**Core Learning:** Never silent, never vague. Every waiting state must explain WHAT is happening, not just THAT something is happening. Default labels should match reality.
