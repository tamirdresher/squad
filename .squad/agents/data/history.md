# Data — Agent Summary (Consolidated Learnings)

**Last Updated:** 2026-06-24T13:33:13Z

## Areas of Expertise

### TypeScript & Monorepo Tooling
- TypeScript 6 breaking changes: Node globals now require explicit `"types": ["node"]` in tsconfig (no auto-injection)
- Dependabot monorepo lockfile drift: always use `npm install` (not `npm ci`) to fix mismatches; Dependabot updates workspace package.json but fails to regenerate root lock
- `@typescript-eslint` v8 latest already supports TypeScript 6; v9 doesn't exist as of 2026-06-16
- Coordinating multiple related Dependabot PRs into one consolidated PR reduces friction and ensures lockfile regeneration catches all transitive changes simultaneously

### NPM Ecosystem & Dependency Management
- Pre-existing test failures on base branch can mask PR-induced failures; always check if failures appear across multiple unrelated Dependabot PRs before attributing to the PR itself
- Major version bumps (or large minor jumps) will surface API incompatibility in CI; test suite is effective at discovering integration issues when real version jumps occur
- OpenTelemetry 0.57.2 → 0.219.0 is a massive bump with breaking API changes (e.g., Resource constructor); respect intermediate compatibility bands when upgrading transitive deps
- Dev-dependency patches (e.g., typedoc-plugin-markdown) are low-risk; lockfile sync alone unblocks the PR if CI gates pass

### Astro & Static Site Generation
- Astro 5→6: config location change (`src/content/config.ts` → `src/content.config.ts`); this is fatal and surfaces as LegacyContentConfigError
- Astro 6 replaced `ViewTransitions` from `astro:transitions` with `ClientRouter`; audit all `astro:*` imports when bumping major versions
- Two independent breaking changes can surface from single major-version bump; both must be fixed for build to succeed

### Code Review & Framework Correctness
- Squad `resolveModel` pattern (5-layer resolver in config/models.ts) is canonical; new config-resolution code should mirror this shape for consistency
- Two `resolveModel` functions exist (one in config/models.ts, one in agents/model-selector.ts); callers matter — lifecycle spawn path uses the older one and misses persistent config layers
- Type duplication (same union in 3+ places) is a code smell; should consolidate on future enum additions
- Stale-session impact: routing logic errors (like `||` vs `&&` in mention guards) take effect immediately on next session, making live regressions a serious concern for all users

### Documentation & CI Gates
- Markdown validation is strict: fence count must be even, code blocks non-empty; single-fence errors cascade to all dependent PRs
- Fence regex must be anchored to line start (`^```/gm` not `/```/g`) to avoid false positives in table cells and inline code spans
- Documentation files can become CI bottleneck; validate .md files before committing to investigation

### State Backend Expertise
- Node.js `execFileSync` default `maxBuffer` = 1 MB is silent killer for large git outputs (30k commits exceeds limit)
- Fix: `maxBuffer: 256 * 1024 * 1024` in all git wrapper functions
- Git CAS pattern: `git update-ref <ref> <new-sha> <expected-old-sha>` with jittered backoff prevents silent data loss
- ESM gotchas: Both SDK and CLI use `type: module`; CLI bin = `dist/cli-entry.js`; export paths critical for bundling
- Windows PowerShell: `^` is cmd.exe escape; use `execFileSync` array form to bypass shell

## Known Patterns & Risk Factors

1. **Path verification**: Always double-check file paths before reporting findings; use `find` or `ls -r` to verify existence
2. **Backwards-compat in SDKs**: Making resolver functions optional with inline fallbacks is established pattern for adding new resolution layers without breaking existing callers
3. **Template propagation**: Squad agent templates are duplicated across 5+ copies; any convention change requires multi-file edits
4. **Capability clamping edge case**: When requested effort is below model's minimum, clamping UP (not undefined) can silently raise cost
5. **Windows-only test failures**: Confirmed pre-existing failures in storage and scheduler tests; Linux CI is authoritative
6. **Single choke point principle**: All git invocations route through 2 wrapper functions; patch at layer not callsites

## Recent Cross-Agent Coordination

- **2026-06-24 — PR #1383 Review:** Coordinated with Worf on security & framework review. Converged on critical blocker: `routing.ts` @mention guard uses `||` instead of `&&`, creating live routing regression. Both verdicts: REQUEST CHANGES. Merged to decisions.md.

## Learnings (from PR #1383 review — 2026-06-24)

### CLI Upgrade Pattern
- `writeAgentTemplate()` diff pattern: strip the version-stamp comment (`<!-- squad-cli vX.Y.Z -->`) before comparing existing vs. template to avoid false "customized" detection on every upgrade. Useful pattern for any template-overwrite scenario where a version header is injected.
- Single `.local-backup` slot is risky for repeated upgrade runs; timestamp suffixes (`file.local-backup-YYYYMMDD`) prevent silent clobber.
- `--dry-run` in upgrade.ts: runs the detection logic early and returns before any writes; the preview block is cleanly separated from the write path via early return.

### Lazy MCP Init Pattern
- Deferring `createStateMcpToolRegistry()` to first tool call via a closure with error-memoization is the correct pattern for any MCP server that performs I/O at startup. Allows the transport connection to complete before state resolution. Use `initError` memoization to avoid re-throwing unhelpful errors on every subsequent call after a one-time failure.
- Rebuilding Maps (runtimeTools, toolMap) per request from a memoized registry adds minor overhead; the `toolMap` should also be memoized alongside the registry.

### Routing Guard Anti-Pattern
- `||` vs `&&` in agent-mention guards is a recurring risk. `allKnownAgents.includes(name) || name !== 'coordinator'` is almost always true (the second clause is true for any name that isn't the literal string 'coordinator'). The safe form is `&&`. Always verify boolean guard logic when the second clause is a negative equality check.

### addAgentToConfig Regex Approach
- Two regex patterns needed for squad.config.ts: `agents: [...]` object-literal style AND `.agents([...])` builder-method style. Using a non-greedy `[\s\S]*?` with a lookahead `(?=\s*[,}\)])` is the correct approach for multi-line TypeScript array matching.
- Existing test suite has a strict 80-char line-length assertion for generated code output; always validate generated template strings against this constraint before merging onboarding changes.

## Learnings (from PR #1384 review — 2026-06-24)

### OTel span attribute PII pattern
- Prompt content and long descriptions placed as OTel span attributes are a PII risk in multi-tenant backends. Use opt-in flags (`IncludeX InTraces`) or omit from spans by default; typed envelopes (in-process callbacks) are the safe surface for full content.
- `Truncate()` guards applied to prompt but not to persona.description — inconsistency to flag.

### Sample file hygiene
- Hardcoded developer machine paths in committed sample files are a common regression: always verify `SquadFolderPath` / working directory is resolved at runtime (env var, `GetCurrentDirectory()`, relative path), never a machine-local absolute.
- Dead/debug commented-out code (`//return await agent1.RunAsync(...)`) should be removed before merging samples.

## Learnings — 2026-07-04

- **npm global installs on Windows with admin-owned prefix:** When 
pm config get prefix points to an admin-writable dir like C:\ProgramData\global-npm and the session is unelevated, 
pm install -g fails with EPERM unlink. Workaround: install with NPM_CONFIG_PREFIX pointing to a user-writable dir that already sits earlier on `PATH` (here: C:\.tools\.npm-global). No admin, no PATH mutation, no downgrade of side-by-side tools.
- **Squad `workstreams` CLI vs filesystem workstreams:** `squad subsquads list` (alias `workstreams`) reads `.squad/streams.json` — it does NOT enumerate the file-based `.squad/workstreams/active/{slug}/` directories. This repo uses the filesystem convention (per `.squad/workstreams/README.md`), so new workstreams are created by copying `_template/` and updating the active-workstreams table by hand.
- **Squad CLI 0.11.0 install footprint:** 247 npm packages, ~35s on this machine. Ships `squad`, `squad-cli`, and `squad-test` shims.

## 2026-07-07 — CommunityToolkit/Aspire PR #1456 Review: `.squad/.cache/` Convention Verification

- **Framework Finding (M2 — MEDIUM):** Verified that `InternalsVisibleTo` declarations exist (or must exist) for all cross-assembly internal API usage when `TreatWarningsAsErrors` is enabled in production build policy. Missing declarations will fail compile under strict build settings. This applies to PR's internal API surface in Aspire SDK.

- **Framework Convention:** `.squad/.cache/` is sanctioned directory per Squad framework convention. Already gitignored (`.gitignore`:12). PR's use of `.squad/.cache/` for launcher state is correct and follows established pattern.

- **Verified API surfaces:** `--agent squad` CLI routing: correct behavior for agent-selection wiring. Public Aspire API surface: no breaking changes in this PR. SDK interop with CLI: compatible.

- **Framework Learning:** Build policy strictness (`TreatWarningsAsErrors`) surfaces framework assumptions that are often implicit. When porting code between contexts (here, Aspire SDK consuming Squad patterns), always verify that visibility/access declarations match the target build policy. Saves CI loops.

- **Cross-Agent Sync:** Worf agent (Security & Reliability) reviewed same PR, flagged `wt.exe` re-parsing vulnerability. Test brittleness finding converged (both agents flagged `Assert.DoesNotContain(";",script)` fragility). Decisions merged to shared log; both reviewers approved with suggestions.

**Last Updated:** 2026-07-07T14:01:12Z
