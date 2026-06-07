# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI architecture, routing invariants, extensibility design, API surface decisions
- **Created:** 2026-06-02T10:30:00Z

## Picard — Core Mission

Picard (Lead Architect) owns product architecture decisions, extension-point evaluation, routing invariant protection, and implementation readiness gates. Architecture reviewer for Squad.Agents.AI auth expansion.

## 2026-06-03 — Docs-Must-Match-Implementation Directive (Code-First Priority)

**Status:** LOCKED for all future PR work

Critical behavioral directive from Copilot: Implementation drives documentation; if code and docs conflict, fix code first, never revert code to match outdated docs. Applied to PR #1200 and all future Squad.Agents.AI work. Picard must enforce this as architectural law.

---

## 2026-06-04 — PR #1200 Work Summary

### Completed Tasks

1. **Review Verdict** — Triaged all 9 concerns from PR #1200 review comment 4621356216. Verdict: SHIP-WITH-FOLLOWUP (block on concern G CI YAML until cheap fix applied).

2. **Concern G Fix** — Reverted .github/workflows/squad-ci.yml to merge-base, re-applied 6 semantic lines. Added .gitattributes entry *.yml text eol=lf. Commit: 19b4f83.

3. **PR Body + Follow-up Issue Draft** — Drafted accurate PR body with test counts and follow-up issue scope covering concerns A, I, E, F, C-residual, D-residual.

### Status

- ✅ Verdict delivered
- ✅ Concern G fixed and ready
- ✅ PR body and follow-up drafts ready for coordinator
- �� Follow-up issue: #1211 filed and linked

---

## Archived Work

All detailed decision records from prior sprints have been archived to .squad/agents/picard/history-archive/before-2026-06-04.md. This file was summarized on 2026-06-04T11:50:00Z to maintain the 15KB hard gate on history.md.

## 2026-06-06 — Jon Lester Review Suggestions Triage (PR #1192)

**Task:** Evaluate two suggestions from Jon Lester's review on PR #1192 (permission-kind contract fix).

**Verdict:**
1. **Skip approveAll re-export** — Single SDK consumer, shim (commit `55e843c0`) already covers failure mode, would encourage bad auto-approval pattern in production SDKs.
2. **FILE protocolVersion warning** — HIGH diagnostic value in silent-failure scenarios (headless CI). Tight scope: `SUPPORTED_PROTOCOL_VERSION_MAX` const, warn-only at session start, never throw.

**Key Insight:** Test rigor + architecture clarity prevent follow-up work. One suggestion fails cost-benefit (no value beyond existing shim); the other solves a real triage friction point in fleet/CI scenarios.

## Learnings

### Active Learnings (2026-06-06)

**Convenience re-exports & SDK API surface discipline:** A convenience re-export from public SDK package must clear "two real consumers" bar. One internal CLI file does not justify API surface. Backward-compat shims change the calculus — when a shim already covers the failure mode, the convenience export has no safety benefit.

**Diagnostic signals in headless/fleet:** Even low-priority warnings are worth doing (cost: ~5 lines) when they dramatically speed diagnosis in fleet/CI scenarios where silent failure is worst outcome. `protocolVersion > KNOWN_MAX` warning at session start provides "check SDK compatibility" as obvious first troubleshooting step.

### Archived Learnings

Detailed learnings from 2026-06-04 to 2026-06-05 research and execution (PR #1200 integration, release process 3-branch model, Phase 0 sync main→dev, SDK API -> CLI -> Ralph -> workflow tiers) have been archived to:
- `.squad/agents/picard/history-archive-2026-06-04-to-06-05.md` (2026-06-06T14:08:46Z)

This file was condensed on 2026-06-06 to maintain the 15KB hard gate on history.md.

---

## 2026-06-07 — v0.10.0 Release in Flight (Scribe Notification)

**Context:** Coordinator dispatched preflight agents (Data, Worf, Troi) for full upstream bradygaster/squad v0.10.0 release audit.

**Lead status:** Release cleared for Phase 2 (actual execution). Three pre-release blockers identified; four non-blocking warnings with mitigations attached. Tamir awaiting sign-off and must pre-stage npm/gh auth switches before trigger. Monitor Phase 2 dispatch for real-time coordination. Logs at `.squad/orchestration-log/2026-06-07T053651Z-{data,worf,troi}.md` and `.squad/log/2026-06-07T053651Z-release-preflight.md`.

