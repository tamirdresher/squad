# Upstream Auto-Sync

**Try this to see configured upstreams:**
```
squad upstream list
```

**Try this to watch for parent changes:**
```
squad upstream watch --interval 10 --auto-pr
```

**Try this to propose changes back:**
```
squad upstream propose --all
```

Upstream sync keeps your squad in sync with parent repositories. Detect changes automatically, pull them into your squad, and propose your own changes back upstream with minimal friction.

---

## What Upstream Sync Does

Upstream sync enables **bidirectional synchronization** between parent and child squads. Register a parent repository (local path or git URL), and your squad can:

1. **Detect changes** in the parent using fast file hashing
2. **Pull updates** selectively (skills, decisions, governance, or all)
3. **Propose changes** back to the parent repo as a pull request
4. **Monitor continuously** with an optional GitHub Action cron job

## Quick Start

### Register a Parent Upstream

```bash
squad upstream add https://github.com/org/parent-squad --name parent
```

For a local path:
```bash
squad upstream add ../parent-squad --name local-parent
```

View registered upstreams:
```bash
squad upstream list
```

### Sync Now

Pull updates from all registered upstreams:
```bash
squad upstream sync
```

Sync a specific upstream:
```bash
squad upstream sync parent
```

### Watch for Changes

Start watching for parent changes every 10 seconds:
```bash
squad upstream watch --interval 10
```

Auto-create a PR when changes are detected:
```bash
squad upstream watch --auto-pr
```

The `watch` command runs until stopped (Ctrl+C), continuously polling for new changes.

### Propose Changes Upstream

Package your squad's learnings to propose back:

All learnings:
```bash
squad upstream propose parent --all
```

Just skills and decisions:
```bash
squad upstream propose parent --skills --decisions
```

The proposal creates a pull request in the parent repository with your changes, formatted for easy review.

## Configuration

Upstreams are stored in `.squad/upstream.json`:

```json
{
  "upstreams": [
    {
      "name": "parent",
      "source": "https://github.com/org/parent-squad",
      "ref": "main",
      "lastSync": "2026-03-17T10:30:00Z"
    },
    {
      "name": "local",
      "source": "../parent-squad",
      "ref": "main",
      "lastSync": "2026-03-17T10:20:00Z"
    }
  ]
}
```

- **name**: Identifier for this upstream
- **source**: Git URL or local filesystem path
- **ref**: Branch/tag to track (defaults to `main`)
- **lastSync**: ISO timestamp of last successful sync

## GitHub Actions Integration

Automate upstream sync with a scheduled workflow:

```bash
squad upstream init-ci
```

This creates `.github/workflows/squad-upstream-sync.yml` configured to:
- Run every 6 hours via cron
- Sync all registered upstreams
- Auto-create pull requests when changes found
- Post summaries to GitHub Issues

Customize the schedule and PR behavior in the generated workflow.

## How Change Detection Works

Upstream sync uses **file hashing** (not git diff) for fast, cross-source change detection:

1. Clone/read the parent repo to `.squad/_upstream_repos/{name}/`
2. Hash all files in key directories (`.squad/`, `docs/`, etc.)
3. Compare hashes to last known state
4. If changes found, optionally create PR

This approach works whether the parent is:
- A remote git repository (over HTTPS/SSH)
- A local filesystem path
- An exported squad (local directory)

## Use Cases

### Monorepo Pattern
- Parent squad defines shared governance, patterns, and skills
- Child squads inherit and customize
- Run `squad upstream sync parent` when parent updates
- Propose back when child squad learns something valuable

### Distributed Teams
- Each team has their own squad (local branch)
- Central squad acts as coordinator
- Cross-team discoveries flow back via `squad upstream propose`

### Export & Reuse
- Export a proven squad from one org
- Import into new org via upstream sync
- Continue receiving updates from original

## See Also

- [Cross-Squad Orchestration](/features/cross-squad-orchestration) — delegate work across squads
- [Persistent Ralph](/features/persistent-ralph) — track squad activity
- [Generic Scheduler](/features/generic-scheduler) — run scheduled sync tasks
