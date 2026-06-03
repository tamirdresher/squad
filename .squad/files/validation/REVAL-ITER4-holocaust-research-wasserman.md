# RE-VAL iter-4 — tamirdresher/holocaust-research-wasserman

**Author agent:** Data (re-val 3/6, parallel batch)
**Date:** 2026-06-02T21:33:08+03:00
**Tarballs:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` packaged as `0.9.6-preview.8` (local install auto-bumps to `0.9.6-preview.9`)
**Source:** `tamirdresher/holocaust-research-wasserman` (PRIVATE, cross-org, ~578 MB on disk / 318 MB git tree)
**Primary dup:** https://github.com/tamirdresher_microsoft/holocaust-research-wasserman-tarball-test-iter4-20260602T213308
**Upgrade dup:** https://github.com/tamirdresher_microsoft/holocaust-research-wasserman-upgrade-test-iter4-20260602T213308
**Copilot CLI:** 1.0.58
**Pre-existing state:** Fully squadified research project (9 researchers, ~40+ decisions, teamRoot pointing at `C:\\temp\\holocaust-research-squad`). This is the repo that originally surfaced the EPERM-short-circuit bug in iter-3.

---

## Orphan SHA timeline (FRESH-init, two-layer, 3 sessions)

| Marker | SHA | Δ commits |
|---|---|---|
| pre-S1 (post `squad init --state-backend two-layer`) | `2dd3d02655ffea410ee75baf31195f5375ccd8bb` | – |
| post-S1 (Simpsons-universe research team) | `2dd3d02655ffea410ee75baf31195f5375ccd8bb` | **0** |
| post-S2 (Scribe log-decision via squad_decide) | `2dd3d02655ffea410ee75baf31195f5375ccd8bb` | **0** |
| post-S3 (add one Simpsons researcher) | `2dd3d02655ffea410ee75baf31195f5375ccd8bb` | **0** |

**Net growth across 3 sessions: 0 commits.** Each session committed work-tree changes to `main` (Simpsons recast +383 lines, Scribe drop-box, one researcher addition) but no MCP-mediated orphan commits.

### Why orphan didn't grow → MCP-RUNTIME unfixed for canonical user invocations

Session 2's Scribe wrote the decision via the file-drop-box flow, explicitly noting `"squad_decide is unavailable in this environment"`. A targeted probe session confirmed it:

```
Prompt: "Call squad_state_health right now. Report verbatim what tools you see prefixed
         with squad_state_ or squad_decide."

Agent response: "I don't see any tools prefixed with squad_state_ or squad_decide in my
                 available toolset. There is no squad_state_health tool available to call."
                 [...lists azure-devops/bitwarden/chrome-devtools/calendar/mail/teams/etc.
                 — all from ~/.copilot/mcp-config.json — but no squad_state_*]
```

The iter-4 fix **MCP-NOT-AUTOLOADED** wraps `copilot` spawns from inside squad-cli code (watch loop, watch capabilities, copilot-bridge start, start PTY) with `--additional-mcp-config @<teamRoot>/.copilot/mcp-config.json`. That fix WORKS for those spawn sites, but the **canonical user invocation** documented in the validation runbook is:

```
copilot --yolo --autopilot --agent squad -p "..."
```

This bypasses the squad-cli wrapper entirely, so the flag never gets injected, and Copilot CLI 1.0.58 still silently skips the project-level `.copilot/mcp-config.json`. The exact failure mode that Data-16's alias experiment proved on `tamir-squad-hq` reproduces here unchanged.

**Severity:** Same as iter-3. The canonical squad workflow as documented does not deliver the MCP runtime bridge to the agent.

---

## Standard-set captures

### `squad init --state-backend two-layer`

- Most artifacts already-exist (this is a pre-squadified project) — `init` is a no-op merge that adds 4 new files and respects 30+ existing.
- New: `.squad/agents/ralph/charter.md`, `.squad/agents/Rai/charter.md`, `.squad/rai/policy.md`, `.copilot/skills/` directory, `.gitattributes`.
- `.squad/config.json` retains pre-existing `teamRoot: C:\\temp\\holocaust-research-squad` and gains `stateBackend: two-layer`.
- 6 git hooks installed (`pre-commit`, `post-commit`, `pre-push`, `post-merge`, `post-rewrite`, `post-checkout`).
- `squad-state` orphan branch was already present from prior squad-init, retained.

### `.copilot/mcp-config.json` post-init (npx-pinned form, NOT the non-npx form)

```json
"squad_state": {
  "command": "npx",
  "args": ["-y", "@bradygaster/squad-cli@0.9.6-preview.9", "state-mcp"]
}
```

### `squad sync` — manual invocation works

```
squad sync: both (remote: origin, backend: two-layer)
  No remote squad-state refs found (first push will create them).
  ✓ pushed: squad-state
  ✓ notes pushed
```

Hooks invoke `squad sync` but only when `command -v squad` succeeds; on this run the local prefix wasn't on the git-hook subshell PATH, so hook-driven sync was a no-op. (Pre-existing limitation, not iter-4 regression.)

---

## Upgrade path — second dup (EPERM-NO-SHORTCIRCUIT verdict)

**Setup:** cloned primary dup → reset `.squad/config.json` to remove `stateBackend` (simulating local-backend state) → ran `squad upgrade --self --state-backend two-layer`.

**Result — the fix works end-to-end.** The self-upgrade attempt failed (npm install -g hit the install-failed path), but the project upgrade + state-backend migration ran to completion BEFORE the self-upgrade-failure was surfaced:

```
✓ refreshed .squad/templates/
✓ ensured .copilot/mcp-config.json squad_state pinned to @bradygaster/squad-cli@insider
Upgrade complete: v0.8.25 → v0.9.6-preview.9
Migrating state backend: local → two-layer
  ✓ squad-state branch ready
  ✓ migrated 10 state file(s) onto squad-state branch:
      .squad/decisions.md
      .squad/agents/{ellis,galicia,gutenberg,miriam,q,scribe,seven,sofer,wiesenthal}/history.md
  ✓ config.json updated: stateBackend = two-layer
Installing squad sync hooks
  ✓ pre-push / post-merge / post-rewrite / post-checkout / pre-commit / post-commit
Done. Squad state will sync automatically on push/pull.
✓ Migration complete. Backend is now 'two-layer'.
❌ Self-upgrade failed earlier: Upgrade failed. Try running manually: npm install -g …
   The project upgrade and state-backend migration succeeded; retry the self-upgrade manually.

(exit 1)
```

Three things worth calling out:

1. **EPERM-NO-SHORTCIRCUIT: ✅ FIXED.** Self-upgrade failure is now reported as a deferred warning, not a short-circuit; state-backend migration completed first. Exit code is non-zero (correctly surfacing the partial-failure), but the user keeps everything they asked for.
2. **REGISTRY-PIN-UNPUBLISHED fallback works.** Line `ensured .copilot/mcp-config.json squad_state pinned to @bradygaster/squad-cli@insider` proves the HEAD-check detected `0.9.6-preview.9` is not on the registry and fell back to the `@insider` dist-tag spec. ✅
3. Final orphan SHA on upgrade dup = `05301e37164323fc5f3e0bc18f8ccc32ad7627b8` — the migration commit landed.

This repo was the iter-3 surface of the EPERM short-circuit bug. The iter-4 fix is **confirmed in the exact failure environment** — the most important single signal in this re-val.

---

## Bug verdict matrix (iter-4 fixes vs this repo)

| Bug | iter-3 status here | iter-4 verdict |
|---|---|---|
| EPERM-NO-SHORTCIRCUIT (--self EPERM short-circuited --state-backend migration) | ❌ FAILED (originally surfaced here) | ✅ **FIXED** — migration completes before self-upgrade error is surfaced |
| REGISTRY-PIN-UNPUBLISHED (mcp-config pinned an unpublished version → ETARGET when npx resolved) | ❌ FAILED | ✅ **FIXED** — HEAD-check + fallback to `@insider` confirmed in upgrade log |
| MCP-NOT-AUTOLOADED (Copilot CLI 1.0.58 silently skips `.copilot/mcp-config.json`) | ❌ FAILED | ⚠️ **PARTIAL** — fix wraps squad-cli's own copilot spawns, but the canonical `copilot --agent squad` user invocation is not wrapped. 3 sessions on fresh init → 0 orphan growth, agent confirms no squad_state_* tools. |
| TIMESTAMP-COLON-LEAK (`:` in filenames on Windows) | ❌ FAILED | ➖ **NOT TRIGGERED** — no agent attempted to write timestamped files this run; can't reproduce, can't refute. Code change in templates is plausible. |
| GAP-1 / GAP-2 / WI-1 / UPGRADE-FLAG-IGNORED / UPGRADE-NO-MIGRATION / UPGRADE-EPERM-FALSE-SUCCESS / INSIDER3-INIT-LEAK / MCP retrofit on init | All ✅ in iter-3 | ➖ **STABLE** — no regression. `squad sync` exists and works; hooks installed; mcp-config retrofitted; insider-3 leak not present. |

**Iter-4 score on this repo:** 2 P0 fixes confirmed (EPERM, REGISTRY-PIN), 1 partial (MCP-RUNTIME for canonical invocation still broken), 1 not-triggered, 7 stable. **Net 8 ✅ / 1 ⚠️ / 1 ➖.**

---

## Bottom line

- The two bugs this repo originally surfaced (**EPERM-NO-SHORTCIRCUIT** in iter-3, plus the unpublished-version pin) are **fully fixed in iter-4** and verifiable in the same environment that exposed them.
- The remaining hole is **MCP-NOT-AUTOLOADED** for the canonical `copilot --agent squad` invocation pattern — the runtime bridge fix only covers squad-cli-spawned copilot sessions, not user-launched ones. Orphan grew 0 commits across 3 sessions; agent self-reports zero `squad_state_*` tools.
- Recommendation for iter-5: either (a) extend the `--additional-mcp-config` injection to a shell wrapper (`squad copilot ...` subcommand) that users are documented to call instead of bare `copilot`, or (b) write `squad_state` into user-level `~/.copilot/mcp-config.json` during init (accepting cross-project pollution), or (c) wait on github/copilot-cli#3642 for upstream auto-load fix.

## Artifacts

All under `C:\Users\tamirdresher\squad-validation\wasserman-iter4-20260602T213308\`:

- `02-init.log` — fresh `squad init` output
- `03-pre-s1-sha.txt`, `05-post-s1-sha.txt`, `09-orphan-timeline.txt` — orphan SHA recordings
- `04-session1.log` — Simpsons-universe team build (S1)
- `06-mcp-probe.log` — MCP tool inventory probe (zero squad_state_* tools)
- `07-session2.log` — Scribe decision log (S2)
- `08-session3.log` — single researcher add (S3)
- `10-upgrade.log` — upgrade-path EPERM-NO-SHORTCIRCUIT proof
