# Squad v0.12 implementation feasibility and measurement study

**Date:** 2026-07-12  
**Repository:** `tamirdresher/squad`  
**Baseline:** upstream default branch `main` at `25eae44b` (`v0.11.0`)  
**Experiment:** off by default; no defaults changed; no upstream issue or PR filed

## Executive verdict

| Recommendation | Verdict | Evidence / required change |
|---|---|---|
| Selective spawn-time retrieval + provenance | **Feasible for v0.12** | Real lifecycle prototype, 84.96% retrieval-input reduction and 24.26% system-prompt reduction in the measured case. Reword the claim: current runtime accepts optional full decisions but does not inject full agent history by default. |
| Coordinator prompt externalisation | **Feasible, validation estimate must increase** | Static split reduces the 76,930-byte template by 28,812 bytes (37.45%) while retaining six core contract markers. This is not model-mode correctness evidence; runtime A/B coverage is still required. |
| Class-aware `nap` phase 1 | **Feasible for v0.12** | One-file prototype protects `class: POLICY` and `loadGuidance: [ALWAYS]` entries from age- and size-based archival. |
| GitHub-native governance baseline | **Mostly already present; narrow the PR** | The repository already has 20 workflows, `CODEOWNERS`, PR requirements, CI policy gates, label enforcement, readiness, scope checks, and PR nudges. A v0.12 PR should audit/consolidate gaps rather than introduce a second governance system. |
| `AGENTS.md` / `SKILL.md` integrity and provenance lint | **Split the recommendation** | There is no `AGENTS.md`. `SKILL.md` sync has byte-parity coverage for one template tree but no checksums/provenance and a 26-source/19-manifest mismatch. Ship SKILL integrity first; define AGENTS ownership before linting it. |
| Memory API unification | **Keep in v0.13** | Memory governance, Squad state, state backends, history/decision I/O, and MCP tools remain separate public/write paths. Unification is larger than a v0.12 safety change. |
| Runtime tiered memory | **Wait for evidence** | No `contextTier`/`context_tier` runtime symbol exists. Tiered memory currently ships as guidance/docs, not a runtime tier selector. |

## Baseline drift from the July 10–12 report

The local fork's `origin/main` was at `ffcd4399` and two commits behind upstream `main`. The study rebased its experimental branch onto upstream `25eae44b`, which promoted v0.11.0 and added the agency front-matter tool wildcard. Measurements against the stale fork baseline would have reported v0.10.0 package versions and older dependency surfaces.

Current versions and constraints:

- Root, CLI, and SDK packages: `0.11.0`.
- Node engine: `>=22.5.0`.
- `@github/copilot-sdk`: `^1.0.4`.
- TypeScript: `^6.0.3`; Vitest: `^4.1.9`.
- CLI dependency on SDK: `"*"`, with a root workspace override to the local SDK.

The report assumption that agents load full decisions and full history on every spawn is not true in the current runtime:

- `packages/squad-sdk/src/agents/lifecycle.ts` accepts optional caller-supplied `decisions`; it did not read history before this experiment.
- `packages/squad-sdk/src/agents/charter-compiler.ts` appended full decisions only when supplied.
- `packages/squad-cli/src/cli/shell/spawn.ts` constructs a separate charter plus optional `systemContext` prompt.
- `.squad-templates/squad.agent.md` is the prompt-only coordinator used by agent surfaces, not the SDK lifecycle prompt.

The recommendation should therefore describe selective retrieval as replacing caller-supplied full decision context **and adding bounded relevant history**, not as removing an existing unconditional full-history load.

## Exact implementation points

| Surface | Current implementation | Experiment point |
|---|---|---|
| Prompt-only coordinator | `.squad-templates/squad.agent.md`, mirrored by `scripts/sync-templates.mjs` | `scripts/measure-v012-feasibility.mjs` simulates core/on-demand externalisation. |
| Shell coordinator | `packages/squad-cli/src/cli/shell/coordinator.ts` builds team + routing prompt | Measured separately; no behavior change. |
| SDK agent prompt | `packages/squad-sdk/src/agents/charter-compiler.ts` | Adds a distinct `## Retrieved Context` section. |
| Spawn lifecycle | `packages/squad-sdk/src/agents/lifecycle.ts` | Explicit `selectiveRetrieval.enabled` gate reads decisions/history, injects selection, and appends JSONL. |
| Retrieval algorithm | New `packages/squad-sdk/src/agents/selective-retrieval.ts` | Deterministic heading chunks, lexical overlap, stable SHA-256 IDs, item and byte bounds. |
| Decision compaction | `packages/squad-cli/src/cli/core/nap.ts` | Protects POLICY/ALWAYS entries from archival. |
| State writes | `packages/squad-sdk/src/state/`, `state-backend.ts`, `tools/index.ts`, CLI `state-mcp.ts` | Inspected only; no unification. |
| Governed memory writes | `packages/squad-sdk/src/memory/index.ts` | Inspected only; POLICY/DECISION map to `ALWAYS`. |
| Template manifest | `packages/squad-cli/src/cli/core/templates.ts`; SDK curated list in `config/init.ts` | Inspected only. |

## Measurements

Machine-readable data:

- `docs/measurements/squad-v012-feasibility-2026-07.json`
- `docs/measurements/squad-v012-context-injection-2026-07.jsonl`
- `docs/measurements/squad-v012-validation-2026-07.json`

### Prompt and retrieval bytes

| Metric | Baseline | Treatment | Delta |
|---|---:|---:|---:|
| Prompt-only coordinator template | 76,930 B | 48,118 B core | -28,812 B (-37.45%) |
| Externalized on-demand coordinator content | — | 29,715 B | — |
| Shell coordinator prompt | 8,886 B | unchanged | 0 |
| Decision input | 12,151 B | lexical source | — |
| Agent history input | 33,933 B | lexical source | — |
| Retrieved injection | 46,084 B available | 6,933 B selected | -39,151 B (-84.96%) |
| Measured agent system prompt | 21,517 B | 16,298 B | -5,219 B (-24.26%) |

The agent-prompt comparison is intentionally conservative: baseline contains the current full decision injection but no history, while treatment contains selected decisions **and** selected history. Six stable content-hash IDs were selected. The JSONL record contains byte counts, query hash, selected IDs, limits, and system-prompt bytes; it contains no source text. The JSON report also records the Git commit, dirty-tree state, and a SHA-256 over measurement code and inputs.

### Coordinator split limitations

The simulation externalizes operational reference sections such as personal squads, issue lifecycle, worktree reference, ceremonies, plugin marketplace, casting, Rai, and fact-checker guidance. It retains these contract markers in the core:

- coordinator identity;
- directive capture;
- memory governance tools;
- routing;
- agent spawn instructions;
- reviewer rejection lockout.

Static marker and byte checks cannot establish routing, mode-selection, or tool-use correctness. A production PR needs prompt-contract tests plus real CLI/VS Code/App A/B scenarios before claiming behavioral parity.

## `nap` class protection

Baseline `nap` used file size, heading count, and age only:

- histories over 15 KB keep five entries (three in deep mode);
- decisions over 20 KB archive entries older than 30 days, then use a count-based fallback;
- logs older than seven days are deleted.

The prototype marks a decision entry protected when it contains either `class: POLICY` or `loadGuidance: [ALWAYS]`. Protected entries remain in `decisions.md` during both age and count fallback compaction. This is feasible as phase 1, but production should replace regex recognition with typed decision metadata once the memory/state API direction is settled.

## State and memory write-path findings

There is no unified memory API today:

- `SquadState` and state backends own mutable team state.
- Decision and history serializers live under `packages/squad-sdk/src/state/io/`.
- Governed memory writes local, decision-inbox, policy-inbox, semantic-inbox, index, audit, and tombstone artifacts under `.squad/memory/`.
- `state-mcp` exposes state and governed-memory tools through `ToolRegistry`.
- CLI memory commands and shell memory commands are additional callers.

This supports deferring unification to v0.13. The v0.12 retrieval PR should consume these paths without renaming or merging them.

## Published-package `state-mcp` reproduction

### Observed facts

1. Fresh `@bradygaster/squad-cli@0.11.0` + `@bradygaster/squad-sdk@0.11.0` installation starts `state-mcp`; the SDK package exports `addSquadStateGitignoreBlock`.
2. Forcing CLI `0.11.0` with SDK `0.10.0` reproduces the reported startup failure:

   `SyntaxError: The requested module '@bradygaster/squad-sdk' does not provide an export named 'addSquadStateGitignoreBlock'`

3. The stack points to the published CLI's `dist/cli/commands/migrate-backend.js`, even when launching `state-mcp`.
4. Published CLI 0.11.0 declares the SDK range as `"*"`. The source workspace masks skew through a local file dependency/override.

### Inferred root cause

Version skew permits CLI 0.11.0 to run against an SDK lacking the named export, and eager CLI command-module loading evaluates the unrelated migrate-backend import during `state-mcp` startup. This study does not fix or file the issue.

## Template and integrity findings

- CLI `TEMPLATE_MANIFEST`: 57 entries, 53 overwrite-on-upgrade, four user-owned.
- Manifest skills: 19.
- Canonical `.squad/skills` directories: 26.
- `sync-skill-templates.mjs` recursively copies all 26 skills to package templates but does not delete stale destinations or emit hashes/provenance.
- `test/template-sync.test.ts` provides byte parity for `.squad-templates` mirrors, not a provenance manifest for `.squad/skills`.
- No `AGENTS.md` exists.

Feasible v0.12 scope: generate a deterministic SKILL manifest containing source path, destination path, SHA-256, and source revision; lint package/install copies against it. Do not claim AGENTS integrity until an AGENTS source-of-truth and install policy exist.

## GitHub-native governance baseline

The repository already has 20 workflow files and substantive native controls:

- CI build/test and consolidated policy gates;
- changelog/changeset enforcement;
- source-tree and large-deletion guards;
- scope boundary checks;
- PR readiness and stale-PR nudges;
- label synchronization/enforcement and issue assignment;
- broad repository `CODEOWNERS`;
- versioned `.github/PR_REQUIREMENTS.md`.

Gaps are narrower than the original recommendation implies:

- no `.github/ISSUE_TEMPLATE` directory;
- `CODEOWNERS` is repository-wide rather than risk/surface-specific;
- PR requirements document acknowledges manual enforcement gaps;
- branch protection/settings are not represented by repository files.

A governance PR is feasible only as a gap audit and targeted hardening PR. Duplicating existing policy workflows is not recommended.

## Validation

| Phase | Command | Result |
|---|---|---|
| Baseline | `npm ci --no-audit --no-fund` | pass |
| Baseline | `npm run build` | pass |
| Baseline | `npm run lint` | pass |
| Baseline | `npm run lint:eslint` | pass, 2,028 existing warnings |
| Baseline | focused serial suite | 386/386 pass |
| Baseline | full `npm test` | 6,818/7,042 pass; 116 failures |
| Treatment | focused serial suite + new tests | 397/397 pass |
| Treatment | full `npm test` | 6,844/7,053 pass; 101 failures |
| Treatment | `npm run lint` | pass |
| Treatment | `npm run lint:eslint -- --quiet` | pass |

The full Windows suite is not a clean release signal in this checkout. Eleven failing files were shared between runs; six baseline failing files passed in treatment; one unrelated consult file newly failed. No new experiment test failed. The dominant repeated failures include Windows storage/symlink behavior and concurrent filesystem tests. Focused source, lifecycle, memory, `nap`, template, and `state-mcp` tests pass serially. No stable treatment regression was localized.

## Proposed PR slices and effort

The request did not include numeric estimates from the earlier report, so the ranges below are implementation estimates derived from this checkout.

| PR | Files / work | Estimate | Feasible? |
|---|---|---:|---|
| Selective retrieval + instrumentation | SDK retrieval module, lifecycle gate, prompt section, tests, JSONL schema, docs | 3–5 engineering days | **Yes** |
| Coordinator externalisation | Split canonical template, loader/reference contract, sync/manifest updates, prompt tests, cross-client A/B | 4–7 days | **Yes, but not as a byte-only 1–2 day change** |
| Class-aware `nap` phase 1 | Typed/protected entry recognition, archive invariants, tests | 1–2 days | **Yes** |
| GitHub governance gap baseline | Audit existing workflows, targeted CODEOWNERS/templates/settings documentation | 1–3 days | **Yes, narrowed** |
| SKILL integrity/provenance lint | Generated hash manifest, sync deletion policy, CI lint, install/upgrade tests | 2–4 days | **Yes** |
| AGENTS integrity | Define source, ownership, install and upgrade semantics first | 2–4 days after design | **Not ready as a combined lint PR** |

## Compatibility risks and rollback

Selective retrieval risks lexical false negatives, heading-format sensitivity, prompt-order changes, and recording-path failures. Production should fail the spawn if an explicitly requested instrumentation write fails, as this prototype does, rather than silently claiming measurement coverage.

`nap` protection is additive and can leave decisions above the size threshold when protected content dominates. That is preferable to deleting policy, but should be reported in the action summary.

Coordinator externalisation risks client-specific lazy-loading differences and lost cross-section dependencies. Rollback is straightforward: keep the current canonical prompt and disable the loader. The retrieval rollback is also direct: omit `selectiveRetrieval` or set `enabled: false`; the baseline path remains unchanged.

## Final recommendation changes

1. Ship selective retrieval in v0.12 only behind an explicit feature flag, with provenance and content-free telemetry.
2. Describe the benefit accurately: replace optional full decisions and add selected history; do not claim removal of unconditional full-history injection.
3. Ship class-aware `nap` protection, but keep typed metadata integration for the memory API follow-up.
4. Treat coordinator externalisation as a separate PR with a larger validation estimate and no model-correctness claim until live A/B evidence exists.
5. Narrow governance work to existing-gap hardening.
6. Split SKILL provenance lint from AGENTS policy.
7. Keep memory API unification in v0.13 and runtime tiering evidence-gated.
