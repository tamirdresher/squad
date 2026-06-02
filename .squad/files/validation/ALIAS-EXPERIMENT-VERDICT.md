# Alias Experiment — Manual Proof of MCP Fix Path

**Date:** 2026-06-02T19:39:52.894+03:00
**Author:** Data
**Subject:** Patching `.copilot/mcp-config.json` `squad_state` entry to bypass the npx-pinned launch spec; testing whether MCP tools become callable mid-session.
**Test repo:** `tamir-squad-hq-dup-20260602T183202` (https://github.com/tamirdresher_microsoft/tamir-squad-hq-tarball-test-20260602T183202) — post-upgrade two-layer state, 18 migrated state files on orphan.
**Copilot CLI version:** 1.0.58
**squad-cli (local prefix):** 0.9.6-preview.5
**squad-cli (global, on PATH):** 0.9.6-insider.3
**Purpose:** Validate Data-15's Option A fix empirically before iter-4 commits code.

---

## TL;DR — Outcome that overturns Data-15

The alias swap **does not** make `squad_state_*` tools callable on its own. A deeper layer of breakage was uncovered: **Copilot CLI 1.0.58 does not auto-load the project-level `.copilot/mcp-config.json` at all.** Only the user-level `~/.copilot/mcp-config.json` is loaded. The `squad_state` entry (and every other project-only entry, e.g. `bitwarden-shadow`, `EXAMPLE-trello`) is silently ignored.

Once the project config is supplied via `--additional-mcp-config <json>`, the alias works perfectly: all 7 `squad_state_*` tools register, Scribe persists decisions through `squad_decide`, and the orphan branch grew from 2 commits → 10 commits in a single session.

This re-frames iter-4. Data-15's Option A (ETARGET HEAD-check + dist-tag fallback) would have been correct **if the project config were loaded** — but it isn't. The fix is upstream of the launch spec: squad must either (a) inject the project config into Copilot CLI invocations via `--additional-mcp-config`, or (b) write the `squad_state` entry into the user-level `~/.copilot/mcp-config.json`.

---

## The Patch

### Before (canonical post-`squad upgrade` state)

```json
"squad_state": {
  "command": "npx",
  "args": [
    "-y",
    "@bradygaster/squad-cli@0.9.6-preview.5",
    "state-mcp"
  ]
}
```

(Verbatim diff captured: `validation/01-preimage-mcp-config.json` vs `validation/02-postpatch-mcp-config.json` — exactly one entry swapped, the other 5 user/server entries untouched: `azure-devops`, `bitwarden`, `bitwarden-shadow`, `EXAMPLE-trello`, `chrome-devtools`.)

### After (alias attempts, in order of escalation)

```json
// Attempt A — bare alias (what the prompt described)
"squad_state": { "command": "squad", "args": ["state-mcp"] }

// Attempt B — absolute path to .cmd shim (eliminate PATH/extension ambiguity)
"squad_state": { "command": "C:\\ProgramData\\global-npm\\squad.cmd", "args": ["state-mcp"] }

// Attempt C — add the {type:"local", tools:["*"]} fields that other working entries have
"squad_state": {
  "type": "local",
  "command": "C:\\ProgramData\\global-npm\\squad.cmd",
  "args": ["state-mcp"],
  "tools": ["*"]
}
```

**Sanity check** that `squad state-mcp` itself is healthy when launched directly:

```
> '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | squad state-mcp
{"result":{"tools":[squad_decide, squad_state_read, squad_state_write,
  squad_state_append, squad_state_delete, squad_state_list, squad_state_health]},
 "jsonrpc":"2.0","id":1}
```

7 tools returned, no ETARGET, instant handshake. The launch command is correct.

---

## Test Sessions

### Session 1 — bare alias (Attempt A): `command: "squad"`

Prompt: *"Lead, give me a status report based on the most recent decisions and explicitly tell me which squad_state_* MCP tools are available to you."*

Transcript: `validation/03-postpatch-session-transcript.log`

- Lead (Picard) produced a status report from prior `.squad/decisions.md` (read-only path worked).
- Picard's tool audit: **"zero `squad_state_*` MCP tools are exposed in this session"**, and Coordinator confirmed `"I'm not spawning Scribe to log this session — Scribe's first step (squad_state_health pre-check) would fail"`.
- `git rev-parse squad-state` pre = `eef6e4c…`, post = `eef6e4c…` → **orphan did NOT grow.** Zero commits.

### Session 1b — absolute path (Attempt B): `command: "C:\\ProgramData\\global-npm\\squad.cmd"`

Prompt: forced direct tool-list inspection — *"Call squad_state_health right now. Do NOT generate the list from memory."*

Transcript: `validation/03b-postpatch-session-absolute-path.log`

- Agent self-inspected its tool inventory and reported: `"No tool named squad_state_health exists in my available tools — I cannot invoke it."`
- The MCP servers it *did* see were all loaded from the user-level `~/.copilot/mcp-config.json` (`azure-devops-*`, `bitwarden-*`, `chrome-devtools-*`, `calendar-*`, `mail-*`, `teams-*`, `sharepoint-*`, `nano-banana-*`).

### Session 1c — add `type:local` + `tools:["*"]` (Attempt C)

Transcript: `validation/03c-postpatch-with-type-and-tools.log`

- Same outcome: tools not loaded.

### Session 1d — `--log-level debug` to expose what Copilot CLI actually loads

Transcript: `validation/03d-debug-session.log` + raw Copilot logs in `validation/copilot-logs/`

Smoking gun, grep of `Starting MCP client` in the debug log:

```
Starting MCP client for azure-devops      with command: npx     args: -y @azure-devops/mcp msazure
Starting MCP client for teams             with command: agency  args: mcp teams
Starting MCP client for mail              with command: agency  args: mcp mail
Starting MCP client for calendar          with command: agency  args: mcp calendar
Starting MCP client for sharepoint        with command: agency  args: mcp sharepoint
Starting MCP client for nano-banana       with command: node    args: …/nano-banana-mcp/dist/index.js
Starting MCP client for chrome-devtools   with command: npx     args: -y chrome-devtools-mcp@latest --no-usage-statistics
Starting MCP client for bitwarden         with command: npx     args: -y @bitwarden/mcp-server
```

That is **exactly the 8 entries in `~/.copilot/mcp-config.json` (user-level)**, and *zero* of the 3 project-only entries (`squad_state`, `bitwarden-shadow`, `EXAMPLE-trello`). The `bitwarden` entry that *was* loaded uses the user-config's npm-server arguments, not the project config's local-`node` path — so on name conflicts, user wins and project is dropped entirely.

Also: where I expected a log line like `Loading MCP config from .copilot/mcp-config.json`, the closest is `No MCP config loaded from ODR (ODR unavailable or returned no usable servers)` — the project-file path appears nowhere in the trace.

### Session 1e — pass project config via `--additional-mcp-config <json>` flag

Transcript: `validation/03e-with-additional-mcp-flag.log`

```
copilot --yolo --autopilot --agent squad --additional-mcp-config "<contents of .copilot/mcp-config.json>" \
  -p "Call squad_state_health right now. Report the raw response..."
```

Agent output (verbatim):

```
● squad_state_health (MCP: squad_state)
  └ State backend storage: StateBackendStorageAdapter

Every `squad_state_*` tool visible in my inventory:
  1. squad_state-squad_state_health
  2. squad_state-squad_state_read
  3. squad_state-squad_state_write
  4. squad_state-squad_state_append
  5. squad_state-squad_state_delete
  6. squad_state-squad_state_list
  + squad_state-squad_decide
```

✅ **All 7 tools present and callable.** `squad_state_health` returned a real response.

### Session 2 — cross-verification (Tester proposal + persist via squad_decide)

Same `--additional-mcp-config` flag.

Transcript: `validation/05-session2-tester.log`

Prompt: *"Tester, propose a new validation step for the bundle. Use squad_state tools to persist the decision via squad_decide."*

- Q (Tester) generated a proposal (bundle hermeticity check), called `squad_decide` → decision ID `ebfa5e21-b5c9-473f-8611-c09754032cf8`, dropped to `decisions/inbox/Q-add-bundle-hermeticity-check-fail-publish-if-squad.md`.
- Scribe spawned, merged the inbox entry into `decisions.md`, wrote orchestration-log + session log + cross-agent history updates for Q and Data.
- **Orphan growth:** `git rev-parse squad-state` pre = `eef6e4c…`, post = `60c8dae…`. **8 new commits**:

  ```
  60c8dae Update …/log/2026-06-02T205245-tester-bundle-validation-step.md
  93efe67 Update …/agents/data/history.md
  9bb416c Update …/agents/q/history.md
  3fee482 Update …/log/2026-06-02T205245-tester-bundle-validation-step.md
  3b75a84 Update …/orchestration-log/2026-06-02T205245-q.md
  6f2f2af Delete …/decisions/inbox/Q-add-bundle-hermeticity-check-fail-publish-if-squad.md
  326fa42 Update …/decisions.md
  dea229e Update …/decisions/inbox/Q-add-bundle-hermeticity-check-fail-publish-if-squad.md
  ```

The runtime bridge works end-to-end the moment the project config reaches Copilot CLI.

---

## Verdict

| Claim | Bare alias (Attempts A/B/C) | With `--additional-mcp-config` |
|---|:-:|:-:|
| `squad_state_*` tools callable mid-session | ❌ | ✅ |
| `squad_decide` callable mid-session | ❌ | ✅ |
| Orphan branch grew across the session | ❌ (2→2) | ✅ (2→10, 8 commits) |
| Scribe persisted decisions cleanly | ❌ (didn't spawn) | ✅ |
| Other user-added MCP servers (azure-devops, bitwarden, chrome-devtools, calendar, mail, teams, sharepoint, nano-banana) unaffected | ✅ | ✅ |
| Revert (manual JSON restore — `squad ensure` does not exist as a command) | ✅ (clean diff vs preimage) | n/a |

---

## Implication for iter-4 — **Data-15 Option A is necessary but not sufficient**

The alias experiment did **not** validate Option A as a sufficient fix. Even with the launch command correctly resolvable (whether via `squad`, absolute path, or the original npx-pinned spec assuming the version were published), Copilot CLI 1.0.58 **never reads** the project-level `.copilot/mcp-config.json`. The Gap-2 fix that writes this file is a no-op for the runtime tool surface; it only succeeds as a config artifact intended for a feature that does not exist (or has been changed) in Copilot CLI 1.0.58.

The actual fix path for iter-4 is one of:

1. **A1 — squad wraps copilot invocations (recommended).** Modify `squad` (or the `.copilot/agents/squad.agent.md` invocation conventions) so that whenever a squad-orchestrated copilot session is launched, the project's `.copilot/mcp-config.json` is read and passed via `--additional-mcp-config "<json>"`. Estimated change: ~30 LOC if squad has a "launch session" wrapper; possibly a `squad copilot ...` subcommand that pre-mixes the flag. Combine with Data-15 Option A on the launch-spec content so the spec is also valid for non-tarball users.
2. **A2 — write into user-level `~/.copilot/mcp-config.json` instead of project-level.** Mechanically simplest (one path swap in `ensureSquadStateMcpPinned`), works without any flag plumbing. **Downside:** cross-project pollution — every Copilot CLI session anywhere on the user's machine would try to start `squad state-mcp`, which is wrong for non-squad projects. Also can't be committed/shared with collaborators. **Not recommended** as primary path.
3. **A3 — document manual user-config setup as the supported path.** Worst UX, abdicates the runtime bridge to user action. **Not recommended.**
4. **A4 — file an upstream Copilot CLI issue.** Project-level `.copilot/mcp-config.json` was clearly intended to exist (the path is conventional and matches the `--additional-mcp-config <json>` flag's help text which literally says *"Additional MCP servers configuration as config from ~/.copilot/mcp-config.json"*). Either CLI 1.0.58 dropped auto-loading of project config (regression) or it never had it and the squad codebase assumed it incorrectly. Worth a parallel issue at github/copilot-cli regardless of which short-term workaround squad picks.

### Concrete iter-4 recommendation

- **Primary work item: A1.** Wrapping copilot launches with `--additional-mcp-config` is the right call. Combine with Data-15 Option A on the launch spec for portability (so the spec works regardless of whether the user has a tarball or normal install). Estimate: ~60–90 LOC + tests across `cli-entry.ts` (or the launch helper) + `upgrade.ts:705`.
- **Parallel issue: A4.** Open `bradygaster/squad#<next>` or upstream `github/copilot-cli#<next>` asking for confirmation: should `.copilot/mcp-config.json` auto-load? If yes, this is a CLI regression and squad's wrapper becomes a temporary workaround.
- **Drop Data-15 Option A as a standalone fix.** It would not have moved the needle on the original symptom — the orphan would still not have grown because the entry would still not have been loaded.

### Where Data-15's RCA stands

Data-15 correctly identified that the npx pin would ETARGET if it were ever evaluated by `npx`. That observation is still factually correct — and would still cause failure for normal-install users once the deeper config-loading issue is fixed. So Option A's content is right; the framing ("this is the fix") was wrong because it skipped one layer up.

### Tangential observation worth a follow-up

In Session 2, the state-key paths committed to the orphan branch (e.g. `C:/Users/tamirdresher/tamresearch1/log/...`) are absolute Windows paths rooted at the *canonical* TEAM_ROOT (`~/tamresearch1`), not relative `.squad/` keys. That's likely the `StateBackendStorageAdapter` resolving against the user's home squad rather than the dup's `.squad/`. It worked (commits landed, decisions.md merged), but the keys are not portable. Separate concern, not blocking, worth noting for whoever owns the storage adapter.

---

## Revert

`squad ensure` does **not** exist as a CLI command (verified: `squad ensure` → `✗ Unknown command: ensure`). Revert was done by manual JSON edit restoring the exact `squad_state` entry from `validation/01-preimage-mcp-config.json`. Diff against preimage after revert is empty — the dup is back in canonical post-`squad upgrade` state.

For iter-4: the `squad ensure` command referenced in the prompt either was never shipped or was renamed. The closest existing flow is to re-run `squad upgrade --state-backend two-layer`. If `squad ensure` was supposed to be a config-only re-pin (no migration), it should be added as a new subcommand — useful for exactly this kind of operator scenario.

---

## Artifacts (all under `<dup>/validation/`)

- `01-preimage-mcp-config.json` — canonical post-upgrade config
- `02-postpatch-mcp-config.json` — config after alias swap
- `00-pre-orphan-sha.txt`, `00-pre-orphan-history.txt`
- `03-postpatch-session-transcript.log` — Session 1, bare alias (`command: squad`)
- `03b-postpatch-session-absolute-path.log` — Session 1b, absolute path
- `03c-postpatch-with-type-and-tools.log` — Session 1c, full shape
- `03d-debug-session.log` + `copilot-logs/` — Session 1d, debug logs proving only user-level config loaded
- `03e-with-additional-mcp-flag.log` — Session 1e, `--additional-mcp-config` succeeds, 7 tools registered
- `04-pre-session2-orphan.txt` — orphan SHA before session 2
- `05-session2-tester.log` — Session 2 transcript; orphan grew 2 → 10 commits

