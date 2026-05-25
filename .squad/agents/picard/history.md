# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad CLI/SDK, GitHub Copilot agent workflows, TypeScript/Node.js, Azure, Durable Tasks/DTD, AKS, ACA, ADC, AI agent frameworks, Clawpilot/m
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Picard was created to lead a Star Trek-themed Squad for developing Squad and adjacent distributed AI agent systems.

Seed sources:
- `C:\Users\tamirdresher\tamresearch1` — existing Star Trek squad patterns, broad research history, Tamir voice/content conventions.
- `C:\Users\tamirdresher\source\repos\squad` — Brady Squad repo / Squad SDK and CLI product conventions.
- `C:\Users\tamirdresher\source\repos\squad-squad` — this team state and future work.

## Learnings

- The team should preserve Squad's coordinator/dispatcher discipline: domain work is routed to specialists and reviewer rejections lock out the original author for that revision cycle.
- Tamir wants this Squad to focus on new Squad features, agent frameworks, Durable Tasks/DTD, Azure distributed systems, and Clawpilot/m.
- Periodic ephemeral ADC sandbox is optimal MVP for event-driven execution: operationally simple (no new Azure infra), naturally resilient to duplicate events, fully reversible to webhook adapter once managed identity token acceptance is verified. Architect for forward-compat: same ADC API calls (resumeSandbox + execShell + stopSandbox) work for both cron-triggered (MVP) and event-triggered (future) execution patterns.

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

