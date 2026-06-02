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

**Proposed title:** "Community contribution: Squad.Agents.AI — .NET adapter for Microsoft Agent Framework"

---
**Last Updated:** 2026-06-02T20:58:00+03:00  
**Archive:** `.squad/agents/picard/history-archive.md` (detailed architecture review)

## 2026-06-02T20:58:00+03:00 — Tracking Issue #1205 Posted (Picard-3)

**Status:** Live on bradygaster/squad, awaiting Brady's `go:yes` signal before cross-fork PR.

Picard's upstream tracking issue draft posted as bradygaster/squad#1205 (type:feature). Issue includes pre-post analysis on Brady's repo posture, existing related issue #1144 (social proof for MAF/Squad integration), and explicit recommendation on in-repo vs. companion-repo placement.

**Next:** Monitor #1205 for Brady's triage decision. If greenlit, Tamir opens cross-fork PR to tamirdresher/squad targeting bradygaster/squad:dev.
