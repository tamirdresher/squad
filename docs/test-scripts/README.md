# Manual Test Scripts

> **⚠️ INTERNAL ONLY — DO NOT PUBLISH**

These are manual validation scripts for Brady to run against the Squad SDK before release gates. Each script is a self-contained walkthrough with copy-pasteable commands and expected outputs.

## Prerequisites

- **Node.js 20+** — `node --version` should report v20.x or later
- **git** — any recent version
- **GitHub CLI (gh)** — authenticated, `gh auth status` should show logged in
- **Copilot CLI access** — `gh copilot` available and functional
- **Squad SDK** — built locally (`npm run build` in the squad-sdk repo)

## Scripts

| # | Script | Validates |
|---|--------|-----------|
| 01 | [Local Git Workflow](01-local-git-workflow.md) | Init, config generation, git operations, state persistence |
| 02 | [GitHub Issues](02-github-issues.md) | Issue creation, label routing, lifecycle, agent comments |
| 03 | [Pull Requests](03-pull-requests.md) | Branch workflow, PR description, review, merge, issue closure |
| 04 | [Squad E2E](04-squad-e2e.md) | Full pipeline: cast → route → execute → stream → cost |
| 05 | [Beta Parity](05-beta-parity.md) | Side-by-side comparison with beta Squad behavior |

## Legend

Each script marks steps as:

- **`[AUTO]`** — Deterministic check; can be verified by inspecting command output
- **`[HUMAN]`** — Requires human judgment (e.g., "does the response make sense?")

If a step fails, note the script number, step number, actual output, and expected output.
