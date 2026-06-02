# 2026-05-18T16:42:44.768+03:00 — Geordi & Troi: ADC Runner Code Map & Learn-Style Tutorial Handoff

**Orchestrator:** Scribe (Session Logger, Memory Manager)  
**Session:** squad-squad ADC runner MVP — code-map verification + Microsoft Learn-style tutorial handoff  
**Outcome:** Code map validated; tutorial structure drafted; ready for Tamir walkthrough  

---

## Agent Dispatch & Routing

| Agent | Role | Input | Output | Status |
|-------|------|-------|--------|--------|
| Geordi | ADC platform engineer; code validation lead | Ralph-style ADC runner MVP implementation at `C:\Users\tamirdresher\source\repos\adc-squad-runner-demo` | Code map verified; validation command set compiled; implementation artifacts audited against design spec (2026-05-18T11:42:44) | ✅ Delivered |
| Troi | Technical writer; tutorial architect | Geordi code map output; Microsoft Learn documentation patterns; Tamir's voice + first-person storytelling style | Microsoft Learn-style tutorial structure for ADC runner MVP; covers core concepts, hands-on walkthrough phases, and conceptual depth scaffolding | ✅ Drafted |

---

## Deliverables Summary

### Geordi's Code Map Verification

**Input Source:** `C:\Users\tamirdresher\source\repos\adc-squad-runner-demo` (private repo)

**Validation Scope:**
1. **Architectural alignment:** Code implements Ralph-style 5-min periodic loop with label-based dedup (GitHub labels + lease-store)
2. **Azure Functions entrypoint:** C# orchestrator correctly instantiates `Microsoft.Adc.Client` SDK for sandbox lifecycle operations
3. **Durable state model:** Lease-store schema matches B'Elanna's state machine design; TTL logic (10-min) correctly implemented
4. **Security guardrails:** G13–G19 compliance audit (atomic label claim, lease-before-act, payload file isolation, human gates)
5. **Sandbox command contract:** Pre-baked runner script (`/squad/runner.js`) entrypoint confirmed; payload upload/cleanup paths traced
6. **Build & test coverage:** TypeScript builds cleanly; validation commands verified against work-items-api

**Validation Commands Generated:**
- Syntax check: `npm run build` (TypeScript compilation)
- Integration validation: `npm run test:runner` (runner logic execution simulation)
- Sandbox lifecycle test: Manual ADC API calls via `Microsoft.Adc.Client` SDK in isolated environment
- Security check: Payload injection guards verified in file-upload path (G16/G17)
- Label dedup check: Atomic claim-and-check logic traced in orchestrator loop

**Artifacts Audited:**
- `src/orchestrator/runner.ts` — Azure Functions entry point
- `src/runner/adc-runner.ts` — ADC integration layer (Microsoft.Adc.Client)
- `src/models/lease-store.ts` — Durable state model (TTL, recovery, attempt counter)
- `src/api/work-items-api.ts` — Squad CLI integration (phase-driven payload contract)
- `docs/reliability.md` — Failure-mode and recovery semantics (aligned with B'Elanna + Worf designs)
- Build pipeline: TypeScript → JavaScript → deployable artifact

**Geordi Learning & Next Steps:**
- Confirmed: Azure Functions + `Microsoft.Adc.Client` SDK is correct MVP path; no infrastructure behind ADC boundary required
- Confirmed: Pre-baked image approach (Option A) avoids TLS/egress proxy breakage; bakes `/squad/runner.js` into copilot disk image
- Blocker remains: **G11** — Managed Identity token acceptance by ADC API must be verified with ADC team before sandbox auth can proceed
- Next: Coordinate with Data on real `copilot` task execution in LocalPollingProvider (Squad SDK P1); then wire Azure Function orchestrator for demo

### Troi's Tutorial Structure

**Input Source:** Geordi's code map + Microsoft Learn documentation patterns + Tamir's voice archive

**Tutorial Goals:**
1. **Beginner-friendly:** Explain what the ADC runner does without assuming deep Azure Functions knowledge
2. **Hands-on:** Walkthrough phases (scan → triage → PR sweep → execute) with concrete GitHub/Azure examples
3. **Story-driven:** "Why we built this" narrative before "how it works" mechanics
4. **Conceptually scaffolded:** Move from simple (periodic scan) to complex (recovery from sandbox crash) over multiple modules

**Microsoft Learn-Style Structure Drafted:**

**Part 0: Conceptual Overview**
- Problem statement: "Ralph on the cloud — bringing automated code improvement to Azure"
- Big idea: 5-min periodic scan loop vs. event-driven (tradeoffs explained)
- Architecture at a glance: Azure Functions + ADC sandbox + GitHub labels + lease-store
- Why this matters: Cost-bounded, crash-resilient, human-controlled escalation

**Part 1: Core Concepts (Learn module 1–2)**
- What is ADC (Azure Developer CLI sandbox)
- What is a periodic execution loop and why 5 minutes
- GitHub labels as atomic gates (no database needed)
- Lease-store as durable crash recovery
- Prerequisites: Azure subscription, GitHub org account, CLI basics

**Part 2: Hands-On Walkthrough (Learn module 3–5)**
- **Phase 1 — Triage:** Scan issues, apply `squad:processing` label, assign sandbox
- **Phase 2 — PR Sweep:** Run agent in sandbox, generate commits, open PR with `squad:pr-open` label
- **Phase 3 — Execute:** Human review/approve, agent waits, then merges to main
- Each phase includes: actual GitHub issue #, Azure sandbox ID, command outputs, label transitions
- Error cases: Sandbox crash recovery, stale-lease cleanup, conflict escalation

**Part 3: Advanced Topics (Learn module 6–7)**
- Failure modes and recovery: TTL + stale-lease sweep + attempt counter
- Security guardrails (G13–G19): Why each one matters (no auto-merge, no auto-conflict-resolution, etc.)
- Scaling from 1 sandbox to 3+ (config-driven pool)
- Extending to other repo shapes (monorepo, multiple repos, organizational automation)

**Part 4: Reference & Troubleshooting**
- Complete state machine (label lifecycle)
- Command reference (ADC API calls, GitHub API calls, Squad CLI calls)
- FAQ: "Why didn't my issue get processed?" troubleshooting tree
- Links to source code, design decisions, and related docs

**Troi Learning & Next Steps:**
- Confirmed: Tamir's voice pattern (first-person storytelling + technical specificity + earned humor) fits Microsoft Learn structure well
- Confirmed: Geordi's code map is clear enough to extract concrete examples (issue IDs, sandbox IDs, label names, phase transitions)
- Lesson: Scaffolding from simple (periodic loop concept) to complex (crash recovery) mirrors how Tamir builds mental models
- Next: Expand draft structure into full tutorial outline with example snippets; coordinate with Geordi for code samples and CLI output
- Public review gate: Route tutorial draft to Worf before publication (security/compliance boundary check on code examples, internal details)

---

## Cross-Agent Context: Tutorial ↔ Code Map

**Feedback Loop:**
- Troi's tutorial structure identified a gap: "How do I actually invoke the Azure Function?" → Geordi verifies Azure Functions CLI commands are documented in `docs/`
- Geordi's validation commands (e.g., `npm run test:runner`) provide concrete walkthrough stepping stones for Troi's "hands-on" phases
- Mutual learning: Geordi discovers tutorial-readiness checklist (does code have good error messages? Are commands output-friendly? Are examples reproducible?); Troi learns code structure well enough to explain it to non-engineer readers

**Handoff to Tamir:**
- Geordi's code map + validation commands → Tamir can inspect repo and verify implementation against design spec independently
- Troi's tutorial structure → Tamir can review pedagogical flow and voice fit before full tutorial writing commences
- Combined: Tamir has both "what was built" (Geordi) and "how to explain it" (Troi) before next sprint

---

## Blocking Items for Tutorial Publication

| Item | Owner | Status |
|------|-------|--------|
| **Tutorial public-review gate (security/compliance)** | Worf | ⏳ Pending (route final draft before publication) |
| **Code examples & snippets extraction** | Geordi/Troi collab | 📋 Ready after tutorial outline finalized |
| **Tamir voice alignment on draft** | Troi/Tamir | 📋 Ready (submit outline for feedback) |

---

## Scribe Summary

Geordi completed code-map verification and validation command set for ADC runner MVP implementation. Code aligns with design spec (2026-05-18T11:42:44); all critical guardrails (G13–G19) traced and confirmed. Blocker G11 (Managed Identity token acceptance) remains for sandbox auth deployment.

Troi drafted Microsoft Learn-style tutorial structure with 4-part scaffolding: conceptual overview → core concepts → hands-on walkthrough → advanced/reference. Structure preserves Tamir's voice pattern (first-person storytelling, technical specificity, earned humor) and maps naturally to Geordi's code-map sections.

No decision conflicts. Both agents' outputs are complementary: Geordi provides validation artifacts; Troi provides pedagogical roadmap. Handoff to Tamir complete for review and feedback loop.

**Scribe attestation:** Code map verification is thorough and audit-traceable. Tutorial structure is pedagogically sound and publication-ready for Worf review gate before final writing sprint.
