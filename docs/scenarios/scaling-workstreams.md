# Scaling with SubSquads

> Partition your repo's work across multiple Squad instances for horizontal scaling.

## The Problem

A single Squad instance handles all issues in a repo. For large projects, this creates bottlenecks:
- Too many issues overwhelm a single team
- Agents step on each other's toes in shared code
- No workflow enforcement (agents commit directly to main)
- No way to monitor multiple teams centrally

## The Solution: SubSquads

SubSquads partition a repo's issues into labeled subsets. Each Codespace (or machine) runs one SubSquad, scoped to its slice of work.

```
┌─────────────────────────────────────────────────┐
│  Repository: acme/starship                      │
│                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Codespace 1 │ │ Codespace 2 │ │ Codespace 3│ │
│  │ team:bridge │ │ team:engine │ │ team:ops   │ │
│  │ Picard,Riker│ │ Geordi,Worf │ │ Troi,Crusher│ │
│  │ UI + API    │ │ Core engine │ │ Infra + CI │ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
│                                                 │
│  Each Squad instance only picks up issues       │
│  matching its SubSquad label.                 │
└─────────────────────────────────────────────────┘
```

## Quick Start

### 1. Define SubSquads

Create `.squad/streams.json`:

```json
{
  "defaultWorkflow": "branch-per-issue",
  "workstreams": [
    {
      "name": "bridge",
      "labelFilter": "team:bridge",
      "folderScope": ["src/api", "src/ui"],
      "description": "Bridge crew — API and UI"
    },
    {
      "name": "engine",
      "labelFilter": "team:engine",
      "folderScope": ["src/core", "src/engine"],
      "description": "Engineering — core systems"
    },
    {
      "name": "ops",
      "labelFilter": "team:ops",
      "folderScope": ["infra/", "scripts/", ".github/"],
      "description": "Operations — CI/CD and infra"
    }
  ]
}
```

### 2. Label your issues

Each issue gets a `team:*` label matching a SubSquad. Ralph will only pick up issues matching the active SubSquad's label.

### 3. Activate a SubSquad

**Option A — Environment variable (Codespaces):**
Set `SQUAD_TEAM=bridge` in the Codespace's environment. Squad auto-detects it on session start.

**Option B — CLI activation (local):**
```bash
squad subsquads activate bridge
```
This writes a `.squad-workstream` file (gitignored — local to your machine).

**Option C — Single SubSquad auto-select:**
If `streams.json` defines only one SubSquad, it's auto-selected.

### 4. Run Squad normally

```bash
squad start
# or: "Ralph, go" in the session
```

Ralph will only scan for issues with the `team:bridge` label. Agents will only pick up matching work.

## CLI Commands

```bash
# List configured SubSquads
squad subsquads list

# Show activity per SubSquad (branches, PRs)
squad subsquads status

# Activate a SubSquad for this machine
squad subsquads activate engine

# Deprecated aliases (still work)
squad workstreams list
squad streams list
```

> **Note:** `squad workstreams` and `squad streams` are deprecated aliases for `squad subsquads`.

## Key Design Decisions

### folderScope is Advisory

`folderScope` tells agents which directories to focus on — but it's not a hard lock. Agents can modify shared packages (like `src/shared/`) when needed, and will call out when working outside their scope.

### Workflow Enforcement

Each SubSquad specifies a `workflow` (default: `branch-per-issue`). When active, agents:
- Create a branch for every issue (`squad/{issue-number}-{slug}`)
- Open a PR when work is ready
- Never commit directly to main

### Single-Machine Multi-SubSquad

You don't need multiple Codespaces to test. Use `squad subsquads activate` to switch between SubSquads sequentially on a single machine.

## Resolution Chain

Squad resolves the active SubSquad in this order:

1. `SQUAD_TEAM` environment variable
2. `.squad-workstream` file (written by `squad subsquads activate`)
3. Auto-select if exactly one SubSquad is defined
4. No SubSquad → single-squad mode (backward compatible)

## Monitoring

Use `squad subsquads status` to see all SubSquads' activity:

```
Configured SubSquads

  Default workflow: branch-per-issue

  ● active  bridge
       Label: team:bridge
       Workflow: branch-per-issue
       Folders: src/api, src/ui

  ○  engine
       Label: team:engine
       Workflow: branch-per-issue
       Folders: src/core, src/engine

  ○  ops
       Label: team:ops
       Workflow: branch-per-issue
       Folders: infra/, scripts/, .github/

  Active SubSquad resolved via: env
```

## See Also

- [Multi-Codespace Setup](multi-codespace.md) — Walkthrough of the Tetris experiment
- [SubSquads PRD](../specs/streams-prd.md) — Full specification
- [SubSquads Feature Guide](../features/streams.md) — API reference
