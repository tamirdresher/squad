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

## 2026-06-04 — PR #1200: Fix `squad upgrade --state-backend` (UPGRADE-FLAG-IGNORED)

**Status:** COMPLETE — pushed to `tamirdresher/squad` branch `squad/state-backend-upgrade-fixes`

**Problem:** `squad upgrade --state-backend two-layer` silently dropped the flag and never wrote `stateBackend` to `.squad/config.json`.

**Root cause:** `runUpgrade()` was backend-agnostic; the CLI entry never called `migrateStateBackend`.

**Fix (commit e010b161):** `cli-entry.ts` calls `migrateStateBackend(dest, upgradeStateBackend)` after `runUpgrade` when `--state-backend` is supplied. `migrateStateBackend` JSON-merges `stateBackend` into config.json and installs git hooks.

**Test work (commit bc5e81ee):** All 4 regression tests in `test/upgrade-state-backend.test.ts` were timing out at the default 5 s Vitest limit because git plumbing ops (orphan branch, hook installation) take > 5 s. Added `{ timeout: 30_000 }` to all tests and added a 5th test (`UPGRADE-FLAG-IGNORED (clean target)`) covering the case where config.json has **no** `stateBackend` field at all — the original bug scenario.

**Architectural decision:** `stateBackend` migration is deliberately split from `runUpgrade()` to keep the upgrade operation backend-agnostic. This is locked pattern for all future upgrade work.

---

**Last Updated:** 2026-06-04T22:00:00Z  
**Archive:** `.squad/agents/picard/history-archive.md` (2026-06-02 decisions and learnings)
