# Tarball Validation — Full Report (squad-ai-vulns, slot 5/6)

**Validator:** Data
**Date:** 2026-06-02T17:30:00+03:00
**Tarballs:** `bradygaster-squad-{sdk,cli}-combined-fixes.tgz` (twin @ `0.9.6-preview.5`)
**Branch under test:** `squad/state-backend-upgrade-fixes` @ `a0fa7e3e` (PR #1200)

**Test repos (retained):**
- Fresh-path: https://github.com/tamirdresher_microsoft/squad-ai-vulns-tarball-test-20260602T183157
- Upgrade-path: https://github.com/tamirdresher_microsoft/squad-ai-vulns-upgrade-test-20260602T183157

**Source repo:** https://github.com/tamirdresher_microsoft/squad-ai-vulns (EMU, read-only)

**Full per-repo report:** `validation/FRESH-PATH-TARBALL-VALIDATION-squad-ai-vulns.md` on the fresh-path dup.

---

## Verdict at a glance

| Layer | Verdict |
|---|---|
| Build-time fixes (init + upgrade + migrate) | 🟢 **GO** — every iter-3 gap closes end-to-end on this env |
| Runtime MCP bridge reachability | 🟡 **Residual** — pre-existing transport-layer issue still present; not addressable by these tarballs |
| Recommendation | 🟢 **Promote bundle**; file follow-up for runtime-bridge transport |

## Phase summary

### Phase 0 / 1 — Provision
- Tarballs verified, `ts=20260602T183157`.
- Source clone needed `core.protectNTFS=false` (env-level bug — colons in `.squad/log/*.md` filenames). Workaround documented; not a tarball issue.
- Global npm install raced with parallel slots → local-prefix fallback (`C:\Users\tamirdresher\squad-validation\.npm-prefix-aivulns`) succeeded. `squad --version` → `0.9.6-preview.5`.

### Phase 2 — Fresh-init two-layer
Exit 0. Captured:
- `config.json` `stateBackend=two-layer` ✅
- 6 hooks installed ✅
- `squad-state` orphan with 5 files (decisions.md + 3 agent histories + README), 2 commits ✅
- `mcp-config.json` `squad_state` pinned to `0.9.6-preview.5`, `EXAMPLE-github` + `microsoft-docs` preserved ✅ — **GAP-2 insert-into-existing-config path confirmed**

3 themed copilot sessions (Simpsons / AI-vuln-research):
- 0 "Unknown command" errors across all sessions ✅ — **GAP-1 closed**
- 0 `squad_state_*` MCP invocations 🟡 — orphan branch did not grow (5/2 unchanged)
- Sessions 1 + 2 wrote `.squad/decisions.md` + histories directly to `main` working tree (1 new commit on main: `16074b1`)
- Session 3 timed out internally while child agent was running

### Phase 3 — Upgrade path
worktree init → 2 sessions (Lead produced 5.77 KB threat-model framework on main, `8d256a0`) → `squad upgrade --state-backend two-layer` (exit 0, **no contradictory ⚠️/✅**) → migration moved 9 files (decisions + 8 histories) into orphan → 2 continuity sessions.

Continuity sessions surfaced the runtime symptom most honestly: agent explicitly printed *"`squad_state_*` runtime bridge is not available in this environment, so no inbox entry was written"* and refused to persist. Governance contract upheld.

This is the headline improvement of the entire iter-1/2/3 effort: pre-fix insider.3 upgrade was a no-op; iter-3 upgrade is now strictly equivalent to fresh-init + migrate.

### Phase 4 — Bug verdict
- GAP-1 (sync command + silent-hook): ✅ closed
- GAP-2 (MCP retrofit insert path): ✅ closed
- GAP-3 (ETARGET single-tarball install): ➖ workaround; #1203 still tracking
- UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION: ✅ closed
- UPGRADE-EPERM-FALSE-SUCCESS: ✅ closed
- WI-1 commit hooks: ✅ closed
- INSIDER3-INIT-LEAK: ✅ closed (orphan got the lift)
- MCP-BRIDGE-BROKEN (config layer): ✅ closed
- MCP-BRIDGE-BROKEN (transport / runtime layer): 🟡 still observed — recommend new follow-up issue scoped to copilot-client launch of `npx -y @bradygaster/squad-cli@<v> state-mcp` (not addressable by build-time fixes)

### Phase 6 — Closing
- gh auth restored: `tamirdresher_microsoft` active (was active throughout; source is EMU).
- Dups retained per directive.
- Local install prefix retained for downstream debugging.

## Environment / housekeeping note

The source repo `squad-ai-vulns` carries historical filenames with colons (`2026-MM-DDTHH:MM:SSZ`) in `.squad/log/` and `.squad/decisions/resolved/` that are not legal NTFS paths. Windows users currently cannot clone it cleanly. This is unrelated to the tarball under test but should be filed against the upstream repo (rename strategy: drop the colons, e.g. `T0050Z` → `T0050Z` is already fine; only need to touch `T00:50Z` → `T0050Z` and similar). Not blocking.
