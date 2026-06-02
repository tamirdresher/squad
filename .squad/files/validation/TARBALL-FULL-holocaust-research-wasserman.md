# Fresh-Path Tarball Validation — holocaust-research-wasserman

**Date:** 2026-06-02T17:30:00+03:00
**Agent:** Data
**Branch under test:** `squad/state-backend-upgrade-fixes` @ tarballs `0.9.6-preview.5` (combined-fixes twin)
**Source repo (personal, read-only):** `tamirdresher/holocaust-research-wasserman` (private)
**Fresh-init duplicate:** `tamirdresher_microsoft/holocaust-research-wasserman-tarball-test-20260602T1832`
**Upgrade-path duplicate:** `tamirdresher_microsoft/holocaust-research-wasserman-upgrade-test-20260602T1832`

---

## Headline verdict

🟡 **Mixed PASS** — fresh-init two-layer end-to-end mostly works (the iteration-3 fixes for WI-1, GAP-1, GAP-2-config, MCP-pinning, INSIDER3-INIT-LEAK, UPGRADE-EPERM-FALSE-SUCCESS, sdk-semver-workspace, toRelative-Windows are all observable in this repo). One genuinely new finding worth blocking on: **the MCP retrofit pins a version that is not on the npm registry**, so the bridge cannot actually start at runtime — agents see `squad_state runtime bridge isn't available` and fall back to direct git plumbing or refuse-to-persist.

Bug counts: **8 ✅ / 4 ❌** (detail in §4 matrix).

---

## 1. Install path — local prefix (race avoidance)

Global `npm install -g <twin>` hit `EPERM unlink C:\ProgramData\global-npm\squad` immediately (3 parallel agents fighting for the same global slot). Fall-back used:

```powershell
$prefix = "C:\Users\tamirdresher\squad-validation\.npm-prefix-wasserman"
npm install --prefix $prefix `
  C:\Users\tamirdresher\squad-validation\bradygaster-squad-sdk-combined-fixes.tgz `
  C:\Users\tamirdresher\squad-validation\bradygaster-squad-cli-combined-fixes.tgz
$env:PATH = "$prefix\node_modules\.bin;$env:PATH"
squad --version   # 0.9.6-preview.5 ✅
```

Local-prefix install completes in 32 s, no race. `squad.cmd` lands in `node_modules\.bin` and is fully usable for both `squad ...` and as the dependency carrier for `copilot --agent squad`.

---

## 2. Fresh-init two-layer — what happened

The source repo was **already squad-initialised** (it's a research project built from the squad template). Re-running `squad init --state-backend two-layer` is therefore a great "config-mutation only" test: the static files all said `already exists — skipping`, so the only mutations that fire are the two-layer-specific ones.

### Post-init state — captured

| Surface | Value | Verdict |
|---|---|---|
| `.squad/config.json` `stateBackend` | `"two-layer"` (no duplicate key, single entry) | ✅ Bug E not re-introduced |
| `.squad/config.json` `teamRoot` | inherited `"C:\\temp\\holocaust-research-squad"` from source (absolute Windows path) | ⚠️ teamRoot-not-portable (Bug from #1190, not in this fix bundle) |
| `.git/hooks/` (non-`.sample`) | post-checkout, post-commit, post-merge, post-rewrite, **pre-commit**, **pre-push** | ✅ WI-1 fix — all 6 hooks present |
| `git branch -a` | `* main / squad-state / remotes/origin/main` | ✅ orphan branch created |
| `squad-state` HEAD on init | `926948e migrate: import working-tree state on backend upgrade (12 file(s))` on top of `fa7c781 init: squad-state orphan branch` | ✅ INSIDER3-INIT-LEAK fix — mutable state was lifted off the working tree onto the orphan branch at init time |
| `.copilot/mcp-config.json` | `squad_state` entry **inserted** alongside pre-existing `playwright` server, pinned to `@bradygaster/squad-cli@0.9.6-preview.5` | ✅ GAP-2 insert-path verified; other servers preserved |
| `git status` after init | only `.copilot/mcp-config.json`, `.gitattributes`, `.gitignore`, `.squad/config.json`, plus new `.copilot/skills/*`, `.squad/memory/*`, `.squad/rai/*` files (all static) modified | ✅ no `decisions.md` / agent history leak |

### Pre-commit hook (WI-1) is doing its job

When trying to commit the init mutations with `.squad/decisions.md` + `agents/*/history.md` accidentally staged (they were tracked in the source repo as static seed content), the pre-commit hook fired and refused:

```
.squad/agents/seven/history.md
.squad/agents/sofer/history.md
.squad/agents/wiesenthal/history.md
.squad/decisions.md
Use 'git restore --staged <path>' to unstage, or set SQUAD_SYNC_ACTIVE=1 to bypass.
```

After unstaging the mutable paths, commit succeeded; the post-commit hook then ran `squad sync --quiet` (GAP-1 fix) without error. Without GAP-1's fix this would have silently emitted `Unknown command 'sync'`.

---

## 3. Three sessions on the fresh-init duplicate

All invoked verbatim as `copilot --yolo --autopilot --agent squad -p "..."`.

| # | Prompt | Wall time | Exit | squad-state grew? | Worktree commits | Notable |
|---|---|---|---|---|---|---|
| 1 | "build me a team from the Simpsons universe for a historical-document research and citation tool" | 12m 06s | 0 | ✅ **yes** — `926948e → 9276687` (`recast: Simpsons universe team …`) | 1 commit on `main` (`92775f9`) | Lead used **direct shell git plumbing** (`GIT_INDEX_FILE=$tmpIdx …`) to write the orphan branch, then `squad sync --push` succeeded. Hook (GAP-1) reachable, command resolves. |
| 2 | "Lead, propose a citation-tracking architecture" | 9m 18s | 0 | ❌ no | 0 commits | Wrote `decisions/inbox/lisa-citation-architecture-proposal.md` + Scribe's noted-file **to the working tree, not via MCP**. Post-commit hook never fired (no commit). Same agent-behaviour pattern seen in other validations. |
| 3 | "Tester, list edge cases for citation deduplication" | 5m 31s | 0 | ❌ no | 0 commits | **Flanders explicitly reported:** `"⚠️ STATE_BACKEND is two-layer but the squad_state runtime bridge isn't available in this CLI session, so I can't persist Flanders' decision to the inbox … I'm also skipping the Scribe spawn this turn for the same reason — it would self-abort on the health pre-check."` |

### Why S3 said "bridge unavailable" — root cause probe

Direct probe of the pinned MCP server:

```powershell
npx -y @bradygaster/squad-cli@0.9.6-preview.5 state-mcp
```

→ `npm error code ETARGET / No matching version found for @bradygaster/squad-cli@0.9.6-preview.5`.

**That version exists only inside the local tarball; it has never been published to the npm registry.** The MCP-config retrofit (GAP-2) correctly writes the pinned spec, but the spec is unreachable at runtime because the registry has no such version. Net effect: agents that try to use the bridge see "tools unavailable" and either (a) fall back to direct shell git plumbing (S1's Lead) or (b) refuse to persist with a clean warning (S3's Flanders).

This is essentially **GAP-3 (#1203) striking at runtime**, not just at standalone-CLI install time. The config-level half of GAP-2 is fixed; the runtime-reachability half is not.

---

## 4. Bug-verdict matrix

Same columns as data-8 / data-9 reports.

| Bug | Severity | Fix commit | Fresh-init verdict | Upgrade-path verdict | Notes |
|---|---|---|---|---|---|
| toRelative Windows path | P1 | `fc406355` | ✅ no relative-path crashes anywhere in the 3 sessions | ✅ same in upgrade-test | repo has Windows-only absolute paths; squad ran clean |
| git-notes silent migration warn | P1 | `dc2b3f50` | n/a — config already `two-layer`, no migration path triggered | n/a | not exercised |
| sdk semver workspace | P1 | `7a6b013f` | ✅ twin install succeeded with `^0.9.6-preview` resolved against local SDK tarball | ✅ | implicitly required for local-prefix install |
| #1192 approve-once permission contract | P0 | `70a37812` | ✅ all 3 sessions ran with `--yolo --autopilot`, no surprise re-prompts | ✅ | |
| #1192 regression test | P0 | `e0291f3f` | n/a (test artifact, not behaviour) | n/a | already on branch |
| UPGRADE-EPERM-FALSE-SUCCESS | P0 | `cf99139e` | n/a — fresh init, no upgrade | ✅ **upgrade reported `❌ Self-upgrade failed`, non-zero exit** (no fake ✅ after ⚠️ as on insider.3) | EPERM was real — global slot raced with the 3 parallel agents |
| WI-1 commit hooks (pre-commit, post-commit) | P0 | `e2ff8277` | ✅ both installed; pre-commit blocked mutable state; post-commit ran `squad sync --quiet` cleanly | ❌ **not installed** in upgrade-test (upgrade aborted on EPERM before backend migration ran) | |
| UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION | P0 | `e010b161` | n/a | ❌ **flag silently ignored**: `.squad/config.json` has no `stateBackend` after upgrade, no `squad-state` branch, no orphan-branch state migration. Self-upgrade EPERM short-circuited the whole upgrade flow — there is no fallback path to "still try the backend migration even if self-upgrade fails." | this is the bug a downstream user hits: race-loses on EPERM ⇒ loses ALL of the backend migration too |
| MCP-BRIDGE-BROKEN (config-level pin) | P0 | `b987fe67` | ✅ config has `@bradygaster/squad-cli@0.9.6-preview.5` pinned in `squad_state` entry | ❌ (upgrade never reached this step) | |
| MCP-BRIDGE-BROKEN (runtime reachability) | P0 | n/a — config-fix only | ❌ **pinned version doesn't exist on npm registry**: `npx -y @bradygaster/squad-cli@0.9.6-preview.5 state-mcp` → ETARGET. Agents report `squad_state runtime bridge isn't available`. This is GAP-3 (#1203) striking at runtime, not just at standalone-CLI install. | n/a | **new finding from this run.** Either (a) publish the version to the registry before tagging the fix bundle, or (b) re-think the pin strategy — pin a `dist-tag` (e.g. `@insider`) rather than a specific preview, and have the user opt-in via the same insider channel. |
| INSIDER3-INIT-LEAK | P0 | `e291b962` | ✅ `decisions.md` + `agents/*/history.md` lifted onto orphan branch at init time (squad-state went `fa7c781 → 926948e` with 12 files) | n/a (upgrade aborted) | |
| GAP-1 `squad sync` command missing | P0 | `3b44f45e` | ✅ `squad --help` lists `sync`; post-commit hook invoking `squad sync --quiet` returns exit 0 instead of `Unknown command` | ✅ same | the iter-3 fix is observably wired |

### Aggregate

- ✅ **8** bugs verified fixed (where applicable in this run)
- ❌ **4** bugs still actionable: (1) MCP runtime reachability (pinned version not published), (2) WI-1 hooks not installed if self-upgrade EPERMs, (3) UPGRADE-FLAG-IGNORED + UPGRADE-NO-MIGRATION when self-upgrade EPERMs, (4) agent-side worktree write of inbox files in S2 (Lead/Scribe path) not routed through MCP — but this is partially explained by ❌#1 (MCP unreachable forces the fall-back)
- ➖ tear-off: teamRoot inherited as absolute Windows path from source repo (`C:\\temp\\holocaust-research-squad`) — known and tracked in #1190; not in scope for this fix bundle.

---

## 5. Upgrade-path verdict (second duplicate)

Sequence: fresh-init worktree → 2 sessions on worktree → `squad upgrade --self --insider --state-backend two-layer` → 2 continuity sessions.

| Step | Result |
|---|---|
| Init `--state-backend worktree` | ✅ clean, no hooks, no orphan, default backend |
| Pre-upgrade session 1 (rubric sketch) | ✅ 17 min, 3 commits, scribe wrote inbox notes, no errors |
| Pre-upgrade session 2 (follow-up tasks) | ✅ 8 min, 1 commit |
| `squad upgrade --self --insider --state-backend two-layer` | ⚠️ self-upgrade EPERM (global slot raced); CLI printed `❌ Self-upgrade failed` with non-zero exit — the iter-1 fix correctly refuses to falsely succeed. **But** the `--state-backend two-layer` portion silently never ran: post-upgrade config still has no `stateBackend` key, no `squad-state` branch, no hooks, no `squad_state` MCP entry. |
| Post-upgrade session 1 | ✅ 40 s, no crash, but operating against UN-migrated worktree backend |
| Post-upgrade session 2 | ✅ 3 m, same |

**Key finding:** the upgrade pipeline still aborts the entire flow when the npm self-upgrade fails. Tests pass for *what was promised* (no false ✅), but a downstream user who races on EPERM loses both the binary upgrade AND the backend migration. Recommend a follow-up that decouples the two: try `--self`, log any failure, but always proceed to the backend-migration phase against the currently-installed CLI (which already supports `two-layer`).

---

## 6. Operating-rule notes

- Active `gh auth` for `tamirdresher_microsoft` for all GH-side operations; the personal-account source clone was done via `gh repo clone tamirdresher/...` after a temporary `gh auth switch --user tamirdresher`, then immediately switched back. Final state: `tamirdresher_microsoft` active.
- 3 parallel agents were running against `gh-ai-adoption2026`, `squad-ai-vulns`, `tamir-squad-hq`. Local-prefix install + duplicated naming (`holocaust-research-wasserman-tarball-test-$ts` / `…-upgrade-test-$ts`) avoided all collisions.
- Tarballs at `0.9.6-preview.5` — both required for install (twin pattern documented in iter-3 verdict).

---

## 7. Recommendations / follow-ups for the fix bundle

1. **Block on:** publish `@bradygaster/squad-cli@0.9.6-preview.5` to the npm registry before merging #1200 — otherwise the GAP-2 retrofit writes a config that cannot actually start the MCP server, and agents will continue to report "runtime bridge unavailable". OR rework the pin to use a dist-tag (`@insider`) that's always resolvable.
2. **Block on (smaller):** in `selfUpgradeCli`, on EPERM/install failure, **still call the backend-migration code path** — currently the failure short-circuits the whole upgrade. The migration code is local and doesn't need the new binary.
3. **Follow-up (out of fix-bundle scope):** the S2/S3 agent path that writes inbox files directly to the working tree (bypassing MCP) is partially a consequence of #1 above — when MCP is reachable, those writes should funnel through `squad_state_*`. Re-test once #1 is fixed.

---

## 8. Artifacts

In the fresh-init duplicate (`tamirdresher_microsoft/holocaust-research-wasserman-tarball-test-20260602T1832`):

- `validation/01-init.log` — `squad init --state-backend two-layer` output
- `validation/02-session1.log`, `03-session2.log`, `04-session3.log` — three Copilot sessions
- `validation/mcp-probe.js` — direct MCP-server reachability probe that reproduced the ETARGET finding

In the upgrade-path duplicate (`tamirdresher_microsoft/holocaust-research-wasserman-upgrade-test-20260602T1832`):

- `validation/01-init-worktree.log`
- `validation/02-upgsess1.log`, `03-upgsess2.log` — pre-upgrade sessions
- `validation/04-upgrade.log` — the upgrade attempt that EPERM'd cleanly
- `validation/05-postupg-sess1.log`, `06-postupg-sess2.log` — continuity sessions

Mirror of this report committed to `squad-squad` at `.squad/files/validation/TARBALL-FULL-holocaust-research-wasserman.md`.
