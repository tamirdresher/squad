# SMOKE-OVERRIDE — travel-assistant

- **Date:** 2026-06-03T08:35+03:00
- **Validator:** Data (senior validation engineer)
- **Tarball version:** `0.9.6-preview.12` (combined-fixes, twin install)
- **Repo:** https://github.com/tamirdresher/travel-assistant (fresh-init half, `tamirdresher` personal acct)
- **Prior baseline ref:** `SMOKE-ITER6-travel-assistant.md` (data-31) — abandoned
- **Sibling smoke (parallel):** tamir-squad-hq

## Verdict: ❌ FAIL

PASS criteria 1, 2, 3 met. **#4 (monotonic orphan growth) and #5 (no `State key not found`) FAILED** due to two-layer state-backend's mutation allowlist rejecting bare top-level keys.

## `squad init` outcome
- Exit code: **0**
- ETARGET: **absent**
- `.squad/config.json` → `stateBackend: "two-layer"` ✓
- Pre-existing project `.copilot/mcp-config.json` (EXAMPLE-github only) preserved across init — squad init injected a `squad_state` entry pinned to `npx -y @bradygaster/squad-cli@insider`, which we then removed (see §Override).

## Override applied (HOME mcp-config)

Backup: `C:\Users\tamirdresher\.copilot\mcp-config.json.backup-pre-override-travel-assistant` (sha256 `EF34BDD4…48B`).

Verbatim `squad_state` entry written to `~/.copilot/mcp-config.json`:

```json
"squad_state": {
  "type": "local",
  "command": "node",
  "args": [
    "C:\\Users\\tamirdresher\\source\\repos\\smoke-override-travel-assistant\\.npm-prefix\\node_modules\\@bradygaster\\squad-cli\\dist\\cli-entry.js",
    "state-mcp"
  ],
  "env": {},
  "tools": ["*"]
}
```

Project `.copilot/mcp-config.json` `squad_state` entry **removed** so only HOME config supplies the server.

## copilot --version
```
GitHub Copilot CLI 1.0.59.
```

## Bare invocation
**✅** All 3 sessions ran as `copilot --yolo --autopilot --agent squad -p "…"` — no `squad run-copilot`, no `cmd /c`. Multi-word `-p` quoting worked.

## Orphan SHA timeline (local `squad-state` branch — remote never pushed)
| Snapshot | SHA | Δ |
|---|---|---|
| PRE | *(branch absent — fresh init)* | — |
| POST1 (S1) | `1e767674812ba435fad700d056a623af165a7630` | +3 commits (init+migrate+1 write) |
| POST2 (S2) | `1e767674812ba435fad700d056a623af165a7630` | **+0** ❌ |
| POST3 (S3) | `1e767674812ba435fad700d056a623af165a7630` | **+0** ❌ |

Remote `origin/squad-state` ref does NOT exist — two-layer backend writes to local orphan only; no push triggered.

## MCP call counts (from `events.jsonl`)

| Session | UUID | writes | reads | key-not-found |
|---|---|---|---|---|
| S1 | `61a6d829-…` | 15 | 0 | 0 |
| S2 | `d03ccc44-…` | 13 | 1 | 0* |
| S3 | `d902ae1b-…` | 8 | 9 | 2 |

\* S2 counts based on tool-call frames; agent surfaced `State key not found: smoke-override-s1` in stdout despite events.jsonl tally showing 0 — discrepancy may be in how subsessions are accounted.

S1 successfully wrote `sessions/smoke-override-s1.md` (visible in `git log squad-state`). S2/S3 reads of bare key `smoke-override-s1` failed because state-backend stored it under the `sessions/` prefix path, not at the bare top level. S2/S3 writes of `smoke-override-s2`/`smoke-override-s3` were **rejected** by the state backend's mutation allowlist: *"State mutations are limited to mutable runtime state (decisions, inbox, logs, sessions, scratch files, and agent history)."*

## events.jsonl sample (S3, first squad_state lines)

```
{"type":"user.message","data":{"content":"Use squad_state_read to read 'smoke-override-s1' and 'smoke-override-s2'…"
{"type":"assistant.message","data":{…"toolRequests":[{"name":"squad_state-squad_state_read","arguments":{"key":"smoke-override-s
{"type":"tool.execution_start","data":{"toolName":"squad_state-squad_state_read","arguments":{"key":"smoke-override-s1"},"mcpServerName":"squad_state","mcpToolName":"squad_state_…
```

`mcpServerName:"squad_state"` present ✅ — confirms HOME-config local-install path engaged.

## User MCP servers in project `.copilot/mcp-config.json`
**Preserved ✅** — `EXAMPLE-github` entry byte-identical to pre-init state.

## HOME mcp-config restored
✅ Post-test sha256 matches backup: `EF34BDD45F9A19F9DCF5370CCE24C12311E70309CB811B2575F6B36E1BA9948B`.

## Surprises / Findings

1. **Architectural win:** "Kill the wrapper" works — bare `copilot --agent squad -p` cleanly loads `squad_state` MCP from HOME config when local-install path is wired. The wrapper is no longer load-bearing.
2. **Two-layer backend has a key-allowlist policy** that rejected bare `smoke-override-sN` keys. S1's agent (Claude Opus 4.7 1m) auto-recovered by re-routing to `sessions/smoke-override-s1.md`; S2/S3's prompts forbade non-`squad_state_*` tools, so the agents had no escape valve. **Test design flaw** — the deterministic prompts should specify the allowed key prefix (e.g., `sessions/smoke-override-s1`) to actually test cross-session read/write durability rather than tripping the allowlist.
3. **Remote `squad-state` never pushed.** Two-layer backend appears to commit to local orphan only — there is no auto-push during a `state-mcp` session. PRE/POST SHA comparison via `origin/squad-state` is therefore wrong; the test should track the local branch (as done above). Worth confirming whether absence of push is by design or a missing hook.
4. **Sub-sessions** (e.g., `233ebcb6-…` with 0 squad_state lines, created 13s after S2 began) appear adjacent to real sessions — likely Copilot CLI internal context-spawn — and inflate apparent session counts.
5. **CLI tarball install requires twin-install in one `npm install` command** — installing SDK then CLI separately produced ETARGET (`@bradygaster/squad-sdk@>=0.9.6-preview`) because the local prefix install isn't visible to the CLI's peer resolver across separate npm runs. Single-command install of both tarballs together resolved it.

## Recommendation

Re-run the smoke with prompts that use allowlist-compliant keys (e.g., `scratch/smoke-override-s1.md` or `sessions/smoke-override-s1`). The architecture under test (HOME mcp-config + local install + no wrapper) **does work** — the failure here is in the *test design* hitting the state-backend's mutation policy, not in the override architecture. PASS criteria 1/2/3 demonstrate the architectural goal is reachable.
