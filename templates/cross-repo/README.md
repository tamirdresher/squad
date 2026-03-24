# Cross-Repo Squad Coordination Template

This template enables coordination between a **production** squad repo and a **research/staging** squad repo using the Ralph-R protocol — a pattern pioneered in real Squad deployments.

## Architecture

```
Production Repo                    Research Repo
(yourorg/main-project)             (yourorg/main-project-research)
        │                                   │
        │  issues labeled                   │  research findings
        │  'research:request'               │  posted back as comments
        └──────────── Ralph-R ─────────────┘
                   (monitors both,
                    routes work,
                    reports results)
```

- **Production repo**: Uses Squad for day-to-day operations; labels issues `research:request` to dispatch work
- **Research repo**: Uses Squad for experimental work; agents investigate and post findings back
- **Ralph-R agent**: Monitors both repos, routes work items, and surfaces findings across the boundary

## Files in This Template

| File | Purpose |
|------|---------|
| `cross-repo-sync.yml` | GitHub Actions workflow: mirrors labeled issues to the research repo |
| `research-report-back.yml` | GitHub Actions workflow: posts research findings back to production |
| `SCHEMA.md` | Cross-machine message schema for Ralph-R |
| `ralph-r-charter.md` | Agent charter template for the Ralph-R coordinator |

## Setup

### Step 1: Configure secrets and variables

In **both** repos, add:
- Secret: `CROSS_REPO_TOKEN` — a GitHub PAT or fine-grained token with `issues: write` on both repos
- Variable: `RESEARCH_REPO` — the full name of the research repo (e.g., `yourorg/main-project-research`)
- Variable: `PRODUCTION_REPO` — the full name of the production repo (e.g., `yourorg/main-project`)

### Step 2: Install workflows

In your **production repo**:
```bash
cp templates/cross-repo/cross-repo-sync.yml .github/workflows/
```

In your **research repo**:
```bash
cp templates/cross-repo/research-report-back.yml .github/workflows/
```

### Step 3: Install the schema

In **both repos**:
```bash
mkdir -p .squad/cross-machine
cp templates/cross-repo/SCHEMA.md .squad/cross-machine/SCHEMA.md
```

### Step 4: Add Ralph-R to your research repo

```bash
mkdir -p .squad/agents/ralph-r
cp templates/cross-repo/ralph-r-charter.md .squad/agents/ralph-r/charter.md
```

Then add Ralph-R to `.squad/team.md`:
```markdown
## Ralph-R
- Role: Cross-repo coordinator
- Expertise: Research routing, production↔research sync
- See: .squad/agents/ralph-r/charter.md
```

### Step 5: Create labels

In your production repo, create:
- `research:request` — triggers dispatch to research repo
- `research:active` — applied by Ralph-R when work is in progress
- `research:complete` — applied when findings are posted back

## Usage

1. In your production repo, label any issue `research:request`
2. `cross-repo-sync.yml` automatically creates a mirror issue in the research repo
3. Your research squad works the issue; when done, they close it with a summary
4. `research-report-back.yml` posts findings back to the original production issue

## Why This Pattern?

Some work is too exploratory for the main branch — new APIs, experimental architectures, risky refactors. The cross-repo protocol lets you:
- Keep production Squad state clean and stable
- Run experiments without cluttering the production issue tracker
- Automatically surface findings when research completes
- Maintain a clear paper trail across both repos
