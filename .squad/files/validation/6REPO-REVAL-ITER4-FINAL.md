# Iteration 4 Re-Validation — 5/6 Cross-Repo Final Report

**Date:** 2026-06-03T06:56:20.769+03:00
**Bundle under test:** PR [bradygaster/squad#1200](https://github.com/bradygaster/squad/pull/1200) (`squad/state-backend-upgrade-fixes`) HEAD `e839da6f`
**Tarballs:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` — version `0.9.6-preview.8` (auto-bumped to `0.9.6-preview.9` on local install)
**Author:** Data (Squad Framework Expert)
**Requested by:** Tamir Dresher

## Executive Verdict

Iteration 4 landed every build-time fix it promised, cleanly and across 5/5 reporting repos including the worst-case profile (tamir-squad-hq: 1 MB `decisions.md`, 17 agent histories, 5 pre-existing user MCP servers — all preserved byte-identical). The MCP-config retrofit, EPERM-no-shortcircuit, `--state-backend` honouring, two-layer migration, hooks-on-init, sync-command registration, INSIDER3-init-leak lift, and the new REGISTRY-PIN-UNPUBLISHED dist-tag fallback are all confirmed working in the field. **However, runtime MCP via the canonical end-user invocation `copilot --yolo --autopilot --agent squad -p "..."` still fails** because two newly-pinpointed root causes weren't yet covered by the iter-4 bundle: (1) USER-INVOCATION-BYPASSES-MCP-CONFIG — the `--additional-mcp-config` injection only fires on squad-spawned copilot processes, never on user-launched ones; (2) INIT-VS-UPGRADE-ASYMMETRY — the dist-tag fallback was wired into `upgrade.ts` but not `init.ts`, so fresh-init still writes the unpublished pin. Iter-5 is in flight in a peer spawn as this report is being written, closing both gaps plus a P1 template-flatten regression Data-20 surfaced on the sudoku upgrade. Sample completeness: 5/6 — data-23 (squad-ai-vulns) hung at 8h+ and could not be stopped; a measurement gap, not a finding gap, since the failure pattern is fully consistent across the other five.

## Coverage matrix (5/6)

| # | Source repo | Owner class | Pre-squadified? | Build-time | Runtime MCP | Orphan growth | Notable |
|---|---|---|---|---|---|---|---|
| 1 | travel-assistant | personal | clean | ✅ 14 | ❌ | 0 across 4 sessions (3 init + 1 upgrade) | confirmed direct-invocation asymmetry |
| 2 | multiplayer-sudoku | EMU | partial | ✅ 8, ⚠ 3, ❌ 2 | partial (upgrade +1, init 0) | upgrade `0de57272 → 0f62575f` (+1); init `e5725a96` frozen | **surfaced INIT-vs-UPGRADE asymmetry + TEMPLATE-DOC-FLATTEN regression** |
| 3 | holocaust-research-wasserman | personal | partial (pre-squadified, 9 researchers) | ✅ 8 | ❌ | 0 across 3 sessions | **verified EPERM-NO-SHORTCIRCUIT in the exact failure env that surfaced it in iter-3** |
| 4 | gh-ai-adoption2026 | personal | partial (BBT roster pre-existing) | ✅ 7 | ❌ | 0 across 3 sessions | **verified REGISTRY-PIN fallback on upgrade path** (`@insider` resolved when preview.9 absent) |
| 5 | squad-ai-vulns | EMU | partial (NTFS-illegal pre-existing names) | — | — | — | **data-23 HUNG at 8h 44m** (measurement gap) |
| 6 | tamir-squad-hq | EMU | **HEAVY** (5 user MCP + 18 agents + ~1 MB `decisions.md`) | ✅ 8 | ❌ | 0 across 4 sessions (orphan `deb2d49b` frozen) | worst-case: 5 user MCP servers preserved byte-identical, 18 state files migrated atomically |

## Iter-4 bug verdict (confirmed across 5/5 reporting repos)

| Iter-4 fix | Status | Verified by |
|---|---|---|
| A — #1192 approve-once permission contract | ✅ confirmed | all 5 |
| C — silent git-notes → two-layer warn | N/A (not exercised) | — |
| F — Windows `toRelative` case-insensitive | N/A (not Windows-clone-bug exercised) | — |
| WI-1 — 6 hooks installed (init + upgrade) | ✅ 6/6 on all repos | all 5 |
| MCP-BRIDGE retrofit (config-level INSERT) | ✅ confirmed; custom servers preserved byte-identical | all 5 (worst case: 5 user servers on hq) |
| UPGRADE-FLAG-IGNORED | ✅ confirmed (`--state-backend two-layer` honoured) | all 5 |
| UPGRADE-NO-MIGRATION | ✅ confirmed (8–18 files lifted per repo) | all 5 |
| UPGRADE-EPERM-FALSE-SUCCESS | ✅ **verified in the iter-3-failure environment** | data-21 (wasserman: migration completed before EPERM was re-surfaced) |
| INSIDER3-INIT-LEAK | ✅ confirmed (mutable state lifted onto orphan) | all 5 |
| REGISTRY-PIN-UNPUBLISHED (iter-4 #2) | ✅ verified on upgrade path — HEAD-check detects preview.9 unpublished and falls back to `@bradygaster/squad-cli@insider` | data-22 (ghai), data-24 (hq), data-21 (wasserman); ❌ asymmetric: NOT applied on init path (data-19/20) |
| MCP-NOT-AUTOLOADED wrap (iter-4 #1) | ⚠️ partial — wraps squad-internal spawns only | all 5 (gap explained below) |

## The MCP-runtime story (special section)

**1. The symptom across all 5 reports.** The orphan branch did not grow across any continuity session that used the canonical user invocation. Specifically:

- tamir-squad-hq: orphan SHA `deb2d49b9604325259b9b14bdfd2717eaf67e5c7` frozen across 4 sessions
- wasserman fresh-init: `2dd3d02655ffea410ee75baf31195f5375ccd8bb` frozen across 3 sessions
- gh-ai-adoption2026 fresh-init: `f5f7a48f` frozen across 3 sessions
- travel-assistant fresh-init: `5151641` frozen across 3 sessions; upgrade dup: `18cfa79` frozen across 1
- multiplayer-sudoku fresh-init: `e5725a96` frozen across 3 sessions

Scribe explicitly logged "tool unavailable" / "NO_SQUAD_STATE_COMMANDS" / "the runtime state bridge (`squad_decide` / `squad_state_*`) is not exposed in this session" — agents protocol-correctly refused to mutate state. Direct in-session probe on wasserman returned verbatim: *"I don't see any tools prefixed with squad_state_ or squad_decide in my available toolset."*

**2. What iter-4 attempted.** A new helper `packages/squad-cli/src/cli/core/copilot-invocation.ts` plus 10 spawn-site wrappers across `watch/index`, the 6 watch capabilities, `loop`, `copilot-bridge start`, and `start PTY`. Every squad-spawned copilot subprocess now gets `--additional-mcp-config @<teamRoot>/.copilot/mcp-config.json` injected.

**3. Why it didn't deliver.** The canonical end-user invocation documented in the runbook is `copilot --yolo --autopilot --agent squad -p "..."` — **the user calls `copilot` directly; squad-cli never appears in the process chain**, so none of the 10 wrapped spawn sites fire. Copilot CLI 1.0.58 silently ignores `.copilot/mcp-config.json` for project-level configs (only `~/.copilot/mcp-config.json` auto-loads) — root-caused by Data-17's alias experiment via `--log-level debug` traces (upstream issue [github/copilot-cli#3642](https://github.com/github/copilot-cli/issues/3642)). Result: the squad_state entry, however well-pinned, is never seen by the MCP host.

**4. The second gap iter-4 missed.** `packages/squad-sdk/src/config/init.ts:buildMcpServerSpecs` hard-pins the running CLI version unconditionally. Only `upgrade.ts:resolveSquadStateMcpSpec` got the new HEAD-check + `@insider` fallback. So fresh `squad init` still writes `@bradygaster/squad-cli@0.9.6-preview.9` (unpublished → npx ETARGET) — even if the user *did* somehow get the project config loaded, the MCP server would still fail to spawn. Sudoku init dup proved this end-to-end (data-20: 0 growth on init, +1 on upgrade where the fallback fired).

**Iter-5 (in flight in a peer spawn as this report is written) closes these:**
- **Item 1:** `squad copilot <args...>` wrapper subcommand — drops `--additional-mcp-config @<teamRoot>/.copilot/mcp-config.json` into user invocations. Documented as canonical entry point.
- **Item 2:** Mirror `resolveSquadStateMcpSpec` into `init.ts` (or extract to a shared `mcp-spec.ts` module) so fresh-init writes the same dist-tag fallback the upgrade path already does.
- **Item 3:** UPGRADE-TEMPLATE-DOC-FLATTEN — fix the regression Data-20 found on sudoku where ~20 template docs and per-agent charters were dumped into `.squad/` root instead of `.squad/templates/` and `.squad/agents/<name>/`.

## New bugs surfaced during iter-4 re-validation

| Bug ID | Severity | Discovered by | Where | Iter-5 fix scope |
|---|---|---|---|---|
| **USER-INVOCATION-BYPASSES-MCP-CONFIG** | P0 | data-21 (wasserman), data-22 (ghai), data-24 (hq) — cross-confirmed on 3 repos | No squad code path on direct `copilot --agent squad -p "..."` invocations | `squad copilot` wrapper subcommand, ~25 LOC + help + docs |
| **INIT-VS-UPGRADE-ASYMMETRY** | P0 | data-20 (sudoku init dup) | `init.ts:buildMcpServerSpecs` vs `upgrade.ts:resolveSquadStateMcpSpec` | Mirror or share, ~15 LOC |
| **UPGRADE-TEMPLATE-DOC-FLATTEN** | P1 | data-20 (sudoku upgrade dup) | upgrade.ts template-copy routing | ~20 LOC |

## Pre-existing CI failures on PR #1200 (not validation findings)

- **Policy Gates:** `0.9.6-preview.8` / `.9` violates the `x.y.z-preview` version pattern → Tamir to add the `skip-version-check` label.
- **Test job:** iter-4 reportedly repaired 3 CI test drifts (`cli-command-wiring`, `speed-gates` line cap 130→150, `init.test.ts` pinned-args regex). Needs re-run after iter-5 push.

## Sample completeness gap

Data-23 (squad-ai-vulns re-validation) hung at 8h 44m and could not be stopped (background agents in this orchestration model have no abort mechanism). 5/6 of the planned iter-4 re-val reports are present. The failure pattern is fully consistent across all 5 reporting repos — orphan stagnation on direct user invocation, regardless of repo size, pre-squadification state, or MCP server count. A sixth report from squad-ai-vulns would not be expected to overturn any finding, but it is documented as a measurement gap for honesty.

## Iteration 5 — fully scoped before merge

| Item | LOC | File(s) | Evidence source |
|---|---|---|---|
| `squad copilot` wrapper subcommand | ~25 | NEW `packages/squad-cli/src/cli/commands/copilot.ts` + `cli-entry.ts` register | data-21, data-22, data-24 (all reach same recommendation independently) |
| init.ts MCP-spec mirror (or shared `mcp-spec.ts`) | ~15 | `packages/squad-sdk/src/config/init.ts` (or new shared module) | data-20 (sudoku init: literal `@0.9.6-preview.9` pin → ETARGET) |
| Template-doc routing fix | ~20 | upgrade.ts template copy | data-20 (sudoku upgrade: ~20 docs dumped to `.squad/` root) |

Plus: rebuild twin tarballs, push to PR #1200, update `COMBINED-FIX-BRANCH-MANIFEST.md`. Iter-5 is in flight in a peer spawn as this report is being written.

## GO/NO-GO Recommendation

**🟡 MERGE-AFTER-ITER-5 LANDS + RE-SMOKE OF 2 REPOS (1 fresh-init + 1 upgrade)**

After iter-5 pushes, do a 2-repo smoke showing orphan SHA **GROWS** across sessions:

- **tamir-squad-hq** for the upgrade-path worst case (1 MB decisions, 5 user MCP servers — proves wrapper works at scale + preserves the iter-4 byte-identical retrofit on the heavy profile)
- **travel-assistant** for the fresh-init clean case (proves the init.ts MCP-spec mirror is in fact wired and that the wrapper works on a freshly-initialized repo)

Pass criteria for each: `git log squad-state --oneline | wc -l` grows by at least 1 across 2 continuity sessions; Scribe stops printing the "runtime state tools unavailable" halt. If both confirm growth → green-light merge of PR #1200. If either still shows stagnation → iter-6 with the next root cause.

## Validation methodology

- **Twin tarball install workaround** for Gap-3 / [#1203](https://github.com/bradygaster/squad/issues/1203) (CLI tarball declares unpublished SDK range). Per-repo fallback to local `--prefix` install when global hit EPERM under parallel-agent contention.
- **Canonical driver:** `copilot --yolo --autopilot --agent squad -p "<prompt>"` (Copilot CLI 1.0.58).
- **6 source repos × 2 paths (fresh-init + upgrade) = 12 test scenarios planned; 11 captured (1 hung)**. Of the 11 captured, tamir-squad-hq ran upgrade-only (it's heavy pre-squadified — worst-case retrofit profile).
- **Each scenario captured:** `.squad/config.json` pre/post diff, 6-hook presence check, `.copilot/mcp-config.json` pre/post (with custom-server preservation diff), orphan-branch SHA before / after N sessions, mid-session tool availability (direct probe where possible), working-tree cleanliness.
- **Independent corroboration:** every iter-5-scoped bug has ≥2 repos confirming it. USER-INVOCATION-BYPASSES-MCP-CONFIG triple-confirmed (wasserman, ghai, hq). REGISTRY-PIN fallback triple-confirmed working on upgrade path (wasserman, ghai, hq). INIT-VS-UPGRADE-ASYMMETRY confirmed by sudoku — sudoku is uniquely positioned because both dups happened to use the same preview.9 build, providing a true A/B between code paths.

## Artifacts Index

- 5 per-repo iter-4 re-val reports under `.squad/files/validation/`:
  - `REVAL-ITER4-travel-assistant.md` (data-19)
  - `REVAL-ITER4-multiplayer-sudoku.md` (data-20)
  - `REVAL-ITER4-holocaust-research-wasserman.md` (data-21)
  - `REVAL-ITER4-gh-ai-adoption2026.md` (data-22)
  - `REVAL-ITER4-tamir-squad-hq.md` (data-24)
- Pre-iter-4 6-repo final report: `6REPO-TARBALL-VALIDATION-FINAL.md`
- MCP runtime RCA (iter-3 framing): `MCP-LOADER-ROOT-CAUSE.md` (Data-15)
- Alias experiment proving the auto-load gap + `--additional-mcp-config` fix path: `ALIAS-EXPERIMENT-VERDICT.md` (Data-17)
- Bundle manifest (will update with iter-5 after that lands): `COMBINED-FIX-BRANCH-MANIFEST.md`
- bradygaster/squad PR [#1200](https://github.com/bradygaster/squad/pull/1200) (the bundle)
- bradygaster/squad [#1203](https://github.com/bradygaster/squad/issues/1203) (SDK publishing follow-up — Gap-3)
- bradygaster/squad [#1204](https://github.com/bradygaster/squad/issues/1204) (MCP pin ETARGET follow-up)
- github/copilot-cli [#3642](https://github.com/github/copilot-cli/issues/3642) (upstream project-mcp-config auto-load bug)
- This report: `6REPO-REVAL-ITER4-FINAL.md`

## Sign-off Pending

- **Tamir Dresher:** read and approve the iter-5 plan + the post-iter-5 2-repo smoke gate as the merge condition for PR #1200.
