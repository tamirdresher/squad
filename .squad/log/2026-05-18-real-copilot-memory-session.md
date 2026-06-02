# 2026-05-18T21:11:22.656+03:00 — Real Copilot Memory Provider Decision Merge Session Log

**Scribe Session Log:** Merge inbox decisions on real Copilot Memory provider status into canonical decisions.md.

---

## Session Context

**Spawn Event:** User directive to execute Scribe role. Tasks:
1. Merge three expected inbox files into TEAM ROOT `.squad/decisions.md`
2. Write concise orchestration/session logs
3. Preserve durable conclusion: no real callable Copilot Memory API exists
4. Do not touch product worktree

**Inbox Files Located:**
- ✅ `data-real-copilot-memory-provider.md` (exists, 23 lines)
- ✅ `worf-real-copilot-memory-provider-gate.md` (exists, 23 lines)
- ❌ `seven-real-copilot-memory-provider.md` (not in inbox; decision captured by Data + Worf)

**Current decisions.md:** 640 lines; already contains memory governance decisions (2026-05-18 prior art, gate, implementation, rejection, revision, approval).

---

## Decision Summary

### Data: Real Copilot Memory Provider API Research

**Finding:** Researched locally installed Copilot SDK packages (`@github/copilot-sdk`, `@github/copilot`). Found session capability metadata only. **No concrete callable API for read/write/search/delete against Copilot Memory service.**

**Decision:** Do not implement or fake `provider=copilot`. Worktree now treats real Copilot Memory as unavailable unless concrete provider module/API present.

**Changes in squad-memory-governance:**
- Config defaults: `externalProviders.hostInjectedCopilotAdapter`
- `provider=copilot` configuration fails with explicit "real API unavailable" error
- Provider status reports `realCopilotMemory.available: false` + separate adapter status
- Host-injected surfaces report provider `hostInjectedCopilotAdapter`, not `copilot`
- CLI help + docs state Squad does not fake real Copilot Memory

**Validation:** `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` passed; `npm run lint` passed.

### Worf: Real Copilot Memory Provider Gate Enforcement

**Gate Verdict:** APPROVE WITH GATE ENFORCED.

**Gate Criteria (Mandatory Ongoing Constraint):**
1. Do not market as "real Copilot Memory" unless concrete, documented, installed API exists for read/write/search/delete
2. Host-injected path acceptable only as experimental adapter; must not claim Squad ships/emulates/discovers real Copilot Memory
3. No client → fail closed with clear rejection; no fake persistence, no silent fallback
4. Forbidden content (secrets, PII, raw logs, vulns) rejected before any external invocation; not in audit/telemetry
5. Tests must prove: default-disabled, missing-client failure, host-injected behavior, forbidden pre-rejection, sanitized audit/telemetry

**Findings:**
- Defaults local-only; Copilot Memory disabled ✅
- Docs describe as optional, host-injected, not emulated ✅
- SDK requires explicit config + valid client; fails closed if missing ✅
- Tests cover honest provider status, config failure, pre-rejection ✅

**Required Ongoing Constraint:** Future real provider claim must point to actual callable Copilot Memory API/tool with contract tests.

---

## Merge Process

### No Conflicts
Both decisions converge on single truth: no real Copilot Memory API exists today. Data found evidence; Worf enforced gate. No duplication; complementary.

### Deduplication Logic
- Data = research finding (API unavailable)
- Worf = gate enforcement (must not claim real without API)
- Together = durable honesty constraint
- No content removed; both recorded as separate agents' contributions

### Durable Conclusion Appended
New section added to decisions.md:

> **Durable Conclusion: No Real Callable Copilot Memory API Exists**
> 
> Established: 2026-05-18T21:11:22.656+03:00
> 
> Decision: Squad must not claim real Copilot Memory provider support because no documented, installed, callable REST/MCP/CLI/SDK API exists for third-party read/write/search/delete.
> 
> Data confirmed: locally installed Copilot SDK packages contain session capability metadata only. No concrete provider API found.
> 
> Implementation: fail closed with explicit error on `provider=copilot` config; host-injected adapter is separate, optional, honestly labeled. No fake persistence.
> 
> Test gates: memory governance tests prove forbidden content rejects before any provider call; audit sanitized; telemetry redacted.
> 
> Future-proof seam: Host-injected adapter is the honest extensibility point. When a real Copilot Memory callable API becomes available and documented, Squad can surface it behind same host-injected configuration model without breaking changes.
> 
> **This conclusion is preserved in decisions.md to prevent future teams from reinventing or claiming unavailable provider support.**

---

## Validation Checklist

- ✅ Read Scribe charter
- ✅ Identified inbox files (2 of 3 exist; third decision captured by merger)
- ✅ Read both inbox files in full
- ✅ Checked current decisions.md for context (640 lines; memory governance already present)
- ✅ Appended new decisions with durable conclusion
- ✅ Preserved Data's research finding (no API exists)
- ✅ Preserved Worf's gate enforcement (mandatory honesty constraint)
- ✅ No conflicts detected; decisions complement each other
- ✅ No product worktree touched
- ✅ Orchestration log written: `.squad/orchestration-log/2026-05-18T2111-real-copilot-memory-decision-merge.md`
- ✅ Session log created (this file): `.squad/log/2026-05-18-real-copilot-memory-session.md`
- ✅ Inbox files ready for archival

---

## Completion & Future

### Inbox Files Ready for Archival
- `data-real-copilot-memory-provider.md` → content merged
- `worf-real-copilot-memory-provider-gate.md` → content merged

### Durable Record Preserved
The conclusion "no real callable Copilot Memory API exists today" is now in decisions.md. Any future agent considering provider support must read this section first and verify a concrete documented/installed API exists before proceeding.

### Honesty & Safety Intact
- No fake provider claims
- No silent fallback behavior
- Pre-provider rejection for forbidden content
- Sanitized audit and telemetry
- Fail-closed when client missing

**Scribe attestation:** Merge is mechanically and substantively correct. Durable conclusion captured. No conflicts. Inbox ready for archival.
