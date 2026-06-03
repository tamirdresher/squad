# Re-Validation Iter-4 — tamir-squad-hq (Tamir's HQ, WORST-CASE)

**Date:** 2026-06-02T21:50:00+03:00
**Author:** Data
**Branch under test:** `squad/state-backend-upgrade-fixes` (twin tarballs, version `0.9.6-preview.9`)
**Copilot CLI:** 1.0.58
**Target dup:** https://github.com/tamirdresher_microsoft/tamir-squad-hq-tarball-test-iter4-20260602T213310
**Mission scope:** Upgrade-path PRIORITY (this repo is already heavily squadified — Tamir's actual HQ).

---

## TL;DR

The build-time fixes work end-to-end on the worst-case repo. **The end-user delivery still fails** because Copilot CLI 1.0.58 silently ignores `.copilot/mcp-config.json` for direct `copilot ...` invocations, and the iter-4 MCP wrapper only intercepts squad-spawned copilot processes — not the canonical user invocation. Orphan branch did not grow across any of the 4 continuity sessions.

- ✅ All 5 pre-existing user MCP servers preserved verbatim (azure-devops, bitwarden, bitwarden-shadow, EXAMPLE-trello, chrome-devtools).
- ✅ `squad_state` entry retrofitted into `.copilot/mcp-config.json` in **iter-4 form**: `npx -y @bradygaster/squad-cli@insider state-mcp` (dist-tag, not unpublished pin).
- ✅ Upgrade migrated 18 state files (decisions.md ~1MB + 17 agent histories) onto orphan `squad-state` cleanly; static files preserved on disk.
- ✅ `stateBackend: two-layer` set in config; pre-existing `teamRoot`/`peers`/`devbox` config preserved.
- ✅ 6 git hooks installed (pre-commit, post-commit, pre-push, post-merge, post-rewrite, post-checkout).
- ✅ Self-upgrade EPERM did **not** abort the state-backend migration (UPGRADE-EPERM-FALSE-SUCCESS fix confirmed).
- ❌ **ORPHAN-GROWTH-MID-SESSION still fails** for direct `copilot --agent squad -p "..."` — orphan SHA frozen at `deb2d49b` across all 4 sessions.
- ❌ **MCP-RUNTIME tools unavailable** to coordinator in all 4 sessions — 3/4 sessions explicitly logged the "runtime state tools unavailable" message; the 4th never spawned Scribe.

**End-to-end delivery verdict: ❌ NO-GO for end-user-facing workflow.** Build-time gates pass; runtime bridge still broken for the canonical invocation path.

---

## Phase 1 — Pre-Existing State (snapshot before any squad command)

| Artefact | Value |
|---|---|
| `.squad/` file count | 844 |
| Agent directories | 18 (incl. `_alumni` + 17 personas: belanna, crusher, data, geordi, guinan, kes, neelix, paris, picard, podcaster, q, ralph, scribe, seven, troi, tuvok, worf) |
| `decisions.md` size | 1,084,257 bytes (~1.03 MB) |
| `.copilot/mcp-config.json` | 1,526 bytes; **5 user MCP servers** (azure-devops, bitwarden, bitwarden-shadow, EXAMPLE-trello, chrome-devtools); **no `squad_state` entry** |
| `.squad/config.json` | `version: 1`, `teamRoot: C:\Users\tamirdresher\tamresearch1`, `machineId`, devbox config, peers map. **No `stateBackend` field.** |
| Orphan `squad-state` branch | absent |
| Git hooks installed | none (besides `.sample`) |
| Source main HEAD | `d772625` |

Snapshots: `validation/pre-mcp-config.json`, `validation/pre-squad-tree.txt`, `validation/pre-decisions.md`.

---

## Phase 2 — Upgrade Migration

**Command:** `squad upgrade --self --insider --state-backend two-layer`
**Exit code:** 1 (because self-upgrade hit EPERM — but state-backend migration still completed)
**Full log:** `validation/upgrade-stdout.log`

### Behaviour observed (in order)

1. `--self --insider` self-upgrade attempted via `npm install -g @bradygaster/squad-cli@insider` → EPERM on `C:\ProgramData\global-npm\squad`.
2. ✅ **UPGRADE-EPERM-FALSE-SUCCESS fix engaged:** "Self-upgrade failed: ... Continuing with --state-backend migration. Self-upgrade can be retried separately."
3. ✅ Coordinator upgraded `0.0.0-source` → `0.9.6-preview.9`.
4. ✅ 42 squad-owned files refreshed.
5. ✅ 11 squad workflow files refreshed.
6. ✅ Privacy migration scrubbed email addresses from 3 files.
7. ✅ 51 skills migrated to `.copilot/skills/` (this repo had many pre-existing skills under `.squad/skills/`).
8. ✅ `.gitignore` ensured (3 entries added).
9. ✅ Memory governance defaults scaffolded.
10. ✅ 10 skills synced to `.copilot/skills/`.
11. ✅ Templates refreshed.
12. ✅ **MCP retrofit (Gap-2 fix):** "ensured .copilot/mcp-config.json squad_state pinned to @bradygaster/squad-cli@insider" — entry **inserted** alongside the 5 pre-existing user servers; none altered.
13. ✅ State migration: `local → two-layer`. `squad-state` orphan branch ready. **18 state files migrated:** `decisions.md` + 17 agent histories.
14. ✅ `config.json` updated: `stateBackend: two-layer` appended; all pre-existing fields preserved.
15. ✅ 6 git hooks installed.
16. ✅ Final non-zero exit re-reported the self-upgrade failure with the correct messaging.

### Post-upgrade snapshots

`validation/post-mcp-config.json` shows the **6** mcpServers in this order: azure-devops, bitwarden, bitwarden-shadow, EXAMPLE-trello, chrome-devtools, **squad_state**. Diff vs pre is exactly **one inserted block** with shape:

```json
"squad_state": {
  "command": "npx",
  "args": ["-y", "@bradygaster/squad-cli@insider", "state-mcp"]
}
```

This is the **iter-4 form** (dist-tag fallback) — *not* the unresolvable npx pin (`@0.9.6-preview.5`) that broke iter-3.

`validation/post-config.json` shows `stateBackend: two-layer` appended at end; no other keys mutated, no duplicate keys.

Orphan state:

```
$ git rev-list --count squad-state          # 2
$ git log squad-state --oneline -n 5
deb2d49 (squad-state) migrate: import working-tree state on backend upgrade (18 file(s))
6300e5a init: squad-state orphan branch
```

POST-UPGRADE orphan SHA: **`deb2d49b9604325259b9b14bdfd2717eaf67e5c7`** (the reference baseline for all 4 sessions).

---

## Phase 2.5 — 4 Continuity Sessions

Canonical invocation each time: `copilot --yolo --autopilot --agent squad -p "<prompt>"`.

| # | Prompt | Pre SHA | Post SHA | Grew? | Coordinator reported MCP tools available? | Scribe persist? |
|--:|---|---|---|:-:|:-:|:-:|
| 1 | "what did the team work on most recently?" | `deb2d49b` | `deb2d49b` | ❌ | not tested by agent (no Scribe spawn) | ❌ |
| 2 | "Lead, summarize the squad's current focus" | `deb2d49b` | `deb2d49b` | ❌ | ❌ "Scribe found the runtime state tools unavailable in this environment and correctly stopped without mutating anything" | ❌ |
| 3 | "Tester, propose 2 follow-up validation tasks" | `deb2d49b` | `deb2d49b` | ❌ | ❌ "the `squad_state_*` runtime tools aren't bound in this environment (expected for `two-layer` backend without the bridge)" | ❌ |
| 4 | "Lead, decide which follow-up is highest priority" | `deb2d49b` | `deb2d49b` | ❌ | ❌ "`stateBackend` in `.squad/config.json` is `two-layer`, but no `squad_state_*` runtime bridge is available in this environment" | ❌ |

**Orphan timeline file:** `validation/orphan-timeline.txt`. **4 transcripts:** `validation/session{1..4}-transcript.log`.

### Cross-session interpretation

This matches the **alias experiment** finding (Data-16, see `.squad/files/validation/ALIAS-EXPERIMENT-VERDICT.md` in squad-squad): Copilot CLI 1.0.58 does not auto-load the project-level `.copilot/mcp-config.json`. The iter-4 MCP-NOT-AUTOLOADED fix wraps copilot invocations spawned **by squad** (`packages/squad-cli/src/cli/core/copilot-invocation.ts` + 10 spawn sites in watch/loop/bridge/PTY) — but **not** the canonical end-user invocation `copilot --yolo --autopilot --agent squad -p "..."` where the user calls `copilot` directly. The retrofit fix is correct as a config artefact and necessary; it is **not sufficient** until `--additional-mcp-config` is applied to direct invocations as well (either by a `squad copilot` wrapper subcommand, by Copilot CLI being fixed upstream — github/copilot-cli#3642 — or by writing the entry into user-level `~/.copilot/mcp-config.json`).

---

## Phase 3 — Bug Verdict Matrix

| Bug ID | Severity | Build-time evidence | Runtime evidence on this repo | Verdict |
|---|---|---|---|---|
| **UPGRADE-EPERM-FALSE-SUCCESS** | P0 | `selfUpgradeFailed` flag honoured; state migration ran after EPERM; exit 1 raised at end | ✅ all 18 files migrated despite EPERM | ✅ FIXED |
| **UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION** | P0 | `--state-backend two-layer` triggered actual migration; orphan created; config updated | ✅ orphan + 18 files + config | ✅ FIXED |
| **GAP-2 / MCP-RETROFIT (insert path)** | P0 | Helper INSERTED `squad_state` entry into pre-existing config (5 user servers preserved) | ✅ post snapshot shows 6 entries, 5 originals byte-identical | ✅ FIXED |
| **REGISTRY-PIN-UNPUBLISHED (iter-4)** | P0 | npm registry HEAD-check + dist-tag fallback in `resolveSquadStateMcpSpec` | ✅ retrofitted entry uses `@insider` (resolvable) rather than `@0.9.6-preview.9` (unpublished); preview.9 would ETARGET | ✅ FIXED |
| **WI-1 / commit hooks** | P0 | 6 hooks installed (all backends) | ✅ all 6 present | ✅ FIXED |
| **State-backend migration integrity** | P0 | Static files preserved, mutable files lifted | ✅ 17 histories + decisions.md (~1MB) all on orphan; nothing in working tree | ✅ FIXED |
| **Custom user MCP servers preserved** | P0 (Gap-2 corollary) | Retrofit only inserts squad_state; never mutates existing keys | ✅ azure-devops, bitwarden, bitwarden-shadow, EXAMPLE-trello, chrome-devtools verbatim | ✅ FIXED |
| **Large-scale migration integrity (worst case)** | P0 | 1MB decisions.md + 17 histories migrated atomically | ✅ all 18 files visible via `git ls-tree squad-state`; no truncation, no merge artefacts | ✅ FIXED |
| **MCP-NOT-AUTOLOADED (iter-4 wrap)** | P0 | Wrapper exists for squad-spawned copilot processes | ❌ Direct `copilot --agent squad -p "..."` invocations bypass the wrapper; 4/4 sessions show tools unavailable | ❌ **PERSISTS for end-user path** |
| **ORPHAN-GROWTH-MID-SESSION (END-USER PROOF)** | P0 | n/a — pure runtime | ❌ Orphan SHA `deb2d49b` frozen across all 4 sessions; 0 commits added | ❌ **PERSISTS** |
| **MCP-RUNTIME tool availability** | P0 | n/a — pure runtime | ❌ 3/4 sessions explicitly logged tools unavailable; 4th didn't even try | ❌ **PERSISTS** |

---

## Phase 4 — Pre/Post mcp-config.json (verbatim, for audit)

### PRE (1,526 bytes — 5 user MCP servers)

See `validation/pre-mcp-config.json`. Top-level key order: `azure-devops`, `bitwarden`, `bitwarden-shadow`, `EXAMPLE-trello`, `chrome-devtools`. No `squad_state` key.

### POST (1,605 bytes — 6 entries, iter-4 form)

See `validation/post-mcp-config.json`. Order: 5 originals byte-identical, then a single new entry appended:

```json
"squad_state": {
  "command": "npx",
  "args": [
    "-y",
    "@bradygaster/squad-cli@insider",
    "state-mcp"
  ]
}
```

**Diff summary:** exactly one block inserted; zero bytes changed in any of the 5 pre-existing entries. This is the iter-4 form — `@insider` dist-tag, resolvable on the public npm registry today, regardless of whether `0.9.6-preview.9` is ever published.

---

## Phase 5 — Recommendations / Iter-5 scope

1. **Wrap direct `copilot` invocations.** The iter-4 wrapper only intercepts squad-spawned copilot processes. Either (a) ship a `squad copilot <args...>` subcommand that pre-mixes `--additional-mcp-config @<teamRoot>/.copilot/mcp-config.json` so users can use `squad copilot --yolo --autopilot --agent squad -p "..."` as the canonical entry point; or (b) write the `squad_state` entry into `~/.copilot/mcp-config.json` instead of project-level (with cross-project pollution caveats). Track via github/copilot-cli#3642.
2. **Document the current workaround** in the squad README: until upstream is fixed, end users must call `copilot --additional-mcp-config "$(cat .copilot/mcp-config.json)" --agent squad -p "..."`. This is brittle but unblocks the runtime bridge today.
3. **All build-time gates are GREEN on this repo** despite it being the worst case (1MB decisions.md, 17 histories, 5 pre-existing user MCP servers, pre-squadified). Recommend merging the build-time fixes immediately while iter-5 closes the runtime wrap-direct-invocation gap.

---

## Artefacts (all under `validation/`)

- `pre-mcp-config.json`, `post-mcp-config.json` — diff proves 5 user servers preserved + iter-4 form
- `pre-decisions.md` — 1 MB pre-existing, proves migration scale
- `pre-squad-tree.txt` — full pre-upgrade `.squad/` listing
- `post-config.json` — proves `stateBackend: two-layer` appended, other keys intact
- `orphan-sha-00-post-upgrade.txt` — baseline `deb2d49b`
- `orphan-timeline.txt` — all 8 pre/post SHAs across the 4 sessions (all identical)
- `upgrade-stdout.log` — full upgrade transcript
- `session1-transcript.log` … `session4-transcript.log` — full per-session transcripts; grep for "unavailable" / "aren't bound" / "no `squad_state_*` runtime bridge"
