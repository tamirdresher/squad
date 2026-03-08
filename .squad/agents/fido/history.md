# FIDO

> Flight Dynamics Officer

## Learnings

### Name-Agnostic Testing Pattern
Tests reading live .squad/ files (team.md, routing.md) must assert structure/behavior, not specific agent names. Names change during team rebirths. Two classes of tests: (1) live-file tests — must survive rebirths, use property checks, (2) inline-fixture tests — self-contained, can hardcode names. See ralph-triage.test.ts for the canonical pattern.

### Dynamic Content Discovery
Blog tests in docs-build.test.ts use filesystem discovery (readdirSync) instead of hardcoded arrays. Adding/removing blog posts no longer requires updating the test. Pattern: discover from disk, sort, validate build output exists.

### Test Baseline (Post-v0.8.24)
3,931 tests passing, 46 todo, 5 skipped, 149 test files (~89s). Only failure: aspire-integration.test.ts (needs Docker daemon). Speed gates in speed-gates.test.ts enforce UX budgets (help output <100 lines, init <10s, etc.).

### Command Wiring Regression Test
cli-command-wiring.test.ts prevents the "unwired command" bug: verifies every .ts file in packages/squad-cli/src/cli/commands/ is imported in cli-entry.ts. Bidirectional validation — also checks that every import points to an existing file.
