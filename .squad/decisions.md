# Squad Decisions

**Last Updated:** 2026-07-05T15:34:48.648+03:00

## Active Decisions

---

### 2026-07-05T15:34:48Z: Data & Worf — Squad Org Demo Workstream & Real Copilot Proof

**Authors:** Data (Squad Framework Expert), Worf (Security & Reliability)  
**Date:** 2026-07-04 (Data workstream setup), 2026-07-05T15:33+03:00 (Worf verdict)  
**Status:** APPROVED (with relabel requirement on MP4)  
**Workstream:** `squad-org-demo`

**Data's decision:** Upgraded Squad CLI from `0.10.0-insider.1` to `0.11.0` on this machine (installed to `C:\.tools\.npm-global` to avoid admin requirement). Created new active workstream `squad-org-demo` with template structure to hold presentation-prep covering upstream, sub squads, workstreams, peer squads, squad communication, and presets. Workstream files created: `README.md`, `now.md`, `decisions.md`, `decisions/inbox/.gitkeep`. Updated `.squad/workstreams/README.md` with the new workstream entry.

**Worf's verdict (on Data's proof artifact `real-copilot-squad-run-proof.md`):**
- ✅ **APPROVED** — Real Copilot session with live Squad CLI 0.11.0 execution proven via session id, NTFS mtimes, and in-file timestamps.
- **Mandatory relabel:** MP4 is a Playwright/ffmpeg-encoded replay of a real transcript, NOT a live terminal/Copilot recording. Must be labeled: "Reproducible replay of a real Squad org-demo run" (or similar honest variant). Unacceptable labels: "Live Copilot session recording."
- All six verification criteria passed: session timing, direct CLI usage, demo beats covered, upstream directives consumed, security/PII scrubbed (except local paths — fine for internal use; scrub before external publication).
- **Non-blocking follow-up:** If genuinely live recording needed, capture Copilot PTY while agent loop runs; do not re-render transcript.

**Recommendation:** Proceed with workstream and demo prep. Ensure MP4 labeling reflects Worf's approved wording before any external use.

---

### 2026-06-24T15:34:17Z: Data & Worf — PR Review: bradygaster/squad#1384
**Reviewers:** Data (Framework Lead), Worf (Reliability)  
**Date:** 2026-06-24T15:34:17+03:00  
**PR:** https://github.com/bradygaster/squad/pull/1384  
**Title:** feat(tracing): capture task-tool dispatch + tool requests for subagent OTel  
**Verdict:** REQUEST CHANGES — 4 issues (2 blockers + 2 reliability concerns)

**Cross-agent findings (consolidated):**

**BLOCKER 1 (Data/Worf agreed):** Hardcoded developer path in sample `Program.cs`:
```csharp
o.SquadFolderPath = @"C:\Users\tamirdresher\source\repos\squad-squad";
```
Blocks all non-author clones. Restore to `teamRoot` or `Directory.GetCurrentDirectory()`.

**BLOCKER 2 (Worf emphasis):** Untruncated span attribute `squad.subagent.prompt` leaks user PII. Truncate to 1024 chars (matches typed event) or make optional via `SquadAgentOptions.IncludeDispatchedPromptInTraces` (default false).

**RELIABILITY R-1 (Worf):** Missing try/catch guard in `OnTaskDispatch`. If `JsonElement` access or `Activity` operations throw, exception propagates into SDK's event dispatcher. Wrap `OnTaskDispatch` body in defensive try/catch.

**RELIABILITY R-2 (Worf):** Parallel dispatch span parenting incorrect. Multiple `ToolExecutionStartEvent[task]` fire on same thread → second span parents to first (should both parent to coordinator). Capture and restore `Activity.Current` before opening subagent span.

**Positive:** CI all green on net8.0/net9.0/net10.0. 82 tests pass. 11 new dispatch-path tests added. `InvokeConsumer` protected. Concurrent state correct.

**Recommendation:** REQUEST CHANGES. Fix blockers before merge. R-1 and R-2 mitigate failure modes in production telemetry.

---

### 2026-07-03T09:20:04Z: Worf — Reliability Review: JavaScript Extensions Windows CI Failure
**Author:** Worf  
**Date:** 2026-07-03T09:20:04.467+03:00  
**Status:** COMPLETED  
**Finding:** External tooling drift (not code regression)

**Root Cause:** Windows CI flakes driven by environment, not Squad code changes:
- Node.js version floating (no major pin; auto-upgrade on `windows-latest`)
- Corepack enabled; bun/pnpm versions floating without lock
- Package lock disabled (npm ci bypassed; regenerated lock on each run)
- nx/turbo shim behavior differs Node LTS ↔ latest; cache invalidation patterns changed
- `windows-latest` image updates introduce filesystem/symlink interaction differences

**Risk Level:** MEDIUM — CI reliability, not code correctness. Intermittent Windows-only flakes; no codebase regression.

**Recommendations:**
1. Pin Node LTS version in workflows (e.g., `node-version: "20.x"`)
2. Lock corepack behavior explicitly
3. Restore `npm ci` (disable package lock regeneration)
4. Verify nx/turbo cache on pinned Node + stable Windows image
5. Document Windows CI expectations in contribution guide

**Decision:** ANALYZED — External drift confirmed. No code fix required. Recommend environment stabilization in upstream CI (bradygaster/squad) workflows. **Not a blocker for Squad.Agents.AI SDK or Squad CLI release.**

---

### 2026-06-24T13:33:13Z: Data — PR Review: bradygaster/squad#1383

**Author:** Data  
**Date:** 2026-06-24T13:33:13+03:00  
**PR:** https://github.com/bradygaster/squad/pull/1383  
**Title:** fix: CLI and upgrade bug fixes (#1050, #1048, #1047, #1052, #1029, #1353)  
**Verdict:** REQUEST CHANGES — 2 blockers (CI failure + routing logic bug)

**Summary:** Batches six CLI and upgrade bug fixes. All issues addressed in code, but logical error in routing mention guard (`||` should be `&&`) and CI test failure block merge.

**BLOCKER 1 — CI `test` step FAILED:** Two tests fail directly from PR changes. Need confirmation these aren't pre-existing or fixes required.

**BLOCKER 2 — Routing mention guard uses `||` instead of `&&`:** In `routing.ts`, the @mention fast-path condition `allKnownAgents.includes(agentName) || agentName !== 'coordinator'` is logically inverted. Should be `&&`. As written, ANY `@word` (except `@coordinator`) bypasses normal routing, creating a live routing regression.

**Non-blocking:** Upgrade backup overwrites silently (no rotation). Onboarding regex fragile with bracket characters in role strings.

---

### 2026-06-24T13:33:13Z: Worf — Security & Reliability Review: bradygaster/squad#1383

**Author:** Worf  
**PR:** https://github.com/bradygaster/squad/pull/1383  
**Verdict:** ⚠️ CONCERNS — Do not merge until issues below resolved

**CI Status:** `test` job FAILING (2 tests introduced by PR). All others pass.

**FINDING S-1 (HIGH):** `routing.ts` boolean logic flaw in @mention guard — same `||` vs `&&` bug as Data's review. Any `@arbitrary-name` routes to that agent at high confidence, bypassing routing rules.

**FINDING S-2 (LOW):** `onboarding.ts` unescaped user input in RegExp constructor. `agentName` directly concatenated into RegExp without escaping; `a+(b` causes `SyntaxError`.

**FINDING S-3 (LOW):** `upgrade.ts` no backup rotation. Hardcoded backup path silently overwrites on each upgrade.

**FINDING R-1 (BLOCKER):** Both failing tests introduced by PR. `addAgentToConfig` regression is correctness issue in production code.

**FINDING R-2 (MEDIUM):** `state-mcp.ts` permanent error caching. If initialization fails once, `initError` is cached forever and every subsequent ListTools/CallTool request throws. No retry or reset path.

**FINDING R-3 (LOW):** `state-mcp.ts` tool map rebuilt on every CallTool invocation, not just once.

**FINDING R-4 (LOW):** `build.ts` dead variable `baseDir` — code smell suggesting copy-paste error.

**FINDING R-5 (LOW / THEORETICAL):** `build.ts` unvalidated `relPath` path traversal — `.squad/../../sensitive-file` passes prefix check. Theoretical under current code paths but worth hardening.

---

### 2026-06-18T15:44:01Z: Geordi — Aspire 13.5-preview MessagePack CVE override

**Author:** Geordi  
**Date:** 2026-06-18T15:44:01+03:00 (proposed) · 2026-06-18T15:53+03:00 (applied)  
**Status:** APPLIED — Option B selected by coordinator; restore + build verified clean on `experimental/with-terminal-13.5`

**Decision:** When pinning CVE-vulnerable transitive packages under CPM, use **Option B — direct PackageReference promotion** (preferred for narrow CVE fixes). Add `<PackageReference>` entries to consuming projects' `.csproj` files; central `<PackageVersion>` drives version for those projects only.

**For MessagePack CVE GHSA-hv8m-jj95-wg3x:** Pin to 2.5.301 (patch within same minor line as StreamJsonRpc 2.22.x requirement). Applied to both `examples/squad/CommunityToolkit.Aspire.Hosting.Squad.AppHost.csproj` and `src/CommunityToolkit.Aspire.Hosting.Squad.csproj`.

**Outcome:** Verified clean restore and build; `project.assets.json` confirms MessagePack/2.5.301 resolution.

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



