# Skill: Drive Squad Sessions via `copilot --yolo --agent squad`

**Owner:** Data
**Created:** 2026-06-02T11:45:58.201+03:00
**Applies to:** Validation runs, baseline measurements, regression tests where Squad sessions must be invoked non-interactively from a script or test driver.

---

## When to use this skill

Use whenever you need to drive a Squad session from a script (validation harness, CI smoke test, multi-session reproduction) and cannot rely on a human at the keyboard. Verified against `@bradygaster/squad-cli@0.9.6-insider.3` + `copilot CLI 1.0.57`.

---

## The invocation

```powershell
copilot --yolo --agent squad -p "<initial prompt as a single string>"
```

| Flag | What it does | Why we need it |
|---|---|---|
| `--yolo` | Equivalent to `--allow-all-tools --allow-all-paths --allow-all-urls`. Auto-approves all permission prompts. | Squad agents spawn shells, edit files, hit URLs. Without yolo, the session blocks on the first permission prompt. |
| `--agent squad` | Loads the Squad coordinator prompt from `.github/agents/squad.agent.md` (or local override) as the system prompt. | Without this, you get the default Copilot agent, not the Squad coordinator. |
| `-p "<text>"` | Non-interactive mode: execute prompt, exit. | Default is interactive REPL — would block waiting for stdin. |

## What `--yolo` does NOT do

- **Does NOT auto-respond to `ask_user`.** If the coordinator (or any spawned agent) calls the `ask_user` tool, the session BLOCKS waiting for stdin and will hang until your timeout fires. As of insider.3 the Squad coordinator does not call `ask_user` during Init Mode Phase 1 — it just acts. But this could regress; if your validation hangs, check the transcript for `ask_user` calls.
- **Does NOT bypass agent governance.** Agents that check `squad_state_health` and refuse to hand-write state when the bridge is missing will still refuse. That's the correct contract — don't try to "fix" it by patching agent prompts.

## Workarounds if the agent does invoke `ask_user`

In order of preference:

1. `--no-ask-user` flag — disables the `ask_user` tool entirely; agent works autonomously. Behaviour-changing: agent may pick defaults you wouldn't choose. Document this.
2. Pipe an answer via stdin: `"prompt" | copilot --yolo --agent squad`. Fragile if the agent asks more than one question.
3. Pre-script the answer into a follow-up `copilot --resume=<id> -p "<answer>"`. Requires capturing the session id.

If none work and the session genuinely needs interactive confirmation, the validation cannot be fully automated — write a blocker report.

---

## Step-by-step procedure

### 1. Pre-flight

```powershell
squad --version    # confirm under-test version
copilot --version  # confirm Copilot CLI version; >= 1.0.54 triggers Bug A territory
gh auth status     # confirm the right GitHub identity is active
```

If switching between squad-cli versions: `npm install -g @bradygaster/squad-cli@<version>`. Note the global install location may be locked by other npm processes — close any other shells running squad first.

### 2. Provision a scratch repo (NEVER pollute the working repo)

```powershell
$ts = '<your timestamp>'
gh repo create "tamirdresher_microsoft/<prefix>-$ts" --private --description "..." --add-readme
git clone https://github.com/tamirdresher_microsoft/<prefix>-$ts.git "C:\Users\tamirdresher\squad-validation\<prefix>-$ts"
cd "C:\Users\tamirdresher\squad-validation\<prefix>-$ts"
npm init -y; git add -A; git commit -m "init"; git push
```

⚠️ **DO NOT** run `squad init --help` or `squad <subcommand> --help` in your CWD without first verifying the help flag works for that subcommand on the version under test. As of insider.3, `--help` on subcommands EXECUTES the subcommand instead of printing help. The accidental side-effect on a populated `.squad/` repo is hard to clean up.

### 3. Run the session

```powershell
$start = Get-Date
copilot --yolo --agent squad -p "<prompt>" 2>&1 | Tee-Object -FilePath validation/session-N-transcript.log
"=== elapsed: $(((Get-Date)-$start).TotalSeconds)s ==="
```

Timeout heuristics (verified in this run):
- Single-agent prompt with simple task: 2–4 minutes
- Multi-agent prompt (coordinator + 2 spawns + scribe): 5–8 minutes
- Init Mode (team-cast from scratch): 4 minutes
- Set `initial_wait` in `powershell` tool to **300–420 seconds** for typical sessions, **600+** for multi-spawn.

### 4. Post-session capture (always do all of these)

```powershell
git status --porcelain                                # working tree should be CLEAN; any .squad/* shown = state leak
git log --all --oneline -20                           # commits across all branches
git branch -a                                         # is squad-state present locally? on remote?
git for-each-ref refs/notes/                          # are any squad notes refs created?
git ls-tree -r squad-state --name-only                # what's in the orphan branch?
git show squad-state:.squad/team.md                   # if orphan branch is populated, this should succeed
gh api /repos/<owner>/<repo>/branches --jq '.[].name' # what's on the REMOTE
gh api /repos/<owner>/<repo>/git/refs/notes/squad     # are notes refs pushed?
Get-ChildItem .git/hooks | Where-Object Name -notlike '*.sample'  # hooks installed?
```

Save all of these to a per-session `validation/session-N-post-state.md`. Evidence first.

---

## Gotchas (verified the hard way)

- **`squad <cmd> --help` runs the command.** Probe new flags in a throwaway scratch dir.
- **Subsequent sessions don't always re-trigger Init Mode.** Once `.squad/team.md` exists, the coordinator skips Phase 1 and goes straight to work. This is correct behaviour but worth knowing if you're trying to test Init Mode specifically.
- **Coordinator may pre-emptively short-circuit work** if it detects state bridge problems. In session 5 of the insider.3 baseline, Spock refused to even write an inbox file because `squad_state_*` MCP was missing. Earlier sessions wrote inbox files via direct shell. This is governance kicking in — don't fight it.
- **Working-tree side effects** from one session ARE visible to the next session (because Squad reads `.squad/` files from disk). This can mask state-backend bugs: you may think two-layer "works" because team.md is there, when actually it's just the dirty working tree carrying state from session to session.
- **Branch-switch test (vs Bug #643)** can pass for the wrong reason. State carried via dirty working tree survives `git checkout` — but vanishes on `git stash` or `git clean -fdx`. Always check that the orphan branch actually holds state, not just that `.squad/team.md` is readable.

---

## Output template for validation runs

For each session, produce two files:
1. `validation/session-N-transcript.log` — full stdout/stderr capture
2. `validation/session-N-post-state.md` — git/branch/notes/hooks snapshot

Then a single rollup:
- `validation/<NAME>-REPORT.md` with: setup, per-session table (prompt + outcome + elapsed), post-state evolution table (session → dirty files / inbox count / orphan entries / notes refs), bug observation matrix, verdict (✅/❌), what the next version must fix.

---

## Artifacts from first use

- Validation session: 2026-06-02, twolayer-fresh-test-20260602T1146 repo, insider.3 baseline
- Inbox doc: `.squad/decisions/inbox/data-twolayer-fresh-baseline.md`
- Full report: `validation/FRESH-PATH-BASELINE-INSIDER3-REPORT.md` in test repo
- 6 sessions completed cleanly; WI-1 confirmed; INSIDER3-INIT-LEAK + INSIDER3-HELP-MISSING newly catalogued

## Addendum (2026-06-02) — Upgrade-path runs

For upgrade-path tests, add `--autopilot` to the invocation as belt-and-suspenders:

```powershell
copilot --yolo --autopilot --agent squad -p "<prompt>"
```

`--autopilot` is a real Copilot CLI flag (verified in `copilot --help` on 1.0.57). It auto-continues up to 5 messages by default (configurable via `--max-autopilot-continues`). On insider.3 it behaved identically to `--yolo` alone — no `ask_user` blocks observed — but Init Mode may differ mid-upgrade, so include it.

### Post-upgrade observability template (REQUIRED — do not skip)

After running `squad upgrade --state-backend <value>`, capture ALL of the following BEFORE running any post-upgrade session:

```powershell
# 1. config diff
git diff <pre-upgrade-commit> -- .squad/config.json
# 2. hooks
Get-ChildItem .git/hooks | Where-Object Name -notlike '*.sample' | Select-Object Name
Test-Path .git/hooks/pre-commit; Test-Path .git/hooks/post-commit
# 3. MCP registration
Select-String -Path .copilot/mcp-config.json -Pattern 'squad_state'
# 4. orphan branch
git branch -a | Select-String 'squad-state'
git show squad-state:.squad/decisions.md 2>&1   # did pre-upgrade decisions migrate?
git show squad-state:.squad/agents/<agent>/history.md 2>&1
# 5. notes refs
git for-each-ref refs/notes/
git ls-remote origin 'refs/notes/squad/*'
# 6. working tree
git status --porcelain
```

Save to `validation/post-upgrade-state.md` immediately — the upgrade's own stdout WILL LIE (insider.3 baseline observation: `⚠️ Upgrade failed` followed by `✅ Upgraded` in the same run, exit code 0, `squad --version` unchanged, config.json unchanged).

### Immutable pre-upgrade snapshot

ALWAYS copy `.squad/` to `validation/pre-upgrade-snapshot/` before running upgrade. Without it you cannot prove what was lost / what failed to migrate.

```powershell
Copy-Item -Path .squad -Destination validation/pre-upgrade-snapshot -Recurse -Force
Copy-Item -Path .squad/config.json -Destination validation/pre-upgrade-config.json -Force
```

### Failure-mode handling: `--state-backend` silently ignored

If the upgrade did not write `stateBackend` to config (confirmed on insider.3 by config diff being empty), per failure-mode guidance manually edit `.squad/config.json` to set the desired backend, commit, and proceed. Continue running post-upgrade sessions and document what works vs what doesn't on the degraded path. Do NOT abort — the degraded path is exactly what we need to characterize for fix prioritization.

### Artifacts from upgrade-path use

- Validation session: 2026-06-02, twolayer-upgrade-test-20260602T1308 repo, insider.3 baseline
- Inbox doc: `.squad/decisions/inbox/data-twolayer-upgrade-baseline.md`
- Full report: `validation/UPGRADE-PATH-BASELINE-INSIDER3-REPORT.md` in test repo
- 6 sessions; upgrade silently ignored `--state-backend`; manual config workaround required; mid-session SDK fallback observed (session 6) but MCP bridge broken throughout
