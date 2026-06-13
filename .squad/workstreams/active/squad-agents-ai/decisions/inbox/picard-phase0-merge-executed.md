# Picard — Phase 0 sync main→dev — EXECUTED

**Date:** 2026-06-05T07:25+03:00
**Executor:** Picard (Lead / Product Architect)
**Subject:** chore/sync-from-main-pre-v0100 (PR #1212 opened)
**Verdict:** ✅ MERGED LOCALLY, PUSHED, PR OPEN, CI RUNNING
**Worf rejection it supersedes:** `worf-phase0-sync-main-to-dev.md`

---

## What shipped

- **Branch:** `chore/sync-from-main-pre-v0100` on `tamirdresher/squad`
- **Merge commit SHA:** `9581eb2f` (`9581eb2faf7316eae61d6dc9d0d53301c83734ab`)
- **Parent SHAs:** dev `e6281ab4` ← merged into ← upstream/main
- **PR:** https://github.com/bradygaster/squad/pull/1212
- **Base:** `bradygaster/squad:dev`
- **Head:** `tamirdresher:chore/sync-from-main-pre-v0100`
- **Diff size:** 51 files changed, 5544 insertions(+), 109 deletions(-)
- **State:** OPEN, MERGEABLE

## Conflict count

- Worf predicted: 14
- Trial merge confirmed: 14
- Real merge produced: 14
- ✅ Exact match.

## Conflict resolutions

### 11 standard conflicts — all resolved `--ours` (dev)

| File | Outcome |
|------|---------|
| `.github/workflows/squad-ci.yml` | dev (PR #1200 clean rewrite) |
| `.squad-templates/squad.agent.md` | dev (newer) |
| `index.cjs` | dev (bundled output) |
| `package-lock.json` | dev, then regenerated via `npm install` |
| `package.json` (root) | dev (version-bumped in Phase 1) |
| `packages/squad-cli/package.json` | dev |
| `packages/squad-sdk/package.json` | dev |
| `test/cli/init.test.ts` | dev (state-backend coverage) |
| `test/cli/upgrade.test.ts` | dev |
| `test/platform-adapter.test.ts` | dev |
| `test/template-sync.test.ts` | dev |

**No surprises.** All 4 test files on dev cover the same surface as main's
versions plus the state-backend rewrite; taking dev was the right call.

### 3 special cases — all per-plan

| Case | Outcome |
|------|---------|
| A: `.changeset/watch-p0-p1-fixes.md` | `git rm` (accept main deletion) — stale changeset already consumed by 0.9.4 bot |
| B: `test/scripts/security-review.test.ts` | `git rm` (accept dev deletion) — PR #1000/#1001 cleanup. `scripts/security-review.mjs` preserved (referenced by `.copilot/skills/security-review/SKILL.md`) — NOT orphaned |
| C: `docs/.../state-backends.md` | Take dev (`--ours`) — dev's 25KB version is a complete superset of main's 8KB restore. **Zero unique content lost.** |

### Special case C — content verification

- Main size: 8,659 bytes; first added in `eb2efb9b` (PR #1023 restore of older content)
- Dev size: 25,164 bytes; first added in `7a5b180c` (authoritative authoring)
- Headings comparison: dev includes everything main has (renamed
  `Worktree` → `Local`, `Sharing Git Notes State` reorganized into
  `Multi-User Synchronization`) PLUS sections only on dev:
  Getting Started, Copilot CLI Sessions, Git Notes State Protocol,
  Migrating an Existing Squad, Two-Layer backend, Troubleshooting, FAQ.
- ✅ Main is a strict content subset. No concatenation needed.

## Build/lint result

- `npm install` regenerated `package-lock.json` cleanly in ~3s (no integrity errors, no peer-dep complaints)
- `npm run lint` (`tsc --noEmit -p packages/squad-sdk/tsconfig.json && tsc --noEmit -p packages/squad-cli/tsconfig.json`) **PASS** on first run

## CI status at PR open (T+0)

- `Squad CI / changes` — IN_PROGRESS
- `Scope Check / Scope Boundary` — SKIPPED (expected for cross-branch sync)
- Mergeable: ✅ MERGEABLE
- Full CI rollup will be visible on the PR page within ~15 min

## Safety checks

- ✅ HOME `mcp-config.json` sha256 = `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` (matches invariant, before AND after)
- ✅ No GitHub repos created
- ✅ Auth dance: switched to `tamirdresher` for push, restored to `tamirdresher_microsoft` after
- ✅ Local `dev` branch on fork untouched (no force-push, no fast-forward); work isolated on `chore/sync-from-main-pre-v0100`
- ✅ `upstream/dev` HEAD unchanged at `e6281ab4` (PR will fast-forward or 3-way merge cleanly when accepted)

## What differed from plan

**Nothing material.** The corrected tasking (post-Worf-rejection) was
accurate to the file. Specifically:

- Conflict count exact (14/14)
- All special-case decisions worked as documented
- Lockfile regenerated without npm complaints
- Lint passed first try
- `scripts/security-review.mjs` is in active use, not orphaned

## Blocker assessment for Phase 1

**No blockers.** Phase 1 (version bump to 0.10.0 + changeset
consolidation) can begin as soon as:

1. PR #1212 CI goes green (expected ~15-30 min)
2. PR #1212 is merged into `dev` by a maintainer (bradygaster or
   tamirdresher with merge rights)

Once `dev` advances past the merge commit, Phase 1 can branch from
the new dev tip and proceed with version bumps. The merged tree
already contains all 31 main-only files, so Phase 1 has the full
0.9.4 + insider feature set to work against.

## Reviewer history footnote

This is the second execution attempt of this artifact. First attempt
(Worf) was correctly rejected for relying on an unverified pre-flight
scout. Worf's rejection file is the authoritative record of the
errors found; this file is the authoritative record of the corrected
execution. Both should be retained until v0.10.0 ships.

---

**Filed under:** phase-0-complete
**Pings:** @coordinator (Phase 1 unblocked once #1212 merges), @data (scout heuristic refinements in picard/history.md learnings section)
