# Round 5 — P0.3 A3 wiring + P1.1 (F1) upgrade cleanup

**Author:** Picard (Lead / Product Architect)
**Date:** 2026-06-04
**Workstream:** squad-agents-ai
**Commits:** c71ea2c1, 7e3e8a4d, 98b69ae0 (on top of Data's 3f13cdf7)
**PR context:** PR #1200 working copy at `C:\Users\tamirdresher\source\repos\squad-state-backend-fix`

---

## Context

Round 4 audit (Round 4 B'Elanna report) found two open holes after the
state-backend hardening landed:

1. **P0.3 A3** — The `TwoLayerBackend.promoteNotes(ref)` SDK API (commit
   `aaec183f`) had ZERO production callers. Wired in SDK, never invoked.
   The blog-described behaviour "Ralph promotes notes to permanent storage
   after PR merge" was implemented at the SDK layer only — no command, no
   heartbeat, no workflow ever called it. Notes flagged `promote_to_permanent`
   would accumulate in `refs/notes/squad/*` forever and never reach the
   permanent orphan store.

2. **P1.1 (F1)** — `squad upgrade --state-backend two-layer` copied
   `.squad/decisions.md` and `.squad/agents/<n>/history.md` onto the orphan
   branch but LEFT the working-tree copies. Post-upgrade `git status` was
   noisy and the orphan branch was no longer the unambiguous source of truth.

This decision records the design choices for fixing both, layered on top of
Data's `abd37ea8 / 8f7e7f71 / 3f13cdf7` SDK reliability commits.

---

## Decision 1 — Three-tier integration ladder for `promoteNotes`

A single integration point is a single point of failure. The notes-promotion
behaviour needs to be reachable from three independent triggers:

| Tier | Trigger                  | Integration                                                    |
|------|--------------------------|----------------------------------------------------------------|
| 1    | Operator (human)         | `squad notes promote [--ref] [--all] [--dry-run]` CLI command  |
| 2    | Autonomous Ralph loop    | `NotesPromoteCapability` in the watch capability registry      |
| 3    | CI / PR-merge automation | Step in `.github/workflows/squad-heartbeat.yml` (deferred)     |

### Tier 1 — CLI command (commit `c71ea2c1`)

- New file `packages/squad-cli/src/cli/commands/notes.ts` with a `runNotes`
  subcommand dispatcher and a `runNotesPromote` implementation.
- Dispatched from `packages/squad-cli/src/cli-entry.ts` via a one-line
  `if (cmd === 'notes')` case, immediately before the `config` case.
- Enumerates `refs/notes/squad/*` via `git for-each-ref`; restricts to one
  ref if `--ref squad/<name>` is provided.
- Calls `TwoLayerBackend.promoteNotes(ref)` per ref; for `--dry-run`, uses a
  local re-parse of the same `git notes list / show` output to preview
  classification without writing.
- Output: human-readable per-ref + TOTAL summary table.
- Exit code 0 on success, 1 if any per-ref operation errored.
- No-op cleanly with a one-line note when stateBackend != two-layer.

**SDK export delta:** added `TwoLayerBackend` and `PromoteNotesResult` to the
re-exports from `packages/squad-sdk/src/index.ts`. Without this the CLI cannot
`instanceof`-narrow the generic `StateBackend` returned by
`resolveStateBackend()` — and this is exactly the gap that hid `promoteNotes`
from public callers in the first place.

### Tier 2 — Ralph heartbeat capability (commit `7e3e8a4d`)

- New file
  `packages/squad-cli/src/cli/commands/watch/capabilities/notes-promote.ts`
  implementing `WatchCapability` with `name='notes-promote'` and
  `phase='housekeeping'`.
- Registered in `watch/capabilities/index.ts` `createDefaultRegistry()`.
- Preflight rejects non-two-layer repos with a clear reason; the capability
  self-disables on local / worktree / orphan-only setups.
- Execute path: enumerate squad notes refs, call `promoteNotes` per ref,
  aggregate counts into a one-line round summary.
- Throttled to `everyNRounds=5` (default); round 1 always runs for immediate
  feedback.

**Why unconditional rather than PR-merge detection?** Round 5 spec recommended
this and the analysis holds:
- `promoteNotes` is idempotent — promoted notes are removed from source, so a
  subsequent run finds nothing and returns near-instantly.
- PR-merge detection requires either polling `gh pr list --search "merged:>X"`
  (extra API budget and brittle timestamp arithmetic) or parsing reflog state.
- The cost of running an idempotent no-op every 5 rounds is dwarfed by the
  complexity of correctly detecting "did a PR merge since last time".

### Tier 3 — Workflow PR-merge trigger (deferred this round)

The heartbeat workflow `.github/workflows/squad-heartbeat.yml` already
triggers on `pull_request: types: [closed]`, but it invokes
`.squad/templates/ralph-triage.js` (a generated script), NOT the watch-capability
registry. So Tier 2 does NOT transitively cover Tier 3 — the workflow path
needs its own explicit step:

```yaml
- name: Promote squad notes after PR merge
  if: github.event_name == 'pull_request' && github.event.pull_request.merged == true
  run: npx @bradygaster/squad-cli notes promote --all
```

**Why deferred:** the four SYNC'd copies of `squad-heartbeat.yml` (per the
"⚠️ SYNC" comment in the file header) were under constant Windows autocrlf
churn during this session — every checkout regenerated 167-line whitespace-only
diffs. Landing a workflow change cleanly requires first resolving the CRLF
drift across all four copies, which is out of scope for this round. The
Ralph capability (Tier 2) provides functional coverage today via
`squad watch`; the workflow step will land separately as soon as the YAML
files are line-ending-stable.

---

## Decision 2 — Upgrade cleanup mirrors init cleanup (F1)

The `liftInitMutableStateOntoOrphan` helper in `migrate-backend.ts` already
implemented the correct pattern for fresh `squad init`: write to orphan, then
delete the working-tree copy. `migrateStateBackend` (the upgrade path) wrote
to orphan but skipped the delete step — that's F1.

**Fix in commit `98b69ae0`:** after `writeFilesToOrphanBranch` returns >0,
delete each migrated file from the working tree, then `rmdir` any
now-empty `.squad/agents/<name>/` directories. Only files that were JUST
successfully migrated are removed — `config.json`, `charter.md`, `team.md`,
`casting/`, `templates/` are NEVER touched (the static / non-migratable set
is fixed by `MIGRATABLE_PATHS` and the per-agent `history.md` enumeration).

**Failure mode:** if `fs.unlinkSync` fails (permissions / EBUSY), the file is
left in place and a `⚠ could not remove: ...` warning is printed. The orphan
write has already succeeded so the file is authoritative on the branch — the
worst case is git-status noise that the user can resolve manually.

**Bundled rather than separate commit:** F1 is tightly coupled to the
upgrade-to-two-layer path that makes `promoteNotes` useful in the first
place. A migration that leaves stale state behind would shadow whatever the
runtime bridge reads from the orphan store, undoing the value of the P0.3
wiring above.

---

## Test coverage delta

- `test/cli/notes-promote.test.ts` (NEW, 8 cases) — no-op on non-two-layer,
  no-refs path, promote-then-remove, archive-and-keep, idempotency, `--ref`
  scoping, `--dry-run` non-mutating, direct SDK smoke test.
- `test/watch-notes-promote.test.ts` (NEW, 5 cases) — capability metadata,
  preflight fail on worktree, preflight succeed on two-layer, execute
  promotes + idempotent, `everyNRounds` throttle.
- `test/upgrade-state-backend.test.ts` (EXTENDED, +1 case) — `F1 (Round 5):
  migrated working-tree state files are removed after upgrade` — asserts
  `decisions.md` + agent history.md are gone, empty agent dir is gone,
  `charter.md` and `config.json` remain.

All 19 new/extended tests pass. Build clean. Lint clean (0 errors;
pre-existing 1869 warnings unchanged).

---

## Open follow-ups

1. **Workflow Tier 3 integration** — land the `notes promote --all` step in
   `.github/workflows/squad-heartbeat.yml` (+ the three SYNC copies) once
   the CRLF drift is resolved.
2. **In-session Ralph (`squad loop`)** — currently uses the same capability
   registry as `squad watch`, so it inherits Tier 2 for free. Verified
   indirectly via registry test; no separate work needed.
3. **Documentation** — the blog claim "Ralph promotes notes to permanent
   storage after PR merge" is now true via Tier 2 (every 5 rounds of
   `squad watch`) and operator-callable via Tier 1. README should be
   updated to reference `squad notes promote --help`.
