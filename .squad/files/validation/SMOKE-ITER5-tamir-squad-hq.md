# SMOKE iter-5 — tamir-squad-hq

- **Date:** 2026-06-03 (UTC)
- **Validator:** Data
- **Tarball version verified:** `0.9.6-preview.11` (twin install: SDK + CLI from `C:\Users\tamirdresher\squad-validation\bradygaster-squad-{sdk,cli}-combined-fixes.tgz`)
- **Repo:** https://github.com/tamirdresher_microsoft/tamir-squad-hq
- **Work dir:** `C:\Users\tamirdresher\source\repos\smoke-iter5-tamir-squad-hq\`
- **Invocation tested:** `squad run-copilot --yolo --autopilot --agent squad -p "<prompt>"` (the iter-5 canonical wrapper)
- **Auth:** `tamirdresher_microsoft` (EMU) throughout — verified at end.

## Verdict

**❌ FAIL** — the `squad-state` orphan branch was **never created** (locally or on origin) across PRE + 3 sessions. Δ = 0 / 0 / 0. The single binary pass/fail signal is FAIL.

This is the iter-4 failure mode reproducing **even with the new wrapper**, but for a different reason than iter-4 (see below).

## Orphan SHA timeline

| Marker | Value                  | Δ from prior |
|--------|------------------------|--------------|
| PRE    | `<not-yet-created>`    | —            |
| POST1  | `<not-yet-created>`    | 0 (no branch) |
| POST2  | `<not-yet-created>`    | 0            |
| POST3  | `<not-yet-created>`    | 0            |

`git ls-remote origin` and `git for-each-ref` both confirm no `squad-state` ref exists. `git reflog --all` shows only `main` activity.

## Per-session results

| Session | Exit | Duration | Inbox file written? | squad_state MCP tools called? | POST orphan SHA |
|---------|------|----------|----------------------|-------------------------------|------------------|
| 1       | 0    | 53 s     | Yes (`smoke-iter5-session1.md`) | **No** — agent used built-in `create` only | `<not-yet-created>` |
| 2       | 0    | 122 s    | Yes (`smoke-iter5-session2.md`) | **Yes** — `squad_state_health`, `squad_state_list`, `squad_state_read` | `<not-yet-created>` |
| 3       | 0    | 117 s    | Yes (`smoke-iter5-session3.md`) | **Yes** — `squad_state_health`, `squad_state_read`, `squad_state_write` (via Scribe sub-agent) | `<not-yet-created>` |

All 3 sessions completed cleanly and the agent finished in one pass each. The inbox writes are gitignored (`.gitignore:101 → .squad/decisions/inbox/`), so they are correctly *not* on `main` — they are exactly the kind of state that is **supposed** to land on the orphan branch via `squad_state` MCP, but didn't.

## MCP-loaded inference (defense-in-depth check)

Hard evidence the wrapper successfully injected `--additional-mcp-config` and the `squad_state` MCP server **did load** in the copilot session: sessions 2 and 3 each have `tool.execution_start` events whose `toolName` begins with `squad_state-*` and includes the field `"mcpServerName":"squad_state"`. Tool list:

- `squad_state-squad_state_health`
- `squad_state-squad_state_read`
- `squad_state-squad_state_list`
- `squad_state-squad_state_write`

So the **iter-5 wrapper fix works for what it set out to fix** (MCP gets loaded under canonical user invocation — that was the iter-4 root cause).

However, the **state-mcp server itself returns failures** for every read/write:

- `MCP server 'squad_state': State key not found: team.md`
- `MCP server 'squad_state': State key not found: decisions/inbox/smoke-iter5-session3.md`

I.e. the server is alive and reachable, but its backing store is empty and writes never materialise into an orphan branch.

### Probable root cause (informational — not a verdict claim)

`.copilot/mcp-config.json → mcpServers.squad_state` was rewritten by `squad upgrade` to:

```json
{ "command": "npx", "args": ["-y", "@bradygaster/squad-cli@insider", "state-mcp"] }
```

The upgrade log even confirmed it: `✓ ensured .copilot/mcp-config.json squad_state pinned to @bradygaster/squad-cli@insider`. The `@insider` dist-tag pulls from the npm registry, **not** from the locally-installed iter-5 tarball. So while `squad --version` reports `0.9.6-preview.11`, the state-mcp child process is running the **published `@insider` build (0.9.6-insider.3)** — i.e. pre-iter-5 state-mcp code, which apparently never initialises the orphan branch.

This is a regression worth flagging to the iter-5 author: even with a perfect wrapper, pinning the MCP server command to a published dist-tag bypasses the local tarball under test. Smoke validation of any future preview build via this path will always run the published `@insider` state-mcp regardless of what tarball the user installs.

## TEMPLATE-DOC-FLATTEN check: ⚠ PARTIAL

- ✅ `.squad/templates/` exists and is populated with the routed template docs (charter.md, scribe-charter.md, mcp-config.md, plugin-marketplace.md, casting-history.json, ceremonies.md, copilot-agent.md, copilot-instructions.md, etc. — 50+ files including `casting/`, `identity/`, `scripts/` subdirs).
- ❌ The pre-existing root dumps from the iter-4 baseline **were NOT cleaned up** — `.squad/charter.md`, `.squad/casting-history.json`, `.squad/scribe-charter.md`, `.squad/mcp-config.md`, `.squad/plugin-marketplace.md` all still exist in `.squad/` root after `squad upgrade`. So the fix prevents new dumps but does not migrate legacy ones. New repos are fine; upgraded repos keep the mess.

## 5 user MCP server preservation: ✅

Pre-upgrade `.copilot/mcp-config.json` sha256: `51C8D0D0...4328CDCFAC6CC42B5019`
Post-upgrade sha256: `A5FD3EE1...7773E4012B4D7A8B8505DC` (changed — expected, because `squad_state` was injected)

Post-upgrade server list (6 total):
1. `azure-devops` ✅ user (preserved)
2. `bitwarden` ✅ user (preserved)
3. `bitwarden-shadow` ✅ user (preserved)
4. `EXAMPLE-trello` ✅ user (preserved)
5. `chrome-devtools` ✅ user (preserved)
6. `squad_state` ➕ added by upgrade (expected; see root cause above)

All 5 pre-existing user servers retained.

## `squad --version` output (verbatim)

```
0.9.6-preview.11
```

## `squad run-copilot --help` output (verbatim, first ~12 lines)

```
(node:32072) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
Usage: copilot [options] [command]

GitHub Copilot CLI - An AI-powered coding assistant.

Start an interactive session to chat with Copilot, or use -p/--prompt for
non-interactive scripting. Copilot can edit files, run shell commands, search
your codebase, and more — all with configurable permissions.

Run `copilot <command> --help` for details on any subcommand.
```

Note: `squad run-copilot --help` proxies straight through to `copilot --help` rather than printing a wrapper-specific help. The subcommand *does* exist and *does* augment argv (verified in source `dist/cli/commands/run-copilot.js → buildRunCopilotArgs` and confirmed in session events).

## Surprises / regressions vs iter-4 baseline

1. **Windows arg-quoting bug in `squad run-copilot`** — the wrapper uses `spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })`. On Windows, `shell:true` concatenates args via cmd.exe **without escaping**, so any `-p "prompt with spaces"` arrives at `copilot` as multiple unquoted tokens. Copilot then errors: *"Invalid command format. It looks like your prompt was not quoted…"*. Workaround used: double-quote the prompt literally (`-p '"prompt"'`). Worth fixing — every Windows user hits this on the first canonical invocation.
2. **`squad_state` MCP pinned to `@bradygaster/squad-cli@insider`** in `.copilot/mcp-config.json` after `squad upgrade`. This silently bypasses any locally-installed tarball under test (see root cause above). Renders the smoke test of state-mcp essentially impossible without manually editing the MCP config to point at the local tarball.
3. **`squad upgrade` does not flatten legacy template dumps** — see TEMPLATE-DOC-FLATTEN section.
4. **Session 1 didn't use squad_state at all** — agent decided a plain `create` was sufficient. Sessions 2 & 3 did invoke squad_state tools (Scribe sub-agent specifically). Behavioral, not a regression — just noting the squad_state tools were not always exercised even when available.
5. **Privacy migration ran during upgrade** (`scrubbed email addresses from 3 file(s)`) — new behavior vs iter-4; not validated for correctness here.

## Summary

The iter-5 wrapper successfully fixes the iter-4 root cause (squad_state MCP server now loads under canonical user invocation — proven). However, the binary success signal still fails because the `squad_state` MCP server (running the @insider published build, not the iter-5 tarball) cannot initialise the orphan branch. The smoke test cannot pass until either (a) the upgrade pins squad_state to the local tarball / preview tag, or (b) the published @insider build is itself updated to the iter-5 state-mcp code.
