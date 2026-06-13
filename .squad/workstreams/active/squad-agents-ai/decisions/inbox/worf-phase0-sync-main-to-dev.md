# Worf — Phase 0 sync main→dev — REJECTION

**Date:** 2026-06-05T07:12+03:00
**Reviewer:** Worf (Security & Reliability)
**Subject:** chore/sync-from-main-pre-v0100 (NOT opened)
**Verdict:** ❌ EXECUTION REJECTED — pre-flight scout was wrong on multiple
verifiable counts. Plan needs revision before merge is run.
**PR opened:** NONE. **Push performed:** NONE. **Account switch:** NONE.

---

## Why I rejected

Picard's plan rested on a coordinator pre-flight claim that I verified
**false** before touching anything destructive:

| Claim                                                       | Reality                  |
| ----------------------------------------------------------- | ------------------------ |
| "ZERO files exist only on main or only on dev"              | 39 only-on-main, 194 only-on-dev (tree diff) |
| "20 docs/, 55 .changeset, 45 templates/, 146 packages/ diff" | True (3-way diff counts) but overstates conflict surface — only 14 files actually conflict on merge |
| "031-state-backends.md appears in diff — verify on dev too" | File **does not exist on main**. Dev-only. |
| ".changeset/* on main are stale annotations"                | At least one (`apm-integration.md`) is a substantive new feature changeset (#824, APM integration / `squad skill publish`) |

User's explicit ask was: *"don't delete or override anything important
that was made directly in main."* Picard's blind heuristics
(`git checkout --theirs` for packages/, tests/, templates/, .changeset/)
would have silently dropped real main-only work AND mishandled 3 of the
14 real conflicts.

## Ground truth (from --no-commit trial merge, then aborted)

**Files preserved automatically (31, no action needed)** — including all
substantive main-only work:

- `packages/squad-cli/src/cli/commands/skill.ts` (506 lines)
- `packages/squad-cli/src/cli/commands/watch/agent-spawn.ts` (143 lines)
- 10 scripts under `scripts/` (analyze-impact, architectural-review,
  check-bootstrap-deps, check-squad-leakage, impact-utils/{parse-diff,
  report-generator, risk-scorer}, pr-readiness, repo-health-comment,
  security-review) — ~thousands of lines of CI/ops tooling
- 6 GitHub Actions workflows (squad-docs-links, squad-impact,
  squad-pr-nudge, squad-pr-readiness, squad-repo-health,
  squad-scope-check)
- 3 workflow-wiring docs (`.squad-templates/workflow-wiring-*`)
- `.squad/skills/fact-checking/SKILL.md`
- `.squad/templates/agents/challenger.md`
- 3 new changesets (apm-integration, deprecate-tunnel-rc-repl,
  fix-watch-windows-shared-fetch)
- 5 new tests (cross-package-exports, pr-readiness, scripts/parse-diff,
  scripts/risk-scorer, scripts/security-review)

**Actual conflict set: 14 files** (not 200+).

### 11 standard content conflicts (per-file decision needed; Picard's
"favor dev for code" mostly works but verify per file)

1. `.github/workflows/squad-ci.yml`
2. `.squad-templates/squad.agent.md`
3. `index.cjs`
4. `package-lock.json`  (regenerate from npm install after resolving)
5. `package.json`  (take dev — version bumped to 0.10.0 in Phase 1 anyway)
6. `packages/squad-cli/package.json` (take dev)
7. `packages/squad-sdk/package.json` (take dev)
8. `test/cli/init.test.ts` (likely take dev — state-backend changes)
9. `test/cli/upgrade.test.ts` (likely take dev)
10. `test/platform-adapter.test.ts` (likely take dev)
11. `test/template-sync.test.ts` (likely take dev)

### 3 special cases requiring explicit human/coordinator decision

**A) `.changeset/watch-p0-p1-fixes.md` — UD (dev modified, main deleted)**

- Main deleted this in 2ed7f8e0 (`fix: revert all code to insider versions
  for clean promotion`). Likely consumed by changeset bot in 0.9.4 release.
- Dev's last touch: f8b95c3d (`docs: update terminology to use current
  backend names`) — cosmetic doc cleanup on a stale-but-undeleted file.
- **Worf recommendation: ACCEPT MAIN DELETION** (`git rm` the file). The
  changeset was already consumed; dev's edit was orphan cleanup work.

**B) `test/scripts/security-review.test.ts` — DU (dev deleted, main modified)**

- Dev deleted via PR #1000/#1001 (7b4ba796, `chore: CI cleanup — delete
  ci-rerun.yml, streamline squad-ci.yml`) — **deliberate cleanup PR**.
- Main modified via 2ed7f8e0 (generic "revert to insider" commit, no
  specific intent for this test).
- Note: the merge log auto-listed this file as ADDED-FROM-MAIN too,
  because git left main's version in-tree pending decision.
- **Worf recommendation: ACCEPT DEV DELETION** (`git rm` the file). Dev
  had explicit cleanup intent in #1001; main's modification is incidental.
- ⚠️ Verify: dev's PR #1001 likely also retired the script under test.
  Confirm `scripts/security-review.mjs` is not orphaned after merge (or
  rewire to a different test).

**C) `docs/src/content/docs/features/state-backends.md` — AA (both
branches added independently)**

- Main version: 8,261 bytes. First added in eb2efb9b (`fix: restore docs
  reverted during insider→main merge (#1023)`) — a **restore** of older
  content, not new authoring.
- Dev version: 24,335 bytes. First added in 7a5b180c (`docs: add
  user-facing documentation for state backends`) — independent
  authoritative authoring.
- Picard's heuristic "preserve newer-commit-date for docs" would pick the
  wrong one here (main's restore commit is more recent date-wise but is
  rehydrated older content).
- **Worf recommendation: TAKE DEV** (`git checkout --theirs`). 3× the
  content; matches the actual state-backend feature set on dev. Spot-
  check main's 8KB version for any unique paragraphs (unlikely given it
  is a partial restore) and concatenate any genuinely new content.

## Why I aborted instead of pushing

1. Picard's plan said the conflict resolution was deterministic
   (`git checkout --theirs` for tests/packages/templates/changesets).
   That command does **delete** modify/delete conflict files without
   prompting — it would have silently retired security-review.test.ts
   on the wrong side and possibly orphaned scripts.
2. The AA conflict on state-backends.md docs is **not** resolvable by
   any `--theirs`/`--ours` shortcut and needs explicit content review.
   User specifically said "specifically the website content and the
   docs" — exactly this file.
3. Pushing+opening a PR with these silent drops would be exactly the
   "convenient lie" Worf is chartered to refuse. CI would still pass.

## Recommended next move (15 minutes)

Option 1 (preferred): Picard issues a revised tasking with the 14-file
conflict map above + explicit decisions for A/B/C. Worf re-executes
deterministically. PR opens within 30 min.

Option 2: Worf is explicitly authorized to apply the recommendations in
A/B/C as written here, then proceed with the 11 standard conflicts
under "favor dev" with manual eyes on the 4 test files.

Either way: the 31 main-only files auto-preserve. Risk of losing main
work is **zero** for those — Picard's worry on that front was misplaced.
Real risk was concentrated in the 3 special cases.

## Verifications performed

- ✅ HOME `mcp-config.json` sha256 = `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` (matches invariant, before AND after)
- ✅ Worktree returned to clean `dev` at e6281ab4 (matches `upstream/dev`)
- ✅ Trial branch `worf/sync-trial-readonly` deleted
- ✅ No remote push, no PR opened, no GitHub repo created
- ✅ No `gh auth switch` performed (account stays on
  `tamirdresher_microsoft` EMU)
- ✅ Original `dev` on fork untouched (no push to `origin`)

## Surprise log (anything that diverged from Picard's expectations)

1. **31 substantive main-only files** Picard's scout missed entirely.
   This was the highest-stakes miss because user explicitly asked us to
   preserve main work.
2. **`031-state-backends.md` is dev-only**, not main+dev. Picard's note
   "needs verification" was a tell that the scout knew this was shaky.
3. **`packages/*/bradygaster-*.tgz` build artifacts** still exist on main
   but were deleted on dev. Dev's deletion is correct (stale 0.8.25
   tarballs). These will be auto-dropped without conflict.
4. **`docs/src/content/docs/features/state-backends.md` exists on BOTH
   branches with different content** — this is an add/add (AA) conflict,
   the trickiest kind. Picard listed it as a content-drift file; it is
   not — it's parallel authoring.
5. **Conflict count is 14, not the 200+ implied by the per-path diff
   sums.** Most path-level diffs auto-merge cleanly. Picard's risk
   estimate was inflated.

---

**Filed under:** reviewer-rejection-protocol
**Pings:** @picard (replan), @data (re-run scout with `git ls-tree`
diff instead of whatever produced the wrong "zero only-on-one-side"
claim)
