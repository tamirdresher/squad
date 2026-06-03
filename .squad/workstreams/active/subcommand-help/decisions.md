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

