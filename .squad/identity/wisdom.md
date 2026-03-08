---
last_updated: 2026-03-08T00:00:00Z
---

# Team Wisdom

Reusable patterns and heuristics learned through work. NOT transcripts — each entry is a distilled, actionable insight.

## Patterns

**Pattern:** Tests reading live .squad/ files must be name-agnostic — assert structure/behavior, not specific agent names. Names change during team rebirths.
**Context:** Tests like ralph-triage.test.ts and docs-build.test.ts broke on every rebirth when hardcoding names.

**Pattern:** Dynamic filesystem discovery over hardcoded lists for test assertions on evolving content (blogs, docs pages).
**Context:** Blog additions/deletions broke CI when test had hardcoded EXPECTED_BLOG array.

**Pattern:** cli-entry.ts has a recurring "unwired command" bug class — implementations exist but aren't routed. Always verify command wiring after any cli-entry.ts rewrite. The cli-command-wiring.test.ts test catches this.
**Context:** Issues #224, #236, #237 all had the same root cause: Brady's cli-entry.ts rewrites overwrote earlier wiring.

**Pattern:** bump-build.mjs mutates versions during local builds despite SKIP_BUILD_BUMP env var. Set versions with `node -e` script and commit IMMEDIATELY before building.
**Context:** v0.8.22 and v0.8.23 both hit version reversion during builds. P0 fix item in CI/CD PRD.

## Anti-Patterns

**Anti-Pattern:** 4-part versions (e.g., 0.8.21.4) are NOT valid semver. npm mangles them (0.8.21.4 → 0.8.2-1.4). Never use them.
**Context:** v0.8.22 release incident where mangled version was published to npm.

**Anti-Pattern:** `git reset --hard` with unstaged changes wipes work. Always commit or stash before switching branches.
**Context:** Fortier's ESM runtime patch was lost during v0.8.24 sprint cleanup.
