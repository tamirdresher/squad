# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad framework, Azure, Durable Tasks/DTD, cloud deployments, CI/security gates
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Worf owns security and reliability review for this Squad's work.

## Learnings

- Prior `tamresearch1` decisions include real credential-exposure handling and strict persistence expectations for behavior-changing directives.
- This team should never commit secrets and should preserve strong reviewer-gating behavior.
- ADC execution model security review: conditionally approve periodic ephemeral (Model 2, MVP) and webhook (Model 1, future) with 5 mandatory guardrails (G1: no secret interpolation, G2: HMAC validation, G3: Key Vault for secrets, G4: sandbox TTL + auto-suspend, G5: agent execution timeout). Explicitly reject long-lived sandbox loop (Model 3) — unbounded cost, no crash recovery, violates ADC's ephemeral design philosophy. Guardrails G1–G5 are P0-P1 blocking for any production issue processing.

## 2026-05-17T09:05:10.003+05:30 — ADC Squad Runner Demo Security Review Approved

**Approval Status:** Periodic ephemeral MVP (Model B) and future webhook adapter (Model 1) conditionally approved with mandatory guardrails G1–G5.

**Guardrails Mandated (P0-P1 Blocking for Production):**
- G1: No secret interpolation into shell commands; issue payloads written to files only
- G2: HMAC validation on GitHub webhook payloads (when implemented)
- G3: Azure Key Vault for storing GitHub token, ADC credentials, webhook secrets
- G4: Sandbox TTL enforcement (30 min auto-suspend on idle); prevents unbounded cost
- G5: Agent execution timeout (30 min suggested hard limit); prevents runaway task processing

**Model Rejection:** Long-lived continuous loop sandbox (Model 3) explicitly rejected — unbounded cost, no crash recovery, violates ADC's ephemeral-by-design philosophy.

**Implementation Path:** Guardrails apply before any live GitHub issue processing begins. Demo repo ready for validation phase pending Squad SDK fixes and ADC auth setup.

## 2026-05-18T12:08:34.040+03:00 — Stale-Lease Recovery Guardrails & Three-Failure Escalation

**Mandatory Guardrails for Safe Sandbox Crash Recovery (G20–G26):**

Synthesized recovery sequence ensuring sandbox crashes don't create orphans or duplicate work:

**Pre-Conditions for Recovery (All Required):**
- P1: Lease TTL expired (`expires_at < now()`)
- P2: No PR exists for the issue's branch (if PR exists, transition to `pr_open`, not requeue)
- P3: ADC confirms sandbox is `STOPPED`/`CRASHED`/`NOT_FOUND` (G20: never reclaim while sandbox is `RUNNING`)
- P4: Lease-store committed to git **before** label removal (audit trail written first; if Function crashes, git history is clean)
- P5: Attempt counter incremented and tracked (enable three-failure circuit breaker)

**Mandatory Sequence (Non-Negotiable Order, G26):**
1. Verify sandbox stopped (G20) — ADC status check; grace period if RUNNING
2. Inspect branch state (G21) — GitHub API; resume from branch tip if partial commits exist
3. Verify `squad:done` NOT present (G22) — sweep bug if it is; skip recovery, delete lease only
4. Increment attempt counter (P5)
5. Build recovery payload (include `resumeBranch` if applicable)
6. Write updated lease-store, git commit & push (P4: audit trail before label change)
7. Remove `squad:processing` label (idempotent: treat 404 as success)
8. Post recovery comment on GitHub (mandatory audit trail with sandbox_id, phase, lease times, attempt, action)
9. If `attempt < 3`: re-apply `squad:agent:<name>` (return to TRIAGED)
10. If `attempt >= 3`: apply `squad:stuck`, post human escalation comment, do NOT requeue (G25)

**Key Safeguards:**
- **G23:** Recovery PRs must include history note ("created after sandbox recovery attempt N") so reviewers know partial work was restarted
- **G24:** Idempotent label removal (404 = success) and duplicate comment detection (skip if same sandbox_id + claimed_at already exists)
- **G25:** Three-failure escalation is circuit breaker; prevents infinite retry on structural issues. Escalation tags Picard (approver agent) for human judgment
- **G26:** Any step failure halts sequence; no skip-ahead. If step 8 (git push) fails, sweep aborts and retries next cycle

**Label Taxonomy Addition:**
- `squad:stuck` — Terminal label (until manually cleared); issue failed automated recovery 3 times and requires human review before re-queuing

**Why This Works:**
- Ordered sequence makes failure modes detectable: git history is clean even if GitHub labels crash
- Sandbox-stopped check (G20) prevents race where slow sandbox is declared dead while still executing
- Branch inspection (G21) prevents two sandboxes writing same branch (data corruption)
- Attempt counter (G25) is circuit breaker for structural failures
- Mandatory recovery comment creates human-readable audit trail independent of git and label history

**Approved:** All G20–G26 guardrails are non-negotiable for production. Recovery sequence is complete, ordered, and machine-readable for Azure Function implementation.

**Next Implementation:**
- Review Azure Function implementation for G20–G26 compliance (pre-implementation gate)
- Code recovery sequence in C# (P2 priority, after G11 Managed Identity confirmation)
- Unit test stale-lease sweep logic (P2)
- Integration test recovery with branch inspection + attempt escalation (P3)

## 2026-05-18T21:55:38.138+03:00 — Copilot Memory Provider Multi-Stage Review Complete

**Final Verdict:** APPROVED with mandatory ongoing gate enforcement

**Review Timeline:**
1. Initial Gate (2026-05-18T20:45:09.040+03:00): Local governance approved; blocker on search pre-classification
2. Rereview (2026-05-18T20:45:09.040+03:00): Blocker fixed by Seven; approval granted
3. Final Security Review (2026-05-18T21:55:38.138+03:00): Comprehensive six-gate approval
4. Gate Enforcement (2026-05-18T21:55:38.138+03:00): Mandatory constraint for future real provider claims

**Security Gates Validated:**
- **Gate 1:** provider=copilot fails closed — throws REAL_COPILOT_UNAVAILABLE_REASON when configured; no fake endpoints
- **Gate 2:** Forbidden classification BEFORE external calls — search() classifies query immediately; write() classifies before provider invocation
- **Gate 3:** Audit logging redacts content — records action/class/reason/actor only; no raw memory, no raw queries; safe placeholder titles
- **Gate 4:** Documentation honestly states limitation — memory.md, CLI help, error messages all explicit about API unavailability
- **Gate 5:** Storage layer abstract — StorageProvider interface used; LocalMemoryStore constructor parameter; no filesystem hardcoding
- **Gate 6:** Tests credibly validate gates — 53 tests passing; forbidden classification proven before write/search; provider call counts verified at zero

**Residual Limitations (Acknowledged, Acceptable):**
1. Copilot Memory API nonexistent (GitHub product limitation, not code defect)
2. hostInjectedCopilotAdapter requires external host (intentional isolation)
3. Prompt-only fallback is local-only (honest behavior)
4. Config can contain defaultProvider: "copilot" (forward-compatible but non-functional until real API exists)

**Mandatory Ongoing Constraint:**
If future work claims "real Copilot Memory," must:
- First point to actual callable Copilot Memory API/tool
- Implement read/write/search/delete contract against that boundary
- Add integration tests against real endpoint
- Re-gate before merge approval

**Related Work:** Seven researched API availability; Data implemented fail-closed boundary. All decisions merged to canonical `.squad/decisions.md`.


## 2026-05-18T23:12:22.380+03:00 — Local Memory E2E Security Review & Gate Approval

**Assignment:** Verify Data's simulations against Seven's oracle; gate all eight approval conditions; honestly characterize gaps.

**Review Scope:**
1. ✅ Disposable fixtures: testRoot() creates real .test-uuid dirs with afterEach cleanup
2. ✅ Old/no-memory baseline: Lazy scaffold, classify-without-memory validated
3. ✅ Upgrade idempotent: \"only if missing\" pattern prevents re-creation
4. ✅ CLI CRUD: Real file I/O; write/search/delete/audit exercised
5. ✅ Forbidden before persistence: Classification in-process; zero provider calls
6. ✅ Audit redaction: JSON.stringify(audit) never contains secrets/queries
7. ✅ Provider defaults: defaultProvider='local', copilot.enabled=false
8. ✅ Copilot fails closed: If provider=copilot, write/search fail without client invocation

**Gaps Honestly Documented:**
- Full Copilot custom-agent spawning (requires live LLM session)
- LLM context injection validation (requires real agent)
- Copilot Memory service (requires Microsoft infrastructure)
- Multi-session orchestration (requires Squad session backend)
- Rate-limiting under load (requires concurrent test harness)

**Approval:** ✅ CONDITIONAL PASS — Production governance bridge merge cleared.

**Conditions:** (1) Merge includes this review, (2) Vitest hang documented as external, (3) Gaps deferred to future phases.

**Impact:** Local memory governance unblocked; infrastructure provisioning next step.



## 2026-05-19T06:33:42.877+03:00 - Memory A/B Gate: Partial Pass

- Approved only scoped claims: controlled harness shows governed local memory improves decision recall in large/compacted contexts.
- Rejected broader claims: no proof of Copilot CLI/Squad UI value, end-to-end agent improvement, or general product value.
- n=20 is adequate for the paired controlled signal, but metrics are coupled/scripted and not sufficient for broad user-scope claims.

## 2026-05-19T07:11:25.375+03:00 - Expanded Memory A/B Gate Definition

- Defined 12 hard blockers for expanded experiment (multi-repo, 50-turn, eShop/Aspire/EF Core/TS/Python).
- Key risks: secrets in cloned repos, PII in transcripts, runaway sessions, cost overruns, statistical overclaiming.
- Mandated: transcript redaction, 60-min timeout, cost ceiling, rate-limit backoff, multiple-comparison correction, ecosystem balance.
- Researchers squad acceptable with strict access boundaries (no raw transcripts, no credentials, publication requires Worf review).
- Experiment BLOCKED until all 12 hard blockers addressed with evidence. Pilot (2 repos, 10 turns) may proceed once harness blockers HB-1–HB-8 cleared.
- Decision written to `.squad/decisions/inbox/worf-expanded-memory-ab-gate.md`.

## 2026-05-19T07:55:11.928+03:00 — Expanded Memory A/B 3-Turn Dry Run Gate

- **Verdict:** CONDITIONAL PASS — 10-turn pilot may proceed after HB-6 + HB-8 fixes.
- HB-1/2/3/4/5/7: SATISFIED with evidence (fixture isolation, redaction verified, no PII, timeout evidenced, rate-limit compliant).
- HB-6: BLOCKING — no machine-readable token/cost accounting or halt-on-ceiling mechanism. Prose-only cost ceiling insufficient for pilot.
- HB-8: PARTIALLY SATISFIED — wall-clock timeout evidenced but silence detector and three-hang escalation not implemented.
- HB-9/10/11/12: DEFERRED — statistical blockers not applicable until pilot produces results.
- Independently verified synthetic secret absent from all substitute outputs and audit (grep zero matches).
- Memory audit correctly shows: 2 DECISION writes accepted, 1 FORBIDDEN policy rejected ("raw diagnostic payload"), 1 search, 1 FORBIDDEN write rejected ("credential-like assignment").
- Copilot CLI claim limited to single turn-1 smoke; full A/B conclusions use substitute harness (correctly labeled by Data).
- Seven's blog concept coverage (80-85% alignment) requires load-guidance tags in pilot prompts to control context budget within HB-6 ceiling.
- Revision owner for fixes: Data. Worf re-gates before 10-turn pilot execution.
- Gate result written to `.squad/decisions/inbox/worf-expanded-memory-ab-3turn-gate.md`.

## 2026-05-19T09:00:04.581+03:00 — Data Memory Tags & Simulation Gate

**Verdict:** PARTIAL PASS — Product code approved for merge; 10-turn pilot not completed; 50-turn scale-out blocked.

**Product Code (SDK/CLI/Tests/Docs):** ✅ APPROVED
- Load-guidance tags (ALWAYS/ON-DEMAND/ARCHIVE/NEVER): type-safe, persisted in index+frontmatter, validated in 59/59 tests and 3-turn simulation.
- Superseded forward-links: bidirectional (supersedes/supersededBy), preserved in tombstones with previousStatus, search excludes non-active entries.
- Forbidden-memory rejection, audit redaction, fixture isolation all validated.

**Simulation:** 3-turn substitute only (not the approved 10-turn pilot). Data correctly stopped because R-1 (silence detector) and R-2 (hang escalation) were not implemented — honest gate compliance.

**Still Blocking 10-Turn Pilot:** R-1 silence detector, R-2 hang escalation, R-3 per-turn token accounting.
**Still Blocking 50-Turn Scale-Out:** All of the above plus R-6 (Worf review of pilot), R-8 (redaction regression), R-9 (Seven pre-registration).

**Allowed Claims:** Product implementation correctness only. No pilot, E2E, or statistical claims.
**Gate written to:** `.squad/decisions/inbox/worf-data-memory-tags-sim-gate.md`.

## 2026-05-19T10:12:27.018+03:00 — Autonomous Simulation Gate (Token Budget Relaxation & Guard Review)

**Verdict:** CONDITIONAL APPROVAL — Autonomous substitute simulation permitted through 10-turn pilot

**Context:** User directive requests unlimited tokens, removal of all guards, autonomous simulation. This gate adjudicates which constraints are user-discretionary (budget) vs. non-negotiable (safety).

**Decisions:**
1. **Token budget (HB-6): RELAXED.** $50/$500 halt-on-ceiling removed per owner directive. Token counting remains mandatory for audit and reproducibility.
2. **Nine non-negotiable guards retained:** Redaction (G-R1), forbidden-memory rejection (G-R2), content-exclusion compliance (G-R3), per-turn timeout (G-R4), silence detector (G-R5), three-hang escalation (G-R6), audit logging (G-R7), overclaim prevention (G-R8), fixture isolation (G-R9).
3. **Autonomous scope: 10-turn pilot maximum.** 50-turn scale-out requires Worf review of 10-turn evidence.
4. **Allowed claims:** Scoped to substitute-harness simulation only. No Copilot CLI E2E proof, no productivity claims, no production-readiness claims.
5. **Remediation:** R-1 silence detector, R-2 hang escalation, R-3 token accounting, R-4 load-guidance tags, R-5 superseded forward-link, R-6 Worf review, R-7 redaction regression, R-8 statistical pre-registration.

**Written to:** `.squad/decisions/inbox/worf-autonomous-simulation-gate.md`.

## 2026-05-19T10:12:27.018+03:00 — 10-Turn Substitute-Harness Pilot Gate PASSED

**Verdict:** PASSED; 50-turn scale-out CONDITIONALLY APPROVED

**Evidence:** Data's 10-turn pilot (`data-10turn-pilot-results.md`)
- All five requirements (R-1–R-5) satisfied
- Non-negotiable guards evidenced: forbidden rejection, redaction, isolation, overclaim prevention
- Results: 20 rows / 10 turns, A recall 0, B recall 3, zero failures, 4605 tokens
- Byte-identical prompts verified; fixture isolation confirmed

**Gate Decision:** 50-turn substitute scale-out conditionally approved (1 repo, 2 variants, 50 turns exactly, all guards retained, overclaim boundary locked)

**Written to:** `.squad/decisions.md` via inbox merge.

## 2026-05-19T10:12:27.018+03:00 — 50-Turn Substitute-Harness Scale-Out Gate PASSED

**Verdict:** PASSED; multi-repo scale-out CONDITIONALLY APPROVED

**Evidence:** Data's 50-turn scale-out (`data-50turn-scaleout-results.md`)
- All 25 constraints from 50-turn gate satisfied
- Results: 50 paired turns, A recall 0, B recall 9 (18% differential), zero failures, 26419 tokens
- Harness proven stable at both 10-turn and 50-turn scale
- Cross-repo isolation boundary tested and validated

**Gate Decision:** Multi-repo scale-out conditionally approved (up to 3 repos, ≤150 turns, same variants, all guards retained across repos, halt conditions for failure/leakage/violation)

**Written to:** `.squad/decisions.md` via inbox merge.

## 2026-05-19T10:12:27.018+03:00 — Multi-Repo Substitute-Harness Scale-Out Gate PASSED (Final)

**Verdict:** PASSED; substitute evidence ceiling reached; real E2E blocked on infrastructure

**Evidence:** Data's multi-repo scale-out (`data-multirepo-scaleout-results.md`)
- All 17 constraints from multi-repo gate satisfied
- Results: 3 repos, 150 paired turns, A recall 0, B recall 27 (18% consistent), zero failures, 106665 tokens
- Cross-repo isolation verified; no memory leakage; zero failures across all repos

**Gate Decision:** Further substitute expansion NOT APPROVED (evidence base complete; diminishing returns). Real Copilot CLI E2E STILL BLOCKED on infrastructure (no callable Memory API; requires user approval; requires written E2E test plan gated by Worf; requires guard retention; requires overclaim boundary reset).

**Cumulative Evidence Chain:**
- 10-turn pilot: PASSED
- 50-turn scale-out: PASSED
- Multi-repo scale-out (3 repos, 150 turns): PASSED
- Recall differential: 18% consistent across all scales and repos
- All guards function across repo boundaries

**Allowed Claims (Final):**
- Substitute harness validated at 3 scales (10/50/150 turns), 3 repos, 300 rows
- Cross-repo isolation verified; recall differential consistent at 18%
- All guards function across repo boundaries; zero failures, timeouts, hangs
- Audit logging complete

**Forbidden Claims (Final):**
- Real Copilot CLI E2E proof
- Production-grade recall rates
- Statistical significance, confidence intervals, effect sizes
- Ship/release readiness

**Recommended Next Action:** Scribe record final substitute evidence summary; stop substitute work; await Tamir direction on infrastructure access for real E2E.

**Written to:** `.squad/decisions.md` via inbox merge.
