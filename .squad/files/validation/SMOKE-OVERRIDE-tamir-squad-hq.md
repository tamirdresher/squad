# SMOKE-OVERRIDE — tamir-squad-hq local-install validation

**Verdict:** PASS (3/3 sessions, monotonic orphan SHA progression, deterministic squad_state_write)

**Date:** 2026-06-03
**Engineer:** Data (validation persona, tamirdresher_microsoft)
**Bundle:** `@bradygaster/squad-cli@0.9.6-preview.12` + `@bradygaster/squad-sdk@0.9.6-preview.12` (from tarballs, no rebuild)
**Copilot CLI:** `1.0.59`
**Baseline reference:** `.squad/files/validation/SMOKE-ITER6-travel-assistant.md` (data-31, FAIL — broken project-level npx pin)

## Goal

Prove the "kill the wrapper + HOME mcp-config + local-install" architecture by manually overriding the `squad_state` MCP spec in `~/.copilot/mcp-config.json` with a local `node <abs-path>/cli-entry.js state-mcp` invocation that bypasses the broken project-level `npx -y @bradygaster/squad-cli@insider state-mcp` (which fails because that npm tag does not exist). Bare `copilot --yolo --autopilot --agent squad -p "..."` must run cleanly with deterministic squad_state_write tool calls and a monotonically-growing orphan SHA.

Tamir authorized the manual override for this validation: "for our testing, you can just override".

## Setup

1. **Workspace:** Cloned `tamirdresher_microsoft/tamir-squad-hq` as a mirror duplicate `tamir-squad-hq-override-20260603T0824` (via `git clone --bare` + `git push --mirror`) into `C:\Users\tamirdresher\source\repos\smoke-override-tamir-squad-hq\` to avoid polluting the real repo.
2. **Tarball install:** `npm install` (with per-repo `.npm-prefix`) of `@bradygaster/squad-sdk` then `@bradygaster/squad-cli` from `C:\Users\tamirdresher\squad-validation\*.tgz`. `squad --version` → `0.9.6-preview.12`. ✓
3. **`squad upgrade`:** exit 0 (preview.11 → preview.12 on project bootstrap). ✓
4. **THE OVERRIDE:** wrote the following entry to `~/.copilot/mcp-config.json` and **removed** the `squad_state` entry from project `.copilot/mcp-config.json` to force HOME fallback. Backup of HOME at `~/.copilot/mcp-config.json.backup-pre-override-tamir-squad-hq`.

```json
"squad_state": {
  "type": "local",
  "command": "node",
  "args": [
    "C:/Users/tamirdresher/source/repos/smoke-override-tamir-squad-hq/tamir-squad-hq-override-20260603T0824/.npm-prefix/node_modules/@bradygaster/squad-cli/dist/cli-entry.js",
    "state-mcp"
  ],
  "env": {},
  "tools": ["*"]
}
```

5. **`.squad/config.json` adjustments (required for the smoke):**
   - Added `"stateBackend": "two-layer"` (was missing → SDK defaulted to `local` filesystem backend, no orphan branch).
   - Removed `teamRoot` and `peers` (config was remote-mode pointing at `C:\Users\tamirdresher\tamresearch1`). Backup at `.squad/config.json.backup-remote`. See "Findings" §1 below — remote-mode is broken for state writes.

## Results — 3 sessions back-to-back

Each session command:
```
copilot --yolo --autopilot --agent squad -p "<prompt>"
```
where `<prompt>` instructs the agent to call `squad_state_write` exactly once with `key='sessions/smoke-override-s{N}.md'`.

| Session | squad_state_write invoked | Tool result | Orphan SHA (`refs/heads/squad-state`) |
|---------|---------------------------|-------------|----------------------------------------|
| PRE     | —                         | —           | `(none)` — branch did not exist |
| S1      | ✓ 1×                      | `State written: sessions/smoke-override-s1.md` | `33cc63a85d375816943636b1d4b345a1465c3495` |
| S2      | ✓ 1×                      | `State written: sessions/smoke-override-s2.md` | `dba3b9439ca802042e6d622a389a728383e6c811` |
| S3      | ✓ 1×                      | `State written: sessions/smoke-override-s3.md` | `f45c4d465f3156890e4c782a84be5252d571cd73` |

**Monotonic SHA progression confirmed.** All four orphan commits inspectable:

```
$ git log refs/heads/squad-state --oneline
f45c4d4 (squad-state) Update sessions/smoke-override-s3.md
dba3b94 Update sessions/smoke-override-s2.md
33cc63a Update sessions/smoke-override-s1.md
6994949 Initialize squad-state branch
```

```
$ git ls-tree -r refs/heads/squad-state
100644 blob 8b0b00f...  sessions/smoke-override-s1.md
100644 blob a1a32b6...  sessions/smoke-override-s2.md
100644 blob 4cc81b5...  sessions/smoke-override-s3.md
```

Content verification (S3):
```
$ git show refs/heads/squad-state:sessions/smoke-override-s3.md
Session 3 override smoke - validation
```

Session telemetry (`~/.copilot/session-state/<uuid>/events.jsonl` `squad_state_write` mentions, includes schema announcements + actual calls): S1=9, S2=9, S3=10.

## Findings

1. **`tamir-squad-hq` cannot run state-MCP writes in remote mode (SDK bug, orthogonal to the override).**
   In `state-mcp.js`, `ToolRegistry` is constructed with `context.paths.teamDir` as `squadRoot`. In `resolveSquadState`, `StateBackendStorageAdapter` is constructed with `context.paths.projectDir` as its `squadDir`. **In remote mode `teamDir ≠ projectDir`**, so every `squad_state_write` resolves to `<teamDir>/<key>` and then fails `toRelative` against `squadDir`/`projectDir` with `"path is outside squadDir and cannot be used as a state key"`. Reproduces 100% with the stock `tamir-squad-hq` config (`teamRoot: C:\Users\tamirdresher\tamresearch1`). Worked around for this smoke by removing `teamRoot` (local mode); should be filed as an SDK issue. Citations: `squad-cli/dist/cli/commands/state-mcp.js:47`, `squad-sdk/dist/resolution.js:271–293, 657–660`, `squad-sdk/dist/state-backend.js:494–518`.

2. **Default `stateBackend` is `'local'` (filesystem only).** Repos that want orphan-branch state must explicitly set `"stateBackend": "two-layer"` in `.squad/config.json`; otherwise the orphan branch is never created and there's nothing to measure. `squad upgrade` does NOT add this field. Citation: `squad-sdk/dist/state-backend.js:570 resolveStateBackend`.

3. **HOME `~/.copilot/mcp-config.json` is shared across parallel smokes.** Encountered mid-test: a sibling smoke (travel-assistant, session `61a6d829-…`) restored its own backup of HOME config and stripped my `squad_state` override mid-validation. Required re-applying override and rerunning. **Recommendation:** parallel smokes that mutate HOME config need a serialization lock or per-test prefix in the server name (e.g., `squad_state_smokeA`).

4. **`squad upgrade` does NOT touch HOME `~/.copilot/mcp-config.json`.** It only modifies project `.copilot/mcp-config.json` (and leaves the broken `npx -y @bradygaster/squad-cli@insider state-mcp` pin in place). The override pathway is the only documented way to run the local install today.

5. **The local-install + HOME-override pathway works exactly as designed.** Bare `copilot --yolo --autopilot --agent squad -p "..."` spawned the local `node cli-entry.js state-mcp` child cleanly, the squad_state MCP tools appeared in the agent's catalog, the agent issued the requested call, the backend wrote to both git-notes and the orphan branch, and SHA growth is monotonic across 3 sessions with no flakes.

## Cleanup

- ✓ HOME `~/.copilot/mcp-config.json` restored from `~/.copilot/mcp-config.json.backup-pre-override-tamir-squad-hq`.
- The workspace clone (`C:\Users\tamirdresher\source\repos\smoke-override-tamir-squad-hq\…`) and the GitHub duplicate (`tamirdresher_microsoft/tamir-squad-hq-override-20260603T0824`) are left in place for forensic inspection; they can be deleted at any time.
- `gh auth status` ends with `tamirdresher_microsoft` active.

## Verdict

**PASS.** The "kill the wrapper + HOME mcp-config + local-install" architecture is functional. The override pathway proves the local-installed state-mcp can run a clean `copilot` invocation end-to-end with monotonic orphan-branch SHA growth and 1× deterministic `squad_state_write` per session, on bundle `0.9.6-preview.12`, with no rebuild. The remaining blockers for unsupervised end-user use are unrelated SDK/UX issues: (a) the remote-mode state-mcp squadRoot/squadDir mismatch (finding §1), (b) the missing default `stateBackend: two-layer` (finding §2), and (c) the broken `npx -y @bradygaster/squad-cli@insider` project-level pin that `squad upgrade` keeps re-emitting and which the override exists to work around.
