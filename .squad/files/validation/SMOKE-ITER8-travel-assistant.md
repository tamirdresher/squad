# SMOKE-ITER8 — travel-assistant

**Persona:** Data (validation engineer)
**Date:** 2026-06-03
**Repo under test:** `travel-assistant` (cloned to `C:\Users\tamirdresher\source\repos\smoke-iter8-travel-assistant`)
**squad-cli version:** `0.9.6-preview.14` (insider tarball, installed locally to repo `.npm-prefix\`)
**Copilot CLI:** `GitHub Copilot CLI 1.0.59`
**Active gh account during test:** `tamirdresher`

---

## VERDICT: ❌ FAIL

**Same root cause as sibling `SMOKE-ITER8-tamir-squad-hq`:** Copilot CLI 1.0.59
does **not** auto-load workspace-scoped `.mcp.json` MCP servers in bare
`copilot -p` invocations. The iter-8 contract — which deletes the
`squad run-copilot` wrapper and relies on native `.mcp.json` auto-load — is
therefore non-functional on this CLI version.

`squad init --state-backend two-layer` produces all the correct file artifacts
(criteria 1–6 pass), but the runtime contract collapses (criteria 7–10 fail):
zero `squad_state-*` tool calls in any session, zero growth on `origin/squad-state`
(branch never created), and the agent itself reports the tools are unavailable
on every probe.

---

## Test matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | `squad --version` = `0.9.6-preview.14` | ✅ | Reported `0.9.6-preview.14` after `npm install -g --prefix .npm-prefix` of SDK+CLI tarballs together |
| 2 | `squad run-copilot --help` errors "Unknown command" | ✅ | `✗ Unknown command: run-copilot` (iter-7 wrapper deletion preserved) |
| 3 | `squad init` writes `.mcp.json` at repo root with `squad_state` entry | ✅ | See verbatim below; init log: `✓ installed squad_state MCP server to .mcp.json (@bradygaster/squad-cli@insider (@insider fallback)) — Copilot CLI will auto-load on next invocation` |
| 4 | Project `.copilot/mcp-config.json` does NOT contain `squad_state` (tombstone) | ✅ | File preserved pre-existing `EXAMPLE-github` entry; no `squad_state` key |
| 5 | HOME `~/.copilot/mcp-config.json` SHA byte-identical before/after | ✅ | PRE = POST = `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` |
| 6 | HOME 8 servers preserved, zero `squad_state_*` | ✅ | `azure-devops, teams, mail, calendar, sharepoint, nano-banana, chrome-devtools, bitwarden` |
| 7 | `.squad/config.json` `stateBackend` = `"two-layer"` | ✅ | Written by `squad init --state-backend two-layer` |
| 8 | Orphan-SHA growth on `origin/squad-state` after each session | ❌ | Branch never created. `git ls-remote --heads origin squad-state` → empty; `git rev-parse origin/squad-state` → `fatal: ambiguous argument`. |
| 9 | `events.jsonl` shows `squad_state-*` tool calls per session | ❌ | All sessions in cwd: zero `tool_start_name` matching `*squad_state*`. The string `squad_state` only appears in user-prompt text and assistant replies explaining the tool is missing. |
| 10 | Zero "State key not found" / setup errors | N/A | Nothing was ever written — failure is at tool-availability layer, not at the key layer |

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

Note: iter-8 wrote the **`@insider`** dist-tag (current pointer = `0.9.6-insider.3`)
rather than the local `0.9.6-preview.14` tarball under test, because `preview.14`
is not published to npm. This was emitted explicitly as `(@insider fallback)` in
the init log. Not a defect of iter-8 itself, but a property worth flagging:
the running MCP server at session-time is whatever `@insider` resolves to on npm,
not the local install.

### `.copilot/mcp-config.json` (tombstone)

```json
{
  "mcpServers": {
    "EXAMPLE-github": {
      "command": "npx",
      "args": ["-y", "@anthropic/github-mcp-server"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

Pre-existing `EXAMPLE-github` entry untouched; zero `squad_state` keys. Tombstone
contract honored.

### `.squad/config.json`

`stateBackend: "two-layer"` set as requested.

### HOME `~/.copilot/mcp-config.json`

8 servers PRE, 8 servers POST, sha256 byte-identical:

```
PRE  : 928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86
POST : 928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86
```

Zero HOME mutation. iter-7 / iter-8 "no-HOME" pivot honored.

---

## Bare-invocation probes (verbatim agent replies)

All probes invoked as bare:

```
copilot --yolo --autopilot --agent squad -p "<prompt>"
```

No `--additional-mcp-config`, no wrapper, no `cmd /c`.

### Probe 1 — health
Session: `~/.copilot/session-state/c394a108-4b76-465b-a7cb-99397eac1c3d/`
Prompt: *"Call the tool named squad_state-squad_state_health. Report whatever it returns verbatim, or report exact error if tool is unknown."*

Reply (verbatim):
> The tool `squad_state-squad_state_health` is unknown. It is not available in my current tool set.

### Probe 2 — list MCP servers
Session: `~/.copilot/session-state/8fa3d658-6b93-403f-8fce-f6cf15910ccf/`
Prompt: *"Run /env and paste the MCP servers section verbatim."*

Reply (verbatim, MCP list):
> **MCP servers detected:**
> - github-mcp-server — GitHub repos, code search, Copilot Spaces
> - azure-devops
> - bitwarden
> - calendar
> - chrome-devtools
> - mail
> - nano-banana
> - sharepoint
> - teams

**Conspicuously absent:** `squad_state`. The agent sees the HOME 8 servers plus
the project-mcp `EXAMPLE-github` (resolved to `github-mcp-server`), totalling
9 — but `.mcp.json` is invisible to it.

### Probes 3–5 (earlier session-1 retries)
Sessions: `34cbe319-…`, `baef3a9c-…`, plus a parent-session bleed on `6a76bda9-…`.
Across all of these, `Select-String -Pattern '"tool_start_name":"[^"]*squad_state[^"]*"'`
returns **zero matches**. The only events mentioning `squad_state` are the
user-prompt text itself or the assistant's reply explaining the tool is missing.

---

## Orphan-SHA timeline

```
PRE   : (branch does not exist on origin)
POST1 : (branch does not exist on origin)   Δ = 0
POST2 : (branch does not exist on origin)   Δ = 0
POST3 : (branch does not exist on origin)   Δ = 0
```

Verification:

```
> git fetch origin squad-state
fatal: couldn't find remote ref squad-state
> git rev-parse origin/squad-state
fatal: ambiguous argument 'origin/squad-state': unknown revision …
```

No writes ever occurred → no branch created → no orphan SHAs to compare.

---

## Surprises & notes

1. **Install ETARGET on separate-call install.** Installing the CLI tarball alone
   fails: its `@bradygaster/squad-sdk` dep range `>=0.9.6-preview.` does not
   resolve from registry (no `preview.*` versions published). Workaround: install
   both tarballs in a **single** `npm install -g --prefix .npm-prefix
   <sdk.tgz> <cli.tgz>` call so npm resolves the peer locally. This should be
   either documented in install instructions or fixed in `package.json`
   (`@insider` peer range).
2. **`@insider` fallback in `.mcp.json`.** The init writes `@bradygaster/squad-cli@insider`
   as the MCP command rather than the local preview.14 install. At session time,
   `npx -y @bradygaster/squad-cli@insider` will fetch and run whatever the
   `@insider` dist-tag points to (currently `0.9.6-insider.3`), **not** the tarball
   under test. This is intentional fallback behavior but worth flagging — there
   is a version skew window between what `squad --version` reports (the local
   preview.14) and what the MCP server actually runs (whatever `@insider` is).
3. **Identical failure to sibling `tamir-squad-hq`.** Both halves of iter-8 fail
   with the same root cause — Copilot CLI 1.0.59 does not auto-load workspace
   `.mcp.json`. The iter-8 architectural premise is the bug, not anything
   specific to either repo. See `SMOKE-ITER8-tamir-squad-hq.md` for the
   `--additional-mcp-config` cross-check that proved the MCP server itself works
   when explicitly loaded.
4. **Session bleed quirk.** The first bare `copilot -p` invocation via
   `powershell` appears to inject the prompt into the parent Copilot session
   that hosts the validation run (the cwd auto-jumps). Workaround: launch via
   `Start-Process powershell -RedirectStandardOutput` so the child gets a fresh
   session id. Worth a docs note for anyone scripting `copilot -p`.

---

## Conclusion

iter-8's filesystem artifacts on `travel-assistant` are **correct**:
- `.mcp.json` written with valid squad_state entry ✅
- `.copilot/mcp-config.json` `squad_state` absent (tombstoned) ✅
- HOME byte-identical ✅
- `stateBackend: two-layer` set ✅
- `squad run-copilot` wrapper still deleted ✅

What **fails** is the architectural assumption that Copilot CLI 1.0.59 auto-loads
workspace `.mcp.json`. It does not. The wrapper deletion from iter-7 is therefore
premature; bare `copilot -p` runs never see `squad_state-*` tools and the
two-layer state architecture is non-functional in the real product surface.

Recommendation: restore a thin wrapper that re-injects
`--additional-mcp-config '@.mcp.json'` (reverts iter-7 deletion), **or** pin
`engines.copilot >= <version that ships auto-load>` and ship iter-8 only when
that version is generally available. Until then, ship iter-8 as broken on
1.0.59.
