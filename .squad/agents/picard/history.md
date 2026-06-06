# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI architecture, routing invariants, extensibility design, API surface decisions
- **Created:** 2026-06-02T10:30:00Z

## Picard — Core Mission

Picard (Lead Architect) owns product architecture decisions, extension-point evaluation, routing invariant protection, and implementation readiness gates. Architecture reviewer for Squad.Agents.AI auth expansion.

## 2026-06-03 — Docs-Must-Match-Implementation Directive (Code-First Priority)

**Status:** LOCKED for all future PR work

Critical behavioral directive from Copilot: Implementation drives documentation; if code and docs conflict, fix code first, never revert code to match outdated docs. Applied to PR #1200 and all future Squad.Agents.AI work. Picard must enforce this as architectural law.

---

## 2026-06-04 — PR #1200 Work Summary

### Completed Tasks

1. **Review Verdict** — Triaged all 9 concerns from PR #1200 review comment 4621356216. Verdict: SHIP-WITH-FOLLOWUP (block on concern G CI YAML until cheap fix applied).

2. **Concern G Fix** — Reverted .github/workflows/squad-ci.yml to merge-base, re-applied 6 semantic lines. Added .gitattributes entry *.yml text eol=lf. Commit: 19b4f83.

3. **PR Body + Follow-up Issue Draft** — Drafted accurate PR body with test counts and follow-up issue scope covering concerns A, I, E, F, C-residual, D-residual.

### Status

- ✅ Verdict delivered
- ✅ Concern G fixed and ready
- ✅ PR body and follow-up drafts ready for coordinator
- �� Follow-up issue: #1211 filed and linked

---

## Archived Work

All detailed decision records from prior sprints have been archived to .squad/agents/picard/history-archive/before-2026-06-04.md. This file was summarized on 2026-06-04T11:50:00Z to maintain the 15KB hard gate on history.md.

## Learnings

### 2026-06-04 — SDK API -> CLI command + Ralph capability + workflow integration pattern (Round 5, P0.3 A3)

When wiring an SDK API into production code paths, use the three-tier `ladder''
so the same logic is callable from operators, autonomous loops, AND CI:

1. **CLI command (tier 1, operator-facing).**
   - File: `packages/squad-cli/src/cli/commands/<noun>.ts` with a `run<Verb>`
     exported async function returning `Promise<number>` (process exit code).
   - Dispatch from `packages/squad-cli/src/cli-entry.ts` with a single
     `if (cmd === 'noun') { await runNoun(getSquadStartDir(), args.slice(1)); }`.
   - Resolve squad/repo paths via `resolveSquadPaths` then `resolveStateBackend`;
     use `instanceof` to narrow to the concrete backend (e.g. `TwoLayerBackend`)
     so backend-specific methods like `promoteNotes` are accessible without casts.
   - No-op cleanly when the active backend does not support the operation —
     `squad notes promote` on a worktree repo prints a one-line note and returns 0
     instead of erroring.
   - Provide `--dry-run` whenever the operation writes state.

2. **Ralph capability (tier 2, autonomous heartbeat).**
   - File: `packages/squad-cli/src/cli/commands/watch/capabilities/<noun>.ts`
     implementing the `WatchCapability` contract (name, phase, preflight, execute).
   - Register in `watch/capabilities/index.ts`'s `createDefaultRegistry()`.
   - Prefer idempotent operations and throttle with `everyNRounds` (default 5)
     so heartbeat output stays readable. Idempotency is what lets you skip the
     complicated PR-merge detection — just run it every N rounds; if there is
     nothing to do, it returns near-instantly.
   - Phase = `housekeeping` for janitorial work (lane with `CleanupCapability`).
   - Preflight should fail FAST and CHEAP for non-applicable backends so the
     capability self-disables on local/worktree/orphan setups.

3. **Workflow integration (tier 3, CI/PR-merge).**
   - The heartbeat workflow `.github/workflows/squad-heartbeat.yml` already
     triggers on `pull_request: types: [closed]`, but it invokes
     `.squad/templates/ralph-triage.js` (a generated script), NOT the
     watch-capability registry. So tier-2 does not transitively cover tier-3.
   - The clean integration is a separate `npx @bradygaster/squad-cli notes
     promote --all` step in the workflow YAML conditioned on
     `github.event.pull_request.merged == true`. Skipped this round only
     because the workflow YAMLs were being constantly rewritten by Windows
     autocrlf (whitespace-only diffs against the 4 SYNC copies); will land
     in a separate clean commit when the CRLF drift is addressed.

### Key SDK export discipline

When adding a new SDK consumer API (e.g. `TwoLayerBackend.promoteNotes`):
- Re-export the CONCRETE CLASS from `packages/squad-sdk/src/index.ts`, not
  just the interface. CLI code needs `instanceof TwoLayerBackend` to narrow
  from the generic `StateBackend` returned by `resolveStateBackend`.
- Also re-export the RESULT TYPE (`PromoteNotesResult`) so call sites can
  type the return value without reaching into the source file.
- Round 4 audit caught a bug born from this exact oversight: `promoteNotes`
  was exported in the source file but never re-exported from index.ts — zero
  callers existed, and the API silently rotted for a release cycle.

### Upgrade-migration cleanup invariant (F1)

For any `squad upgrade --state-backend X -> Y` transition that copies state
from working tree to a branch-backed store, the upgrade MUST delete the
working-tree copies in the same step. Leaving them produces:
- Stale content shadowing the new source of truth (agents may read either copy).
- `git status` noise that hides real changes.
- Confusion about which file is authoritative across team checkouts.

`liftInitMutableStateOntoOrphan` already implemented the right pattern for
fresh `squad init` — `migrateStateBackend` should mirror it. The rule:
"if I wrote it to orphan, I delete it from working tree; if I left it in
working tree, I have not actually migrated it."


## Learnings (2026-06-05 — squad-agents-ai dev → main release research)

Squad's release process is **3-branch, not 2-branch**: dev → preview → main.
Direct dev → main bypasses the preview-branch path-stripping guard
(`.ai-team/`, `.squad/`, `.ai-team-templates/`, `team-docs/`,
`docs/proposals/` are stripped en route to preview).

Key files (all in bradygaster/squad):
- `docs/src/content/docs/scenarios/release-process.md` — canonical 3-branch
  workflow + sample prompts (Kobayashi-targeted).
- `docs/_internal/release-checklist.md` — patch / minor / major split:
  patch = bug fixes only, minor = new features w/ back-compat, major =
  breaking / significant refactor. Both define the version-bump steps and
  CHANGELOG entry format.
- `.github/workflows/squad-promote.yml` — manual dispatch (`workflow_dispatch`)
  with `dry_run` input. Two jobs in series: `dev-to-preview` (merges with
  `-X theirs`, strips forbidden paths from the index, commits, pushes
  preview) and `preview-to-main` (merges preview with `--no-ff`, pushes
  main). Validates `## [VERSION]` exists in CHANGELOG.md before merging
  preview → main.
- `.github/workflows/squad-preview.yml` — push-trigger on preview, validates
  version-in-CHANGELOG, no `.ai-team/` / `.squad/` tracked, runs
  `node --test test/*.test.cjs`.
- `.github/workflows/squad-release.yml` — push-trigger on main, validates
  version-in-CHANGELOG, reads version, checks tag-not-existing, creates
  `vX.Y.Z` tag, `gh release create --generate-notes --latest`.
- `.github/workflows/squad-npm-publish.yml` — release:published trigger.
  4 sequential jobs: preflight (no `file:` deps + lockfile stability +
  semver), smoke-test (`npm pack --dry-run` + cli-packaging-smoke.test.ts),
  registry-check (`npm ping`), publish-sdk → publish-cli with
  `--access public --provenance`. NO explicit `--tag` flag — defaults
  to `latest` for clean semvers, must use insider workflow for prereleases.
- `.github/workflows/squad-insider-publish.yml` — manual dispatch only,
  publishes to `insider` dist-tag. This is the de-facto RC channel.

Conventions discovered:
- Tag format: `vX.Y.Z` (lowercase v prefix, must match package.json).
- Semver suffixes accepted: `-preview.N` and `-insider.N` (per
  `ci(policy)` commits `5bef8f28` / `4da11839`).
- CHANGELOG sections: Added / Changed / Fixed / Breaking Changes / Community.
- Release blog convention: `docs/src/content/blog/NNN-vX_Y_Z-release.md`,
  frontmatter (title / date / author / wave / tags / status / hero), body
  starts with `> ⚠️ Experimental — Squad is alpha software` disclaimer.
  Author field is typically `McManus (DevRel)` or `PAO (DevRel)`.
- Three-package version sync required: root + `packages/squad-sdk` +
  `packages/squad-cli` `package.json`. Drift breaks the publish workflow's
  "Verify package version matches target" step.
- Changesets: Squad has `.changeset/` with `commit: false`,
  `baseBranch: dev`. 110 changeset files exist but no `version-packages`
  script — they're organisational logs only, NOT used to compute versions.
  Versions are bumped manually.
- Sync-back: After every release ships from main, `chore/sync-from-main`
  PR brings main back to dev. The v0.9.4 cycle skipped this, leaving dev
  36 behind on 2026-06-05 — must be done as Phase 0 of v0.10.0.
- npm dist-tags as of 2026-06-05: `latest=0.9.4`, `insider=0.9.6-insider.3`,
  `preview=0.8.17-preview`. The `preview` tag is a stale npm tag from
  before the 3-branch model — current preview lives on the `preview` GIT
  branch, not as an npm dist-tag.
- Squad's `--latest` policy: `squad-release.yml` always passes
  `gh release create --latest`, which is wrong for prereleases — but
  for prereleases the team uses the insider workflow which doesn't go
  through release.yml. So the convention is: only push to main when you
  intend `latest`.

Risk patterns observed in v0.9.4 cycle (from `git log dev..main`):
- "revert all code to insider versions for clean promotion" → restore →
  re-revert spiral suggests preview-branch + path-strip approach is fragile
  when dev contains forbidden files. The current `squad-promote.yml` with
  `-X theirs + git rm --cached` is the cleanup, but it can still produce
  surprising diffs. **Always run dry_run first.**
- Direct contributor PRs to main (`#1078` vejadu, lockfile fix) bypassed
  dev — must be either avoided or sync-back must happen reliably.



### 2026-06-05 — Phase 0 sync main→dev — execution learnings (after Worf rejection)

Context: Worf rejected the coordinator's first sync attempt because the
pre-flight scout was wrong on 4 verifiable counts. Picard re-executed
with corrected map. PR #1212 opened cleanly, merge SHA 9581eb2f, lint
green, 14 conflicts resolved exactly as predicted.

**What matched the plan exactly:**
- Trial-merge conflict count = 14 (matches Worf's count to the file).
- All 11 standard conflicts resolved cleanly via `--ours` (favor dev).
- Special case A (changeset deletion): `git rm` worked, no orphans.
- Special case C: dev's 25KB version was a complete superset of main's
  8KB restore — zero unique content to preserve. The "PR #1023 restore
  of OLDER content" hypothesis was correct.
- `npm install` regenerated the lockfile in 3s with no integrity issues.
- `npm run lint` (tsc --noEmit on both packages) passed first try.

**What was a near-miss (good catch by Worf):**
- `--theirs` vs `--ours` flips depending on merge direction. When
  merging `upstream/main` INTO `dev`: `--ours` = dev, `--theirs`
  = main. The original plan had the wording ambiguous; the corrected
  tasking spelled it out explicitly. **Always write the table with the
  branch name, not the flag name.**
- Special case B's `scripts/security-review.mjs` was NOT orphaned —
  it's referenced by `.copilot/skills/security-review/SKILL.md`. The
  test was deliberate CI cleanup, the script is live. Always check
  `git ls-files | Select-String <script>` after deleting a test,
  rather than assuming co-deletion.

**Heuristic refinements for future cross-branch syncs:**

1. **Tree-diff before patch-diff.** The original scout used per-path
   summed diffs (which double-count rename/restructure) and got "200+
   conflicts." A `git ls-tree` comparison + actual `--no-commit`
   trial merge gave the real number (14). **Rule: always run a
   throwaway trial merge before sizing the work.**

2. **Date-of-commit is NOT a content-recency proxy** for "restore"
   commits. Main's state-backends.md had a newer commit date but
   contained older content because the commit was a restore from an
   even-earlier point. **Rule: for AA conflicts on docs, compare file
   sizes AND first-add commits, not just last-modified dates.**

3. **DU/UD conflicts are silent landmines.** `git checkout --theirs`
   on a UD conflict will silently delete the dev-side modified file
   without prompting. **Rule: never use bulk `--theirs`/`--ours`
   without first filtering out UD/DU/AA conflicts and handling them
   individually.**

4. **31 main-only files auto-preserved with zero action.** Picard's
   initial worry about losing main work was misplaced — git's
   three-way merge handles only-on-one-side files cleanly. **Rule:
   distinguish "files that diverge" (need conflict resolution) from
   "files only on one side" (auto-merge). Reviewer rejection saved
   us from over-engineering this.**

5. **Reviewer Rejection Protocol worked as designed.** Worf's refusal
   to push when the plan rested on unverified scout claims prevented
   silent data loss. The 15-minute delay to re-plan was net-positive.


## 2026-06-06: PR #1195 Review Finding — CONTRIBUTING.md Staleness

Cross-agent notification from Scribe:
PR #1195 review (data + worf agents, 2026-06-06 08:38 UTC) identified that CONTRIBUTING.md is stale.

Finding: Documentation should be reviewed for accuracy and completeness. This may warrant a governance review or documentation update task.

Action: Consider scheduling a CONTRIBUTING.md refresh in your governance workstream.

Source: .squad/decisions.md entry dated 2026-06-06; session log at .squad/log/2026-06-06T08-38-05Z-pr1195-review.md
