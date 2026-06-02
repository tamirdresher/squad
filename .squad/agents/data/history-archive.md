# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad CLI/SDK, GitHub Copilot agent workflows, TypeScript/Node.js, prompt/runtime templates, client compatibility, agent orchestration
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Data is the explicit Squad framework expert for this team. Data should learn from `C:\Users\tamirdresher\source\repos\squad`, including the Brady Squad repo's SDK/CLI design, governance files, prompt templates, and existing team decisions.

## 2026-05-31T14:09:11Z — State-backend insider.2→insider.3 triage

**Baseline clarification:** Tag `v0.9.6-insider.2` does not exist in the Squad repo. Only `v0.9.6-insider.3` is tagged (on `origin/feature/coordinator-as-agent`, commit `ce326d56`). Triage used `v0.9.4` as the prior stable baseline.

**Key code locations (insider.3):**
- State backend implementations: `packages/squad-sdk/src/state-backend.ts` (all 4 backends + adapter)
- CLI permission handler: `packages/squad-cli/src/cli/shell/index.ts` (`approveAllPermissions`)
- MCP state command: `packages/squad-cli/src/cli/commands/state-mcp.ts`
- Upgrade flow (reads config.json): `packages/squad-cli/src/cli/core/upgrade.ts`

**StateBackendType rename (v0.9.4 → insider.3):**
- `'worktree'` → `'local'` (WorktreeBackend.name also changed)
- `'git-notes'` removed as standalone type; migrated to `'two-layer'` via `normalizeBackendType()`
- `'two-layer'` added (orphan permanent + git-notes best-effort annotation layer)
- Migration is transparent via `normalizeBackendType()` in `resolveStateBackend()`, but users whose config says `"git-notes"` now silently get orphan branch creation — a significant behavioral side-effect
- `isValidBackendType()` accepts legacy values, so parse-time validation passes

**TwoLayerBackend architecture:** Orphan branch is the permanent read store; git notes are a best-effort commit-scoped annotation. `write/delete/append` all try orphan first (hard), then notes (swallowed catch). `read/list/exists` go to orphan only. `promote_to_permanent` concept: Ralph moves notes to orphan after PR merge.

**GitNotesBackend anchor change:** Old code wrote notes on `HEAD` (lost on branch switch). New code uses `rev-list --max-parents=0 HEAD` (root commit as stable anchor). Caveat: per-instance `cachedAnchor` — if a new instance is created mid-session after HEAD changed, it still uses the cached root commit from that instance. Nondeterministic on repos with multiple root commits (unrelated histories merge).

**P0 bug — permission contract broken (not in insider.3, fix in branch `squad/1191-fix-cli-permission-contract`):**
- `approveAllPermissions` returns `{ kind: 'approved' }` at insider.3
- Copilot CLI v1.0.54+ changed the contract to require `{ kind: 'approve-once' }`
- All spawned agent operations (including state writes) hang or fail on v1.0.54+
- Single-character fix: `'approved'` → `'approve-once'` in `shell/index.ts`

**P1 bug — `resolveStateBackend` throws on explicit backend failure:**
- At insider.3, if `stateBackend` is explicitly set to `'orphan'` or `'two-layer'` in config.json AND the backend init fails (not a git repo, or `requireGitRepository` throws), the code rethrows instead of falling back to `'local'`
- Fix in `bradygaster/squad-p1-coordinator-bugs`: removes the `explicitBackend` throw logic and `requireGitRepository()` entirely

**P2 bugs (not yet merged at insider.3):**
- Externalized state path resolution broken: `origin/squad/949-fix-externalized-state-paths` not merged
- State backend hardening (retry + circuit-breaker): `origin/squad/864-state-backend-hardening` not merged
- Coordinator template still documents `"worktree"` and `"git-notes"` as valid config values (stale docs — fixed in p1 branch)

**`StateBackendStorageAdapter.toRelative()` Windows edge case:** Strips `squadDir` prefix using `path.normalize().slice(normalizedBase.length + 1)` then converts slashes. If absolute path has a different-case drive letter or UNC form, normalization may produce a non-matching prefix and leak an absolute path into the orphan/notes backend, corrupting git notes refs.

**Cross-Agent Note (2026-05-31T14:03:06.842+03:00):**
Seven independently identified the same P0 permission contract blocker via community issue research (#1191). Her findings corroborate this analysis and validate the urgency of the fix. Seven also mapped 5 dominant problem themes from GitHub issues; Data's bug taxonomy aligns with all 5 themes. Both agents recommend immediate prioritization of the one-line permission contract fix before any further insider.3 user testing.

**Relevant in-flight branches:**
- `origin/bradygaster/squad-p1-coordinator-bugs` — P1 coordinator + state bugs; also adds State & Team Root Resolution section to coordinator template
- `origin/squad/1191-fix-cli-permission-contract` — permission contract one-liner fix
- `origin/copilot/bug-squad-cli-permission-issues` — same permission fix (different branch)
- `origin/squad/864-state-backend-hardening` — retry + circuit-breaker (not merged)
- `origin/squad/949-fix-externalized-state-paths` — externalized path resolution (not merged)

## Learnings

- The `squad` repo's team uses Mission Control roles such as Flight, CAPCOM, CONTROL, FIDO, and others. This project uses Star Trek names, but Data owns equivalent Squad SDK/CLI expertise here.
- Squad framework work should preserve strict routing discipline: the coordinator routes; specialists build and review.

### 2026-06-02T11:29:11.224+03:00 — Duplicate-PR triage: permission contract P0 (#1192 vs #1193)

**What was found:** Two competing PRs existed for the same one-line P0 fix (`'approved'` → `'approve-once'`). PR #1192 (bradygaster, core maintainer) was minimal (+9/−2), backward-compatible, CI-green, in CLEAN mergeable state, and had active reviewer engagement. PR #1193 (autonomous Copilot bot) was a draft, had zero CI runs (UNSTABLE), and expanded scope to a full type-system rewrite — replacing the `SquadPermissionRequestResult` interface with a discriminated union while dropping three `denied-*` kind values and the `rules?` property, which constitutes a breaking API change beyond P0 scope.

**Winner:** PR #1192. The only gap was the absence of a regression test; #1193 did write a useful one that can be cherry-picked.

**General patterns for resolving duplicate fix PRs:**
1. **Minimal wins over comprehensive at P0.** When a bug is blocking a release, the smallest correct fix that passes CI beats a larger "while we're here" refactor. Scope creep risks introducing new breakage on the critical path.
2. **Core-maintainer authorship matters.** A PR from a repo owner carries implicit merge authority and reviewability; an autonomous bot draft does not.
3. **CI green is a hard gate.** A PR with zero CI runs (regardless of how correct the code looks) cannot be trusted for P0 merge. Always check `mergeStateStatus` and `statusCheckRollup` before recommending.
4. **Backward compat trumps correctness theater.** Adding `'approve-once'` alongside `'approved'` is correct for a P0 fix. Removing `'approved'` and the `denied-*` kinds is a separate semver-major concern that needs its own review cycle.
5. **Cherry-pick the valuable piece from the loser.** When the losing PR has one genuinely good contribution (e.g., a regression test), extract and land it rather than losing it entirely.
6. **Draft status + UNSTABLE is a double disqualifier.** A draft PR signals the author knows it is not ready. UNSTABLE merge state reinforces it. Both flags together mean "do not merge without human escalation."

## Prior Work Summary (2026-05-14–2026-05-18)

**Brady Squad Framework:** TypeScript ESM monorepo with SDK/CLI; Node >=22.5.0; agent spawning loads charters via FSStorageProvider; coordinator is dispatcher, not doer; `.squad/decisions/inbox/` governance; append-only merge rules; resolution worktree-aware + legacy-aware.

**ADC Integration:** ADC event bus (Redis streams) is production-ready; Squad needs fireEventTrigger() SDK + CLI command; separate platform-specific adapter layer; periodic ephemeral sandbox approved as MVP over webhook/long-lived models; Worf guardrails G1–G5 required.

**Governed Memory Boundary (18-May):** Copilot Memory API undocumented; provider=copilot fails closed until real contract exists; hostInjectedCopilotAdapter opt-in only; unsafe content/queries classified BEFORE external calls; audit/telemetry redacted; all eight Worf gates satisfied; tests pass.

**Local Memory E2E Validation (18-May):** Real local-memory A/B against squad-memory-governance fixtures; 20-pair controlled study; slim-context no lift (decisions in prompt), large-context recall 0.000→1.000 (120 distractors); governed policy rejects forbidden writes with audit evidence. Full Copilot CLI + --agent squad smoke-tested non-interactively (inconclusive sentinel). Artifacts: `C:\Users\tamirdresher\.copilot\session-state\memory-ab-20260519T063342\`.


## 2026-05-19T06:33:42.877+03:00 — Local governed memory value A/B experiment

- Built and ran a 20-pair A/B harness against `C:\Users\tamirdresher\source\repos\squad-memory-governance` using real `squad init` plus the actual `LocalMemoryStore`; full repo `npm test` was intentionally avoided.
- Full Copilot CLI + `--agent squad` was smoke-tested non-interactively but returned only `● S`, so the measurable study is a clearly marked direct-layer substitute, not full UI E2E proof.
- Controlled results: slim-context recall had no lift because decisions were in prompt; large-context/compacted recall improved from 0.000 to 1.000 with 120 distractors, and governed policy rejected forbidden/transient writes with audit evidence.
- Raw artifacts: `C:\Users\tamirdresher\.copilot\session-state\memory-ab-20260519T063342\`.

## 2026-05-19T07:11:25.375+03:00 — Expanded Copilot+Squad memory A/B harness design

- Designed a gated larger A/B harness in session artifacts only: `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\`.
- Copilot CLI smoke evidence improved from prior inconclusive sentinel: from cwd, `copilot --agent squad -p ... --share ...` returned the exact sentinel, and `--resume=<session-id>` worked for turn 2.
- Important client-compatibility boundary: PowerShell wrapper rejected `-C` and `--name`; harness must set cwd externally and resume by parsed session id. Share files are per-turn, not full resumed transcripts.
- Feasibility verdict: 50-turn paired sessions are plausible but not yet proven reliable; require 3-turn dry run and 10-turn pilot before scaling. If reliability fails, use the direct Squad CLI/SDK replay path and label it memory-layer evidence only, not Copilot UI proof.

## 2026-05-19T07:55:11.928+03:00 — Expanded memory A/B 3-turn dry run

- Ran only the permitted 3-turn dry-run stage under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\dry-run-3turn-20260519T075511\`; did not run the 10-turn pilot or 50-turn scale-out.
- Used a tiny fixture copied under the session artifact folder; fixture commit `8961ee9d45a3bbf2929808889e46057283936dcc`, tree `fa25d87e390e3ea48712f6a086ca2ac58f6cc051`; removed `.github/workflows` from both variants.
- Included blog-post memory concepts in the prompts and B seed: Tamir's two-layer architecture, with git notes for commit-scoped why and an orphan branch for permanent decisions/history.
- Real Copilot CLI smoke passed for the no-memory orientation turn, but the full paired 3-turn conclusion uses the clearly labeled substitute direct-layer harness; do not treat this as full Copilot UI proof.
- Substitute A/B result: A returned `NOT_IN_CONTEXT` for seeded recall, B recalled the prior n=20 honesty boundary plus the blog two-layer concept, and forbidden/transient memory was rejected without repeating the synthetic secret.
- Worf gate readout: HB-1, HB-2, HB-3, HB-4, HB-5, and HB-7 look evidenced for dry-run review; HB-6 and HB-8 need cost accounting and explicit silence telemetry before any 10-turn pilot.

## 2026-05-19T09:00:04.581+03:00 — Memory load guidance tags and supersession simulation
- Implemented load-guidance semantics in `squad-memory-governance`: `[ALWAYS]` for policy/decision, `[ON-DEMAND]` for retrievable local/semantic entries, `[ARCHIVE]` for superseded/deleted/tombstoned entries, and `[NEVER]` for forbidden/transient rejected memory.
- Fixed promotion supersession metadata so the archived prior entry links forward with `supersededBy` and the active successor records `supersedes`; tombstones preserve previous status and forward-link metadata.
- Added CLI `--load-guidance`, docs, tests, and updated expanded-memory A/B scaffold seed/prompts to carry load-guidance tags.
- Validated with `npm run lint`, targeted Vitest memory/tool tests (59/59), SDK build, CLI build.
- Ran substitute direct-layer simulation only (not Copilot CLI E2E) under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\autonomous-sim-20260519T090004\`; Worf must re-gate before 10-turn pilot or 50-turn scale-out.

## 2026-05-19T10:12:27.018+03:00 — 10-turn substitute-harness pilot

- Implemented and ran the permitted autonomous 10-turn substitute direct-layer A/B pilot under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\pilot-10turn-20260519T101227\`.
- Added harness support for R-1 silence detector, R-2 three-hang escalation, and R-3 per-turn token/cost proxy accounting; R-4 load-guidance tags and R-5 superseded forward-link behavior were exercised in the prompts/results.
- Results: 20 rows / 10 paired turns, byte-identical prompts, overall pass true, A recall 0, B recall 3, forbidden/transient rejection passed, no timeout, no silence hang, no escalation, token proxy total 4605.
- Boundary preserved: substitute memory-layer evidence only; no Copilot CLI E2E claim; 50-turn scale-out still requires Worf re-gate.

## 2026-05-19T10:12:27.018+03:00 — 50-turn substitute-harness scale-out

- Ran Worf-approved single-repo substitute direct-layer A/B scale-out under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\scaleout-50turn-20260519T101227\`.
- Scope/constraints passed: 1 fixture repo, 2 variants, exactly 50 paired turns / 100 rows, byte-identical prompts, `realCopilotCliE2E: false`, no statistical/production/ship/release claims.
- Results: pass=True; A recall=0, B recall=9; task success A=50/50, B=50/50; forbidden rejection turns=2; supersession turns=2; failures=0.
- Guards retained: redaction=True, forbidden rejection=True, workflow disabled=True, timeouts=0, silence hangs=0, hang escalations=0, token proxy total=26419.
- Wrote Worf next-gate input to `.squad/decisions/inbox/data-50turn-scaleout-results.md`.

## 2026-05-19T10:12:27.018+03:00 — Multi-repo substitute-harness scale-out

- Ran Worf-conditionally-approved multi-repo substitute direct-layer A/B scale-out under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\multirepo-scaleout-20260519T101227\`.
- Scope/constraints passed: 3 isolated fixtures/repos, 2 variants each, exactly 150 paired turns / 300 rows, byte-identical prompts within pair, `realCopilotCliE2E: false`, no statistical/production/ship/release claims.
- Results: pass=True; A recall=0, B recall=27; task success A=150/150, B=150/150; forbidden rejection turns=6; supersession turns=6; forward-link recall=3; failures=0.
- Guards retained: redaction=True, forbidden rejection=True, workflow disabled/removed=True, timeouts=0, silence hangs=0, hang escalations=0, token proxy total=106665.
- Wrote Worf next-gate input to `.squad/decisions/inbox/data-multirepo-scaleout-results.md`.

## 2026-05-19T11:58:29.988+03:00 — Real-repo substitute validation readiness

- Read the new user directive, Picard confidence framework, Worf's final multi-repo gate, and prior expanded-memory artifacts.
- Did not run a real-repo substitute batch because Worf's current final decision says substitute evidence ceiling was reached and further substitute expansion is not approved.
- Prepared Worf-gated runnable artifacts under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\real-repo-validation-20260519T115829\`.
- Prepared scope uses isolated copies of `squad-memory-governance` first and optionally `squad`, removes `.github\workflows`, keeps A/B prompts identical, retains all guards, and marks `realCopilotCliE2E: false`.
