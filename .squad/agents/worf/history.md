# Worf — Agent Summary (Security & Reliability Learnings)

**Last Updated:** 2026-06-24T13:33:13Z

## Core Expertise

### npm Dependency Security & Risk Assessment

**Major-Version Bump Risk Patterns:**
- Dependabot workspace lock file sync failure: `npm ci` fails with "Missing: X@Y from lock file" when Dependabot bumps workspace deps but doesn't regenerate root lock. Fix: run `npm install` locally and recommit.
- Pre-existing test failures across multiple unrelated Dependabot PRs indicate base-branch issues, not PR-caused regressions
- Peer dependency incompatibility on major bumps: TypeScript major bumps blocked if `@typescript-eslint` hasn't caught up (strict `typescript@<X.0.0` upper bound); vitest and coverage tools must bump together (exact peer dep matching)
- Pre-1.0 semver ranges hide major changes: `^0.57.2` → `0.219.0` is technically "minor" but represents massive functional restructuring; treat version jump magnitude (not just semver label) as risk signal when jump >50 minor versions

**Vulnerability Detection:**
- Postinstall patching scripts break silently on major dep bumps if internal build structure changes; look for `"postinstall"` scripts referencing `node_modules/` paths
- vscode-jsonrpc and StreamJsonRpc are security-sensitive surfaces requiring explicit audit when bumped
- CVE pinning in Central Package Management repos: use direct `<PackageReference>` promotion to consuming projects rather than repo-wide transitive pinning for narrow CVE fixes (avoid cascade risk)

### Code Security & Correctness Issues

**High-Priority Blockers:**
- Boolean logic inversions in security guards: `||` vs `&&` errors (e.g., `routing.ts` @mention guard) create live routing regressions immediately on next session
- Unescaped user input in RegExp constructors: directly concatenating user input into `new RegExp()` causes `SyntaxError` on malformed input (e.g., `a+(b`)
- Permanent error caching: catch-and-cache patterns without retry/reset paths can break entire services if initialization fails transiently (e.g., `state-mcp.ts` `initError` caching forever)

**Medium-Priority Issues:**
- Backup file overwrites without rotation: hardcoded backup names get silently clobbered on successive updates (sets false sense of safety)
- Tool map / registry rebuilds on every invocation (low runtime impact but suggests incomplete caching strategy)
- Path traversal via unvalidated relPath: conditions like `.startsWith('.squad/')` without path normalization can be bypassed by `..` components (theoretical under current code paths but worth hardening)

**Low-Priority Code Smells:**
- Dead variables after copy-paste edits (e.g., `baseDir` computed but unused)
- Regex fragility with edge-case characters: non-greedy `[\s\S]*?` terminates at first bracket, failing if agent role strings contain `]` characters

### CI Gates & Test Infrastructure

- Test suite failure across multiple PRs = base-branch issue (not PR-specific). Use `gh run list --repo <repo> --workflow <file> --branch dev --limit 5` to verify
- Policy gates (changelog validation, prerelease version checks, publish scope enforcement) remain effective even when other test suites fail; don't cascade false positives
- Fence-parity validation in markdown requires anchored regex (`^```/gm` not `/```/g`) to avoid false positives in tables/inline code; unanchored patterns create phantom single-line blocks

### Supply Chain & Transitive Dependency Security

**Central Package Management (CPM) Patterns:**
- `<PackageVersion>` entry alone is insufficient for transitive pinning; requires either (A) `CentralPackageTransitivePinningEnabled: true` (repo-wide, high risk) or (B) direct `<PackageReference>` in consuming projects (narrow, safe)
- MessagePack CVE GHSA-hv8m-jj95-wg3x fix: pin to 2.5.301 (patch within same minor line as StreamJsonRpc 2.22.x requirement); avoid major-version skew of intermediate transitive deps
- For purely-transitive CVE pins, promote the package to direct reference in affected project(s) rather than enabling repo-wide transitive pinning
- Always grep `PackageReference Include="<name>"` before assuming a CPM bump will land; the "Overrides" label is misleading if packages are only direct-referenced

## Risk Signal Hierarchy

| Priority | Pattern | Action |
|----------|---------|--------|
| BLOCKER | CI test failures + PR-introduced code | Fix tests or get waiver |
| BLOCKER | Boolean logic inversions in security guards | Fix immediately; creates live regression |
| HIGH | Unescaped user input in dynamic contexts | Escape before use; prevents injection/errors |
| MEDIUM | Permanent error caching without retry | Add reset path or allow retry |
| LOW | Silent backup overwrites | Document or implement rotation |
| LOW | Code smells (dead vars, fragile regex) | Address on next refactor |

## Recent Findings (2026-06-24)

**PR bradygaster/squad#1383 — "fix: CLI and upgrade bug fixes"**
- **Finding S-1 (HIGH):** `routing.ts` boolean logic flaw — `allKnownAgents.includes(agentName) || agentName !== 'coordinator'` routes ANY `@word` (except `@coordinator`) to agent dispatch, bypassing routing rules
- **Finding S-2 (LOW):** `onboarding.ts` unescaped regex input — `agentName` directly concatenated into `RegExp` without escaping
- **Finding S-3 (LOW):** `upgrade.ts` no backup rotation — fixed filename silently overwrites on each upgrade
- **Finding R-1 (BLOCKER):** CI test gate red; both failures introduced by PR (correctness regression in `addAgentToConfig`)
- **Finding R-2 (MEDIUM):** `state-mcp.ts` permanent error caching — `initError` cached forever with no retry/reset path
- **Finding R-3 (LOW):** Tool map rebuilt on every CallTool invocation instead of cached once
- **Finding R-4 (LOW):** Dead variable `baseDir` in build.ts
- **Finding R-5 (LOW/THEORETICAL):** Unvalidated `relPath` path traversal in build.ts

**Verdict:** CONCERNS — Do not merge until blockers + high-priority fixes resolved. Coordinated with Data agent on identical @mention guard blocker finding.

**CROSS-AGENT NOTE (2026-06-24, Scribe — PR #1383 review):** Coordinated with Data. Converged on critical blocker: `routing.ts` @mention guard uses `||` instead of `&&`, creating live routing regression. Worf's complete findings: 5 issues (1 blocker + 4 required fixes), including permanent error caching in `state-mcp.ts` (medium priority) and unescaped regex input in `onboarding.ts` (low). Verdict: CONCERNS / Do not merge. Decision merged to .squad/decisions.md.
