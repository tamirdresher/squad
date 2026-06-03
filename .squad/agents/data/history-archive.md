# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## Current Status (2026-06-02T19:39:52Z)


## Archived Sessions (pre-2026-06-02T22:51Z)

### 6-Repo Tarball Validation Batch — COMPLETE

**Result:** 🟢 GO on build-time fixes. Iteration 4 pending decision.

**Agents completed:**
- data-15: MCP loader RCA (Theory 2 confirmed—unpublished version)
- data-14: tamir-squad-hq (8✅/1❌)
- data-12: gh-ai-adoption2026 (8✅/2❌)
- data-11: holocaust-research-wasserman (8✅/4❌, first Gap-1 end-to-end proof)
- data-13: squad-ai-vulns (8✅/1❌)

**Build-time verdicts:** 8 fixes confirmed (GAP-1, GAP-2, WI-1, UPGRADE-FLAG-IGNORED, UPGRADE-NO-MIGRATION, UPGRADE-EPERM-FALSE-SUCCESS, INSIDER3-INIT-LEAK, MCP-config retrofit).

**Iteration 4 queued:**
- Option A: MCP pin validation + fallback to @insider tag (~40 LOC)
- Decouple EPERM from --state-backend migration

**Artifacts:** 5 TARBALL-FULL-*.md in .squad/files/validation/, orchestration logs, session log, RCA report at MCP-LOADER-ROOT-CAUSE.md, 8 test repos retained.

### Next Steps

1. Review iteration-4 decision on Option A implementation
2. If approved: re-smoke after MCP pin fix, re-test all 6 repos
3. Promote tarball bundle to production (build-time gates all passed)
4. File separate issue for runtime MCP bridge reachability (copilot-client layer)

## Session Archives

**Completed sessions moved to:** .squad/agents/data/history-archive.md
- Auth Expansion Proposal
- Upgrade-Path Baseline Analysis
- Combined Fix Bundles (Iter 1–3)
- Tarball Smoke Tests (travel-assistant, multiplayer-sudoku)
- PR #3 R2c completion
- Workstreams Bootstrap

## 2026-06-02T19:39:52+03:00 — Synthesis pattern: 6-repo final validation report

Synthesized 6 per-repo tarball reports + MCP RCA + iter-3 manifest + insider.3 baseline into a single evidence-driven GO/NO-GO document.

Pattern learned for future multi-repo bundle validations:
1. **Bug-by-bug cross-repo matrix** with one row per bug, one column per test repo. Forces ✅/❌/⚠️/n.a. discipline and makes "how universal is this fix" visible at a glance. Skip percentages — exact symbols only.
2. **Story-of-the-residual-bug** section before the bug list. Names the RCA author, names the independent corroborators (Data-15 RCA, Data-12 + Data-11 repros), and states the end-user impact in one bolded sentence so the reader doesn't have to infer severity from the matrix.
3. **Iteration N+1 list with concrete LOC + file path + test plan** for each remaining item. ~40 LOC at upgrade.ts:705 + ~20 LOC at cli-entry.ts + ~10 LOC filename sanitizer. Makes follow-up scope auditable.
4. **Three-track GO/NO-GO** (MERGE-NOW / MERGE-AFTER-ITER-N / HOLD) with the exact conditions for each, then pick one explicitly. Don't hedge.
5. **Coverage matrix with browsable URLs as a single row per repo** — owner class + pre-squadified state + fresh/upgrade verdict + dup URLs. Tamir clicks once to reproduce anything.

Final report: .squad/files/validation/6REPO-TARBALL-VALIDATION-FINAL.md (~16 KB). Recommendation: 🟡 MERGE-AFTER-ITER-4.

## Learnings

### Cleanup: removed pr-body.md (2026-06-02)

**Commit SHA:** beec9cf2  
**Action:** Deleted outdated draft PR body file from feature/squad-agents-ai.  
**Rationale:** File was added in commit ad05d3d4 as an early draft before the live PR description finalized. PR #3 body on GitHub (edited by B'Elanna) is now the canonical source. Standalone file creates confusion during upstream review.  
**CI behavior:** No checks ran due to path filter (file at repo root, not in src/Squad.Agents.AI/**).  
**Returned to branch:** tamirdresher/1201-subcommand-help ✓  

---

**Last Updated:** 2026-06-02T21:32:00+03:00

## 2026-06-02T21:32:00+03:00 — Re-Val iter-4 (1/6) travel-assistant ❌

Tarball **0.9.6-preview.9** against `tamirdresher/travel-assistant`. 4 sessions across 2 dups (3 fresh-init + 1 post-upgrade continuity); **orphan grew 0 commits across all 4.** MCP runtime bridge still dead because `copilot --agent squad` invokes copilot directly, bypassing squad's process wrap. The iter-4 `copilot-invocation.ts` fix only injects `--additional-mcp-config` when squad is the spawn parent (watch/loop/bridge/PTY — 10 internal sites). Canonical user invocation never hits any of those. Same root failure as iter-3, same as Data-16 alias experiment.

Sub-finding: REGISTRY-PIN fallback is asymmetric. `upgrade.ts` correctly swaps unpublished `@0.9.6-preview.9` → `@insider` dist-tag (validated on dup2). `init.ts:buildMcpServerSpecs` retains literal pin (dup1 shows `@0.9.6-preview.9`). 15 LOC mirror needed.

Iter-5 ask: ship `squad copilot` wrapper subcommand pre-mixing `--additional-mcp-config @<teamRoot>/.copilot/mcp-config.json` + recommend it as canonical user invocation in README and squad.agent.md prompt. ~30 LOC + docs.

Score: 14 ✅ / 2 ❌ / 1 ⚠ / 1 n/a. Verdict drop at `.squad/decisions/inbox/data-reval-iter4-travel-assistant.md`. Full report at `.squad/files/validation/REVAL-ITER4-travel-assistant.md`. Dups retained (private). Auth restored to tamirdresher_microsoft.

## 2026-06-02T20:58:00+03:00 — Tracking Issue #1205 Posted & Live (Data-6 Cleanup)

**Status:** Awaiting Brady's signal on bradygaster/squad#1205.

Confirmed pr-body.md removal from feature/squad-agents-ai (cleanup complete). Tracking issue #1205 is now live on bradygaster/squad; awaiting Brady's `go:yes` triage decision to proceed with cross-fork PR.

**Parallel activity:** Data-6 cleanup validated. PR #3 remains upstream-ready with no stale artifacts.


---

### Alias Experiment — 2026-06-02T19:39:52Z (data-16)

Manually patched squad_state MCP entry on 	amir-squad-hq-tarball-test-20260602T183202 to test Data-15 Option A empirically. **Result overturns Data-15's framing.**

- Bare alias squad state-mcp → tools still unavailable, orphan 2→2.
- Debug-log inspection (Copilot CLI 1.0.58) → only user-level `~/.copilot/mcp-config.json` is loaded; project-level `.copilot/mcp-config.json` is silently skipped. `squad_state`, `bitwarden-shadow`, `EXAMPLE-trello` all dropped.
- Passing project config via `--additional-mcp-config "<json>"` → 7 tools register, `squad_decide` works, orphan grew 2→10 commits in a single session.

**iter-4 pivot:** Data-15 Option A is necessary-but-not-sufficient. Fix path = A1 (squad wraps copilot invocations with `--additional-mcp-config`) + Data-15 Option A on launch-spec content. Parallel: A4 upstream CLI issue about project-config auto-load.

Side findings: `squad ensure` does not exist as a command (revert had to be manual); StateBackendStorageAdapter writes keys as absolute paths rooted at canonical TEAM_ROOT (non-portable but functional).

Full verdict: `.squad/files/validation/ALIAS-EXPERIMENT-VERDICT.md`. Decision drop: `.squad/decisions/inbox/data-alias-experiment-verdict.md`.

---

### 2026-06-02T21:10:16.324+03:00 — 5-Path Skill Discovery Policy Implemented [ws:skill-discovery-paths]

**What shipped:** Picard's skill-discovery design (5-decision policy) implemented across 4 files / 6 edit sites. Squad's coordinator now scans ALL 5 project skill paths in precedence order instead of just 2.

**5-path scan policy — for future reference:**
- **Scan order (high → low precedence):** `.squad/skills/` > `.copilot/skills/` > `.github/skills/` > `.claude/skills/` > `.agents/skills/`
- **Personal paths excluded:** `~/.copilot/skills/` and `~/.agents/skills/` are NOT scanned — CLI injects them ambiently. Logging them in team-visible spawn artifacts violates the personal/team boundary.
- **Traversal:** one level deep only (`{path}/{skill-name}/SKILL.md`). Symlinks skipped. No per-session cache.
- **Dedup rule:** directory name is the skill identity (case-insensitive). When the same name appears in multiple paths, the highest-precedence version wins. Log a warning on case-mismatch: `⚠ Skill '{name}' found in multiple paths (case-variant); using {winner-path}.`

**squad.agent.md ↔ template sync discipline learned:**
- `.github/agents/squad.agent.md` and `.squad/templates/squad.agent.md.template` are structural twins — every content change to the coordinator prompt must be mirrored in the template.
- The template ships via `squad upgrade`; if the two files drift, upgraded projects get inconsistent behavior.
- Verification step: after editing, check that both files show the same `git diff --stat` line count for the changed sections. The routing section, State Protocol skills note, and spawn template skill-check all changed by identical line deltas (+14/-5) — that's the PASS signal.
- Gotcha: when replacing a multi-line block in the template, verify the `old_str` doesn't inadvertently include neighboring `{% if %}` blocks. My first attempt accidentally swallowed the orphan-branch section; caught immediately and restored.

**Files changed:**

---

# Archived History Entries (2026-06-02 to 2026-06-03)

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

## Learnings

### Port-from-local-to-upstream skill-discovery (2025-11-22)

**Commit SHA:** `fe1e7e8c` on branch `feat/skill-discovery-paths` (upstream `bradygaster/squad`, branched from `upstream/dev`, NOT pushed).

**Pattern: governance-doc-first → upstream port.** squad-squad's `.github/agents/squad.agent.md` is the authoritative skill-routing source; upstream templates lag. Workflow: read TEAM ROOT governance lines (266-278 + 933) → edit upstream `.squad-templates/` ONLY → run `node scripts/sync-templates.mjs --sync` → verify byte-identical via SHA-256. Source-of-truth is `.squad-templates/` (not `templates/`); script propagates to 3 mirror dirs + `.github/agents/`.

**Surprise: adjacent ref in spawn-reference.md.** Task brief implied 5 files (squad.agent.md mirrors only), but the spawn-template "Check project skill directories" line lives in `spawn-reference.md` (4 mirrors). Final edit count: 9 template files + 1 changeset = 10. Always grep upstream for the OLD 2-path text across all template `.md` files, not just `squad.agent.md`.

**Mirror invariant enforcement:** `test/template-sync.test.ts` re-runs sync in `beforeAll` then byte-compares all mirrors (194 tests, 2.3s on Windows). It's the single test that catches "edited mirror but forgot to update `.squad-templates/`" — make it the first targeted test after any template edit.

**sync-templates.mjs invocation:** Requires `--sync` flag OR `SQUAD_SYNC_TEMPLATES=1`. Exits 0 silently when nothing changes; prints copied-file list when work was done. Safe to re-run.

---



**Commit SHA:** `de057079`

**Files modified (8):**
- `src/Squad.Agents.AI/SquadAgent.cs`
- `src/Squad.Agents.AI/SquadServiceCollectionExtensions.cs`
- `src/Squad.Agents.AI/samples/Squad.Agents.AI.Sample/Program.cs`
- `README.md`
- `CHANGELOG.md`
- `src/Squad.Agents.AI/README.md`
- `src/Squad.Agents.AI/Squad.Agents.AI.csproj`
- `test/Squad.Agents.AI.Tests/Squad.Agents.AI.Tests.csproj`

**Multi-target test result:** 43 passed / 0 failed on each of net8.0, net9.0, net10.0 → 129 total.

**PR mergeable-state after push:** `MERGEABLE` / `CLEAN` (head `de057079`).

**Surprising:** The `Microsoft.Agents.AI.GitHub.Copilot` preview package (v1.7.0-preview.260526.1) supports net8.0 and net9.0 without any conditional compilation needed — multi-target restore and build succeeded cleanly on all three TFMs with zero warnings.

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

## 2026-06-03T06:56:20+03:00 — Iter-4 re-validation synthesis (5/6 cross-repo)
Synthesized 5 per-repo iter-4 re-val reports + Data-15 RCA + Data-17 alias proof + iter-3 final into .squad/files/validation/6REPO-REVAL-ITER4-FINAL.md (~14 KB). Verdict: 8 build-time fixes confirmed across 5/5 reporting repos including worst-case (tamir-squad-hq). Runtime MCP via direct user invocation still blocked by two newly-pinpointed root causes: (1) USER-INVOCATION-BYPASSES-MCP-CONFIG — wrap fix only intercepts squad-internal copilot spawns; (2) INIT-VS-UPGRADE-ASYMMETRY — REGISTRY-PIN fallback only in upgrade.ts, not init.ts. Iter-5 in flight (peer spawn): squad copilot wrapper (~25 LOC), init.ts MCP-spec mirror (~15 LOC), UPGRADE-TEMPLATE-DOC-FLATTEN (~20 LOC). Sample completeness 5/6 — data-23 (squad-ai-vulns) hung 8h+, documented as measurement gap. Recommendation: 🟡 MERGE-AFTER-ITER-5 + 2-repo re-smoke (hq upgrade + travel fresh-init), pass = orphan SHA grows.

## 2026-06-02T22:42:00Z — PR #1207 Rebase + 12-comment Reviewer Sweep (Data-7 + Data-8)

PR bradygaster/squad#1207 (Squad.Agents.AI NuGet) fully addressed: (1) rebased feature/squad-agents-ai onto upstream/dev clearing 2 merge conflicts (.gitignore, CHANGELOG.md); (2) applied all 12 Copilot review comments in single forward commit (CliArgs guard, 4x name validation, placeholder fix, 3x doc refs, multi-target net8/9/10 with 129 tests passing). New HEAD de057079. Status: MERGEABLE/CLEAN, awaiting brady review.

## 2026-06-02T to 2026-06-03T00:00:00Z — Historical Summary (Compacted on 2026-06-03)

### Major Workstreams Completed

**Squad.Agents.AI Research & Launch (2026-06-02 ongoing):**
- PR #1207 opened on bradygaster/squad targeting dev branch (Closes issue #1205)
- All 12 Copilot review comments addressed; 129/129 tests passing
- PR #1207 status: MERGEABLE/CLEAN, awaiting brady review

**MCP JSON Migration Batch (2026-06-02 to 2026-06-03):**
- PR #1208 opened (feat/mcp-json-migration → main); status: CLOSED, awaiting upstream maintainer merge

**Validation & Combined-Fixes (2026-06-03):**
- RE-VAL iter-4 through iter-6: validation smokes across 5/6 cross-repo test suite
- Iter-5 shipped: `squad run-copilot`, init MCP-spec parity, template-doc routing (PR #1200, preview.11)
- Iter-6 shipped: Windows quoting fix + local-install fallback (PR #1200, preview.12)
- Smokes revealed persistent orphan-Δ=0 due to npm public access; re-test with HOME override pending
- Detailed archive: `.squad/agents/data/history-archive-2026-06-03.md`
- **SMOKE iter-7 / tamir-squad-hq (2026-06-03):** 🟡 PARTIAL. iter-7 HOME-write architecture verified: `squad run-copilot` deleted (✓ Unknown command), `squad upgrade` auto-installed `squad_state_8721a7e9` to `~/.copilot/mcp-config.json` (no hand-edit), all 8 pre-existing user MCP servers preserved byte-identical (sha256), project mcp tombstone removed. **Blocked at sessions step:** repo has no `stateBackend: "two-layer"` in `.squad/config.json` and no `origin/squad-state` branch — never initialized to two-layer despite task context. Not an iter-7 regression. HOME restored sha256-identical to backup; backup deleted. Report: `.squad/files/validation/SMOKE-ITER7-tamir-squad-hq.md`.

### Skill Discovery Paths (2026-06-02)

- Worf R-1: NFC normalization + control-char denylist
- Worf R-2: Hardlinks over symlinks (Windows compat)
- Status: 🔒 LOCKED OUT (Gate 2 Security); Picard owns remediation

### Current Operational Status

- **Auth state:** Currently on tamirdresher_microsoft (EMU)
- **Backlog:** Iter-7 re-smoke with tighter deterministic prompt; upstream iteration planning
- **Blockers:** None for Squad.Agents.AI PR #1207 (upstream-ready)