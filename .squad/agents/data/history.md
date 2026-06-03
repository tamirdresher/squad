# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## Current Status (2026-06-02T19:39:52Z)


- `.github/agents/squad.agent.md` — 3 sites: routing section (5-path + dedup + personal exclusion + HTML sync comment), State Protocol skills note (parenthetical added), spawn template skill-check (single line naming all 5 paths)
- `.squad/templates/squad.agent.md.template` — same 3 sites mirrored exactly
- `.squad/templates/plugin-marketplace.md` — 1 site: added "Why `.squad/skills/`?" note after the install steps
- `.copilot/skills/squad-conventions/SKILL.md` — 1 site: file structure section expanded from single `.squad/skills/` line to full 5-path table with personal-paths exclusion note

**Sync verification:** PASS — both squad.agent.md files show identical +14/-5 delta in the routing and spawn-template sections.

---

### 2026-06-02T21:33:08+03:00 — RE-VAL iter-4 (3/6): tamirdresher/holocaust-research-wasserman

**Verdict:** 🟢 GO on the two bugs this repo originally surfaced; ⚠️ HOLD on declaring MCP-RUNTIME fully fixed.

**EPERM-NO-SHORTCIRCUIT — FIXED.** This is the repo that surfaced the bug in iter-3. Re-tested in the same failure environment: `squad upgrade --self --state-backend two-layer` now completes state migration (10 files → squad-state branch, backend flipped, 6 hooks installed) BEFORE surfacing the self-upgrade failure as a deferred non-zero-exit warning. Most important single signal in this re-val.

**REGISTRY-PIN-UNPUBLISHED — FIXED.** Upgrade log shows `ensured squad_state pinned to @bradygaster/squad-cli@insider` — HEAD-check detected `0.9.6-preview.9` is not on the registry and fell back to `@insider` dist-tag spec as designed.

**MCP-NOT-AUTOLOADED — PARTIAL.** Orphan SHA timeline across FRESH-init 3 sessions: `2dd3d02 → 2dd3d02 → 2dd3d02 → 2dd3d02` (Δ0 commits). Direct MCP probe: agent reports `"no tools prefixed with squad_state_*"`. The iter-4 wrapper only injects `--additional-mcp-config` on copilot spawns from inside squad-cli; the canonical user invocation `copilot --yolo --autopilot --agent squad -p "..."` bypasses the wrapper, so Copilot CLI 1.0.58 still silently skips `.copilot/mcp-config.json`. Per Data-16 alias experiment — bug not closed for canonical UX.

**MCP-RUNTIME / mcp-config form:** npx-pinned form, not non-npx. `@bradygaster/squad-cli@0.9.6-preview.9` on init, `@bradygaster/squad-cli@insider` after upgrade (fallback engaged).

**Bug counts:** 8 ✅ / 1 ⚠️ / 1 ➖ (TIMESTAMP-COLON-LEAK not triggered).

**Iter-5 recommendation:** ship `squad copilot ...` shim subcommand (~15 LOC) that pre-injects `--additional-mcp-config` so canonical user invocations get the bridge.

**Artifacts:**
- Primary dup: https://github.com/tamirdresher_microsoft/holocaust-research-wasserman-tarball-test-iter4-20260602T213308
- Upgrade dup: https://github.com/tamirdresher_microsoft/holocaust-research-wasserman-upgrade-test-iter4-20260602T213308
- Per-repo report: `<primary-dup>/validation/RE-VAL-iter4-holocaust-research-wasserman.md`
- Mirror: `.squad/files/validation/REVAL-ITER4-holocaust-research-wasserman.md`
- Decision drop: `.squad/decisions/inbox/data-reval-iter4-holocaust-research-wasserman.md`
- Scratch: `C:\Users\tamirdresher\squad-validation\wasserman-iter4-20260602T213308\`

**Auth restored:** `tamirdresher_microsoft` (verified on exit).

---

### 2026-06-02T21:10:16.324+03:00 — Worf R-1/R-2 landed [ws:skill-discovery-paths]

**R-1 — NFC Normalization + Control-Char Denylist:**
- Dedup rule now mandates NFC Unicode normalization and trailing-whitespace trim before comparison. Prevents Unicode-confusable attack (NFC vs NFD variants of the same name bypassing dedup).
- Explicit denylist: skip any skill directory whose name contains null bytes, control characters (`\x00`–`\x1F`, `\x7F`), or path separators (`..`, `/`, `\`). Log: `⚠ Skill name '{name}' in {path} skipped (contains invalid characters).`
- Edit sites: Dedup rule paragraph in `.github/agents/squad.agent.md` and `.squad/templates/squad.agent.md.template` (both mirrored per twin-file invariant).

**R-2 — Hardlinks over Symlinks (monorepo UX):**
- Symlinks are NOT followed during discovery (Windows compat + security). For monorepo users who need a skill to appear in multiple logical locations: use a hardlink (`ln {source} {destination}`, not `ln -s`). Hardlinks are regular files from the filesystem's perspective and are discovered normally.
- Edit site: `.copilot/skills/squad-conventions/SKILL.md` only (user-facing skill-author guidance; does NOT belong in squad.agent.md).

**R-3 — Out of Scope:**
- Squad's skill discovery is LLM-prompt-driven, not runtime code. No `.squad/test/` exists. No test scaffolding created. Revisit if a CLI scanner is ever introduced.

---

### 2026-06-02T21:33:10+03:00 — Re-Val Iter-4 / 2-of-6 — multiplayer-sudoku [data-reval-iter4-multiplayer-sudoku]

**Tarballs on disk:** `0.9.6-preview.9` (manifest claimed preview.8 — auto-bump on pack). Dup names: `multiplayer-sudoku-tarball-test-iter4-20260602T213310` (fresh-init), `multiplayer-sudoku-upgrade-test-iter4-20260602T213310` (upgrade).

**Headline:** Iter-4 fixes are **asymmetric across init vs upgrade paths**. Upgrade ✅; init ❌.

- **Init (fresh `--state-backend two-layer`):** orphan SHA was `e5725a96` after init and STILL `e5725a96` after S1, S2, S3. Zero MCP tool calls in any session log. Root cause: `buildMcpServerSpecs` in `squad-sdk/init.ts` hard-pins `npx -y @bradygaster/squad-cli@<currentVersion>`; for the local-tarball build `0.9.6-preview.9` this E404s on the npm registry, Copilot CLI silently drops the failed server, the agents work entirely in WT.
- **Upgrade (`local → two-layer`):** 8 state files migrated to orphan, mcp-config.json pinned to `@bradygaster/squad-cli@insider` (fallback fired correctly via `resolveSquadStateMcpSpec` in `upgrade.ts`), one follow-up session pushed `+1` commit (`0de57272` → `0f62575f`) to `origin/squad-state`.

**Why the asymmetry:** the new `resolveSquadStateMcpSpec` helper with `npm-registry.ts` HEAD-check + `@insider` fallback was wired only into `upgrade.ts`. The init path calls the older synchronous `buildMcpServerSpecs` that doesn't do the HEAD-check. Mirroring the helper (or factoring one shared lib) is a ~15-LOC iter-5 spin + 2 tests.

**New bug surfaced:** **UPGRADE-TEMPLATE-DOC-FLATTEN.** `squad upgrade --state-backend two-layer` dumped ~20 template docs and per-agent charter scaffolds (`charter.md`, `casting-history.json`, `casting-policy.json`, `casting-registry.json`, `Rai-charter.md`, `scribe-charter.md`, `fact-checker-charter.md`, `mcp-config.md`, `multi-agent-format.md`, `plugin-marketplace.md`, `orchestration-log.md`, `roster.md`, etc.) directly into `.squad/` root. They should live under `.squad/templates/` and `.squad/agents/<name>/`. Cosmetic-but-shadowing bug; iter-5 candidate (~20 LOC).

**Bug matrix counts:** 8 ✅ · 3 ⚠ · 2 ❌ · 9 n/a (14 prior + 1 iter4-new = 15 tracked).

**MCP-NOT-AUTOLOADED status note:** the canonical command in the prompt is plain `copilot --yolo --autopilot --agent squad -p "…"`, which bypasses every `--additional-mcp-config` wrap site iter-4 added to squad's spawn code. On this repo, project `.copilot/mcp-config.json` DID load under Copilot CLI 1.0.58 (refuting one Data-16 finding for this cwd + this version), which makes the wrapper concern less urgent than thought — what matters is whether the pinned package resolves. Still worth a `squad copilot` wrapper subcommand so canonical usage actually runs through squad.

**Verdict:** 🟡 HOLD merge. Land iter-5 with: (1) helper-mirror into init, (2) UPGRADE-TEMPLATE-DOC-FLATTEN fix. Then re-validate. Decision drop: `.squad/decisions/inbox/data-reval-iter4-multiplayer-sudoku.md`. Per-repo report: `multiplayer-sudoku-tarball-test-iter4-20260602T213310/validation/RE-VAL-iter4-multiplayer-sudoku.md`. Squad mirror: `.squad/files/validation/REVAL-ITER4-multiplayer-sudoku.md`. Auth: `gh auth switch --user tamirdresher_microsoft` confirmed (active id 188938611).


---

### 2026-06-02T21:50:00+03:00 — Re-validation iter-4 on tamir-squad-hq (WORST-CASE, data-reval-iter4-tamir-squad-hq)

**Dup:** https://github.com/tamirdresher_microsoft/tamir-squad-hq-tarball-test-iter4-20260602T213310
**Tarballs:**  .9.6-preview.9 (rebuilt since manifest's preview.8)
**Verdict:** Build-time fixes 🟢 GREEN end-to-end on the worst-case repo. Runtime bridge ❌ STILL FAILS for direct copilot --agent squad -p "..." invocations.

**Build-time wins (all 5 user MCP servers preserved verbatim):**
- Pre: 5 servers (azure-devops, bitwarden, bitwarden-shadow, EXAMPLE-trello, chrome-devtools). Post: same 5 byte-identical + new squad_state block.
- squad_state entry uses **iter-4 form**: 
px -y @bradygaster/squad-cli@insider state-mcp (dist-tag fallback per REGISTRY-PIN-UNPUBLISHED) — *not* an unresolvable @0.9.6-preview.9 pin.
- 18 state files migrated (1MB decisions.md + 17 agent histories) onto orphan squad-state cleanly; static files preserved on disk.
- 6 hooks installed; stateBackend: two-layer; pre-existing 	eamRoot/peers/devbox config preserved.
- Self-upgrade EPERM did NOT abort migration (UPGRADE-EPERM-FALSE-SUCCESS confirmed on the worst-case repo).

**Runtime failure (END-USER PROOF):**
- 4 continuity sessions, identical canonical invocation copilot --yolo --autopilot --agent squad -p "...".
- Orphan SHA frozen at deb2d49b across ALL 4 sessions (pre == post each time, zero growth).
- 3 of 4 sessions explicitly logged tools unavailable: "Scribe found the runtime state tools unavailable", "squad_state_* runtime tools aren't bound in this environment", "no squad_state_* runtime bridge is available".

**Root cause (confirmed again after alias experiment):** Copilot CLI 1.0.58 silently ignores project-level .copilot/mcp-config.json. The iter-4 MCP-NOT-AUTOLOADED wrapper (copilot-invocation.ts + 10 spawn sites) intercepts squad-spawned copilot processes but NOT the user's direct invocation. Retrofitted config is correct as an artefact, unreachable at runtime via the canonical entry point.

**Iter-5 recommendation:** ship squad copilot <args...> wrapper that pre-mixes --additional-mcp-config @<teamRoot>/.copilot/mcp-config.json, and make it the documented canonical end-user entry point.

**Report:** `.squad/files/validation/REVAL-ITER4-tamir-squad-hq.md` (mirror at `<dup>/validation/RE-VAL-iter4-tamir-squad-hq.md`). Decision drop: `.squad/decisions/inbox/data-reval-iter4-tamir-squad-hq.md`.

---

### 2026-06-02T213308+03:00 — Re-validation iter-4 / gh-ai-adoption2026 (data-reval-iter4)

**Bundle:** preview.8 manifest / preview.9 tarballs (re-pack). Twin SDK+CLI installed under `.npm-prefix-ghai-iter4`.
**Dups:**
- Fresh: tamirdresher_microsoft/gh-ai-adoption2026-tarball-test-iter4-20260602T213308
- Upgrade: tamirdresher_microsoft/gh-ai-adoption2026-tarball-upgrade-iter4-20260602T213308

**Build-time:** 🟢 GO. Fresh init two-layer clean; upgrade migrates 8 mutable files onto orphan, hooks install all 6, REGISTRY-PIN-UNPUBLISHED fallback verified (mcp-config rewritten to `@bradygaster/squad-cli@insider` because preview.9 unpublished).

**Runtime MCP:** 🔴 unresolved for direct-copilot pattern. Orphan SHA timeline `f5f7a48f → f5f7a48f → f5f7a48f → f5f7a48f` (0 commits across 3 sessions: Simpsons team build / Lisa schema / Frink KPI). Scribe + Coordinator self-reported "state bridge missing" verbatim. Iter-4 wrap fix scope = squad-spawned copilot (watch/loop/triage), NOT user-spawned `copilot --agent squad -p "..."`.

**Bug matrix:** ✅ 7 · 🔴 1 · n.a. 3.

**Iter-5 ask:** add `squad copilot <args>` subcommand to pre-mix `--additional-mcp-config` for the user-direct invocation path. Track github/copilot-cli#3642 for the upstream auto-load fix.

**Reports:** `.squad/files/validation/REVAL-ITER4-gh-ai-adoption2026.md` (mirror) · per-repo `validation/RE-VAL-iter4-gh-ai-adoption2026.md` on Dup A.



Full archive: .squad/agents/data/history-archive.md

---

## 2025 — MCP Phase 1 Recovery Spawn (data-5)

**Context:** Spawned to salvage Phase 1 of MCP config path migration after data-4 hung for ~7 hours without committing.

**Commit:** `892b2da2` on `feat/mcp-json-migration` (local only — no push, no PR per coordinator instruction).

**True scope shipped (21 files, all AUDIT-MATCH):**
- 4 code: `packages/squad-sdk/src/config/init.ts`, `packages/squad-cli/src/cli/core/init.ts`, `packages/squad-cli/src/cli/commands/state-mcp.ts`, `index.cjs`
- 1 test: `test/cli/init.test.ts`
- 8 template mirrors (twin-file invariant respected across `.squad-templates/`, `packages/squad-cli/templates/`, `packages/squad-sdk/templates/`, root `templates/`, plus `.github/agents/squad.agent.md`)
- 5 docs (`mcp.md` full rewrite + 4 cross-references)
- 2 changesets (new `mcp-json-migration.md`, 1-line update to `mcp-frontmatter-init.md`)

**Tests:** `test/cli/init.test.ts` 15/15 vitest pass; `test/mcp-config.test.cjs` 10/10 node:test pass.

**Lessons learned (the actually-useful ones):**

1. **Stale-stat phantom mods are a real recovery trap.** Initial `git status --porcelain` reported 3 modified `package.json` files with empty `git diff` output. Running `git update-index --refresh` immediately revealed the true state: 0 package.json mods, but 20 real modifications on other files that the index was hiding. **Rule: when diagnosing a hung-spawn recovery, `git update-index --refresh` is mandatory before trusting `git status`.** data-4 likely touched mtimes (build watch? IDE indexer?) without changing content.

2. **Stash named `phase1-temp` was a red herring.** It contained `ceremonies.md` deletions and `.gitignore` tweaks — completely unrelated to MCP Phase 1. Real Phase 1 work was live in the working tree, not stashed. **Rule: never auto-`git stash pop` on recovery; inspect `git stash show -p stash@{0}` first.**

3. **Coordinator's predicted collateral list was outdated.** No `.mcp.json` at root, no `test-fixtures/copilot-install-test/`, no `test-fixtures/init-test/`, no parser-contracts snapshot mod. Working tree was much cleaner than the spawn prompt predicted. **Rule: always re-verify `git status` and `Test-Path` collateral candidates fresh — don't trust a spawn-time snapshot of state.**

4. **Audit table missing from `decisions.md`.** The "Data — MCP Config Migration Audit" 25-row blast-radius table referenced in the spawn prompt was NOT in `.squad/decisions.md` (4017 lines searched). Worked around by using the new changeset `.changeset/mcp-json-migration.md` as scope-of-truth proxy. All 20 modifications mapped cleanly to its declared scope. **Rule: if a referenced decision is missing, the freshest changeset is usually the next-best authority.**

5. **Twin-file invariant survived.** All 4 mirrors of `mcp-config.md` and 4 mirrors of `squad.agent.md.template` had identical diffs — data-4 (or whoever did the edits before hanging) respected the invariant. The sync-templates script handles propagation but a manual review confirmed parity.

6. **Time-box discipline:** completed recovery+commit in well under the 45-minute budget once stale-stat was unblocked. Spawn for batch edits across N>10 files should split into per-area spawns of ≤5 files to avoid the 7-hour hang pattern.

**Deferred to Phase 2 (next spawn, with Worf review):**
- `squad upgrade` merge helper for repos that already have `.copilot/mcp-config.json` (apply Seven's precedence research: parse-before-overwrite, warn-and-preserve on same-name conflict with different command/args, atomic temp+rename writes)
- `ensureSquadStateMcpPinned` dual-write window (both legacy and new path during deprecation)
- Worf review pass on the Phase 1 commit before opening PR


## Learnings — MCP migration Phase 2 (2026-06-03)

- EnsureMcpServerResult exposes .warning (string|undefined), NOT .error. MigrateMcpConfigResult exposes both .warnings (array) and .error? (only on malformed-* statuses). Don't confuse them.
- TypeScript strict + `Record<string, T>` index access yields `T | undefined`. Guard with `if (x === undefined) continue;` before use.
- `overwriteOnConflict` defaults to `false` on `ensureMcpServerPinned` for safety on user-owned files. The `squad_state` pin is canonical, so init.ts must pass `true`. Dual-write tests need both branches.
- vitest cases for fs-touching helpers belong at `test/*.test.ts` (top-level), beside siblings like `storage-provider.test.ts`. The glob is `test/**/*.test.ts`.
- Atomic-write contract: temp file lives in the SAME dir as target so rename is single-volume atomic. Always assert no .tmp leftovers in success-path tests.

---

## 2026-06-02 → 2026-06-03 — MCP JSON Migration Batch (Phases 1–2, Issue #3642)

**Batch summary:** 5-agent spawn batch to implement MCP config migration feature and open PR #1208 on upstream (bradygaster/squad).

**Agent timeline:**
- **data-4** (2026-06-02T16:00:00Z): Phase 1 spawn — ZOMBIE (hung ~7.25h, no commits, replaced by data-5)
- **data-5** (2026-06-03T02:00:00Z): Phase 1 recovery — ✅ COMPLETED commit 892b2da2 (21 files, zero collateral)
- **data-6** (2026-06-03T03:33:48Z): Phase 2 implementation — ✅ COMPLETED 4 commits (3207f075, 4b635463, c264e57b, 92e3a394)

**data-4 hang analysis (Scribe lockout note):**
- Spawned with broad scope: 23+ predicted edits across templates, init, tests, docs, changesets
- Hung without reporting progress; likely hit interaction of:
  1. Large batch edit cross-file dependencies (template sync invariant + init updates + dual changesets)
  2. Stale stat-info phantom modifications (git index vs worktree time-mismatch)
  3. No intermediate checkpoints / time-box enforcement
- **Rule applied post-hang:** Batch edits with N > 10 files must decompose into per-area spawns ≤5 files each, with explicit time-boxes

**data-5 recovery (completed on-budget 45 min):**
- Applied `git update-index --refresh` (revealed stale stat phantom; true state = 20 files, not 3)
- Classified all 21 files: AUDIT-MATCH (zero collateral found; stash `phase1-temp` was unrelated)
- Shipped Phase 1: init code + 8 template mirrors + 5 docs + 2 changesets
- Tests: 15/15 (init), 10/10 (mcp-config) pass
- Commit: 892b2da2 on feat/mcp-json-migration (upstream squad, not squad-squad)

**data-6 Phase 2 (completed before Worf review):**
- Four commits shipped:
  1. 3207f075: Merge helper foundation (reconcile workspace + user configs)
  2. 4b635463: Dual-write support (both `.copilot/mcp-config.json` + `.mcp.json` during migration)
  3. c264e57b: atomicWriteJson helper (temp + rename for atomic safety)
  4. 92e3a394: Edge case tests (13/13 pass)
- Implementation incorporates Seven's precedence research (full shadow, no key-merge) and defensive patterns (no silent overwrites, atomic writes)
- Tests: 13/13 pass; ready for Worf review

**Worf review + Geordi conditions (batch closure):**
- Worf approved with 2 conditions (see worf-1 orchestration-log)
- Geordi applied both conditions (commit 77186501, tests 29/30 pass, 1 Windows-expected skip)
- PR #1208 opened by Coordinator on bradygaster/squad (feat/mcp-json-migration → main)

**Scribe decision batch:** 5 inbox files merged to decisions.md (2026-06-03T04:00Z):
- `seven-mcp-config-precedence.md`: CLI precedence research (workspace full-shadows user, no key-merge)
- `data-mcp-phase1-recovery.md`: Phase 1 commit + audit
- `data-mcp-phase2-complete.md`: Phase 2 commits + tests
- `worf-mcp-merge-helper-review.md`: Worf approval + 2 conditions
- `geordi-mcp-worf-conditions-applied.md`: Condition application + final tests

**Deferral:** None — feature complete, PR open, awaiting upstream maintainer merge on PR #1208 (bradygaster/squad)

**Batch status:** ✅ CLOSED (PR #1208 opened; issue #3642 resolved in implementation)
