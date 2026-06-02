---
updated_at: 2026-06-02T21:10:16+03:00
focus: "Implement Picard's 5-decision skill discovery policy across squad.agent.md + template + related refs"
blocked_on: "nothing"
next_action: "Data implements; Worf reviews security surface (symlink skip + path traversal)"
active_agents: [data, worf]
---

## Current State

Picard's design decision is in the inbox (`picard-skill-discovery-precedence.md`, 12.7KB):

1. **Precedence:** `.squad/skills` > `.copilot/skills` > `.github/skills` > `.claude/skills` > `.agents/skills`
2. **Personal skills excluded** from explicit routing (CLI injects them ambiently)
3. **One-level traversal, no symlinks, no per-session cache**
4. **Dedup by directory name** (case-insensitive)
5. **4 files / 6 edit sites** mapped for Data; plugin install target stays `.squad/skills/`

Branch: `master`. No PR yet.

## Open Threads

- Data: implement the 6 edit sites across `.github/agents/squad.agent.md`, `.squad/templates/squad.agent.md.template`, `.copilot/skills/squad-conventions/SKILL.md`, plus decision merge into `.squad/decisions.md`
- Worf: security review of symlink-skip rationale + path traversal safety (5 directories scanned per spawn)
- After ship: Tamir restarts session (squad.agent.md change)

## Recently Completed

- Picard design decision delivered (2026-06-02)
- New workstream created (2026-06-02)
