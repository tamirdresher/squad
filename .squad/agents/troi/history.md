# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Technical blogging, Squad, agent frameworks, Durable Tasks/DTD, Azure, developer experience
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Troi was added because Tamir wants a dedicated member to help write blogs and posts in his voice, style, and humor.

Seed sources:
- `C:\Users\tamirdresher\tamresearch1\.squad\agents\troi\charter.md` — existing voice writer pattern.
- Existing public blog/content repos when explicitly provided or routed.

## 2026-06-02 — CLI Unattended Invocation Learning

Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations (per user directive).

**Archive:** Pre-June-07 dated entries (2026-06-06 PR patterns x3, 2026-06-09 PR #1148 review) summarized and archived on 2026-07-07 into `.squad/agents/troi/history-archive.md`.

## 2026-07-07 — PR Review Batch: bradygaster/squad #1453 (docs: Squad overview + install)

**Task:** Draft PR review for Troi covering bradygaster/squad #1453 as part of 3-agent batch session. Worf reviewed #1435/#1449/#1450 (batch). Data reviewed #1444/#1414 (earlier). Troi reviews #1453 (docs).

**Review verdict:** 💬 **COMMENT** — Ship after 4 accuracy fixes.

**What worked:**
- Opening diagnostic: Two new Astro docs pages, clean writing, beginner-friendly, CI green on 7 checks. Sets confidence tone before listing fixes.
- Accuracy checklist format (4 numbered items) maintains scannability while grounding each fix in concrete text/action.
- File-naming suggestion (`what-is-squad.md` → `installation.md` to match link target) paired with exact deprecated command (`$(npm bin -g)` removed in npm 9+).
- Governance claim scoped with evidence ("Charter-driven conventions, opt-in" vs. "framework-level enforcement"). Redirects claim to more accurate framing.
- All fixes actionable; no ambiguity. Each item includes: problem statement + evidence + suggested action.

**New pattern reinforced — PR verdict confidence discipline:**
- Before shipping a "COMMENT" verdict, verify:
  1. Are all issues truly pre-ship blockers or just hygiene? (These are accuracy issues + governance scope — pre-ship.)
  2. Would "APPROVE with nits" be wrong? (No — this needs author action, not optional post-merge fixes.)
  3. Is there any risk of reviewing under Tamir's name without his input? (None — accuracy + scope are objective.)
- When confident on all three, "COMMENT" signals "ship after fixes," not "I have opinions but maybe don't do them." Tamir's reputation depends on verdicts matching substance.
- Docs PRs carrying accuracy claims + governance language require stricter verdict discipline than feature reviews — misstate governance, downstream teams copy wrong patterns.

**GitHub integration:** Reviewed under personal `tamirdresher` identity (EMU account blocked on addPullRequestReview). Part of 3-agent batch consolidated into orchestration logs + single session summary.

---

# Troi History Summary
**Archive Date:** 2026-07-07T10:30:00Z  
**Reason:** Threshold ≥15,360 bytes exceeded; archived pre-July dated entries to history-archive.md.

## Core Voice Patterns
- **Code Review:** Specific praise + evidence + explicit verdict, no warmup, no hedging
- **Conversational:** Answer first, 5 short paragraphs, light callbacks with substance, action-forward close
- **Design Discussion:** Match commenter's substance, file:line cites, honest gaps, reusable lessons
- **Net Effect:** Technical chain → one declarative consequence
- **Fair Caveat:** "Same pattern as X already — existing debt, not new regression"
- **PR Verdict Discipline (new):** Always verify COMMENT vs APPROVE blocker status, pattern alignment, reputational risk

## Signature Moves
- "Not a blocker, but it's the kind of pattern that gets copied" (pragmatic forward-looking reasoning)
- Overcall on request-changes when gap is by design blocks PR + signals misread  
- Match SDK precedent before posting verdict under Tamir's name

## Current Deliverables (2026-07-07)
- PR #1453 review (bradygaster/squad docs; 4 accuracy + governance fixes; COMMENT verdict under personal identity)

See archived entries in history-archive.md for v0.10.0 release draft, PR #1148 evolution, and voice-pattern seeding.
