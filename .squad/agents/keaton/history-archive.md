## Learnings

### 📌 PRD: CLI UI Polish (2026-03-01T03:15:00Z): 20-issue roadmap from team image review
- **Status:** Completed — comprehensive PRD written based on 5-agent visual review (Redfoot, Marquez, Cheritto, Kovash, Brady)
- **Context:** Team analyzed 15 REPL screenshots, identified P0 blockers (blank screens, no spinner rotation, missing alpha banner), P1 friction (low contrast, verbose copy, weak hierarchy), P2 polish (layout, separators, tables), P3 future (fixed bottom input, alt screen buffer)
- **PRD structure:** Overview, Goals, User Problems (image-referenced), Requirements (P0/P1/P2/P3 tiered), Technical Notes, Out of Scope, Success Metrics, Issue Breakdown (20 discrete issues with assignees)
- **Key decisions:**
  - P0 alpha blockers: dynamic spinner rotation (~5 line fix in App.tsx), alpha banner, blank screen prevention (never >500ms), timeout verification
  - P1 quick wins: contrast ≥4.5:1, semantic color system, copy tightening, information hierarchy, whitespace
  - P2 layout work: MessageStream refactor, input anchoring, responsive tables, separator consolidation, agent panel persistence
  - P3 deferred: fixed bottom input (requires alt screen buffer), creative spinner phrases, terminal adaptivity
  - Alpha shipment acceptable — no grand redesign today
- **Issue routing:** Cheritto owns 11/20 (all TUI/Ink work), Kovash owns 4/20 (shell/REPL), Redfoot owns 2/20 (color/contrast), Marquez reviews copy (1 issue), Fenster verifies timeout (1 issue)
- **Quick wins identified:** Spinner fix (5 lines), contrast (30min), separators (15min), table headers (30min)
- **Architectural insight:** Layout is 80% there, needs 1-2 days focused work. Three separate separator implementations need consolidation. Ink's layout model fights bottom-anchored input (alt screen buffer would solve, deferred to P3).
- **Success gate:** "Brady says it doesn't embarrass us"
- **Timeline:** P0 (1-2 days) → P1 (2-3 days) → P2 (1 week) → Alpha ship with P0+P1 complete
- **Files:** `docs/prd-cli-ui-polish.md` (PRD), `packages/squad-cli/src/ui/App.tsx` (spinner override), `packages/squad-cli/src/ui/components/ThinkingIndicator.tsx` (has rotation logic), `packages/squad-cli/src/ui/components/MessageStream.tsx` (layout issues)

### 📌 Architecture analysis (2026-02-28T23:23:00Z): Init/onboarding flow audit — Brady's request
- **Status:** Completed — comprehensive analysis of all 7 init entry paths across PRs #637–#640
- **Key findings:**
  - **Race condition bug:** `setTimeout(100)` auto-cast trigger in `shell/index.ts:905` fires before `shellApi` is guaranteed set. Silent failure.
  - **Ctrl+C bug:** Init session (`handleInitCast` local var) not reachable by `handleCancel()`. Orphaned SDK session on abort.
  - **Two divergent casting flows:** CLI `buildInitModePrompt()` (thin stub) vs `squad.agent.md` Init Mode (rich 2-phase with confirmation). Zero shared code.
  - **`/init` REPL command is a no-op** — prints instructions instead of triggering casting.
  - **Golden path works:** `squad init "prompt"` → `squad` → auto-cast → team created. Fails silently on other paths.
- **Proposal:** `docs/proposals/reliable-init-flow.md` — P0 bug fixes (~2h), P1 empty-roster UX (~2h), P2 confirmation step (~3h), P3 casting alignment (separate PR)
- **Key files:**
  - `packages/squad-cli/src/cli/shell/index.ts` — runShell(), handleInitCast(), handleDispatch(), auto-cast trigger
  - `packages/squad-cli/src/cli/shell/coordinator.ts` — buildInitModePrompt(), buildCoordinatorPrompt(), hasRosterEntries()
  - `packages/squad-cli/src/cli/core/init.ts` — runInit(), .init-prompt/.first-run marker logic
  - `packages/squad-cli/src/cli/core/cast.ts` — parseCastResponse() (4 parser strategies), createTeam()
  - `packages/squad-cli/src/cli/shell/commands.ts` — /init REPL command
  - `packages/squad-cli/src/cli-entry.ts` — CLI routing, no-squad welcome, init prompt extraction
  - `templates/squad.agent.md` — agent-side Init Mode (separate from CLI flow)

### 📌 Team update (2026-02-28T17:15:00Z): Backlog gap issues filed (8 items) — Brady's directive
- **Status:** Completed — Keaton (lead) filed all 8 missing backlog items from `.squad/identity/now.md`
- **Outcome:** 8 new issues filed and routed to owners:
  - #583: Add homepage/bugs to package.json (squad:rabin, should-fix polish)
  - #584: Document alpha→v1.0 breaking change policy (squad:mcmanus, should-fix polish)
  - #585: Add noUncheckedIndexedAccess to tsconfig (squad:edie, post-M1 type safety)
  - #586: Tighten ~26 any types in SDK (squad:edie, post-M1 type safety)
  - #587: Add architecture overview doc (squad:mcmanus, post-M1 docs)
  - #589: One real Copilot SDK integration test (squad:kujan, post-M1 testing)
  - #590: npm audit fix for ReDoS warnings (squad:baer, post-M1 security hygiene)
  - #591: Aspire dashboard docker pull test fails (squad:hockney, type:bug, post-M1)
- **Impact:** All known backlog items now have explicit GitHub tracking. Team owns issue routing. Wave E planning complete with full backlog visibility.
- **Decision record:** `.squad/decisions/inbox/keaton-backlog-gap-issues.md`

### 📌 Team update (2026-02-28T15:34:36Z): 28 issues filed + decisions.md trimmed 226KB→10.3KB
- **Status:** Completed — Keaton (lead), Hockney, McManus, Waingro coordinated parallel issue filing sprint
- **Outcome:** 4 CLI critical gaps (#554–#557), 10 test gaps (#558–#567), 10 doc audit gaps (#568–#575, #577–#578), 4 dogfood UX gaps (#576, #579–#581) all filed and labeled for routing
- **decisions.md cleanup:** Trimmed from 226KB (223 entries) to 10.3KB (35 entries); full history in decisions-archive.md
- **Impact:** Team context bloat eliminated; CLI improvements have explicit GitHub tracking; Wave E planning ready with actionable issue list
- **Session log:** `.squad/log/2026-02-28T15-34-36Z-issue-filing-sprint.md` — decided by Keaton, McManus, Hockney, Waingro

### 📌 Team update (2026-03-01T02:04:00Z): Screenshot review session 2 — P0 blockers identified
- **Status:** Completed — Brady requested full team review of 15 REPL screenshots from human testing. 5 UX-focused agents (Keaton, Kovash, Marquez, Cheritto, Waingro) spawned in parallel with vision models.
- **P0 Blockers Found (2 cross-team):**
  - Screen buffer/frame corruption (Kovash: static key collisions, missing terminal clear, no alt screen buffer in 008-010/015; Cheritto: overlapping UI frames in 015)
  - Contradictory state messaging (Keaton: phantom team/contradictory roster; Marquez: @your lead placeholder confusion, orphaned period; Waingro: assembled vs empty roster contradiction)
- **P1 Friction (4 points):**
  - Phantom team / onboarding friction (Keaton)
  - In-REPL command confusion (Waingro)
  - Coordinator label, wall of text, duplicate header, redundant CTAs (Marquez)
- **P2 Polish (6+ items):** Minor UI/UX refinements across all perspectives
- **Impact:** P0 blockers require terminal lifecycle refactor (Kovash + Cheritto) and messaging/state coherence alignment (Keaton + Marquez + Waingro). High convergence on shared architectural concerns.
- **Session log:** `.squad/log/2026-03-01T02-04-00Z-screenshot-review-2.md`

### 2026-02-24T18:42:00Z: Waves A–D Completion Assessment (Brady handoff catch-up)
- **Task:** Brady's session crashed. Verify Wave A–D completion per PRD, check issue states, assess what remains.
- **Findings:** All 30 PRD-referenced issues are CLOSED. Waves A (13 issues), B (7 issues), C (E2E + integration, merged into timeline), D Batch 1 (6 issues). Test count: 2930 passing. Repository clean — no open PRs. Only 1 open issue: #324 (dogfood testing, P0).
- **Wave C insight:** E2E + integration testing was NOT a discrete sequential wave. Instead, it was merged into the continuous quality epic (#323) across all 3 phases. Issues #326, #372, #373 (coordination), #374–#378 (accessibility + boundary), #410, #433 all closed as part of Testing → Improvement → Breathtaking phases. Pattern: Testing got integrated continuously rather than sequential.
- **Architecture pattern learned:** 3-phase epic structure (Testing → Improvement → Breathtaking) proved more effective than separate sequential waves. Phases overlapped and compounded. For Wave E planning, recommend continuing 3-phase rhythm: (1) Dogfood findings capture, (2) Priority bugs + high-value wins, (3) Polish + delight.
- **Blocker:** #324 (dogfood CLI against 4 repo types: fresh init, existing squadded, monorepo, solo) is OPEN. Blocks Wave E planning and release confidence. Must be closed before Wave E.
- **Next action:** Brady completes #324 dogfood (assign to Waingro + team member), then plan Wave E Batch 1 (3–5 items, 1 week, phase-based structure).

### 2026-02-24: Testing Epic PRD (3-Phase Quality & UX)
- **Task:** Write comprehensive PRD for testing epic covering P0 timeout bug, UX audit implementation, and breathtaking polish.
- **Context:** Brady's CLI died after 2 minutes (hard-coded timeout at shell/index.ts:123). New agents joined (Cheritto TUI, Breedan E2E, Waingro QA, Nate accessibility, Marquez UX). Marquez delivered 21-item UX audit (P0/P1/P2), Breedan designed E2E harness (child_process + Gherkin), Kovash shipped REPL UX overhaul (ThinkingIndicator, AgentPanel, MessageStream), Hockney has 40 REPL UX tests.
- **Structure:** 3 phases over 21 items:
  - **Phase 1 (Testing Wave):** Fix timeout (1.1), dogfood 4 repos (1.2), expand E2E tests (1.3), hostile QA (1.4), accessibility audit (1.5), fix P0 UX blockers (1.6)
  - **Phase 2 (Improvement):** Implement P1 UX (2.1), engaging thinking feedback (2.2), ghost response handling (2.3), fix P0 bugs from Phase 1 (2.4), harden errors (2.5)
  - **Phase 3 (Breathtaking):** Rich progress (3.1), terminal adaptivity 40–120 cols (3.2), animations (3.3), copy polish (3.4), accessibility hardening (3.5), P2 UX (3.6), magical init (3.7)
- **Key decisions:**
  - Timeout must be configurable via env var (SQUAD_SESSION_TIMEOUT_MS), default 10 minutes
  - Thinking feedback: Claude-style phrases + Copilot-style action display
  - Terminal adaptivity: beautiful at 120-col, functional at 80-col, graceful at 40-col
  - Copy polish: human, fun, action-oriented (not stuffy)
  - Success gate: "Brady says it's breathtaking"
- **Agent assignments:** Cheritto owns most TUI work (9 items across all phases), Breedan E2E expansion, Waingro hostile QA, Nate accessibility (audit + hardening), Marquez UX review + design, Hockney error tests, Kovash review, McManus tone review.
- **Dependencies mapped:** Phase 1 → Phase 2 (P0 before P1, timeout before thinking feedback), Phase 2 → Phase 3 (foundation before polish).
- **PRD location:** Session state file `prd-testing-epic.md` (to become GitHub epic issue)
- **Next step:** Brady reviews PRD, then create epic + 21 sub-issues, assign agents, execute Phase 1.

### 2026-02-24: Documentation Restructure Plan (requested by Brady)
- **Task:** Design a new documentation structure. Current 85 pages (62 non-blog) are overwhelming. Brady wants fewer, better docs that make Squad look simple and appealing.
- **Analysis:** Read all key docs — guide/, features/ (25 files), scenarios/ (21 files), cli/, sdk/, reference/. Understood content depth, overlap, and gaps.
- **Proposal delivered:** Cut 62 non-blog pages to 18 (71% reduction). Blog (23 posts) untouched. Total: 41 pages.
- **Structure:** Home (pitch) → Get Started (install + first session hero) → Concepts (5 themed pages consolidating all 25 features) → Scenarios (6 curated from 21) → Reference (CLI + SDK, one page each) → Cookbook (advanced recipes + migration/troubleshooting)
- **Key decisions:**
  - All 25 feature docs merge into 5 concept pages: Your Team, Memory & Knowledge, Parallel Work & Models, GitHub Integration, Portability & Extensions
  - 6 scenarios curated as standalone: existing-repo, solo-dev, issue-driven-dev, monorepo, ci-cd, team-of-humans
  - 15 remaining scenarios become compact recipes in cookbook
  - First Session is the hero doc — leads with the "wow moment"
  - Home page is a pitch, not a table of contents
- **Proposal location:** Session state file `docs-restructure-plan.md`
- **Status:** Awaiting Brady's approval before execution
- **Next step:** If approved, assign merge work to agents (5 concept pages are biggest effort, ~2-3 hours each)

### 2026-02-23: Docs Site Engine & Beta Content (#185, #188)
- **Task:** Build a minimal static site generator for markdown documentation + landing page with navigation sidebar
- **Solution delivered:**
  - `docs/build.js` — ESM-compatible Node.js markdown-to-HTML converter (uses file:// URLs for imports)
  - `docs/template.html` — HTML5 template with sticky sidebar navigation, responsive design, mobile hamburger menu
  - `docs/assets/style.css` — Professional GitHub-styled design (CSS variables, flexbox layout, dark sidebar, syntax highlighting for code blocks)
  - `docs/assets/app.js` — Minimal JavaScript (sidebar toggle on mobile, active page highlighting, click-to-close)
  - `docs/guide/index.md` — Landing page linking all guides with organized sections (Getting Started, Guides, Reference)
- **Content verified:** All 8 existing guides present (installation, configuration, shell, sdk-integration, tools-and-hooks, marketplace, upstream-inheritance, feature-migration) + architecture/api reference
- **Build system:** Running `node docs/build.js` generates HTML in `docs/dist/` (added to .gitignore explicitly)
- **Key decision:** ESM-only approach (project-wide constraint) required `import.meta.url` + `fileURLToPath` for __dirname replacement
- **GitHub Pages ready:** Output is static HTML with relative asset paths, works offline
- **Status:** ✅ All 10 HTML files generated successfully with no errors

### 2026-02-22: Issue #306 Cleanup Audit (Phase 1 — AUDIT ONLY)
- **Scope:** Comprehensive audit of hardcoded values, code quality, and test coverage gaps across `packages/squad-sdk/src/` and `packages/squad-cli/src/`
- **Findings:** 47 total findings across 4 categories:
  - **Hardcoded Logic (18):** Model names duplicated in 6 files with no single source of truth; default model conflicts (haiku vs. sonnet); timeouts hard-coded with no env var overrides; agent roles not config-driven; OTLP endpoint localhost assumption
  - **Code Quality (16):** CRITICAL command injection (CWE-78) in upstream.ts ×3 occurrences (execSync with template string interpolation); error handling inconsistency (fatal() vs error() semantic clash); TODO markers in spawn.ts blocking full shell integration
  - **Test Coverage (8):** HealthMonitor untested; ModelFallbackExecutor cross-tier rules untested; upstream git clone not exercised in tests; watch.ts GitHub triage logic untested; shell integration end-to-end untested
  - **Empathy/UX (5):** Generic error messages (no context for GitHub vs. config failures); hardcoded timeouts affect slow networks; quiet CLI failures; no debug logging
- **Critical Issue:** Command injection in upstream.ts: `execSync(\`git clone ... --branch ${ref}\`...)`  allows shell metacharacter injection if ref or cloneDir naming is attacker-controlled
- **Architecture Pattern:** All hardcoded values should be extracted to `constants.ts` with environment variable overrides (cost, deployment flexibility)
- **Recommended Sequencing:** Phase 1 (Security & Stability): CWE-78 fix. Phase 2 (Configuration Extraction): Centralize models, timeouts, roles. Phase 3 (Test Coverage): HealthMonitor, fallback executor, shell integration. Phase 4 (UX): Error messages, DEBUG logging.
- **Agent Assignment Recommendations:** Fenster (upstream.ts fix + tests), Edie (config extraction), Hockney (test coverage), Baer (error messages/UX)
- **Report Location:** `.squad/decisions/inbox/keaton-cleanup-audit.md`
- **Next Step:** Brady/Keaton review, assign specific tasks to agents, create GitHub issues for each finding

### From Beta (carried forward)
- Architecture patterns that compound — decisions that make future features easier
- Silent success mitigation lessons: ~7-10% of background spawns return no text, mitigated by RESPONSE ORDER block + filesystem checks
- Reviewer rejection lockout enforcement: if Keaton/Hockney/Baer rejects, original author is locked out
- Proposal-first workflow: docs/proposals/ before execution for meaningful changes
- 13 modules: adapter, agents, build, casting, cli, client, config, coordinator, hooks, marketplace, ralph, runtime, sharing, skills, tools
- Distribution: GitHub-native (npx github:bradygaster/squad), never npmjs.com
- v1 docs are internal only — no published docs site

### 2026-02-21: Interactive Shell Proposal
- **Problem:** Copilot CLI dependency creates unreliable handoffs, zero agent visibility, and external UX control

### 📌 Team update (2026-02-22T10:03Z): PR #300 review completed (architecture, security, code, tests) — REQUEST CHANGES verdict with 4 blockers — decided by Keaton
- **Solution:** Squad becomes its own REPL/shell — users launch `squad` with no args, enter interactive session
- **Architecture decision:** Copilot SDK as LLM backend (streaming, tool dispatch), Squad owns spawning + coordination UX
- **Terminal UI:** Recommend `ink` (React for CLIs) — battle-tested, component model, testable, cross-platform
- **No breaking changes:** All subcommands (init, watch, export) unchanged; squad.agent.md still works for Copilot-native users
- **Wave restructure:** This becomes Wave 0 (foundation) — blocks distribution (Wave 1), SquadUI (Wave 2), docs (Wave 3)
- **Key decisions needed:** ink vs. alternatives, session-per-agent vs. pooling, background cleanup strategy
- **File paths:** docs/proposals/squad-interactive-shell.md (proposal), GitHub issue #232 (epic tracking)
- **Pattern:** When product direction shifts, invalidate existing wave structure and rebuild from foundation

### 2026-02-21: SDK/CLI Split Architecture Decision
- **Problem:** All 114 .ts files live in root `src/`. Workspace packages `squad-sdk` and `squad-cli` are published stubs. Need to move real code into them.
- **Analysis:** Dependency flow is strictly CLI → SDK → @github/copilot-sdk. No circular deps. No SDK module imports from CLI. Clean DAG.
- **Architecture decision:** SDK gets 15 directories + 4 standalone files (adapter, agents, build, casting, client, config, coordinator, hooks, marketplace, ralph, runtime, sharing, skills, tools, utils, index.ts, resolution.ts, parsers.ts, types.ts). CLI gets `src/cli/` + `src/cli-entry.ts`. Root becomes workspace orchestrator only.
- **Key call:** Remove CLI utility re-exports (`success`, `error`, `fatal`, `runInit`, etc.) from SDK barrel. These leaked CLI implementation into the library surface. Breaking change — correct and intentional.
- **Key call:** `ink` and `react` are CLI-only deps. SDK has zero UI dependencies.
- **Migration order:** SDK first (CLI depends on it), CLI second (rewrite imports to package names), root cleanup third.
- **Exports map:** SDK subpath exports expand from 7 to 18 entries — every module independently importable.
- **File path:** `.squad/decisions/inbox/keaton-sdk-cli-split-plan.md`
- **Pattern:** One-way dependency graphs enable independent package evolution. SDK stays pure library; CLI stays thin consumer.

### 📌 Team update (2026-02-22T041800Z): SDK/CLI split plan executed, versions aligned to 0.8.0, 1719 tests passing
Keaton's split plan produced definitive SDK/CLI mapping with clean DAG (CLI → SDK → @github/copilot-sdk). Fenster migrated 154 files across both packages. Edie fixed all 6 config files (tsconfigs with composite builds, package.json exports maps). Kobayashi aligned all versions to 0.8.0 (clear break from 0.7.0 stubs). Hockney verified build clean + all 1719 tests pass, deferred test import migration until root src/ removal. Rabin verified publish workflows ready. Coordinator published both packages to npm (0.8.0). Inbox merged to decisions.md. Ready for Phase 3 (root cleanup).


## Status Snapshot (2026-02-22T225951Z)

**Current Branch:** `bradygaster/dev` (latest: d2b1b1f)  
**No Open PRs** — Previous work is merged. Repository is in a clean state.

### What's Shipped ✅
- **Root package:** v0.6.0-alpha.0 (workspace coordinator, private)
- **SDK package:** v0.8.0 (real code, 18 subpath exports, @github/copilot-sdk only)
- **CLI package:** v0.8.1 (ink/react shell foundation, parser functions, agent spawn skeleton)
- **Build:** ✅ Clean (SDK + CLI both compile with zero errors)
- **Tests:** ✅ 1,727 passing across 57 test files
- **Architecture:** ✅ SDK/CLI split complete, one-way dependency graph (CLI → SDK → Copilot SDK)

### What's Missing / Incomplete ⚠️
1. **Root src/ directory removal** — Still exists alongside workspace packages. Phase 3 cleanup is blocked. This creates confusion about canonical source location.
2. **Interactive shell UX implementation** — `runShell()` is console.log-only. Ink component wiring not done (AgentPanel.tsx, MessageStream.tsx defined but not integrated). Session/prompt/spawn all stubbed.
3. **OpenTelemetry observability epic** — 9 P0/P1 issues (#261, #257–259, etc.): token metrics, agent/coordinator tracing, session pool metrics. None in progress.
4. **Documentation migration epic** — 11 issues (#182–206): copy beta docs, update URLs, write new guides (Architecture, Migration, SDK API Reference). High priority but no active work.
5. **Test import migration** — 150+ import lines still use `../src/` (root); blocked until root deletion.

### Open Issues Summary (27 open, 6 assigned to Keaton)
- **Observability (9):** Epic #253 — Token usage metrics (P0), agent lifecycle traces (P0/P1), session pool metrics, Aspire dashboard integration
- **Docs (11):** Epic #182 — Migration guide, API reference, architecture overview, install guides (all Keaton)
- **File watcher:** #268 (Fenster, P1) — Port squad-observer from paulyuk/squad
- **OTel integration tests:** #267 (Hockney, P1)
- **SquadUI integration:** 2 issues in pipeline

### Critical Blockers ⛔
**None for current release.** But two near-term constraints:
1. **Root src/ is a time bomb** — Parallel structure (root src/ + workspace packages) is confusing and error-prone. Removing it unblocks test migration and clarifies package boundaries.
2. **Observability is a pre-requisite for production** — All 9 OTel issues are P0/P1, needed before a public release. Token metrics (#261) is marked P0 (release blocker).

### Recommended Next Steps (Prioritized)
1. **Phase 3: Delete root src/ directory** — Move remaining 56 test files to use workspace packages. Unblock test import migration. Forces clarity.
2. **Merge missing observability** — Assign OTel work (9 issues) to sprint. #261 (token metrics) is P0. Others are P1 (agent/coordinator traces). Needed for production observability.
3. **Documentation pass** — Assign 11-issue epic to Keaton (already labeled). Write Architecture Overview (#206), Migration Guide (#203), API Reference (#196). Unblock public release.
4. **Complete interactive shell wiring** — Wire Ink components (AgentPanel, MessageStream, InputPrompt) to SDK session → streaming. Current code is skeleton-only.
5. **Verify insider publish pipeline** — Both packages published to npm (0.8.0 insider). Run end-to-end test: `npm install -g @bradygaster/squad-cli && squad` on a fresh machine.

### 2026-02-22: Upstream Inheritance PR Review (PR #300)
- **Author:** Tamir Dresher (tamirdresher)
- **Verdict:** Request Changes (4 blocking items)
- **Architecture:** Org → Team → Repo hierarchy is sound. Closest-wins conflict resolution is the right default. SDK/CLI split follows established patterns. `.squad/upstream.json` is correct config location.
- **Blocking issues:** (1) No proposal document — violates proposal-first workflow, (2) `Record<string, unknown>` for castingPolicy — violates strict typing decision, (3) No sanitization on inherited content — security gap vs. existing export sanitization, (4) `.ai-team/` fallback in `findSquadDir()` — undocumented dual-format support.
- **Non-blocking concerns:** No coordinator integration wired yet (dead library code without it), live local upstreams create silent coupling (asymmetric with git sync), `export` upstream type relationship with sharing module's `ExportBundle` is unclear.
- **Pattern learned:** External contributors may not know about proposal-first workflow — add to CONTRIBUTING.md or PR template.
- **Decision file:** `.squad/decisions/inbox/keaton-upstream-review.md`

### 2026-02-24: GitHub Pages Publishing Architecture (requested by Brady)
- **Research scope:** Compare old repo (bradygaster/squad) GH Pages setup with current squad-pr, identify simplest path forward.
- **Old repo findings:** 
  - `squad-docs.yml` workflow on `preview` branch, runs on push to docs/** or workflow_dispatch.
  - Uses `markdown-it` + `markdown-it-anchor` npm deps (8-10KB footprint).
  - Calls `node docs/build.js --out _site --base /squad` (old repo deployed to subpath).
  - Uses standard GH Pages Actions: `upload-pages-artifact` + `deploy-pages`.
  - Docs structure: Root markdown files (guide.md, whatsnew.md, insider-program.md) + subdirs (blog/, features/, scenarios/, specs/, migration/).
  - Has blog support with frontmatter parsing (title, date extraction).
- **Current repo status:**
  - **Already has:** `squad-docs.yml` workflow (identical to old repo).
  - **Already has:** `docs/build.js` — ESM version, simpler markdown-to-HTML regex-based converter (no npm deps).
  - **Already has:** `docs/template.html`, `docs/assets/style.css`, `docs/assets/app.js`.
  - **Already has:** `docs/guide/` with 8 markdown guides (installation, configuration, shell, sdk-integration, tools-and-hooks, marketplace, upstream-inheritance, feature-migration).
  - **Content vs. structure mismatch:** Current build.js doesn't support subdirectories (blog/, features/) like old repo does — it's single-layer navigation.
- **Recommendation (TL;DR):**
  1. **Keep the existing workflow.** `squad-docs.yml` is already correct for GH Pages (GitHub Actions native, no third-party tools).
  2. **Use our own build.js — it's perfect.** No npm deps, lightweight, ESM-native (matches project constraint), already tested, generates relative-path HTML.
  3. **Ship docs immediately:** Current setup is production-ready. Run `node docs/build.js` locally, output goes to `docs/dist/` (gitignored), workflow pushes to GH Pages.
  4. **Blog support (future wave):** Old repo uses `markdown-it` for features like frontmatter + anchors. If blog posts needed, either: (a) extend our build.js with frontmatter parsing (15 lines), or (b) add markdown-it as optional dep.
  5. **Deployment target:** Squad should publish to `https://bradygaster.github.io/squad-pr/` (subpath /squad-pr). Update `--base /squad-pr` in workflow if needed.
  6. **Why not adopt old approach verbatim:** Old repo's markdown-it is heavier, pulls npm deps into docs build. Our regex-based converter is lean and sufficient for guides. Only adopt markdown-it if frontmatter/fancy features are required.
- **Next steps (Brady):** (1) Verify .gitignore has `docs/dist/`, (2) Test `node docs/build.js` locally, (3) Push to preview branch, (4) Enable GH Pages in repo settings (deploy from Actions), (5) Post-launch: Plan blog support if needed.
- **Decision file:** `.squad/decisions/inbox/keaton-gh-pages.md`

### 2026-02-24: Wave D Readiness Assessment (requested by Brady)
- **Task:** Assess CLI quality and define Wave D (Delight) readiness after Waves A, B, C completion.
- **Findings:** 
  - **Quality State:** Solid foundation. Waves A–C shipped 17 polish items, 8 PRs merged, 15 issues closed. All P0 tests green (1727+ passing). CLI is responsive, visually coherent, handles interactions gracefully.
  - **Known Gaps:** 25 UX gaps cataloged (Marquez), 13 fragility risks cataloged (Waingro). 12 gaps already addressed in Wave A–C PRs. 13 remain for Wave D.
  - **P0 Blocker:** #324 dogfood. Only open issue. Must test against real repos (not fixtures) before Wave D launch.
  - **Wave D Opportunities:** Unified status display, adaptive keyboard hints, message history cap, per-agent streaming (fixes concurrent output jumble), error recovery guidance, /clear confirmation, exit session summary.
  - **Wave D Tier Breakdown:**
    - Tier 1 (High-Value Wins): Status unification, adaptive hints, dogfood closure, error guidance. ~12–15 hours, 1 week.
    - Tier 2 (Precision): /clear confirmation, exit summary, placeholder hint. ~5–8 hours, 2 days.
    - Tier 3 (Fragility): Message cap, per-agent streaming, connection-aware retry, stale cleanup. ~8–12 hours, can defer to Wave E.
  - **Pattern Learned:** Full catalog review (UX + Fragility + Test Debt) + dogfood closure + tier breakdown = confidence for next wave planning. Marquez and Waingro catalogs are living documents — use them to prioritize across waves.
- **Report Location:** `.squad/decisions/inbox/keaton-wave-d-assessment.md`
- **Recommendation:** Close #324, pick Tier 1 for Wave D Batch 1, ship in 1 week. Quality gate before launch: P0 items addressed, memory safety verified, E2E passing on real codebases.
- **Next Step:** Brady reviews assessment, decides which Wave D items to pursue.

### 2026-02-24: Wave D Batch 1 GitHub Issues Filed
- **Task:** File 6 GitHub issues for Wave D Batch 1 items from readiness assessment.
- **Issues Created:**
   1. **#488** — Unified Status Display (P1, Cheritto) — Unify `/agents` and AgentPanel status display
   2. **#489** — Adaptive Keyboard Hints (P1, Cheritto) — Progressive hint display by message count
   3. **#490** — Error Recovery Guidance (P1, Kovash) — Better error messages for SDK disconnect and validation
   4. **#491** — Message History Cap (P2, Fortier) — Add maxMessages limit and archive older messages
   5. **#492** — Per-Agent Streaming Content (P2, Cheritto) — Change from single streamingContent to per-agent Map
   6. **#493** — StreamBuffer Cleanup on Error (P2, Fortier) — Add streamBuffers.delete() in error paths
- **Routing Logic Applied:**
   - **P1 UX items** (#488, #489) → Cheritto (TUI implementation expert)
   - **P1 Error Messages** (#490) → Kovash (shell/error handling)
   - **P2 Memory/Streaming** (#491, #492, #493) → Fortier (runtime performance) & Cheritto (TUI)
- **Total Effort Estimate:** ~20–25 hours, ~4–5 PRs, 1 week
- **Quality Gate:** P0 tests passing, E2E coverage verified, memory safety audit signed off
- **Next Step:** Brady reviews issues, assigns agents, executes Batch 1 workload

### 2026-02-24: Public Release Readiness Assessment (requested by Brady)
- **Task:** Assess whether Squad SDK + CLI are ready for public release — source and all.
- **Context:** Waves A–D complete (30 PRD issues closed, 2930 tests passing), only #324 (dogfood) open. Brady asking for architecture/product readiness verdict.
- **Findings:**
  1. **Architecture maturity:** 🟢 STRONG. Monorepo split (SDK/CLI) is clean, one-way DAG dependency (CLI → SDK → Copilot SDK). 600 TypeScript files, strict mode enforced, zero compilation errors, ESM-only. 18 SDK subpath exports with clear module boundaries. Hook-based governance (not prompt-based). Pattern: decisions that compound — every architectural choice makes future features easier.
  2. **API surface stability:** 🟡 CAVEATS. SDK v0.8.5.1 is stable enough for early adopters but NOT frozen. README warns: "Alpha — API and file formats may change." Acceptable for v1 public release IF we communicate breaking change policy clearly. No show-stopping API debt. Router, coordinator, casting engine, tools, hooks — all coherent and well-typed. Key risk: We haven't dogfooded the SDK programmatically (only CLI usage). External devs might discover API friction we didn't hit.
  3. **Feature completeness:** 🟢 READY. Interactive shell, parallel agent spawning, session persistence, crash recovery, skill system, upstream inheritance, casting, routing, hooks, telemetry, remote squad mode. CLI has 9 commands (init, upgrade, status, triage, copilot, plugin, export, import, scrub-emails). SDK covers orchestration, coordination, tools, governance. Missing: Advanced features (SquadUI, observability dashboard, multi-repo coordination) are NOT v1 blockers.
  4. **Technical debt:** 🟡 MANAGEABLE. Only 3 TODOs in CLI code (upgrade.ts, workflows.ts), 1 in SDK (tools/index.ts). Issue #306 cleanup audit from Feb 22 identified 47 findings (18 hardcoded values, 16 code quality, 8 test gaps, 5 UX) — most are polish, not blockers. Critical security issue (command injection in upstream.ts) was FIXED in Feb. 2928/2931 tests passing (2 flaky timing tests). No @ts-ignore violations (11 minimal uses of `any`, all justified). Low embarrassment risk.
  5. **Contributor readiness:** 🟡 NEEDS WORK. CONTRIBUTING.md exists and is solid (monorepo structure, workflow, changesets, branch strategy). README is comprehensive (quick start, architecture, SDK examples). BUT: No docs/ARCHITECTURE.md, no contributor onboarding guide beyond CONTRIBUTING.md, no "how to add a new tool/hook/coordinator feature" guide. External devs can clone and build (instructions clear), but understanding internal architecture requires reading code. Recommendation: Add docs/architecture/ with module diagrams + decision rationale BEFORE public launch.
- **Verdict:** 🟡 READY WITH CAVEATS
  - **Ship it IF:** (1) Dogfood #324 completes successfully (only open blocker), (2) Add docs/architecture/overview.md (15-20 min), (3) Explicitly document breaking change policy in README (alpha → beta → stable path).
  - **Why ship now:** Architecture is sound, tests are comprehensive, SDK API is coherent, CLI is polished (Waves A–D done). Early adopters can build on this. Waiting for "perfect" delays feedback loop.
  - **Risks to mitigate:** (a) SDK API churn — add CHANGELOG discipline + semver adherence, (b) External contributor confusion — add architecture docs, (c) Dogfood gaps — complete #324 before launch.
- **Recommendation:** Close #324 (dogfood), write architecture overview, then public launch v0.8.6 or v0.9.0 (signaling stability confidence). Post-launch: Wave E focuses on feedback from external usage.
- **Report location:** `.squad/decisions/inbox/keaton-public-readiness.md`
- **Next step:** Brady reviews verdict, decides launch timing

### 2026-02-24T17-25-08Z : Team consensus on public readiness
📌 Full team assessment complete. All 7 agents: 🟡 Ready with caveats. Consensus: ship after 3 must-fixes (LICENSE, CI workflow, debug console.logs). No blockers to public source release. See .squad/log/2026-02-24T17-25-08Z-public-readiness-assessment.md and .squad/decisions.md for details.

### 2026-02-25: Ralph Smart Triage Module — Architecture Review
- **Task:** Review routing-aware triage module (`triage.ts`), `gh-cli.ts` GhPullRequest additions, Ralph charter/description updates.
- **Verdict:** ✅ APPROVED. Architecture is sound.
- **Key findings:**
  - `triage.ts` is pure functions with zero side effects — parsing + decision only, no I/O. Follows SDK pure-library pattern.
  - Priority cascade (module ownership → routing rules → role keywords → lead fallback) is correct and matches real triage workflow.
  - Regex patterns verified against actual routing.md format (unicode arrow `→`, emoji in agent names, em-dash in secondary column).
  - `parseRoster` correctly handles team.md `## Members` format and excludes Scribe/Ralph from assignable roster.
  - `normalizeEol` dependency confirmed at `utils/normalize-eol.ts`.
  - GhPullRequest interface covers PR monitoring needs (author, reviewDecision, statusCheckRollup, isDraft).
  - Interfaces are well-designed for extension — `TriageDecision.source` union, confidence levels, decoupled `TriageIssue`.
- **Minor suggestions (non-blocking):** (1) Strip emoji from `RoutingRule.agentName` at parse time, (2) Add `createdAt`/`updatedAt` to `GhPullRequest` for staleness detection, (3) `findRoleKeywordMatch` takes first match among tied roles.
- **Pattern learned:** Pure parsing modules that take markdown content as input and return typed decisions are highly testable and composable. This pattern should be used for any future `.squad/*.md` file parsing.
- **Decision file:** `.squad/decisions/inbox/keaton-ralph-triage-review.md`
# Project Context

- **Owner:** Brady
- **Project:** squad-sdk — the programmable multi-agent runtime for GitHub Copilot (v1 replatform)
- **Stack:** TypeScript (strict mode, ESM-only), Node.js ≥20, @github/copilot-sdk, Vitest, esbuild
- **Created:** 2026-02-21


## Learnings


## 📌 v0.8.22 Release Disaster — 2026-03-07T20:50:00Z

**THE WORST RELEASE IN SQUAD HISTORY.** Brady was rightfully upset. This was a catastrophe. Full retrospective written with brutal honesty.

**What went wrong:**
1. **GitHub Release created as DRAFT** — didn't trigger `release: published` event, so publish.yml never ran automatically
2. **NPM_TOKEN was User token with 2FA** — CI failed 5+ times with EOTP errors (can't provide OTP in automation)
3. **`bump-build.mjs` ran locally 4 times during debugging** — silently mutated version from 0.8.21 → 0.8.21.4 (4-part version, INVALID semver)
4. **Kobayashi committed 0.8.21.4 without validation** — 4-part versions are NOT valid semver
5. **npm MANGLED 0.8.21.4 into 0.8.2-1.4** — parser misinterpreted it as major.minor.patch-prerelease. This went to the registry. `latest` dist-tag pointed to a phantom version for 6+ hours.
6. **Verify step had no retry logic** — npm propagation delay caused 404s even when publish succeeded

**Root cause:** No release runbook. Agents improvised. Improvisation during releases = disaster.

**Lessons learned (hard):**
1. **Process documentation prevents disasters.** No release without a runbook = no release. Period.
2. **Semver validation is mandatory.** 4-part versions (0.8.21.4) look valid to humans but npm mangles them. Must run `require('semver').valid()` before ANY commit.
3. **Token types matter.** User tokens with 2FA ≠ Automation tokens. This should have been documented on day one.
4. **Draft releases are a footgun.** The difference between "draft" and "published" is invisible in the UI but breaks automation. Document this.
5. **Validation gates catch mistakes before they ship.** No more trusting package.json versions. Validate everything.
6. **Agents need checklists, not autonomy, for critical flows.** Releases are not the place for creativity.

**What we shipped:**
- Comprehensive retrospective: `.squad/decisions/inbox/keaton-v0822-retrospective.md`
- Release process skill: `.squad/skills/release-process/SKILL.md` — definitive step-by-step runbook with validation gates, rollback procedures, common failure modes
- Action items assigned to Keaton (skill doc, bump-build.mjs protection, NPM_TOKEN docs) and Kobayashi (pre-release validation script)

**Never again.** This was bad. We own it. We fixed it. We document it so future teams learn from it.


## 📌 Community Contributors Documentation — 2026-03-07T20:45:00Z

**COMMUNITY CREDIT SYSTEM ESTABLISHED.** Updated CONTRIBUTORS.md to formally recognize external contributors who shaped Squad through issues, discussions, and feature requests.

**Key additions:**
- **v0.8.21 section expanded:** Added SDK-first work shipped by Fenster (SDK-first init flag), Verbal (defineSkill() builder), Edie (squad migrate command), Hockney (66 new tests), McManus (SDK-first docs)
- **Community Contributors section:** 19 external contributors credentialed by GitHub handle with linked issues and contribution types
- **Community highlights:** Notable external impact: @csharpfritz's model-per-agent feature shipped in SDK; @williamhallatt's 4-issue batch spanning UX/docs/bugs; @swnger's discussion led to defineSkill() feature (#255 shipped)

**Recognition principle:** Community contributions aren't just bug reports — they're strategic inputs that shaped architectural decisions (SDK design, model configuration, multi-repo workflows, CLI-first direction). Documenting them builds contributor loyalty and transparency.


## 📌 Phase 1 Completion — 2026-03-05T21:37:09Z

**PHASE 1 SDK-FIRST COMPLETE.** Keaton's scoping decision + Edie's builders + Fenster's CLI + Hockney's tests + Kujan's OTel assessment + Verbal's coordinator update. 6 agents fanned out in parallel.

**Team Cross-Pollination:**
- **Edie:** Built 8 builder functions + type surface in packages/squad-sdk/src/builders/. Zero new deps. Runtime validation included. Type unification: runtime/config.ts canonical.
- **Fenster:** Implemented squad build --check CLI command. Works with SquadSDKConfig. Generated files stamped with HTML headers. Wired into cli-entry.ts.
- **Hockney:** 60 contract-first tests (36 builders, 24 build command). All passing. Stubs in place.
- **Kujan:** OTel readiness: all 8 runtime modules compile cleanly. Phase 3 unblocked.
- **Verbal:** Coordinator prompt updated with SDK Mode Detection section. Session-start heuristic for squad/ or squad.config.ts.

**Next:** Phase 2 (scaffolding + markdown generation), Phase 3 (SDK runtime + OTel), Phase 4 (migrations).


## 📌 Phase 2 Community PR Merges — 2026-03-07T01-13-00Z

**PHASE 2 COMMUNITY PR MERGES COMPLETE.** Brady approved 3 community PRs from external contributors. All merged to dev successfully.

- PR #230 (EmmittJ): CLI wire-up for squad link + squad init --mode remote (6d0bd56)
- PR #217 (williamhallatt): TUI /init no-args flow fix (20970f9)
- PR #219 (williamhallatt): Fork contribution workflow docs in CONTRIBUTING.md (157b8c0)

**Zero conflicts.** All three showed UNSTABLE merge state (dev progressed past their base), but all merged cleanly. Fork-first contributor procedure now standardized. 52+ tests passing.

**Team Status:** External contributors now viable for parallel work. Merge conflicts due to base drift, not code — low friction, normal pattern. Fork-first procedure repeatable.

📌 Team update (2026-03-07T15-55-00Z): v0.8.21 approved for release (Hockney: test validation passed; McManus: blog published). SDK-First init/migrate features remain deferred to v0.8.22 per previous decision. — coordinated by Scribe


