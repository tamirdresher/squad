# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad CLI/SDK, GitHub Copilot agent workflows, TypeScript/Node.js, prompt/runtime templates, client compatibility, agent orchestration
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Data is the explicit Squad framework expert for this team. Data should learn from `C:\Users\tamirdresher\source\repos\squad`, including the Brady Squad repo's SDK/CLI design, governance files, prompt templates, and existing team decisions.

## Learnings

- The `squad` repo's team uses Mission Control roles such as Flight, CAPCOM, CONTROL, FIDO, and others. This project uses Star Trek names, but Data owns equivalent Squad SDK/CLI expertise here.
- Squad framework work should preserve strict routing discipline: the coordinator routes; specialists build and review.

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
- Wrote readiness/blocker note to `.squad/decisions/inbox/data-real-repo-validation-readiness.md`; Worf must reopen Tier 2 real-repo substitute validation before execution.

## 2026-05-19T12:29:41.573+03:00 — Real Copilot CLI E2E readiness harness

- Prepared but did not execute a real Copilot CLI E2E harness under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\real-copilot-cli-e2e-20260519T122941\`.
- Included manifest/result schemas, runbook, Worf gate placeholder, command allowlist placeholders, timeout/silence/three-hang escalation, redaction policy, quota/cost proxy logging, and honest `realCopilotCliE2E` semantics.
- Runner uses git-tracked real repo snapshots only and removes `.github\workflows` before any prompt execution; it refuses execution if workflows remain.
- Minimal smoke and multi-repo plans are prepared but blocked pending Worf's explicit real CLI E2E gate.

## 2026-05-19T13:22:13.782+03:00 — Real Copilot CLI E2E smoke blocked

- Ran the Worf-approved smoke via the prepared artifact runner under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\real-copilot-cli-e2e-20260519T122941\` with `-Plan smoke -WorfGateApproved -MaxTurns 2`.
- Final run id: `real-cli-smoke-20260519T132057`; artifact root: `real-cli-runs\real-cli-smoke-20260519T132057`.
- Result: fail/blocked. Standalone `copilot` was launched for the two smoke turns, but both returned CLI argument parse errors before any successful prompt answer; `realCopilotCliE2E` remains `false`.
- Guards held: no `gh copilot`, no fixture code/workflows, `.github\workflows` absent in snapshot, 120s timeout/60s silence controls, no auth prompt, no timeout/hang, no sentinel-only answer, no secrets in committed report.
- Filed report: `.squad\decisions\inbox\data-real-copilot-cli-e2e-smoke-results.md`. Full E2E remains blocked pending runner Windows argument-passing fix and re-gate/re-run.

## 2026-05-19T12:29:41.573+03:00 — Standalone yolo/worktree real E2E readiness

- Prepared but did not execute the real Copilot CLI E2E harness update under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\real-copilot-cli-e2e-20260519T122941`.
- Patched the runner to use standalone `copilot` with prompt passed as one `-p` argument via `ProcessStartInfo.ArgumentList`; removed the prior shell-joined command path that caused `too many arguments`.
- Added `--yolo` only behind the new Worf gate plus `-YoloGateApproved`; reset the checked-in gate placeholder to blocked because the prior smoke gate is insufficient.
- Switched from copied snapshots to isolated per-run git worktrees, with `.github\workflows` removed before any prompt/test and source working-tree status hashed before/after setup.
- Added per-repo allowed test command config and runner enforcement requiring `testsApproved`, exact `approvedTestCommandIds`, and `-RunAllowedTests`; retained timeout/silence/hang escalation, redaction, quota proxy, and transcript boundaries.
- Wrote readiness note to `.squad\decisions\inbox\data-yolo-worktree-e2e-readiness.md`; blockers remain Worf's new exact yolo/worktree gate and optional test-command approval.



## 2026-05-19T12:29:41.573+03:00 — YOLO worktree real Copilot CLI smoke failed

- Ran the requested Worf-approved Phase 1 smoke command under `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\real-copilot-cli-e2e-20260519T122941` after aligning the session-state gate/plan to the coordinator's tsyringe-only approval.
- Final run id: `real-cli-smoke-20260519T134008`; artifact path: `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\real-copilot-cli-e2e-20260519T122941\real-cli-runs\real-cli-smoke-20260519T134008`.
- Result: fail/blocked. One standalone `copilot --yolo -p <prompt>` launch was attempted, then the harness crashed in its PowerShell async output handler before row/manifest creation; Turn 2 and tests were not reached.
- Guards: max-turn stop held, workflows absent, no `.env` found, pinned SHA held; push remote stripping failed and must be fixed before re-run.
- Filed summary report: `.squad\decisions\inbox\data-yolo-worktree-real-e2e-smoke-results.md`; raw transcripts were not copied into `.squad`.



## 2026-05-19T12:29:41.573+03:00 — Real Copilot CLI Phase 2 execution readiness

- Assessed Worf's Phase 1 smoke pass verdict, Geordi's final retry evidence, Data's yolo/worktree readiness note, and the fixed session-state harness artifact.
- Did not revise the harness and did not execute Phase 2; Worf acknowledgement of a Phase 2 test plan remains a hard precondition.
- Found the runner code has Phase 2-shaped knobs (`-Plan multirepo`, `-MaxTurns`, `-TurnIds`, exact `-TurnTimeoutSeconds 300`, `-RunAllowedTests`) but the current artifact is still smoke-shaped: gate approves only smoke/max 2, runtime repo config contains only `tsyringe`, and multirepo prompts are only three read-only turns.
- Concluded full Worf-defined Phase 2 needs harness/config/reporting work for repo matrix setup, memory recall differential, parseability aggregation, guard rollup, tests, and non-tsyringe dependency setup. Filed `.squad\decisions\inbox\data-real-cli-phase2-execution-readiness.md`.

## 2026-05-19T16:51:27.328+03:00 — ADC runner demo status verification

- Verified `C:\Users\tamirdresher\source\repos\adc-squad-runner-demo` after `git fetch origin --prune`: `main` equals `origin/main` with ahead/behind `0 0`, but the eight requested files remain unstaged local modifications.
- Reviewed README/docs against implementation and fixed a small documentation truth gap: README plus Azure Function runner docs now list all Program.cs ADC auth sources (`ADC_API_KEY`, `ADC_TOKEN`, `ADC_GITHUB_TOKEN`, `GITHUB_TOKEN`, `GH_TOKEN`) and document trusted `/squad/runner-command.json` fallback ownership/mode requirements.
- Local validation passed after the documentation correction: `node .\sandbox\validate-runner.js` and `dotnet test .\adc-squad-runner-demo.slnx --verbosity quiet` both exited successfully.

## 2026-05-19T15:15:47.992+03:00 — Copilot CLI session-store isolation investigation

- Investigated Phase 2b G-5 session-store isolation without running real Copilot prompts or modifying the rejected harness.
- Found supported `COPILOT_HOME` override for the entire Copilot CLI config/state root; docs and installed bundle path facts indicate `session-state\` and `session-store.db` live under that root.
- Found `COPILOT_CACHE_HOME` for cache isolation only; ruled out a dedicated session-store flag, cwd scoping, `--name`/`--resume`, `--log-dir`, and `memory=false` as sufficient isolation fixes.
- Filed `.squad\decisions\inbox\data-session-store-isolation-investigation.md` recommending per-repo/per-run `COPILOT_HOME` plus Worf-reviewed no-prompt/static and synthetic SQLite partition self-tests before real E2E resumes.

---

## 2026-05-19T15:12:10Z — Orchestration Log: Session-Store Isolation Investigation

**Cross-Agent Sync:** Scribe recorded orchestration summary of Data's session-store isolation research and COPILOT_HOME confirmation.

**Work Completed:**
- Investigated session-store isolation mechanisms and patterns
- Confirmed COPILOT_HOME as durable, supported isolation mechanism
- Analysis informs portfolio isolation strategy
- Investigation complete; findings documented for future reference

**Portfolio Impact:** Data's research confirms Geordi's COPILOT_HOME implementation is the correct approach. Per-repo isolation via COPILOT_HOME enables Seven's realistic real-repo validation portfolio.

**Status:** Research complete. Portfolio deployment awaits Tamir decision on Tier-1 GO/DEFER/REDIRECT.

**Orchestration log:** .squad/orchestration-log/20260519T151210Z-data.md

