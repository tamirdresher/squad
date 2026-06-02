# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad CLI/SDK, GitHub Copilot agent workflows, TypeScript/Node.js, Azure, Durable Tasks/DTD, AKS, ACA, ADC, AI agent frameworks, Clawpilot/m
- **Created:** 2026-05-14T09:22:24.987+05:30

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


## 2026-06-02 — Gap Closure Complete

Strategic plan executed. B'Elanna and Data completed their gap-closure work on PR #3 (feature/squad-agents-ai in tamirdrescher/squad):
- B'Elanna: Added .NET CI gate (commit 12d803bf)
- Data: Added routing tests (commit 3f5e61d6)

PR #3 now awaiting CI verdict. Ready for merge and v0.1 tag.

