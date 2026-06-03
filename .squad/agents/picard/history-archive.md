# Picard Architecture History — Archive

Archived entries from `.squad/agents/picard/history.md` (2026-06-02 and earlier). Active history contains 2026-06-03 decisions only.

---

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

## Learnings

### 2026-06-03 — Design-to-shipped-prompt gap (Decision 3 omitted by implementer)

**Workstream:** skill-discovery-paths
**Trigger:** Worf rejected Gate 2 (symlink-skip rationale) on Data's commit `fe1e7e8c`. Decision 3 (one-level / skip symlinks / no per-session cache) was clearly stated in workstream `decisions.md:236-250` but **zero lines** made it into the shipped prompt at `.squad-templates/squad.agent.md`. Five mirrors synced — and all five had the same missing content.

**Root cause hypothesis:** Decision 3 in my design doc was structured as three labeled rules ("Recursive: ONE level only", "Symlinks: SKIP", "Caching: NO explicit cache") with rationale bullets, but it was NOT presented as a drop-in replacement paragraph for the prompt. The other decisions (precedence list, personal-paths exclusion, dedup rule) had near-verbatim prompt-shaped text. An implementer skimming for "what literally goes in the file" would see prompt-ready text for 4 of 5 decisions and design-doc-shaped text for Decision 3 — and then ship only what was prompt-ready.

**Lesson for future hand-offs:**
1. When my design includes content that MUST land in a shipped artifact (prompt, doc, code), present that content **in its final shipped form** in the design doc — not as design-doc bullets that need translation.
2. Add an explicit "**Shipped text (drop in verbatim):**" subsection per decision when the decision has prompt language.
3. Reviewers should grep the shipped artifact against each decision's key terms ("symlink", "one-level", "cache") as a preflight check — Worf did this and caught it cleanly. Bake this into the reviewer's standard preflight.

**Validation:** I authored the revision (Data locked out per Reviewer Rejection Lockout). The shipped paragraph is now self-contained and reviewer-greppable. Worf re-review pending.

**Tag:** [ws:skill-discovery-paths]

---

### 2026-06-03T03:55:03Z — Skill-Discovery-Paths: Remediation Complete + PR #1209 Opened [ws:skill-discovery-paths]

**Status:** ✅ PR #1209 OPEN on bradygaster/squad:dev — awaiting upstream review

**Remediation executed:** All 5 conditions applied in single commit pair per anti-hang rule.
- Upstream `8a62093a`: Traversal rule + Windows reparse-point callout + "Legitimate monorepo" clause. Also: Unicode NFC + denylist, Windows reserved names, dedup logic + tests, personal-path exclusion.
- Squad-squad `d852083f`: Lockstep `.github/agents/squad.agent.md` update. SHA-256 mirror invariant verified across all 5 upstream mirrors.

**Worf verdict:** ✅ APPROVED — C-0..C-4 all verified satisfied. No new conditions. Tests 261/261 pass.

**Coordinator actions:** Push squad-squad master to EMU (commit d852083f), auth-switch to personal fork, push upstream feat/skill-discovery-paths to tamirdresher/squad, open cross-fork PR #1209 on bradygaster/squad with full context body.

**Governance complete:** All `.squad/` state committed. Workstream transitioned to "PR open — awaiting upstream review."

## Learnings (2026-06-03 — PR #1209 Copilot-bot review)

**Copilot-bot review accuracy assessment (review #4415423035):**
All 3 nits were technically correct, not stylistic:

1. **Hardlink/Windows portability (squad.agent.md:314)** — *Technically correct, high-value.*
   Directory hardlinks genuinely do not exist on Windows NTFS (hardlinks are file-only;
   junctions / mklink /J are reparse points, which we already exclude). Recommending
   hardlinks was an outright cross-platform bug-in-prose. Lesson: when writing FS-level
   recommendations in shared docs, sanity-check against Windows constraints first — our
   own traversal rule already documents reparse-point exclusion, which should have been
   the cue.

2. **HTML sync comment overclaim (squad.agent.md:306)** — *Technically correct, medium-value.*
   The single-line sync comment implied all 5 paths in the list were "official Copilot CLI
   skill paths" per the linked docs. Only 3 are. Stylistically the original was terse and
   readable, but factually misleading enough to mis-anchor future maintainers who would
   trust the linked doc as authoritative for all 5.

3. **Changeset overclaim (.changeset/skill-discovery-paths.md)** — *Technically correct,
   medium-value.* Same factual error as #2, in a more user-facing surface (changelog).

**Reviewer reliability takeaway:** Copilot-bot caught real factual issues that human
review missed (Worf approved the prior revision). The bot's nits were narrow and
defensible — no false positives, no stylistic noise. Worth treating bot nits as
worth-addressing-in-one-revision when factually grounded, even when non-blocking.

**The Windows hardlink portability lesson (general):**
- File hardlinks: portable across NTFS / ext4 / APFS
- Directory hardlinks: **NTFS does NOT support them** (only Unix-family FSes do)
- Junctions (mklink /J) on Windows: reparse points, NOT hardlinks; behave like
  bind-mounts and should be excluded from skill scanning for the same reason as symlinks
- Cross-platform recommendation for "share a directory across paths": **copy or vendor**,
  not hardlink, not symlink. If a workflow truly needs deduplication, that's a tooling
  problem (git-subtree, monorepo orchestration), not a filesystem problem.

---

## Earlier archive (2026-05-14 – 2026-06-02T08:46:00Z)

## 2026-06-02T08:46:00Z — Scribe Archival Session

**Summary (16KB → Archive):**
Picard owns architecture & product confidence framework. Key learnings:
- **State-backend decomposition:** PR #1200 validated high-quality; remaining 8 work items (WI-1 through WI-8) sequenced; WI-1 critical-path (silent data loss on upgrade); WI-2-4 bundled for Geordi; WI-5 prompt-only for ralarcon; WI-6-8 deferred
- **Squad.Agents.AI adoption:** Inherited tamresearch1 Decisions 437–448; Decision 443 (pivot from MAF wedge to community NuGet); Decision 447 (design freeze: Squad.Agents.AI, net10.0, CopilotClientOptions routing); PR #3 all-green, ready for v0.1 release
- **Product confidence framework:** Four-tier evidence model (mechanical/simulation/CLI E2E/production) with stop conditions; Tier 2 ceiling per Worf gate; multi-repo real CLI E2E deferred
- **Architectural pattern:** Path resolution centralized (`effectiveSquadDir()` + `resolveStateDir()` helpers); upgrade pipeline weakest link; doctor-as-gate requires repair path

## 2026-05-17T09:05:10.003+05:30 — ADC Squad Runner Demo PRD/Design/Implementation Complete

**Deliverable Status:** Full PRD, design document, and implementation completed across agent team.

**Consolidation:** Picard drafted comprehensive PRD and design documentation; implementation specs, Squad runtime integration contracts, and reliability invariants finalized with agent consensus. Email sent to tamirdresher@microsoft.com with complete package.

**Next Steps:** Live ADC auth validation, secrets provisioning, Squad CLI installation in sandbox, then validation run with periodic ephemeral model (GitHub Actions cron → `squad schedule run daily-triage --json`).

## 2026-05-19T12:29:41.573+03:00 — Real CLI E2E Confidence Thresholds Defined

**Decision:** Operationalized the user's directive for real Copilot CLI E2E experiments. Defined two concrete evidence levels with hard stop conditions:

- **Level 1 (Smoke):** 1 repo, 5–10 turns. Proves CLI transport works, memory round-trip succeeds, guards fire. Stop on hang >5 min, leakage, or zero recalls.
- **Level 2 (Multi-Repo):** 3+ repos, 15–20 turns each. Reproduces Tier 2 substitute signal in live CLI. Stop if signal not reproduced in ≥2/3 repos, isolation breach, or >2 hangs.

**Forbidden claims even after Level 2:** Production-ready, statistically significant, shippable, scales to N users, productivity improvement. These require Tier 4 (chaos/load) — separate gate.

## 2026-05-19T18:44:51.409+03:00 — Memory Value Confidence Path: Accept Bounded Claim

**Decision:** Option (A) — accept current evidence as sufficient for a bounded claim. Stop chasing full multi-repo real CLI E2E. Evidence portfolio: 55 real CLI invocations (100% single-repo recall across 30 tsyringe turns, all guards held), 150 substitute paired turns (3 repos, directional recall improvement, cross-repo isolation at memory layer). Multi-repo real CLI E2E is blocked by Copilot CLI product limitation: shared session store without per-repo partitioning, and isolated `COPILOT_HOME` breaks `store_memory` persistence. Not a Squad defect. Bounded claim permits single-repo real CLI value + multi-repo substitute value. Redirecting team energy to other deliverables. Multi-repo real CLI E2E deferred to when Copilot CLI adds session store partitioning.

## 2026-05-19T12:29:41.573+03:00 — Phase 2 Multi-Repo E2E Success Criteria & Claim Boundaries Defined

**Decision:** Operationalized Phase 2 success criteria following Phase 1 smoke PASS (Worf verdict). Defined 11 acceptance criteria (S-1–S-11): signal reproduction across 3 ecosystems (TS/Python/C#), cross-repo isolation, guard breadth, ≥80% parseable output, baseline measurement. Five hard stop conditions with escalation paths (signal failure → Seven+Tamir, isolation breach → Worf, instability → Geordi, guard violation → Worf). Explicit forbidden-claims table prevents overclaiming even on full PASS. Phase 2 is the ceiling — 3 repos max, ≤100 turns total. Production confidence requires Tier 4 (chaos/load) and Tier 5 (user study). Filed to `.squad/decisions/inbox/picard-real-cli-phase2-confidence.md`.

**Artifact:** `.squad/decisions/inbox/picard-real-cli-e2e-confidence.md`

## 2026-05-19T11:58:29.988+03:00 — Product Confidence Framework: Four Tiers + Stop Conditions

**Decision:** Consolidated all evidence standards (Tier 1 mechanical, Tier 2 realistic simulation, Tier 3 CLI E2E, Tier 4 production/generalization) into a single durable decision framework. Mapped acceptable claims to each tier, defined stop conditions (e.g., n=10 null signal → escalate, don't chase), escalation paths (Tamir for infra gates, Worf for security/reliability holds, Geordi for CLI integration issues), and remediation thresholds.

**Key Rules:**
- Tier 1 (unit/integration): Code runs, security gates pass, no mocks in I/O paths.
- Tier 2 (substitute harness): n≥20 paired trials on real repos, 5+ turns per trial, labeled as "substitute, not CLI E2E."
- Tier 3 (real CLI E2E): ADC sandbox provisioned (Tamir gate), multi-repo multi-trial, reproduces Tier 2 signal, hangs detected & escalated.
- Tier 4 (production): Chaos + load tests, diverse repo portfolio, telemetry targets, rollout plan approved.

**Stop conditions:**
- Tier 2 pilot null signal → escalate to Seven + Tamir; do NOT scale to n=50.
- Tier 3 hang >5 min → escalate to Geordi + Worf; fix hang handler before retry.
- Tier 4 chaos failure → escalate to Worf; do NOT canary without fix.

**Artifact:** `.squad/decisions/inbox/picard-confidence-threshold.md` — reference for all future product claims. Claims without tier evidence rejected at PR review (Worf gate).

**Implication:** Removes ambiguity from "is this ready?". Framework is pre-committed; Tamir doesn't need to arbitrate on-the-fly. Team knows stopping points before starting.



---

2026-05-31: Final template validation and approval sweep. All 11 gates pass. Approved PR #1200 for upstream merge and release as 0.9.6.

## 2026-06-02T11:29:11.224+03:00 — Autopilot Directive (Cross-Agent Update)

2026-06-02: Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations (per user directive).

## 2026-06-02T11:29:11.224+03:00 — State-Backend Remaining Work Decomposition

**Context:** Post Data+Seven triage (2026-05-31). Completed a full Phase 1–5 decomposition of remaining state-backend issues against PR #1200 (`squad/state-backend-upgrade-fixes`).

**Deliverable:** `.squad/decisions/inbox/picard-state-backend-remaining-decomposition.md`

---

**PR #1200 quality read:**

PR #1200 is a disciplined, high-quality fix push. It covers exactly what it claims — all six regression bugs (A–F), the ESM search-roots gap (#1190 F1), the externalized state path gap (#1194/Bug E), and doctor detection of missing two-layer hooks. The changeset trims 1529 lines against 469 additions — a net cleanup ratio indicating dead-code removal rather than layering fixes on fragility. Test coverage (89/89 state, 29/29 doctor, 194/194 template-sync) is thorough. This PR should be fast-tracked to merge with high confidence.

**Architectural patterns observed:**

1. **Path resolution belongs at one callsite.** `effectiveSquadDir()` / `resolveStateDir()` introduced in Bug E centralize what had been duplicated per-command. Future commands must import these helpers — never reimplement path logic inline.

2. **Doctor-as-gate is sound but incomplete without a repair path.** Detection without repair creates a frustrating UX: user upgrades, sees doctor failure, has no automated fix. The correct pattern is `doctor detect → doctor repair → upgrade migrate`. WI-1 closes this loop.

3. **TEAM_ROOT ambiguity is a prompt design issue, not a code issue.** The `#1163` inconsistency is purely a documentation/prompt-engineering problem: two sections define the same term with different semantics. The correct fix is to introduce two distinct terms — `TEAM_ROOT` (repo root) and `STATE_ROOT` (`.squad/` directory) — and update all path examples. Zero runtime change required; ralarcon volunteered a PR.

4. **Upgrade pipeline is the weakest link in the stack.** All five remaining DO-NOW items (WI-1 through WI-5) trace back to the upgrade path. The SDK and coordinator are now solid post–#1200. Upgrade is the last surface with multiple open regressions. Next sprint attention should concentrate there.

**Critical-path opinion (brief):** WI-1 (upgrade state-backend migration + hook install) is the highest-priority remaining item. It is the only item that causes **silent data loss** — users believe they migrated to two-layer; the state branch has never been written. Everything else is noisy but safe.

---

## 2026-06-02T12:04:38.931+03:00 — Squad.Agents.AI NuGet Onboarding (Strategic Context & Inheritance)

**Task:** Learn strategic context from tamresearch1 Squad.Agents.AI NuGet work (PR #3 in tamirdresher/squad) and synthesize into structured learning for squad-squad adoption.

**Sources:** tamresearch1/.squad/decisions.md (Decisions 437–448), tamresearch1/.squad/agents/picard/history.md (prior learnings).

### A. Strategic Decision Lineage

**Decision 437–440 (MAF Wedge Plan):** Planned SquadAgent extraction as a MAF first-party contribution strategy. Goal: propose fluent wrapper to MAF, unlock EMU backstop via dual-stack (MAF canonical + Squad edge), enable contributor sign-off flow.

**Decision 441 (SDK Probe — F1/F2/F3):** dotnet-inspect probe of live MAF NuGet proved initial assumptions invalid. Three ground-truth findings: (F1) GitHubCopilotAgent is sealed—cannot inherit, only compose/wrap. (F2) instructions parameter already exists in MAF for boundary injection—custom session preamble logic is redundant. (F3) All operational parameters Data wanted are already in CopilotClientOptions—no vapor properties. **Implication:** SquadAgent value collapses to DI helpers, telemetry, and trace logging around MAF's existing extension points. MAF contribution no longer justified.

**Decision 443 (THE PIVOT — Tamir, 2026-05-28):** Explicit directive: abandon MAF wedge and EMU backstop strategy. **Ship SquadAgent as community NuGet from Squad's own repo (tamirdresher/squad).** Rationale: MAF contribution was predicated on unsupported assumptions. By owning the package ourselves, Squad gains autonomy—independent release cadence, no upstream approval cycles, unblocked iteration on DI patterns, telemetry integration, Aspire resource support.

**Decision 447 (Q1–Q7 Lock — Tamir, 2026-05-28):** Froze design with explicit parameters. Q2: NuGet name = `Squad.Agents.AI` (mirroring MAF's `Microsoft.Agents.AI.*` namespace pattern). Q5: `name` parameter in `.AsAIAgent()` is identity metadata only; routing happens via `CopilotClientOptions.CliPath/CliArgs` at CopilotClient construction time. Q6: TFM = `net10.0` only (adoption bar raised above MAF's `net8;net9;net10` floor). Q7: DI defaults approved (mutable options, scoped lifetime, TraceEvents=false default).

**Decision 448 (Aspire SquadResource — Picard, 2026-05-28):** Customer-value re-evaluation for Aspire SquadResource. Recommends **Option C (Hybrid):** ship metadata-only default (108 LOC existing SquadResource + 4 dashboard commands), expose `.WithSquadCli()` opt-in API stubbed for v1.1+. Avoids "most contributor PR" complexity while preserving both use cases (telemetry opt-in for power users, zero-config default for simple CLI integration).

### B. Pivot Rationale

Decision 443 represents a paradigm shift from "contribute upstream first" to "own the integration layer." The MAF wedge strategy assumed MAF would benefit from a Squad-authored async boundary layer and would accept it as first-party contribution. The SDK probe disproved this: MAF already has all necessary extension points (sealed wrapping, instruction injection, parameter surface). The wedge strategy's cost (maintenance tax, release-cycle coupling, upstream approval overhead) exceeded its value.

By shifting to a community NuGet in Squad's repo, we gain:
- **Autonomy:** Release on our schedule, iterate on DI patterns without MAF coordination.
- **Clarity:** Squad owns the SquadAgent → CopilotClient integration; no ambiguity about which team maintains it.
- **Flexibility:** Can add telemetry, Aspire resources, tracing, and future agent-framework features without needing MAF's consensus.

The decision also stands down the EMU backstop strategy (Decision 432 context) since MAF first-party contribution is no longer the plan.

### C. Current State (PR #3 in tamirdresher/squad)

**Delivery Vehicle:** PR #3 in tamirdresher/squad contains Squad.Agents.AI NuGet v0.1 implementation. Status: **ALL GREEN** per recent squad-squad decision record.

**What's Shipped:** Fluent API wrapping MAF's GitHubCopilotAgent via `.AsAIAgent()` extension pattern. Boundary instruction injection via MAF's native `instructions:` parameter (not custom session preamble). DI helpers for agent registration (mutable options container, scoped lifetime). Trace logging for operational visibility. Partial Aspire SquadResource (metadata-only default per Decision 448 Option C, foundation for `.WithSquadCli()` stub).

**What's Not Yet:** Keyed DI cleanup (Decision 447 Q7 defaults approved but implementation validation pending). AOT/Trimming readiness audit (not mentioned in current decisions; likely open). Aspire telemetry integration if Option C full path is committed (Decision 448 mentions v1.1+ stub, not v0.1 full feature).

**Known Good Commits:** c97fee6b, 257fc684. Direct link: https://github.com/tamirdresher/squad/pull/3.

### D. Recommended Next Steps for Squad-Squad

1. **Merge & Release v0.1:** PR #3 is all-green. Merge to tamirdresher/squad main, tag v0.1, publish to NuGet.org. Release notes should cite Decision 443 (the pivot rationale) + Decision 447 (design freeze) as architectural foundation. Highlight: DI-first design enables operator flexibility; Aspire metadata baseline ready for future CLI process integration.

2. **Transfer Ownership to squad-squad:** File formal decision in `.squad/decisions/` (this squad) recording adoption of tamresearch1's Decisions 437–448 as inherited policy. Future SquadAgent changes flow through squad-squad's decision process, not tamresearch1.

3. **Plan v0.2 (Potential Post-v0.1):** Address outstanding items:
   - Keyed DI review & finalization (Decision 447 Q7 validation).
   - AOT/Trimming readiness audit (likely Required for .NET 10 adoption bar).
   - Aspire telemetry integration (if committing to Decision 448 Option C full path for v1.1).

4. **Establish User Feedback Channel:** PR #3 includes UX panel feedback (#6 in UX context) from junior dev + Sara personas re: README comprehensibility. Monitor adoption feedback post-v0.1 release.

### E. Open Questions for Tamir

- **Repo home:** Is tamirdresher/squad the intended *production* home for Squad.Agents.AI long-term, or should we re-home to squad-squad after v0.1 stabilization? (Decision 443 said "Squad main repo" which remained ambiguous until Decision 447 Q2 locked the package name; repo home still unspecified.)
- **Aspire commitment:** Decision 448 recommends Option C hybrid. Should v0.2 commit to full Aspire telemetry integration, or defer to v1.0+ when Squad CLI process-spawn stability is proven?
- **Known consumers:** Are there existing users/teams consuming SquadAgent v0.1 that should be notified of the ownership transition from tamresearch1 → squad-squad? (Informs communication plan.)

**Citation:** tamresearch1/.squad/decisions.md Decisions 437, 438, 439, 440, 441, 443, 447, 448; tamresearch1/.squad/agents/picard/history.md (2026-05-31 learnings).

---

### [2026-06-02 Session] Cross-Reference: Squad.Agents.AI Onboarding Fan-Out

**Session Log:** `.squad/log/2026-06-02T09-04-38Z-squad-agents-ai-onboarding.md`  
**Decision Entry:** `.squad/decisions.md` section "2026-06-02 — Squad.Agents.AI NuGet Onboarding: 5-Agent Fan-Out"  
**Coordinating Agents:** Data (technical baseline), Worf (security), B'Elanna (build/CI), Seven (provenance), Picard (this agent).

This session synthesized five coordinated reports into a single onboarding decision batch. Picard's strategic recommendations aligned with Data's technical findings and B'Elanna's release pipeline gaps. Key consensus: v0.1 ready to merge and publish; v0.2 blocked on NuGet CI gate and publish workflow (B'Elanna dependency).


## Learnings

### Squad.Agents.AI — Auth/extensibility architecture review (2026-06-02)

**Verdict: APPROVE_WITH_CONDITIONS (6 conditions).** Data's proposal is architecturally sound — correct extension-point pick (configure delegate over IConfigureOptions or client factory), thorough auth inventory, honest invariant risk analysis. Top rationale: the configure delegate must enforce a **hard routing gate** (snapshot-and-restore of Cwd/CliArgs/CliPath after the delegate runs), not a warning-only log. Decision 447's routing invariant is non-negotiable. BYOK deferred to v0.2 because it lives on the SessionConfig seam, not the CopilotClientOptions seam — mixing both seams in one PR is unnecessary risk to an already-green v0.1. Full review filed to `.squad/decisions/inbox/picard-squad-agents-ai-auth-review.md`.

---

## 2026-06-02 — Gap Closure Complete

Strategic plan executed. B'Elanna and Data completed their gap-closure work on PR #3 (feature/squad-agents-ai in tamirdrescher/squad):
- B'Elanna: Added .NET CI gate (commit 12d803bf)
- Data: Added routing tests (commit 3f5e61d6)

PR #3 now awaiting CI verdict. Ready for merge and v0.1 tag.

