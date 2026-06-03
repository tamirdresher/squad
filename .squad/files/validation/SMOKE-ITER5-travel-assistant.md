# SMOKE-ITER5 — travel-assistant (fresh-init-clean half)

- **Date:** 2026-06-03
- **Tarball version verified:** `0.9.6-preview.11` (`squad --version` → `0.9.6-preview.11`)
- **Repo:** https://github.com/tamirdresher/travel-assistant (test-duplicate, `main` branch)
- **Sibling:** tamir-squad-hq (parallel, not coordinated)
- **Iter-5 head:** PR #1200 / commit `3c019242` / `squad/state-backend-upgrade-fixes` in `bradygaster/squad`
- **Operator:** Data (validation engineer)

## Verdict

# ❌ **FAIL** — orphan SHA Δ=0 across all 3 sessions

The iter-5 `squad run-copilot` wrapper installs and forwards to copilot successfully, BUT does not appear to inject `--additional-mcp-config` (or the squad-state MCP server is otherwise not being loaded/used). The single binary signal — orphan branch HEAD SHA monotonically advancing across consecutive sessions — was NOT met. Same Δ=0 failure mode as iter-4 reported in `REVAL-ITER4-travel-assistant.md`.

**However**, the INIT-VS-UPGRADE-ASYMMETRY fix and TEMPLATE-DOC-FLATTEN fix **both ship correctly** in this bundle.

## `squad init` outcome (INIT-VS-UPGRADE-ASYMMETRY verdict)

- **Exit code:** `0` ✅
- **ETARGET / 404 / version not found:** **ABSENT** ✅ — init.ts mirror fallback works
- Pinning observed in init output: `pinned .copilot/mcp-config.json squad_state to @bradygaster/squad-cli@insider` ✅ — this is the fallback to `@insider` because `0.9.6-preview.11` isn't published, exactly as the fix intends.
- `.squad/config.json` `stateBackend: "two-layer"` ✅
- `.copilot/mcp-config.json` `squad_state` entry present, points to `@bradygaster/squad-cli@insider state-mcp` ✅
- Orphan branch `squad-state` created locally (`bc64cb1` → `8041ac7` after working-tree migrate commit) ✅

**INIT-VS-UPGRADE-ASYMMETRY fix: ✅ CONFIRMED**

## Orphan SHA timeline (THE binary signal)

| Point | SHA | Δ |
|-------|-----|---|
| PRE (right after init) | `8041ac7093a3a63a767e45cbaae4ee05bf0b4778` | — |
| POST1 (after session 1) | `8041ac7093a3a63a767e45cbaae4ee05bf0b4778` | **0** ❌ |
| POST2 (after session 2) | `8041ac7093a3a63a767e45cbaae4ee05bf0b4778` | **0** ❌ |
| POST3 (after session 3) | `8041ac7093a3a63a767e45cbaae4ee05bf0b4778` | **0** ❌ |

`origin/squad-state` never published (no push hook fired — sessions did not commit/push). Local `squad-state` ref never moved past the init-time migrate commit. The squad-state MCP server is what writes to the orphan; if it isn't loaded into the copilot session, the orphan can't grow. That is exactly the iter-4 failure mode that `squad run-copilot` is supposed to fix.

## TEMPLATE-DOC-FLATTEN check ✅

`.squad/` root contains only: `.first-run`, `ceremonies.md`, `config.json`, `routing.md`, `team.md`.

NONE of the prohibited paths exist at root: `charter.md`, `casting-history.json`, `*-charter.md`, `mcp-config.md`, `plugin-marketplace.md` — all properly located under `.squad/templates/`. ✅

## User MCP server preservation ✅

Pre-init `.copilot/mcp-config.json` sha256: `F4174758344FA5C569F808F0E607F63E375BD15441316D985AC073FF8AA72B2F`
Post-init `.copilot/mcp-config.json` sha256: `90B129771BDA449255B08172BEEF138806516428A3537B2E8E8639AA7E902D8D`

Hash differs **because** init added the `squad_state` entry (expected — confirmed by init output `pinned .copilot/mcp-config.json squad_state to @bradygaster/squad-cli@insider`). The pre-existing user entry `EXAMPLE-github` is preserved **byte-identical** (same command/args/env block). ✅ — non-squad-managed user MCP servers preserved.

## `squad --version` verbatim

```
0.9.6-preview.11
```

## `squad run-copilot --help` first 10 lines verbatim

```
(node:28208) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
Usage: copilot [options] [command]

GitHub Copilot CLI - An AI-powered coding assistant.

Start an interactive session to chat with Copilot, or use -p/--prompt for
non-interactive scripting. Copilot can edit files, run shell commands, search
your codebase, and more — all with configurable permissions.

Run `copilot <command> --help` for details on any subcommand.
```

(Wrapper is a thin shim — forwards to copilot's own help. No squad-specific options surfaced.)

## Per-session results

| Session | Start | Finished | Exit | Local squad-state HEAD after | Δ |
|---------|-------|----------|------|------------------------------|---|
| 1 | 2026-06-03T07:39:14 | 2026-06-03T07:40:16 | 0 | `8041ac7` | 0 ❌ |
| 2 | 2026-06-03T07:41:25 | 2026-06-03T07:42:22 | 0 | `8041ac7` | 0 ❌ |
| 3 | 2026-06-03T07:42:31 | 2026-06-03T07:43:37 | 0 | `8041ac7` | 0 ❌ |

All sessions completed cleanly, wrote their inbox files (`smoke-iter5-session{1,2,3}.md`, 868/499/764 bytes), and exited 0. Working tree shows the writes. But orphan never advanced.

## MCP-loaded inference

**The squad-state MCP server does NOT appear to be loaded by the wrapped copilot session.**

Evidence:
- Latest copilot session-state dir (`~/.copilot/session-state/7fee710c-…/events.jsonl`) contains zero matches for `squad_state`, `state-mcp`, `additional-mcp`, `mcpServer`, or `tool_use` against the squad-state server.
- Session transcripts show only built-in shell, Read, and Write tool calls — no MCP tool invocations.
- Orphan SHA never moves, which is precisely what would happen if the squad-state MCP server isn't loaded (nothing writes to the orphan).

This is the **same root-cause symptom as iter-4**. The wrapper exists (`squad run-copilot` is dispatchable, version is the new bundle), but whatever `--additional-mcp-config` injection it was supposed to add is either not happening or is not effective.

## Surprises / regressions

1. **`squad run-copilot` has a Windows argument-quoting regression.** Multi-word `-p "<prompt>"` strings are passed through `shell:true` (see Node `DEP0190` warning emitted on every invocation) and the inner quotes are dropped on Windows, producing `error: Invalid command format`. Workaround: doubly-escape the prompt as `-p "\"<prompt>\""` via `cmd /c`. PowerShell native invocation is broken for any prompt containing whitespace.
2. **CLI tarball requires the SDK tarball pre-installed in the same `npm install -g` invocation.** Installing CLI alone fails with `ETARGET: No matching version found for @bradygaster/squad-sdk@>=0.9.6-preview` because npm resolves the dep from the registry, not from a previously globally-installed tarball. Resolved by passing both tarballs in one `npm install -g` command.
3. **NPM EPERM race against sibling agent confirmed** — first install attempt against shared user-global prefix failed with `EPERM: operation not permitted, unlink 'C:\ProgramData\global-npm\squad'`. Mitigated by using dedicated `.npm-prefix-travel` directory (per playbook). Use `--prefix <dir>` flag inline; `npm config set prefix --location=project` does not work because npm rejects it as "same as user config, ignored" when `userconfig` already sets one.
4. **Init log line** `.copilot\mcp-config.json already exists — skipping` is misleading — init *did* modify the file (added `squad_state`). The "skipping" message refers only to whether to fully overwrite; the squad-managed entry is still injected. Pre-existing user entries are preserved (verified).
5. Init also emitted `migrated 4 mutable state file(s) onto squad-state branch (removed from working tree)` even on a "fresh" init — this is because the travel-assistant repo had prior squad-managed state from iter-4 testing checked into the working tree. The migrate path correctly absorbed these into the orphan. Not a regression — actually a nice signal that init is robust to pre-existing state.

## Conclusion

Iter-5 fixes **two of three** target defects:
- ✅ **INIT-VS-UPGRADE-ASYMMETRY** — init no longer ETARGETs on unpublished pinned version; falls back to `@insider`.
- ✅ **TEMPLATE-DOC-FLATTEN** — template docs route to `.squad/templates/`, not `.squad/` root.
- ❌ **The primary binary signal (orphan growth via squad-state MCP under canonical wrapper invocation)** — still FAIL. `squad run-copilot` either does not inject `--additional-mcp-config`, or the injection is ineffective, or the wrapper is masked by the Windows quoting bug (the canonical invocation path itself is broken on Windows with multi-word prompts).

Recommendation: investigate (a) whether `squad run-copilot` actually adds `--additional-mcp-config` to its forwarded argv, (b) whether the Windows quoting regression is preventing the inject from working, and (c) why no `tool_use` events for the `squad_state` MCP appear in copilot session-state even though `mcp-config.json` declares it.
