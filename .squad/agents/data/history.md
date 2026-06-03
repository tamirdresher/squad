# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## Historical Summary (Archived 2026-06-02T22:42:00Z)

### Major Workstreams Completed

**Squad.Agents.AI Research & Launch (2026-06-02 ongoing):**
- PR #1207 opened on bradygaster/squad targeting dev branch (Closes issue #1205)
- Issue #1205 fork reference trimmed; PR body cleaned per upstream conventions
- Auth: tamirdresher personal (not EMU); intentional per cross-fork contribution model
- Rebase onto upstream/dev completed; 2 conflicts resolved (.gitignore, CHANGELOG.md)
- All 12 Copilot review comments addressed in forward commit de057079
- Multi-target tests expanded to net8.0/net9.0/net10.0 (129/129 passing)
- PR #1207 status: MERGEABLE/CLEAN, awaiting brady review

**MCP JSON Migration Batch (2026-06-02 to 2026-06-03):**
- Phases 1-2 complete; issue #3642 resolved in implementation
- 5 inbox decisions merged; PR #1208 opened (feat/mcp-json-migration → main)
- Status: CLOSED; awaiting upstream maintainer merge

**Validation Synthesis (2026-06-03T06:56:20Z):**
- Iter-4 re-validation across 5/6 cross-repo (squad-hq, wasserman, multiplayer-sudoku, travel, squad-ai-vulns)
- Build-time fixes confirmed: 8 ✅ across all 5 reporting repos
- Runtime MCP bridge: 2 root causes identified for direct user invocation bypass
- Recommendation: MERGE-AFTER-ITER-5 + 2-repo re-smoke (hq upgrade + travel fresh-init)
- Sample completeness 5/6 (data-23 hung 8h+, documented as measurement gap)

**Skill Discovery Paths (2026-06-02):**
- Worf R-1: NFC normalization + control-char denylist for dedup rule
- Worf R-2: Hardlinks over symlinks for monorepo UX (Windows compat)
- File edits: squad.agent.md (twin-file invariant), SKILL.md (user guidance)
- Test scope: LLM-prompt-driven discovery; deferred if CLI scanner introduced

### Current Operational Status

- **Auth state:** Currently on tamirdresher personal; verify for EMU-scoped work
- **Next phase:** Iter-5 (squad copilot wrapper subcommand, init/upgrade-path helper mirror, template-doc-flatten fix)
- **Blockers:** None for Squad.Agents.AI PR #1207 (upstream-ready)

---

**For detailed historical entries, see history-archive.md**