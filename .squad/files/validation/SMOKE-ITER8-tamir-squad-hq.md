# SMOKE-ITER8 — tamir-squad-hq

**Persona:** Data (validation engineer)
**Date:** 2026-06-03
**Repo under test:** `tamir-squad-hq` (cloned to `C:\Users\tamirdresher\source\repos\smoke-iter8-tamir-squad-hq\tamir-squad-hq`)
**squad-cli version:** `0.9.6-preview.14` (insider tarball)
**Copilot CLI:** `GitHub Copilot CLI 1.0.59`
**Active gh account:** `tamirdresher_microsoft`

---

## VERDICT: ❌ FAIL

**Root cause:** Copilot CLI 1.0.59 does **not** auto-start workspace-scoped
`.mcp.json` MCP servers in bare `copilot -p` invocations. The deepwiki §5.3
"auto-load" claim that iter-8 architecture depends on does not hold for this
CLI version. The `squad upgrade` writes the file correctly, the CLI lists the
server under "Workspace servers" (`copilot mcp list`), but it is never
**started** — therefore `squad_state_read` / `squad_state_write` are never
exposed in the agent's tool surface.

Result: criteria 1–6 pass, criteria 7–9 fail. The wrapper deletion from iter-7
is preserved, the HOME contract holds, the file artifacts are correct — but
the **runtime contract fails**: no state was written by any of the three
sessions, no orphan growth on the `squad-state` branch (branch never created
on the remote), and the agent itself reported the tools were missing on every
attempt.

---

## Test matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | `squad --version` = `0.9.6-preview.14` | ✅ | `Squad v0.9.6-preview.14` (banner on each session) |
| 2 | `squad run-copilot --help` errors "Unknown command" | ✅ | `✗ Unknown command: run-copilot` (wrapper deletion preserved) |
| 3 | `.mcp.json` written at repo root with squad_state entry | ✅ | See verbatim below |
| 4 | Project `.copilot/mcp-config.json` `squad_state` tombstoned | ✅ | Servers remaining: `azure-devops, bitwarden, bitwarden-shadow, EXAMPLE-trello, chrome-devtools` (no `squad_state`) |
| 5 | HOME `~/.copilot/mcp-config.json` SHA byte-identical before/after | ✅ | `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` (PRE = POST) |
| 6 | HOME 8 servers preserved | ✅ | `azure-devops, teams, mail, calendar, sharepoint, nano-banana, chrome-devtools, bitwarden` |
| 7 | Orphan-SHA growth on `squad-state` after each session | ❌ | Branch never created on origin (no writes ever occurred). PRE = POST1 = POST2 = POST3 = `(branch does not exist)`. `git ls-remote --heads origin squad-state` → empty. |
| 8 | `events.jsonl` shows `mcpServerName:"squad_state"` calls | ❌ | All three sessions: zero `mcpServer` start events for `squad_state`. Only event referencing the server is the prompt text itself; agent's only tool call is `task_complete` reporting failure. |
| 9 | Zero "State key not found" errors | N/A | Nothing was ever written, so reads have nothing to find — but the failure is at the tool-availability layer, not at the key layer. |

---

## Artifacts

### `.mcp.json` (verbatim, at repo root)

```json
{
  "mcpServers": {
    "squad_state": {
      "command": "npx",
      "args": [
        "-y",
        "@bradygaster/squad-cli@insider",
        "state-mcp"
      ],
      "env": {},
      "tools": [
        "*"
      ]
    }
  }
}
```

This file is correct — it matches the iter-8 spec. The failure is not in
what `squad upgrade` wrote; it is in whether the Copilot CLI starts it.

### `.squad/config.json`

The `stateBackend` field is **absent** from this repo's config (not set to
`"two-layer"`, not set to anything). This pre-dates iter-8 and was not added
by the upgrade. Data-30 finding about `stateBackend` preservation does not
apply here because the field was never present to preserve.

### `squad upgrade` output (relevant lines)

```
✓ installed squad_state MCP server to .mcp.json (@bradygaster/squad-cli@insider (@insider fallback))
✓ removed stale squad_state from .copilot\mcp-config.json (now lives in .mcp.json)
```

### `copilot mcp list` (workspace context)

`squad_state` appears under **Workspace servers** with source `.mcp.json` —
the CLI **sees** it, but does not **start** it.

### `copilot mcp get squad_state`

Confirms `Source: Workspace` (the `.mcp.json` file). Recognized but not
auto-loaded.

---

## Three bare sessions (verbatim agent failures)

All three sessions invoked with **no** `--additional-mcp-config`, **no**
`cmd /c`, **no** wrapper — bare:

```
copilot --yolo --autopilot --agent squad -p "<prompt>"
```

### Session 1 — `events.jsonl`: `~/.copilot/session-state/baef3a9c-f949-4e1f-930c-15ce7b4a116d/`
Prompt: `Use squad_state_write to store key sessions/iter8-smoke-s1 with value travel-assistant iter-8 session 1 complete …`
Agent reply (verbatim, condensed):
> The `squad_state_write` tool is not available in this session — it's not in my tool registry.

Only `tool.execution_start` event = `task_complete`. Zero `mcpServer*` events
mentioning `squad_state`.

### Session 2 — `events.jsonl`: `~/.copilot/session-state/9b039460-f88a-48ad-b724-89ad88911c52/`
Prompt: `Use squad_state_read to read 'sessions/iter8-smoke-s1' and confirm value. Then squad_state_write 'sessions/iter8-smoke-s2' = 'session 2 read s1 successfully'. End. Only squad_state tools.`
Agent reply (verbatim):
> The `squad_state_read` and `squad_state_write` tools are not available in this session — I don't see them in my tool registry. Available tools here are filesystem (view/edit/create), powershell, GitHub MCP, Azure DevOps MCP, M365 (mail/calendar/teams/sharepoint), and a few others, but no `squad_state_*` runtime bridge.
>
> **Result:** Cannot complete — `squad_state` MCP/runtime state bridge is missing in this session.

Only `tool.execution_start` event = `task_complete`. Zero mcpServer events.

### Session 3 — `events.jsonl`: `~/.copilot/session-state/ffea9594-f896-4ca5-9048-66c15690939e/`
Prompt: `Use squad_state_read to read 'sessions/iter8-smoke-s1' AND 'sessions/iter8-smoke-s2'. Then squad_state_write 'sessions/iter8-smoke-s3' = 'all sessions verified, orphan growth confirmed'. End. Only squad_state tools.`
Agent reply (verbatim):
> The `squad_state_*` tools are **not available** in this CLI session, and `STATE_BACKEND` is `two-layer` (git-notes + orphan branch). Per the coordinator rules, for `two-layer` backends I must **not** hand-write mutable squad state or run git-notes/orphan-branch choreography manually — and you explicitly constrained me to "Only squad_state tools."
>
> **Result: Cannot complete this task.**
>
> - ❌ `squad_state_read sessions/iter8-smoke-s1` — bridge missing
> - ❌ `squad_state_read sessions/iter8-smoke-s2` — bridge missing
> - ❌ `squad_state_write sessions/iter8-smoke-s3` — bridge missing

Only `tool.execution_start` event = `task_complete`. Zero mcpServer events.

---

## Orphan-SHA growth timeline

```
PRE   : (branch does not exist on origin)
POST1 : (branch does not exist on origin)   Δ = 0
POST2 : (branch does not exist on origin)   Δ = 0
POST3 : (branch does not exist on origin)   Δ = 0
```

`git ls-remote --heads origin squad-state` → empty output (branch absent).
`git rev-parse origin/squad-state` → `fatal: ambiguous argument 'origin/squad-state': unknown revision or path not in the working tree.`

No writes ever occurred. No branch was ever created. No orphan SHAs produced.

---

## Auxiliary confirmation: `--additional-mcp-config` works

To isolate the failure mode, I also invoked:

```
copilot --yolo --autopilot --additional-mcp-config '@.mcp.json' --agent squad -p "..."
```

— and the tools **do** load, exposed as `squad_state-squad_state_write`,
`squad_state-squad_state_read`, etc. (i.e. server-name-prefixed). This
confirms two things:

1. The `.mcp.json` file iter-8 produces is structurally valid and the MCP
   server itself works.
2. The failure is specifically in **auto-load** of workspace `.mcp.json` by
   bare `copilot -p` invocations in CLI 1.0.59 — not in any iter-8 artifact.

This auxiliary invocation is **not** the iter-8 contract. iter-8 requires the
bare invocation to work without the explicit flag (because the wrapper that
used to inject the flag was deleted in iter-7). Therefore the iter-8 contract
fails.

---

## Conclusion & recommendation

iter-8's filesystem-level deliverables are correct: wrapper gone, `.mcp.json`
written, project mcp-config tombstoned, HOME byte-identical. **What fails is
the architectural assumption** that bare Copilot CLI 1.0.59 auto-loads
workspace `.mcp.json` MCP servers.

Two viable paths forward:

1. **Bring back a thin wrapper** that re-injects
   `--additional-mcp-config '@.mcp.json'` for bare `copilot` invocations
   until Copilot CLI ships native auto-load. This reverts the iter-7 deletion.
2. **Wait for Copilot CLI** to ship `.mcp.json` auto-load and pin
   `engines.copilot >= <that version>` in squad-cli. Until then, iter-8 ships
   broken state-bridging on 1.0.59.

Without one of these, every bare `copilot -p` invocation from squad agents
will run without state tools and the entire two-layer state architecture is
non-functional in the real product surface.
