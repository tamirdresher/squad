---
name: "ceremony-templates"
description: "Reusable ceremony templates for design reviews, retrospectives, and daily standups — copy to .squad/ceremonies.md"
domain: "team-workflow"
confidence: "high"
source: "proven patterns from production squads"
---

## Context

Squads need structured ceremonies to coordinate multi-agent work, reflect on outcomes, and stay aligned. Brady's Squad defines ceremonies in `.squad/ceremonies.md`, but new squads start with nothing. This skill provides three battle-tested templates that any squad can adopt by copying the relevant entries into their own `ceremonies.md`.

Each template follows the standard ceremony format: trigger, condition, facilitator, participants, agenda, and output.

## Templates

### 1. Design Review

Use **before** multi-agent tasks that touch 3+ files or cross component boundaries. Prevents rework by aligning agents on approach before coding begins.

```markdown
## Design Review

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | before |
| **Condition** | multi-agent task touching 3+ files or crossing component boundaries |
| **Facilitator** | lead |
| **Participants** | all-relevant |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. State the goal and constraints
2. Identify affected components and owners
3. Agree on interfaces, contracts, and boundaries
4. Surface risks and edge cases
5. Record design decisions in `.squad/decisions/`

**Output format:**
- Decisions: list of agreed approaches with rationale
- Constraints: known limits (perf, compat, security)
- Action items: who does what, in what order
```

---

### 2. Retrospective

Use **after** a sprint, milestone, or significant failure. Captures lessons learned so the squad improves over time.

```markdown
## Retrospective

| Field | Value |
|-------|-------|
| **Trigger** | manual |
| **When** | after |
| **Condition** | end of sprint/milestone, build failure, test failure, or reviewer rejection |
| **Facilitator** | lead |
| **Participants** | all-agents |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. What happened? (facts only, no blame)
2. What worked well? (keep doing)
3. What didn't work? (root cause)
4. Action items for next iteration

**Output format:**
- Keep: practices to continue
- Stop: practices to drop
- Start: new practices to try
- Action items: concrete changes with owners
```

---

### 3. Daily Standup

Use at **session start** or on demand. Gives the lead a snapshot of squad status and surfaces blockers early.

```markdown
## Daily Standup

| Field | Value |
|-------|-------|
| **Trigger** | manual |
| **When** | session-start |
| **Condition** | session start or on-demand request |
| **Facilitator** | lead |
| **Participants** | all-agents |
| **Time budget** | brief |
| **Enabled** | ✅ yes |

**Agenda:**
1. What did you complete since last standup?
2. What are you working on now?
3. Any blockers or dependencies?
4. Need help from another agent?

**Output format:**
- Status: one-line summary per agent
- Blockers: issues requiring lead intervention
- Plan: priorities for this session
```

## Patterns

- **Copy, don't reference.** Each squad should copy the templates they want into their own `.squad/ceremonies.md` and customize as needed. This keeps ceremonies local and editable.
- **Start with Design Review.** If you only adopt one ceremony, make it Design Review — it prevents the most rework.
- **Enable selectively.** Set `Enabled` to `❌ no` for ceremonies you're not ready for. You can turn them on later without removing the config.
- **Facilitator is always Lead.** The lead role owns ceremony facilitation. Other agents participate but don't run the meeting.

## Anti-Patterns

- Don't skip Design Review for "small" multi-agent tasks — file count is a better signal than perceived complexity
- Don't run retrospectives only on failures — successes have lessons too
- Don't let standups become status reports with no action — every standup should end with a plan
- Don't create custom ceremony formats — use the standard table layout so tooling can parse it
