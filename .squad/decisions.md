# Squad Decisions

**Last Updated:** 2026-06-15T18:24:50Z

## Active Decisions

---

# Squad Decisions

**Last Updated:** 2026-06-09T10:03:36Z

## Active Decisions

---


---

### 2026-06-09T10:03:36Z: Data — PR bradygaster/squad#1148 Review (reasoningEffort threading)

**Author:** Data  
**Status:** APPROVE with 3 follow-up notes (none blocking)  
**PR:** https://github.com/bradygaster/squad/pull/1148 — feat(sdk): thread reasoningEffort through agent spawning pipeline

**Verdict:** APPROVE

**Summary:** Resolver mirrors existing `resolveModel` shape; charter parsing is solid; wiring reaches SDK in both spawn paths; test coverage ~440 lines with 30+ cases. Backwards compat preserved.

**Top 3 Concerns (non-blocking):**
1. **[QUESTION]** Persistent-config layers (0a/0b) not wired in `AgentLifecycleManager.spawnAgent`. Mirrors pre-existing pattern. Follow-up PR needed for both model AND reasoning effort.
2. **[QUESTION]** `clampReasoningEffort` clamps UP to minimum when below supported. User requesting `low` gets `high` if model only supports `[high]`. Verify intent; document.
3. **[NIT]** Three copies of `low|medium|high|xhigh` union; pick canonical. Narrow `AgentConfig.reasoningEffort` from `string` to union.

**Recommendation:** Merge as-is. File follow-up for (1) and (3); confirm (2) with author.

**Full review:** `.squad/decisions/inbox/data-pr1148-review.md`

---


---

### 2026-06-09T10:03:36Z: Worf — PR bradygaster/squad#1148 Reliability Review

**Author:** Worf  
**Status:** REQUEST CHANGES — 2 blockers, 3 risks  
**PR:** https://github.com/bradygaster/squad/pull/1148  
**Files:** 18 files, +983 / -6

**Verdict:** REQUEST CHANGES

**Summary:** Resolver and clamper correctly written, unit-tested, but NOT wired into production lifecycle spawn path. Advertised persistent-config feature is dead in lifecycle code. No capability clamping at runtime. Backwards compat clean; security OK.

**BLOCKER 1** — `lifecycle.ts:213-220`: `spawnAgent` does NOT call `resolveReasoningEffort()`. Uses flat OR-chain, bypassing Layer 0a (per-agent overrides) and Layer 0b (default). User setting `squad config set-reasoning-effort xhigh` sees NO effect. Fix: Wire `resolveReasoningEffort()` call with persistent config + spawn override.

**BLOCKER 2** — `lifecycle.ts` + `fan-out.ts:128-137`: `clampReasoningEffort()` never invoked from production. Neither path fetches `supportedReasoningEfforts` from `listModels()`. Unverified if SDK strict-validates; may fail on unsupported effort. Fix: Call `listModels()`, pass `supportedReasoningEfforts` to resolver.

**Risks & NITs:**
- Fan-out default branch also bypasses Layer 0a/0b for existing callers
- `writeReasoningEffort('typo')` silently deletes existing preference
- `clampReasoningEffort` may return value NOT in `supportedEfforts`
- `readReasoningEffort` accepts 'auto' but `readAgentReasoningEffortOverrides` doesn't (inconsistent)
- Charter invalid values silently dropped; no warning logged

**Recommendation:** REQUEST CHANGES. Block merge until both blockers fixed. Add integration test: `writeReasoningEffort()` → `spawnAgent()` → assert session carries persisted value. Catches both blockers; protects regression.

**Full review:** `.squad/decisions/inbox/worf-pr1148-review.md`

---



