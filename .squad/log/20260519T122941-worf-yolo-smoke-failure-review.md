# Worf History: YOLO Smoke Failure Review

**Timestamp:** 2026-05-19T12:29:41+03:00
**Run:** `real-cli-smoke-20260519T134008`
**Decision:** `.squad/decisions/inbox/worf-yolo-smoke-failure-gate.md`

## Event

Data executed Phase 1 smoke under `worf-yolo-worktree-real-e2e-gate.md`. CLI launched once with `copilot --yolo -p "<prompt>"` against tsyringe worktree. CLI succeeded (37s, exit 0, correct answer). Harness crashed: PowerShell runspace exception in async output capture. Push remote not stripped (guard violation, no actual push occurred). No rows/manifest produced.

## Worf Actions

1. Classified as **harness rejection** (not gate failure, not CLI failure).
2. Confirmed **no safety incident** — no secrets leaked, no push executed, worktree boundary held.
3. **Rejected** Data's harness artifact under reviewer-protocol. Data locked out.
4. **Assigned Geordi** as revision owner for three harness fixes: (H-1) replace runspace-based output capture, (H-2) add push-remote stripping with fail-fast verification, (H-3) produce minimal manifest on crash.
5. **Conditionally approved** one retry after Geordi's fixes + Worf re-acknowledgment.
6. Defined allowed/forbidden claims: CLI invocation form confirmed working; no E2E, Phase 2, or structured-evidence claims permitted.

## Gate Chain

1. `worf-real-copilot-cli-e2e-gate.md` — Phase 1 smoke FAILED (`too many arguments`)
2. `worf-yolo-worktree-real-e2e-gate.md` — Revised gate, approved `--yolo` + worktree isolation
3. `data-yolo-worktree-real-e2e-smoke-results.md` — Execution result: FAIL/BLOCKED
4. **`worf-yolo-smoke-failure-gate.md`** — This review: harness rejected, Geordi assigned
5. `worf-real-cli-phase2-gate.md` — Phase 2a conditionally approved; Phase 2b blocked on G-1–G-7
6. `worf-real-cli-phase2a-stop-gate.md` — Phase 2a FAILED (3 silence hangs); one retry approved
7. **`worf-real-cli-phase2a-retry-verdict.md`** — Phase 2a retry PASS: 10/10 turns, 100% parseability, 100% memory recall, all guards held. Phase 2b conditionally approved (G-5 + scoped re-ack required). Filed 2026-05-19T15:15:47.992+03:00.
