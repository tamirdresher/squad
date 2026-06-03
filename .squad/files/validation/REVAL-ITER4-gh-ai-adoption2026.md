# RE-VAL Iteration 4 — tamirdresher/gh-ai-adoption2026 vs preview.8/.9

**Date:** 2026-06-02T213308+03:00
**Agent:** Data (iter-4 re-validation, parallel cohort 4/6)
**Source:** https://github.com/tamirdresher/gh-ai-adoption2026 (personal — cross-org clone)
**Dup A (fresh init):** https://github.com/tamirdresher_microsoft/gh-ai-adoption2026-tarball-test-iter4-20260602T213308 (private)
**Dup B (upgrade):** https://github.com/tamirdresher_microsoft/gh-ai-adoption2026-tarball-upgrade-iter4-20260602T213308 (private)
**Tarballs:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` (CLI version stamped `0.9.6-preview.9` — bundle re-packed after manifest header was written for preview.8)
**Local prefix:** `.npm-prefix-ghai-iter4`
**Copilot CLI:** 1.0.58
**squad-cli (after install):** 0.9.6-preview.9

---

## TL;DR

- **Build-time fixes confirmed working:** fresh `squad init --state-backend two-layer` and `squad upgrade --state-backend two-layer` both succeed end-to-end on this repo. Orphan branch created, 8 mutable state files lifted on upgrade, hooks installed, `mcp-config.json` written, dual-tag fallback (REGISTRY-PIN-UNPUBLISHED fix) verified — on upgrade the spec was rewritten to `@bradygaster/squad-cli@insider` because `0.9.6-preview.9` is not published.
- **Runtime MCP bridge still missing** for direct `copilot --agent squad -p "..."` invocations. Orphan SHA was unchanged across all 3 sessions (`f5f7a48f` → `f5f7a48f` → `f5f7a48f` → `f5f7a48f` = **0 commits**). Scribe self-reported the bridge as missing and refused to mutate state. This matches the alias-experiment finding: Copilot CLI 1.0.58 does not auto-load project `.copilot/mcp-config.json`; iter-4's wrap-fix injects `--additional-mcp-config` only into spawns from `squad watch` / `squad loop` / `squad triage`, not into user-spawned `copilot` processes.
- **Bottom line:** 🟢 GO for the build-time bundle. 🔴 MCP-RUNTIME unresolved for direct copilot invocation pattern (requires either (a) user adopting `squad watch`/`loop`/`triage` runners, (b) Copilot CLI auto-loading project mcp-config per upstream issue github/copilot-cli#3642, or (c) a future squad wrapper subcommand like `squad copilot ...`).

---

## Orphan SHA timeline (Dup A — fresh init)

| Event | squad-state SHA | Δ commits |
|---|---|---|
| Post-init (pre any session) | `f5f7a48f` | — (baseline) |
| Post-Session 1 (Simpsons team build) | `f5f7a48f` | **0** |
| Post-Session 2 (Lisa dashboard schema + squad_decide) | `f5f7a48f` | **0** |
| Post-Session 3 (Frink adoption-rate KPI + squad_decide) | `f5f7a48f` | **0** |
| **Total growth across 3 sessions** | | **0 commits** |

### Session 1 evidence
- Worktree mutated directly: 5 new agent dirs (apu, bart, frink, lisa, smithers) created with charter.md + history.md, `team.md` + `routing.md` + `casting/{registry,history}.json` modified, `decisions.md` seeded (675 B). All as **untracked / modified files in main**, none on orphan.
- `squad_state*` / `squad_decide` / `state-mcp` / `additional-mcp-config`: **zero mentions** in session transcript.
- Scribe was not spawned (state bridge unavailable).

### Session 2 evidence
- Direct agent quote: *"Spawning Scribe to log the session (it will gracefully skip mutations since the state bridge is missing)."*
- Scribe spawned and self-reported "state-bridge status" check failed; produced no commits.

### Session 3 evidence
- Direct agent quote: *"the runtime state bridge (`squad_decide` / `squad_state_*`) is not exposed in this session, and stateBackend is two-layer — so neither Frink nor I may hand-write `.squad/decisions.md` or commit mutable state directly."*
- Coordinator correctly refused to bypass MCP and persist on disk — protocol intact, just nothing to commit.

---

## Phase 3 — Upgrade path (Dup B)

- **Pre-state:** `.squad/config.json` had `version: 1` (no `stateBackend` → defaults to local), no squad-state branch.
- `squad upgrade --state-backend two-layer`: clean success.
  - ✅ squad-state branch created (SHA `8902dc93`).
  - ✅ 8 mutable files migrated onto orphan: `decisions.md` + 7 `agents/*/history.md` (bernadette, howard, leonard, raj, ralph, scribe, sheldon — repo previously had Big Bang Theory team).
  - ✅ `config.json` updated to `stateBackend = two-layer`.
  - ✅ All 6 hooks installed (pre-push, post-merge, post-rewrite, post-checkout, pre-commit, post-commit).
  - ✅ `mcp-config.json` rewritten; `squad_state` entry now uses fallback spec `{command: 'npx', args: ['-y', '@bradygaster/squad-cli@insider', 'state-mcp']}` — **REGISTRY-PIN-UNPUBLISHED fix verified** (running version preview.9 isn't on npm, so falls back to `insider` dist-tag).
- No EPERM, no migration-aborted-on-self-upgrade-failure, no SDK ETARGET (twin install).

---

## Phase 4 — Bug verdict matrix

| ID | Iteration | Fix | Verdict on this repo | Evidence |
|---|---|---|:-:|---|
| UPGRADE-EPERM-FALSE-SUCCESS | 1 | `selfUpgradeCli` throws on EPERM | n.a. | EPERM not triggered (twin tarballs installed under local prefix) |
| UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION | 1 | migrate-backend orphan plumbing | ✅ | 8 files lifted onto squad-state on upgrade; `config.json` updated |
| WI-1 (commit hooks) | 1 | 6 hooks installed | ✅ | post-upgrade install reported all 6 hooks installed |
| MCP-BRIDGE-PINNED (init) | 2 | `buildMcpServerSpecs(cliVersion)` | ✅ | Fresh `squad init` wrote pinned `@bradygaster/squad-cli@0.9.6-preview.9` entry |
| INSIDER3-INIT-LEAK | 2 | `liftInitMutableStateOntoOrphan` after install hooks | ✅ | Fresh init: no `decisions.md` orphaned in worktree before commits |
| GAP-1 (`squad sync` command exists) | 3 | wired into `cli-entry.ts` | ✅ | `squad --help` lists `sync` subcommand |
| GAP-2 (MCP retrofit INSERT) | 3 | `ensureSquadStateMcpPinned` overwrites | ✅ | Upgrade rewrote squad_state entry (saw insider fallback applied to retrofitted config) |
| REGISTRY-PIN-UNPUBLISHED (iter-4 Option A) | 4 | npm HEAD-check + `@insider` fallback | ✅ | mcp-config on Dup B shows `@bradygaster/squad-cli@insider` (not preview.9), proving HEAD-check ran and fell through to insider dist-tag |
| EPERM-ABORTS-MIGRATION (iter-4 decouple) | 4 | continue migration on self-upgrade EPERM | n.a. | EPERM did not occur in this run |
| TIMESTAMP-COLON-LEAK (iter-4) | 4 | template instructs `:` → `-` in filenames | n.a. | No timestamped Scribe artifacts produced (Scribe didn't run) |
| **MCP-RUNTIME (project mcp-config not auto-loaded)** | 4 (wrap fix) | inject `--additional-mcp-config` on 10 squad spawn sites | **🔴 FAIL via this test pattern** | Direct `copilot --agent squad -p "..."` invocations are NOT wrapped by squad; orphan unchanged across 3 sessions; both Scribe and Coordinator explicitly reported bridge missing. Wrap fix scope ≠ user's direct-copilot pattern. |

**Counts:** ✅ 7 confirmed · 🔴 1 unresolved · n.a. 3 (preconditions absent).

---

## Bottom line + iter-5 ask

**Build-time bundle:** GO — every fix that has a precondition met on this repo verified clean.

**MCP-RUNTIME residual:** The iter-4 wrap fix is correct but scoped only to squad-internal copilot spawns (`watch`, `loop`, `triage`, `copilot-bridge`). The validation directive's canonical invocation `copilot --yolo --autopilot --agent squad -p "..."` is **user-launched** and bypasses the wrapper entirely. Two non-overlapping iter-5 work items:

1. **squad copilot `<args>`** subcommand (or `squad shell`) — a thin wrapper that exec's copilot with `--additional-mcp-config @<teamRoot>/.copilot/mcp-config.json` pre-mixed. Documented as the recommended entry point. ~20 LOC + help text + tests.
2. **Upstream gate:** track github/copilot-cli#3642 — if 1.0.59+ auto-loads project mcp-config, both the wrapper and the `squad copilot` subcommand become redundant; remove or leave as a no-op compatibility shim.

Until either lands, downstream documentation should warn users not to use bare `copilot --agent squad` for orchestrated work on two-layer/orphan backends — they will silently lose state.

---

## Artifacts (under each dup's `validation/`)

**Dup A:** 10-init.log · 11-pre-orphan-sha.txt · 12-mcp-config-iter4.json · 13/14/15-versions · 20-session1.log · 21-post-session1-sha.txt · 22-session1-orphan-commits.txt · 23-session2.log · 24-post-session2-sha.txt · 25-session3.log · 26-post-session3-sha.txt · 27-orphan-sha-timeline.txt

**Dup B:** 30-upgrade.log · 31-post-upgrade-sha.txt

---

## Auth restoration

End-state: `gh auth switch --user tamirdresher_microsoft` re-asserted in closing phase.
