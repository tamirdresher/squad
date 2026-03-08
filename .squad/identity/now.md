---
updated_at: 2026-03-08T00:00:00Z
focus_area: Post-v0.8.24 Stabilization
version: v0.8.24
branch: main
tests_passing: 3931
tests_todo: 46
tests_skipped: 5
test_files: 149
team_size: 19 active agents + Scribe + Ralph + @copilot
team_identity: Apollo 13 / NASA Mission Control
process: All work through PRs. Branch naming squad/{issue-number}-{slug}. Never commit to main directly.
---

# What We're Focused On

**Status:** v0.8.24 shipped to npm. Build clean (0 errors). Tests stable (3,931 passing, ~89s runtime). One pre-existing test failure in aspire-integration.test.ts (requires Docker). Post-release stabilization in progress. External contributor Tamir shipping major features across multiple branches.

## Current State

**Version:** v0.8.24 (released, on npm)
- **Packages:** @bradygaster/squad-sdk, @bradygaster/squad-cli
- **Branch:** main
- **Build:** ✅ clean (0 errors)
- **Tests:** 3,931 passed, 46 todo, 5 skipped, 149 test files (~89s)
  - Only failure: aspire-integration.test.ts (needs Docker, pre-existing)

**Stack:**
- TypeScript (strict mode, ESM-only)
- Node.js ≥20
- @github/copilot-sdk
- Vitest (test runner)
- esbuild (bundler)

**Team:** Apollo 13 / NASA Mission Control
- 19 active agents (Flight, FIDO, GNC, RETRO, CONTROL, PAO, Network, Booster, SURGEON, TELMU, EECOM, GUIDO, CAPCOM, FAO, INCO, Procedures, FLIGHT_DYNAMICS, Experiments, Trajectory)
- Scribe (orchestration historian)
- Ralph (autonomous triage watchdog)
- @copilot (coding agent)

## Recent Major Features (v0.8.24)

- **Azure DevOps platform adapter** — Full enterprise support for ADO alongside GitHub
- **CommunicationAdapter** — Platform-agnostic agent-human communication abstraction
- **SubSquads** — Renamed from workstreams, clearer mental model for nested teams
- **Secret guardrails** — Hook-based enforcement (zero-worry guarantee)
- **ESM runtime patch** — Node 24+ compatibility fix
- **Contributors Guide page** — Recognition and onboarding for external contributors
- **Team rebirth** — The Usual Suspects → Apollo 13 / NASA Mission Control

## Active Work in Progress (Tamir's Branches)

- **`remote-control`** — PTY mirror + devtunnel for phone access (36 commits, security-hardened)
- **`hierarchical-squad-inheritance`** — Upstream inheritance for inherited squads (6 commits)
- **`ralph-watch`** — Persistent local watchdog polling (5 commits)
- **`project-type-detection`** — Non-npm project support (2 commits)
- **`prevent-git-checkout-data-loss`** — Safety guard for branch switches (2 commits)

## Key Recent Fixes (Post v0.8.24)

- Wired `upstream` + `watch`/`triage` commands in cli-entry.ts (recurring unwired command bug)
- Made tests name-agnostic (resilient to team rebirths)
- Dynamic blog discovery in docs-build tests (no longer hardcoded)
- Cleared KNOWN_UNWIRED set (all commands now wired)

## Process

All work through PRs. Branch naming: `squad/{issue-number}-{slug}`. Never commit to main directly. Squad member review before merge.
