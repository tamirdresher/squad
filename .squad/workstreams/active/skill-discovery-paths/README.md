---
id: skill-discovery-paths
name: "Skill Discovery Path Coverage"
status: active
created: 2026-06-02
owner: "Tamir Dresher"
agents: [picard, data, worf]
reviewers: [worf]
scope: "Fix Squad coordinator's skill-aware routing to cover all 5 official Copilot CLI skill paths, not just .copilot/skills and .squad/skills."
related: []
public_surface: "internal (.github/agents/squad.agent.md + .squad/templates/squad.agent.md.template — ships via squad upgrade)"
---

# Skill Discovery Path Coverage

Squad's coordinator only scans `.copilot/skills/` and `.squad/skills/` for skill-aware routing, but the official Copilot CLI loads skills from five project paths (`.github/skills/`, `.claude/skills/`, `.agents/skills/`) and two personal paths (`~/.copilot/skills/`, `~/.agents/skills/`). Skills the user places in `.github/skills/` — a common location next to other `.github/` tooling — are loaded ambiently by the CLI but invisible to Squad's routing, so agents don't get them attached to spawn prompts.

This workstream:
1. Decides precedence when the same skill name exists in multiple paths.
2. Decides whether personal paths feed Squad routing or stay out (CLI already injects them ambiently).
3. Implements the fix in `.github/agents/squad.agent.md` AND `.squad/templates/squad.agent.md.template` (the source that ships via `squad upgrade`).
4. Updates related references — plugin marketplace install target, skill confidence lifecycle, `.copilot/skills/squad-conventions/SKILL.md` file-structure doc.

**Current state:** Picard's design decision delivered (5 sub-decisions). Implementation pending Data; security review pending Worf.

**Source:** GitHub Copilot CLI docs — https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
