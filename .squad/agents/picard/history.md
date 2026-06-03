# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI architecture, routing invariants, extensibility design, API surface decisions
- **Created:** 2026-06-02T10:30:00Z

## Picard — Core Mission

Picard (Lead Architect) owns product architecture decisions, extension-point evaluation, routing invariant protection, and implementation readiness gates. Architecture reviewer for Squad.Agents.AI auth expansion.

## 2026-06-02 — Squad.Agents.AI Auth Expansion Architecture Review (APPROVE_WITH_CONDITIONS)

**Review Verdict:** APPROVE_WITH_CONDITIONS (6 conditions)

**Key Decisions:**
1. **Hard Routing Gate:** Post-delegate validation MUST snapshot/restore `Cwd`, `CliArgs`, `CliPath` if delegate modifies. Non-negotiable per Decision 447 routing contract.
2. **BYOK Deferred to v0.2:** `Provider` + `Model` + `BuildSessionConfig` refactoring deferred. v0.1 focuses on CopilotClientOptions layer (Candidate 1 configure delegate).
3. **Candidate 1 Approved:** Configure delegate shape is correct; Candidate 3 (client factory) rejected as bypassing invariants.
4. **Seam Documentation:** Add comment explaining two-seam model for contributors.
5. **Naming:** `ConfigureCopilotClient` signals SDK internals access correctly.
6. **Deferred gates:** Token provider + BYOK interaction, Model property overlap deferred to v0.2.

**Rollout Risk:** LOW (additive changes; 19/19 test suite gates regression).

**Status:** Implementation may proceed once Worf clears security.

---

## 2026-06-02 — Release Pipeline Branch-Driven per Strategic Call

**Status:** v0.1 PUBLISH-READY

Release pipeline now implemented as branch-driven (dev→prerelease, main→stable) per Tamir's directive (2026-06-02T14:15:06+03:00), mirroring Squad CLI patterns. Commit `db05f2a3` completed B'Elanna Phase 2 revision. Docs audit passed (commit `6f8994e5`). PR #3 ready for merge and v0.1 tag pending `NUGET_API_KEY` secret setup (maintainer action).

---

## Learnings

### Workstreams refinement — session-aware concurrency (2026-06-02)

**Binding mechanism:** Env var `SQUAD_WORKSTREAM={slug}` as primary (shell-scoped, per-session by construction), interactive prompt via `ask_user` as fallback when unset. No disk-based session state — session binding is ephemeral; workstream state is durable in per-workstream `now.md`.

**Top concurrency invariant:** Scribe MUST scope `git add` to the active workstream's subtree — never `git add .squad/` globally. This prevents one session from staging another session's concurrent workstream changes.

**Verdict:** APPROVE_WITH_CONDITIONS (7 conditions). Bootstrap one workstream first (`squad-agent-nuget`), validate resume contract, then expand. Advisory lock (`.session-lock`, `.gitignore`d) prevents accidental same-workstream collisions. Agent histories stay global with workstream tags — agents are people with cross-initiative memory.

### Bradygaster upstream issue draft (2026-06-02)

**Repo posture observed:**
- `bradygaster/squad` is a JS-first npm workspace monorepo. Zero .NET code today. No issue templates. Label taxonomy includes `type:feature`, `go:yes/no/needs-research`, `status:contributor-invited`.
- Community PRs accepted regularly (obit91 has 4 open PRs). Brady uses `go:yes` as greenlight. Tamir is already a COLLABORATOR (per #1144 author association).

**Existing-issue search results:**
- `Squad.Agents.AI`: 0 results (net-new).
- `MAF`: 1 result — #1144 (open, filed by tamirdresher, telemetry gap for embedded host processes). Community member laurentkempe expressed interest in MAF/Squad integration.
- `.NET adapter`: 0 results.

**In-repo vs. companion repo recommendation:** Lean companion repo as lower-friction default, but offer both paths. Rationale: adding `dotnet` toolchain to a JS monorepo is foreign to existing contributors; companion repo lets .NET package version independently. If Brady prefers discoverability, in-repo under `src/Squad.Agents.AI/` works since CI is isolated.

### Skill discovery precedence policy (2026-06-02)

**Copilot CLI skill paths:** The CLI supports 5 project skill locations (`.github/skills/`, `.claude/skills/`, `.agents/skills/`, `.copilot/skills/`, plus Squad's `.squad/skills/`) and 2 personal paths (`~/.copilot/skills/`, `~/.agents/skills/`). Squad was only scanning 2 of 5 project paths — skills in `.github/skills/` (the most natural location beside `.github/workflows/` and `.github/agents/`) were invisible to routing.

**Precedence order chosen:** `.squad/skills` > `.copilot/skills` > `.github/skills` > `.claude/skills` > `.agents/skills`. Principle: team-earned > project playbook > generic project. This means a `.squad/skills/X` always overrides `.github/skills/X` — intentional, because the team explicitly specialized the skill.

**Personal skills excluded from routing.** Copilot CLI already injects them ambiently. Re-attaching via `Relevant skill: ...` is duplication. Personal skills are also non-portable across machines and shouldn't appear in team-visible orchestration logs. Users who want a personal skill in Squad routing should promote it to a project path.

**Skill identity = directory name (case-insensitive).** Not SKILL.md frontmatter — too fragile, optional, and divergent from CLI behavior. Dedup on case-normalized directory name, log warning on case-variant collisions.

**Traversal: one-level deep, no symlinks, no caching.** Five `readdir` calls per spawn is <5ms on any filesystem. Symlinks skipped for Windows compat and security. No cache avoids staleness when skills are added mid-session.

**Proposed title:** "Community contribution: Squad.Agents.AI — .NET adapter for Microsoft Agent Framework"

---
**Last Updated:** 2026-06-02T20:58:00+03:00  
**Archive:** `.squad/agents/picard/history-archive.md` (detailed architecture review)

## 2026-06-02T20:58:00+03:00 — Tracking Issue #1205 Posted (Picard-3)

**Status:** Live on bradygaster/squad, awaiting Brady's `go:yes` signal before cross-fork PR.

Picard's upstream tracking issue draft posted as bradygaster/squad#1205 (type:feature). Issue includes pre-post analysis on Brady's repo posture, existing related issue #1144 (social proof for MAF/Squad integration), and explicit recommendation on in-repo vs. companion-repo placement.

**Next:** Monitor #1205 for Brady's triage decision. If greenlit, Tamir opens cross-fork PR to tamirdresher/squad targeting bradygaster/squad:dev.

## 2026-06-02T22:22:40+03:00 — MCP config migration scope (Picard-4)

**Decision:** GO additive .copilot/mcp-config.json -> .mcp.json in next minor of squad-cli + squad-sdk.

**Key trade-offs weighed:**
- Additive vs rip-and-replace: chose additive because we do NOT pin user's Copilot CLI version, so a hard cutover would break users mid-upgrade. +0.5 day cost is worth zero-regression guarantee.
- Additive vs deprecate-and-warn: warning is noisy for the majority of users who never edit MCP config; merge helper is mechanical, so just do the merge silently and preserve the legacy file.
- One minor release window is our default cadence; merge helper persists forever for users who skip versions.

**Handoff gates locked in:**
1. Seven re-spawn (30 min) for precedence/merge/failure semantics — informs Data's conflict-resolution logic, not blocking on code start.
2. Worf BLOCKING review of merge helper for `squad_state` atomicity + conflict policy + crash recovery, before upstream PR goes ready-for-review.
3. Coordinator enforces: no silent legacy-file deletion, historical decisions log not rewritten, ADC sandbox files untouched.

**Sequencing:** open bradygaster/squad tracking issue NOW (same playbook as #1205), close github/copilot-cli#3642 immediately with thank-you + cross-link, ship upstream PR after.

**Reusable lesson:** when a third-party tool's supported config path differs from ours, the answer is almost always **additive + merge-helper**, never rip-and-replace, because we do not control the user's tool version. Pattern applies to any future Copilot CLI / VS Code / Cursor path divergence.

**No B'Elanna engagement** — merge helper is filesystem-only, no durable-state invariant impact.

**Decision file:** `.squad/decisions/inbox/picard-mcp-json-migration-scope.md`

---

## 2026-06-03T03:50:00Z — PR #1208 Opened on bradygaster/squad (MCP JSON Migration)

**Coordinator action:** PR #1208 on bradygaster/squad (feat/mcp-json-migration → main) opened after Geordi confirmed conditions applied + tests passing (29/30).

**Batch status:** ✅ Feature implementation complete:
- Seven: Precedence research (3 experiments on CLI 1.0.58)
- Data-5: Phase 1 shipped (commit 892b2da2; 21 files, zero collateral)
- Data-6: Phase 2 shipped (4 commits; merge helper, dual-write, tests 13/13)
- Worf: Safety reviewed, approved with 2 conditions
- Geordi: Conditions applied (commit 77186501; tests 29/30, 1 Windows skip)

**PR summary:** Closes issue #3642 (MCP config migration from `.copilot/mcp-config.json` → workspace `.mcp.json`). Includes:
- Phase 1: Init code + template mirrors + docs + changesets
- Phase 2: Merge helper (reconcile workspace + user configs) + dual-write support + atomic writes + edge-case tests
- Conditions: EACCES handling (try/catch) + round-trip parse validation before rename

**Picard sequencing lesson:** MCP migration scope decision (Picard-4) executed perfectly — additive migration path selected, all handoff gates locked in and traversed, no silent file deletion, historical decisions preserved. Upstream PR open with full audit trail in `.squad/decisions.md`.

**Awaiting:** Upstream maintainer merge on bradygaster/squad (PR #1208)
