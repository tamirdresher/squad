# Decisions

> Team decisions that all agents must respect. Managed by Scribe.

### 2026-02-21: Type safety — strict mode non-negotiable
**By:** Edie (carried from beta)
**What:** `strict: true`, `noUncheckedIndexedAccess: true`, no `@ts-ignore` allowed.
**Why:** Types are contracts. If it compiles, it works. Strict mode catches entire categories of bugs.

### 2026-02-21: Hook-based governance over prompt instructions
**By:** Baer (carried from beta)
**What:** Security, PII, and file-write guards are implemented via the hooks module, NOT prompt instructions.
**Why:** Prompts can be ignored or overridden. Hooks are code — they execute deterministically.

### 2026-02-21: Node.js >=20, ESM-only, streaming-first
**By:** Fortier (carried from beta)
**What:** Runtime target is Node.js 20+. ESM-only (no CJS shims, no dual-package hazards). Async iterators over buffers.
**Why:** Modern Node.js features enable cleaner async patterns. ESM-only eliminates CJS interop complexity.

### 2026-02-21: Casting — The Usual Suspects, permanent
**By:** Squad Coordinator (carried from beta)
**What:** Team names drawn from The Usual Suspects (1995). Scribe is always Scribe. Ralph is always Ralph. Names persist across repos and replatforms.
**Why:** Names are team identity. The team rebuilt Squad beta with these names.

### 2026-02-21: Proposal-first workflow
**By:** Keaton (carried from beta)
**What:** Meaningful changes require a proposal in `docs/proposals/` before execution.
**Why:** Proposals create alignment before code is written. Cheaper to change a doc than refactor code.

### 2026-02-21: Tone ceiling — always enforced
**By:** McManus (carried from beta)
**What:** No hype, no hand-waving, no claims without citations. Every public-facing statement must be substantiated.
**Why:** Trust is earned through accuracy, not enthusiasm.

### 2026-02-21: Zero-dependency scaffolding preserved
**By:** Rabin (carried from beta)
**What:** CLI remains thin (`cli.js`), runtime stays modular. Zero runtime dependencies for the CLI scaffolding path.
**Why:** Users should be able to run `npx` without downloading a dependency tree.

### 2026-02-21: Merge driver for append-only files
**By:** Kobayashi (carried from beta)
**What:** `.gitattributes` uses `merge=union` for `.squad/decisions.md`, `agents/*/history.md`, `log/**`, `orchestration-log/**`.
**Why:** Enables conflict-free merging of team state across branches. Both sides only append content.

### 2026-02-21: User directive — Interactive Shell as Primary UX
**By:** Brady (via Copilot)
**What:** Squad becomes its own interactive CLI shell. `squad` with no args enters a REPL where users talk directly to the team. Copilot SDK is the LLM backend.
**Why:** Squad needs to own the full interactive experience with real-time status and direct coordination UX.

### 2026-02-21: User directive — no temp/memory files in repo root
**By:** Brady (via Copilot)
**What:** NEVER write temp files, issue files, or memory files to the repo root. All squad state/scratch files belong in .squad/ and ONLY .squad/. Root tree of a user's repo is sacred.
**Why:** User request — hard rule. Captured for all agents.

### 2026-02-21: npm workspace protocol for monorepo
**By:** Edie (TypeScript Engineer)
**What:** Use npm-native workspace resolution (version-string references) instead of `workspace:*` protocol for cross-package dependencies.
**Why:** The `workspace:*` protocol is pnpm/Yarn-specific. npm workspaces resolve workspace packages automatically.
**Impact:** All inter-package dependencies in `packages/*/package.json` should use the actual version string, not `workspace:*`.

### 2026-02-21: Distribution moves to npm (supersedes GitHub-native)
**By:** Rabin (Distribution) + Fenster (Core Dev)
**What:** Squad packages (`@bradygaster/squad-sdk` and `@bradygaster/squad-cli`) are distributed via npmjs.com. The GitHub-native `npx github:bradygaster/squad` path is deprecated.
**Why:** npm is the standard distribution channel. Root `cli.js` prints deprecation warning when invoked via old path.

### 2026-02-21: Coordinator prompt structure — three routing modes
**By:** Verbal (Prompt Engineer)
**What:** Coordinator uses structured response format: `DIRECT:` (answer inline), `ROUTE:` + `TASK:` + `CONTEXT:` (single agent), `MULTI:` (fan-out). Unrecognized formats fall back to `DIRECT`.
**Why:** Keyword prefixes are cheap to parse and reliable. Fallback-to-direct prevents silent failures.

### 2026-02-21: CLI entry point split — src/index.ts is a pure barrel
**By:** Edie (TypeScript Engineer)
**What:** `src/index.ts` is a pure re-export barrel with ZERO side effects. `src/cli-entry.ts` contains `main()` and all CLI routing.
**Why:** Library consumers importing `@bradygaster/squad` were triggering CLI argument parsing and `process.exit()` on import.

### 2026-02-21: Process.exit() refactor — library-safe CLI functions
**By:** Kujan (SDK Expert)
**What:** `fatal()` throws `SquadError` instead of `process.exit(1)`. Only `cli-entry.ts` may call `process.exit()`.
**Pattern:** Library functions throw `SquadError`. CLI entry catches and exits. Library consumers catch for structured error handling.

### 2026-02-21: User directive — docs as you go
**By:** bradygaster (via Copilot)
**What:** Doc and blog as you go during SquadUI integration work. Doesn't have to be perfect — keep docs updated incrementally.

### 2026-02-22: Repository scope directive
**By:** Brady (via Copilot)
**What:** This squad works on `bradygaster/squad-pr` ONLY — not `bradygaster/squad`. Until further notice, all issue tracking, PRs, and work target the squad-pr repository. Do NOT change anything in bradygaster/squad repo.

### 2026-02-22: Runtime EventBus as canonical bus
**By:** Fortier
**What:** `runtime/event-bus.ts` (colon-notation: `session:created`, `subscribe()` API) is the canonical EventBus for all orchestration classes. The `client/event-bus.ts` (dot-notation) remains for backward-compat but should not be used in new code.
**Why:** Runtime EventBus has proper error isolation — one handler failure doesn't crash others.

### 2026-02-22: Subpath exports in @bradygaster/squad-sdk
**By:** Edie (TypeScript Engineer)
**What:** SDK declares subpath exports (`.`, `./parsers`, `./types`, and module paths). Each uses types-first condition ordering.
**Constraints:** Every subpath needs a source barrel. `"types"` before `"import"`. ESM-only: no `"require"` condition.

### 2026-02-22: User directive — Aspire testing requirements
**By:** Brady (via Copilot)
**What:** Integration tests must launch the Aspire dashboard and validate OTel telemetry shows up. Use Playwright. Use latest Aspire bits. Reference aspire.dev (NOT learn.microsoft.com). It's "Aspire" not ".NET Aspire".

### 2026-02-23: User directive — code fences
**By:** Brady (via Copilot)
**What:** Never use / or \ as code fences in GitHub issues, PRs, or comments. Only use backticks to format code.

### 2026-02-23: User Directive — Docs Overhaul & Publication Pause
**By:** Brady (via Copilot)
**What:** Pause docs publication until Brady explicitly gives go-ahead. Tone: lighthearted, welcoming, fun (NOT stuffy). First doc should be "first experience" with squad CLI. All docs: brief, prompt-first, action-oriented, fun. Human tone throughout.

### 2026-02-23: Use sendAndWait for streaming dispatch
**By:** Kovash (REPL Expert)
**What:** `dispatchToAgent()` and `dispatchToCoordinator()` use `sendAndWait()` instead of `sendMessage()`. Fallback listens for `turn_end`/`idle` if unavailable.
**Why:** `sendMessage()` is fire-and-forget — resolves before streaming deltas arrive.
**Impact:** Never parse `accumulated` after a bare `sendMessage()`. Always use `awaitStreamedResponse`.

### 2026-02-23: extractDelta field priority — deltaContent first
**By:** Kovash (REPL Expert)
**What:** `extractDelta` priority: `deltaContent` > `delta` > `content`. Matches SDK actual format.
**Impact:** Use `deltaContent` as the canonical field name for streamed text chunks.

### 2026-02-24: Per-command --help/-h: intercept-before-dispatch pattern
**By:** Fenster (Core Dev)
**What:** All CLI subcommands support `--help` and `-h`. Help intercepted before command routing prevents destructive commands from executing.
**Convention:** New CLI commands MUST have a `getCommandHelp()` entry with usage, description, options, and 2+ examples.

### 2026-02-25: REPL cancellation and configurable timeout
**By:** Kovash (REPL Expert)
**What:** Ctrl+C immediately resets `processing` state. Timeout: `SQUAD_REPL_TIMEOUT` (seconds) > `SQUAD_SESSION_TIMEOUT_MS` (ms) > 600000ms default. CLI `--timeout` flag sets env var.

### 2026-02-24: Shell Observability Metrics
**By:** Saul (Aspire & Observability)
**What:** Four metrics under `squad.shell.*` namespace, gated behind `SQUAD_TELEMETRY=1`.
**Convention:** Shell metrics require explicit consent via `SQUAD_TELEMETRY=1`, separate from OTLP endpoint activation.

### 2026-02-23: Telemetry in both CLI and agent modes
**By:** Brady (via Copilot)
**What:** Squad should pump telemetry during BOTH modes: (1) standalone Squad CLI, and (2) running as an agent inside GitHub Copilot CLI.

### 2026-02-27: ASCII-only separators and NO_COLOR
**By:** Cheritto (TUI Engineer)
**What:** All separators use ASCII hyphens. Text-over-emoji principle: text status is primary, emoji is supplementary.
**Convention:** Use ASCII hyphens for separators. Keep emoji out of status/system messages.

### 2026-02-24: Version format — bare semver canonical
**By:** Fenster
**What:** Bare semver (e.g., `0.8.5.1`) for version commands. Display contexts use `squad v{VERSION}`.

### 2026-02-25: Help text — progressive disclosure
**By:** Fenster
**What:** Default `/help` shows 4 essential lines. `/help full` shows complete reference.

### 2026-02-24: Unified status vocabulary
**By:** Marquez (CLI UX Designer)
**What:** Use `[WORK]` / `[STREAM]` / `[ERR]` / `[IDLE]` across ALL status surfaces.
**Why:** Most granular, NO_COLOR compatible, text-over-emoji, consistent across contexts.

### 2026-02-24: Pick one tagline
**By:** Marquez (CLI UX Designer)
**What:** Use "Team of AI agents at your fingertips" everywhere.

### 2026-02-24: User directive — experimental messaging
**By:** Brady (via Copilot)
**What:** CLI docs should note the project is experimental and ask users to file issues.

### 2026-02-28: User directive — DO NOT merge PR #547
**By:** Brady (via Copilot)
**What:** DO NOT merge PR #547 (Squad Remote Control). Do not touch #547 at all.
**Why:** User request — captured for team memory

### 2026-02-28: CLI Critical Gap Issues Filed
**By:** Keaton (Lead)
**What:** 4 critical CLI gaps filed as GitHub issues #554–#557 for explicit team tracking:
- #554: `--preview` flag undocumented and untested
- #556: `--timeout` flag undocumented and untested
- #557: `upgrade --self` is dead code
- #555: `run` subcommand is a stub (non-functional)

**Why:** Orchestration logs captured gaps but they lacked actionable GitHub tracking and ownership. Filed issues now have explicit assignment to Fenster, clear acceptance criteria, and visibility in Wave E planning.

### 2026-02-28: Test Gap Issues Filed (10 items)
**By:** Hockney (Tester)
**What:** 10 moderate CLI/test gaps filed as issues #558–#567:
- #558: Exit code consistency untested
- #559: Timeout edge cases untested
- #560: Missing per-command help
- #561: Shell-specific flag behavior untested
- #562: Env var fallback paths untested
- #563: REPL mode transitions untested
- #564: Config file precedence untested
- #565: Agent spawn flags undocumented
- #566: Untested flag aliases
- #567: Flag parsing error handling untested

**Why:** Each gap identified in coverage analysis but lacked explicit GitHub tracking for prioritization and team visibility.

### 2026-02-28: Documentation Audit Results (10 issues)
**By:** McManus (DevRel)
**What:** Docs audit filed 10 GitHub issues (#568–#575, #577–#578) spanning:
- Feature documentation lag (#568 `squad run`, #570 consult mode, #572 Ralph smart triage)
- Terminology inconsistency (#569 triage/watch/loop naming)
- Brand compliance (#571 experimental banner on 40+ docs)
- Clarity/UX gaps (#573 response modes, #575 dual-root, #577 VS Code, #578 session examples)
- Reference issue (#574 README command count)

**Why:** Features shipped faster than documentation. PR #552, #553 merged without doc updates. No automation to enforce experimental banner. Users discover advanced features accidentally.

**Root cause:** Feature-docs lag, decision-doc drift, no brand enforcement in CI.

### 2026-02-28: Dogfood UX Issues Filed (4 items)
**By:** Waingro (Dogfooder)
**What:** Dogfood testing against 8 realistic scenarios surfaced 4 UX issues (filed as #576, #579–#581):
- #576 (P1): Shell launch fails in non-TTY piped mode (Blocks CI)
- #580 (P1): Help text overwhelms new users (44 lines, no tiering)
- #579 (P2): Status shows parent `.squad/` as local (confusing in multi-project workspaces)
- #581 (P2): Error messages show debug output always (noisy production logs)

**Why:** CLI is solid for happy path but first-time user experience and CI/CD integration have friction points. All 4 block either new user onboarding or automation workflows.

**Priority:** #576 > #580 > #581 > #579. All should be fixed before next public release.

### 2026-02-28: decisions.md Aggressive Cleanup
**By:** Keaton (Lead)
**What:** Trimmed `decisions.md` from 226KB (223 entries) to 10.3KB (35 entries) — 95% reduction.
- Kept: Core architectural decisions, active process rules, active user directives, current UX conventions, runtime patterns
- Archived: Implementation details, one-time setup, PR reviews, audit reports, wave planning, superseded decisions, duplicates
- Created: `decisions-archive.md` with full original content preserved

**Why:** Context window bloat during release push. Every agent loads 95% less decisions context. Full history preserved append-only.

**Impact:** File size reduced, agent context efficiency improved, all decisions preserved in archive.

### 2026-02-28: Backlog Gap Issues Filed (8 items)
**By:** Keaton (Lead)
**Approval:** Brady (via directive in issue request)
**What:** Filed 8 missing backlog items from `.squad/identity/now.md` as GitHub issues. These items were identified as "should-fix" polish or "post-M1" improvements but lacked explicit GitHub tracking until now.

**Why:** Brady requested: "Cross-reference the known backlog against filed issues and file anything missing." The team had filed 28 issues this session (#554–#581), but 8 known items from `now.md` remained unfiled. Without GitHub issues, these lack ownership assignment, visibility for Wave E planning, trackability in automated workflows, and routing to squad members.

**Issues Filed:**
- #583 (squad:rabin): Add `homepage` and `bugs` fields to package.json
- #584 (squad:mcmanus): Document alpha→v1.0 breaking change policy in README
- #585 (squad:edie): Add `noUncheckedIndexedAccess` to tsconfig
- #586 (squad:edie): Tighten ~26 `any` types in SDK
- #587 (squad:mcmanus): Add architecture overview doc
- #588 (squad:kujan): Implement SQUAD_DEBUG env var test
- #589 (squad:kujan): One real Copilot SDK integration test
- #590 (squad:baer): `npm audit fix` for dev-dependency ReDoS warnings
- #591 (squad:hockney, type:bug): Aspire dashboard test fails — docker pull in test suite
- #592 (squad:rabin): Replace workspace:* protocol with version string

**Impact:** Full backlog now visible with explicit issues. No unmapped items. Each issue routed to the squad member domain expert. Issues are independent; can be executed in any order.

### 2026-02-28: Codebase Scan — Unfiled Issues Audit
**By:** Fenster (Core Dev)
**Requested by:** Brady
**Date:** 2026-02-28T22:05:00Z
**Status:** Complete — 2 new issues filed

**What:** Systematic scan of the codebase to identify known issues that haven't been filed as GitHub issues. Checked:
1. TODO/FIXME/HACK/XXX comments in code
2. TypeScript strict mode violations (@ts-ignore/@ts-expect-error)
3. Skipped/todo tests (.skip() or .todo())
4. Errant console.log statements
5. Missing package.json metadata fields

**Findings:**
- Type safety violations: ✅ CLEAN — Zero @ts-ignore/@ts-expect-error found. Strict mode compliance excellent.
- Workspace protocol: ❌ VIOLATION — 1 issue filed (#592): `workspace:*` in squad-cli violates npm workspace convention
- Skipped tests: ❌ GAP — 1 issue filed (#588): SQUAD_DEBUG test is .todo() placeholder
- Console.log: ✅ INTENTIONAL — All are user-facing output (status, errors)
- TODO comments: ✅ TEMPLATES — TODOs in generated workflow templates, not code
- Package.json: ✅ TRACKED — Missing homepage/bugs already filed as #583

**Code Quality Assessment:**
- Type Safety (Excellent): Zero violations of strict mode or type suppression. Team decision being followed faithfully.
- TODO/FIXME Comments (Clean): All TODOs in upgrade.ts and workflows.ts are template strings for generated GitHub Actions YAML, intentionally scoped.
- Console Output (Intentional): All are user-facing (dashboard startup, OTLP endpoint, issue labeling, shell loading) — no debug debris.
- Dead Code (None Found): No unreachable code, orphaned functions, or unused exports detected.

**Recommendations:**
1. Immediate: Fix workspace protocol violation (#592) — violates established team convention
2. Soon: Implement SQUAD_DEBUG test (#588) — fills observable test gap
3. Going forward: Maintain type discipline; review package.json metadata during SDK/CLI version bumps

**Conclusion:** Codebase in good health. Type safety discipline strong. No hidden technical debt. Conventions mostly followed (one npm workspace exception). Test coverage has minor gaps in observability.

### 2026-02-28: Auto-link detection for preview builds
**By:** Fenster (Core Dev)
**Date:** 2026-02-28
**What:** When running from source (`VERSION` contains `-preview`), the CLI checks if `@bradygaster/squad-cli` is globally npm-linked. If not, it prompts the developer to link it. Declining creates `~/.squad/.no-auto-link` to suppress future prompts.
**Why:** Dev convenience — saves contributors from forgetting `npm link` after cloning. Non-interactive commands (help, version, export, import, doctor, scrub-emails) skip the check. Everything is wrapped in try/catch so failures are silent.
**Impact:** Only affects `-preview` builds in interactive TTY sessions. No effect on published releases or CI.

### 2026-03-01T00:34Z: User directive — Full scrollback support in REPL shell
**By:** Brady (via Copilot)
**What:** The REPL shell must support full scrollback — users should be able to scroll up and down to see all text (paste, run output, rendered content, logs) over time, like GitHub Copilot CLI does. The current Ink-based rendering loses/hides content and that's unacceptable.
**Why:** User request — captured for team memory. This is a P0 UX requirement for the shell.
**Status:** P0 blocking issue. Requires rendering architecture review (Cheritto, Kovash, Marquez).

### 2026-03-01T04:47Z: User directive — Auto-incrementing build numbers
**By:** Brady (via Copilot)
**What:** Add auto-incrementing build numbers to versions. Format: `0.8.6.{N}-preview` where N increments each local build. Tracks build-to-release cadence.
**Why:** User request — captured for team memory.

### 2026-03-01: Nap engine — dual sync/async export pattern
**By:** Fenster (Core Dev)
**What:** The nap engine (`cli/core/nap.ts`) exports both `runNap` (async, for CLI entry) and `runNapSync` (sync, for REPL). All internal operations use sync fs calls. The async wrapper exists for CLI convention consistency.
**Why:** REPL `executeCommand` is synchronous and cannot await. ESM forbids `require()`. Exporting a sync variant keeps the REPL integration clean without changing the shell architecture.
**Impact:** Future commands that need both CLI and REPL support should follow this pattern if they only do sync fs work.

### 2026-03-01: First-run gating test strategy
**By:** Hockney (Tester)
**Date:** 2026-03-01
**Issue:** #607
**What:** Created `test/first-run-gating.test.ts` with 25 tests covering 6 categories of Init Mode gating. Tests use logic-level extraction from App.tsx conditionals, filesystem marker lifecycle via `loadWelcomeData`, and source-code structural assertions for render ordering. No full App component rendering — SDK dependencies make that impractical for unit tests.
**Why:** 3059 tests existed with zero enforcement of first-run gating behavior. The `.first-run` marker, banner uniqueness, assembled-message gating, warning suppression, session-scoped keys, and terminal clear ordering were all untested paths that could regress silently.
**Impact:** All squad members: if you modify `loadWelcomeData`, the `firstRunElement` conditional in App.tsx, or the terminal clear sequence in `runShell`, these tests will catch regressions. The warning suppression tests replicate the `cli-entry.ts` pattern — if that pattern changes, update both locations.

### Verbal's Analysis: "nap" Skill — Context Window Optimization
**By:** Verbal (Prompt Engineer)
**Requested by:** Brady
**Date:** 2026-03-01
**Scope:** Approved. Build it. Current context budget analysis:
- Agent spawn loads charter (~500t) + history + decisions.md (4,852t) + team.md (972t)
- Hockney: 25,940t history (worst offender)
- Fenster: 22,574t (history + CLI inventory)
- Coherence cliff: 40-50K tokens on non-task context

**Key Recommendations:**
1. **Decision distillation:** Keep decisions.md as single source of truth (don't embed in charters — creates staleness/duplication)
2. **History compression — 12KB rule insufficient:** Six agents blow past threshold. Target **4KB ceiling per history** (~1,000t) with assertions not stories.
3. **Nap should optimize:** Deduplication (strip decisions.md content echoed in histories), staleness (flag closed PRs, merged work), charter bloat (stay <600t), skill pruning (archive high-confidence, no-recent-invocation skills), demand-loading for extra files (CLI inventory, UX catalog, fragility catalog).
4. **Enforcement:** Nap runs periodically or on-demand, enforces hard ceilings without silent quality degradation.

### ShellApi.clearMessages() for terminal state reset
**By:** Kovash (REPL Expert)
**Date:** 2026-03-01
**What:** `ShellApi` now exposes `clearMessages()` which resets both `messages` and `archivedMessages` React state. Used in session restore and `/clear` command.
**Why:** Without clearing archived messages, old content bleeds through when restoring sessions or clearing the shell. The `/clear` command previously only reset `messages`, leaving `archivedMessages` in the Static render list.
**Impact:** Any code calling `shellApi` to reset shell state should use `clearMessages()` rather than manually manipulating message arrays.

### 2026-03-01: Prompt placeholder hints must not duplicate header banner
**By:** Kovash (REPL Expert)
**Date:** 2026-03-01
**Issue:** #606
**What:** The InputPrompt placeholder text must provide *complementary* guidance, never repeat what the header banner already shows. The header banner is the single source of truth for @agent routing and /help discovery. Placeholder hints should surface lesser-known features (tab completion, history navigation, utility commands).
**Why:** Two elements showing "Type @agent or /help" simultaneously creates visual noise and a confusing UX. One consistent prompt style throughout the session.
**Impact:** `getHintText()` in InputPrompt.tsx now has two tiers instead of three. Any future prompt hints should check the header banner first to avoid duplication.

### 2026-03-02: Paste detection via debounce in InputPrompt
**By:** Kovash (REPL Expert)
**Date:** 2026-03-02
**What:** InputPrompt uses a 10ms debounce on `key.return` to distinguish paste from intentional Enter. If more input arrives within 10ms → paste detected → newline preserved. If timer fires without input → real Enter → submit. A `valueRef` (React ref) mirrors mutations synchronously since closure-captured `value` is stale during rapid `useInput` calls. In disabled state, `key.return` appends `\n` to buffer instead of being ignored.
**Why:** Multi-line paste was garbled because `useInput` fires per-character and `key.return` triggered immediate submission.
**Impact:** 10ms delay on single-line submit is imperceptible. UX: multi-line paste preserved. Testing: Hockney should verify paste scenarios use `jest.useFakeTimers()` or equivalent. Future: if Ink adds native bracketed-paste support, debounce can be replaced.

### 2026-03-01: First-run init messaging — single source of truth
**By:** Kovash (REPL & Interactive Shell)
**Date:** 2026-03-01
**Issue:** #625
**What:** When no roster exists, only the header banner tells the user about `squad init` / `/init`. The `firstRunElement` block returns `null` for the empty-roster case instead of showing a duplicate message. `firstRunElement` is reserved for the "Your squad is assembled" onboarding when a roster already exists.
**Why:** Two competing UI elements both said "run squad init" — visual noise that confuses the information hierarchy. Banner is persistent and visible; it owns the no-roster guidance. `firstRunElement` owns the roster-present first-run experience.
**Impact:** App.tsx only. No API or prop changes. Banner text reworded to prioritize `/init` (in-shell path) over exit-and-run.

### 2026-03-01: NODE_NO_WARNINGS for subprocess warning suppression
**By:** Cheritto (TUI Engineer)
**Date:** 2026-03-01
**Issue:** #624
**What:** `process.env.NODE_NO_WARNINGS = '1'` is set as the first executable line in `cli-entry.ts` (line 2, after shebang). This supplements the existing `process.emitWarning` override.
**Why:** The Copilot SDK spawns child processes that inherit environment variables but NOT in-process monkey-patches like `process.emitWarning` overrides. `NODE_NO_WARNINGS=1` is the Node.js-native mechanism for suppressing warnings across an entire process tree. Without it, `ExperimentalWarning` messages (e.g., SQLite) leak into the terminal via the SDK's subprocess stderr forwarding.
**Pattern:** When suppressing Node.js warnings, use BOTH: (1) `process.env.NODE_NO_WARNINGS = '1'` — covers child processes (env var inheritance); (2) `process.emitWarning` override — covers main process (belt-and-suspenders).
**Impact:** Eliminates `ExperimentalWarning` noise in terminal for all Squad CLI users, including when the Copilot SDK spawns subprocesses.

### 2026-03-01: No content suppression based on terminal width
**By:** Cheritto (TUI Engineer)
**Date:** 2026-03-01
**What:** Terminal width tiers (compact ≤60, standard, wide ≥100) may adjust *layout* (e.g., wrapping, column arrangement) but must NOT suppress or truncate *content*. Every piece of information shown at 120 columns must also be shown at 40 columns.
**Why:** Users can scroll. Hiding roster names, spacing, help text, or routing hints on narrow terminals removes information the user needs. Layout adapts to width; content does not.
**Convention:** `compact` variable may be used for layout decisions (flex direction, column vs. row) but must NOT gate visibility of text, spacing, or UI sections. `wide` may add supplementary content but narrow must not remove it.

### 2026-03-01: Multi-line user message rendering pattern
**By:** Cheritto (TUI Engineer)
**Date:** 2026-03-01
**What:** Multi-line user messages in the Static scrollback use `split('\n')` with a column layout: first line gets the `❯` prefix, subsequent lines get `paddingLeft={2}` for alignment.
**Why:** Ink's horizontal `<Box>` layout doesn't handle embedded `\n` in `<Text>` children predictably when siblings exist. Explicit line splitting with column flex direction gives deterministic multi-line rendering.
**Impact:** Any future changes to user message prefix width must update the `paddingLeft={2}` on continuation lines to match.

### 2026-03-01: Elapsed time display — inline after message content
**By:** Cheritto (TUI Engineer)
**Date:** 2026-03-01
**Issue:** #605
**What:** Elapsed time annotations on completed agent messages are always rendered inline after the message content as `(X.Xs)` in dimColor. This applies to the Static scrollback block in App.tsx, which is the canonical render path for all completed messages.
**Why:** After the Static scrollback refactor, MessageStream receives `messages=[]` and only renders live streaming content. The duration code in MessageStream was dead. Moving duration display into the Static block ensures it always appears consistently.
**Convention:** `formatDuration()` from MessageStream.tsx is the shared formatter. Format is `Xms` for <1s, `X.Xs` for ≥1s. Always inline, always dimColor, always after content text.

### 2026-03-01: Banner usage line separator convention
**By:** Cheritto (TUI Engineer)
**Date:** 2026-03-01
**What:** Banner hint/usage lines use middle dot `·` as inline separator. Init messages use single CTA (no dual-path instructions).
**Why:** Consistent visual rhythm. Middle dot is lighter than em-dash or hyphen for inline command lists. Single CTA reduces cognitive load for new users.
**Impact:** App.tsx headerElement. Future banner copy should follow same separator and single-CTA pattern.

### 2026-03-02: REPL casting engine design
**By:** Fenster (Core Dev)
**Date:** 2026-03-02
**Status:** Implemented
**Issue:** #638
**What:** Created `packages/squad-cli/src/cli/core/cast.ts` as a self-contained casting engine with four exports:
1. `parseCastResponse()` — parses the `INIT_TEAM:` format from coordinator output
2. `createTeam()` — scaffolds all `.squad/agents/` directories, writes charters, updates team.md and routing.md, writes casting state JSON
3. `roleToEmoji()` — maps role strings to emoji, reusable across the CLI
4. `formatCastSummary()` — renders a padded roster summary for terminal display

Scribe and Ralph are always injected if missing from the proposal. Casting state is written to `.squad/casting/` (registry.json, history.json, policy.json).
**Why:** Enables coordinator to propose and create teams from within the REPL session after `squad init`.
**Implications:**

### 2026-02-28: Init flow reliability — proposal-first before code

**By:** Keaton (Lead)
**Date:** 2026-02-28
**What:** Init/onboarding fixes require a proposal review before implementation. Proposal at `docs/proposals/reliable-init-flow.md`. Two confirmed bugs (race condition in auto-cast, Ctrl+C doesn't abort init session) plus UX gaps (empty-roster messaging, `/init` no-op). P0 bugs are surgical — don't expand scope.
**Why:** Four PRs (#637–#640) patched init iteratively without a unified design. Before writing more patches, the team needs to agree on the golden path. Proposal-first (per team decision 2026-02-21).
**Impact:** Blocks init-related code changes until Brady reviews the proposal.
- Kovash (REPL): Can call `parseCastResponse` + `createTeam` to wire up casting flow in shell dispatcher
- Verbal (Prompts): INIT_TEAM format is now the contract — coordinator prompt should emit this
- Hockney (Tests): cast.ts needs unit tests for parser edge cases, emoji mapping, file creation

### 2026-03-02: REPL empty-roster gate — dual check pattern
**By:** Fenster (Core Dev)
**Date:** 2026-03-02
**What:** REPL dispatch is now gated on *populated* roster, not just team.md existence. `hasRosterEntries()` in `coordinator.ts` checks for table data rows in the `## Members` section. Two layers: `handleDispatch` blocks with user guidance, `buildCoordinatorPrompt` injects refusal prompt.
**Why:** After `squad init`, team.md exists but is empty. Coordinator received a "route to agents" prompt with no agents listed, causing silent generic AI behavior. Users never got told to cast their team.
**Convention:** Post-init message references "Copilot session" (works in VS Code, github.com, and Copilot CLI). The `/init` slash command provides same guidance inside REPL.
**Impact:** All agents — if you modify the `## Members` table format in team.md templates, update `hasRosterEntries()` to match.

### 2026-03-02: Connection promise dedup in SquadClient
**By:** Fenster (Core Dev)
**Date:** 2026-03-02
**What:** `SquadClient.connect()` now uses a promise dedup pattern — concurrent callers share the same in-flight `connectPromise` instead of throwing "Connection already in progress".
**Why:** Eager warm-up and auto-cast both call `createSession()` → `connect()` at REPL startup, racing on the connection. The throw crashed auto-cast every time.
**Impact:** `packages/squad-sdk/src/adapter/client.ts` only. No API surface change.
