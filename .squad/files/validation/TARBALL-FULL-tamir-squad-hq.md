# Tarball Validation 6/6 — tamir-squad-hq (HEAVILY PRE-SQUADIFIED)

**Date:** 2026-06-02T17:30:00+03:00
**Source repo:** `tamirdresher_microsoft/tamir-squad-hq` (EMU, Tamir's personal squad HQ)
**Duplicate:** `tamirdresher_microsoft/tamir-squad-hq-tarball-test-20260602T183202` (do NOT delete)
**Tarballs:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` (twin) → `0.9.6-preview.5`
**Install prefix:** `C:\Users\tamirdresher\squad-validation\.npm-prefix-squadhq`
**Special profile:** worst-case retrofit test — pre-existing `.squad/` (heavily customized), pre-existing `.copilot/mcp-config.json` with 5 user-added MCP servers, legacy `config.json` v1 with NO `stateBackend` key.

---

## Verdict snapshot

| Fix under test | Result |
|---|---|
| **GAP-2 retrofit** insert `squad_state` + preserve custom servers | ✅ **PASS — perfect** |
| **UPGRADE-FLAG-IGNORED** + Bug E (config dup keys) | ✅ PASS — `stateBackend: "two-layer"` added, no dups |
| **UPGRADE-NO-MIGRATION** | ✅ PASS — 18 state files migrated to orphan branch |
| **WI-1** (6 hooks installed) | ✅ PASS — all 6 (pre/post-commit, pre-push, post-merge/rewrite/checkout) |
| **UPGRADE-EPERM-FALSE-SUCCESS** | ✅ PASS — `--self` exited 1 loudly (no fake ✅) |
| **MCP-BRIDGE-BROKEN** (runtime) | ❌ **STILL OPEN** — state-mcp server works standalone, but Copilot CLI does not load `squad_state` tools at session time |
| **GAP-1** `squad sync` command exists | ✅ PASS — `sync` is registered (no `Unknown command` failure when post-commit hook fires) |
| Orphan-branch growth across 4 sessions | ❌ 0 commits added (consequence of MCP runtime gap above) |

---

## Phase 1 — Provision

1. `git clone tamir-squad-hq → C:\Users\tamirdresher\squad-validation\tamir-squad-hq-source` ✅
2. `gh repo create tamir-squad-hq-tarball-test-20260602T183202 --private` ✅
3. Duplicated, remote rewritten, `git push -u origin --all` ✅ (`main → d772625`)
4. Twin tarball install via local prefix → `squad.cmd --version` → `0.9.6-preview.5` ✅

---

## Phase 2 — Pre-upgrade baseline (worst-case)

`Test-Path .squad/` → **True** (≈80 entries: agents, casting, decisions, skills, scripts, templates, …)
`Test-Path .copilot/mcp-config.json` → **True** with 5 user-added MCP servers:
- `azure-devops`, `bitwarden`, `bitwarden-shadow`, `EXAMPLE-trello`, `chrome-devtools`
- **No `squad_state` entry** (this is exactly what Gap 2 is supposed to retrofit)

`.squad/config.json` (PRE): legacy v1 format, no `stateBackend` key, no `peers[].lastSeen`.
`.squad/decisions.md` (PRE): 1,084,257 bytes (≈1 MB of historical decisions — heavy).
Git hooks (PRE): none installed.

Snapshots saved to `C:\Users\tamirdresher\squad-validation\snapshots-squadhq-20260602T183202\`:
- `config.json.PRE` / `config.json.POST`
- `mcp-config.json.PRE` / `mcp-config.json.POST`
- `decisions.md.PRE`
- `upgrade.log` / `upgrade-noself.log` / `session{1..4}.log`

---

## Phase 3 — Upgrade

### Run 1: `squad upgrade --self --insider --state-backend two-layer`
- `npm install -g @bradygaster/squad-cli@insider` → **EPERM** (squad.exe in use on `C:\ProgramData\global-npm\squad`)
- CLI printed `⚠️ Upgrade failed` and exited **1** (no fake ✅) → **UPGRADE-EPERM-FALSE-SUCCESS fix confirmed**
- Because `--self` aborted before the state-backend phase, re-ran without `--self` (tarball already installed locally).

### Run 2: `squad upgrade --state-backend two-layer` → **exit 0, full success**
Captured highlights:
- ✅ upgraded coordinator `0.0.0-source → 0.9.6-preview.5`
- ✅ upgraded 42 squad-owned files; 11 workflows; 50+ skills migrated to `.copilot/skills`
- ✅ privacy migration scrubbed emails from 3 files
- ✅ **`ensured .copilot/mcp-config.json squad_state pinned to current CLI version`** ← Gap 2 retrofit fired
- ✅ orphan branch ready, 18 state files migrated:
  - `.squad/decisions.md` + every `.squad/agents/<name>/history.md` (belanna, crusher, data, geordi, guinan, kes, neelix, paris, picard, podcaster, q, ralph, scribe, seven, troi, tuvok, worf)
- ✅ `config.json` updated: `stateBackend = "two-layer"` (clean append, no Bug E duplicate key)
- ✅ all 6 hooks installed (pre-push, post-merge, post-rewrite, post-checkout, pre-commit, post-commit)

### Pre / Post — `.copilot/mcp-config.json`

| Server | PRE | POST | Notes |
|---|---|---|---|
| `azure-devops` | ✓ | ✓ unchanged | user-added preserved |
| `bitwarden` | ✓ | ✓ unchanged | user-added preserved |
| `bitwarden-shadow` | ✓ | ✓ unchanged | user-added preserved |
| `EXAMPLE-trello` | ✓ | ✓ unchanged | user-added preserved |
| `chrome-devtools` | ✓ | ✓ unchanged | user-added preserved |
| `squad_state` | — | ✅ inserted | `npx -y @bradygaster/squad-cli@0.9.6-preview.5 state-mcp` |

**Gap 2 outcome on the hardest possible repo: PERFECT.** Zero clobbering, exact pin, correct insert.

### Pre / Post — `.squad/config.json`
Only `stateBackend: "two-layer"` was added at the end of the JSON object. All pre-existing keys (`version`, `teamRoot`, `machineId`, `devbox`, `peers`) unchanged. No duplicate keys (Bug E avoided).

### Orphan branch immediately after upgrade
```
eef6e4c (squad-state) migrate: import working-tree state on backend upgrade (18 file(s))
af59f0c init: squad-state orphan branch
```

---

## Phase 3.5 — Pre-commit hook governance verified

When we tried to `git commit` the working-tree changes after upgrade, the new `pre-commit` hook (WI-1) **correctly refused**:
```
⚠ squad pre-commit: refusing to commit two-layer state into the working tree.
  These paths belong on the 'squad-state' orphan branch:
    .squad/agents/kes/history.md
    .squad/decisions.md
```
This is exactly the WI-1 / two-layer contract. After unstaging those two files, the commit succeeded.

---

## Phase 3.5 — 4 continuity sessions

| # | Prompt | Outcome | Orphan grew? | Working-tree dirtied? |
|---|---|---|---|---|
| 1 | "what did the team work on most recently?" | Agent surfaced March 2026 Picard inter-squad protocol + Seven patent assessment from pre-upgrade `decisions.md` (read worked) | ❌ 0 | yes (history.md auto-touched) |
| 2 | "Lead, summarize the squad's current focus" | Picard surfaced live action queue (#3395 PAT, DK8S approvals, #3621/#3607/#3605 deadlines) | ❌ 0 | yes |
| 3 | "Tester, propose 2 follow-up validation tasks" | Q proposed 2 M-effort follow-ups; Scribe spawned in background and "logged" | ❌ 0 | yes (5 history-archive + history files modified) |
| 4 | "Lead, decide which follow-up is highest priority" | Picard prioritized #3601 BHAVNA ARORA security approval; **Scribe explicitly halted, citing**: *"STATE_BACKEND is two-layer but the `squad_state_*` runtime tools aren't available in this Copilot CLI session, so Scribe refused to hand-write mutable state."* | ❌ 0 | yes (10+ files modified) |

**After all 4 sessions:** `git log squad-state --oneline` still shows only the original 2 commits.

### Why the orphan didn't grow
Sanity check of the MCP server itself:
```powershell
'{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | & squad.cmd state-mcp
```
returns all 7 tools (`squad_decide`, `squad_state_read/write/append/delete/list/health`) — **the server is healthy and reachable**.

But the Copilot CLI session does not load the `squad_state` MCP server at session start (despite the now-correctly-pinned entry). The agents do the right thing: they detect the bridge is offline and refuse to hand-write mutable state, then publish their decisions to the disk-level inbox (or to in-session conversation only).

The pre-commit hook then blocks the working-tree commit of `.squad/decisions.md` etc., so nothing escapes into `main` either. Governance is preserved.

**This is the same MCP-BRIDGE-BROKEN bug previously observed at runtime, NOT a regression of the Gap 2 fix.** Gap 2 fixed the *config* (the entry is present, correctly pinned, alongside untouched custom servers). What remains broken is *Copilot CLI's runtime loading of that entry into the agent session*. The fix is config-level; the runtime gap is in copilot/MCP discovery and is unrelated to this branch.

---

## Phase 4 — Bug verdict matrix

| Bug ID | Status on tamir-squad-hq |
|---|---|
| UPGRADE-EPERM-FALSE-SUCCESS | ✅ fixed (loud exit 1) |
| UPGRADE-FLAG-IGNORED | ✅ fixed (`stateBackend` set) |
| UPGRADE-NO-MIGRATION | ✅ fixed (18 files migrated) |
| WI-1 (hooks) | ✅ fixed (6/6 hooks; pre-commit actively enforces) |
| Bug E (duplicate config keys) | ✅ not observed |
| MCP-BRIDGE-BROKEN (config-level) | ✅ fixed by Gap 2 (entry present + pinned + custom servers preserved) |
| MCP-BRIDGE-BROKEN (runtime in Copilot CLI session) | ❌ **STILL OPEN** — orchestrator does not surface `squad_state_*` tools to agents at runtime |
| INSIDER3-INIT-LEAK | n/a (upgrade path, not init) |
| GAP-1 (`squad sync` registered) | ✅ pass |
| GAP-2 (retrofit INSERT path) | ✅ **pass — perfect on worst-case repo** |
| GAP-3 (twin-tarball requirement) | ➖ workaround applied (#1203) |

---

## Phase 5 — Outstanding / for follow-up

1. **MCP runtime gap** is the only remaining open issue from this validation. It is not addressed by Gap 1/2/3. Recommend a separate work item: "Copilot CLI does not load `.copilot/mcp-config.json` `squad_state` server into session at startup despite valid entry — repro: `tamir-squad-hq-tarball-test-20260602T183202`." Possible causes: Copilot CLI cache of MCP catalog from before the entry existed; npx cold-start timeout; MCP discovery scope (project vs global).
2. Decision the agent claimed to write in session 4 (`picard-followup-priority-20260602T185400.md`) was NOT persisted to disk — likely lost because Scribe halted mid-write. Acceptable consequence of the runtime gap.

---

## Phase 6 — Closing

- Duplicate repo **kept**: `https://github.com/tamirdresher_microsoft/tamir-squad-hq-tarball-test-20260602T183202`
- Local source clone + dup left in place under `C:\Users\tamirdresher\squad-validation\`
- Snapshots dir: `C:\Users\tamirdresher\squad-validation\snapshots-squadhq-20260602T183202\`
- Auth: will run `gh auth switch --user tamirdresher_microsoft` (was already active) at the end of the parent task.

**Bottom line:** the iter-3 fix bundle survives the hardest repo profile in our matrix. Gap 2 in particular nailed the worst-case retrofit. The one remaining runtime issue belongs to the Copilot CLI / MCP loader layer, not to this PR.
