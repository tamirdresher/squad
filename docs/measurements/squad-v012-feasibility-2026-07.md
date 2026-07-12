# Squad v0.12 implementation feasibility and measurement study

**Date:** 2026-07-12

**Repository:** `tamirdresher/squad`

**Exact base:** upstream `main` at `25eae44b53bb2842f15bb2cd71c97a0ad7d6e598`

**Fork drift observed:** `origin/main` at `ffcd439980c99cdec038b72b1cca964deeddda46`, two commits behind

**Experiment:** off by default; no default branch changed; no upstream issue or PR filed

## Executive verdict

| Recommendation | Verdict | Evidence / required change |
|---|---|---|
| Selective spawn-time retrieval + provenance | **REJECTED by the frozen confidence gate** | The 4 KiB point estimate passes byte/coverage, but POLICY omissions, secret-shaped system-context leakage, and a pre-existing test regression trigger SC-3, SC-4, and SC-6. |
| Coordinator prompt externalisation | **INSUFFICIENT EVIDENCE; byte gate fails** | The exact-base template split reduces 75,883 B to 47,560 B (37.32%), below the 40% gate. No documented-mode behavior suite was run. |
| Class-aware `nap` phase 1 | **INSUFFICIENT EVIDENCE for the 0.5-day scope** | Current `nap` never reads `.squad/memory/index.json` and does not archive governed memory entries. POLICY/load-guidance metadata has no flow into its decision-markdown parser. The earlier regex prototype was removed. |
| GitHub-native governance baseline | **REJECTED by the frozen gate** | SC-4 affects PR-4, no A-Bypass cases were run, and S = 0.30 crosses the rejection boundary. Existing controls remain factual but do not confirm the proposed PR. |
| `AGENTS.md` / `SKILL.md` integrity and provenance lint | **REJECTED by the frozen gate** | SC-4 affects PR-5, no E4 corpus or reviewer agreement exists, and S = 0.30 crosses the rejection boundary. |
| Memory API unification | **Keep in v0.13** | Scribe still operates through `squad_state_*`, while governed `memory.*` has separate tools and CLI callers. |
| Runtime tiered memory | **Wait for evidence** | No `contextTier` or `context_tier` runtime symbol exists at the exact base. |

## Frozen confidence-gate outcome

The preregistered protocol was applied without changing thresholds:

- protocol SHA-256: `54ea9e2de839e1d70297ccf1f76d4a89b7ea36c5feafdd2f198c0dc5dccc18ff`;
- frozen at `2026-07-12T08:31:00+03:00`;
- exact evidence: `docs/measurements/squad-v012-confidence-gate-2026-07.json`.

**Overall status: HALT / ESCALATE.** The uncapped required-item mean is 0.2421, already below the 0.30 stop cap. The five-PR train is rejected.

| Stop | Result | Exact evidence |
|---|---|---|
| SC-2 documented-mode regression | Not evaluated | No end-to-end Ralph, GitHub-Issues, PRD, MCP, or model-table mode run exists. |
| SC-3 POLICY omission | **Triggered** | 4 KiB/top-6 omitted the synthetic `class: POLICY` / `loadGuidance: ALWAYS` section on four of seven tasks. |
| SC-4 secret leakage | **Triggered** | An ephemeral secret-shaped assignment was selected into system context. The JSON metrics remained content-free and the value was not persisted. |
| SC-5 governance bypass | Not applicable | PR-4 was not implemented; no default branch was changed. |
| SC-6 prototype test regression | **Triggered** | Baseline focused `state-mcp` passed at 5 seconds; treatment focused timed out at the same frozen limit. A 15-second diagnostic pass does not clear the stop. |
| SC-7 injection log gap | Insufficient evidence | Seven synthetic records exist, but no runtime measurement window was run and eight required provenance fields are absent. |
| SC-10 native-only violation | Not triggered | The prototype uses only Node.js built-ins, Markdown, git, and existing Squad/Copilot primitives. |

### Six-axis record

| Item | V | F | E | S | O | G | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| PR-1 retrieval + provenance | 0.90 | 0.50 | 0.00 | 0.00 | 0.50 | 0.00 | **REJECTED** |
| PR-2 coordinator externalisation | 0.90 | 0.50 | 0.00 | 0.50 | 0.50 | 0.00 | **INSUFFICIENT EVIDENCE** |
| PR-3 class-aware compaction | 0.90 | 0.50 | 0.00 | 0.50 | 0.50 | 0.00 | **INSUFFICIENT EVIDENCE** |
| PR-4 governance baseline | 0.90 | 0.50 | 0.00 | 0.00 | 0.50 | 0.00 | **REJECTED** |
| PR-5 integrity lint | 0.90 | 0.50 | 0.00 | 0.00 | 0.50 | 0.00 | **REJECTED** |

Generalizability is zero because all new retrieval outcomes are synthetic. E2 also misses the frozen minimum of 20 tasks per agent across at least three agents, three model repetitions, and a 95% CI. These are evidence deficits, not thresholds to relax. The complete 19-item matrix and uncapped arithmetic mean are in the confidence-gate JSON.

## Claim-by-claim reconciliation

### 1. Coordinator prompt baseline

The reported 86,018 B / 814-line hypothesis does not match `25eae44b`.

| Surface | Exact measurement | Runtime role |
|---|---:|---|
| Git blob `.squad-templates/squad.agent.md` | **75,883 B / 1,047 logical lines** | Prompt-only custom-agent template |
| Git blob `.github/agents/squad.agent.md` | **75,883 B / 1,047 logical lines** | Mirrored custom-agent prompt |
| Windows checkout of the same LF blob | 76,930 B | CRLF adds one byte per newline; not the Git-blob baseline |
| Composed default interactive-shell coordinator prompt | **8,741 B** | Actual system message created by `squad` with no arguments for this base repo |

`packages/squad-cli/src/cli-entry.ts` explicitly maps no arguments to `runShell()`. The shell calls `buildCoordinatorPrompt()` and passes its result to `createSession({ systemMessage })`. Therefore the 75,883-byte custom-agent file is **not** the every-turn system body of the default no-argument CLI shell. It remains relevant to custom-agent surfaces, but the two prompts must not be conflated.

### 2. Full decision concatenation

`compileCharterFull()` appends the complete `decisions` string under `## Relevant Decisions` whenever a caller supplies it. The current call graph is fragmented:

- `packages/squad-sdk/src/agents/lifecycle.ts` accepts optional `decisions` and calls `compileCharterFull()`.
- `packages/squad-sdk/src/coordinator/fan-out.ts` does not call `compileCharterFull()` directly; it receives an injected `compileCharter` dependency.
- `packages/squad-cli/src/cli/shell/spawn.ts` independently builds charter plus optional `systemContext` and does not load decisions/history.

The measurement uses a deterministic **168,550-byte synthetic decision ledger** and **32,768-byte synthetic history**, with no private content. Full decision concatenation produces a 168,830-byte agent system prompt in the synthetic baseline. Current runtime does not unconditionally add full history.

### 3. Selective retrieval proposal

The prototype now matches the proposed operational shape:

- default 4,096-byte budget;
- configurable top 3–8 excerpts;
- deterministic lexical selection over decisions + one agent history;
- provenance line and stable content-hash IDs;
- source-aware overflow markers, including the proposed `[+N more matches — read decisions.md]` for decision-only omissions;
- default log path: `.squad/log/context-injections.jsonl`;
- content-free records with timestamp, agent, task hash, selected IDs, source/injected/system bytes, model, and session.

Seven hand-labeled synthetic tasks were run at three budgets. One task is an intentional negative query; it selects no context at every budget. One relevant section is intentionally too large for the 2 KiB treatment.

| Configuration | Injected range | p50 system-byte reduction | Mean recall | Mean precision | Gate |
|---|---:|---:|---:|---:|---|
| 2 KiB / top 3 | 126–734 B | 99.54% | 85.71% | 66.67% | **FAIL** — 14.29% coverage decrease |
| 4 KiB / top 6 | 126–3,829 B | 99.46% | 100% | 69.05% | Byte/aggregate-coverage point estimate passes; **frozen E2 gate fails SC-3** |
| 8 KiB / top 8 | 126–4,931 B | 99.46% | 100% | 67.86% | Byte/aggregate-coverage point estimate passes; **frozen E2 gate fails SC-3** |

The large percentage is a property of the reported 168,550-byte consumer scale; it must not be generalized to ordinary repositories. Precision is materially below 100%, so lexical retrieval still injects irrelevant matches even when recall is preserved. More importantly, the retriever does not always-load POLICY context: the frozen security invariant fails even where aggregate recall is 100%.

Machine-readable artifacts:

- `docs/measurements/squad-v012-feasibility-2026-07.json`
- `docs/measurements/squad-v012-context-injection-2026-07.jsonl`
- `docs/measurements/squad-v012-validation-2026-07.json`
- `docs/measurements/squad-v012-confidence-gate-2026-07.json`

### 4. Coordinator externalisation

The static split keeps coordinator identity, directive capture, memory governance, routing, spawn instructions, and reviewer lockout in core. It moves personal squads, issue lifecycle, worktrees, ceremonies, marketplace, casting, Rai, and fact-checker guidance on demand.

| Metric | Result |
|---|---:|
| Exact-base template | 75,883 B |
| Simulated core | 47,560 B |
| Externalized sections | 29,226 B |
| Reduction | **28,323 B / 37.32%** |
| Required byte gate | 40% |
| Byte gate | **FAIL** |
| Documented-mode regression suite | Not run |
| Overall gate | **FAIL** |

Static markers and byte counts do not establish routing, mode-selection, or tool-use correctness. The 1–2 day estimate is not credible if zero documented-mode regressions is a hard gate.

### 5. `contextTier`

There is no `contextTier` or `context_tier` implementation in source, templates, or tests at `25eae44b`. The repository has response/model tier logic, but no runtime option that selects a context-window tier, and nothing by that name mutates `agentConfig.prompt`.

The prior claim cannot be verified against this base and should be recorded as **path/version drift**, not as current behavior.

### 6. `nap` phase 1

Baseline `packages/squad-cli/src/cli/core/nap.ts`:

- compresses `agents/*/history.md` over 15 KiB by heading count;
- archives `decisions.md` over 20 KiB by heading date/size;
- prunes old log files;
- merges decision inbox files.

It contains no memory-index, `class`, `POLICY`, or `loadGuidance` read. Governed memory metadata exists in `.squad/memory/index.json`, but `nap` does not archive those entries at all. Therefore “protect memory/index entries from nap archival” is currently a no-op requirement.

If the intended target is decision markdown generated from governed memory, a typed metadata bridge must be designed first. A regex over arbitrary decision body text is not a reliable implementation and was removed from this experiment.

### 7. Memory schism

The “zero non-test callers” claim for `LocalMemoryStore.promote()` is false at the current base. Production callers exist in:

- `packages/squad-sdk/src/tools/index.ts` (`memory.promote`);
- `packages/squad-cli/src/cli/commands/memory.ts` (`squad memory promote`).

The Scribe bypass claim is supported. Active and package Scribe charters perform operational persistence with `squad_state_read`, `squad_state_write`, `squad_state_append`, and `squad_state_delete`; they do not call `memory.classify`, `memory.write`, or `memory.promote`. The coordinator template prefers `memory.write` for directives but explicitly falls back to state tools. Memory governance and operational state therefore remain two partially connected write paths.

### 8. Skills and manifest drift

At `25eae44b`, the old “missing from manifest” claim is false:

- CLI `TEMPLATE_MANIFEST` explicitly includes `tiered-memory`, `iterative-retrieval`, and `reflect`.
- SDK `MANIFEST_SKILL_NAMES` includes all three and contains 19 curated skills.
- Package template directories contain all three.
- `test/init.test.ts` verifies every curated skill is installed.

The apparent drift comes from two canonical roots: ordinary templates are sourced from `.squad-templates`, while skills are sourced from `.squad/skills` and copied by `sync-skill-templates.mjs` into package templates. The three skills are correctly absent from `.squad-templates/skills`; that directory is not their source of truth. A live v0.11 upgrade scaffolding them is consistent with current source.

### 9. Published `state-mcp` failure

Observed evidence must remain separate:

1. The reported `npx -y @bradygaster/squad-cli@latest state-mcp` run failed with the missing `addSquadStateGitignoreBlock` export.
2. This study's fresh matched CLI 0.11.0 + SDK 0.11.0 install started and exported the symbol.
3. Forcing CLI 0.11.0 + SDK 0.10.0 reproduced the exact named-export failure from `migrate-backend.js`.
4. CLI 0.11.0 declares its SDK dependency as `"*"`.
5. The global bundled CLI and `squad doctor` were reported working.

These facts localize the failure to a published-package/API resolution mismatch, but they do not prove whether the direct `npx` observation was caused by cache, registry replication, dependency resolution, or another packaging condition. No fix or upstream issue is included.

### 10. Effort hypotheses

| PR | Earlier hypothesis | Estimate from current code | Reason |
|---|---:|---:|---|
| Selective retrieval + instrumentation | 2–3 days | **4–6 days** | Must unify or cover lifecycle, injected fan-out compiler, and CLI shell spawn; add coverage fixtures, JSONL schema, failure handling, and client compatibility tests. |
| Coordinator externalisation | 1–2 days | **4–7 days** | Current split misses the 40% byte gate and lacks documented-mode A/B tests across custom-agent and shell surfaces. |
| `nap` POLICY guard | 0.5 day | **2–4 days after design**, or no PR | Current nap does not touch governed memory. A typed bridge and precise archival target are prerequisites. |

## Exact implementation points and path drift

| Path | Finding |
|---|---|
| `packages/squad-cli/src/cli/shell/spawn.ts` | Builds charter + optional context only; no decisions/history retrieval. |
| `packages/squad-sdk/src/coordinator/fan-out.ts` | Uses an injected `compileCharter` function; no direct file loads or `compileCharterFull()` call. |
| `packages/squad-sdk/src/agents/lifecycle.ts` | Only concrete current path where optional full decisions reach `compileCharterFull()`; experiment gate is wired here. |
| `.squad-templates/squad.agent.md` | Custom-agent prompt, not default no-argument shell prompt. |
| `packages/squad-cli/src/cli/core/nap.ts` | Decision/history/log maintenance only; no governed memory index flow. |
| `packages/squad-sdk/src/memory/index.ts` | Owns governed classes, load guidance, index, audit, promotion, and providers. |
| `.squad/agents/scribe/charter.md` and package Scribe templates | Operational writes use state tools, bypassing memory classification. |
| `packages/squad-cli/src/cli/core/templates.ts` | Contains the three disputed skills. |
| `packages/squad-sdk/src/config/init.ts` | Curates the same skills through `MANIFEST_SKILL_NAMES`. |

## GitHub-native governance baseline

The repository already has 20 workflow files and substantive native controls:

- CI build/test and consolidated policy gates;
- changeset enforcement;
- source-tree and large-deletion guards;
- scope boundary checks;
- PR readiness and stale-PR nudges;
- label synchronization/enforcement and issue assignment;
- repository `CODEOWNERS`;
- versioned `.github/PR_REQUIREMENTS.md`.

Gaps are narrower than the original recommendation implies: there is no issue-template directory, `CODEOWNERS` is broad rather than surface-specific, some requirements remain manual, and branch settings are not represented in files. A v0.12 governance PR should be a targeted gap audit, not a second policy framework.

## Validation

The baseline Windows checkout is not green. Build, TypeScript lint, ESLint, and focused serial tests pass, while the full parallel suite has unstable filesystem, timing, and subprocess failures. The experiment's focused tests pass; no experiment failure was found in the full-suite comparisons. Exact command results are retained in `squad-v012-validation-2026-07.json`.

## Compatibility and rollback

Selective retrieval is disabled unless `selectiveRetrieval.enabled` is true. Disabled lifecycle behavior remains unchanged. The experiment supports modern `.squad` and legacy `.ai-team` state roots and deterministic Unicode tokens.

Risks include lexical false positives, heading-format sensitivity, divergent spawn paths, write failures after session creation, and telemetry schema compatibility. The prototype closes a newly created session if instrumentation fails.

Rollback is direct: omit `selectiveRetrieval` or set `enabled: false`. Coordinator externalisation remains simulation-only. No `nap` behavior change remains.

## Final recommendation changes

1. **Do not confirm PR-1 or the five-PR v0.12 train.** SC-3, SC-4, and SC-6 require rejection and owner escalation.
2. Treat 4 KiB/top 6 only as a promising point estimate, not an evidence-backed ship default.
3. Add unconditional POLICY/ALWAYS retrieval, secret filtering before prompt injection, and complete provenance fields before a new preregistered pass.
4. Do not claim the 75,883-byte custom-agent template is the default CLI shell system body.
5. Do not ship coordinator externalisation under the stated gate; it reaches only 37.32% and has no mode-regression evidence.
6. Return the half-day `nap` guard to design/evidence gathering until the target and metadata flow are defined; do not approve or reject it on this pass.
7. Keep memory API unification in v0.13 and runtime tiering evidence-gated.
