# Project Context

Scribe executes Squad's post-session orchestration workflow. Session context: 2026-06-03T19:15:00Z. Current focus: Policy-gate insider fix + docs-must-match-implementation directive. Goals: log decisions, capture directive constraints, compact archived metadata. All infrastructure in place. Running final orchestration tasks.

## B'Elanna Core Mission

B'Elanna drives Squad.Agents.AI delivery to bradygaster/squad: .NET adapter via Microsoft Agent Framework. Handles library design, sample flows, CI/publish, PR coordination with maintainers, and upstream community voice.

---

## 2026-06-03 Entries

### Iter-9 Dogfood APPROVED (2026-06-03T10:20:07Z)

- Status: APPROVED — all findings acted, closure confirmed.
- Five findings (F1–F5): F1 deferred (sample v0.2, not blocker); F2 resolved (upgrade --flag), F3 fixed (e2e two-layer validation, root cause eliminated), F4 confirmed (MCP layer anomaly, backend sound, captured as NEW-4), F5 confirmed (Teams drafts ready, pending Tamir approval).
- Iter-9 closed. Iter-10 ready: final PR checks, Teams send + escalation, Brady PR review, Changeset decision gate, cross-agent sync before upstream handoff.
- Full findings → `.squad/log/2026-06-03T10-20-07Z-iter9-dogfood-approved.md`.

### Two-Layer State Backend Validation (2026-06-03T10:20:07Z, sourced 2026-06-02)

**Task:** Validate `stateBackend: "two-layer"` end-to-end against `@bradygaster/squad-cli@0.9.6-preview.15` tarballs; address Finding F3 from iter-9 dogfood.

**Method:** Source code inspection of extracted tarballs + two fresh-repo init scenarios (default + explicit `--state-backend two-layer`) + direct Node.js MCP session probe + direct SDK backend probe.

**Key Findings:**

- **F3 CONFIRMED (root cause identified):** `init`/`upgrade` without `--state-backend two-layer` flag produces `{"version":1}` config only. No `stateBackend` key → `resolveStateBackend()` defaults to `'local'` → `WorktreeBackend` → `FSStorageProvider`. This is the F3 root cause. The opt-in gate is at `cli/upgrade.js:241`.

- **Two-layer backend IS fully implemented and functional** when activated:
  - `--state-backend two-layer` flag → config gets `"stateBackend":"two-layer"` ✅
  - `squad-state` orphan branch created immediately (2 commits: init + migrate) ✅
  - `squad_state_health` reports `StateBackendStorageAdapter` (not FSStorageProvider) ✅
  - Each `squad_state_write` creates a new commit on `squad-state` branch ✅
  - `refs/notes/squad` appears on first write (single JSON blob anchored to root commit) ✅
  - `OrphanBranchBackend.write()` via SDK correctly stores and round-trips content ✅

- **MCP tool layer content anomaly (NEW-4, low):** `squad_state_write` via MCP session wrote empty blob to orphan branch, but direct SDK write (`OrphanBranchBackend.write()`) works correctly. Backend is sound; anomaly is in the tool handler layer. ✅ **FIXED by Data (debd05c4):** runtime guard added to `stateWrite`/`stateAppend` handlers to validate content before backend dispatch. Picard confirmed F3 was test infrastructure only, not production regression.

- **HOME mcp-config SHA256 unchanged** throughout (`928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86`) ✅

**Architecture confirmed:**
- `TwoLayerBackend` = `OrphanBranchBackend` (primary/permanent) + `GitNotesBackend` (secondary/best-effort)
- `GitNotesBackend` uses single JSON blob on root commit, NOT per-file notes entries
- `OrphanBranchBackend` creates one git commit per write; branch is `squad-state`
- Legacy `stateBackend: "git-notes"` is silently migrated to `two-layer` with warning

---

**2026-06-03T21:05:00Z — PR #1200 FULLY GREEN (all 6 CI jobs pass) after Picard's iter-9 test drift fix (commit 3f0a16d6).**

**Last Updated:** 2026-06-03T21:05:00Z  
**Archive:** See `.squad/agents/belanna/history-archive.md` for all 2026-06-02 and earlier entries.

**[2026-06-04 Cross-Agent Update]** PR #1200 now has all 5 pre-existing Copilot bot review comments addressed by Picard. Final state: 45 commits, all green, mergeable. Ready to merge.

---

## 2026-06-04 Entries

### Final Confidence Dogfood — Two-Layer State Backend (PR #1200, commit c9e5b755)

**Task:** Durable systems confidence check before merge. 4 scenarios: A (new init), B (upgrade from legacy), C (MCP write e2e), D (branch-switch persistence). Built fresh preview.18 tarballs from c9e5b755 source.

**VERDICT: YES — merge with confidence.**

#### Scenario A — New init with `--state-backend two-layer` ✅ PASS

- `npx @bradygaster/squad-cli init --state-backend two-layer` in clean git repo
- `.squad/config.json` → `{"stateBackend":"two-layer","version":1}` ✅
- `squad-state` orphan branch created with 2 commits (init + migrate) ✅
- `.mcp.json` has `squad_state` entry (`@bradygaster/squad-cli@insider state-mcp`) ✅
- Mutable files removed from working tree after migration ✅
- HOME mcp-config.json SHA256 unchanged ✅

#### Scenario B — Upgrade from preview.13 (legacy local backend) ✅ PASS (with noted behavior)

- Old preview.13 CLI ran `init` (ignores `--help` flag — known limitation), polluted HOME mcp-config with `squad_state_1db4e17d` (expected pre-fix behavior)
- Added `decisions.md` + `agents/scribe/history.md`, committed to main
- Installed preview.18 tarballs; ran `upgrade --state-backend two-layer`
- All 4 state files migrated to `squad-state` branch ✅
- `.mcp.json` updated, `config.json` → `stateBackend=two-layer` ✅
- **Noted behavior:** `upgrade` does NOT delete files from working tree (by design — they were committed to main; `init` path DOES delete them via `fs.unlinkSync`). This is correct.
- **Noted behavior:** `upgrade` does NOT clean HOME mcp-config entries left by old CLI. Manual cleanup required. SHA256 restored to `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` after removing `squad_state_1db4e17d` from both `mcpServers` and `_squadProjects`.

#### Scenario C — MCP write end-to-end ✅ PASS

- Sent `squad_state_write` via JSON-RPC stdio to `npx @bradygaster/squad-cli state-mcp`
- Server responded `"State written: agents/scribe/history.md"` with `isError: false`
- `squad_state_read` round-trip confirmed content
- `git show refs/heads/squad-state:agents/scribe/history.md` shows new commit on branch ✅
- `squad_state_health` reports `StateBackendStorageAdapter` (not FSStorageProvider) ✅
- NEW-4 fix confirmed working: write with content succeeds, no empty blob ✅

#### Scenario D — Branch-switch persistence ✅ PASS

- `git checkout -b feature/test-branch-switch` → squad-state readable from feature branch ✅
- MCP write from feature branch → commit landed on squad-state ✅
- `git checkout main` → squad-state still up-to-date, latest write visible ✅
- squad-state is a separate orphan branch; not affected by working-tree branch switches ✅

**Architecture note:** squad-state is a refs/heads orphan branch with no parent. It is independent of the working-tree branch. All writes are commits on that branch regardless of which branch is checked out. This is the core correctness guarantee of the two-layer design.

**HOME mcp-config.json invariant:** SHA256 `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` confirmed unchanged after cleanup.

**Last Updated:** 2026-06-04

---

### Real Old Repo Upgrade Test — PR #1200 (2026-06-04T09:20:00+03:00)

**Task:** Empirical upgrade validation against 3 real production squad repos (copies in sandbox). Goal: prove `upgrade` command from PR #1200 (v0.9.6-preview.18) correctly preserves/sets `stateBackend: two-layer`, creates `.mcp.json`, migrates state, and MCP server can do a read/write round-trip.

**Sandbox:** `C:\Users\tamirdresher\squad-validation\real-old-repo-upgrade\` (originals never touched)

**Repos tested:**
- `tamresearch1-3516` — v0.9.6-insider.3 (had `stateBackend: two-layer` pre-set, `teamRoot: "."`)
- `squad-apm-work` — v0.0.0-source (workspace monorepo)
- `squad-pr1158` — v0.0.0-source (workspace monorepo)

**Key discovery: workspace monorepo trap.** `npm install --save-dev <tarball>` in a workspace monorepo installs metadata but `node_modules/@bradygaster/squad-cli` still points to the workspace package (shadowing the tarball). Workaround: invoke `node $cliEntry` directly from the tarball's extracted `cli-entry.js`. This affected both workspace repos.

**Results matrix:**

| Repo | stateBackend=two-layer | .mcp.json created | squad-state branch | MCP write/read |
|---|---|---|---|---|
| tamresearch1-3516 | ✅ (pre-existing, preserved) | ✅ | ⚠️ absent (clone artifact) | ❌ blocked by `teamRoot:"."` config |
| squad-apm-work | ✅ (upgrade set it) | ✅ | ✅ 19 files migrated | ✅ PASS |
| squad-pr1158 | ✅ (upgrade set it) | ✅ | ✅ 19 files migrated | ✅ PASS |

**tamresearch1-3516 squad-state absence:** Original repo had `refs/remotes/origin/squad-state` only (no local branch). `git clone --no-hardlinks <local-path>` copies `refs/heads/*` only, not remotes. Clone artifact — not a regression. Upgrade correctly detected existing `stateBackend: two-layer` and skipped migration (no data to re-migrate).

**tamresearch1-3516 MCP failure root cause:** Pre-existing `teamRoot: "."` in config.json causes `resolveSquadPaths()` to enter remote mode where `teamDir = repoRoot` ≠ `projectDir = .squad/`. `ToolRegistry.squadRoot` uses `teamDir` (repo root), but `StateBackendStorageAdapter.squadDir` uses `projectDir` (.squad/). Path resolves to `<repo-root>/.scratch/test.md` which is outside `.squad/` → `toRelative()` throws. This is a pre-existing SDK behavior for `teamRoot` configs, not caused by PR #1200.

**MCP round-trip (squad-apm-work, squad-pr1158):**
- Key `.scratch/real-upgrade-test.md` written via `squad_state_write` (JSON-RPC stdio to `state-mcp`)
- Read back via `squad_state_read` — exact content match
- `squad-state` branch advanced (new commit `Update .scratch/real-upgrade-test.md` verified via `git log`)
- Confirmed synchronous git backend: `git hash-object`, `commit-tree`, `update-ref` all fire before response

**Bug found in test (not PR regression):** `validateMutableStateToolKey()` only allows writes to `decisions.md`, `decisions/inbox/*`, `agents/<name>/history.md`, `log/*`, `orchestration-log/*`, `sessions/*`, `.scratch/*`. Test key `agents/scribe/real-upgrade-test.md` was initially blocked; fixed to use `.scratch/real-upgrade-test.md`.

**SDK version mismatch noted:** Tarball CLI (preview.18) resolves `@bradygaster/squad-sdk` from `C:\Users\tamirdresher\node_modules\@bradygaster\squad-sdk` (v0.9.6-preview.15) via ESM bare-specifier walk from file location. 3-minor-preview gap; TwoLayerBackend present and functional in both versions.

**VERDICT:** PR #1200 upgrade command works correctly on real production repos. 2/3 repos get full end-to-end validation; 3rd repo has pre-existing `teamRoot:"."` config that is outside the scope of this PR. Recommend merge.

**Full report:** `.squad/files/validation/REAL-OLD-REPO-UPGRADE-TEST.md`
**Decision drop:** `.squad/workstreams/active/squad-agents-ai/decisions/inbox/belanna-real-old-repo-upgrade.md`

**Last Updated:** 2026-06-04T09:20:00+03:00

---

### Six-Repo Upgrade Validation — PR #1200 (2026-06-04)

**Task:** Full empirical `upgrade --state-backend two-layer` validation across 6 real production repos (3 personal, 3 EMU), built from HEAD `212365ec` (v0.9.6-preview.20).

**Sandbox:** `C:\Users\tamirdresher\squad-validation\6-repo-upgrade-test\` (clones only, originals never touched)

**Repos:** `travel-assistant`, `holocaust-research-wasserman`, `gh-ai-adoption2026` (tamirdresher); `squad-ai-vulns`, `multiplayer-sudoku`, `tamir-squad-hq` (tamirdresher_microsoft EMU)

**Results — 9-check matrix:**

All 6 repos: C1 (stateBackend=two-layer) ✅ · C2 (.mcp.json) ✅ · C3 (squad-state branch) ✅ · C4 (state files migrated) ✅ · C5 (decisions.md on branch) ✅ · C6 (6 hooks installed) ✅ · C7 (.gitignore updated) ✅ · C8 (HOME sha256 unchanged) ✅ · C9 (clean tree) ✅

**MCP round-trip results:**
- `travel-assistant` ✅ · `gh-ai-adoption2026` ✅ · `multiplayer-sudoku` ✅ — proof blobs confirmed on squad-state
- `holocaust-research-wasserman` ❌ · `squad-ai-vulns` ❌ · `tamir-squad-hq` ❌ — stale `teamRoot` causes `path is outside squadDir`

**Bug found:** `upgrade` preserves stale absolute `teamRoot` without validation. When teamRoot points to a different path than the clone location, `StateBackendStorageAdapter` rejects all keys. Recommended fix: validate/clear absolute `teamRoot` during migration if it doesn't match repo root.

**HOME sha256 invariant:** `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` ✅ confirmed unchanged throughout all 6 tests.

**VERDICT: YES — merge PR #1200 with open follow-up issue for teamRoot validation.** Core migration logic is correct. 3 full passes + 3 structural passes; MCP failures are pre-existing behavior not introduced by this PR.

**Full report:** `.squad/files/validation/SIX-REPO-UPGRADE-TEST.md`  
**Decision drop:** `.squad/workstreams/active/squad-agents-ai/decisions/inbox/belanna-six-repo-upgrade.md`

**Last Updated:** 2026-06-04
