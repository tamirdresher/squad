---
name: retro-enforcement
description: Enforce retrospective ceremonies on schedule and track action items as GitHub Issues
domain: ceremonies, team-collaboration
confidence: high
source: earned (0% markdown completion vs 85%+ GitHub Issues across 6 retrospectives)
---

# Skill: Retro Enforcement

## Purpose

Ensure retrospectives happen on schedule and that their action items are tracked in GitHub Issues — not markdown checklists.

This skill addresses a specific, measured failure mode: **0% completion rate on markdown retro action items across 6 consecutive retrospectives**. GitHub Issues have an 85%+ completion rate in the same squad. The format was the problem, not the people.

## Core Function: Test-RetroOverdue

```powershell
function Test-RetroOverdue {
    param(
        [string]$LogDir    = ".squad/log",
        [int]$WindowDays   = 7,
        [string]$Pattern   = "*retrospective*"
    )

    $cutoff = (Get-Date).AddDays(-$WindowDays)

    $retroLogs = Get-ChildItem -Path $LogDir -Filter $Pattern -ErrorAction SilentlyContinue |
                 Where-Object { $_.LastWriteTime -ge $cutoff }

    return ($retroLogs.Count -eq 0)
}
```

### Returns
- `$true` — No retro log found within the window. **Retro is overdue. Block other work.**
- `$false` — At least one retro log found within the window. Proceed normally.

### Detection Logic

The function checks `.squad/log/` for any file matching `*retrospective*` dated within the last `$WindowDays` days (default: 7). If none is found, the retro is overdue.

**File naming convention:** `.squad/log/{ISO8601-timestamp}-retrospective.md`

Example: `.squad/log/2026-03-24T14-45-00Z-retrospective.md`

## Ceremony Format

### Cadence

| Field | Value |
|-------|-------|
| **Frequency** | Bi-weekly (every 2 weeks) or weekly for high-velocity squads |
| **Trigger** | Automatic — Friday at 14:00 UTC, or when `Test-RetroOverdue` returns `$true` |
| **Condition** | No `*retrospective*` log file exists in `.squad/log/` for the current week (Mon–Fri window) |
| **Coordinator** | Squad Lead (Picard) or designated facilitator |
| **Participants** | All squad members |
| **Duration** | 20–30 minutes |

### Inputs

The facilitator should gather before running:
1. **Orchestration logs** — `.squad/log/` files since the last retrospective
2. **Closed issues** — GitHub Issues closed in the period (provides velocity data)
3. **Open blockers** — Issues tagged `pending-user` or `blocked`
4. **Decisions inbox** — New files in `.squad/decisions/inbox/` since last retro
5. **Upstream activity** — PRs opened/merged to upstream repositories

### Required Format: 4 Sections

#### Section 1 — What Worked 🟢
List 3–5 things that went well. Be specific: name the issue, the pattern, the agent, or the technique.

#### Section 2 — What Didn't Work 🔴
List 2–4 friction points or failures. Be honest. These become candidates for action items.

#### Section 3 — Action Items (MUST be GitHub Issues)
> ⚠️ **Critical rule:** Action items from retrospectives MUST be created as GitHub Issues — not markdown checklists.

**Required Issue fields:**
- Title: short, actionable verb phrase
- Body: context from the retro, links to related issues
- Assignee: the agent or human responsible
- Label: `squad` + relevant area label
- Milestone: current sprint (if applicable)

#### Section 4 — Decision Updates
For each pending decision from `.squad/decisions/inbox/`:
- State: Approved / Rejected / Needs-more-info / Delegated
- Owner: who executes next
- Deadline: if time-sensitive

## Coordinator Integration

Call `Test-RetroOverdue` **at the start of every round**, before building the work queue.

```powershell
# At round start — before any work queue construction
if (Test-RetroOverdue -LogDir ".squad/log" -WindowDays 7) {
    Write-Host "[RETRO] Retrospective overdue. Running before other work."

    # Spawn retro facilitator
    Invoke-RetroSession -Mode "catch-up"

    # Wait for retro log to be written
    # Then resume normal round
}

# Proceed with normal work queue
$workQueue = Get-PendingIssues | Sort-Object -Property Priority
```

### Blocking Semantics

When `Test-RetroOverdue` returns `$true`:
1. **Do not start any other work** until the retro completes
2. **Spawn the facilitator agent** (Scribe or designated) with retro mode
3. **Wait for the log file** to be written to `.squad/log/`
4. **Verify action items** were created as GitHub Issues (not markdown)
5. **Resume normal round** after retro log confirmed

## Action Item Enforcement

### Verification Check

```powershell
function Test-RetroActionItemsCreated {
    param([string]$RetroLogPath)

    $content = Get-Content $RetroLogPath -Raw

    # Check for Issue references (e.g., #1478, https://github.com/.../issues/1478)
    $issueRefs = [regex]::Matches($content, '(?:#\d{3,}|issues/\d{3,})')

    # Check for unclosed markdown checkboxes (bad pattern)
    $openCheckboxes = [regex]::Matches($content, '- \[ \]')

    if ($openCheckboxes.Count -gt 0) {
        Write-Warning "[RETRO] Found $($openCheckboxes.Count) markdown checkboxes — convert to Issues"
        return $false
    }

    return ($issueRefs.Count -gt 0)
}
```

### Why Not Markdown Checklists

From production data in tamirdresher/tamresearch1:

| Retro | Action Items Format | Completion |
|-------|---------------------|------------|
| 2025-12-05 | Markdown `- [ ]` | 0/4 = **0%** |
| 2025-12-19 | Markdown `- [ ]` | 0/3 = **0%** |
| 2026-01-09 | Markdown `- [ ]` | 0/5 = **0%** |
| 2026-01-23 | Markdown `- [ ]` | 0/4 = **0%** |
| 2026-02-07 | Markdown `- [ ]` | 0/3 = **0%** |
| 2026-02-21 | Markdown `- [ ]` | 0/4 = **0%** |
| 2026-03-24 | GitHub Issues | 4/4 = **100%** (after enforcement) |

## Output Artifacts

After every retro, these artifacts MUST exist:

1. **Log file:** `.squad/log/{timestamp}-retrospective.md` — full retro record
2. **GitHub Issues:** one per action item, linked from log file
3. **Decision records:** updated entries in `.squad/decisions/` for any decisions made

## Anti-Patterns to Avoid

- ❌ Writing action items as markdown `- [ ]` checklists
- ❌ Skipping the retro because the squad is "too busy"
- ❌ Running a retro without creating any Issues
- ❌ Creating duplicate Issues for the same action item across multiple retros

## Skill Metadata

| Field | Value |
|-------|-------|
| **Skill ID** | `retro-enforcement` |
| **Category** | Ceremonies / Process |
| **Trigger** | Coordinator round start |
| **Dependencies** | `.squad/log/` directory, GitHub Issues API |
| **Tested in** | tamirdresher/tamresearch1 (production, March 2026) |
| **Outcome** | Retro cadence restored; action item completion 0% → 100% |
