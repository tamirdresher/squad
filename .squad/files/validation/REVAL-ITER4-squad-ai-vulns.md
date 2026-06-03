# REVAL-ITER4 — squad-ai-vulns (mirror)

Full report archived at:
`C:\Users\tamirdresher\squad-validation\reval-aivulns-20260602T213312\test-repo\validation\RE-VAL-iter4-squad-ai-vulns.md`

Dup repo: https://github.com/tamirdresher_microsoft/squad-ai-vulns-tarball-test-iter4-20260602T213312

## TL;DR

🟡 **MIXED on iter-4 bundle for this repo.**

- ✅ **NTFS-COLON-SANITIZED FIXED** — 5/5 newly-generated `.squad/log` + `.squad/orchestration-log` files use `T07-04-28Z` (dashes). 0 colon-files. This repo originally surfaced the bug; the fix lands cleanly for fresh writes.
- ✅ **REGISTRY-PIN-UNPUBLISHED (upgrade)** — `squad upgrade` wrote `@bradygaster/squad-cli@insider` fallback (preview.9 unpublished on npm).
- ❌ **REGISTRY-PIN-UNPUBLISHED (init)** — `squad init` wrote literal `@bradygaster/squad-cli@0.9.6-preview.9`. HEAD-check not wired into init path. Residual.
- ✅ **UPGRADE-FLAG-IGNORED / NO-MIGRATION** — `upgrade --state-backend two-layer` migrated config + created orphan + installed 6 hooks.
- ✅ **UPGRADE-EPERM-FALSE-SUCCESS** — not directly exercised (local prefix), not contradicted.
- ❌ **MCP-RUNTIME via direct `copilot` invocation** — orphan growth **0 / 0 / 0** commits across 3 sessions despite Scribe writing decisions.md (0→5.6KB), 5 log files, agent histories. The iter-4 `--additional-mcp-config` wrap only fires from squad-owned spawn sites (watch/loop/bridge), so the canonical user pattern `copilot --yolo --autopilot --agent squad -p "…"` bypasses it entirely. Matches Data-16 Alias Experiment finding.

## Orphan SHA timeline

```
PRE-1:  98a0d0f10b060e4b723c4af2f1a4a7d6eae2d563
POST-1: 98a0d0f… (Δ=0)  Session 1 — Simpsons team build
POST-2: 98a0d0f… (Δ=0)  Session 2 — Lisa threat model
POST-3: 98a0d0f… (Δ=0)  Session 3 — Bart scan approach
TOTAL:  0 commits across 3 sessions
```

## Recommendation

🟡 **MERGE-AFTER-FOLLOWUP-F1+F2.** Build-time fixes ship. Runtime MCP bridge requires either (F1) `squad copilot` launcher subcommand wrapping `--additional-mcp-config`, or (F2) wait on github/copilot-cli#3642. Init path also needs REGISTRY-PIN-UNPUBLISHED parity (~20 LOC, lift `resolveSquadStateMcpSpec` from upgrade.ts to SDK `buildMcpServerSpecs`).
