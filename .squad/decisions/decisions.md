# Team Decisions Log

Canonical record of decisions affecting squad-squad team direction, governance, and implementation contracts. All entries are append-only. Old entries > 30 days are archived to separate history files when decisions.md grows >= 20480 bytes; entries > 7 days are archived at >= 51200 bytes.

## Copilot Memory Provider Governance (2026-05-18)

### Seven: Copilot Memory API Availability Research
**Date:** 2026-05-18T21:54:14.193+03:00  
**Status:** Research Complete  
**Finding:** No public, callable REST API or SDK export in `@github/copilot-sdk` (v0.1.32) exists for CRUD operations on Copilot Memory.

**Evidence:**
- Web search of GitHub Docs, VS Code agents, Copilot SDK repo: Memory management is abstracted into agent chat interface and UI settings; no direct read/write/search/delete endpoints documented.
- @github/copilot-sdk v0.1.32 exports: CopilotClient, session management, messaging. Memory scoped to agents and UI, not as standalone callable CRUD.
- Code inspection in squad-memory-governance: CopilotMemoryProviderClient interface defined but no concrete implementation wired to real external API.

**Recommendation:** Do not implement provider=copilot as direct external storage. Keep hostInjectedCopilotAdapter as sole external bridge. Document limitation explicitly: "Real provider=copilot unavailable unless GitHub releases callable Memory CRUD API in future @github/copilot-sdk release."

---

### Data: Real Copilot Memory Provider Status
**Date:** 2026-05-18T21:11:22.656+03:00  
**Status:** Blocked for real provider; honesty/safety improvements applied

**Action Taken:**
- Inspected locally installed Copilot SDK/tooling in `node_modules/@github/copilot-sdk` and `node_modules/@github/copilot`; found session capability/permission metadata but no concrete callable API for write/search/delete.
- Treat real Copilot Memory as unavailable unless concrete provider module/API present.
- Existing host-supplied bridge explicitly named `hostInjectedCopilotAdapter`; not described as real Copilot Memory persistence.

**Changes in squad-memory-governance:**
- `.squad/memory/config.json` defaults use `externalProviders.hostInjectedCopilotAdapter`
- `provider=copilot` / `defaultProvider: "copilot"` config fails with explicit real API unavailable error
- Provider status reports `realCopilotMemory.available: false` + `hostInjectedCopilotAdapter` status separately
- Host-injected write/search/delete/audit surfaces report provider `hostInjectedCopilotAdapter`, not `copilot`
- Legacy `externalProviders.copilotMemory` config read as host-injected compatibility only
- CLI help and docs state Squad will not fake real Copilot Memory; host-injected adapter is separate opt-in bridge

**Validation:** `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` passed; `npm run lint` passed.

---

### Data: Copilot-backed Governed Memory Provider
**Date:** 2026-05-18T21:54:14.193+03:00  
**Decision:** Implemented as fail-closed, keep default local-only

**Details:**
- Copilot Memory implemented as explicit host-injected provider adapter, not as StorageProvider.
- Default init/upgrade config remains local-only; Copilot Memory disabled unless repo opts in via `.squad/memory/config.json` or `squad memory provider --enable-copilot`.
- Added typed `CopilotMemoryProviderClient` contract for hosts with real Copilot memory API.
- Missing host client fails closed with clear error; Squad does not fake remote persistence.
- Governed writes classify before provider calls, reject forbidden/transient/unapproved content before external calls, audit without raw sensitive content.
- Provider-backed delete calls host client, marks governed index deleted, writes local tombstone.
- Prompt-only custom-agent honesty preserved: provider-backed memory claimed only when enabled and real host client supplied.

---

### Seven: Copilot Search Safety Revision
**Date:** 2026-05-18T20:45:09.040+03:00  
**Revision Reason:** Prior review blocker on pre-provider classification

**Change Made:**
- `LocalMemoryStore.search()` classifies search query immediately after initialization and before reading provider configuration or invoking Copilot provider.
- Forbidden queries return no results and write sanitized rejection audit record (class FORBIDDEN, title "Rejected governed memory search", reason only; raw query not persisted).
- Audit path does not persist raw forbidden query.

**Validation:**
- Baseline: `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` — 52 tests passed
- After revision: `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` — 53 tests passed

---

### Worf: Initial Copilot Memory Provider Gate
**Date:** 2026-05-18T20:45:09.040+03:00  
**Reviewer:** Worf, Security & Reliability  
**Verdict:** Local governance APPROVED; Copilot-backed provider NOT APPROVED YET

**Approved Aspects:**
- Default config local-only: `defaultProvider: "local"`, Copilot disabled, approval required
- Forbidden memory rejected before persistence; semantic writes fail closed
- Validation: `npm test -- --run test/memory-governance.test.ts test/tools.test.ts` — 48 tests passed

**Mandatory Safety Gate for Copilot-backed Provider (Before Any Approval):**
1. Opt-in only, never default — default must remain local-only
2. Reject before external call — classify and forbid-check before any provider/client/network call
3. Fail closed — clear error if provider selected but no bridge/client installed; no silent fallback
4. Audit and telemetry redaction — never include raw memory content, prompts, secrets, raw queries
5. Delete semantics — provider must declare capability; if supported, local delete propagates to provider
6. Provider boundary and isolation — adapter behind governance layer; namespace confined by tenant/repo/team
7. Approval and promotion — only explicitly approved COPILOT_MEMORY entries route externally
8. Required tests — default config local-only, explicit opt-in required, missing provider fails closed, forbidden content rejected before call, audit/telemetry contain no raw sensitive content, prompt-only fallback documents as local-only, delete propagates when supported

**Required Revision:** Seven must add pre-provider search-query classification/rejection, audit rejection without raw query content, add tests proving forbidden search queries do not call Copilot provider. Add explicit tests for missing-client search and unsupported/delete-failure messaging.

---

### Worf: Copilot Memory Provider Rereview
**Date:** 2026-05-18T20:45:09.040+03:00  
**Verdict:** APPROVED

**Evidence:**
- Copilot provider remains opt-in: default config is `defaultProvider: local`, `promptOnlyFallback: true`, `copilotMemory.enabled: false`
- Missing host client fails closed: provider adapter throws when no host-injected client exists; provider status reports `configured` separately from `clientAvailable`
- Prior blocker fixed: `LocalMemoryStore.search()` classifies query and audits/returns no results for FORBIDDEN before local/provider search; test asserts provider `searchCalls === 0`
- Forbidden writes classified and rejected before provider write; test asserts provider write calls stay at zero
- Audit/tool telemetry redacts raw content/query; rejected audit records use safe placeholder titles, no sensitive payloads
- Delete/search/write/provider-health and prompt-only fallback semantics covered by targeted tests

**Validation:**
- `npm test -- --run test\memory-governance.test.ts test\tools.test.ts` passed: 53 tests

**Residual Risks (Acceptable):**
- Search/delete with configured provider but absent host client fail by exception rather than structured rejected result; acceptable because it fails closed and health is honest.

---

### Worf: Security & Reliability Review — Memory Governance & Copilot Provider Gate
**Date:** 2026-05-18T21:55:38.138+03:00  
**Reviewer:** Worf (Security & Reliability Reviewer)  
**Decision:** APPROVED with acknowledgment of residual limitations

**Review Charter:**
1. provider=copilot cannot silently fake success or call unsupported endpoints ✓
2. Forbidden content/search queries classified/rejected BEFORE any external provider call ✓
3. Telemetry/logging does not leak raw memory content or search queries ✓
4. Docs/CLI honestly state real Copilot Memory unavailable ✓
5. Memory storage remains abstract; local filesystem not the semantic governance contract ✓
6. Tests cover above with credible validation evidence ✓

**Key Findings:**
- **Security Gate 1:** provider=copilot fails closed. configureCopilotProvider() throws REAL_COPILOT_UNAVAILABLE_REASON if defaultProvider === 'copilot'. CLI command rejects with explicit error. providerStatus() reports realCopilotMemory.available = false always.
- **Security Gate 2:** Forbidden classification happens FIRST. search() calls classify({ content: query }) immediately; rejects FORBIDDEN queries before ANY provider call. write() classifies first, rejects if not allowed, only invokes provider AFTER approval checks.
- **Security Gate 3:** Audit logging does not leak content. audit() records timestamp, action, class, title, reason, actor, provider—but NOT content itself. safeAuditTitle() uses placeholder if title contains FORBIDDEN patterns. Audit for rejects only logs class, reason, actor—no memory content.
- **Security Gate 4:** Documentation honestly states limitation. memory.md: "Real provider=copilot unavailable unless concrete callable API exists." "Squad does not invent endpoints or fake remote memory service." CLI help: "provider --provider copilot fails unless real API module present."
- **Security Gate 5:** Memory storage is abstract. StorageProvider interface is abstract; LocalMemoryStore accepts storage parameter; FSStorageProvider is ONE implementation; no hardcoding to filesystem.
- **Security Gate 6:** Test coverage credible. All gates tested with forbidden classification before write, forbidden search before provider, provider=copilot unavailable, provider=copilot configured but no client, hostInjectedCopilotAdapter with/without client, audit does not leak, CLI integration.

**Residual Limitations (Acknowledged, Not Fixable Today):**
1. Copilot Memory API Does Not Exist — GitHub product limitation, not code defect. Squad correctly rejects, not fakes.
2. hostInjectedCopilotAdapter Requires External Supply — Opt-in, requires host to provide CopilotMemoryProviderClient. Intentional isolation, not vulnerability.
3. Prompt-Only Fallback is Local-Only — Custom agents editing `.squad/` files directly do not claim remote persistence. Honest behavior.
4. Config File Can Contain defaultProvider: "copilot" — Manually editing config will NOT cause writes to silently succeed; they fail closed with audit. Config forward-compatible but non-functional until real API exists.

**Approval:** Implementation is security-hardened and reliability-conscious. No shortcuts to fake persistence. Forbidden queries/content classified/rejected before ANY external call. Audit preserves governance history without leaking secrets. Docs honest about API unavailability. Storage layer abstract. Tests credibly validate all gates.

---

### Worf: Gate Enforcement Decision — Real Copilot Memory Provider
**Date:** 2026-05-18T21:55:38.138+03:00  
**Verdict:** APPROVE WITH GATE ENFORCED

**Gate Criteria (Mandatory Before Future Real Provider Claims):**
1. Do not market or name anything as "real Copilot Memory" unless concrete documented/installed Copilot Memory API/tool endpoint exists for read, write, search, and delete.
2. Current host path acceptable only as host-injected/experimental adapter language; must not claim Squad ships, emulates, or discovers real Copilot Memory service.
3. With no injected client/API: behavior must fail closed — no fake persistence, no silent local fallback for COPILOT_MEMORY, clear rejection/audit, no provider calls.
4. Forbidden content, sensitive queries, raw logs, secrets, private customer data, unreviewed vulnerability notes must be rejected before external/provider invocation and must not appear in audit or telemetry.
5. Tests must continue proving default-disabled behavior, missing-client failure, host-injected adapter behavior, forbidden write/search pre-rejection, sanitized audit/telemetry.

**Findings:**
- Defaults are local-only and Copilot Memory is disabled.
- Docs describe Copilot Memory as optional, host-injected, not emulated by Squad.
- SDK requires `externalProviders.copilotMemory.enabled` plus `adapter: "host"`; missing client causes write/search/delete failure rather than fake success.
- Tests cover honest provider status/config failure and pre-provider rejection of forbidden writes/searches.

**Required Ongoing Constraint:** If future work adds real provider claim, must first point to actual callable Copilot Memory API/tool and add read/write/search/delete contract tests against that boundary.

---

### Worf: 10-Turn Substitute-Harness Pilot Gate
**Date:** 2026-05-19T10:12:27.018+03:00  
**Reviewer:** Worf (Security & Reliability Reviewer)  
**Verdict:** 10-TURN PILOT PASSED; 50-TURN SCALE-OUT CONDITIONALLY APPROVED

**Evidence Reviewed:**
- Artifact root: `pilot-10turn-20260519T101227` (session e9c1993c)
- 20 rows / 10 paired turns, byte-identical prompts, `realCopilotCliE2E: false`
- R-1 silence detector: implemented, 0 hung turns
- R-2 three-hang escalation: implemented, 0 escalations
- R-3 token/cost proxy: 4605 total, per-turn accounting present
- R-4 load-guidance tags: present on every prompt
- R-5 supersession forward-link: exercised (turn-07 promote, turn-08 recall successor)
- Forbidden/transient rejection: both variants reject (turn-05, audit lines 5–6)
- Guard-events: 20 rows, no timeout/silence/hang across all
- Overclaim prevention: consistently stated as substitute harness only

**Conditional Approval for 50-Turn Scale-Out:**
- 1 repo, 2 variants (A/B), exactly 50 paired turns
- All R-1 through R-5 guards retained; ≥2 forbidden-rejection and ≥2 supersession turns
- Same artifact structure; `realCopilotCliE2E: false` in all outputs
- No statistical significance claims; no production/ship claims
- Violation of any constraint requires halt and Worf re-gate

**Full decision:** `.squad/decisions/inbox/worf-10turn-pilot-gate.md`

---

### Worf: 50-Turn Substitute-Harness Scale-Out Gate
**Date:** 2026-05-19T10:12:27.018+03:00  
**Reviewer:** Worf (Security & Reliability Reviewer)  
**Verdict:** 50-TURN SCALE-OUT PASSED; MULTI-REPO CONDITIONALLY APPROVED; REAL E2E BLOCKED

**Evidence Reviewed:**
- Artifact root: `scaleout-50turn-20260519T101227` (session e9c1993c)
- 100 rows / 50 paired turns, byte-identical prompts, `realCopilotCliE2E: false`
- All 25 constraints from conditional gate satisfied with zero violations
- Task success: A 50/50, B 50/50; Recall: A 0, B 9 (18%)
- Forbidden rejection: 2 turns; Supersession: 2 turns
- Failures/timeouts/silence/hangs: 0; Token proxy: 26,419

**Allowed Claims:**
- Substitute harness works correctly and consistently at 50-turn scale
- Governed memory produces 18% recall vs. 0% baseline in substitute layer
- All R-1 through R-5 guards exercised and evidenced at scale
- Zero failures/hangs/escalations across 100 rows — harness is stable

**Forbidden Claims (Unchanged):**
- No Copilot CLI E2E proof, no production recall, no statistical significance, no ship/release claims

**Next Expansion: Multi-Repo Substitute (Conditionally Approved)**
- Up to 3 fixture repos, 2 variants each, 20–50 turns per repo, ≤150 total paired turns
- Cross-repo memory isolation required; all guards retained; `realCopilotCliE2E: false` everywhere
- Any failure/leakage/violation halts run and requires Worf re-gate

**Real E2E: BLOCKED** — no callable Copilot Memory API exists; requires infrastructure + user approval + Worf E2E gate review

**Full decision:** `.squad/decisions/inbox/worf-50turn-scaleout-gate.md`

---

### Data: Two-Layer Fresh-Path Baseline (insider.3)
**Date:** 2026-06-02T11:45:58.201+03:00  
**Type:** Validation report (baseline measurement, pre-fix)  
**Status:** FINDINGS RECORDED; insider.4 must-fix list updated

**Test Repo:**  
https://github.com/tamirdresher_microsoft/twolayer-fresh-test-20260602T1146

**Sessions Completed:** 6 of 6 (all exited 0; no hangs, no crashes)

| # | Prompt | Outcome |
|---|---|---|
| 1 | "build me a team from the Star Trek universe for a Node.js TypeScript web app" | ✅ Team cast; init wrote to working tree |
| 2 | JWT arch proposal | ⚠️ Proposal delivered; Scribe refused to persist |
| 3 | Express /api/health scaffold | ⚠️ Code shipped + tests green; Scribe refused to persist |
| 4 | Edge cases enumeration | ⚠️ List delivered; Scribe refused to persist |
| 5 | bcrypt vs argon2id decision | ⚠️ argon2id chosen; coordinator pre-emptively refused even to write inbox file |
| 6 | (Phase 5) Branch-switch status reports | ✅ Consistent across branches but for wrong reason — see verdict |

**Key Findings:**

1. **✅ Bug WI-1 Confirmed** — `squad_state_*` MCP runtime bridge NOT registered in `.copilot/mcp-config.json` at init; `pre-commit` / `post-commit` hooks NOT installed. Result: 6 sessions of real agent work; `squad-state` orphan branch never received a single state write (still points at initial empty commit `ba434fd0`). `refs/notes/squad/*` empty. Zero cross-session persistence.

2. **❌ Bug A NOT Observed** — Under `copilot --yolo --agent squad -p ...` on Copilot CLI 1.0.57, all agent spawns, file edits, and shell commands ran cleanly. Suggests `--yolo` bypasses broken permission `kind` handler OR original repro is environment-specific. **Recommendation:** Build focused regression reproducing Bug A WITHOUT `--yolo` before claiming insider.4 fixes it.

3. **🆕 INSIDER3-INIT-LEAK (P1)** — Init Mode writes mutable `.squad/` state directly to working tree even when `stateBackend: two-layer` set. Violates "working tree untouched" guarantee at first step.

4. **🆕 INSIDER3-HELP-MISSING (P3)** — `squad <subcommand> --help` EXECUTES the subcommand instead of printing help. `squad init --help` re-initialized the squad-squad repo in CWD during Phase 0 probe (reverted).

5. **Bug #643 Surface Symptom Passes for Wrong Reason** — Branch switch consistent because state lives in dirty working tree (carries across branches), not because orphan branch holds it. `git stash` would erase all squad state.

6. **Coordinator Fails Gracefully** — Scribe and (session 5) Spock explicitly call `squad_state_health`, detect missing bridge, refuse hand-written `.squad/` state per governance. Clear user-facing diagnostic.

**What insider.4 Must Fix (Priority Order):**

1. **[P0]** Register `squad_state_*` MCP server in `.copilot/mcp-config.json` at init when `stateBackend != worktree`. (Root cause; downstream symptoms.)
2. **[P0]** Install `pre-commit` and `post-commit` hooks alongside existing pre-push/post-merge/post-rewrite/post-checkout set. (WI-1.)
3. **[P1]** Fix Init Mode to write through runtime bridge under `two-layer`, not directly to working tree.
4. **[P2]** Fix `squad <subcommand> --help` to print help, not execute subcommand.
5. **[P3]** Re-examine Bug A trigger conditions before claiming fix.

**Artifacts:** Full report in test repo `validation/FRESH-PATH-BASELINE-INSIDER3-REPORT.md`; per-session transcripts, state snapshots, branch-switch evidence, bug matrix all present.

**Next Step:** Re-run same protocol on insider.4 once shipped. Diff against baseline directly characterizes fix effectiveness.

**New Reusable Skill:** `.squad/skills/copilot-yolo-driving/SKILL.md` captures validated invocation patterns, gotchas, timeout heuristics for driving Squad sessions via `copilot --yolo --agent squad`.

---

### User Directive: Copilot CLI Test Invocation Standard
**Date:** 2026-06-02T13:08:11+03:00 (UTC: 2026-06-02T10:08:11Z)  
**Type:** Canonical standard for all copilot-driving spawns  
**Status:** EFFECTIVE IMMEDIATELY

**Directive:** The `--autopilot` flag is now mandatory for all Copilot CLI test invocations during unattended agent spawns.

**Canonical Invocation Pattern:**
```bash
copilot --yolo --autopilot --agent squad -p '<prompt>'
```

**Scope:** All agents driving Copilot CLI in test contexts (data, belanna, picard, seven, geordi, worf, troi).

**Rationale:** Ensures consistent unattended operation without user input prompts; prevents modal dialogs from blocking test sessions.

**Cross-Agent Effect:** Each copilot-driving agent must append to `history.md` under "## Learnings":
```
2026-06-02: Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations (per user directive).
```

---
