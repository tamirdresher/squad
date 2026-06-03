# SMOKE — iter-7 — travel-assistant (fresh-init-clean half)

- **Date:** 2026-06-03T11:51:58+03:00
- **Tarballs:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` → reports `0.9.6-preview.13`
- **Repo:** https://github.com/tamirdresher/travel-assistant (cloned to `C:\Users\tamirdresher\source\repos\smoke-iter7-travel-assistant\travel-assistant`)
- **Validator:** Data (sibling: tamir-squad-hq)
- **Prior baselines:** data-31 (iter-6 wrapper smoke, ❌), data-33 (override smoke, 🟡 architecture-pass-test-flaw)

## Verdict

🟡 **PARTIAL — Architecture passes end-to-end on every iter-7 contract; remote orphan-SHA push timeline did not materialize (local orphan grew monotonically Δ=+1 each session, but `origin/squad-state` was never created because no auto-push fires from state-mcp writes — only `squad sync` via post-commit on the main branch would push, and no main-branch commits occurred during the three test sessions).**

## Pass/fail signal table

| # | Criterion | Result |
|---|-----------|--------|
| 1 | `squad --version` == `0.9.6-preview.13` | ✅ |
| 2 | `squad run-copilot --help` → "Unknown command" | ✅ |
| 3 | `squad init --state-backend two-layer` exit 0, no ETARGET | ✅ |
| 4 | HOME `~/.copilot/mcp-config.json` got new `squad_state_<hash>` entry, no hand-edit | ✅ (`squad_state_0d490fa9`) |
| 5 | Pre-existing user MCP servers preserved byte-identical (sha256 match) | ✅ (8/8) |
| 6 | Project `.copilot/mcp-config.json` does NOT have `squad_state` | ✅ |
| 7 | Orphan SHA grows monotonically PRE → POST1 → POST2 → POST3 (Δ≥1) | 🟡 LOCAL ✅ (5 commits), REMOTE ❌ (branch never pushed) |
| 8 | events.jsonl shows `squad_state_*` MCP calls | ✅ but with stale-orphan-name (see "Surprises") |

## Details

### `squad run-copilot` deletion
✅ **PASS** — verbatim:
```
✗ Unknown command: run-copilot
       Run 'squad doctor' to check your setup, or 'squad help' for usage information.
```
Exit code 1.

### `squad init --state-backend two-layer` outcome
- Exit code: **0**
- ETARGET present: **NO**
- HOME-write log line present: ✅
  > `✓ installed squad_state_0d490fa9 -> C:\Users\tamirdresher\.copilot\mcp-config.json (@bradygaster/squad-cli@insider (@insider fallback))`
- Hooks installed: pre-push, post-merge, post-rewrite, post-checkout, pre-commit, post-commit ✅
- Orphan branch created locally (`squad-state` at commit `e1a1711`, then `303d992` after migration) ✅
- Project `.copilot/mcp-config.json` already existed with `EXAMPLE-github` → init skipped touching it (iter-7 contract honored)

### HOME `squad_state_0d490fa9` entry (verbatim)
```json
"squad_state_0d490fa9": {
  "command": "npx",
  "args": ["-y", "@bradygaster/squad-cli@insider", "state-mcp"]
}
```

### `.squad/config.json` stateBackend
`two-layer` ✅

### HOME pre-existing user MCP preservation (sha256)
| name | pre-sha256 | post-sha256 | match |
|------|------------|-------------|-------|
| azure-devops | `60314188…F86` | `60314188…F86` | ✅ |
| teams | `8088B1A3…498` | `8088B1A3…498` | ✅ |
| mail | `B45E07BF…F03E` | `B45E07BF…F03E` | ✅ |
| calendar | `7CC2A5F8…AA77` | `7CC2A5F8…AA77` | ✅ |
| sharepoint | `03DACF6E…818E` | `03DACF6E…818E` | ✅ |
| nano-banana | `686A5019…04B6` | `686A5019…04B6` | ✅ |
| chrome-devtools | `5D3F3A02…5F10` | `5D3F3A02…5F10` | ✅ |
| bitwarden | `A60CCDCE…7F99` | `A60CCDCE…7F99` | ✅ |

### Project `.copilot/mcp-config.json` after init
Contains only `EXAMPLE-github`. **No `squad_state` entry.** ✅ (iter-7 contract: state MCP lives in HOME only.)

### `copilot --version`
`GitHub Copilot CLI 1.0.59.`

### Bare-copilot invocation
✅ **PASS** — `copilot --yolo --autopilot --agent squad -p "..."` worked natively. Copilot auto-loaded HOME mcp-config and exposed `squad_state_*-squad_state_write` / `squad_state_*-squad_state_read` tools without any wrapper.

### Orphan SHA timeline

**REMOTE (`origin/squad-state`):**
| step | sha |
|------|-----|
| PRE  | `<not-yet-created>` (branch absent on remote after fresh init) |
| POST1 | `<not-yet-created>` |
| POST2 | `<not-yet-created>` |
| POST3 | `<not-yet-created>` |

Δ remote = **0 / 0 / 0** — strict reading of criterion 7 ❌. No auto-push of state-mcp writes to `origin/squad-state` was observed; the only `squad sync` invocation path is the post-commit hook on main, which was never triggered because no main-branch commits happened during the sessions.

**LOCAL (`refs/heads/squad-state`):**
| step | sha (short) | Δ |
|------|-------------|---|
| init  | `e1a1711` (init orphan) | – |
| migrate | `303d992` (4 files migrated) | – |
| PRE (post-init, pre-S1) | `303d992` | – |
| POST1 | `f57fcde` Update sessions/iter7-smoke-s1 | **+1** ✅ |
| POST2 | `92ee15e` Update sessions/iter7-smoke-s2 | **+1** ✅ |
| POST3 | `f42b0b8` Update sessions/iter7-smoke-s3 | **+1** ✅ |

State content verified end-to-end:
- `sessions/iter7-smoke-s1` → `travel-assistant iter-7 session 1 completed`
- `sessions/iter7-smoke-s2` → `session 2 read s1 successfully`
- `sessions/iter7-smoke-s3` → `all sessions verified, orphan growth confirmed`

### MCP call counts (events.jsonl)
| session | sessionId | writes | reads | errors |
|---------|-----------|--------|-------|--------|
| S1 | `cba5532f-…` | 9 (sub-agent retries) | 0 | 0 |
| S2 | `8ae73ceb-…` | 4 | 4 | 0 |
| S3 | `ea84a36c-…` | 4 | 6 | 0 |

(S1's write count is inflated because the squad agent dispatched the work via task subagents that each emit an attempt.)

### SDK directory-mismatch bite (tamirdresher_microsoft/tamresearch1#3628)
**Inconclusive / cosmetic-only.** Copilot's `mcpServerName` field in every events.jsonl tool call was `squad_state_000b4a0e` (a stale orphan from an old temp-test fixture `…\.test-cli-import-target-f83adc10`), NOT the freshly-installed `squad_state_0d490fa9` for this project. Despite the wrong MCP-server NAME, the state-mcp backend resolved the actual project via `cwd` and wrote/read against the CORRECT local `squad-state` branch in `travel-assistant`. So:
- **Data correctness:** ✅ correct content stored, correct values read back
- **MCP routing display:** ❌ misleading — orphan-collision in HOME mcp-config (40+ `squad_state_*` entries; Copilot picks one deterministically and it's not the project-current one)
- **Practical impact:** Tamir's HOME has 40 historical `squad_state_*` entries; the SDK quirk means none of the per-project routing actually works on a name basis, only on cwd. Iter-7 does not regress this — it just exposes it more starkly because there's always a stale entry to "win" the resolution.

### events.jsonl samples

**S1 (`cba5532f`):**
```
{"type":"user.message","data":{"content":"Use the squad_state_write tool to store key 'sessions/iter7-smoke-s1' with value 'travel-assistant iter-7 session 1 completed'…
{"type":"assistant.message","data":{"toolRequests":[{"toolCallId":"toolu_vrtx_014Qaiti1521PvfEtCMNSHS6","name":"squad_state_000b4a0e-squad_state_write",…
{"type":"tool.execution_start","data":{"toolName":"squad_state_000b4a0e-squad_state_write","arguments":{"key":"sessions/iter7-smoke-s1","content":"travel-assistant iter-7 session 1 completed"},…
{"type":"hook.start","data":{"hookType":"postToolUse","input":{"sessionId":"cba5532f-…",…
{"type":"tool.execution_start","data":{"toolName":"task_complete","arguments":{"summary":"Stored `sessions/iter7-smoke-s1` = `travel-assistant iter-7 session 1 completed`"…
```

**S2 (`8ae73ceb`):**
```
{"type":"user.message","data":{"content":"Use squad_state_read to read 'sessions/iter7-smoke-s1' and confirm. Then squad_state_write 'sessions/iter7-smoke-s2' = 'session 2 read s1 successfully'…
{"type":"tool.execution_start","data":{"toolName":"squad_state_000b4a0e-squad_state_read","arguments":{"key":"sessions/iter7-smoke-s1"},…
{"type":"tool.execution_start","data":{"toolName":"squad_state_000b4a0e-squad_state_write","arguments":{"key":"sessions/iter7-smoke-s2","content":"session 2 read s1 successfully"},…
```

**S3 (`ea84a36c`):**
```
{"type":"user.message","data":{"content":"Use squad_state_read to read 'sessions/iter7-smoke-s1' and 'sessions/iter7-smoke-s2'…
{"type":"tool.execution_start","data":{"toolName":"squad_state_000b4a0e-squad_state_read","arguments":{"key":"sessions/iter7-smoke-s1"},…
{"type":"tool.execution_start","data":{"toolName":"squad_state_000b4a0e-squad_state_read","arguments":{"key":"sessions/iter7-smoke-s2"},…
{"type":"tool.execution_start","data":{"toolName":"squad_state_000b4a0e-squad_state_write","arguments":{"key":"sessions/iter7-smoke-s3","content":"all sessions verified, orphan growth confirmed"},…
```

## Surprises

1. **CLI tarball install failed when ordered SDK-first separately.** `npm install -g … sdk.tgz` then `npm install -g … cli.tgz` errored `ETARGET No matching version found for @bradygaster/squad-sdk@>=0.9.6-preview.` — the CLI's package.json semver range looks malformed (trailing dot), and npm tries the registry rather than the just-installed local SDK. **Workaround:** install both tarballs in one `npm install -g sdk.tgz cli.tgz` command, then npm resolves them together. Worth fixing in the CLI package.json before broader rollout.
2. **Orphan-collision in HOME mcp-config.** Tamir's HOME has 40+ historical `squad_state_*` entries (test fixtures, old temp dirs). Copilot CLI routes every `squad_state_write` call to a deterministic but project-unrelated one (`squad_state_000b4a0e`). Data integrity is fine (cwd-based resolution in the SDK saves us), but the display is wrong. Consider periodic HOME pruning OR have the SDK reject foreign-project MCP names.
3. **Remote auto-push gap.** The architecture commits to the local `squad-state` orphan branch correctly on every state-mcp write, but no remote push fires from inside the MCP server. The post-commit hook (`squad sync --quiet`) only runs on main-branch commits, so a pure-state-write session never reaches `origin/squad-state`. Recommend either: (a) state-mcp pushes after every write, or (b) document that the operator must commit something to main to trigger sync.
4. **`.copilot/mcp-config.json already exists — skipping` is correct iter-7 behavior** — confirms init does not stomp pre-existing project MCP servers and does not inject `squad_state` into project config.
