# Picard — dev → main Release Plan

**Workstream:** squad-agents-ai
**Author:** Picard (Lead / Product Architect)
**Date:** 2026-06-05
**Status:** PROPOSED (awaiting Tamir's confirmation before dispatch)
**Trigger:** PR #1200 merged into bradygaster/squad `dev` (HEAD `e6281ab4`).
User wants to ship an OFFICIAL release (npm `latest` tag, not insider).

---

## TL;DR

| Question | Recommendation |
|---|---|
| Version | **v0.10.0** (next minor) |
| Strategy | Three-branch promote: `dev → preview → main` via the `Squad Promote` workflow; main push triggers `squad-release.yml` (auto tag + GitHub Release) which triggers `squad-npm-publish.yml` (npm publish with `--latest`). |
| Merge mode | Promote workflow uses `--no-ff` merge commits. No squash. |
| 36 behind commits | **Yes, problem.** Sync `main → dev` first (Phase 0). |
| Cut RC first | **Yes — one final insider publish (`v0.10.0-rc.1`)** to flush the version drift between root/sdk/cli and to give a 24-48h soak before promoting to `latest`. |
| Other open PRs (#1161, #1115) | **Hold both.** Land them on the next cycle. They're not blockers and shouldn't expand release scope. |
| Risk | 🟡 **YELLOW** — green on validation evidence, yellow on housekeeping (version drift, behind-by, no sync-back since v0.9.4). Mitigated by Phase 0 + RC. |

---

## A. Version recommendation: **v0.10.0**

**Justification:**

1. `npm view @bradygaster/squad-cli dist-tags` confirms today's state:
   `latest=0.9.4`, `insider=0.9.6-insider.3`, `preview=0.8.17-preview`. Production
   has not advanced in ~200 dev commits.

2. The release content is too big for a patch bump (`docs/_internal/release-checklist.md`
   reserves patches for "bug fixes and patches with no new features"):
   - State-backend two-layer rewrite (Git-Notes + Orphan-Branch + CAS, PR #1200)
   - StorageProvider abstraction layer (FS / InMemory / SQLite + sample projects)
   - Personal Squad governance layer (#508)
   - Worktree spawning & cross-squad orchestration (#529, #446, #443)
   - Machine capability discovery + `needs:*` label routing (#514)
   - Cooperative rate limiting + circuit breaker (#515, #464, #451)
   - Full Work Monitor for `squad watch` (#708)
   - Plus 110 unmerged `.changeset/*.md` entries.

3. `release-checklist.md` defines minor as "new features with backward
   compatibility." That fits. We are not shipping breaking changes (state-backend
   migrates gracefully — see PR #1200 validation), so v1.0.0 is also out
   (and the docs still self-describe as "Experimental — Squad is alpha software").

4. `0.9.6-preview.N` was the insider RC line for what should ship as **v0.10.0
   final**. Going `0.9.4 → 0.9.6` would understate the change scope and leave
   the patch counter (5 patch versions consumed by insider builds) in a confusing
   state. `0.10.0` resets cleanly.

5. **Drop the `-preview.N` / `-insider.N` suffix.** Per `squad-release.yml`,
   `latest` requires a clean semver in `package.json` whose tag does not yet
   exist; `0.10.0` is unused.

**Version drift to fix in Phase 1:**
- root `package.json`: `0.9.6-preview.14` → `0.10.0`
- `packages/squad-sdk/package.json`: `0.9.6-preview.13` → `0.10.0`
- `packages/squad-cli/package.json`: `0.9.6-preview.15` → `0.10.0`
- (Re-verify the `--sync flag` / `bump-build.mjs` did not leave any other drift.)

---

## B. PR / merge strategy

**Squad uses a 3-branch model** (`dev → preview → main`), per
`docs/src/content/docs/scenarios/release-process.md`. **Do not** open a
direct `dev → main` PR — that bypasses the preview-branch guard which strips
forbidden paths (`.ai-team/`, `.squad/`, `.ai-team-templates/`, `team-docs/`,
`docs/proposals/`) before they ever touch `main`.

**Use the `Squad Promote` workflow** (`.github/workflows/squad-promote.yml`,
`workflow_dispatch`). It runs two jobs in series:

1. **`dev-to-preview`** — checks out `preview`, merges `origin/dev` with
   `-X theirs` and `--no-commit`, strips forbidden paths from the index,
   commits, pushes to `preview`. This triggers `squad-preview.yml` which
   validates: version-in-CHANGELOG, no `.ai-team/` or `.squad/` tracked,
   `package.json` has a version, `node --test test/*.test.cjs` passes.

2. **`preview-to-main`** — checks out `main`, merges `origin/preview` with
   `--no-ff`, pushes to `main`. The push to `main` triggers
   `squad-release.yml` which: re-runs tests, validates version-in-CHANGELOG,
   reads version, checks tag does not exist, creates `vX.Y.Z` tag, creates
   GitHub Release with `--latest --generate-notes`, verifies. The `release:
   published` event then triggers `squad-npm-publish.yml`.

**Merge mode:** `--no-ff` merge commits (workflow-enforced). No squash, no
rebase. This preserves history needed by the validation evidence and the
follow-on `chore/sync-from-main → dev` sync.

**Dry run support:** Both workflow jobs accept `dry_run: true` — recommend
running this first to preview which paths get stripped on the dev → preview
merge.

---

## C. Pre-merge checklist (sourced from release-process.md +
release-checklist.md + squad-preview.yml + squad-release.yml)

**Phase 0 — Sync `main → dev` (NEW, required because v0.9.4 cycle skipped this):**
- [ ] Open `chore/sync-from-main` branch off `dev`
- [ ] `git merge upstream/main --no-ff`
- [ ] Resolve conflicts (low risk — most diffs are dev-side feature work; the
      36 behind commits include `release/0.9.4` cleanup + #1078 dot-repo fix +
      lockfile-integrity fix; the dot-repo fix is likely already in dev under
      PR #1133, so expect a merge that brings in mostly v0.9.4 release-prep
      reverts which we then re-revert)
- [ ] PR sync branch into `dev`, merge, pull `dev`

**Phase 1 — Version + CHANGELOG (on dev, after sync):**
- [ ] Bump `package.json` to `0.10.0`
- [ ] Bump `packages/squad-sdk/package.json` to `0.10.0`
- [ ] Bump `packages/squad-cli/package.json` to `0.10.0`
- [ ] `npm install` at root to regenerate `package-lock.json` (lockfile
      stability check in `squad-npm-publish.yml` will fail otherwise)
- [ ] `CHANGELOG.md`: collapse the duplicate `## [Unreleased]` sections
      (lines 5 and 284) into a single `## [0.10.0] — 2026-06-XX` entry. Use
      the 110 changeset files as source-of-truth bullet list. Group as:
      Added / Changed / Fixed / Breaking / Community.
- [ ] `release-checklist.md` requires updating workflow files & templates for
      a minor release. Verify these files reference the new version where
      applicable: `.github/workflows/squad-preview.yml`, `squad-release.yml`,
      `templates/workflows/squad-preview.yml`, `templates/workflows/squad-release.yml`.
- [ ] Optional cleanup (do NOT block release): consume the 110 `.changeset/*.md`
      files. Squad's `.changeset/config.json` has `"commit": false` and there's
      no `version-packages` script wired — these have been organisational logs
      only. Decision: leave them in place for v0.10.0 (no breakage), open a
      followup to formalise the changeset workflow or delete the dir.

**Phase 2 — Release blog post (Picard authors, McManus/PAO style):**
- [ ] New file `docs/src/content/blog/0XX-v0100-release.md` (next number in
      sequence — current latest is `027-v0825-release.md`, so use `028-v0100-release.md`).
- [ ] Frontmatter follows `008-v040-release.md` / `024-v0823-release.md` /
      `027-v0825-release.md`: title, date, author, wave, tags, status: published, hero.
- [ ] Body sections: "What Shipped", "The Story", "Validation Evidence"
      (cite the 5-round arc + 3 P0 closures), "Breaking Changes" (none, but
      call out the state-backend migration semantics), "Community"
      (acknowledge contributors), "Upgrade Notes".
- [ ] Include the `> ⚠️ Experimental — Squad is alpha software` standard
      disclaimer used in every prior release blog.

**Phase 3 — Tests + CI green on dev:**
- [ ] `npm run lint` (tsc --noEmit on both packages)
- [ ] `npm test` (vitest)
- [ ] `node --test test/*.test.cjs` (the test set squad-preview.yml runs)
- [ ] All 6 CI workflows green on dev HEAD (already true per Tamir's status)

**Phase 4 — Optional pre-flight RC publish (recommended):**
- [ ] On dev, set versions to `0.10.0-rc.1`
- [ ] `gh workflow run squad-insider-publish.yml -R bradygaster/squad`
      (publishes under `insider` dist-tag — does NOT touch `latest`)
- [ ] 24-48h soak: smoke install (`npm i -g @bradygaster/squad-cli@insider`)
      on a clean machine, run `squad init`, `squad upgrade`, `squad watch`,
      verify state-backend two-layer paths
- [ ] If clean, set versions back to `0.10.0` final and proceed

---

## D. Post-merge steps (mostly automated)

1. **Tag** — `squad-release.yml` reads `package.json.version`, checks tag
   does not exist, creates `v0.10.0`, pushes. Format: `vX.Y.Z` (with the
   `v` prefix). Author: `github-actions[bot]`.

2. **GitHub Release** — Same workflow runs `gh release create v0.10.0
   --title v0.10.0 --generate-notes --latest`. Auto-generated notes are
   commit-based; the blog post and curated CHANGELOG entry are the
   user-facing narrative.

3. **npm publish** — `release: published` triggers `squad-npm-publish.yml`,
   which has 4 jobs in series with hard gates:
   - `preflight` — no `file:` deps in any `packages/*/package.json`,
     lockfile stability check (no stale registry URLs for workspace
     packages), valid semver in all package versions
   - `smoke-test` — `npm ci`, `npm run build`, `npm pack --dry-run` for
     both packages, `vitest run test/cli-packaging-smoke.test.ts`
   - `registry-check` — `npm ping`, `npm view @bradygaster/squad-sdk`
   - `publish-sdk` then `publish-cli` — `npm publish --access public
     --provenance`. Note: no explicit `--tag latest` — npm defaults to
     `latest` when version is a clean semver. ✓ correct for v0.10.0.

4. **Sync-back** — Per release-process.md Phase 6, open
   `chore/sync-from-main` branch off `dev`, `git merge main --no-ff`,
   PR back into `dev`. This becomes the new Phase 0 for the NEXT release —
   so we're closing the loop that v0.9.4 left open.

5. **Announce** — Publish the blog post (it's already in the merged tree),
   optional Teams / X / Discord post.

---

## E. Conflicts / blockers

**E1. The 36 behind commits (main not in dev).**
   - Root cause: v0.9.4 release in PR #1023 / #1027 had a chaotic cycle with
     "revert all code to insider versions for clean promotion" and follow-up
     restore commits, plus PRs #1078 (vejadu dot-repo fix) and the
     lockfile-integrity fix landed directly on main without sync-back.
   - **Action: Phase 0 sync-back BEFORE version bump.** Otherwise `git diff
     main..dev` has noise from `package.json` version reverts that make the
     dev → preview merge produce confusing diffs.
   - Risk: low. Most behind commits are release housekeeping; the 2-3
     real fixes are likely already present in dev under different shas
     (`#1133` covers the dot-repo fix; lockfile changes since v0.9.4 have
     been redone in dev's lockfile work).

**E2. Other open upstream PRs:**
   - **#1161 (Dependabot config, tamirdresher)** — base `main`. Defer.
     Dependabot config is independent; landing it concurrently with an
     official release adds risk for zero benefit. Land in next cycle.
   - **#1115 (vally eval suite, jongio)** — base `main`. Defer. Large
     contribution, deserves its own review window. Not a release blocker.
   - **No other PRs open against `main`.** Open PRs against `dev` (#1207,
     #1199, #1198, #1196, #1195) are out of scope — they'll ship in
     v0.10.1 / v0.11.0.

**E3. Drift between root / sdk / cli versions** (`0.9.6-preview.{14,13,15}`)
   — must converge to `0.10.0` in Phase 1. The RC publish in Phase 4 doubles
   as a forcing function to flush the lockfile.

**E4. `.changeset` directory has 110 files.** Confirmed harmless — the
   `commit: false` config means changesets are documentation only. Decision:
   keep them, address in followup. Not a blocker.

**E5. The two `## [Unreleased]` headers in `CHANGELOG.md`** (lines 5 + 284)
   — collapse into one v0.10.0 entry. The duplicate would fail the
   `squad-preview.yml` version-consistency grep if `[0.10.0]` is missing.

---

## F. Risk assessment

| Dimension | Verdict | Notes |
|---|---|---|
| State-backend correctness | 🟢 GREEN | PR #1200 had 5 validation rounds, 3 P0 closures, 6/6 CI green, CAS hardening on writers, retry + circuit breaker + startup verification |
| Test coverage | 🟢 GREEN | New tests added: state-backend, EPERM, upgrade, watch-notes-promote, doctor regressions |
| Version hygiene | 🟡 YELLOW | Three-way version drift in dev; lockfile may need regen |
| Release process compliance | 🟡 YELLOW | v0.9.4 cycle left main 36 ahead of dev; we have to fix that first |
| User-impact regressions | 🟢 GREEN | No breaking changes; state-backend migrates transparently |
| npm publish guardrails | 🟢 GREEN | Preflight + smoke-test + registry-check + provenance |
| Soak time | 🟡 YELLOW | Big change; recommend RC + 24-48h before flipping `latest` |
| **Overall** | **🟡 YELLOW** | Proceed with Phase 0 + RC. With both, this becomes 🟢 GREEN. |

---

## G. Recommended execution sequence

| # | Step | Owner | Wall-clock |
|---|---|---|---|
| 0 | Sync `main → dev`: open `chore/sync-from-main`, merge, resolve, PR, merge | Coordinator (Tamir) + Worf (conflict review) | 1-2h |
| 1 | Bump versions in root + sdk + cli `package.json` to `0.10.0-rc.1`; regen lockfile | Data | 20m |
| 2 | Pre-flight RC: dispatch `squad-insider-publish.yml`; verify on `insider` dist-tag | Coordinator | 30m |
| 3 | RC soak: smoke install on clean machine; basic flows | B'Elanna | 24-48h |
| 4 | Bump versions to `0.10.0` final; regen lockfile | Data | 15m |
| 5 | Collapse `## [Unreleased]` sections; add `## [0.10.0] — 2026-06-XX` entry from changesets + commit log | Worf (security/changelog audit) | 1h |
| 6 | Author release blog `028-v0100-release.md` | Picard | 1.5h |
| 7 | Verify lint + tests green on dev; push final commits to dev | Data | 30m |
| 8 | Dispatch `Squad Promote` workflow with `dry_run=true`; review the diff (esp. stripped paths) | Picard | 15m |
| 9 | Dispatch `Squad Promote` workflow with `dry_run=false` | Coordinator | 10m execution |
| 10 | Watch `squad-preview.yml` pass on `preview` push | Picard | 5m |
| 11 | Watch `squad-release.yml` create tag `v0.10.0` + GitHub Release on `main` push | Picard | 5m |
| 12 | Watch `squad-npm-publish.yml` (preflight → smoke → registry → publish-sdk → publish-cli) | Data | 15-25m |
| 13 | Verify `npm view @bradygaster/squad-cli@0.10.0` on registry; verify `latest` flipped | Data | 5m |
| 14 | Post-publish smoke: `npm i -g @bradygaster/squad-cli@latest` clean install + `squad init` | B'Elanna | 30m |
| 15 | Open `chore/sync-from-main` PR into `dev` (close the v0.10.0 loop for v0.10.1) | Coordinator | 15m |
| 16 | Announce: blog already live; optional social post | Picard | 15m |
| **Total** | | | **~3-4h work + 24-48h RC soak** |

---

## H. PR body draft

> Note: Squad uses the `Squad Promote` workflow, not a manual release PR.
> The "PR body" below is the **release announcement / commit message body**
> that the workflow uses (`chore: promote preview → main (v0.10.0)`)
> AND the GitHub Release notes seed.

**Title (commit + GH Release):** `Release v0.10.0 — State-backend two-layer,
StorageProvider, Personal Squad`

**Body:**

```
# Squad v0.10.0

## Highlights

- **State-backend two-layer rewrite (PR #1200)** — Git-Notes + Orphan-Branch
  backends with CAS (compare-and-swap) hardening on all writers, maxBuffer
  bumps to prevent ENOBUFS, retry with circuit breaker, startup verification,
  and root-commit anchoring for branch-switch stability. 5 validation rounds,
  3 P0 closures.
- **StorageProvider abstraction (#640)** — Pluggable I/O contract with
  FSStorageProvider (default), InMemoryStorageProvider (test), and
  SQLiteStorageProvider (portable single-file). 24-method async + sync API,
  contract test suite, sample projects (`storage-provider-azure`,
  `storage-provider-sqlite`).
- **Personal Squad governance layer (#508)** — Isolated developer workspaces
  at `~/.squad/` with own team.md / routing.md / agent roster, ambient
  discovery, `squad personal` CLI surface.
- **Worktree spawning + cross-squad orchestration (#529, #446, #443)** —
  Coordinator spawns managed worktrees for parallel agent work; long-running
  Ralph daemon with health monitoring; regression guard for worktree .git
  detection.
- **Machine capability discovery + needs:* routing (#514)** — Auto-detect
  available tools / models / hardware at session start; agents self-route
  based on `needs:*` labels.
- **Cooperative rate limiting (#515, #464, #451)** — Predictive circuit
  breaker for model token budgets; rate-limit error surfacing with recovery
  options.
- **Full Work Monitor for `squad watch` (#708)** — `--execute`, multi-platform
  (GitHub + ADO), `--monitor-teams`, `--monitor-email`, `--board`,
  `--two-pass`, `--wave-dispatch`, `--retro`, `--decision-hygiene`,
  `--max-concurrent`, `--copilot-flags`. All disabled by default.

## Breaking Changes

None at the public API surface. The state-backend migrates transparently
(see PR #1200 validation evidence). Sync `StorageProvider` variants are
deprecated and will be removed in Wave 2.

## Fixes (highlights)

- `squad init` no longer auto-runs `git init` inside a monorepo subdirectory (#939)
- ADO `az` CLI calls now use `shell: true` on Windows (.cmd resolution) (#941)
- Nap archival budget accounts for separator newlines (#123)
- gitExecMaybeMissing tokenizes args properly
- OrphanBranchBackend preserves trailing newlines on read
- `doctor` matches install-hooks git-dir resolution for worktrees
- `shell` uses effective state dir when resuming sessions
- Stale `.squad/` working-branch files cleaned after upgrade (F1)

## Validation Evidence

- 5 full validation rounds on PR #1200 (state-backend two-layer + CAS hardening)
- 3 P0 issues closed during validation (CAS gap on writers, ENOBUFS on git
  exec, branch-switch instability)
- 6/6 CI workflows green on `dev` HEAD (`e6281ab4`)
- 200 commits since `v0.9.4`
- New tests: state-backend, EPERM-success, EPERM-state-backend-continues,
  upgrade-state-backend, watch-notes-promote, doctor regressions, effective-squad-dir
- npm publish path validated: preflight `file:` deps + lockfile stability +
  semver, smoke `npm pack --dry-run` + CLI smoke test, registry health check,
  publish-sdk → publish-cli with provenance

## Acknowledgments

@tamirdresher (state-backend two-layer + PR #1200 owner), @csharpfritz
(MCP integrations), @londospark (GitHub Projects), @GreenCee
(plugin marketplace), @vejadu (dot-repo fix), @jongio (vally — landing next
cycle), @dnoriegagoodwin (SSH agent fix), Picard / Data / Worf / B'Elanna
/ Kobayashi / Ralph (the squad).

## Known Issues

- 110 unconsumed `.changeset/*.md` files in `.changeset/` — these are
  organisational logs (config has `commit: false`, no `version-packages`
  script wired). Followup tracked in v0.10.1.
- v0.9.4 → v0.10.0 sync-back was performed as Phase 0 of this release;
  `chore/sync-from-main` after this release closes the loop for v0.10.1.

## Upgrade

```bash
npm install -g @bradygaster/squad-cli@latest
squad upgrade
```

State-backend migrates transparently on first run. No manual steps required.
```

---

## I. Agent assignments (summary)

- **Picard (me, Lead/Architect):** Plan ownership, blog post draft, dry-run
  review, release-narrative coordination, sign-off gate before Step 9.
- **Data (Engineer):** Version bumps, lockfile regen, npm publish dry-run
  verification, post-publish registry verification.
- **Worf (Security/Quality):** Pre-merge audit on the CHANGELOG.md collapse
  (no info loss across the two `## [Unreleased]` blocks), Phase 0 conflict
  resolution review.
- **B'Elanna (QA):** RC soak smoke testing (Step 3), post-publish smoke
  install on clean machine (Step 14).
- **Coordinator (Tamir / Kobayashi):** Phase 0 sync-back, RC dispatch
  (`squad-insider-publish.yml`), final promote dispatch
  (`squad-promote.yml`), sync-back PR after v0.10.0.

---

## J. Decision points needing Tamir's confirmation

1. **Confirm v0.10.0** (vs 0.9.6 keeping the line, vs 1.0.0 declaring stability).
2. **Confirm RC step** (Phase 4 / Step 2-3). Adds 24-48h. Recommended.
3. **Confirm sync-back-first** (Phase 0). Recommended even though most
   behind commits are noise.
4. **Confirm hold on PRs #1161 + #1115** (defer to v0.10.1).
5. **Confirm release window** — Squad blog dates are usually a single
   calendar day; pick an actual day (e.g., 2026-06-10 to allow RC soak).

Once Tamir signs off, dispatch the agents per Section G.

---

*— Picard*
