# Decision — Alias Experiment Verdict (Data-15 Option A is not the fix; deeper config-loading issue uncovered)

**Author:** Data
**Date:** 2026-06-02T19:39:52.894+03:00
**Subject:** Empirical proof that the MCP runtime gap is NOT the npx ETARGET pin alone — Copilot CLI 1.0.58 does not auto-load project-level `.copilot/mcp-config.json` at all.
**Type:** Validation finding (re-frames iter-4 scope)
**References:** `validation/ALIAS-EXPERIMENT-VERDICT.md`, `validation/MCP-LOADER-ROOT-CAUSE.md` (Data-15), `validation/6REPO-TARBALL-VALIDATION-FINAL.md`, bradygaster/squad PR #1200

## What I tested

Patched the `squad_state` entry in `.copilot/mcp-config.json` on the post-upgrade `tamir-squad-hq-tarball-test-20260602T183202` dup, replacing the npx-pinned launch (`npx -y @bradygaster/squad-cli@0.9.6-preview.5 state-mcp`, which ETARGETs because `0.9.6-preview.5` is unpublished) with the bare alias `squad state-mcp`. Then escalated to absolute path + full config shape. Ran two `copilot --yolo --autopilot --agent squad -p ...` sessions per attempt.

## What I found

1. **Bare alias / absolute path / full shape — none of them made `squad_state_*` tools callable.** Lead reported zero tools, Scribe refused to spawn, orphan stayed at 2 commits.
2. **Debug-logging Copilot CLI 1.0.58 revealed the real cause:** Only servers from user-level `~/.copilot/mcp-config.json` were loaded. The 3 project-only entries (`squad_state`, `bitwarden-shadow`, `EXAMPLE-trello`) were silently dropped. **The project-level config file is not auto-loaded.**
3. **Confirmed the fix path** by running copilot with `--additional-mcp-config "<project config json>"` flag. All 7 `squad_state_*` tools registered, Q called `squad_decide`, Scribe persisted everything, **orphan grew 2 → 10 commits in one session**.

## Implication

**Data-15 Option A (ETARGET HEAD-check + dist-tag fallback) is necessary but not sufficient.** Even if the launch spec were valid, Copilot CLI never reads the file containing it. iter-4 needs to do one of:

1. **A1 (recommended):** Have squad wrap copilot invocations with `--additional-mcp-config` carrying the project config. Combine with Data-15 Option A on the launch-spec content. ~60–90 LOC.
2. **A2:** Write `squad_state` into user-level `~/.copilot/mcp-config.json` instead of project-level. Mechanically simple; bad UX (cross-project pollution, can't be committed).
3. **A4 (parallel):** File upstream issue at github/copilot-cli asking whether project-level auto-load is intended or a regression in 1.0.58.

Drop Data-15 Option A as a *standalone* fix.

## Side findings

- `squad ensure` command referenced in the prompt does **not exist** (`✗ Unknown command: ensure`). Either renamed or never shipped. Worth adding as an explicit config-only re-pin subcommand for operator scenarios like this.
- StateBackendStorageAdapter wrote keys as absolute paths rooted at the canonical TEAM_ROOT (`~/tamresearch1`) rather than the dup's `.squad/`. Worked, but keys are non-portable. Separate concern, not blocking.

## Action items

- iter-4 plan: pivot from Data-15 Option A alone to A1 + A4. Re-estimate effort (~60–90 LOC + 1 test file + 1 upstream issue).
- Add `squad ensure` (config-only re-pin) to backlog.
- Re-test plan: same 4-session continuity on `tamir-squad-hq-tarball-test-20260602T183202`; pass = `git log squad-state --oneline | wc -l >= 3` AND `squad_state_health` succeeds in agent inventory without the manual `--additional-mcp-config` flag.

## Revert

Manual JSON restore (since `squad ensure` doesn't exist) — diff vs preimage is empty, dup is back to canonical post-upgrade state.
