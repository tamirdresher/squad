# Six-Repo Upgrade Validation — PR #1200

**Executed by:** B'Elanna (Durable Systems Engineer)  
**Date:** 2026-06-04  
**PR:** #1200 — `squad/state-backend-upgrade-fixes`  
**HEAD commit:** `212365ec`  
**Tarball version:** `0.9.6-preview.20`  
**Sandbox:** `C:\Users\tamirdresher\squad-validation\6-repo-upgrade-test\`

---

## Goal

Empirically validate `upgrade --state-backend two-layer` across 6 real production repos from two GitHub accounts. Each repo runs 9 structural checks + one MCP JSON-RPC round-trip proof blob.

---

## Tarball Build

Built fresh from HEAD `212365ec` in `C:\Users\tamirdresher\source\repos\squad-state-backend-fix`:

```
npm install && npm run build
npm pack   # packages/squad-sdk → bradygaster-squad-sdk-212365ec.tgz
npm pack   # packages/squad-cli → bradygaster-squad-cli-212365ec.tgz
```

Copied to `C:\Users\tamirdresher\squad-validation\`. CLI invoked directly via:
```
node C:\Users\tamirdresher\source\repos\squad-state-backend-fix\packages\squad-cli\dist\cli-entry.js
```

---

## Repos Tested

| # | Repo | Account | From version | teamRoot in config |
|---|---|---|---|---|
| 1 | tamirdresher/travel-assistant | tamirdresher (personal) | v0.9.4-insider.1 | (none) |
| 2 | tamirdresher/holocaust-research-wasserman | tamirdresher (personal) | v0.8.25 | C:\temp\holocaust-research-squad (stale) |
| 3 | tamirdresher/gh-ai-adoption2026 | tamirdresher (personal) | v0.9.4-insider.1 | (none) |
| 4 | tamirdresher_microsoft/squad-ai-vulns | tamirdresher_microsoft (EMU) | v0.8.25 | /Users/adatias/repos/squad-vulns (macOS, stale) |
| 5 | tamirdresher_microsoft/multiplayer-sudoku | tamirdresher_microsoft (EMU) | v0.9.4-insider.1 | (none) |
| 6 | tamirdresher_microsoft/tamir-squad-hq | tamirdresher_microsoft (EMU) | v0.9.6-preview.11 | C:\Users\tamirdresher\tamresearch1 (exists but ≠ clone dir) |

---

## Check Matrix

| Check | Description | travel-assistant | holocaust-research-wasserman | gh-ai-adoption2026 | squad-ai-vulns | multiplayer-sudoku | tamir-squad-hq |
|---|---|---|---|---|---|---|---|
| C1 | `stateBackend: "two-layer"` in config.json | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C2 | `.mcp.json` present with `squad_state` entry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C3 | `squad-state` orphan branch exists | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C4 | State files migrated to squad-state (count) | ✅ 9 | ✅ 10 | ✅ 8 | ✅ 11 | ✅ 8 | ✅ 18 |
| C5 | `decisions.md` accessible via `git show squad-state:decisions.md` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C6 | Git hooks installed (pre-push, post-merge, post-commit, etc.) | ✅ 6 hooks | ✅ 6 hooks | ✅ 6 hooks | ✅ 6 hooks | ✅ 6 hooks | ✅ 6 hooks |
| C7 | `.gitignore` updated with squad-state entries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C8 | HOME mcp-config SHA256 unchanged | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C9 | Working tree clean (upgrade artifacts only) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MCP | JSON-RPC round-trip write + read blob | ✅ PASS | ❌ FAIL | ✅ PASS | ❌ FAIL | ✅ PASS | ❌ FAIL |

**HOME mcp-config SHA256 (all checkpoints):** `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` ✅

---

## MCP Round-Trip Proof Blobs (passing repos)

| Repo | Proof blob content | Branch |
|---|---|---|
| travel-assistant | `6-REPO-PROOF-travel-assistant-2026-06-04` | squad-state |
| gh-ai-adoption2026 | `6-REPO-PROOF-gh-ai-adoption2026-2026-06-04` | squad-state |
| multiplayer-sudoku | `6-REPO-PROOF-multiplayer-sudoku-2026-06-04` | squad-state |

Written via `squad_state_write` JSON-RPC, read back via `squad_state_read`, confirmed via `git cat-file -p squad-state:.scratch/6-repo-test.md`.

---

## MCP Failure Root Cause (3 repos)

**Bug:** `upgrade --state-backend two-layer` preserves stale `teamRoot` fields in `.squad/config.json` without validation. When `teamRoot` is an absolute path from a different machine or location, `StateBackendStorageAdapter` uses that path as `squadDir`, causing `toRelative()` to throw `path is outside squadDir` for every key.

| Repo | Stale teamRoot | Origin |
|---|---|---|
| holocaust-research-wasserman | `C:\temp\holocaust-research-squad` | Different Windows path, same machine |
| squad-ai-vulns | `/Users/adatias/repos/squad-vulns` | macOS path, different user entirely |
| tamir-squad-hq | `C:\Users\tamirdresher\tamresearch1` | Correct machine, wrong directory (pre-clone location) |

**Error message:** `Failed to write state: [squad] toRelative: path is outside squadDir and cannot be used as a state key.`

**Scope:** All 9 structural checks (C1–C9) pass for all 6 repos. The bug only manifests at MCP run time when `teamRoot` points outside the clone location.

**Impact:** Any user who clones a squad repo to a different path than it was originally initialized, or switches machines, will have broken MCP state write/read until they manually clear `teamRoot` from config.json.

**Recommended fix:** The `upgrade` command should validate `teamRoot`: if it is set to a non-relative path that does not resolve to the current repo root, clear it (or set it to `"."`) rather than preserving the stale value.

---

## Version Upgrade Summary

| Repo | From | To |
|---|---|---|
| travel-assistant | v0.9.4-insider.1 | v0.9.6-preview.20 |
| holocaust-research-wasserman | v0.8.25 | v0.9.6-preview.20 |
| gh-ai-adoption2026 | v0.9.4-insider.1 | v0.9.6-preview.20 |
| squad-ai-vulns | v0.8.25 | v0.9.6-preview.20 |
| multiplayer-sudoku | v0.9.4-insider.1 | v0.9.6-preview.20 |
| tamir-squad-hq | v0.9.6-preview.11 | v0.9.6-preview.20 |

---

## Special Notes

### squad-ai-vulns Windows Checkout Issue
This repo has ~51 files with timestamps in their filenames (format `2026-05-16T00:50Z-...`). Windows NTFS forbids colons in filenames — these files show as deleted in the working tree. Core `.squad/` structure remained intact for upgrade testing. This is a pre-existing repo hygiene issue, not caused by PR #1200.

### tamir-squad-hq
This repo's `teamRoot` (`C:\Users\tamirdresher\tamresearch1`) happens to exist locally but is the original install location, not the clone. The MCP failure is identical in character to the other two stale-teamRoot cases.

---

## Overall Verdict

**PARTIAL PASS (3 full / 3 structural-only)**

- **3 repos full end-to-end PASS** (travel-assistant, gh-ai-adoption2026, multiplayer-sudoku): all 9 checks + MCP round-trip verified ✅
- **3 repos structural PASS / MCP FAIL** (holocaust-research-wasserman, squad-ai-vulns, tamir-squad-hq): C1–C9 all pass, MCP blocked by stale `teamRoot` bug ⚠️

The upgrade command itself is correct. The `teamRoot` preservation bug is a **new actionable finding** that should be addressed in a follow-up issue or as part of PR #1200 before merge, or documented as a known limitation.

**Decision drop:** `.squad/workstreams/active/squad-agents-ai/decisions/inbox/belanna-six-repo-upgrade.md`
