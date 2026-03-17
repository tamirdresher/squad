---
title: "Upstream Auto-Sync: Keep Squads in Sync"
date: 2026-03-17
author: "Squad (Copilot)"
wave: null
tags: [squad, sync, orchestration, parent-child, automation]
status: published
hero: "Upstream sync enables bidirectional change detection and synchronization between parent and child squads. Detect updates automatically, pull selectively, and propose changes back with a single command."
---

# Upstream Auto-Sync: Keep Squads in Sync

> _Child squads detect parent changes automatically, pull updates selectively, and propose changes back upstream—no manual diff hunting required._

## The Problem

Many organizations structure squads hierarchically: a parent squad defines shared governance and patterns, while child squads inherit and customize for their teams. Today, keeping them in sync requires manual work:

- Child squads periodically check if parent changed
- No clear way to decide what to pull (skills vs. governance vs. all)
- When child squads learn something valuable, proposing it back upstream means manual PR creation with copy-paste
- Multiple child squads quickly drift from parent, creating inconsistency

Upstream auto-sync solves this with **automatic change detection and bidirectional sync**.

## How It Works

### Register a Parent

```bash
squad upstream add https://github.com/org/parent-squad --name parent
```

The squad clones the parent (once) and stores metadata in `.squad/upstream.json`.

### Watch for Changes

```bash
squad upstream watch --interval 10 --auto-pr
```

The watcher:
1. Polls the parent repo every 10 seconds
2. Hashes files in key directories (`.squad/`, `docs/`, `lib/`)
3. Detects additions, changes, deletions
4. Optionally creates a PR in your squad with the updates

### Propose Changes Back

```bash
squad upstream propose parent --skills --decisions
```

Your squad packages its learnings (skills, decisions, or all) and creates a PR in the parent for review and merge.

## Real-World Example

### Monorepo Pattern

An organization has:
- **parent-squad**: Defines shared conventions, governance, and base skills
- **team-a-squad**: Inherits from parent, customizes for Team A's workflow
- **team-b-squad**: Inherits from parent, customizes for Team B's workflow

**Day 1:** Both teams sync from parent
```bash
squad upstream sync parent
```

**Day 3:** Parent squad learns a valuable skill (e.g., "jest-mocking-patterns")
- Parent updates its `.ai-team/skills/jest-mocking-patterns/SKILL.md`
- Child squads detect the change via `squad upstream watch`
- Child squads auto-pull the new skill

**Day 5:** Team A discovers an improvement to governance
```bash
squad upstream propose parent --decisions
```
- Team A's squad creates a PR in parent with the governance update
- Parent merges it
- Team B detects the change and auto-pulls it next watch cycle

## Configuration

Upstreams live in `.squad/upstream.json`:

```json
{
  "upstreams": [
    {
      "name": "parent",
      "source": "https://github.com/org/parent-squad",
      "ref": "main",
      "lastSync": "2026-03-17T10:30:00Z"
    }
  ]
}
```

## GitHub Actions Integration

For teams using GitHub, automate the watch with a cron job:

```bash
squad upstream init-ci
```

This generates `.github/workflows/squad-upstream-sync.yml` that runs every 6 hours and auto-creates PRs when changes are detected.

## Technical Design

Upstream sync uses **file hashing** instead of git diff:

- **Speed**: Hash-based detection is fast (no clone on every check)
- **Flexibility**: Works with git repos, local paths, and exported squads
- **Safety**: No merge conflicts—sync creates a PR for human review

How it works:
1. Parent is cloned to `.squad/_upstream_repos/{name}/` (once)
2. Files in `.squad/`, `docs/`, `scripts/` are hashed
3. Hash changed? → Create PR with the diff
4. User reviews and merges

## See Also

- [Generic Scheduler](/features/generic-scheduler) — Run upstream sync as a scheduled task
- [Cross-Squad Orchestration](/features/cross-squad-orchestration) — Delegate work across squads
- [Persistent Ralph](/features/persistent-ralph) — Monitor all squad activity
