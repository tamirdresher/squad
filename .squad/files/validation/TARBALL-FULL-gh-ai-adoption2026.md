# Tarball Validation 4/6 — gh-ai-adoption2026

**Date:** 2026-06-02T17:30:00+03:00
**Agent:** Data (Squad Framework Expert)
**Source repo:** https://github.com/tamirdresher/gh-ai-adoption2026 (personal, cross-org clone)
**Tarballs validated:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` @ `0.9.6-preview.5`
**Branch:** `squad/state-backend-upgrade-fixes` @ `a0fa7e3e`
**Duplicates created (kept — DO NOT DELETE per directive):**
- Fresh-init: `tamirdresher_microsoft/gh-ai-adoption2026-tarball-test-20260602-183150`
- Upgrade-path: `tamirdresher_microsoft/gh-ai-adoption2026-tarball-upgrade-20260602-190500`
**Install path used:** LOCAL prefix `C:\Users\tamirdresher\squad-validation\.npm-prefix-ghai2026` (global EPERM — `C:\ProgramData\global-npm\squad` locked by parallel agent)

---

## Phase 1 — Provision

| Step | Result |
|---|---|
| `git clone tamirdresher/gh-ai-adoption2026` | ✅ public, no auth issues despite cross-org |
| `gh repo create tamirdresher_microsoft/...test-...` | ✅ first attempt |
| Copy + remote re-point + `git push -u origin main` | ✅ |
| `gh repo create tamirdresher_microsoft/...upgrade-...` | ⚠️ GraphQL rate-limited; fell back to `gh api POST /user/repos` (REST) — ✅ |
| Global twin install | ❌ EPERM unlink `squad` (parallel-agent race) |
| Local-prefix twin install | ✅ 227 packages, 34s |
| `squad --version` (local) | `0.9.6-preview.5` ✅ |

Note: source repo already had a prior squad init (Big Bang Theory roster: Sheldon/Leonard/Howard/Raj/Bernadette). All subsequent fresh-init/lift behaviour was tested against a pre-existing `.squad/` tree — which is realistic and stresses the `liftInitMutableStateOntoOrphan` path harder than a virgin repo.

---

## Phase 2 — Fresh init `--state-backend two-layer`

### 2a. Init artifacts

| Check | Result |
|---|---|
| `.squad/config.json` → `stateBackend: "two-layer"` | ✅ |
| 6 hooks installed (`pre-commit`, `post-commit`, `post-checkout`, `post-merge`, `post-rewrite`, `pre-push`) | ✅ WI-1 verified |
| `squad-state` orphan branch created | ✅ SHA `a230634` |
| MCP `squad_state` entry pinned to `@bradygaster/squad-cli@0.9.6-preview.5` | ✅ **GAP-2 fix verified — insert path on init** |
| Pre-existing `EXAMPLE-github` MCP entry preserved | ✅ |
| Working tree after init | ⚠️ histories shown as `D` (deleted) because they were **lifted to orphan** — correct two-layer behaviour |
| Orphan-branch contents post-init | 10 files: `decisions.md` + 8 agent histories (Sheldon/Leonard/Howard/Raj/Bernadette/Ralph/Scribe/Rai) + new Rai entry — **INSIDER3-INIT-LEAK fix verified** |

### 2b. 3 sessions — does the orphan grow?

| Session | Prompt | Agent output | Orphan SHA after | Δ |
|---|---|---|---|---|
| S1 | "build me a team from the Simpsons universe…" | Coordinator retired BBT → spawned Lisa/Bart/Homer/Smithers/Marge w/ charters + 12-line history seeds | `a230634` | **0** |
| S2 | "Lead, propose an adoption-metrics architecture" | Lisa wrote full 3-phase architecture, decision file, +1 skill, Scribe merged | `a230634` | **0** |
| S3 | "Tester, what edge cases break adoption percentage rollups" | Marge produced 7-category catalog, +1 skill, +1 decision, Scribe merged | `a230634` | **0** |

**Errors scanned:** zero `Unknown command`, zero `tool unavailable`, zero `MCP error`, zero `sync fail` strings in any session stdout. The post-commit hook ran silently → `squad sync --quiet` exited 0 → GAP-1 silent-failure is closed ✅.

**End-to-end Gap 1 — orphan growth across 3 sessions: ❌ ORPHAN DID NOT GROW.**

Why: Scribe wrote `decisions.md`, agent histories, and skill files **to the working tree on main**, then committed normally — 3 fresh main-branch commits accrued, but **the orphan branch was never touched again after the init lift**. The MCP bridge (`squad_state_*` tools) was *not* invoked by any agent in any session — every agent used plain FS write tools. This is the same end-to-end behaviour observed in peer-agent validations: the hook + pin fixes work mechanically, but the *behavioural* expectation that agents route mutable state through the MCP bridge is not enforced at the agent-prompt layer.

### 2c. Working-tree pre-commit enforcement

Pre-commit hook correctly **blocked** an attempt to commit `decisions.md` + histories until `SQUAD_SYNC_ACTIVE=1` was set — i.e. the two-layer guard is active and noisy (unlike iter-1 where it was silent). Good signal.

---

## Phase 3 — Upgrade path (`local` → `two-layer`)

Second duplicate. Used GLOBAL insider.3 squad for the baseline init, then LOCAL preview.5 squad for the upgrade.

### 3a. Baseline (insider.3, `--state-backend local`)

- `.squad/config.json` → `stateBackend: "local"` ✅
- Zero hooks installed (correct for `local`)
- No orphan branch (correct)
- 2 baseline sessions:
  - **up-S1:** "build a Star Wars team…" → Coordinator spawned Yoda/Kenobi/Cassian/Han/Leia (5 agents, full charters + histories)
  - **up-S2:** "Lead, sketch end-to-end data flow…" → Kenobi delivered architecture sketch, Scribe merged

### 3b. The upgrade itself — `squad upgrade --state-backend two-layer` (preview.5)

```
Migrating state backend: local → two-layer
  ✔ squad-state branch ready
  ✔ migrated 8 state file(s) onto squad-state branch:
      .squad/decisions.md
      .squad/agents/{cassian,han,kenobi,leia,ralph,scribe,yoda}/history.md
  ✔ config.json updated: stateBackend = two-layer
Installing squad sync hooks
  ✔ pre-push / post-merge / post-rewrite / post-checkout / pre-commit / post-commit — all 6 installed
Done. Squad state will sync automatically on push/pull.
✔ Migration complete. Backend is now 'two-layer'.
```

**This is a flagship win.** Against the iter-1 baseline behaviour (UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION + UPGRADE-EPERM-FALSE-SUCCESS + WI-1), this single command now:

| Behaviour | Iter-1 baseline | Preview.5 |
|---|---|---|
| Honours `--state-backend` flag | ❌ silently ignored | ✅ written to config |
| Creates orphan branch | ❌ never | ✅ `6b60e7b` init + `0b5357b` lift |
| Migrates pre-existing state | ❌ stranded on disk | ✅ 8 files lifted |
| Installs hooks | ❌ zero | ✅ all 6 |
| Pins MCP `squad_state` entry | ❌ left broken | ✅ inserts pinned entry alongside EXAMPLE-github |
| Exit-code contradictions | ❌ ⚠️ followed by ✅ | ✅ single clean ✔ chain |

### 3c. 2 continuity sessions post-upgrade

| Session | Prompt | Result |
|---|---|---|
| cont-S1 | "Tester, what edge cases do you see…" | Yoda delivered detailed edge-case breakdown. **Scribe halted at MCP pre-check:** `NO_SQUAD_STATE_COMMANDS` — the `squad_state_*` runtime bridge was not exposed in this Copilot session. Scribe correctly refused to hand-write mutable state and reported. |
| cont-S2 | "Lead, prioritize 3 edge cases for Phase 1" | Kenobi wrote prioritization decision file (`kenobi-phase1-edge-case-priority.md`, 4475 B, on disk in `inbox/`). **Scribe again halted** with the same `NO_SQUAD_STATE_COMMANDS` reason; offered to switch to local backend or enable bridge. |

**Continuity verdict:** decisions reached survive as inbox-file artefacts on disk, but neither merge nor cross-agent notification persisted to the orphan branch. This is exactly the **Gap 2 follow-on / NEW Gap 5** described below.

---

## Phase 4 — Bug verdict matrix

| ID | Description | Iter-1 status | Preview.5 status on this repo | Verdict |
|---|---|---|---|---|
| WI-1 | Commit hooks (pre-/post-commit) missing | ❌ | ✅ all 6 installed on both init **and** upgrade | **FIXED** |
| UPGRADE-EPERM-FALSE-SUCCESS | `squad upgrade` printed ✅ after ⚠️ | ❌ | ✅ single clean ✔ chain | **FIXED** |
| UPGRADE-FLAG-IGNORED | `--state-backend` ignored on upgrade | ❌ | ✅ config rewritten to `two-layer` | **FIXED** |
| UPGRADE-NO-MIGRATION | Pre-existing state stranded after upgrade | ❌ | ✅ 8 files lifted to orphan | **FIXED** |
| MCP-BRIDGE-BROKEN | Init wrote unpinned `npx @bradygaster/squad-cli state-mcp` → 0.9.4 (no command) | ❌ | ✅ pinned to `@0.9.6-preview.5` on init **and** upgrade | **FIXED at config level** — see Gap 5 caveat |
| INSIDER3-INIT-LEAK | SDK init wrote `decisions.md`/histories to working tree even for orphan/two-layer | ❌ | ✅ post-init lift moves them to orphan (verified on a repo that already had 6 pre-existing histories) | **FIXED** |
| GAP-1 (iter-3 fix) | `squad sync` subcommand missing → silent hook failure | ❌ | ✅ command registered; post-commit hook exits 0; **no** `Unknown command` in any of 5 session stdouts | **FIXED (mechanically)** |
| GAP-1 end-to-end | Does orphan grow as agents work? | n/a | ❌ orphan SHA unchanged across 3 fresh-init sessions and 2 continuity sessions | **OPEN — behavioural** |
| GAP-2 (iter-3 fix) | `ensureSquadStateMcpPinned` inserts entry | ❌ | ✅ insert verified on init (alongside pre-existing `EXAMPLE-github`) and on upgrade | **FIXED** |
| GAP-3 / #1203 | CLI tarball declares unpublished SDK | ❌ | ➖ workaround in use (twin install) | **OPEN — release-pipeline** |
| **GAP-5 (NEW)** | MCP pin to unpublished preview version (`@bradygaster/squad-cli@0.9.6-preview.5`) → `npx` ETARGET → bridge cannot start → Scribe halts with `NO_SQUAD_STATE_COMMANDS` | n/a | ❌ reproduced on the upgrade dup; also explains why **fresh-init sessions never grew the orphan** | **NEW — see below** |

### GAP-5 detail (NEW)

**Repro (run in either dup):**
```
npx -y @bradygaster/squad-cli@0.9.6-preview.5 state-mcp
# → npm error code ETARGET
# → No matching version found for @bradygaster/squad-cli@0.9.6-preview.5
```

**Root cause:** GAP-2's fix correctly pins the MCP server spec to the *currently-running* CLI version. For a published version this is exactly right and was the whole point of the fix. But during tarball-based testing (and any out-of-band install) the pinned version is **not** on npm, so the `npx -y` resolver fails and the bridge never starts. Copilot then advertises zero `squad_state_*` tools, Scribe correctly refuses to write, and the orphan branch can never grow from agent activity.

**Why peer agents may not have flagged this:** the bridge-down failure mode is identical from the agent's perspective whether the cause is "npx can't find the version" or "agents simply don't use the tools they have". On this repo both effects compound — but the *direct test* (`npx … state-mcp` from the shell) makes the npm-resolution cause concrete.

**Suggested fixes (out of scope for this validation):**
1. When the CLI is itself running from a tarball / dev build, *don't* pin to its version — pin to `latest` (the prior behaviour) or to a sentinel like `link://<install-path>` that resolves locally.
2. Alternative: also write a local `node_modules/.bin/squad-state-mcp` shim and reference it absolutely in the MCP config, bypassing `npx`.
3. Belt-and-suspenders: have `runEnsureChecks` probe the pinned spec with `npm view <spec>` at init/upgrade time and fall back to `latest` with a warning if ETARGET.

---

## Phase 6 — Closing

- ✅ Both duplicates **retained** (per directive — `gh-ai-adoption2026-tarball-test-20260602-183150` and `gh-ai-adoption2026-tarball-upgrade-20260602-190500`).
- ✅ `gh auth switch --user tamirdresher_microsoft` executed at end (see closing block).

## Counts

- **Fixed:** 8 P0 bugs (WI-1, UPGRADE-EPERM-FALSE-SUCCESS, UPGRADE-FLAG-IGNORED, UPGRADE-NO-MIGRATION, MCP-BRIDGE-BROKEN config-level, INSIDER3-INIT-LEAK, GAP-1 mechanical, GAP-2 insert path)
- **Open:** 2 (GAP-1 end-to-end behavioural, GAP-3 / #1203 unpublished SDK)
- **New:** 1 (GAP-5: pin-to-unpublished-version blocks MCP bridge in tarball/dev installs)

## Evidence files (in each dup's `validation/`)

Fresh-init dup:
- `01-init-stdout.txt` — `squad init --state-backend two-layer` output
- `02-post-init-state.txt` — config, hooks, orphan listing, MCP, working tree
- `03-orphan-sha-baseline.txt` — `a230634`
- `04-session1-stdout.txt`, `05-session2-stdout.txt`, `06-session3-stdout.txt` — full session transcripts
- `07-orphan-after-3-sessions.txt` — still `a230634`

Upgrade dup:
- `01-init-local-stdout.txt` — insider.3 baseline init
- `02-up-s1-stdout.txt`, `03-up-s2-stdout.txt` — pre-upgrade sessions
- `04-upgrade-stdout.txt` — `squad upgrade --state-backend two-layer` full output
- `05-cont-s1-stdout.txt`, `06-cont-s2-stdout.txt` — post-upgrade continuity sessions

---

**Verdict for the gh-ai-adoption2026 slice:** the *plumbing* fixes (hooks, upgrade migration, MCP config pinning, init lift, sync registration) all work as advertised. The end-to-end *behavioural* loop (agents → MCP → orphan growth) is gated by GAP-5 (in tarball/dev installs) and by an agent-prompt-layer expectation gap (in any install). For production tarballs published to npm, GAP-5 evaporates and the gating reduces to the prompt-layer issue alone. Tarball is ✅ GO for further validation on the remaining repos.
