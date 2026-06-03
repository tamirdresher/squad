# SMOKE iter-6 — tamir-squad-hq

- **Date:** 2026-06-03T08:25:00+03:00
- **Validator:** Data
- **Tarball version verified:** `0.9.6-preview.12` (twin install: SDK + CLI from `C:\Users\tamirdresher\squad-validation\bradygaster-squad-{sdk,cli}-combined-fixes.tgz`)
- **Bundle / commit / PR:** `0.9.6-preview.12` / `9b5f377b` / PR #1200 on `squad/state-backend-upgrade-fixes`
- **Source repo (cloned & duplicated):** `https://github.com/tamirdresher_microsoft/tamir-squad-hq` → `tamirdresher_microsoft/tamir-squad-hq-smoke-iter6-20260603T081727`
- **Work dir:** `C:\Users\tamirdresher\source\repos\smoke-iter6-tamir-squad-hq\`
- **Local npm prefix:** `.\.npm-prefix\` (race-free EPERM-avoidance)
- **Prior iter-5 baseline:** `.squad/files/validation/SMOKE-ITER5-tamir-squad-hq.md` (Data, 2026-06-03 — FAILED at orphan growth because `npx @insider` pulled pre-iter-5 state-mcp; iter-6 was supposed to add local-install pinning to fix this)
- **Auth:** `tamirdresher_microsoft` (active) throughout — verified at end.

## Verdict

**❌ FAIL** — the iter-6 local-install pinning fix did **not engage** during upgrade. `.copilot/mcp-config.json → squad_state` was not rewritten; it remained on `npx @insider`, the byte hash is unchanged PRE→POST. The `[squad] state-mcp pinned to local install:` log line is **absent** from upgrade stdout. Per the binary pass criteria (ALL must hold), criteria #3 and #4 fail.

That said, the user-visible runtime behaviour on this worst-case repo is **dramatically improved** vs iter-5: 0 `State key not found` responses across all 3 sessions, 6 successful `squad_state_append` calls, Windows quoting clean. Those are real wins worth landing — but they alone don't satisfy the iter-6 pass criteria.

## Pass/fail criteria (binary)

| # | Criterion | Result |
|---|-----------|:------:|
| 1 | `squad --version` reports `0.9.6-preview.12` | ✅ |
| 2 | `squad run-copilot --help` exists; multi-word `-p` invokes cleanly with no `cmd /c '"…"'` workaround | ✅ |
| 3 | `.copilot/mcp-config.json → squad_state` uses `command:"node"` with absolute path to local `dist/cli-entry.js`; upgrade emits `[squad] state-mcp pinned to local install:` log line | ❌ |
| 4 | Orphan SHA monotonically advances PRE → POST1 → POST2 → POST3 | ❌ |
| 5 | `events.jsonl` shows `mcpServerName:"squad_state"` calls; **no** `State key not found` for ops that should succeed | ✅ |

**3 of 5 → FAIL.**

## Spec inspection — verbatim `squad_state` entry from `.copilot/mcp-config.json` (POST upgrade)

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

This is the **iter-5 form** (`@insider` dist-tag from the public npm registry), not the iter-6 expected form (`node <absolutePath>/dist/cli-entry.js state-mcp`). Note: the source dup already had the iter-5 form committed at the upstream `tamir-squad-hq`; the iter-6 upgrade should have rewritten it but did not — see "Root cause" below.

## `[squad] state-mcp pinned to local install:` log line

**ABSENT.** Full upgrade stdout (`artifacts/upgrade-stdout.log`):

```
✓ upgraded coordinator from 0.9.6-preview.11 to 0.9.6-preview.12
✓ upgraded 42 squad-owned files
✓ upgraded squad workflows (11 files)
✓ scaffolded memory governance defaults (4 files/directories)
✓ synced 10 skills to .copilot/skills/
✓ refreshed .squad/templates/
Upgrade complete: v0.9.6-preview.11 → v0.9.6-preview.12
Preserves user state: team.md, decisions/, agents/*/history.md
```

No mention of `state-mcp`, `pinned`, `squad_state`, or `mcp-config.json`. The string `pinned to local install:` does exist in the installed CLI source at `node_modules/@bradygaster/squad-cli/dist/cli/core/mcp-spec.js:84`, but the upgrade code path never reached that branch.

## Orphan SHA timeline

| Marker | Value                | Δ from prior |
|--------|----------------------|--------------|
| PRE    | `<not-yet-created>`  | —            |
| POST1  | `<not-yet-created>`  | 0 (no branch) |
| POST2  | `<not-yet-created>`  | 0            |
| POST3  | `<not-yet-created>`  | 0            |

`git ls-remote origin squad-state` returns empty across all 4 markers; `git for-each-ref refs/heads/squad-state` likewise returns empty. Local reflog shows only `main` activity since `clone`. The orphan branch **never existed** at any point during this smoke test — neither locally nor on origin.

Δ=0 at every transition → criterion #4 FAIL.

## Windows quoting

**✅ Clean.** All 3 sessions invoked as:
```
squad run-copilot --yolo --autopilot --agent squad -p "Append one sentence to .squad/decisions/inbox/smoke6-N.md."
```
…directly — no `cmd /c '"…"'` workaround, no double-quoting trick. Exit code 0 on every session, prompts arrived at copilot intact (verified in events.jsonl `user.message → content`). The iter-5 surprise (`shell:true` mangling on Windows) is **fixed** in iter-6. This is a real win.

## MCP events sample (representative, 8 lines across 3 sessions)

```
[db8bed2c sess1] tool.execution_start  toolName:"squad_state-squad_state_append"  arguments:{"key":"decisions/inbox/smoke6-1.md","content":"\nAppended via Squad coordinator at 2026-06-03T08:21:58+03:00..."}
[db8bed2c sess1] tool.execution_complete  toolCallId:toolu_vrtx_01K6LhNdzeBFArt6osK8eU4f  success:true  result:"State appended: decisions/inbox/smoke6-1.md"
[dcafabbe sess2] tool.execution_start  toolName:"squad_state-squad_state_append"  arguments:{"key":"decisions/inbox/smoke6-2.md","content":"\nSmoke iter6 check-in: coordinator confirmed decisions inbox append path..."}
[dcafabbe sess2] tool.execution_complete  toolCallId:toolu_vrtx_015983qyhkZnYGi6UgmxWL6q  success:true  result:"State appended: decisions/inbox/smoke6-2.md"
[6b21d15b sess3] tool.execution_start  toolName:"squad_state-squad_state_append"  arguments:{"key":"decisions/inbox/smoke6-3.md","content":"\nSmoke iteration 6 append at 2026-06-03T08:23:39+03:00 confirms..."}
[6b21d15b sess3] tool.execution_complete  toolCallId:toolu_vrtx_011PtsEJ24HkSMkJZ5wBeF6T  success:true  result:"State appended: decisions/inbox/smoke6-3.md"
[6b21d15b sess3] tool.execution_start  toolName:"squad_state-squad_state_health"  arguments:{}
[6b21d15b sess3] tool.execution_complete  toolName:"squad_state-squad_state_health"  success:true
```

All 3 sessions show `toolName:"squad_state-*"` with `mcpServerName:"squad_state"` — the MCP server is loaded, reachable, and functional. Full sample in `artifacts/events-sample.txt`.

## `State key not found` count

**0** across all 3 sessions (vs iter-5 which saw multiple). All `squad_state_append`, `squad_state_health`, and `squad_state_read` calls returned success. **Per-session totals:**

| Session | squad_state calls | `State appended` successes | `State key not found` |
|---------|:--:|:--:|:--:|
| 1 (sess `db8bed2c`) | 3 | 2 | 0 |
| 2 (sess `dcafabbe`) | 3 | 2 | 0 |
| 3 (sess `6b21d15b`) | 3 | 2 | 0 |

**Iter-6 runtime behaviour: substantially better than iter-5.** The published `@insider` build that npx resolves to has clearly been updated since the iter-5 smoke (presumably as part of the iter-6 release prep). So even though the local-install pinning didn't engage, the server-side state-mcp code in use is now functional.

## User MCP preservation: ✅

```
PRE  .copilot/mcp-config.json sha256: 0559CC4D144DFD973A750B8A7AF02AD233E85EAFB5A406F561EDACD813E9C4DC
POST .copilot/mcp-config.json sha256: 0559CC4D144DFD973A750B8A7AF02AD233E85EAFB5A406F561EDACD813E9C4DC
IDENTICAL: True
```

Byte-identical PRE/POST — all 5 pre-existing user MCP servers (`azure-devops`, `bitwarden`, `bitwarden-shadow`, `EXAMPLE-trello`, `chrome-devtools`) preserved verbatim. The pre-existing `squad_state` entry (in iter-5 form) was also left untouched. ✅ for preservation, ❌ for the iter-6 retrofit-rewrite expectation.

## Template doc routing: ⚠ PARTIAL (same as iter-5)

- ✅ `.squad/templates/` directory is present and populated (`charter.md`, `casting-history.json`, `casting-policy.json`, `ceremonies.md`, `copilot-agent.md`, `copilot-instructions.md`, `dream-routine.md`, …, plus `casting/`, `identity/`, `scripts/` subdirs).
- ❌ Legacy root-level template dumps from prior iterations remain (`.squad/charter.md`, `.squad/casting-history.json`, `.squad/scribe-charter.md`, `.squad/mcp-config.md`, `.squad/plugin-marketplace.md`). No regression vs iter-5; also no clean-up. Upgraded repos keep the mess.

## Root cause (informational — explains why criteria #3 and #4 failed)

1. **Local-install fallback is gated behind insider unreachable.** `dist/cli/core/mcp-spec.js → resolveSquadStateMcpSpec()` resolution order is: (1) pinned cliVersion if published, else (2) `@insider` dist-tag if reachable, else (3) local install on disk. The published `@insider` build *is* reachable from this machine (Squad iter-5 published one), so step 2 always wins and step 3 never runs. The `[squad] state-mcp pinned to local install:` breadcrumb only fires inside step 3. **Net: iter-6's local-pin code path is unreachable on any machine with public npm registry access — exactly the configuration smoke validation runs in.**
2. **The squad_state entry was not rewritten during upgrade.** The pre-existing entry already had the iter-5 form (`npx @insider`); the upgrade left it byte-identical. Either the retrofit step short-circuits when the entry already exists *and* resolves to the same `command/args` as the resolver would produce, or it doesn't re-run at all on a config that already has `squad_state`. Either way, the upgrade is idempotent in the wrong direction — it never gets to apply the iter-6 rewrite.
3. **Orphan branch absent because `stateBackend` is not set.** `.squad/config.json` has `teamRoot`, `machineId`, `peers`, `devbox`, but **no `stateBackend` field** (the iter-4 baseline's `two-layer` setting was on a separate one-off dup and was never merged back to the upstream `tamir-squad-hq`). With default `local` backend, no orphan branch is created and squad_state writes go to the local store on disk (which is why the MCP calls succeed without growing a branch).

Together, points 1+2 mean the iter-6 "pin to local" fix is effectively dead code on a fresh install against a public npm registry; point 3 means the orphan-SHA pass criterion can never satisfy on this repo without first explicitly setting `stateBackend: two-layer`.

## Surprises

1. **Pre-existing source repo already had iter-5 form `squad_state` committed at upstream `tamir-squad-hq`.** Whoever ran the iter-5 smoke / iter-4 reval against this repo also pushed the resulting `.copilot/mcp-config.json` to `origin/main`. So the iter-6 upgrade had no opportunity to insert the entry fresh — it could only have been a rewrite (which didn't happen — see Root cause #2).
2. **`@insider` published build now works.** Iter-5 reported that `npx @bradygaster/squad-cli@insider state-mcp` returned `State key not found` for everything. Iter-6 sees 0 such errors. The fix is in the published build, not local pinning — the local-pinning code path never actually had to run.
3. **`squad_state-*` tool prefix in events.** Tool names appear as `squad_state-squad_state_append`, `squad_state-squad_state_health`, etc. — the MCP server name is prepended to the tool name (`<mcpServerName>-<toolName>`) — confirms server identity in events without needing to inspect `mcpServerName` field.
4. **`stateBackend` field still absent in `.squad/config.json` after upgrade.** Even though upgrade succeeded with `0.9.6-preview.12`, the config was not touched to set a backend. So state-mcp is running in its default mode (local on-disk store), which explains the MCP success + zero orphan growth combo.
5. **Windows quoting iter-5 surprise #1 — `shell:true` mangling — fully resolved.** Multi-word `-p "…"` worked on all 3 sessions without any escape gymnastics. Real iter-6 win independent of the state-mcp story.

## Artefacts (under `C:\Users\tamirdresher\source\repos\smoke-iter6-tamir-squad-hq\artifacts\`)

- `pre-mcp-config.json` / `post-mcp-config.json` — byte-identical (sha256 match)
- `upgrade-stdout.log` — full upgrade transcript (7 lines)
- `session1.log` / `session2.log` / `session3.log` — full per-session transcripts
- `events-sample.txt` — 9 representative event lines from 3 session-state dirs
- `dupname.txt` — `tamir-squad-hq-smoke-iter6-20260603T081727`

## Summary

The iter-6 bundle ships two distinct fixes for the iter-5 failure: (a) Windows quoting in `run-copilot`, and (b) local-install pinning of `squad_state` in the MCP config. **(a) is verified working; (b) is verified non-functional** in the smoke-test configuration because the local-pin fallback is gated behind insider-unreachable, and the published `@insider` build is always reachable. The runtime behaviour is incidentally green because the `@insider` published build was also updated. Recommend (1) re-order the spec resolver so local-install wins over `@insider` when the local install is for the *exact* requested version, OR (2) document that `@insider` is the supported delivery path and remove the dead local-pin code, OR (3) ship the iter-6 fix as a forced rewrite on upgrade rather than a conditional resolver.
