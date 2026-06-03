# Decisions — Subcommand --help Workstream

Append workstream-scoped architectural and process decisions here. Scribe merges the inbox.

---

## 2026-06-03 — PR #1202 Copilot-bot review nits addressed

**Author:** data | **Status:** Merged | **Related:** bradygaster/squad#1201, bradygaster/squad#1202, review #4409659605

All three non-blocking nits from `Copilot-pull-request-reviewer[bot]` review `#4409659605` are fixed in three small commits on `tamirdresher/1201-subcommand-help`. PR head verified: `64b19531`.

### Fix 1 — alias normalization for help-registry lookup

**Commit:** `69aeee07` — `fix(cli): normalize subsquads aliases before help-registry lookup (PR #1202 review)`

- `packages/squad-cli/src/cli/core/command-help.ts` — added `COMMAND_ALIASES` map (`streams → subsquads`, `workstreams → subsquads`) + exported `normalizeCommandAlias(cmd)` helper. `printCommandHelp` now resolves the alias before the registry lookup.
- `test/cli/command-help.test.ts` — new unit tests: `'streams' --help` and `'workstreams' --help` resolve to the subsquads help block; `normalizeCommandAlias` mapping table.

**Note:** Survey of other aliases in `cli-entry.ts` — only `subsquads | workstreams | streams` (line 843) needed normalization. The `rc | remote-control` pair (line 932) already has explicit entries for both keys in `COMMAND_HELP` so no alias mapping is required. All other commands have a single canonical form.

### Fix 2 — rename misleading test + add real generic-fallback case

**Commit:** `532edf03` — `test(cli): rename misleading help test + add real generic-fallback coverage (PR #1202 review)`

- `test/cli/command-help.test.ts` — renamed test to `'discover --help prints discover-specific help (not the generic fallback)'`. Added NEW test case: `'falls back to a generic help message for unknown commands'` spawning the built CLI with `this-command-does-not-exist-xyz --help`, asserting output contains the bogus cmd name and `'squad help'` generic-fallback wording, and no `.squad/` scaffolded.

### Fix 3 — filesystem assertion for `init --help`

**Commit:** `64b19531` — `test(acceptance): assert no files scaffolded on init --help (PR #1202 review)`

- `test/acceptance/steps/cli-steps.ts` — new `Then the temp directory has no "<X>" entry` step (uses `existsSync(join(tempDir, X))`).
- `test/acceptance/features/subcommand-help.feature` — scenario `init --help prints help instead of scaffolding files` now asserts no `.squad`, `.github`, `.gitignore` under the temp dir after run.

### Test runs

- `npx vitest run test/cli/command-help.test.ts` → **14 passed, 0 failed**
- `npx vitest run test/acceptance/acceptance.test.ts -t "Subcommand --help intercept"` → **4 passed, 0 failed**

Full upstream suite was intentionally skipped (84 pre-existing Windows flakes per workstream brief).

### Worf re-review

**Not recommended.** Fix 1 is the only non-trivial logic: a 2-entry map + one-line lookup with explicit unit coverage of both aliases and the fall-through case. Code is colocated with high cohesion.

---

## 2026-06-03 — PR #1202 help-interception end-to-end validation + Copilot-bot review threads resolved

**Author:** data + coordinator | **Status:** Merged | **Related:** bradygaster/squad#1202, [ws:subcommand-help]

### Validation Summary

**PR #1202 is ready for Brady's review.** End-to-end validation of `squad <cmd> --help` / `-h` across all routed subcommands: **90/90 PASS**. Zero regressions, zero fallbacks, zero side effects, zero new files in any temp cwd.

- **Test coverage:** 45 command identities (incl. 2 `subsquads` aliases) × 2 flags = 90 runs
- **Max wall-time:** 1132 ms (cold-start). Avg: 711 ms
- **Non-PASS deviations:** Only `squad version --help` prints version (by design, not a regression)
- **Alias parity:** `subsquads`, `streams`, `workstreams` produce byte-identical output (commit `69aeee07` confirmed)
- **All #1201 issues verified:** 31 commands listed as broken in #1201 + 12 additional routed commands all PASS
- **Coverage:** Full report: `.squad/workstreams/active/subcommand-help/files/help-validation-report-2026-06-03T08-44-10.md` (6150 bytes)

### Recommendation

**Merge PR #1202. No follow-up fix commit needed from this validation pass.**

Optional defense-in-depth (do NOT block merge):
1. Add unit-level guard in `command-help.test.ts` that asserts `commandsWithHelp()` is a superset of ROUTED_COMMANDS list.
2. Decide whether `squad version --help` should print help (currently prints version). If yes, drop `version` from intercept allow-list in `cli-entry.ts:296`.

### Coordinator Resolution

Coordinator posted reply + resolved all 3 Copilot-bot review threads on PR #1202:
- **Thread 1** (Fix 1 — alias normalization, commit `69aeee07`) — replied with design rationale
- **Thread 2** (Fix 2 — test rename, commit `532edf03`) — replied with coverage justification
- **Thread 3** (Fix 3 — filesystem assertion, commit `64b19531`) — replied with acceptance spec link

All threads now show `resolved: true`, `lastReplyBy: tamirdresher`. GraphQL verified. Account-switch dance completed (6 API calls, no side effects).

