# PRD: Squad CLI UI Polish
**Status:** Draft  
**Author:** Keaton (Lead)  
**Date:** 2026-03-01  
**Reviewers:** Brady, Marquez (UX), Redfoot (Design)

---

## Overview

This PRD addresses critical UX/UI issues discovered during the team's visual review of 15 REPL screenshots from human testing (Session log: `.squad/log/2026-03-01T02-04-00Z-screenshot-review-2.md` and subsequent image analysis). Five team members (Redfoot, Marquez, Cheritto, Kovash, Brady) identified 20+ specific issues ranging from **P0 alpha blockers** (blank screens, no loading feedback) to **P3 future polish** (fixed bottom input, advanced layout).

This document defines what we're shipping for **alpha release** versus what we're deferring to post-alpha. The goal is pragmatic: ship a functional, usable CLI that doesn't embarrass us, not a grand redesign.

**Key Constraint:** Brady confirmed alpha-level shipment is acceptable. No grand redesign today. Focus on quick wins and critical blockers.

---

## Goals

**Primary Goal:** Ship Squad CLI in a state where users understand it's alpha software and can successfully use core functionality without encountering broken states.

**Success looks like:**
1. Users never see a blank screen for >500ms without feedback
2. Users understand when Squad is thinking/working vs. crashed
3. Users know they're running alpha software with expected rough edges
4. Secondary text is readable (contrast ≥4.5:1)
5. Tables and separators are visually clear
6. Input prompt stays at bottom consistently
7. Copy is concise, actionable, and jargon-free

**Non-Goals:**
- Perfect visual design
- Advanced terminal features (alt screen buffer, fixed input box)
- Comprehensive responsive design (<80 cols)
- Marketing copy polish

---

## User Problems

### P0: Alpha Blockers (Ship Stoppers)

**1. Blank/Loading States Are Broken (images 002, 003)**
- **Finding:** User sees blank screen with no feedback during long operations
- **Impact:** Users think Squad crashed. Trust evaporates instantly.
- **Source:** Redfoot (CRITICAL), Marquez (CRITICAL), Cheritto (MAJOR), Kovash (TODAY)
- **Image refs:** 002 (long wait, no spinner), 003 (completely blank screen)

**2. No Alpha/Experimental Warning**
- **Finding:** No indication this is alpha software
- **Impact:** Users will file bug reports for expected alpha rough edges, creating support noise
- **Source:** Marquez (CRITICAL), Kovash (TODAY)
- **Image refs:** All screenshots lack warning

**3. Static Spinner Text (no rotation)**
- **Finding:** `ThinkingIndicator.tsx` has dynamic rotation logic with `THINKING_PHRASES` + 3s timer, but `App.tsx` overrides it with static `activityHint`/`mentionHint` props
- **Impact:** No visual confirmation Squad is alive during long waits
- **Source:** Cheritto (MEDIUM, ~5 line fix), Kovash (TODAY)
- **Technical note:** App.tsx lines ~200-220 override component's built-in rotation

### P1: High Priority (Ship within first week)

**4. Low Contrast on Secondary Text (all images)**
- **Finding:** Time indicators, hints, dim examples barely readable
- **Impact:** Accessibility fail, users miss important context
- **Source:** Redfoot (HIGH)
- **Quick win:** 30 minutes to bump contrast

**5. Inconsistent Semantic Color System (all images)**
- **Finding:** Cyan/green/yellow used inconsistently across UI
- **Impact:** Users can't trust color cues to mean anything
- **Source:** Redfoot (HIGH)

**6. Copy Too Verbose (images 001, 004, 007)**
- **Finding:** "Routing your message to the team now..." (jargon), version "v0.8.6.14-preview" (too long), roster re-displays (repetitive)
- **Impact:** Cognitive overload, buried CTAs, mechanical process text exposed
- **Source:** Marquez (HIGH)

**7. Information Hierarchy Weak (all images)**
- **Finding:** CTAs buried, same visual weight everywhere, no clear focal points
- **Impact:** Users don't know what to do next
- **Source:** Marquez (HIGH)

**8. CLI Timeout Too Low**
- **Finding:** Brady tried Squad CLI in this repo and hit timeout
- **Impact:** Users fail on real-world repos
- **Source:** Brady (direct feedback)
- **Note:** Likely already fixed per 2026-02-24 history (configurable via env var, default 10 min)

### P2: Medium Priority (Next sprint)

**9. Horizontal Separators Invisible (images 001, 004, 008)**
- **Finding:** `---` barely visible, should use box-drawing chars
- **Impact:** Visual structure lost
- **Source:** Redfoot (MEDIUM)
- **Quick win:** 15 minutes

**10. Table Header Styling Weak (image 009)**
- **Finding:** No visual weight distinction for headers
- **Impact:** Hard to scan tables
- **Source:** Redfoot (MEDIUM)
- **Quick win:** 30 minutes

**11. Layout Architecture Chaotic**
- **Finding:** Content positioning inconsistent, static scroll pushes live UI past viewport
- **Impact:** Unreliable display, elements appear/disappear unexpectedly
- **Source:** Cheritto (MAJOR)
- **Files:** `MessageStream.tsx` (fragile), `App.tsx` (layout), `InputPrompt.tsx` (positioning)

**12. Responsive Table Rendering Broken**
- **Finding:** Manual pipe chars break at narrow terminals
- **Impact:** Tables unreadable at <100 cols
- **Source:** Cheritto (HIGH)

**13. Input Prompt Position Inconsistency**
- **Finding:** Only properly bottom-anchored in image 009
- **Impact:** Input box jumps around during session
- **Source:** Cheritto (HIGH)

**14. Border/Separator Inconsistency**
- **Finding:** 3 different components render separators independently
- **Impact:** Visual chaos, no coherent design language
- **Source:** Cheritto (MEDIUM)

**15. Agent Panel Persistence**
- **Finding:** Only visible in image 009, disappears elsewhere
- **Impact:** Users lose context about who's working
- **Source:** Kovash (MEDIUM)

### P3: Future (Post-Alpha Polish)

**16. Fixed Bottom Input Box**
- **Finding:** Input should be squared off at bottom like Copilot/Claude CLI
- **Impact:** Modern CLI feel, more predictable UX
- **Source:** Kovash (FUTURE), Brady (future, not today)

**17. Advanced Terminal Features**
- **Finding:** No alt screen buffer, no advanced cursor management
- **Impact:** Power users expect modern terminal behavior
- **Source:** Cheritto (80% there, needs 1-2 days focused work)

**18. Creative Spinner Content**
- **Finding:** Spinner should show codebase facts, project trivia, vulnerability info, creative gerunds
- **Impact:** Delightful experience during waits
- **Source:** Kovash (suggestions), Brady (codebase facts / creative words)

---

## Requirements

### P0: Alpha Blockers (Must Fix Before Shipping)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| **P0-1** | **Dynamic rotating spinner** | ThinkingIndicator rotates phrases every 3s. App.tsx STOPS overriding with static hints. Never show static text >3s. |
| **P0-2** | **Alpha banner at startup** | First thing user sees: "⚠️ Squad CLI v{version} — Alpha Software — Expect rough edges" |
| **P0-3** | **Blank screen prevention** | NEVER blank for >500ms. Show spinner immediately on any operation >500ms. |
| **P0-4** | **Timeout verification** | Confirm `SQUAD_SESSION_TIMEOUT_MS` env var works, default ≥10 minutes (likely done per Feb 24 history). Test in large repos. |

### P1: High Priority (Ship within first week)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| **P1-1** | **Contrast boost** | All secondary text (time, hints, examples) ≥4.5:1 contrast ratio. Test with browser tools. |
| **P1-2** | **Semantic color system** | Define + document: cyan=info, green=success, yellow=warning, red=error. Apply consistently. |
| **P1-3** | **Copy tightening** | Remove "Routing your message to the team now..." jargon. Shorten version display. Eliminate roster re-display. Max 1-2 lines per status update. |
| **P1-4** | **Information hierarchy** | CTAs bold/colored. Section headers +1 visual weight. Dim non-essential text. |
| **P1-5** | **Whitespace pass** | Add breathing room: blank line before CTAs, after sections, around agent panels. |

### P2: Medium Priority (Next sprint)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| **P2-1** | **Visible separators** | Replace `---` with box-drawing chars (e.g., `─`, `━`). Visible at default terminal contrast. |
| **P2-2** | **Table header styling** | Bold headers, or underline with `─` char, or background color. Clearly distinct from data rows. |
| **P2-3** | **Layout refactor** | MessageStream component: predictable scroll behavior, live UI stays visible, no viewport overflow. |
| **P2-4** | **Input prompt anchoring** | Input box always at bottom, never scrolls off-screen. Consistent across all session states. |
| **P2-5** | **Responsive tables** | Use Ink table component or graceful degradation. Readable at 80+ cols. |
| **P2-6** | **Separator consolidation** | Single separator component/utility. All three border-rendering components use it. |
| **P2-7** | **Agent panel persistence** | Agent panel visible whenever agents are active. Doesn't disappear mid-session. |

### P3: Future (Post-Alpha)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| **P3-1** | **Fixed bottom input** | Input box squared off at bottom (like Copilot/Claude CLI). Requires alt screen buffer work. |
| **P3-2** | **Alt screen buffer** | Use terminal alt screen for cleaner state transitions. Restore on exit. |
| **P3-3** | **Creative spinner phrases** | Rotate through: codebase facts, project stats, fun trivia, security tips. Agent-themed messages. |
| **P3-4** | **Terminal adaptivity** | Graceful degradation 120→80→40 cols. Test across terminal sizes. |

---

## Technical Notes

### Key Implementation Details (from Cheritto's Analysis)

**Components Needing Most Work:**
- `MessageStream.tsx` — fragile scroll logic, static content pushes live UI
- `App.tsx` — layout coordination, overrides ThinkingIndicator rotation (~line 200-220)
- `InputPrompt.tsx` — positioning inconsistency

**Quick Wins:**
- **Dynamic spinner fix:** ~5 lines in App.tsx — remove `activityHint`/`mentionHint` prop passing, let ThinkingIndicator rotate natively
- **Contrast:** ~30 min — adjust chalk color values in theme
- **Separators:** ~15 min — define separator constant, use box-drawing chars
- **Table headers:** ~30 min — add chalk.bold() or underline logic

**Architecture Debt:**
- Layout is 80% there, needs 1-2 days focused work (Cheritto)
- Three separate separator implementations need consolidation
- Ink's layout model fights against predictable bottom-anchored input (alt screen buffer would solve, but that's P3)

### File Paths

- `packages/squad-cli/src/ui/components/ThinkingIndicator.tsx` — has rotation logic, being overridden
- `packages/squad-cli/src/ui/App.tsx` — orchestrates layout, overrides hints
- `packages/squad-cli/src/ui/components/MessageStream.tsx` — scroll/layout issues
- `packages/squad-cli/src/ui/components/InputPrompt.tsx` — positioning
- `packages/squad-cli/src/ui/theme.ts` (likely) — color definitions

---

## Out of Scope

**Explicitly NOT doing:**
1. **Grand redesign** — we're polishing what exists, not rebuilding
2. **Advanced TUI features** — no alt screen buffer, no mouse support (P3 territory)
3. **Comprehensive responsive design** — focus on 80-120 cols, not 40-col edge cases
4. **Marketing copy polish** — functional/clear copy, not delightful prose
5. **Animation system** — no smooth transitions, spinners, or progress bars (beyond basic spinner rotation)
6. **Accessibility audit** — WCAG compliance deferred to separate epic
7. **E2E visual regression tests** — manual QA acceptable for alpha

---

## Success Metrics

**Qualitative:**
- Brady dogfoods Squad CLI in this repo without hitting broken states
- Test user can complete init flow without confusion
- No "is it crashed?" moments during normal use
- Secondary text is readable without squinting

**Quantitative:**
- Zero blank screens >500ms in test sessions
- Secondary text contrast ≥4.5:1 (measured)
- Spinner rotates every 3s (timing verified)
- Timeout works in repos with >5min operations

**Gate:** Brady approval. If Brady says "this doesn't embarrass us," we ship.

---

## Issue Breakdown

| # | Issue Title | Priority | Assignee | Description |
|---|-------------|----------|----------|-------------|
| 1 | Fix ThinkingIndicator rotation in App.tsx | P0 | Cheritto | Remove `activityHint`/`mentionHint` props from App.tsx, let ThinkingIndicator rotate natively. ~5 lines changed. |
| 2 | Add alpha software banner at startup | P0 | Kovash | Show "⚠️ Squad CLI v{version} — Alpha Software" as first output in shell. |
| 3 | Prevent blank screens >500ms | P0 | Cheritto | Add immediate spinner on any operation that might take >500ms. Audit all loading states. |
| 4 | Verify timeout env var in large repos | P0 | Fenster | Test `SQUAD_SESSION_TIMEOUT_MS` with default ≥10 min. Dogfood in squad-pr repo. |
| 5 | Bump contrast on secondary text | P1 | Redfoot | Adjust chalk colors for hints/times/examples to ≥4.5:1 contrast. Update theme.ts. |
| 6 | Define semantic color system | P1 | Redfoot | Document + implement: cyan=info, green=success, yellow=warning, red=error. |
| 7 | Tighten verbose copy | P1 | Marquez | Remove "Routing your message..." jargon, shorten version, eliminate roster re-display. Review only. |
| 8 | Implement copy tightening | P1 | Kovash | Apply Marquez's copy edits to shell output. Max 1-2 lines per status. |
| 9 | Add information hierarchy | P1 | Cheritto | Bold CTAs, increase header weight, dim non-essential text. |
| 10 | Whitespace breathing room | P1 | Cheritto | Add blank lines before CTAs, after sections, around agent panels. |
| 11 | Replace `---` with box-drawing chars | P2 | Cheritto | Use `─` or `━` for separators. Single source of truth. |
| 12 | Add table header styling | P2 | Cheritto | Bold headers or underline with box chars. Clearly distinct from data. |
| 13 | Refactor MessageStream layout | P2 | Cheritto | Fix scroll behavior, keep live UI visible, prevent viewport overflow. |
| 14 | Fix input prompt anchoring | P2 | Cheritto | Input always at bottom, never scrolls off. Consistent across states. |
| 15 | Implement responsive tables | P2 | Cheritto | Use Ink table component or graceful degradation. Readable at 80+ cols. |
| 16 | Consolidate separator rendering | P2 | Cheritto | Single separator component/utility. Replace 3 independent implementations. |
| 17 | Make agent panel persistent | P2 | Kovash | Agent panel visible whenever agents active. Doesn't disappear mid-session. |
| 18 | Design fixed bottom input (P3) | P3 | Cheritto | Spec out alt screen buffer + fixed input box like Copilot/Claude CLI. |
| 19 | Implement creative spinner phrases | P3 | Kovash | Rotate codebase facts, project stats, security tips. Agent-themed messages. |
| 20 | Terminal adaptivity 120→80→40 cols | P3 | Cheritto | Graceful degradation across terminal sizes. Test suite for responsive layout. |

**Routing Notes:**
- **Cheritto (TUI):** Owns 11/20 issues — all Ink layout, rendering, component work
- **Kovash (REPL/Shell):** Owns 4/20 issues — shell output, alpha banner, agent panel, creative phrases
- **Redfoot (Design):** Owns 2/20 issues — color system, contrast
- **Marquez (UX):** Owns 1/20 issue — copy review (reviewer, not implementer)
- **Fenster (Core):** Owns 1/20 issue — timeout config verification
- **P3 issues:** Defer to post-alpha, no immediate assignment

---

## Next Steps

1. **Keaton:** File 20 GitHub issues from breakdown table (labels: `squad:cheritto` / `squad:kovash` / `squad:redfoot` / `squad:fenster`, priority: `P0` / `P1` / `P2` / `P3`, milestone: `Alpha Release`)
2. **Brady:** Review PRD, approve or request changes
3. **Cheritto + Kovash:** Pair on P0 issues 1-3 (critical path, ~1 day)
4. **Redfoot:** P1 contrast + color system (~1 day)
5. **Marquez:** Review copy tightening PR before merge
6. **Team:** Daily standup — P0→P1→P2 sequence, no P3 work until P0/P1 done
7. **Brady:** Final dogfood session after P0+P1 complete

**Estimated Timeline:**
- P0 (alpha blockers): 1-2 days
- P1 (high priority): 2-3 days
- P2 (medium): 1 week
- **Alpha ship target:** P0+P1 complete, P2 in progress

---

**End of PRD**
