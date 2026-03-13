📌 Team update (2026-03-07T17:35:45Z): Issue #249 — squad init --sdk flag implemented. Default init now markdown-only (no config file). Optional --sdk generates typed squad.config.ts with defineSquad() builders. Backward compatible. Coordinates with #250 migrate and #255 skills. — decided by Fenster

📌 Team update (2026-03-07T16:25:00Z): Actions → CLI migration strategy finalized. 4-agent consensus: migrate 5 squad-specific workflows (12 min/mo) to CLI commands. Keep 9 CI/release workflows (215 min/mo, load-bearing). Zero-risk migration. v0.8.22 quick wins identified: squad labels sync + squad labels enforce. Phased rollout: v0.8.22 (deprecation + CLI) → v0.9.0 (remove workflows) → v0.9.x (opt-in automation). Brady's portability insight captured: CLI-first means Squad runs anywhere (containers, Codespaces). Customer communication strategy: "Zero surprise automation" as competitive differentiator. Decisions merged. — coordinated by Scribe

📌 Team update (2026-03-07T05:56:56Z): Test suite assessment complete — 8 CLI commands untested (high-risk for next-wave bugs #237, #236). 30+ error-handling tests missing. Recommend 12-14 hrs QA work before feature wave. Adopted CLI wiring regression test pattern from PR #238 permanently. — decided by Hockney
📌 Team update (2026-03-05T22:46:00Z): Azure Function samples require \main\ field and build step — decided by Fenster
# Project Context

- **Owner:** Brady
- **Project:** squad-sdk — the programmable multi-agent runtime for GitHub Copilot (v1 replatform)
- **Stack:** TypeScript (strict mode, ESM-only), Node.js ≥20, @github/copilot-sdk, Vitest, esbuild
- **Created:** 2026-02-21

---

## Core Context

**Created:** 2026-02-21  
**Role:** Core Developer — Runtime implementation, CLI structure, shell infrastructure  
**Key Decisions Owned:** Test import patterns (vitest via dist/), CRLF normalization at parser entry, shell module structure (readline→ink progression), spawn lifecycle, SessionRegistry design

**Phase 1-2 Complete (2026-02-21 → 2026-02-22T041800Z):**
- M3 Resolution (#210/#211): `resolveSquad()` + `resolveGlobalSquadPath()` in src/resolution.ts, standalone concerns (no auto-fallback)
- CLI: --global flag routing, `squad status` command composition, command rename finalized (triage, loop, hire)
- Shell foundation: readline-based CLI shell, SessionRegistry (Map-backed, no persistence), spawn infrastructure (loadAgentCharter, buildAgentPrompt, spawnAgent)
- CRLF hardening: normalize-eol.ts applied to 8 parsers, one-line guard at entry point
- SDK/CLI split executed: 15 dirs + 4 files migrated to packages/, exports map updated (7→18 subpaths SDK, 14 subpaths CLI), 6 config files fixed, versions aligned to 0.8.0
- Test import migration: 56 test files migrated from ../src/ to @bradygaster/squad-sdk/* and @bradygaster/squad-cli/*, 26 SDK + 16 CLI subpath exports, vitest resolves via dist/, all 1719+ tests passing

### 📌 Team update (2026-02-22T10:03Z): PR #300 architecture review completed — REQUEST CHANGES verdict with 4 blockers (proposal doc, type safety on castingPolicy, missing sanitization, ambiguous .ai-team/ fallback) — decided by Keaton
- Zero-dependency scaffolding preserved, strict mode enforced, build clean (tsc 0 errors)

**Phase 3 Blocking (2026-02-22 onwards):**
- Ralph start(): EventBus subscription + health checks (14 TODOs)
- Coordinator initialize()/route(): CopilotClient wiring + agent manager (13 TODOs)
- Agents spawn(): SDK session creation + history injection (14 TODOs)
- Shell UI: Ink components not yet wired (readline only), streaming responses, agent status display
- Casting: registry.json parsing stub (1 TODO)
- Triage/Loop/Hire: placeholder commands (low priority, defer)

## Learnings
- Any dependency that is functionally optional (telemetry, observability) must be loaded lazily with try/catch, even if listed in dependencies. Users installing via npx have unpredictable dependency trees.
- The createRequire() pattern for lazy sync loading is already established in otel.ts (for package.json resolution). Reuse it for all optional deps.
- When 9+ files import from the same optional package, a centralized wrapper module (otel-api.ts) is the right pattern. Single point of fallback logic, consumers don't need to know about optionality.

## 2026-03-07: CLI Feasibility Assessment — Actions → CLI Commands (Issue request from Brady)

**Task:** Analyze feasibility of migrating squad-specific GitHub Actions workflows to CLI commands. Brady wants to move from workflow-heavy automation to CLI-first tooling.

**Analysis scope:** 5 workflows (sync-squad-labels.yml, squad-triage.yml, squad-issue-assign.yml, squad-heartbeat.yml, squad-label-enforce.yml).

**Key findings:**

1. **squad watch already exists** — It's the local equivalent of heartbeat + triage workflows. Triages issues, monitors PRs, uses shared `@bradygaster/squad-sdk/ralph/triage` logic. Missing: comment posting (4-6 hour gap).

2. **Quick wins (4-7 hours total, v0.8.22):**
   - `squad labels sync` — 2-3 hours. Reuses `parseRoster()`, just needs `gh label create/edit` loop.
   - `squad labels enforce` — 2-4 hours. Pure label manipulation logic + `gh` CLI calls.

3. **Medium effort (4-6 hours, v0.8.23):**
   - Enhance `squad watch` with comment posting — add `gh issue comment` wrapper to `gh-cli.ts`, call from triage cycle.

4. **Do NOT migrate:**
   - Copilot auto-assign (issue-assign.yml + heartbeat copilot step) — Requires PAT + `agent_assignment` API not exposed in `gh` CLI. Violates zero-dependency goal. Keep as workflow-only feature.

5. **Infrastructure already exists:**
   - `gh-cli.ts` — thin wrapper around `gh` CLI (ghIssueList, ghIssueEdit, ghPrList, ghAvailable, ghAuthenticated)
   - `@bradygaster/squad-sdk/ralph/triage` — shared triage logic used by both watch.ts and ralph-triage.js (workflow script)
   - `watch.ts` — 356 lines, full triage + PR monitoring

**Recommendation:** Ship labels commands (sync + enforce) in v0.8.22 (4-7 hours). Enhance watch with comments in v0.8.23 (4-6 hours). Document copilot auto-assign as workflow-only (PAT-dependent).

**Written to:** `.squad/decisions/inbox/fenster-cli-feasibility.md`

## Learnings

- `squad watch` is already the local heartbeat — it implements 80% of heartbeat.yml + triage.yml functionality (triage logic, PR monitoring, polling loop). Only missing comment posting.
- The copilot-swe-agent[bot] assignment API (`agent_assignment` field in POST /repos/{owner}/{repo}/issues/{issue_number}/assignees`) is GitHub-specific and not exposed in `gh` CLI. Requires PAT + Octokit or raw HTTPS. CLI commands should not manage PATs — that's a workflow concern with secure secret storage.
- Label sync/enforce are low-hanging fruit — no parsing complexity (roster already implemented), idempotent operations, thin wrappers around `gh` CLI.
- The ralph-triage.js script in workflows is a CJS port of the SDK's triage.ts — both use the same logic. This enables parity between Actions (ralph-triage.js) and CLI (watch.ts importing sdk/ralph/triage). Any triage logic changes must sync to both.
- Quick wins for CLI migration: look for workflows that don't need PATs or bot-specific APIs. Label operations, triage decisions, PR state checks — all available via `gh` CLI.

---

## Issue #249: \squad init --sdk\ Flag Implementation (2026-03-07)

**Requested by:** Brady. Add \--sdk\ flag to \squad init\ to optionally generate SDK builder syntax config.

**Implementation:**
- Modified 3 files:
  1. \packages/squad-cli/src/cli-entry.ts\: Added \--sdk\ flag parsing, updated help text
  2. \packages/squad-cli/src/cli/core/init.ts\: Added \sdk?: boolean\ to \RunInitOptions\, passed through as \configFormat\
  3. \packages/squad-sdk/src/config/init.ts\: Extended \configFormat\ type to \'typescript' | 'json' | 'sdk' | 'markdown'\, added \generateSDKBuilderConfig()\, updated config generation logic

**Behavior:**
- **Default** (\squad init\): \configFormat: 'markdown'\ — NO config file generated, only .squad/ directory structure
- **With --sdk** (\squad init --sdk\): \configFormat: 'sdk'\ — generates squad.config.ts using \defineSquad()\, \defineTeam()\, \defineAgent()\ builders from \@bradygaster/squad-sdk\
- **Backward compatible**: \'typescript'\ and \'json'\ formats still work exactly as before

**SDK Builder Format Generated:**
\\\	ypescript
import { defineSquad, defineTeam, defineAgent } from '@bradygaster/squad-sdk';

const scribe = defineAgent({
  name: 'scribe',
  role: 'scribe',
  description: 'Scribe',
  status: 'active',
});

export default defineSquad({
  version: '1.0.0',
  team: defineTeam({
    name: 'project-name',
    members: ['scribe'],
  }),
  agents: [scribe],
});
\\\

**Testing:**
- Manual tests passed: \squad init\ creates no config, \squad init --sdk\ creates SDK builder format
- \
pm run build\: clean (TypeScript 0 errors)
- \
pm test\: 3768 tests passed (2 pre-existing failures unrelated to changes)
- Init tests specifically passed

## Learnings

- **Init flag pattern**: Parse flags with \rgs.includes('--flag')\ in cli-entry.ts, pass through to command handlers as boolean options
- **Config generation branching**: When adding new config formats, use discriminated logic: check format type, skip file generation entirely for markdown-only, choose generator function for others
- **SDK builder format**: Uses the NEW \defineSquad()\ / \defineTeam()\ / \defineAgent()\ syntax from the project's own squad.config.ts, NOT the old \SquadConfig\ type
- **Backward compatibility preservation**: Old formats (\'typescript'\, \'json'\) must remain unchanged — extend type union, add new branches, never modify existing behavior
- **configPath handling**: When no config file is generated (markdown mode), set \configPath = ''\ in result object to avoid confusion
- **Help text location**: cli-entry.ts line ~97 for init command help, update with new flags in the format \Flags: --sdk (description)\
- **Key files for init flow**: cli-entry.ts (routing) → cli/core/init.ts (options assembly) → squad-sdk/config/init.ts (file generation)
- **Migration context**: This is NOT about migrate.ts (Edie's domain) — it's about NEW squad creation, not converting existing squads


📌 Team update (2026-03-07T21:06:29Z): Team restructure — Kobayashi retired, Trejo (Release Manager) + Drucker (CI/CD Engineer) hired. Separation of concerns: Trejo WHAT/WHEN, Drucker HOW. 10 decisions merged. 4-0 REPLACE vote. — Scribe
