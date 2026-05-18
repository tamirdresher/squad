# 2026-05-18T12:08:34.040+03:00 — Sandbox Death & Orphan Issue Recovery Design Batch

**Orchestrator:** Scribe (Session Logger)  
**Session:** Squad-squad sandbox failure mode analysis & stale-lease recovery guardrails  
**Outcome:** Design clarification merged into Ralph runner decision; recovery sequence fully specified

---

## Agent Dispatch & Routing

| Agent | Role | Input | Output | Status |
|-------|------|-------|--------|--------|
| B'Elanna | Reliability & State Machines Engineer | "Does a crashing sandbox create orphan issues? How do we distinguish dead vs slow?" | Comprehensive failure-mode trace; two heartbeat models (Model A: ADC status check; Model B: sandbox heartbeat write); proves TTL + stale-sweep = no orphans | ✅ Delivered |
| Worf | Security & Reliability Guardrails | "What must be true before requeue? How do we prevent duplicate work or branch corruption?" | Mandatory guardrails G20–G26: sandbox-stopped check, branch inspection, attempt counter, ordered recovery sequence, audit trail, escalation after 3 failures | ✅ Delivered |

---

## Decision Consolidation (Inbox → decisions.md)

**Inbox files merged:**
1. `belanna-sandbox-death-orphan-analysis.md` — Failure-mode trace, orphan prevention proof, Model A vs Model B heartbeat mechanisms
2. `worf-stale-lease-requeue-guardrails.md` — Pre-conditions for requeue (P1–P5), guardrails (G20–G26), label/comment/git audit trail, label taxonomy addition (`squad:stuck`)

**Deduplicated under:** Subsection of 2026-05-18T11:42:44 Ralph-Style Runner decision, titled "Sandbox Death & Orphan Issue Recovery (Subsection)"

**Key deduplication logic:**
- Both analyses address the same failure scenario (sandbox crash before completion) within the broader Ralph runner MVP.
- B'Elanna's failure-mode trace + heartbeat models = root-cause analysis.
- Worf's guardrails = implementation contract for recovery sequence.
- No conflicts; together they completely specify how stale-lease sweep reclaims stuck issues.
- Subsection placement preserves decision hierarchy: Ralph runner orchestration is parent; sandbox death/recovery is a critical sub-component.

---

## Design Integrity Checks

| Check | Result |
|-------|--------|
| **No orphan issues possible** | ✅ Proved: TTL expiry + stale-lease sweep (before claiming fresh work) + PR existence check = no stuck labels without action |
| **Dead vs. Slow distinction** | ✅ Model A (ADC status check) recommended; Model B (heartbeat) is fallback; both avoid false reclaim of live-but-slow sandbox |
| **Partial work preserved** | ✅ G21: branch inspection before requeue; if partial commits exist, new sandbox resumes from branch tip (not fresh from main) |
| **No duplicate branch writes** | ✅ G20: verify sandbox stopped; G21: inspect branch state; prevents two sandboxes writing same branch |
| **Attempt counter prevents infinite retry** | ✅ G25: escalate to `squad:stuck` after 3 failures; requires human to manually clear before requeue resumes |
| **Audit trail exists** | ✅ G24: mandatory recovery comment on GitHub (sandbox_id, phase, lease times, attempt, action); git history via lease-store commit; label changes |
| **Ordered recovery prevents crash gaps** | ✅ G26: exact sequence (lease-store commit before label removal); any step failure halts sequence; no race between label removal and git history |
| **Idempotent recovery** | ✅ G24: repeated sweeps for same stale lease are safe (404 on label removal is success; duplicate comment is skipped) |

---

## Key Decisions

**1. Heartbeat Mechanism (B'Elanna Decision Required)**

**Recommendation: Model A (ADC Status Check)**
- Before each scan's stale-lease sweep, query `ADC.getSandboxStatus(sandbox_id)`
- If `RUNNING` → extend TTL by one cycle → recheck next scan
- Only sweep/reclaim when ADC says `STOPPED`, `CRASHED`, or `NOT_FOUND`
- **Advantage:** No code required inside sandbox; dead sandbox = no extension = guaranteed reclaim on schedule
- **Prerequisite:** ADC SDK must expose reliable sandbox-alive check (Geordi to confirm)

**Fallback: Model B (Sandbox Heartbeat Write)**
- Sandbox writes to lease-store every 10 minutes: `lease.expires_at = now() + 30m`
- Stale sweep skips leases with recent heartbeat
- **Advantage:** No ADC status API dependency
- **Disadvantage:** Slow death detection (up to original TTL); requires agent-side instrumentation

**Decision:** If ADC status API available → use Model A. Otherwise → Model B with 10-min heartbeat.

**Impact:** Documentation (docs/reliability.md, lease protocol section) must be updated once heartbeat mechanism is chosen.

---

**2. Stale-Lease Recovery Sequence (Worf Mandatory Guardrails G20–G26)**

**All must be executed in exact order:**
1. **G20 — Verify sandbox stopped:** ADC status check (grace period if RUNNING)
2. **G21 — Inspect branch state:** GitHub API check for partial commits
3. **Increment attempt counter** from expiring lease
4. **IF attempt >= 3:** escalate path (G25) — apply `squad:stuck`, do NOT requeue
5. **IF attempt < 3:** requeue path:
   - Build recovery payload (resume from branch if needed)
   - Write updated lease-store (remove old entry), git commit & push
   - Remove `squad:processing` label
   - Post recovery comment (audit trail)
   - Re-apply `squad:agent:<name>` label (return to TRIAGED)

**Non-negotiable ordering rationale:**
- Git audit trail written **before** label removal (P4): if Function crashes, next scan finds clean git history and knows to recheck labels
- Label removal **before** comment post: comment is the human-readable summary of what just happened
- No new lease entry written until old one is removed from git history

---

**3. Label Taxonomy Addition**

Add `squad:stuck` to label taxonomy:

| Label | Meaning | Terminal? |
|-------|---------|-----------|
| `squad:stuck` | Issue failed automated recovery 3 times; human review required before re-queuing | **Yes (until manually cleared)** |

---

## Cross-Agent Learning

### B'Elanna Reliability Insights
- **Learning:** TTL + stale-sweep is complete orphan prevention iff heartbeat/status mechanism distinguishes dead from slow. Label age alone is insufficient (correctness bug).
- **Confirmed:** Model A (ADC status) preferred because it requires no sandbox-side instrumentation; dead sandbox simply stops writing extensions, and TTL expires on schedule.
- **Next:** Implement TTL extension logic in Azure Function (P2); coordinate with Geordi on ADC status API availability.

### Worf Security Insights
- **Approved:** 5-min timer + atomic label re-read (< 2s timestamp) prevents race even on singleton Function.
- **Approved:** Lease-before-act pattern (G14) is critical durability mechanism; write state to git before resumeSandbox.
- **Approved:** Payload via file upload (G16), cleanup (G17) prevents command injection.
- **Rejected:** No automated conflict resolution (agent cannot both write code and resolve conflicts autonomously).
- **Rejected:** No auto-merge to protected branches; requires human approval gate in branch protection settings.
- **Required:** Three-failure escalation with human tag (Picard) is safety valve; prevents infinite retry loops on structural issues.
- **Next:** Review Azure Function implementation for G20–G26 compliance before any demo (pre-implementation gate).

### Cross-Agent Alignment
- **B'Elanna ↔ Worf:** No conflicts. B'Elanna specifies failure modes; Worf specifies guardrails that prevent them. Orthogonal concerns, unified design.
- **B'Elanna ↔ Picard/Data:** No conflicts. Ralph runner orchestration is unaffected; recovery is a sub-loop within stale-lease sweep (already in orchestration spec).

---

## Blocking Items for Implementation

| Item | Owner | Status | Impact |
|------|-------|--------|--------|
| **G11:** Managed Identity token acceptance by ADC API | Geordi | ⏳ Pending verification | Blocks Azure Function authentication to ADC |
| **Model A availability:** ADC SDK `getSandboxStatus()` API | Geordi | ⏳ Pending confirmation | Determines heartbeat model choice (A preferred, B fallback) |
| **P2 — Azure Function:** Implement stale-lease sweep + recovery (G20–G26) | Data (or TBD dev) | 📋 Ready to start | Requires G11 & Model A confirmation first |
| **P3 — Integration test:** Stale-lease recovery with branch inspection | Data (or TBD test) | 📋 Ready to start | Validates G20–G26 sequence end-to-end |

---

## Files Modified

**decisions.md:**
- Added subsection "Sandbox Death & Orphan Issue Recovery (Subsection)" under the 2026-05-18T11:42:44 Ralph runner decision
- Integrated B'Elanna failure-mode trace, Worf guardrails, recovery sequence, label taxonomy
- Updated next steps to include stale-lease recovery testing (P3)

---

## Scribe Attestation

This batch merge is mechanically and substantively correct:
- B'Elanna's failure-mode analysis + Worf's guardrails are complementary, not redundant
- Both contribute to a complete recovery specification
- No meaningful content lost in deduplication
- Cross-references to Worf G20–G26 ensure recovery sequence is machine-readable for implementation
- Subsection placement under Ralph runner decision preserves decision hierarchy and discovery
- Ready for implementation phase

**Commit strategy:**
- Stage: `.squad/decisions.md` (with merged recovery subsection)
- Stage: `.squad/orchestration-log/2026-05-18T12-08-34-sandbox-death-orphan-batch.md` (this file)
- Stage: `.squad/log/2026-05-18-sandbox-recovery-session.md` (session log, TBD)
- Stage: Agent history updates (B'Elanna, Worf)
- Delete: `.squad/decisions/inbox/belanna-sandbox-death-orphan-analysis.md`
- Delete: `.squad/decisions/inbox/worf-stale-lease-requeue-guardrails.md`
