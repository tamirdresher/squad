# Squad SubSquads

> Scale Squad across multiple Codespaces by partitioning work into labeled SubSquads.

## What Are SubSquads?

A **SubSquad** is a named partition of work within a Squad project. Each SubSquad targets a specific GitHub label (e.g., `team:ui`, `team:backend`) and optionally restricts agents to certain directories. Multiple Squad instances — each running in its own Codespace — can each activate a different SubSquad, enabling parallel work across teams.

## Why SubSquads?

Squad was originally designed for a single team per repository. As projects grow, a single Codespace becomes a bottleneck:

- **Model rate limits** — One Codespace hitting API limits slows the whole team
- **Context overload** — Ralph picks up all issues, not just the relevant ones
- **Folder conflicts** — Multiple agents editing the same files causes merge pain

SubSquads solve this by giving each Codespace a scoped view of the project.

## Configuration

### 1. Create `.squad/streams.json`

```json
{
  "workstreams": [
    {
      "name": "ui-team",
      "labelFilter": "team:ui",
      "folderScope": ["apps/web", "packages/ui"],
      "workflow": "branch-per-issue",
      "description": "Frontend team — React, CSS, components"
    },
    {
      "name": "backend-team",
      "labelFilter": "team:backend",
      "folderScope": ["apps/api", "packages/core"],
      "workflow": "branch-per-issue",
      "description": "Backend team — APIs, database, services"
    },
    {
      "name": "infra-team",
      "labelFilter": "team:infra",
      "folderScope": [".github", "infrastructure"],
      "workflow": "direct",
      "description": "Infrastructure — CI/CD, deployment, monitoring"
    }
  ],
  "defaultWorkflow": "branch-per-issue"
}
```

### 2. Activate a SubSquad

There are three ways to tell Squad which SubSquad to use:

#### Environment Variable (recommended for Codespaces)

```bash
export SQUAD_TEAM=ui-team
```

Set this in your Codespace's environment or devcontainer.json:

```json
{
  "containerEnv": {
    "SQUAD_TEAM": "ui-team"
  }
}
```

#### .squad-workstream File (local activation)

```bash
squad subsquads activate ui-team
```

This writes a `.squad-workstream` file (gitignored) so the setting is local to your machine.

#### Auto-select (single SubSquad)

If `streams.json` contains only one SubSquad, it's automatically selected.

### 3. Resolution Priority

1. `SQUAD_TEAM` env var (highest)
2. `.squad-workstream` file
3. Single-SubSquad auto-select
4. No SubSquad (classic single-squad mode)

## SubSquad Definition Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique SubSquad identifier (kebab-case) |
| `labelFilter` | Yes | GitHub label to filter issues |
| `folderScope` | No | Directories this SubSquad may modify |
| `workflow` | No | `branch-per-issue` (default) or `direct` |
| `description` | No | Human-readable purpose |

## CLI Reference

```bash
# List configured SubSquads
squad subsquads list

# Show SubSquad activity (branches, PRs)
squad subsquads status

# Activate a SubSquad locally
squad subsquads activate <name>
```

> **Note:** `squad workstreams` and `squad streams` are deprecated aliases for `squad subsquads`.

## How It Works

### Triage (Ralph)

When a SubSquad is active, Ralph's triage only picks up issues labeled with the SubSquad's `labelFilter`. Unmatched issues are left for other SubSquads or the main squad.

### Workflow Enforcement

- **branch-per-issue** (default): Every issue gets its own branch and PR. Agents never commit directly to main.
- **direct**: Agents may commit directly (useful for infra/ops SubSquads).

### Folder Scope

When `folderScope` is set, agents should primarily modify files within those directories. However, `folderScope` is **advisory, not a hard lock** — agents may still touch shared files (types, configs, package exports) when their issue requires it. The real protection comes from `branch-per-issue` workflow: each issue gets its own branch, so two SubSquads editing the same file won't conflict until merge time.

> **Tip:** If two SubSquads' PRs touch the same file, Git resolves non-overlapping changes automatically. For semantic conflicts (incompatible API changes), use PR review to catch them.

### Cost Optimization: Single-Machine Multi-SubSquad

You don't need a separate Codespace per SubSquad. One machine can serve multiple SubSquads:

```bash
# Switch between SubSquads manually
squad subsquads activate ui-team      # Ralph works team:ui issues
# ... later ...
squad subsquads activate backend-team # now works team:backend issues
```

This gives you 1× Codespace cost instead of N×, at the expense of serial (not parallel) execution. Each issue still gets its own branch — no conflicts.

## Example: Multi-Codespace Setup

See [Multi-Codespace Scenario](../scenarios/multi-codespace.md) for a complete walkthrough.
