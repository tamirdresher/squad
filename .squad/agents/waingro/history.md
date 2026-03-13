# Waingro — History

## Core Context

### Project & Stack
- **Project:** Squad — programmable multi-agent runtime for GitHub Copilot
- **Owner:** Brady
- **Stack:** TypeScript (strict, ESM), Node.js ≥20, Ink 6 (React for CLI), Vitest
- **CLI entry:** packages/squad-cli/src/cli-entry.ts
- **Key concern:** Cross-platform (Windows + macOS + Linux), TTY and non-TTY modes

### QA Mission
- Waingro owns hostile QA scenarios, real-world dogfood testing, first-time user experience validation, CI/CD integration verification, stress testing
- Goal: Find friction before users do

### Testing Methodology
- **Dogfood fixtures:** 8 realistic scenarios at `test-fixtures/dogfood/` (python-flask, node-monorepo, go-project, mixed-lang, deep-nested, minimal-repo, many-agents, corrupt-state)
- **Hostile QA corpus:** `test/acceptance/fixtures/nasty-inputs.ts` has 80+ adversarial strings
- **Acceptance tests:** Gherkin `.feature` files with `hostile-steps.js` step registry
- Test both built CLI (`packages/squad-cli/dist/cli-entry.js`) and root bundle (`cli.js`)

### Known Patterns & Anti-Patterns
- **Acceptance test step registration order matters:** Greedy regex patterns like `I run "(.+)"` must be registered AFTER more-specific patterns
- **Non-TTY mode critical:** CLI must gracefully handle piped input (CI/CD context)—no Ink crashes
- **Error messages:** Should not show debug output by default (SQUAD_DEBUG=1 required)
- **Status command:** Must distinguish local vs inherited .squad/ directories

### Quality Baseline
- Hostile QA (32 scenarios across 7 categories): All pass—CLI robust
- Dogfood testing: Happy path solid; 4 UX issues found (#576, #579, #580, #581)
- Priority for releases: P1 issues block CI & onboarding, must ship before public releases

### Key File Paths
- CLI entry: `packages/squad-cli/src/cli-entry.ts`
- Test fixtures: `test-fixtures/dogfood/` (8 scenarios)
- Hostile inputs: `test/acceptance/fixtures/nasty-inputs.ts`
- Acceptance tests: `test/acceptance/*.feature`, `test/acceptance/hostile-steps.js`

## Learnings

### 2026-03-01: Screenshot Review Session 2 — Hostile QA on Human Testing Screenshots

**Status:** Completed. Brady requested full team review of 15 REPL screenshots.

**Finding:** P0 blocker — assembled vs empty roster contradiction
- Contradictory state messaging confuses users
- Conflicting data validity signals
- Root cause likely shared with Keaton's phantom team finding and Marquez's confusing @your lead placeholder

**P1 Friction (3 points):**
- In-REPL command confusion (discoverability issue)
- Screen corruption (blocks testing)

**Cross-team alignment:** Independent finding by Keaton confirms systemic state coherence issue, not isolated messaging problem.

### 2026-02-25: Dogfood Testing Wave 2 — Run CLI Against Scenarios (Issue #532)

**Mission:** Test CLI against 8 dogfood fixture scenarios. Discover UX issues and file GitHub issues.

**Test Coverage:**
- Built CLI vs root bundle tested
- Basic commands: `--version`, `--help`, `status`, `doctor`, invalid commands
- Non-TTY mode (piped input)
- Fixtures: python-flask, node-monorepo, many-agents (20 agents), corrupt-state, minimal-repo

**UX Issues Filed:**
| # | Issue | Severity | Type | Root Cause |
|---|-------|----------|------|-----------|
| #576 | Shell launch fails in non-TTY piped mode (`Raw mode not supported`) | P1 | Crash | Ink requires TTY; no graceful fallback for pipes |
| #579 | Status shows parent .squad/ as if local | P2 | Incorrect output | Walks up dir tree but doesn't distinguish local vs inherited |
| #580 | Help overwhelms new users (44 lines, 16 commands) | P1 | UX churn risk | No tiering of core vs advanced commands |
| #581 | Error messages show debug output without SQUAD_DEBUG set | P2 | Log noise | `fatal()` always prints [SQUAD_DEBUG] label |

**Key Findings:**
✅ Good: Status, doctor, help commands functional; invalid command errors user-friendly; all fixtures work; built entry point solid
⚠️ Issues: Non-TTY crashes, help text drowns users, error output noisy, status misleads about inherited config

**Priority:** #576 (blocks CI) > #580 (churn risk) > #581 > #579

### 2026-02-23: Hostile QA — Issue #327

**Tested 32 adversarial scenarios across 7 hostile condition categories:**
- Tiny terminal (40x10): All 5 pass. CLI degrades gracefully at small sizes.
- Missing config: All 5 pass. CLI works without .squad/ directory.
- Invalid input: All 5 pass. Control chars, 10KB+ args, empty/whitespace handled.
- Corrupt config: All 5 pass. Empty .squad/, invalid content, .squad-as-file all survive.
- Non-TTY pipe mode: All 4 pass. Version/help/status/error all work piped.
- UTF-8 edge cases: All 5 pass. Emoji, CJK, RTL, zero-width, mixed scripts handled.
- Rapid input: All 3 pass. 5 concurrent, alternating, parallel commands stable.

**Bugs Found:**
1. `--version` output omits "squad" prefix (outputs bare version number)
2. Empty/whitespace CLI args trigger interactive shell launch in non-TTY mode
3. Node.js rejects null bytes in spawn args—CLI should sanitize before spawn

**Pattern:** Corrupt .squad/ configurations handled gracefully—no crashes or unhandled exceptions.
