# PRD: SDK Init Shore-Up
**Initiative:** Comprehensive SDK Init Quality Gate  
**Owner:** Flight  
**Sprint:** v0.9.0  
**Status:** Draft

---

## Problem Space

SDK initialization (`squad init --sdk`) produces incomplete and inconsistent squad state. Users who consume `@bradygaster/squad-sdk` to build their own squads encounter three critical gaps:

1. **Config ↔ team.md sync broken** — When members are added/removed through SDK workflows, `squad.config.ts` doesn't update. The coordinator flow updates `team.md`, `routing.md`, and `registry.json`, but has no step for `squad.config.ts`. Result: SDK consumers can't reference new members in code.

2. **Built-in members missing from SDK surface** — Ralph (work monitor) and @copilot (coding agent) exist at the coordinator level but aren't included in generated `squad.config.ts`. Ralph works in CLI squads but SDK consumers have no way to reference it. Similarly, `routing.md` has `@copilot` rules pre-configured, but `team.md` roster and `squad.config.ts` are missing the entry.

3. **CastingEngine bypassed during CLI init** — The `CastingEngine` class maintains a curated universe template system (Apollo 13, The Usual Suspects, etc.) with carefully crafted role definitions. However, the CLI init flow completely bypasses this — the LLM picks arbitrary universes from scratch. This defeats months of universe curation work.

**Impact:**
- SDK squads can't access full feature set (Ralph, @copilot unavailable)
- Adding members requires manual `squad.config.ts` edits (breaks "code-gen from team.md" promise)
- Universe quality degrades (arbitrary vs. curated)
- Test matrix shows 64% verified, 12% gaps, 24% needs setup (#341)

---

## Root Causes

### 1. Config Sync Gap
**Issue:** #337  
The coordinator's `add-member` and `remove-member` flows update:
- ✅ `team.md` roster
- ✅ `routing.md` assignments
- ✅ `registry.json` charter paths
- ❌ `squad.config.ts` member exports

**Why it matters:** SDK consumers import from `squad.config.ts`. Without this update, newly added members are invisible to user code.

### 2. Built-in Member Gaps
**Issues:** #338, #339  
Ralph and @copilot are first-class members in CLI squads but second-class citizens in SDK squads:
- Ralph: Missing from `squad.config.ts` generation (exists only in coordinator internals)
- @copilot: Pre-configured in `routing.md` but missing from `team.md` roster and `squad.config.ts`

**Why it matters:** SDK users can't leverage work monitoring (Ralph) or coding agent routing (@copilot) — features that work perfectly in CLI squads.

### 3. CastingEngine Bypass
**Issue:** #342  
The `CastingEngine` class is Squad's universe template system — it knows Apollo 13, The Usual Suspects, and curated role definitions. But during `squad init`, the CLI path calls the LLM directly, bypassing `CastingEngine` entirely.

**Why it matters:** Months of universe curation (role synergy, naming conventions, expertise mapping) is wasted. Every init generates a fresh, arbitrary team instead of leveraging proven templates.

---

## Solution: Phased Shore-Up

### Phase 1: Fix the Gaps (Foundational)
**Scope:** Small  
**Issues:** #337, #338, #339  
**Owner:** EECOM (core dev) + CAPCOM (SDK expert)

**Work:**
1. **Config sync** (#337)
   - Add `squad.config.ts` update step to coordinator's `add-member` and `remove-member` flows
   - Ensure `squad.config.ts` regenerates when `team.md` roster changes
   - Test: Add member via coordinator → verify `squad.config.ts` export appears

2. **Ralph inclusion** (#338)
   - Add Ralph to `squad.config.ts` template generation
   - Include charter path placeholder (Ralph has no charter file — document this as known gap)
   - Test: `squad init --sdk` → verify Ralph in config exports

3. **@copilot roster entry** (#339)
   - Add @copilot to `team.md` roster template (status: 🤖 Coding Agent)
   - Add @copilot to `squad.config.ts` generation
   - Align with existing `routing.md` rules (already configured)
   - Test: `squad init --sdk` → verify @copilot in roster and config

**Success criteria:**
- All three members (user-added, Ralph, @copilot) appear in `squad.config.ts`
- `team.md` ↔ `squad.config.ts` sync verified through add/remove cycles
- No manual config edits required

---

### Phase 2: Wire CastingEngine (Quality)
**Scope:** Medium  
**Issue:** #342  
**Owner:** EECOM + Procedures (prompt engineer)

**Work:**
1. **Route CLI init through CastingEngine**
   - Refactor `packages/squad-cli/src/commands/init.ts` to use `CastingEngine.cast()`
   - Pass universe selection to `CastingEngine` (default: Apollo 13)
   - Remove direct LLM universe generation logic

2. **Universe selection UX**
   - Prompt user to choose universe during `squad init`:
     - Apollo 13 (Mission Control)
     - The Usual Suspects (Crime drama)
     - Custom (legacy LLM path — warn about quality)
   - Default to Apollo 13 for `--sdk` path

3. **Template validation**
   - Verify all `CastingEngine` templates include Ralph and @copilot
   - Ensure templates produce valid `squad.config.ts` exports
   - Test all universe options produce complete state

**Success criteria:**
- CLI init uses `CastingEngine` by default
- All curated universes (Apollo 13, Usual Suspects) generate complete configs
- Custom universe path preserved but flagged as legacy

---

### Phase 3: Exercise Test Matrix (Verification)
**Scope:** Large  
**Issues:** #340, #341  
**Owner:** FIDO (quality owner) + CAPCOM

**Work:**
1. **Active exercise testing** (#340)
   - Systematically exercise all 29 untested features in SDK squads
   - Document test scenarios for each feature
   - Identify features that require special setup (telemetry, VS Code extension, etc.)

2. **Full test matrix completion** (#341)
   - Current state: 32/50 verified (64%), 6 gaps (12%), 12 needs setup (24%)
   - Target: 50/50 verified (100%)
   - For each gap:
     - Determine if SDK limitation or test setup issue
     - Document workarounds or file SDK enhancement issues
     - Mark as "verified" or "documented gap"

3. **Regression test suite**
   - Create smoke test suite for SDK init covering all 50 features
   - Run on every SDK-related PR
   - Gate releases on 100% verified status

**Success criteria:**
- All 50 features verified in SDK squads
- No undocumented gaps
- Automated regression suite in place

---

## Issue Mapping

| Phase | Issue | Title | Owner | Priority |
|-------|-------|-------|-------|----------|
| 1 | #337 | Config ↔ team.md sync broken | EECOM + CAPCOM | P1 |
| 1 | #338 | Ralph missing from generated config | EECOM + CAPCOM | P1 |
| 1 | #339 | @copilot routing without roster entry | EECOM + CAPCOM | P1 |
| 2 | #342 | CLI casting bypasses CastingEngine | EECOM + Procedures | P1 |
| 3 | #340 | 29 features need active exercise testing | FIDO + CAPCOM | P2 |
| 3 | #341 | Full test results (32/50 verified) | FIDO + CAPCOM | P2 |

---

## Timeline & Dependencies

**Phase 1** (1 sprint)
- Can start immediately
- Blocks: Phase 2 (CastingEngine needs complete config system)

**Phase 2** (1 sprint)
- Depends on: Phase 1 (config sync must work before universe templates rely on it)
- Blocks: Phase 3 (test matrix requires stable init flow)

**Phase 3** (2 sprints)
- Depends on: Phase 1 + Phase 2 (complete, stable init flow required)
- Deliverable: 100% verified SDK feature parity

**Total estimated scope:** 4 sprints

---

## Success Metrics

1. **Config completeness:** `squad.config.ts` includes all members (user-added, Ralph, @copilot) without manual intervention
2. **Universe quality:** 90%+ of `squad init` runs use curated templates (Apollo 13/Usual Suspects) vs. custom LLM generation
3. **Feature parity:** 50/50 features verified (100%) in SDK squads
4. **Zero gaps:** No undocumented differences between CLI and SDK squad capabilities

---

## Open Questions

1. **Ralph charter:** Ralph has no charter file. Should we create one, or document as "built-in, no charter"?
2. **@copilot auto-routing:** Should SDK squads enable `copilot-auto-assign: true` by default, or leave it opt-in?
3. **Legacy custom universe:** Should we deprecate the LLM-generated custom universe path entirely, or keep it for edge cases?

---

## Related Work

- #316 — Cross-Squad Orchestration (may need SDK init patterns)
- #321 — squad upgrade/init does not stamp version (version stamping gap)
- #329 — Personal Squad updates (may intersect with config sync patterns)

---

**Next steps:** Phase 1 kickoff. EECOM + CAPCOM to review and estimate.
