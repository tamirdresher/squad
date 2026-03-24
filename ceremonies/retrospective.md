# Ceremony: Retrospective

## Overview

The retrospective is a structured team ceremony run on a regular cadence to reflect on what worked, what didn't, and what to improve. It is one of the highest-leverage ceremonies because it closes the feedback loop on process — but only if action items are tracked in a system that enforces completion.

## Cadence

| Field | Value |
|-------|-------|
| **Frequency** | Bi-weekly (every 2 weeks) or weekly for high-velocity squads |
| **Trigger** | Automatic — Friday at 14:00 UTC, or when `Test-RetroOverdue` returns `$true` |
| **Condition** | No `*retrospective*` log file exists in `.squad/log/` for the current week (Mon–Fri window) |
| **Coordinator** | Squad Lead (Picard) or designated facilitator |
| **Participants** | All squad members |
| **Duration** | 20–30 minutes |

## Inputs

The facilitator should gather before running:

1. **Orchestration logs** — `.squad/log/` files since the last retrospective
2. **Closed issues** — GitHub Issues closed in the period (provides velocity data)
3. **Open blockers** — Issues tagged `pending-user` or `blocked`
4. **Decisions inbox** — New files in `.squad/decisions/inbox/` since last retro
5. **Upstream activity** — PRs opened/merged to upstream repositories

## Format: 4 Required Sections

### Section 1 — What Worked 🟢

List 3–5 things that went well. Be specific: name the issue, the pattern, the agent, or the technique.

Example:
- Ralph autonomous round completed 12 issues without human intervention (March 24)
- Two-pass scanning reduced API calls by 72% (#1469)

### Section 2 — What Didn't Work 🔴

List 2–4 friction points or failures. Be honest. These become candidates for action items.

Example:
- Retro cadence slipped: two consecutive Fridays missed
- Artifact storage quota hit for the third week in a row

### Section 3 — Action Items (MUST be GitHub Issues)

> ⚠️ **Critical rule:** Action items from retrospectives MUST be created as GitHub Issues — not markdown checklists.

**Why Issues, not markdown?**

| Dimension | GitHub Issues | Markdown Checklists |
|-----------|---------------|---------------------|
| Assignee | ✅ Required field | ❌ No concept |
| Notifications | ✅ Automatic on assignment | ❌ None |
| Close events | ✅ Tracked, queryable | ❌ Silent |
| Completion rate | ✅ 85%+ observed | ❌ 0% observed (6 retros) |
| Accountability | ✅ By person | ❌ By hope |

**Required Issue fields:**
- Title: short, actionable verb phrase
- Body: context from the retro, links to related issues
- Assignee: the agent or human responsible
- Label: `squad` + relevant area label
- Milestone: current sprint (if applicable)

**Example:**
```
Title: Set GitHub Actions artifact retention policy to 30 days
Body: Flagged in retro 2026-03-24. Third consecutive week quota hit.
      Causes FedRAMP CI failures. Fix: repo Settings → Actions → Artifact retention.
Assignee: @b-elanna
Labels: squad, infrastructure
```

### Section 4 — Decision Updates

For each pending decision from `.squad/decisions/inbox/`:
- State: Approved / Rejected / Needs-more-info / Delegated
- Owner: who executes next
- Deadline: if time-sensitive

## Coordinator Integration Pattern

The squad coordinator (Ralph or equivalent) MUST call `Test-RetroOverdue` at the start of each round. If the function returns `$true`, the retro runs before any other work is scheduled.

```powershell
# Signature
function Test-RetroOverdue {
    param(
        [string]$LogDir = ".squad/log",
        [int]$WindowDays = 7
    )
    # Returns $true if no retrospective log exists within the last $WindowDays days
    # Caller must treat $true as: run retro immediately, block other work
}
```

**Integration contract:**
1. Call `Test-RetroOverdue` before building the work queue
2. If `$true`: spawn the Scribe agent with retro mode, wait for completion
3. If `$false`: proceed with normal work queue
4. Log the retro check result in the round summary

## Output Artifacts

After every retro, these artifacts MUST exist:

1. **Log file:** `.squad/log/{timestamp}-retrospective.md` — full retro record
2. **GitHub Issues:** one per action item, linked from log file
3. **Decision records:** updated entries in `.squad/decisions/` for any decisions made

## Anti-Patterns to Avoid

- ❌ Writing action items as markdown `- [ ]` checklists
- ❌ Skipping the retro because the squad is "too busy"
- ❌ Running a retro without creating any Issues (means no action items were identified, which is almost always wrong)
- ❌ Creating duplicate Issues for the same action item across multiple retros