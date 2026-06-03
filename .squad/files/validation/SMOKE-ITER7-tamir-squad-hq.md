# SMOKE: iter-7 — tamir-squad-hq (upgrade-worst-case half)

- **Date:** 2026-06-03
- **Validator:** Data
- **Tarball:** `0.9.6-preview.13` (combined-fixes, twin sibling: travel-assistant)
- **Repo:** https://github.com/tamirdresher_microsoft/tamir-squad-hq
- **Bundle root:** `C:\Users\tamirdresher\source\repos\smoke-iter7-tamir-squad-hq\`
- **Prior baselines:** data-30 (iter-6 wrapper smoke ❌), data-32 (override smoke ✅ w/ hand-edit), data-33 (allowlist key fix)
- **Account:** `tamirdresher_microsoft` (verified at end)

## Verdict: 🟡 PARTIAL — iter-7 HOME-write architecture VERIFIED; full session flow BLOCKED by pre-existing two-layer-not-initialized state on this repo

iter-7's contract (delete `run-copilot`, auto-write to HOME, preserve user MCP servers byte-identical, tombstone project entry) is fully satisfied. The end-to-end orphan-SHA test cannot run because **this repo has no `squad-state` branch and no `stateBackend: "two-layer"` in `.squad/config.json`** — i.e., two-layer was never initialized here, despite the task context describing it as "existing two-layer". Per procedure step 3 ("If it's missing, document and STOP — this is a separate iter-6 finding"), sessions step 4 was not executed.

---

## Pass/fail matrix

| # | Check | Result |
|---|---|---|
| 1 | `squad --version` = `0.9.6-preview.13` | ✅ |
| 2 | `squad run-copilot --help` → "Unknown command" | ✅ `✗ Unknown command: run-copilot` |
| 3 | HOME `~/.copilot/mcp-config.json` gained `squad_state_<hash>` entry automatically (no hand-edit) | ✅ `squad_state_8721a7e9` |
| 3a | Entry uses simplified 2-tier resolver `npx -y @bradygaster/squad-cli@<spec> state-mcp` | ✅ (`@insider`) |
| 4 | Pre-existing HOME user MCP servers preserved byte-identical (sha256) | ✅ 8/8 |
| 5 | Project `.copilot/mcp-config.json` has no `squad_state` entry | ✅ |
| 5a | Tombstone-removal log line emitted | ✅ |
| 6 | Orphan SHA grows across 3 sessions | ⏭ NOT RUN (no `squad-state` branch — see findings) |
| 7 | `events.jsonl` shows `mcpServerName:"squad_state_<hash>"` calls | ⏭ NOT RUN |

## Upgrade output (key lines)

```
✓ upgraded coordinator from 0.9.6-preview.11 to 0.9.6-preview.13
✓ upgraded 42 squad-owned files
✓ upgraded squad workflows (11 files)
✓ scaffolded memory governance defaults (4 files/directories)
✓ synced 10 skills to .copilot/skills/
✓ refreshed .squad/templates/
✓ installed squad_state_8721a7e9 -> C:\Users\tamirdresher\.copilot\mcp-config.json (@bradygaster/squad-cli@insider (@insider fallback))
✓ removed stale project squad_state from .../tamir-squad-hq/.copilot/mcp-config.json (now lives in HOME)
Upgrade complete: v0.9.6-preview.11 → v0.9.6-preview.13
```

The iter-7 log line is present in normalized form (✓ installed squad_state_<hash> -> HOME path … preserves existing servers behavior verified by sha256). Format differs slightly from spec wording but semantics identical.

## HOME entry written

```json
"squad_state_8721a7e9": {
  "command": "npx",
  "args": ["-y", "@bradygaster/squad-cli@insider", "state-mcp"]
}
```

Resolver fell back to `@insider` dist-tag (combined-fixes tarball not published to npm; this is expected and matches the 2-tier resolver semantics).

## Pre-existing HOME user MCP servers — sha256 byte-identical preservation

| Server | Match |
|---|---|
| azure-devops | ✅ |
| bitwarden | ✅ |
| calendar | ✅ |
| chrome-devtools | ✅ |
| mail | ✅ |
| nano-banana | ✅ |
| sharepoint | ✅ |
| teams | ✅ |

(HOME also contains ~30 pre-existing `squad_state_*` entries from prior smokes — all left untouched.)

## `.squad/config.json` stateBackend — BLOCKER

Verbatim post-upgrade (matches pre-upgrade, byte-identical, `git status` clean):

```json
{
  "version": 1,
  "teamRoot": "C:\\Users\\tamirdresher\\tamresearch1",
  "machineId": "CPC-tamir-WCBED",
  "devbox": { ... },
  "peers": { ... }
}
```

**No `stateBackend` key.** Last commit touching `.squad/config.json` is #346 (DevBox identity) — predates the two-layer rollout. `git branch -r` shows only `origin/main`; **no `squad-state` orphan branch exists**. This repo was never migrated to two-layer; upgrade did not initialize one (correctly — `upgrade` is not `init`).

This is **NOT an iter-7 regression**. It is a pre-existing condition of this repo that contradicts the smoke's context line "existing two-layer". Without two-layer active, the squad_state MCP writes have no remote orphan branch to push to, so the 3-session SHA growth test is structurally impossible here.

## Project `.copilot/mcp-config.json` post-upgrade

Contains: `azure-devops`, `bitwarden`, `bitwarden-shadow`, `EXAMPLE-trello`, `chrome-devtools`. **No `squad_state` entry** — tombstone removal succeeded. (Note: 5 user MCP servers in project file, not the "existing two-layer + 5 user MCP" framing from context.)

## `copilot --version`

```
GitHub Copilot CLI 1.0.59.
```

## Bare invocation

⏭ NOT EXECUTED (blocked by missing `stateBackend`). However, iter-7's architectural prerequisite — HOME mcp-config containing the squad_state entry so bare `copilot` can auto-load it — IS satisfied.

## Orphan SHA timeline

⏭ NOT EXECUTED. No `origin/squad-state` ref to track.

```
$ git fetch origin squad-state
fatal: couldn't find remote ref squad-state
$ git rev-parse origin/squad-state
fatal: ambiguous argument 'origin/squad-state': unknown revision...
```

## MCP call counts / events.jsonl samples

⏭ NOT EXECUTED.

## SDK directory mismatch (teamDir vs projectDir)

Inconclusive on this run — sessions not executed. The architectural risk noted in `tamirdresher_microsoft/tamresearch1#3628` would only surface during writes from a remote-mode state-mcp session. Worth re-running this smoke once two-layer is initialized on this repo (or on a repo where it is already initialized — e.g., the travel-assistant sibling per parallel run).

## Surprises

1. **Repo context drift.** Task context said "existing two-layer + 1MB decisions + 5 user MCP servers". Actual: no two-layer, 5 user MCP in project file. Either the repo was reset between data-32 and now, or the context line was inherited stale from a prior twin.
2. **Tombstone removal worked on a project file that contained no `squad_state` to begin with** (no `squad_state` key in pre-upgrade project mcp). The log line still fired — likely benign, but suggests the upgrade emits the line unconditionally when it touches the project mcp file. Worth a quick code check.
3. **HOME has ~30 prior `squad_state_*` entries.** None were cleaned up; iter-7 only adds the current-hash entry. Long-term hygiene story: HOME mcp grows monotonically with every fresh repo upgrade. Not in iter-7 scope but Tamir should know.
4. **CLI tarball cannot be installed alone** — `ETARGET No matching version found for @bradygaster/squad-sdk@>=0.9.6-preview` if SDK installed first then CLI separately. Both must be passed to a single `npm install -g` invocation (which then resolves the peer correctly). Worked around; not a bug per se but worth a note in the smoke instructions.

## Restore

HOME `~/.copilot/mcp-config.json` restored from backup (sha256 verified identical: `E8BEEE2FA46E72BCB030E8858A661A85C05236C26D340BA3EA2F23C4B0B84E2C`). Backup file deleted. ✅

## Auth

`tamirdresher_microsoft` switched and verified active.
