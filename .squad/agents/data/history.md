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
