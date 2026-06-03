---
archived_at: 2026-06-03T05:26:24Z
scope: "Iter-4 through Iter-6 validation smokes and combined-fixes"
---

# Data History Archive (2026-06-03)

Detailed logs for validation iterations and experimental branches. Refer to main history.md for active context and learnings.

## RE-VAL iter-4 (2026-06-03T07:15)

5/6 cross-repo smoke (squad-ai-vulns primary). Build-time NTFS-COLON-SANITIZED fix confirmed; MCP-RUNTIME bypass gap identified. Recommendation: MERGE-AFTER-ITER-5 + 2-repo re-smoke. Report: `.squad/files/validation/RE-VAL-iter4-squad-ai-vulns.md`.

**Findings:**
- NTFS-COLON-SANITIZED ✅ on 5/5 newly-generated logs using dashes
- REGISTRY-PIN-UNPUBLISHED on upgrade (fallback to @insider)
- MCP-RUNTIME issue: copilot direct invocation doesn't load squad-state MCP
  - F1 fix: `squad run-copilot` launcher subcommand (~30 LOC)
  - F2 fix: init MCP-spec fallback (~20 LOC)

## Iter-5 combined-fixes (2026-06-03T07:50)

**Shipped PR #1200** with 3 fixes for REVAL-ITER4 gaps:
1. `squad run-copilot <args>` subcommand → injects `--additional-mcp-config`
2. Extract `resolveSquadStateMcpSpec` for init/upgrade parity
3. Route ~17 generic template docs from `.squad/` root → `.squad/templates/`

**Tests:** 14 new assertions, 129 regression (init/upgrade/state-mcp), all green. Pre-existing 89 storage-provider/scheduler failures verified identical on baseline.

**Tarballs:** `preview.11` at `C:\Users\tamirdresher\squad-validation/bradygaster-squad-{sdk,cli}-combined-fixes.tgz`.

## SMOKE-ITER5 travel-assistant & tamir-squad-hq (2026-06-03T07:50–08:00)

- travel-assistant fresh-init ✅, template-flatten ✅, but **orphan-Δ=0** (squad_state not loaded)
- tamir-squad-hq upgrade-worst-case: same orphan-Δ=0, upgrade config pinned to @insider not local
- Root cause: `squad upgrade` rewrites mcp-config to `npx @insider`, bypassing local tarball

## Iter-6 Windows quoting + local-install fallback (2026-06-03T08:25)

**Shipped PR #1200 preview.12** with 2 critical fixes:
- `9b5f377b`: `mcp-spec` 4-tier fallback (pinned → @insider → local install → throw)
- `f25e400e`: `run-copilot` Windows quoting fix (cmd.exe shim + windowsVerbatimArguments)

**Tests:** 32 targeted (mcp-spec-init, run-copilot-wrapper, mcp-bridge-pinning) all green.

## SMOKE-ITER6 (2026-06-03T08:25–08:35)

- travel-assistant: Windows quoting ✅, init ✅, template-flatten ✅, but **local-install fallback didn't fire**
- tamir-squad-hq: Windows quoting ✅, but mcp-config still `@insider` pinned, no local rewrite
- Root cause: local-install fallback code only activates when pinned version unreachable; published @insider always available on public npm

## SMOKE-OVERRIDE travel-assistant (2026-06-03T08:35+)

HOME mcp-config override test:
- Architecture ✅: LOCAL-INSTALL + HOME-CONFIG + NO-WRAPPER setup confirmed working
- Test design ❌: Prompts used bare keys outside backend allowlist (`decisions`, `inbox`, `logs`, `sessions`, `scratch`)
- Recommendation: Re-smoke with allowlist-compliant keys to verify cross-session durability

