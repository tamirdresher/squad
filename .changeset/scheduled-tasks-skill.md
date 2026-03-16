---
"@bradygaster/squad-cli": patch
---

feat: add scheduled-tasks skill for recurring task automation

Adds a new skill template that documents how to schedule recurring tasks
using `schedule.json` with cron expressions. Ralph evaluates the schedule
on each wake cycle and runs overdue tasks with idempotent catch-up.

Includes:
- `schedule.json` schema with cron and interval triggers
- Example tasks: daily standup, weekly retro, dependency audit, stale issue cleanup
- `schedule-state.json` for last-run tracking
- Timezone handling guidance (IANA identifiers)
- Design principles: OS-agnostic, no external scheduler, tasks are just prompts
