# FIDO

> Flight Dynamics Officer

## Learnings

### PR #404 & #403 Quality Review + Test Assertion Fix (2026-03-15T10:55:00Z)

**Context:** Reviewed two PRs from squad agents — #404 (EECOM: cross-platform fixes) and #403 (PAO: docs FAQ).

**PR #404 — Cross-Platform Filename and Config Fixes:**
- ✅ **Timestamp sanitization:** comms-file-log.ts correctly switched to safeTimestamp() utility (replaces colons with hyphens for Windows)
- ✅ **No remaining violations:** grep confirmed no toISOString() usage in filename paths across SDK
- ✅ **teamRoot removal:** Safe change — removed from init.ts to prevent baking absolute paths into config.json. resolution.ts still supports teamRoot for remote/dual-root mode when explicitly configured. Falls through to local mode when omitted.
- ⚠️ **Test coverage gap:** No unit tests specifically validate safeTimestamp() behavior or Windows filename compatibility
- **Verdict: GO** — Fixes real bugs, backward-compatible

**PR #403 — FAQ and CLI Guidance:**
- ✅ **Test discipline:** PAO correctly added 'faq' to EXPECTED_GUIDES array (7 items match disk)
- ✅ **All links verified:** client-compatibility.md, copilot-coding-agent.md, aspire-dashboard.md, team-setup.md, gitlab-issues.md, disaster-recovery.md all exist
- ✅ **Content accuracy:** FAQ correctly describes Squad CLI vs GitHub Copilot CLI usage, bot assignment workarounds, triage behavior
- **Verdict: GO** — DOCS-TEST SYNC rule followed, content accurate

**Test Assertion Sync Fix (dev branch):**
- Fixed stale EXPECTED_FEATURES array in test/docs-build.test.ts (33 → 34 items)
- Added missing 'built-in-roles' entry (feature added in PR #368 but test not updated)
- Committed directly to dev: "test: sync EXPECTED_FEATURES with built-in-roles addition" (da2dc3e)
- All 23 docs-build tests pass

**CI Failure Diagnosis:**
Both PRs show CI build failures (missing SDK exports: listRoles, searchRoles, getCategories, getRoleById, generateCharterFromRole). Investigation confirmed this is a **pre-existing issue on dev branch** (CI runs #23109355116, #23108671446 also fail). Local builds succeed. Not introduced by either PR.

**Lesson reinforced:** When reviewing PRs with CI failures, always check if dev branch has the same failures. Don't block PRs for pre-existing platform issues.
### PR #380 Quality Gate Review — FAIL (Test Assertion Sync Violation) (2026-03-14T03:35:00Z)

**TEST FAILURE:** `test/docs-build.test.ts > features directory contains all expected markdown files` — Expected 33 files, found 34.

**ROOT CAUSE:** PR #380 added `distributed-mesh.md` (new feature) and correctly added `distributed-mesh` to EXPECTED_FEATURES array. However, the base branch (dev @ dea678b) already contains `built-in-roles.md` (added in commit 83fd050, PR #368 on 2026-03-12), which was NOT in the test's expected list. The PR author updated the array to add their new feature but failed to notice the pre-existing gap.

**BASELINE COMPARISON:**
- Dev branch: 15 failures (docs-build, init tests [12 failures, missing skill templates], aspire-integration, cli-packaging-smoke)
- PR branch (before sync): Same 15 failures
- PR branch (after sync script): **3 failures** — aspire-integration (Docker), cli-packaging-smoke (npm install), and **1 NEW FAILURE in docs-build.test.ts**

**POSITIVE FINDINGS:**
- ✅ PR FIXED 12 test failures in test/init.test.ts by introducing `scripts/sync-skill-templates.mjs` and integrating it into prebuild
- ✅ Sync script works correctly (syncs 15 skills from .squad/skills/ to package templates)
- ✅ Build succeeds cleanly with sync script
- ✅ No regression in existing test coverage (4142 tests passing vs 4084 on baseline)
- ✅ `distributed-mesh.md` documentation file properly added to features directory
- ✅ No new dependencies in package.json (only build script changes)

**REQUIRED FIX:** Add `'built-in-roles'` to EXPECTED_FEATURES array in test/docs-build.test.ts. Array should be 34 items total (33 existing features + distributed-mesh).

**COVERAGE GAP:** No unit tests for the distributed mesh feature itself. PR is templates + docs only, which aligns with the stated "no code changes" design decision. Future work should add tests for mesh sync logic when implemented.

**VERDICT:** FAIL — Cannot merge until test assertion is corrected. The sync script is a major quality improvement (fixes 12 tests), but the test count mismatch must be resolved.

**Test counts:** 4113 passed, 1 failed, 34 skipped, 46 todo (PR branch with 3 suites failing: aspire [pre-existing], cli-packaging [pre-existing], docs-build [NEW]).

### Name-Agnostic Testing Pattern
Tests reading live .squad/ files (team.md, routing.md) must assert structure/behavior, not specific agent names. Names change during team rebirths. Two classes of tests: (1) live-file tests — must survive rebirths, use property checks, (2) inline-fixture tests — self-contained, can hardcode names. See ralph-triage.test.ts for the canonical pattern.

### Dynamic Content Discovery
Blog tests in docs-build.test.ts use filesystem discovery (readdirSync) instead of hardcoded arrays. Adding/removing blog posts no longer requires updating the test. Pattern: discover from disk, sort, validate build output exists.

### Test Baseline (Post-v0.8.24)
3,931 tests passing, 46 todo, 5 skipped, 149 test files (~89s). Only failure: aspire-integration.test.ts (needs Docker daemon). Speed gates in speed-gates.test.ts enforce UX budgets (help output <100 lines, init <10s, etc.).

### Command Wiring Regression Test
cli-command-wiring.test.ts prevents the "unwired command" bug: verifies every .ts file in packages/squad-cli/src/cli/commands/ is imported in cli-entry.ts. Bidirectional validation — also checks that every import points to an existing file.

### CLI Packaging Smoke Test (v0.8.24 Release Assessment)
cli-packaging-smoke.test.ts validates the PACKAGED CLI artifact (npm pack → install → execute). Tests 27 commands + 3 aliases by invoking them through the installed tarball. Catches: missing imports (MODULE_NOT_FOUND), broken package.json exports, bin script misconfiguration, and ESM resolution failures. Gate runs before both SDK and CLI publish jobs. Complements cli-command-wiring.test.ts (source-level import verification) by testing the artifact users actually download. All 32 tests passing (37s runtime). Approved for v0.8.24 release gate.

📌 **Team update (2026-03-08T21:18:00Z):** FIDO + EECOM released unanimous GO verdict for v0.8.24. Smoke test approved as release gate. FIDO confirmed 32/32 pass + publish.yml wired correctly. EECOM confirmed 26/26 commands + packaging complete (minor gap: "streams" alias untested, non-blocking).

### PR #331 Quality Gate Review — NO-GO (Blocking Issues Found) (2026-03-10T14:13:00Z)

**CRITICAL VIOLATIONS DETECTED:**

1. **Stale Test Assertions (Hard Rule Violation)** — EXPECTED_SCENARIOS array in test/docs-build.test.ts contains only 7 values ['issue-driven-dev', 'existing-repo', 'ci-cd-integration', 'solo-dev', 'monorepo', 'team-of-humans', 'cross-org-auth'], but 25 scenario files exist on disk (aspire-dashboard, client-compatibility, disaster-recovery, keep-my-squad, large-codebase, mid-project, multi-codespace, multiple-squads, new-project, open-source, private-repos, release-process, scaling-workstreams, switching-models, team-portability, team-state-storage, troubleshooting, upgrading, + 7 in array). My charter: "When I add test count assertions, I MUST keep them in sync with the actual files on disk. Stale assertions that block CI are MY responsibility to prevent." This is MY responsibility to catch.

2. **Missing EXPECTED_FEATURES Array** — PR adds 'features' to the sections list in test/docs-build.test.ts (line 46), but NO EXPECTED_FEATURES array exists. Test line 171 "all expected doc pages produce HTML in dist/" will skip features entirely. 32 feature files exist (.md files in docs/src/content/docs/features/).

📌 **Team update (2026-03-11T01:27:57Z):** PR #331 quality gate resolved. FIDO fixed test assertion sync in docs-build.test.ts: EXPECTED_SCENARIOS updated to 25 entries, EXPECTED_FEATURES array created with 32 entries, test assertions updated for features validation. Tests: 6/6 passing. Commit: 6599db6. Blocking NO-GO converted to approval gate cleared. Lesson reinforced: test assertions must be synced to filesystem state; CI passing ≠ coverage.

3. **Incomplete Test Coverage Sync** — PAO's history (line 41) states "Updated EXPECTED_SCENARIOS in docs-build.test.ts to match remaining files" after deleting ralph-operations.md and proactive-communication.md. But the diff shows ONLY a single-line change (adding 'features' to sections array). The full test update was not committed.

**POSITIVE FINDINGS:**
- ✅ CI passed (test run completed successfully on GitHub)
- ✅ Markdown structure tests pass (6/6 syntax checks)
- ✅ Docs are well-written: sentence-case headings, active voice, present tense, second person
- ✅ Cross-references valid (labels.md link verified)
- ✅ No duplicate "How It Works" heading in reviewer-protocol.md
- ✅ Content intact (no accidental loss)
- ✅ Microsoft Style Guide compliance confirmed

**ROOT CAUSE:** PAO staged the boundary review changes but the test update commit was incomplete. The assertion arrays must be synchronized before merge.

**REQUIRED FIX:** Update test/docs-build.test.ts:
1. EXPECTED_SCENARIOS = [ all 25 actual scenario files, sorted ]
2. EXPECTED_FEATURES = [ all 32 actual feature files, sorted ]
3. Regenerate to match disk reality (use filesystem discovery if the project wants test-resilience)

**VERDICT:** 🔴 **NO-GO** — Merge blocked until test assertions sync with disk state. This is a quality gate violation.

### Test Assertion Sync Fix (2026-03-10T14:20:00Z)

**Issue resolved:** Fixed stale test assertions in test/docs-build.test.ts identified during PR #331 review.

**Changes made:**
1. Expanded EXPECTED_SCENARIOS from 7 to 25 entries (matched all .md files in docs/src/content/docs/scenarios/)
2. Added EXPECTED_FEATURES array with 32 entries (matched all .md files in docs/src/content/docs/features/)
3. Updated test logic to include features section in HTML build validation

**Validation:** All structure validation tests passing (6/6). Build tests skipped as expected (Astro not installed). Arrays now accurately reflect disk state.

**Commit:** 6599db6 on branch squad/289-squad-dir-explainer

**Learning:** When test assertions reference file counts, they MUST be kept in sync with disk reality. The principle applies to ALL assertion arrays (EXPECTED_SCENARIOS, EXPECTED_FEATURES, EXPECTED_GUIDES, EXPECTED_REFERENCE, etc.). Consider dynamic discovery pattern (used in EXPECTED_BLOG) for resilience against content additions.

