# Picard History Archive — Before 2026-06-06

**Last Updated:** 2026-06-06T14:08:46Z  
**Summary:** Detailed learnings from PR #1200 review, state-backend migration, and release process research. Archived to maintain 15KB hard gate on active history.md.

---

## 2026-06-04 — SDK API -> CLI command + Ralph capability + workflow integration pattern

When wiring an SDK API into production code paths, use the three-tier **ladder** so the same logic is callable from operators, autonomous loops, AND CI:

1. **CLI command (tier 1, operator-facing)**
   - File: `packages/squad-cli/src/cli/commands/<noun>.ts` with a `run<Verb>` exported async function returning `Promise<number>` (process exit code).
   - Dispatch from `packages/squad-cli/src/cli-entry.ts` with single `if (cmd === 'noun')` check.
   - Resolve squad/repo paths via `resolveSquadPaths` then `resolveStateBackend`; use `instanceof` to narrow to concrete backend (e.g. `TwoLayerBackend`).
   - No-op cleanly when active backend does not support operation — `squad notes promote` on worktree repo prints one-line note and returns 0 instead of erroring.
   - Provide `--dry-run` whenever operation writes state.

2. **Ralph capability (tier 2, autonomous heartbeat)**
   - File: `packages/squad-cli/src/cli/commands/watch/capabilities/<noun>.ts` implementing `WatchCapability` contract.
   - Register in `watch/capabilities/index.ts`'s `createDefaultRegistry()`.
   - Prefer idempotent operations and throttle with `everyNRounds` (default 5).
   - Phase = `housekeeping` for janitorial work.
   - Preflight should fail FAST for non-applicable backends so capability self-disables.

3. **Workflow integration (tier 3, CI/PR-merge)**
   - Use `npx @bradygaster/squad-cli notes promote --all` step in workflow YAML conditioned on `github.event.pull_request.merged == true`.
   - Note: `.squad/templates/ralph-triage.js` is generated script; tier-2 does not transitively cover tier-3.

### Key SDK Export Discipline

- Re-export CONCRETE CLASS from `packages/squad-sdk/src/index.ts`, not just interface. CLI code needs `instanceof TwoLayerBackend`.
- Also re-export RESULT TYPE so call sites can type the return value without reaching into source file.
- Round 4 audit caught bug: `promoteNotes` was exported in source but never from index.ts — zero callers existed, API silently rotted.

### Upgrade-Migration Cleanup Invariant

For any `squad upgrade --state-backend X -> Y` transition that copies state from working tree to branch-backed store:
- MUST delete working-tree copies in same step
- Leaving them produces stale content shadowing new source of truth, git status noise, and confusion across team checkouts
- `liftInitMutableStateOntoOrphan` implements the right pattern for fresh `squad init` — `migrateStateBackend` should mirror it

---

## 2026-06-05 — Squad Release Process (3-Branch Model)

Squad's release process is **3-branch, not 2-branch**: dev → preview → main.

Key files (bradygaster/squad):
- `docs/src/content/docs/scenarios/release-process.md` — canonical workflow
- `docs/_internal/release-checklist.md` — patch/minor/major split strategy
- `.github/workflows/squad-promote.yml` — manual dispatch with `dry_run` input
- `.github/workflows/squad-preview.yml` — push-trigger on preview, validates no forbidden paths
- `.github/workflows/squad-release.yml` — push-trigger on main, creates tags, release
- `.github/workflows/squad-npm-publish.yml` — release:published trigger, 4 sequential jobs

Conventions:
- Tag format: `vX.Y.Z` (lowercase v prefix, must match package.json)
- Semver suffixes: `-preview.N`, `-insider.N`
- CHANGELOG sections: Added / Changed / Fixed / Breaking Changes / Community
- Release blog: `docs/src/content/blog/NNN-vX_Y_Z-release.md` with frontmatter
- Three-package version sync required: root + squad-sdk + squad-cli
- Changesets: 110 files exist but `commit: false` — they're logs only, not version-compute
- Versions bumped manually
- npm dist-tags (as of 2026-06-05): `latest=0.9.4`, `insider=0.9.6-insider.3`, `preview=0.8.17-preview`
- Always run `dry_run` first for promotion

### Phase 0 Sync main→dev Learnings

After Worf rejection + re-execution (PR #1212, merge SHA 9581eb2f):

**What matched:**
- Trial-merge conflict count = 14 (exact match to Worf's count)
- All 11 standard conflicts resolved cleanly via `--ours`
- File preservation auto-worked: 31 main-only files preserved with zero action
- `npm install` regenerated lockfile in 3s, no integrity issues
- Lint passed first try

**Near-misses:**
- `--theirs` vs `--ours` flip depending on merge direction; always write table with branch name, not flag name
- Special case files need `git ls-files | grep` check before assuming co-deletion
- DU/UD conflicts are silent landmines — never use bulk `--theirs`/`--ours` without filtering first

**Heuristic refinements:**
1. Tree-diff before patch-diff (trial merge gives real conflict count)
2. Date-of-commit is NOT content-recency proxy (check file sizes + first-add commits)
3. DU/UD/AA conflicts need individual handling, not bulk flags
4. Distinguish "files that diverge" from "files only on one side"
5. Reviewer rejection protocol worked as designed

---

## 2026-06-05 Learnings — Jon Lester Suggestion Triage Principles

### Convenience re-exports need > 1 consumer to justify public API
A convenience re-export from public SDK package must clear "two real consumers" bar. One internal CLI file does not constitute API pressure. **Principle: don't create SDK API surface to serve single internal consumer.**

### Diagnostic signals in headless/fleet contexts justify low-priority warnings
Break-vs-diagnose distinction matters for prioritization. Change that doesn't prevent failure but dramatically speeds diagnosis is still worth doing — especially in fleet/CI where silent failure is worst outcome. `protocolVersion > KNOWN_MAX` warning at session start costs ~5 lines, pays back with "check SDK compatibility" as obvious first step.

### Backward-compat shims change calculus on convenience APIs
When backward-compat shim already covers failure mode convenience export was supposed to prevent, convenience export's justification weakens significantly. **The shim IS the fix.** Export is at that point a refactor with no safety benefit.

### "Propagation" argument is weak if update is mandatory anyway
Centralizing a value in SDK only holds if consumers stay on old version and get fix for free. They can't — protocol change that breaks value also requires SDK update. Centralization doesn't eliminate mandatory update; it just moves where literal lives.
