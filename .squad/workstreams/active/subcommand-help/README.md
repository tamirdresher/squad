---
id: subcommand-help
name: "Subcommand --help / -h Interception"
status: active
created: 2026-06-03
owner: "Tamir Dresher"
agents: [data, worf]
reviewers: [worf]
scope: "Fix CLI routing bug where `squad <subcommand> --help` silently runs the subcommand instead of printing help. Continue PR #1202 on bradygaster/squad."
related: ["bradygaster/squad#1201", "bradygaster/squad#1202"]
public_surface: "bradygaster/squad (PR #1202)"
---

# Subcommand --help / -h Interception

Squad CLI silently dropped `--help`/`-h` on most subcommands and ran the command for real — with destructive side effects on `init` (writes files), `triage`/`watch` (starts long-running loops), etc. Top-level `squad --help` worked fine; per-subcommand help was broken across the entire CLI surface (~30+ commands).

PR [#1202](https://github.com/bradygaster/squad/pull/1202) (branch `tamirdresher/1201-subcommand-help`, head `6760b6e3`) is OPEN on `bradygaster/squad:dev` and addresses [#1201](https://github.com/bradygaster/squad/issues/1201). It centralizes per-command help text in a registry (`packages/squad-cli/src/cli/core/command-help.ts`), adds an early router intercept in `cli-entry.ts`, and ships unit + acceptance test coverage.

**Current state:** PR #1202 open. Copilot-pull-request-reviewer[bot] (review #4409659605) flagged 3 valid non-blocking comments to address before merge:

1. **`command-help.ts:398`** — `streams`/`workstreams` aliases of `subsquads` always fall back to generic help because the registry lookup uses the raw cmd string. Normalize aliases before lookup.
2. **`command-help.test.ts:233`** — Test case titled "generic fallback for unknown commands" actually runs `discover --help` (a known command). Test name misleading; generic-fallback CLI path remains untested.
3. **`subcommand-help.feature:8`** — Acceptance scenario claims `init --help` doesn't scaffold files but only asserts stdout/exit code. A regression could still write `.squad/`/`.github/`/`.gitignore` silently. Add filesystem assertion.

**Worktree:** `C:\Users\tamirdresher\source\repos\squad-1201` (matches `squad-1191`, `squad-1068-*` naming convention).

**Source:** [GitHub issue bradygaster/squad#1201](https://github.com/bradygaster/squad/issues/1201)
