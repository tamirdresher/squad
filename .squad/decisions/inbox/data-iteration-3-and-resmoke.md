# Decision drop — Data, iteration 3 + re-smoke

**Agent:** Data (Squad Framework Expert)
**Date:** 2026-06-02
**Status:** complete — awaiting Tamir's review

## Outcome

🟢 **GO** for expanding combined-fix tarball validation to remaining 4 test repos.

## What shipped

| Artifact | Reference |
|---|---|
| CLI fix commits | `3b44f45e`, `a0fa7e3e` on `tamirdresher/squad:squad/state-backend-upgrade-fixes` |
| PR (body updated with iter-3 addendum) | bradygaster/squad#1200 |
| Gap-3 follow-up issue | bradygaster/squad#1203 |
| Twin tarballs (v0.9.6-preview.5) | `C:\Users\tamirdresher\squad-validation\bradygaster-squad-{sdk,cli}-combined-fixes.tgz` |
| Verdict report | `.squad/files/validation/TARBALL-SMOKE-ITERATION-3-VERDICT.md` |
| Manifest update | `.squad/files/validation/COMBINED-FIX-BRANCH-MANIFEST.md` (squad-squad master) |

## Per-gap status

- **GAP-1** (`squad sync` registered) — ✅ closed (`3b44f45e`)
- **GAP-2** (`squad_state` insert behavior) — ✅ closed on BOTH init + upgrade paths (`3b44f45e` + `a0fa7e3e`)
- **GAP-3** (single-tarball ETARGET) — ➖ workaround documented; release-pipeline fix tracked in #1203

## Re-smoke evidence (travel-assistant + multiplayer-sudoku, fresh clones, seeded stale mcp-config)

- After `squad init --state-backend two-layer`: `squad_state` entry **inserted** with pin `@bradygaster/squad-cli@0.9.6-preview.5` on both repos; `EXAMPLE-github` preserved on both.
- `squad sync --quiet` exits `0` on both (no "Unknown command").

## Key learning to preserve

The SDK's `init.ts` rewrite of `.copilot/mcp-config.json` uses `writeIfNotExists` semantics — it skips when the file already exists. Any future MCP-config retrofit helper MUST be wired into BOTH `runEnsureChecks` AND `squad init`, not just upgrade.

## Recommended next move for Tamir

Proceed to broader 4-repo validation using the v0.9.6-preview.5 twin-install pattern from the verdict report. No further fix-bundle changes required.
