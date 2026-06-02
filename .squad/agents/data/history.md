# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## Current Status (2026-06-02T19:39:52Z)

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

**Last Updated:** 2026-06-02T20:58:00+03:00

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
- `.github/agents/squad.agent.md` — 3 sites: routing section (5-path + dedup + personal exclusion + HTML sync comment), State Protocol skills note (parenthetical added), spawn template skill-check (single line naming all 5 paths)
- `.squad/templates/squad.agent.md.template` — same 3 sites mirrored exactly
- `.squad/templates/plugin-marketplace.md` — 1 site: added "Why `.squad/skills/`?" note after the install steps
- `.copilot/skills/squad-conventions/SKILL.md` — 1 site: file structure section expanded from single `.squad/skills/` line to full 5-path table with personal-paths exclusion note

**Sync verification:** PASS — both squad.agent.md files show identical +14/-5 delta in the routing and spawn-template sections.

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
