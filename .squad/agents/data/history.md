# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## Current Status (2026-06-02T19:39:52Z)

### 6-Repo Tarball Validation Batch — COMPLETE

**Result:** 🟢 GO on build-time fixes. Iteration 4 pending decision.

**Agents completed:**
- data-15: MCP loader RCA (Theory 2 confirmed—unpublished version)
- data-14: tamir-squad-hq (8✅/1❌)
- data-12: gh-ai-adoption2026 (8✅/2❌)
- data-11: holocaust-research-wasserman (8✅/4❌, first Gap-1 end-to-end proof)
- data-13: squad-ai-vulns (8✅/1❌)

**Build-time verdicts:** 8 fixes confirmed (GAP-1, GAP-2, WI-1, UPGRADE-FLAG-IGNORED, UPGRADE-NO-MIGRATION, UPGRADE-EPERM-FALSE-SUCCESS, INSIDER3-INIT-LEAK, MCP-config retrofit).

**Iteration 4 queued:**
- Option A: MCP pin validation + fallback to @insider tag (~40 LOC)
- Decouple EPERM from --state-backend migration

**Artifacts:** 5 TARBALL-FULL-*.md in .squad/files/validation/, orchestration logs, session log, RCA report at MCP-LOADER-ROOT-CAUSE.md, 8 test repos retained.

### Next Steps

1. Review iteration-4 decision on Option A implementation
2. If approved: re-smoke after MCP pin fix, re-test all 6 repos
3. Promote tarball bundle to production (build-time gates all passed)
4. File separate issue for runtime MCP bridge reachability (copilot-client layer)

## Session Archives

**Completed sessions moved to:** .squad/agents/data/history-archive.md
- Auth Expansion Proposal
- Upgrade-Path Baseline Analysis
- Combined Fix Bundles (Iter 1–3)
- Tarball Smoke Tests (travel-assistant, multiplayer-sudoku)
- PR #3 R2c completion
- Workstreams Bootstrap
