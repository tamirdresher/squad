# SMOKE-ITER6 — travel-assistant (fresh-init-clean half)

- **Date:** 2026-06-03
- **Tarball version verified:** `0.9.6-preview.12` (`squad --version` → `0.9.6-preview.12`)
- **Bundle commits:** `9b5f377b` + `f25e400e` on PR #1200
- **Repo:** https://github.com/tamirdresher/travel-assistant (test-duplicate, `main`)
- **Prior baseline:** `SMOKE-ITER5-travel-assistant.md` (data-28, iter-5 `0.9.6-preview.11`)
- **Sibling:** tamir-squad-hq (parallel, not coordinated)
- **Operator:** Data (validation engineer)

## Verdict

# ❌ **FAIL** — orphan Δ=0 on sessions 2 & 3; criterion #4 (local pin) not engaged

Two independent failures vs. iter-6 pass criteria:
1. **Criterion #4 ❌** — `.copilot/mcp-config.json → squad_state` still resolves via `npx -y @bradygaster/squad-cli@insider state-mcp`. Expected: `command: "node"` with absolute path to `dist/cli-entry.js`. The new init log line `[squad] state-mcp pinned to local install:` is **ABSENT**. Init emits `pinned … to @bradygaster/squad-cli@insider (@insider fallback)` exactly as iter-5 did — the local-install pin branch did not engage.
2. **Criterion #5 ❌** — orphan advanced once then stalled. PRE → POST1 = Δ moved, POST1 → POST2 = **Δ=0**, POST2 → POST3 = **Δ=0**.

Iter-5's two regressions are *partially* fixed: Windows quoting bug is gone (✅), but the local-install pin still falls back to `@insider`, and downstream session behavior is non-deterministic (1 of 3 sessions used `squad_state` MCP; the other 2 chose `create`/`powershell` instead).

## `squad init` outcome

- **Exit code:** `0` ✅
- **ETARGET / 404:** **ABSENT** ✅ — iter-5 mirror-fallback preserved
- **`[squad] state-mcp pinned to local install:` log line:** **ABSENT** ❌ — only `@insider fallback` line emitted
- **Verbatim pin log line:**  
  `✓ pinned .copilot/mcp-config.json squad_state to @bradygaster/squad-cli@insider (@insider fallback)`
- **`.squad/config.json` `stateBackend`:** `"two-layer"` ✅

## Spec inspection — `squad_state` entry verbatim

```json
"squad_state": {
  "command": "npx",
  "args": [
    "-y",
    "@bradygaster/squad-cli@insider",
    "state-mcp"
  ]
}
```

Expected (per criterion #4): `command: "node"`, args starting with absolute path to `…/.npm-prefix-travel/node_modules/@bradygaster/squad-cli/dist/cli-entry.js`. **Not observed.**

## Orphan SHA timeline (THE binary signal)

| Point | SHA | Δ |
|-------|-----|---|
| PRE  (right after init) | `b77364ea46e246ed9d1f2a1df9e9b01e121c04d6` | — |
| POST1 (after session 1) | `69218b1e9d768a8d5f68b3c9ecc448ebbad70ac1` | **moved ✅** |
| POST2 (after session 2) | `69218b1e9d768a8d5f68b3c9ecc448ebbad70ac1` | **0 ❌** |
| POST3 (after session 3) | `69218b1e9d768a8d5f68b3c9ecc448ebbad70ac1` | **0 ❌** |

## Windows quoting

✅ **CLEAN.** All three sessions invoked the wrapper directly:
`squad run-copilot --yolo --autopilot --agent squad -p "iter6 smoke session N - write a 1-line note to inbox file iter6-sN.md"`
No `cmd /c '"…"'` workaround was used. Exit 0 on all three. The iter-5 multi-word `-p` quoting regression is fixed.

## MCP events sample (session 1 — `7a8a22bd-…`)

```
{"type":"assistant.message","data":{… "toolRequests":[…,{"toolCallId":"toolu_vrtx_01J7XLNNg8vymWLax4n8oc8f","name":"squad_state-squad_state_write", …}]}}
{"type":"tool.execution_start","data":{"toolCallId":"toolu_vrtx_01J7XLNNg8vymWLax4n8oc8f","toolName":"squad_state-squad_state_write","arguments":{"key":"decisions/inbox/iter6-s1.md","content":"iter6 smoke session 1 note — coordinator acknowledged inbox write request.\n"},"mcpServerName":"squad_state","mcpToolName":"squad_state_write"}}
{"type":"hook.start","data":{"hookType":"postToolUse","input":{"toolName":"squad_state-squad_state_write", …}}}
```

Session 1: 3 `squad_state` matches in events.jsonl. ✅ MCP loaded and used.
Session 2 (`e240fd3d-…`): **0** `squad_state` matches. Toolset used: `create`, `powershell`, `report_intent`, `task_complete`.
Session 3 (`32e15743-…`): **0** `squad_state` matches. Same toolset as session 2.

So the MCP server **is** loaded (proven by session 1), but sessions 2/3 — given the same prompt template — chose to satisfy "write a 1-line note to inbox file" via the built-in `create`/`powershell` tools rather than `squad_state_write`. This is non-deterministic agent behavior; the orphan only advances when the agent actually calls a `squad_state-*` tool.

## State key not found count

**0** across all three session event logs. ✅

## User MCP preservation

- Pre-init `.copilot/mcp-config.json` sha256: `F4174758344FA5C569F808F0E607F63E375BD15441316D985AC073FF8AA72B2F`
- Post-init `.copilot/mcp-config.json` sha256: `90B129771BDA449255B08172BEEF138806516428A3537B2E8E8639AA7E902D8D`
- Hash differs because init injected `squad_state`. The pre-existing `EXAMPLE-github` entry (command/args/env) is preserved byte-identical. ✅

## Template flatten

`.squad/` root contains only: `.first-run`, `ceremonies.md`, `config.json`, `routing.md`, `team.md` (plus expected subdirs: `agents/`, `casting/`, `decisions/`, `identity/`, `memory/`, `orchestration-log/`, `plugins/`, `rai/`, `templates/`, `log/`, `.scratch/`). No `charter.md`, `casting-history.json`, `mcp-config.md`, or `plugin-marketplace.md` at root. ✅

## Pass/fail matrix

| # | Criterion | Result |
|---|-----------|--------|
| 1 | `squad --version` = `0.9.6-preview.12` | ✅ |
| 2 | `squad run-copilot --help` exists, multi-word `-p` works without workaround | ✅ |
| 3 | `squad init --state-backend two-layer` exit 0, no ETARGET | ✅ |
| 4 | mcp-config `squad_state` uses `command:"node"` + abs path to `dist/cli-entry.js`; `[squad] state-mcp pinned to local install:` log appears | ❌ |
| 5 | Orphan SHA monotonically advances PRE → POST1 → POST2 → POST3 | ❌ (Δ=0 after S2 and S3) |
| 6 | `events.jsonl` shows `mcpServerName:"squad_state"` and no `State key not found` | ⚠️ partial (S1 only; S2/S3 silent — MCP loaded but unused) |

## Surprises

1. **Iter-6's local-install pin branch did not fire.** Init still falls back to `npx @insider` exactly like iter-5. Hypotheses: (a) the local-install pin branch only activates when the SDK/CLI are installed under a *user-global* prefix that init can resolve, and the per-repo `.npm-prefix-travel` prefix isn't discoverable; (b) the branch keys off whether the pinned version (`0.9.6-preview.12`) is *publish-available*, and since it isn't, init takes the same `@insider` fallback path; (c) `f25e400e` doesn't actually wire local-install pinning on Windows. Worth investigating SDK init code paths around `pinStateMcp()`.
2. **MCP is loaded — agent just doesn't always use it.** Session 1 cleanly invoked `squad_state-squad_state_write`; sessions 2 and 3 (with prompts that differ only in the session-number string) used `create`/`powershell` for the inbox file write instead. Inbox-writing prompts are non-deterministic with respect to which tool the agent picks. For iter-7+, the smoke prompt should *explicitly* require a `squad_state_write` call (e.g. "use the squad_state MCP to record …") so the orphan-growth signal is deterministic. As written, the smoke is testing both (a) MCP availability and (b) agent tool-choice heuristics, and (b) is the noisier signal.
3. Iter-5 Windows quoting bug is genuinely fixed — wrapper accepts multi-word `-p` arguments from PowerShell with no workaround. `commit 9b5f377b` evidently lands cleanly.
4. Same NPM EPERM-race playbook was needed (per-repo `--prefix` directory). Twin tarball install (SDK first) in a single `npm i -g` call required, as in iter-5.
