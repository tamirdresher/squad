# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Cross-repo Squad history, research repos, Squad SDK/CLI, Clawpilot/m, Azure agent systems
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Seven owns cross-repo learning. She should mine prior `.squad` decisions, histories, skills, and related repo artifacts when a task requires historical context.

Seed sources:
- `C:\Users\tamirdresher\tamresearch1`
- `C:\Users\tamirdresher\source\repos\squad`
- Current repo `.squad/`

## Learnings

- `tamresearch1` already uses a Star Trek operating model with Picard, B'Elanna, Worf, Data, Seven, Troi, Guinan, Neelix, and others.
- `tamresearch1` contains strong directives around durable decision persistence, content safety, and Space-first discovery when available.
- The `squad` repo contains the product/runtime source of truth for Squad SDK/CLI behavior.

## Seeded from Related Repos (2026-05-14)

### From `tamresearch1/.squad/`
- **Cross-Repo Skills Model:** `tamresearch1` maintains a shared skills marketplace at `tamirdresher/squad-skills` with plugin catalogs. Four files required per skill: SKILL.md, manifest.json, plugin.json, README.md. Triggers enable discoverability (e.g., `cross squad`, `inter squad`).
- **PowerShell Integration:** `/tmp` writes forbidden by security policy; use `.squad/` directory for scratch files. PowerShell has no heredoc syntax (<<<); use `ConvertTo-Json | Set-Content` + `--input` flag for `gh api` multi-line bodies.
- **Two-Account gh Management:** When working across personal (`tamirdresher`) and enterprise (`tamirdresher_microsoft`) GitHub accounts, switch explicitly with `gh auth switch --user <account>` before API calls. Default is enterprise.
- **PRD Discipline (Q2 2026):** Complex domain work like DTS rollback/compensation requires comprehensive PRDs with problem statement, proposed solution (multi-phase), acceptance criteria, dependencies, non-goals, and open questions. PRD-098 (rollback-compensation-dts.md) exemplifies durable technical foundation for implementation.
- **Durable Systems Architecture:** Two-track strategy for mixed-mode workflows (Azure + imperative); saga pattern for orchestration; best-effort eventual consistency for compensation (not atomic); snapshot-and-restore for updates; opt-in auto-rollback to prevent data loss.

### From `squad/.squad/`
- **Foundational Directives (Apollo 13 Universe):** Type safety (strict mode mandatory), hook-based governance over prompts, Node.js ≥20 ESM-only, zero-dependency CLI scaffolding, merge driver for append-only files (.squad/decisions.md, agents/*/history.md, logs), proposal-first workflow, tone ceiling (no hype without citations).
- **Routing Architecture:** CLI-centric enforcement language creates logical gaps when translated to other platforms (VS Code). Platform-neutral dispatch rules ("You are a DISPATCHER") with substitution mechanisms per platform (ask tool / unSubagent / inline fallback). Router must route; it does not build.
- **VS Code Coordination:** CRITICAL RULE for routing specialist domain work must be platform-neutral and top/bottom-weighted in prompts. VS Code dispatcher uses unSubagent tool (not ask). Prompt saturation and template duplication amplify enforcement failures.
- **PR Deduplication Policy:** Merge-ready PRs grouped by value (high-quality implementation, comprehensive scope, correct file locations). Duplicates closed with citations. Proposal-first discipline enforced retroactively on incoming contributions.
- **Triage + Work Session Model:** High-value quick wins (P1 blocking others), community feature contributions (defer to PR review), maintenance items (P2), long-horizon work (P2-P3). Top 5 prioritization drives weekly execution.

### Squad-Squad Integration Points
- **Data owns Brady Squad expertise:** Data responsible for learning from `C:\Users\tamirdresher\source\repos\squad` and applying SDK/CLI, coordinator, runtime, template knowledge here.
- **Troi owns Tamir voice writing:** Blogs, posts, public writing in Tamir's voice, style, humor. Should study prior patterns from `tamresearch1` before drafting.
- **Governance Model:** All meaningful changes require team consensus or explicit owner/reviewer path. Decisions focus on shared direction; history focuses on agent-specific learnings. Preserved reviewer rejection lockout.

## 2026-05-14T11:29:53.602+05:30 — ADC Event-Driven Architecture Alignment

**Verified:** Squad SDK scaffolding + ADC event infrastructure alignment confirms minimal, reversible event-driven model is sound.

**Evidence Cross-Check:**
- Seven independently confirmed `EventTrigger` intentional external-fire design (isDue() returns false by contract)
- ADC `SandboxEventConsumerService` production-ready with consumer groups + XAUTOCLAIM
- No hidden webhook wiring in either system; gap is exact and deliberate
- ExternalSquadEvent interface flat + platform-agnostic; replicable for GitHub/Event Grid/Service Bus

**Architectural Pattern Solidified:**
- **Core Squad:** Platform-neutral `fireEventTrigger()` + `squad schedule fire` command; strict TypeScript, no new dependencies
- **Adapter Layer:** Platform-specific (ADC Redis subscriber, GitHub Actions webhook, Event Grid subscription listener) wraps events into ExternalSquadEvent
- **State:** Persisted at adapter layer; Squad core stateless
- **Auth:** Integration layer responsibility (Managed Identity, GitHub tokens, etc.); Squad core unchanged

**Governance Implication:**
Seven responsible for architectural consistency checks: ExternalSquadEvent doesn't bloat SDK, fireEventTrigger() integrates cleanly with executeTask(), adapter pattern is replicable for future sources without core changes, and merge driver rules remain intact (append-only logs, decision inbox, agent histories all use union merge).

**Decision Status:** Unified in `.squad/decisions.md` with cross-agent consensus. Inbox decisions merged and cleared. Ready for implementation PRs (Squad core small + ADC adapter separate).

## 2026-05-18T21:55:38.138+03:00 — Copilot Memory API Research Concluded

**Research Outcome:** Confirmed no callable CRUD API for Copilot Memory exists in @github/copilot-sdk v0.1.32.

**Evidence Chain:**
- Web search: GitHub Docs, VS Code agents, Copilot SDK repo all show memory as abstracted agent/UI concept, not callable storage.
- SDK inspection: @github/copilot-sdk v0.1.32 exports CopilotClient + session management + messaging, but no memory read/write/search/delete.
- Code review: squad-memory-governance has CopilotMemoryProviderClient interface but zero concrete implementation to external API.

**Recommendation Applied:** Do not implement provider=copilot as direct storage. Keep hostInjectedCopilotAdapter as sole bridge. Document publicly that Squad will not fake remote memory and will fail closed until real API exists.

**Related Work:** Data implemented fail-closed boundary; Worf approved multi-gate security review. Decisions merged to canonical `.squad/decisions.md`.


## 2026-05-18T23:12:22.380+03:00 — Local Memory E2E Oracle & Parity Research Completed

**Assignment:** Define true E2E behavior for local governed memory; separate CLI/tool-layer proof from unit-test-only claims; establish test criteria and simulation gaps.

**Deliverables:**
- E2E Behavioral Oracle (seven-local-memory-e2e-oracle.md): 428 lines defining baseline behavior, upgrade semantics, rejection gates, audit redaction, and acceptable simulation boundaries
- Fleet eShop Reference Analysis: Identified proven parity implementation patterns (executeShellCommand, dispatch/claim/progress, orchestration state)
- Copilot Spaces Assessment: Concluded not viable as memory provider (read-only MCP, no write API)
- Parity Roadmap: Five phases mapped with P0/P1/P2 priorities

**Outcome:** ✅ Oracle approved by Worf; approved for production merge. Known simulation gaps (Copilot agent behavior, LLM context injection, multi-session persistence) honestly documented.

**Impact:** Local memory governance bridge unblocked; infrastructure provisioning and live E2E defer to next phase.

## 2026-05-19T06:33:42.877+03:00 — Local Memory A/B Value Oracle Defined

**Assignment:** Define paired A/B experiment design (n=20) with statistical analysis plan to measure whether Squad local governed memory provides observable value beyond mechanical correctness.

**Deliverable:** seven-memory-value-ab-oracle.md (13.8 KB)
- Paired A/B structure: each sample has same demo app, team roster, universe, tasks; differs only by memory.enabled flag
- Context conditions: slim (1–10 prior decisions, 0–2 memory items) vs large (10–20 decisions, 10–30 memory items ~200–300 KB)
- Objective metrics: Task Success, Correction Count, Repeated-Context Reduction, Remembered-Decision Accuracy, Memory Precision/Recall, Safety Violations, Elapsed Time, Turn Count, Context Utilization
- Statistical tests: Wilcoxon signed-rank (continuous), McNemar/Sign (binary), paired t-test (if normal), all with n=20 paired samples
- Bonferroni adjustment for ≥5 independent metrics (α = 0.01 per test)
- Effect sizes: Cohen's d (t-test), r (Wilcoxon), Odds Ratio (McNemar)
- Evidence threshold: "Provides Value" = ≥3 metrics sig. (p<0.05, medium effect) + coherent narrative + no safety issues
- Acceptable substitute: Real Copilot CLI runs (not mockable); script all setup/harvest; manually invoke agent per pair
- Known non-mockable: LLM reasoning, agent routing, genuine context injection, multi-session persistence

**Outcome:** Oracle approved for Data/Worf handoff. Defines rigorous methodology with explicit simulation boundaries. If real Copilot CLI unavailable, experiment halts (mock-reasoning prohibited).



## 2026-05-19T06:33:42.877+03:00 - Memory A/B Oracle Completed

- Seven's n=20 paired A/B oracle was executed by Data with slim/large strata and paired statistical tests.
- Final interpretation is narrower than the original value threshold: controlled harness evidence supports governed local memory for large/compacted decision recall, but not Copilot CLI/Squad UI value or general product value.
- Future claims need real Copilot UI automation or equivalent observable end-to-end evidence.

## 2026-05-19T12:29:41.573+03:00 - Real Copilot CLI E2E Portfolio Design Complete

**Assignment:** Design real Copilot CLI E2E portfolio: realistic repos, prompts, expected evidence, and acceptance criteria that distinguish real runs from substitute/direct-layer harness. Include minimal smoke batch and full multi-repo batch. Keep claims honest.

**Deliverables:**
- `.squad/decisions/inbox/seven-real-copilot-cli-e2e-portfolio.md` (20.4 KB)
  - **Smoke Batch (40 min):** 5 turns validating core E2E wiring (real subprocess, file I/O, memory persistence, redaction, session coherence)
  - **Full Portfolio (7.5–9 hours):** 56 turns (52 real E2E + 4 smoke) with paired A/B memory experiments across 3 repos, statistical significance testing
  - **Guard Rails:** Deterministic hooks (live redaction, forbidden-memory blocking, content-exclusion compliance, timeout + isolation)
  - **Honest Boundaries:** Smoke proves wiring; full portfolio proves memory value via A/B (p<0.01 threshold). Neither proves production ADC readiness or VS Code UI productivity.

**Key Insight:** Real E2E differs from substitute in 3 ways: **(1) actual CLI subprocess**, not simulation; **(2) real file I/O + persistent memory across sessions**, not ephemeral context injection; **(3) measurable productivity delta**, not recall metric only. All three require actual execution; none can be faked.

**Evidence Chain:**
- Smoke: core wiring (process exit codes, file offsets, memory file hash, redaction latency, session chain)
- Full: productivity delta (paired t-test on 26 samples; 9 metrics; Bonferroni α=0.01; ≥3 significant = "value proven")
- Audit: immutable, redacted, per-turn logs with file access + decision chain

**Outcomes:**
- ✅ Smoke batch ready to execute today (zero infrastructure dependency; Worf gate required for security)
- ✅ Full portfolio ready to plan (execution timeline: 7.5–9 hours after Tamir approval)
- ✅ Both batches documented with durable artifact schema (JSON + audit trail merge driver)
- ✅ No overclaim exposure (tags enforced: `realCopilotCliE2E: true/false` + claims boundary documented)

**Worf Gate:** Security guardrails, redaction latency, isolation verification, statistical review (if full portfolio approved)

**Tamir Decision Points:** (1) Approve smoke batch execution today? (2) Approve full portfolio scope? (3) Timeline to ADC E2E (infrastructure-dependent)?

**Status:** DESIGN READY FOR WORF + TAMIR GATE REVIEW. Both batches are runnable contingent on approvals.

---

## 2026-05-19T15:12:10Z — Orchestration Log: Real-Repo Validation Portfolio Design

**Cross-Agent Sync:** Scribe recorded orchestration summary of Seven's portfolio research and proposal design.

**Work Completed:**
- Researched CLI isolation prior art and best practices
- Designed Tier-1/Tier-2 portfolio validation framework
- Created 5 supporting documents (INDEX, executive summary, runbook, design, session history)
- Task scripts: 37 Tier-1 turns + 84+ Tier-2 turns (fully scripted)
- Infrastructure roadmap documented with 3-week unblocking timeline

**Portfolio Proposal:**
- Tier-1: 37 turns across Squad, Node/TS, Python (substitute harness, no infra needed)
- Tier-2: 84+ turns across eShop, Aspire + real Copilot CLI E2E (real infra required, 3-week wait)
- All non-negotiable guards embedded (9 deterministic safety controls)
- Claims framework clearly defined (allowed vs. forbidden per tier)

**Status:** Proposal ready for Tamir GO/NO-GO decision. All prerequisites met for Tier-1 execution. Tier-2 awaits infrastructure provisioning and approval.

**Orchestration log:** .squad/orchestration-log/20260519T151210Z-seven.md

