# Installation

> ⚠️ **Experimental** — Squad is alpha software. APIs, commands, and behavior may change between releases.


Three ways to get Squad running. Pick the one that fits.

---

## Try this:

```bash
npm install -g @bradygaster/squad-cli
squad
```

That's it. You're in.

---

## 1. CLI (Recommended)

The CLI is the fastest way to use Squad from any terminal.

### Global install

```bash
npm install -g @bradygaster/squad-cli
```

Now use it anywhere:

```bash
squad init
squad status
squad watch
```

### One-off with npx

No install needed — run the latest version directly:

```bash
npx @bradygaster/squad-cli init
npx @bradygaster/squad-cli status
```

### Verify

```bash
squad --version
```

### Update

```bash
npm install -g @bradygaster/squad-cli@latest
```

---

## Which method should I use?

Pick based on what you're doing:

| **You want to...** | **Use** | **Why** |
|--------------------|---------|---------|
| Try Squad quickly | **CLI** with `npx` | No install needed. Run `npx @bradygaster/squad-cli init` and you're testing it. |
| Use Squad across all projects | **CLI** with `--global` | One install. Works everywhere. Run `squad` from any terminal. |
| Work inside VS Code | **VS Code** (just open your project) | Already using Copilot? Squad just works. Same `.squad/` directory as CLI. |
| Build tools on top of Squad | **SDK** | Typed APIs, routing config, agent lifecycle hooks. Programmatic access to everything. |

Can't decide? → Start with **CLI**. You can always add VS Code or the SDK later. Your `.squad/` directory works identically everywhere.

---

## 2. VS Code

Squad works in VS Code through GitHub Copilot. Your `.squad/` directory works identically in both CLI and VS Code — same agents, same decisions, same memory.

> **Tip:** Initialize your team with the CLI (`squad`), then open the project in VS Code to keep working with the same squad.

---

## 3. SDK

Building your own tooling on top of Squad? Install the SDK as a project dependency:

```bash
npm install @bradygaster/squad-sdk
```

Then import what you need:

```typescript
import { defineConfig, loadConfig, resolveSquad } from '@bradygaster/squad-sdk';
```

The SDK gives you typed configuration, routing, model selection, and the full agent lifecycle API. See the [SDK Reference](../reference/sdk.md) for details.

---

## Not sure which interface to use?

See [Choose your interface](choose-your-interface.md) for a complete breakdown of GitHub Copilot CLI, VS Code, Squad CLI, SDK, and the Copilot Coding Agent.

---

### Personal squad (cross-project)

Want the same agents across all your projects?

```bash
squad init --global
```

This creates your personal squad directory — a personal team root that any project can inherit from. See [Upstream Inheritance](../features/upstream-inheritance.md) for details.

**Personal squad location by platform:**

| Platform | Path |
|----------|------|
| Linux | `~/.config/squad/` |
| macOS | `~/Library/Application Support/squad/` |
| Windows | `%APPDATA%\squad\` |

### SDK mode

Generate a typed `squad.config.ts` with `useRole()` calls instead of markdown-only setup:

```bash
squad init --sdk
```

Combine with `--roles` to include the base role catalog (Lead, Backend, Frontend, Tester, etc.) in the generated config. Without `--roles`, init uses fictional universe casting by default.

```bash
squad init --sdk --roles
```

---

## First-Time Setup

After installing, initialize Squad in your project:

```bash
cd your-project
squad init
```

This creates:

```
.github/agents/squad.agent.md  — coordinator agent
.github/workflows/             — GitHub workflows (see below)
.squad/                        — team state directory
.squad/templates/              — template files for casting, routing, ceremonies
```

### What `squad init` installs

Beyond the coordinator agent and team state, `squad init` creates GitHub workflows in `.github/workflows/`:

| Workflow | Purpose |
|----------|---------|
| `squad-heartbeat.yml` | Ralph's triage loop — auto-assigns issues to squad members based on routing rules |
| `squad-triage.yml` | Issue triage automation |
| `squad-issue-assign.yml` | Auto-assign issues to squad members |
| `squad-label-enforce.yml` | Label state machine enforcement |
| `squad-ci.yml` | Build & test integration |

> **Important:** These workflows are created but may need a separate commit. If `squad init` is run inside a Copilot session, the generated workflow files are staged but not committed. Commit them explicitly:
>
> ```bash
> git add .github/workflows/ .github/agents/ .squad/
> git commit -m "chore: initialize squad team"
> ```

### Enabling the heartbeat schedule

The heartbeat workflow runs Ralph's triage automatically. By default, the cron schedule is **disabled** — it only triggers on issue/PR events and manual dispatch. To enable periodic triage:

1. Open `.github/workflows/squad-heartbeat.yml`
2. Uncomment the `schedule` block:

```yaml
on:
  schedule:
    # Every 30 minutes — adjust to your team's pace
    - cron: '*/30 * * * *'
```

**Common schedule examples:**

| Schedule | Cron Expression |
|----------|----------------|
| Every 30 minutes | `*/30 * * * *` |
| Every hour | `0 * * * *` |
| Every 4 hours during business hours | `0 9-17/4 * * 1-5` |
| Once daily at 9 AM UTC | `0 9 * * *` |

### Adding Squad to an existing project

Already have a running project? `squad init` works the same way — it won't overwrite your existing files:

```bash
cd my-existing-project
squad init
```

**Tip:** After initializing, give Squad context about your project in your first session:

```
> This is a React + Node.js task management app. We use PostgreSQL,
> deploy to AWS, and follow trunk-based development. The main entry
> points are src/server/index.ts and src/client/App.tsx.
```

Squad uses this to form a team matched to your stack and write accurate routing rules. See [Adding Squad to an Existing Repo](../scenarios/existing-repo.md) for a detailed walkthrough.

### Configuration (optional)

For typed configuration, create a `squad.config.ts` at your project root:

```typescript
import { defineConfig } from '@bradygaster/squad-sdk';

export default defineConfig({
  team: {
    name: 'my-squad',
    root: '.squad',
    description: 'My project team',
  },
});
```

`defineConfig()` gives you full autocomplete and validation. But you don't need it to get started — Squad works out of the box with sensible defaults.

---

## Troubleshooting

### `squad: command not found`

Your npm global bin isn't in your PATH. Fix:

```bash
# Check if installed
npm list -g @bradygaster/squad-cli

# If installed but not found, check PATH:
echo $PATH | grep npm          # macOS/Linux
echo %PATH% | findstr npm      # Windows
```

### `Cannot find .squad/ directory`

Run `squad init` in your project root, or `squad init --global` for a personal squad.

### Version mismatch between CLI and SDK

Update both:

```bash
npm install -g @bradygaster/squad-cli@latest
npm install @bradygaster/squad-sdk@latest
```

---

## Ready? → [Your First Session](first-session.md)
