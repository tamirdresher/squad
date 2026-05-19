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
