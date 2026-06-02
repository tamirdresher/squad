# Decision Drop — Tarball Validation 3/6: holocaust-research-wasserman

**Date:** 2026-06-02T17:30:00+03:00
**Agent:** Data
**Branch under test:** `squad/state-backend-upgrade-fixes` @ tarballs `0.9.6-preview.5`
**Source:** `tamirdresher/holocaust-research-wasserman` (personal, private, ~578 MB research repo)
**Duplicates:**
- `tamirdresher_microsoft/holocaust-research-wasserman-tarball-test-20260602T1832` (fresh-init two-layer)
- `tamirdresher_microsoft/holocaust-research-wasserman-upgrade-test-20260602T1832` (upgrade path)

**Full report:** `.squad/files/validation/TARBALL-FULL-holocaust-research-wasserman.md`

## Headline

🟡 **Mixed PASS** — 8 ✅ / 4 ❌. Fresh-init two-layer is observably correct (hooks, orphan branch, MCP retrofit alongside other servers, INSIDER3-INIT-LEAK closed, GAP-1 sync command resolves). **One new blocker:** MCP retrofit pins `@bradygaster/squad-cli@0.9.6-preview.5` — a version that doesn't exist on the npm registry — so the bridge cannot start at runtime. Agents see "squad_state runtime bridge isn't available" and either fall back to direct shell git plumbing or refuse to persist.

## Decisions needed before merging #1200

1. **BLOCKER — publish `0.9.6-preview.5` to the npm registry** (or change the GAP-2 pin strategy to a dist-tag like `@insider` that's always resolvable). Without this, the GAP-2 retrofit writes a config that cannot start the MCP server. This is GAP-3 (#1203) striking at runtime, not just at standalone-install time. Direct repro: `npx -y @bradygaster/squad-cli@0.9.6-preview.5 state-mcp` → ETARGET.

2. **BLOCKER (smaller) — decouple `--self` failure from backend migration** in `squad upgrade`. EPERM on the global npm slot (common when multiple users / agents race) aborts the ENTIRE upgrade — flag silently ignored, no orphan branch, no hooks, no MCP entry. The migration code is local and doesn't need the new binary. Currently the user loses both the binary upgrade AND the backend migration; they should at minimum still get the migration.

## What's working

- ✅ Twin tarball install via local prefix (race-safe vs 3 sister agents)
- ✅ Fresh-init two-layer: all 6 hooks installed (WI-1), orphan `squad-state` created, mutable state lifted at init time (INSIDER3-INIT-LEAK), MCP config gets `squad_state` INSERTED alongside pre-existing `playwright` server (GAP-2 insert path)
- ✅ Pre-commit hook blocks committing mutable state with clear remediation message; SQUAD_SYNC_ACTIVE=1 escape documented in the error
- ✅ Post-commit hook calls `squad sync --quiet` successfully (GAP-1 — command exists, exit 0)
- ✅ Self-upgrade failure surfaces non-zero exit and `❌ Self-upgrade failed` (UPGRADE-EPERM-FALSE-SUCCESS — no fake ✅ following ⚠️ as on insider.3)
- ✅ Session 1 (Lead/Simpsons recast) grew the orphan branch: 926948e → 9276687

## What's not working

- ❌ **MCP runtime reachability** — pinned CLI version absent from registry; agents cannot use squad_state tools
- ❌ **WI-1 hooks not installed during upgrade path** — because upgrade aborted on EPERM
- ❌ **UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION still observable** — because upgrade aborted on EPERM (the fix exists but is short-circuited)
- ❌ **Agent worktree-write of inbox files (S2)** — Lead/Scribe writes proposals to disk without committing or routing through MCP. Partially explained by the MCP-unavailable issue above; re-test after #1 fixed.

## Repos to delete after fix bundle ships

- `tamirdresher_microsoft/holocaust-research-wasserman-tarball-test-20260602T1832`
- `tamirdresher_microsoft/holocaust-research-wasserman-upgrade-test-20260602T1832`

NOT deleting per directive.
