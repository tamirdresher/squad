---
updated_at: 2026-03-16T12:30:00Z
focus_area: "Skills migration + three-layer tooling (#330 + #354) — RELEASE BLOCKER"
version: v0.8.25-build.10
branch: dev
tests_passing: ~4321
tests_todo: 46
tests_skipped: 5
test_files: 154
team_size: 19 active agents + Scribe + Ralph + @copilot
team_identity: Apollo 13 / NASA Mission Control
process: All work through PRs. Branch naming squad/{issue-number}-{slug}. Never commit to main directly.
---

# What We're Focused On

**Status:** Skills migration and three-layer tooling awareness are the team's #1 priority. These two issues (#330 + #354) MUST ship together before the next release. All team efforts focused here.

## The Big One — Skills Migration + Three-Layer Tooling (#330 + #354)

**RELEASE BLOCKER — must ship before next release.**

Two issues, one body of work:
- **#330** (spboyer) — Coordinator detects and enforces all three tooling layers (local skills, global MCP, global Copilot skills)
- **#354** (bradygaster) — Migrate skills from `.squad/skills/` to `.copilot/skills/`

### Why this matters
- Skills in `.squad/skills/` are invisible to Copilot's discovery system
- Global MCP tools (azure-mcp-*, etc.) are detected but not enforced — no pre-flight research
- Global Copilot skills are completely invisible to the coordinator
- 11 of 13 deployment fix commits in Shayne's Azure session were avoidable with available tools
- ~115KB of skill content loaded fully on every routing decision (vs frontmatter-only scanning in `.copilot/skills/`)

### Execution sequence
1. **Prototype** — verify spawned agents inherit MCP tools from parent session (gates design)
2. **Governance** — update squad.agent.md (6 refs), add three-layer model + pre-flight rules
3. **SDK/CLI** — update init, upgrade (migration), export/import, doctor, SkillScriptLoader paths
4. **Physical move** — 23 skills from `.squad/skills/` → `.copilot/skills/`, update cross-refs
5. **Backward compat** — check both locations for one version
6. **Tests** — skill routing, migration, backward compat
7. **Docs** — update all path references

### Gating question
Do spawned `general-purpose` agents inherit MCP tools from the coordinator's session? This determines whether "Azure skills + Azure MCP" is a real pipeline or just documentation.

## Next Up (After #330/#354)

### Quick Wins
- **#320** — Docs migration guide version pin (PAO)
- **#347** — SDK init quality gate (FIDO)

### Recently Shipped
- **#322** — Model selection updated to Claude Sonnet 4.6 / GPT-5.4 (PR #429, merged)
- **#342** — Closed (already shipped via PR #417)
- **A2A (#332-336)** — Shelved (too risky short-term)
- **#316, #357** — Shelved (A2A dependency)

## Process

All work through PRs. Branch naming: `squad/{issue-number}-{slug}`. Never commit to main directly. Squad member review before merge. Always use bradygaster (personal) GitHub account for this repo.
