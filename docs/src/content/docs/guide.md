# Squad — Product Guide

## What Is Squad?

Squad gives you an AI development team through GitHub Copilot. You describe what you're building. Squad proposes a team of specialists — lead, frontend, backend, tester — that live in your repo as files. Each agent runs in its own context window, reads its own knowledge, and writes back what it learned. They persist across sessions, share decisions, and get better the more you use them.

It is not a chatbot wearing hats. Each team member is spawned as a real sub-agent with its own tools, its own memory, and its own area of expertise.

---

## Supported Platforms

Squad is designed for **GitHub Copilot CLI** and ships with full support. **VS Code is now fully supported with zero code changes** — agents work identically on both platforms.

**Current state:**
- ✅ **GitHub Copilot CLI** — fully supported. This is the primary platform. Uses the stable `task` tool for sub-agent spawning, per-spawn model selection, and background mode.
- ✅ **VS Code Copilot** — fully supported (v0.4.0+). VS Code uses `runSubagent` for parallel execution and supports full `.ai-team/` read/write. See [Client Compatibility Matrix](scenarios/client-compatibility.md) for details.
- ❌ **Other platforms** — JetBrains IDEs and other runtimes are untested. GitHub.com web-based Copilot is untested.

For a detailed feature comparison across platforms (model selection, background execution, file access, etc.), see [Client Compatibility Matrix](scenarios/client-compatibility.md).

---

## Installation

```bash
npx github:bradygaster/squad
```

**Requirements:**
- Node.js 20+ (LTS)
- GitHub Copilot (CLI, VS Code, Visual Studio, or Coding Agent)
- A git repository (Squad stores team state in `.ai-team/`)
- **`gh` CLI** — required for GitHub Issues, PRs, Ralph, and Project Boards ([install](https://cli.github.com/))

This copies `squad.agent.md` into `.github/agents/`, installs 10 GitHub Actions workflows into `.github/workflows/`, and adds templates to `.ai-team-templates/`. Your actual team (`.ai-team/`) is created at runtime when you first talk to Squad.

**Note:** When you select Squad from the agent picker, you'll see the version number in the name (e.g., "Squad (v0.3.0)"). This helps you confirm which version is installed.

### GitHub CLI Authentication

Squad uses the `gh` CLI for all GitHub API operations — issues, PRs, labels, project boards, and Ralph's work monitoring. You must authenticate before using any of these features.

**Quick start:**

```bash
gh auth login
```

Choose **GitHub.com**, **HTTPS**, and authenticate with your browser or a Personal Access Token (PAT Classic).

**Verify it worked:**

```bash
gh auth status
```

**Additional scopes** — some features require scopes beyond the default:

| Feature | Required Scope | Command |
|---------|---------------|---------|
| Issues, PRs, Ralph | `repo` (included by default) | — |
| Project Boards | `project` | `gh auth refresh -s project` |

The `gh auth refresh` command adds scopes to your existing token — it takes about 10 seconds and you only need to do it once.

**Troubleshooting:**

- **"gh: command not found"** — Install the GitHub CLI from https://cli.github.com/
- **"HTTP 401" or "authentication required"** — Run `gh auth login` to re-authenticate
- **Project board commands fail** — Run `gh auth refresh -s project` to add the `project` scope
- **"Resource not accessible by integration"** — Your token may lack the `repo` scope. Re-authenticate with a PAT Classic that has `repo` and `project` scopes

---

## How Teams Form (Init Mode)

When you open Copilot and select **Squad** for the first time in a repo, there's no team yet. Squad enters Init Mode:

1. **Squad identifies you** via `git config user.name` and uses your name in conversation.
2. **You describe your project** — language, stack, what it does.
3. **Squad casts a team** — agents get names from a single fictional universe (e.g., The Usual Suspects, Alien, Ocean's Eleven). The universe is selected deterministically based on team size, project shape, and what's been used before. Names are persistent identifiers — they don't change the agent's behavior or voice.
4. **Squad proposes the team:**

```
🏗️  Ripley   — Lead          Scope, decisions, code review
⚛️  Dallas   — Frontend Dev  React, UI, components
🔧  Kane     — Backend Dev   APIs, database, services
🧪  Lambert  — Tester        Tests, quality, edge cases
📋  Scribe   — (silent)      Memory, decisions, session logs
```

5. **You confirm** — say "yes", adjust roles, add someone, or just give a task (which counts as implicit yes).

Squad then creates the `.ai-team/` directory structure with charters, histories, routing rules, casting state, and ceremony config. Each agent's `history.md` is seeded with your project description and tech stack so they have day-1 context.

### What gets created

```
.ai-team/
├── team.md                    # Roster — who's on the team
├── routing.md                 # Who handles what
├── ceremonies.md              # Team meeting definitions
├── decisions.md               # Shared brain — team decisions
├── decisions/inbox/           # Drop-box for parallel decision writes
├── casting/
│   ├── policy.json            # Universe allowlist and capacity
│   ├── registry.json          # Persistent agent name registry
│   └── history.json           # Universe usage history
├── agents/
│   ├── {name}/
│   │   ├── charter.md         # Identity, expertise, boundaries
│   │   └── history.md         # What they know about YOUR project
│   └── scribe/
│       └── charter.md         # Silent memory manager
├── skills/                    # Shared skill files (SKILL.md)
├── orchestration-log/         # Per-spawn log entries
└── log/                       # Session history
```

**Commit this folder.** Anyone who clones your repo gets the team — with all their accumulated knowledge.

---

## Talking to Your Team (Routing)

How you phrase your message determines who works on it.

### Name an agent directly

```
> Ripley, fix the error handling in the API
```

Squad spawns Ripley specifically.

### Say "team" for parallel fan-out

```
> Team, build the login page
```

Squad spawns multiple agents simultaneously — frontend builds the UI, backend sets up endpoints, tester writes test cases from the spec, all at once.

### General requests

```
> Add input validation to the form
```

Squad checks `routing.md`, picks the best match, and may launch anticipatory agents (e.g., tester writes validation test cases while the implementer builds).

### Quick questions — no spawn

```
> What port does the server run on?
```

Squad answers directly without spawning an agent.

### Example prompts to try

| You say | What happens |
|---------|-------------|
| `"Dallas, set up the project structure"` | Dallas (Frontend) scaffolds the project |
| `"Team, build the user dashboard"` | Multiple agents launch in parallel |
| `"Where are we?"` | Squad gives a quick status from recent logs |
| `"Run a retro"` | Lead facilitates a retrospective ceremony |
| `"I need a DevOps person"` | A new agent joins, named from the same universe |
| `"Always use single quotes in TypeScript"` | Captured as a directive to `decisions.md` |

---

## Response Modes

Not every request needs the full agent machinery. Squad uses tiered response modes to balance speed and depth:

| Mode | Approximate Time | What Happens | When Used |
|------|-------------------|-------------|-----------|
| **Direct** | ~2–3s | Coordinator answers from memory/context — no agent spawned | Quick factual questions, status checks |
| **Lightweight** | ~8–12s | Agent spawned with reduced overhead (no charter/history/decisions reads) | Simple tasks with known inputs |
| **Standard** | ~25–35s | Full agent spawn with charter, history, and decisions | Most work requests |
| **Full** | ~40–60s | Multi-agent parallel spawn with design review ceremony | Complex multi-domain tasks |

The coordinator selects the mode automatically. You don't need to specify it. More complex tasks naturally take longer because more agents are working in parallel and reading more context.

---

## Memory System

Squad's memory is layered. Knowledge grows with use.

### Personal memory: `history.md`

Each agent has its own `history.md` in `.ai-team/agents/{name}/`. After every session, agents append what they learned — architecture decisions, conventions, user preferences, key file paths. This file is read only by that agent.

After a few sessions, agents stop asking questions they've already answered.

### Shared memory: `decisions.md`

Team-wide decisions live in `.ai-team/decisions.md`. Every agent reads this before working. Decisions are captured in three ways:

1. **From agent work** — agents write decisions to `.ai-team/decisions/inbox/{name}-{slug}.md`
2. **From user directives** — when you say "always use..." or "never do..."
3. **Scribe merges** — the Scribe agent consolidates inbox entries into the canonical file, deduplicates, and propagates updates to affected agents

### Skills: `.ai-team/skills/`

Skill files (`SKILL.md`) encode reusable knowledge. They come in two varieties:

- **Starter skills** — bundled at init (e.g., squad conventions)
- **Earned skills** — written by agents from real work, with a confidence lifecycle: `low → medium → high`

Agents read relevant skill files before working on a task.

### How memory compounds

| Stage | What agents know |
|-------|-----------------|
| 🌱 First session | Project description, tech stack, user name |
| 🌿 After a few sessions | Conventions, component patterns, API design, test strategies |
| 🌳 Mature project | Full architecture, tech debt map, regression patterns, performance conventions |

---

## Export and Import

### Export your squad

```bash
npx github:bradygaster/squad export
```

Creates `squad-export.json` — a portable snapshot of your entire team: agents, casting state, skills, and accumulated knowledge.

Use this to:
- Back up your team before major changes
- Share a trained team with a colleague
- Move a team to a different repo

### Import a squad

```bash
npx github:bradygaster/squad import squad-export.json
```

Imports the snapshot into the current repo. Squad handles collision detection — if agents with the same names already exist, it warns you.

Use `--force` to archive existing agents and replace them:

```bash
npx github:bradygaster/squad import squad-export.json --force
```

During import, agent histories are split into **portable knowledge** (general learnings that transfer) and **project-specific learnings** (which stay context-tagged). This means imported agents bring their skills without assuming your project works the same way.

---

## GitHub Issues Mode

Squad integrates with GitHub Issues via the `gh` CLI for issue-driven development.

### Connect to a repository

```
> Connect to myorg/myrepo
```

Squad stores the issue source and makes the repository's issues available to the team.

### View the backlog

```
> Show the backlog
```

Squad displays open issues in a table format.

### Assign an issue to an agent

```
> Work on #12
```

The appropriate agent picks up the issue. What happens next:

1. Agent creates a branch with a descriptive name based on the issue
2. Agent does the implementation work
3. Agent opens a PR linked to the issue

### Handle PR review feedback

```
> There's review feedback on PR #3
```

The relevant agent reads the review comments and addresses them.

### Merge completed work

```
> Merge it
```

The PR is merged and the linked issue is closed.

### Check remaining work

```
> What's left?
```

Squad refreshes the backlog and shows remaining open issues.

---

## PRD Mode

If you have a product requirements document, paste the spec directly:

```
> Here's what we're building:
>
> [paste your PRD or spec here]
```

The Lead agent decomposes the spec into discrete work items. These become trackable tasks that Squad distributes across the team. Each work item gets assigned to the agent best suited for it, and the team works them in parallel where possible.

---

## Human Team Members

Not every team member needs to be an AI agent. You can add human team members to the roster:

```
> Add Sarah as a human team member — she handles design reviews
```

Human team members appear in the roster with a distinct badge. When work is routed to a human:

- **Squad pauses** and tells you a human needs to act
- **Stale reminders** trigger if the human hasn't responded after a configurable period
- Humans can serve as **reviewers** in the reviewer protocol

This is useful for teams where certain decisions (design sign-off, security review, product approval) require a real person.

---

## Notifications

Your squad can notify you when they need input — send instant pings to Teams, Discord, iMessage, or any webhook. Agents trigger notifications when they're blocked, need a decision, hit an error, or complete important work.

**Setup is quick:** Configure an MCP notification server (takes 5 minutes), and agents automatically know when to ping you.

See [Notifications Guide](features/notifications.md) for platform-specific setup and examples. For MCP configuration details, see [MCP Setup Guide](features/mcp.md).

---

## Ceremonies

Ceremonies are structured team meetings. Squad ships with two default ceremonies:

### Design Review (automatic)

**Triggers before** multi-agent tasks involving 2+ agents modifying shared systems. The Lead facilitates, spawning each relevant agent to get their perspective on interfaces, risks, and contracts before work begins.

```
> Team, rebuild the authentication system

📋 Design Review completed — facilitated by Ripley
   Decisions: 3 | Action items: 4
   Agreed on JWT format, session storage strategy, and endpoint contracts
```

### Retrospective (automatic)

**Triggers after** build failures, test failures, or reviewer rejections. The Lead facilitates a focused root-cause analysis.

```
📋 Retrospective completed — facilitated by Ripley
   Decisions: 2 | Action items: 3
   Root cause: missing null check in API response parser
```

### Manual ceremonies

You can trigger any ceremony on demand:

```
> Run a retro
> Run a design meeting before we start
```

You can also create, disable, or skip ceremonies:

```
> Add a ceremony for code reviews
> Disable retros
> Skip the design review for this task
```

Ceremony configuration lives in `.ai-team/ceremonies.md`.

---

## Upgrading

Already have Squad installed? Update to the latest version:

```bash
npx github:bradygaster/squad upgrade
```

This overwrites `squad.agent.md` and `.ai-team-templates/` with the latest versions. It **never touches `.ai-team/`** — your team's knowledge, decisions, casting state, and skills are safe.

Smart upgrade detects your installed version, reports what changed, and runs any needed migrations (e.g., creating `.ai-team/skills/` if it didn't exist). Migrations are additive and idempotent — safe to re-run.

---

## Context Budget

Each agent runs in its own context window. Real numbers:

| What | Tokens | % of 200K window |
|------|--------|-------------------|
| Coordinator (squad.agent.md) | ~13,200 | 6.6% |
| Agent at Week 1 (charter + seed history + decisions) | ~1,250 | 0.6% |
| Agent at Week 4 (+ 15 learnings, 8 decisions) | ~3,300 | 1.7% |
| Agent at Week 12 (+ 50 learnings, 47 decisions) | ~9,000 | 4.5% |
| **Remaining for actual work** | **~187,000** | **93%+** |

The coordinator uses 6.6% of its window. A 12-week veteran agent uses 4.5% — but in **its own window**, not yours. Fan out to 5 agents and you get ~1M tokens of total reasoning capacity across all windows.

---

## Known Limitations

- **Experimental** — file formats and APIs may change between versions.
- **Silent success bug** — approximately 7–10% of background agent spawns complete all their file writes but return no text response. This is a platform-level issue. Squad detects it by checking the filesystem for work product and reports what it finds. Work is not lost.
- **Platform latency** — response times depend on the Copilot platform. Complex multi-agent tasks take 40–60 seconds. Simple questions are answered in 2–3 seconds.
- **Node 20+** — requires a Node.js LTS release (v20.0.0 or later).
- **GitHub Copilot required** — Squad works across Copilot hosts (CLI, VS Code, Visual Studio, Coding Agent).
- **First session is the least capable** — agents improve as they accumulate history. Give it a few sessions before judging.

---

## Adding and Removing Team Members

### Adding

```
> I need a DevOps person
```

Squad allocates a name from the current universe, generates a charter and history seeded with project context, and adds them to the roster. Immediately productive.

### Removing

```
> Remove the designer — we're past that phase
```

Agents are never deleted. Their charter and history move to `.ai-team/agents/_alumni/`. Knowledge is preserved. If you need them back later, they remember everything.

---

## Reviewer Protocol

Agents with review authority (typically Tester and Lead) can **reject** work. On rejection:

1. The original author is **locked out** — they cannot revise their own rejected work.
2. A **different agent** must handle the revision.
3. If the revision is also rejected, the revision author is locked out too, and a third agent must take over.
4. If all eligible agents are locked out, Squad escalates to you.

This prevents the common failure mode where an agent keeps "fixing" its own work in circles.

---

## File Ownership

Squad maintains a clear ownership model:

| What | Owner | Safe to edit? |
|------|-------|--------------|
| `.github/agents/squad.agent.md` | Squad (overwritten on upgrade) | No — your changes will be lost |
| `.ai-team-templates/` | Squad (overwritten on upgrade) | No |
| `.ai-team/` | You and your team | Yes — this is your team's state |
| Everything else | You | Yes |

---

## Quick Reference

| Command | What it does |
|---------|-------------|
| `npx github:bradygaster/squad` | Install Squad in the current repo |
| `npx github:bradygaster/squad upgrade` | Update Squad-owned files to latest |
| `npx github:bradygaster/squad export` | Export team to `squad-export.json` |
| `npx github:bradygaster/squad import <file>` | Import team from export file |
| `npx github:bradygaster/squad import <file> --force` | Import, archiving existing agents |
| `npx github:bradygaster/squad --version` | Show installed version |
| `npx github:bradygaster/squad --help` | Show help |
