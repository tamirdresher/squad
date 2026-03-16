---
name: "scheduled-tasks"
description: "Schedule recurring tasks with cron syntax — Ralph becomes your team's scheduler"
domain: "automation"
confidence: "high"
source: "team-practice"
---

## Context

Squads have recurring work: daily standups, weekly audits, birthday checks, news briefings. Rather than relying on external schedulers (cron, Task Scheduler, GitHub Actions schedules), Ralph can own the schedule directly. Tasks are just prompts or commands — no special runtime needed.

This skill defines the `schedule.json` format, how Ralph evaluates it, and how teams manage their task calendar.

## Schedule Schema

Create `.squad/schedule.json` in your repo root:

```json
{
  "version": 1,
  "timezone": "America/Los_Angeles",
  "tasks": [
    {
      "name": "daily-standup",
      "description": "Post standup summary to the team channel",
      "trigger": {
        "cron": "0 9 * * 1-5"
      },
      "command": "Summarize what each squad member worked on yesterday and what's planned for today. Post to the team channel.",
      "enabled": true
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | number | yes | Schema version, currently `1` |
| `timezone` | string | yes | IANA timezone (e.g., `America/New_York`, `Europe/London`, `UTC`) |
| `tasks` | array | yes | List of scheduled task objects |
| `tasks[].name` | string | yes | Unique kebab-case identifier |
| `tasks[].description` | string | yes | Human-readable purpose |
| `tasks[].trigger.cron` | string | yes* | Standard 5-field cron expression |
| `tasks[].trigger.interval` | string | no* | Alternative: interval like `"4h"`, `"30m"`, `"1d"` |
| `tasks[].command` | string | yes | Prompt or command Ralph executes |
| `tasks[].enabled` | boolean | yes | Set `false` to skip without removing |

*Provide either `cron` or `interval`, not both.

### Cron Expression Reference

```
┌───────────── minute (0–59)
│ ┌───────────── hour (0–23)
│ │ ┌───────────── day of month (1–31)
│ │ │ ┌───────────── month (1–12)
│ │ │ │ ┌───────────── day of week (0–6, Sun=0)
│ │ │ │ │
* * * * *
```

Common patterns:
- `0 9 * * 1-5` — Weekdays at 9:00 AM
- `0 16 * * 5` — Fridays at 4:00 PM
- `0 7 * * *` — Daily at 7:00 AM
- `0 8 * * 1` — Mondays at 8:00 AM
- `0 0 1 * *` — First day of each month at midnight

## Example Schedule

```json
{
  "version": 1,
  "timezone": "America/Chicago",
  "tasks": [
    {
      "name": "daily-standup",
      "description": "Summarize team activity and plan for the day",
      "trigger": { "cron": "0 9 * * 1-5" },
      "command": "Review recent commits, open PRs, and issue activity. Summarize what each squad member worked on and what's planned. Post the standup to the team channel.",
      "enabled": true
    },
    {
      "name": "weekly-retrospective",
      "description": "End-of-week team retrospective",
      "trigger": { "cron": "0 16 * * 5" },
      "command": "Compile the week's merged PRs, closed issues, and key decisions. Highlight wins, blockers, and items to carry forward. Post a retrospective summary.",
      "enabled": true
    },
    {
      "name": "dependency-audit",
      "description": "Check for outdated or vulnerable dependencies",
      "trigger": { "cron": "0 8 * * 1" },
      "command": "Run dependency audit across all packages. Report outdated dependencies, known vulnerabilities, and recommended updates. Create issues for critical findings.",
      "enabled": true
    },
    {
      "name": "stale-issue-cleanup",
      "description": "Find and triage issues with no activity",
      "trigger": { "cron": "0 10 * * *" },
      "command": "Find issues with no activity in the last 14 days. Comment asking for status updates on stale items. Label issues that need attention.",
      "enabled": true
    }
  ]
}
```

## How Ralph Checks the Schedule

On each round (wake cycle), Ralph:

1. **Reads** `.squad/schedule.json` for the task list
2. **Reads** `.squad/schedule-state.json` for last-run timestamps
3. **Evaluates** each enabled task's trigger against the current time (in the configured timezone)
4. **Runs** any task whose trigger has fired since its last run
5. **Updates** `schedule-state.json` with the new last-run time

This means Ralph doesn't need to be running continuously. If Ralph was offline and restarts, it checks what was missed and runs overdue tasks — but only once per missed window (idempotent catch-up).

## State Tracking

Ralph maintains `.squad/schedule-state.json` automatically:

```json
{
  "lastChecked": "2025-01-15T14:30:00Z",
  "tasks": {
    "daily-standup": {
      "lastRun": "2025-01-15T09:00:00Z",
      "lastResult": "success"
    },
    "weekly-retrospective": {
      "lastRun": "2025-01-10T16:00:00Z",
      "lastResult": "success"
    },
    "dependency-audit": {
      "lastRun": "2025-01-13T08:00:00Z",
      "lastResult": "success"
    }
  }
}
```

- **Do not commit** `schedule-state.json` — add it to `.gitignore`
- State is local to each Ralph instance
- If state is missing or corrupted, Ralph creates a fresh state and treats all tasks as never-run

## Managing Tasks

### Add a Task

Add a new entry to the `tasks` array in `schedule.json`. Ralph picks it up on the next round.

### Disable a Task

Set `"enabled": false`. The task stays in the schedule for reference but won't execute:

```json
{
  "name": "stale-issue-cleanup",
  "enabled": false
}
```

### Remove a Task

Delete the entry from the `tasks` array. Its state in `schedule-state.json` is cleaned up automatically on the next round.

### Test a Task

Run the task's command manually to verify it works before scheduling:

```
@ralph Run this command: "Review recent commits and summarize team activity."
```

## Timezone Handling

- The `timezone` field uses IANA timezone identifiers (e.g., `America/New_York`, `Europe/Berlin`, `Asia/Tokyo`)
- All cron expressions are evaluated in the specified timezone
- Daylight saving transitions are handled automatically
- If `timezone` is omitted, `UTC` is assumed
- **Tip:** Use `UTC` for distributed teams to avoid ambiguity

## Design Principles

| Principle | Why |
|-----------|-----|
| **OS-agnostic** | Cron syntax is a universal standard — works on Windows, macOS, Linux |
| **No external scheduler** | Ralph IS the scheduler — no cron daemon, Task Scheduler, or CI schedule needed |
| **Tasks are just prompts** | Commands are natural-language prompts or shell commands — no special runtime or plugin system |
| **Idempotent execution** | Safe to re-run if Ralph restarts — state tracking prevents duplicate runs within the same window |
| **Graceful degradation** | If `schedule.json` is missing or malformed, Ralph logs a warning and continues normally |

## Anti-Patterns

- ❌ Scheduling tasks more frequently than Ralph's wake interval (tasks can't run faster than Ralph checks)
- ❌ Committing `schedule-state.json` to git (it's instance-local runtime state)
- ❌ Using system-specific time formats instead of IANA timezone identifiers
- ❌ Tasks with side effects that aren't idempotent (e.g., "send email" without dedup)
- ❌ Putting secrets in `schedule.json` (use environment variables or secret references)
