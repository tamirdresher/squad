# Workstreams

This directory implements the session-aware workstream architecture approved by Picard (2026-06-02, APPROVE_WITH_CONDITIONS, 7 conditions).

## Structure

```
workstreams/
  README.md               ← this file
  _template/              ← starter files for new workstreams
  evergreen/global/       ← cross-cutting decisions (applies_to: all)
  active/{slug}/          ← one directory per active workstream
    README.md             ← YAML frontmatter + scope prose
    now.md                ← current focus/blocked_on/next_action
    decisions.md          ← workstream-scoped decision ledger
    decisions/inbox/      ← drop files (Scribe merges into decisions.md)
```

## Active Workstreams

| Slug | Name | Status |
|------|------|--------|
| `squad-agents-ai` | Squad.Agents.AI NuGet | active |

## Workstream Binding

The active workstream is bound via the `SQUAD_WORKSTREAM` environment variable (Picard condition 1):

```
SQUAD_WORKSTREAM=squad-agents-ai
```

If unset, the coordinator runs Workstream Discovery (see `../.github/agents/squad.agent.md` — Workstream Discovery section).

## Adding a New Workstream

1. Copy `_template/` → `active/{new-slug}/`
2. Fill in `README.md` frontmatter and scope prose
3. Seed `now.md` with initial focus/next_action
4. Open PR; Picard reviews
5. Set `SQUAD_WORKSTREAM={new-slug}` in your session

## See Also

- Design spec: `.squad/decisions/inbox/picard-workstreams-session-aware-refinement.md`
- Tamir's requirements: `.squad/decisions/inbox/copilot-directive-20260602T1536-session-aware-workstreams.md`
- Seven's proposal: `.squad/decisions/inbox/seven-workstreams-adoption-proposal.md`
