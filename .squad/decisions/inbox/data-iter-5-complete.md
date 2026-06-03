# Decision Drop — Combined-Fixes Iter-5 Complete

**Author:** Data
**Date:** 2026-06-03T07:30:00+03:00
**Status:** ✅ Shipped & pushed
**Branch:** `squad/state-backend-upgrade-fixes` on `tamirdresher/squad`
**Commit:** `3c019242`
**PR:** [bradygaster/squad#1200](https://github.com/bradygaster/squad/pull/1200) (body updated with iter-5 section)
**Tarball version:** `0.9.6-preview.11`

## Three Fixes

| # | Fix | Why it was missing | Files |
|---|---|---|---|
| 1 | NEW `squad run-copilot <args>` subcommand — wraps user-launched `copilot` and injects `--additional-mcp-config @<path>` so the canonical end-user invocation picks up project mcp-config | Iter-4 only wrapped the 10 squad-internal spawn sites; the documented `copilot ...` command users actually run was uncovered | `packages/squad-cli/src/cli/commands/run-copilot.ts` (NEW), `cli-entry.ts` (3 help lines + dispatch block) |
| 2 | `init.ts` now calls `resolveSquadStateMcpSpec(version)` post-`sdkInitSquad` and re-pins to `@insider` when the version is not on the npm registry, mirroring upgrade.ts | Init had a hardcoded literal version pin that broke for pre-release/unpublished builds — upgrade had the HEAD-check + fallback, init did not | `packages/squad-cli/src/cli/core/mcp-spec.ts` (NEW, shared helper), `init.ts`, `upgrade.ts` (now re-exports from mcp-spec.ts) |
| 3 | ~17 generic `*.md` TEMPLATE_MANIFEST entries routed from `.squad/` root → `.squad/templates/<name>` | Project root was getting polluted with reference docs; users couldn't tell their own files from template artifacts | `packages/squad-cli/src/cli/core/templates.ts` |

## Carve-outs (intentional non-routing)
- **Casting JSONs** (`casting-history.json`, `casting-roster.json`, etc.) — kept flat at `.squad/` root. SDK init.ts + several skill docs read these flat paths at runtime; routing would break the contract.
- **User-owned bootstrap docs** (`ceremonies.md`, `routing.md`) — kept flat because `overwriteOnUpgrade: false`. The template-routing test explicitly excludes these.
- **Charter templates** (`scribe-charter.md`, `Rai-charter.md`, `fact-checker-charter.md`) — kept in `templates/`, NOT moved to `agents/<name>/charter.md`, because `squad.agent.md.template` already references `.squad/templates/Rai-charter.md`.

## Naming carve-out
`squad copilot` was already taken by team-roster management (`packages/squad-cli/src/cli/commands/copilot.ts`). The wrapper is therefore `squad run-copilot`. Help text example:
```
squad run-copilot --yolo -p "..."
```

## Tests added (14 assertions, all green)
- `test/run-copilot-wrapper.test.ts` (5 assertions) — `buildRunCopilotArgs` correctness + spawn-injection seam
- `test/mcp-spec-init.test.ts` (6 assertions) — `resolveSquadStateMcpSpec` HEAD-check + `@insider` fallback + source-level architectural check that both `init.ts` and `upgrade.ts` import from `./mcp-spec.js`
- `test/template-routing.test.ts` (3 assertions) — no root `*.md` (excluding overwriteOnUpgrade:false), explicit `templates/` mapping, casting JSON carve-out

## Validation status
- ✅ All 10 targeted vitest files green (cli-command-wiring, copilot-invocation-mcp-wrap, npm-registry-fallback, mcp-bridge-pinning, ux-gates, cli/upgrade, init-scaffolding, + 3 new)
- ⚠ Full sweep: 98 failures, but baseline (`git stash` + rerun) shows ~8 chronically failing files (storage-provider, scheduler, repl-ux, docs-build, cli-packaging-smoke, cli/state-mcp, cli/team-root-resolution, upgrade-state-backend, acceptance). Only iter-5-caused failure (ux-gates 80-char limit) was fixed.

## Tarballs
- `C:\Users\tamirdresher\squad-validation\bradygaster-squad-sdk-combined-fixes.tgz` (preview.11)
- `C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz` (preview.11)

## Operational notes for the next iteration
1. **Auth dance**: `bradygaster/squad` fork is at `tamirdresher/squad` → push needs `gh auth switch --user tamirdresher`. `squad-squad` pushes need `gh auth switch --user tamirdresher_microsoft`. Both accounts live in keyring; always re-check active account before pushing.
2. **`git stash` + build hazard**: `prebuild` runs `sync-templates.mjs` which version-stamps `.github/agents/squad.agent.md`. Stashing pre-build then `npm run build` then `git stash pop` causes merge conflict on that file. Workaround: `git checkout -- .github/agents/squad.agent.md` before the pop.
3. **Version auto-bump**: Every `npm run build` runs `scripts/bump-build.mjs` and bumps the preview number. Two builds within one iter advanced `preview.8 → preview.10 → preview.11`.
4. **`ux-gates.test.ts` 80-char limit**: All help-output lines must be ≤80 chars. The reviewer compares strict counts; any wrap-eligible example must be trimmed.
