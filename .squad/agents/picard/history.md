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
**Last Updated:** 2026-06-02T10:50:37Z  
**Archive:** `.squad/agents/picard/history-archive.md` (detailed architecture review)
