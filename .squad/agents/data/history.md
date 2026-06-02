# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## Current Status (2026-06-02T19:39:52Z)


- `.github/agents/squad.agent.md` — 3 sites: routing section (5-path + dedup + personal exclusion + HTML sync comment), State Protocol skills note (parenthetical added), spawn template skill-check (single line naming all 5 paths)
- `.squad/templates/squad.agent.md.template` — same 3 sites mirrored exactly
- `.squad/templates/plugin-marketplace.md` — 1 site: added "Why `.squad/skills/`?" note after the install steps
- `.copilot/skills/squad-conventions/SKILL.md` — 1 site: file structure section expanded from single `.squad/skills/` line to full 5-path table with personal-paths exclusion note

**Sync verification:** PASS — both squad.agent.md files show identical +14/-5 delta in the routing and spawn-template sections.

---

### 2026-06-02T21:33:08+03:00 — RE-VAL iter-4 (3/6): tamirdresher/holocaust-research-wasserman

**Verdict:** 🟢 GO on the two bugs this repo originally surfaced; ⚠️ HOLD on declaring MCP-RUNTIME fully fixed.

**EPERM-NO-SHORTCIRCUIT — FIXED.** This is the repo that surfaced the bug in iter-3. Re-tested in the same failure environment: `squad upgrade --self --state-backend two-layer` now completes state migration (10 files → squad-state branch, backend flipped, 6 hooks installed) BEFORE surfacing the self-upgrade failure as a deferred non-zero-exit warning. Most important single signal in this re-val.

**REGISTRY-PIN-UNPUBLISHED — FIXED.** Upgrade log shows `ensured squad_state pinned to @bradygaster/squad-cli@insider` — HEAD-check detected `0.9.6-preview.9` is not on the registry and fell back to `@insider` dist-tag spec as designed.

**MCP-NOT-AUTOLOADED — PARTIAL.** Orphan SHA timeline across FRESH-init 3 sessions: `2dd3d02 → 2dd3d02 → 2dd3d02 → 2dd3d02` (Δ0 commits). Direct MCP probe: agent reports `"no tools prefixed with squad_state_*"`. The iter-4 wrapper only injects `--additional-mcp-config` on copilot spawns from inside squad-cli; the canonical user invocation `copilot --yolo --autopilot --agent squad -p "..."` bypasses the wrapper, so Copilot CLI 1.0.58 still silently skips `.copilot/mcp-config.json`. Per Data-16 alias experiment — bug not closed for canonical UX.

**MCP-RUNTIME / mcp-config form:** npx-pinned form, not non-npx. `@bradygaster/squad-cli@0.9.6-preview.9` on init, `@bradygaster/squad-cli@insider` after upgrade (fallback engaged).

**Bug counts:** 8 ✅ / 1 ⚠️ / 1 ➖ (TIMESTAMP-COLON-LEAK not triggered).

**Iter-5 recommendation:** ship `squad copilot ...` shim subcommand (~15 LOC) that pre-injects `--additional-mcp-config` so canonical user invocations get the bridge.

**Artifacts:**
- Primary dup: https://github.com/tamirdresher_microsoft/holocaust-research-wasserman-tarball-test-iter4-20260602T213308
- Upgrade dup: https://github.com/tamirdresher_microsoft/holocaust-research-wasserman-upgrade-test-iter4-20260602T213308
- Per-repo report: `<primary-dup>/validation/RE-VAL-iter4-holocaust-research-wasserman.md`
- Mirror: `.squad/files/validation/REVAL-ITER4-holocaust-research-wasserman.md`
- Decision drop: `.squad/decisions/inbox/data-reval-iter4-holocaust-research-wasserman.md`
- Scratch: `C:\Users\tamirdresher\squad-validation\wasserman-iter4-20260602T213308\`

**Auth restored:** `tamirdresher_microsoft` (verified on exit).

---

### 2026-06-02T21:10:16.324+03:00 — Worf R-1/R-2 landed [ws:skill-discovery-paths]

**R-1 — NFC Normalization + Control-Char Denylist:**
- Dedup rule now mandates NFC Unicode normalization and trailing-whitespace trim before comparison. Prevents Unicode-confusable attack (NFC vs NFD variants of the same name bypassing dedup).
- Explicit denylist: skip any skill directory whose name contains null bytes, control characters (`\x00`–`\x1F`, `\x7F`), or path separators (`..`, `/`, `\`). Log: `⚠ Skill name '{name}' in {path} skipped (contains invalid characters).`
- Edit sites: Dedup rule paragraph in `.github/agents/squad.agent.md` and `.squad/templates/squad.agent.md.template` (both mirrored per twin-file invariant).

**R-2 — Hardlinks over Symlinks (monorepo UX):**
- Symlinks are NOT followed during discovery (Windows compat + security). For monorepo users who need a skill to appear in multiple logical locations: use a hardlink (`ln {source} {destination}`, not `ln -s`). Hardlinks are regular files from the filesystem's perspective and are discovered normally.
- Edit site: `.copilot/skills/squad-conventions/SKILL.md` only (user-facing skill-author guidance; does NOT belong in squad.agent.md).

**R-3 — Out of Scope:**
- Squad's skill discovery is LLM-prompt-driven, not runtime code. No `.squad/test/` exists. No test scaffolding created. Revisit if a CLI scanner is ever introduced.

---

### 2026-06-02T21:33:10+03:00 — Re-Val Iter-4 / 2-of-6 — multiplayer-sudoku [data-reval-iter4-multiplayer-sudoku]

**Tarballs on disk:** `0.9.6-preview.9` (manifest claimed preview.8 — auto-bump on pack). Dup names: `multiplayer-sudoku-tarball-test-iter4-20260602T213310` (fresh-init), `multiplayer-sudoku-upgrade-test-iter4-20260602T213310` (upgrade).

**Headline:** Iter-4 fixes are **asymmetric across init vs upgrade paths**. Upgrade ✅; init ❌.

- **Init (fresh `--state-backend two-layer`):** orphan SHA was `e5725a96` after init and STILL `e5725a96` after S1, S2, S3. Zero MCP tool calls in any session log. Root cause: `buildMcpServerSpecs` in `squad-sdk/init.ts` hard-pins `npx -y @bradygaster/squad-cli@<currentVersion>`; for the local-tarball build `0.9.6-preview.9` this E404s on the npm registry, Copilot CLI silently drops the failed server, the agents work entirely in WT.
- **Upgrade (`local → two-layer`):** 8 state files migrated to orphan, mcp-config.json pinned to `@bradygaster/squad-cli@insider` (fallback fired correctly via `resolveSquadStateMcpSpec` in `upgrade.ts`), one follow-up session pushed `+1` commit (`0de57272` → `0f62575f`) to `origin/squad-state`.

**Why the asymmetry:** the new `resolveSquadStateMcpSpec` helper with `npm-registry.ts` HEAD-check + `@insider` fallback was wired only into `upgrade.ts`. The init path calls the older synchronous `buildMcpServerSpecs` that doesn't do the HEAD-check. Mirroring the helper (or factoring one shared lib) is a ~15-LOC iter-5 spin + 2 tests.

**New bug surfaced:** **UPGRADE-TEMPLATE-DOC-FLATTEN.** `squad upgrade --state-backend two-layer` dumped ~20 template docs and per-agent charter scaffolds (`charter.md`, `casting-history.json`, `casting-policy.json`, `casting-registry.json`, `Rai-charter.md`, `scribe-charter.md`, `fact-checker-charter.md`, `mcp-config.md`, `multi-agent-format.md`, `plugin-marketplace.md`, `orchestration-log.md`, `roster.md`, etc.) directly into `.squad/` root. They should live under `.squad/templates/` and `.squad/agents/<name>/`. Cosmetic-but-shadowing bug; iter-5 candidate (~20 LOC).

**Bug matrix counts:** 8 ✅ · 3 ⚠ · 2 ❌ · 9 n/a (14 prior + 1 iter4-new = 15 tracked).

**MCP-NOT-AUTOLOADED status note:** the canonical command in the prompt is plain `copilot --yolo --autopilot --agent squad -p "…"`, which bypasses every `--additional-mcp-config` wrap site iter-4 added to squad's spawn code. On this repo, project `.copilot/mcp-config.json` DID load under Copilot CLI 1.0.58 (refuting one Data-16 finding for this cwd + this version), which makes the wrapper concern less urgent than thought — what matters is whether the pinned package resolves. Still worth a `squad copilot` wrapper subcommand so canonical usage actually runs through squad.

**Verdict:** 🟡 HOLD merge. Land iter-5 with: (1) helper-mirror into init, (2) UPGRADE-TEMPLATE-DOC-FLATTEN fix. Then re-validate. Decision drop: `.squad/decisions/inbox/data-reval-iter4-multiplayer-sudoku.md`. Per-repo report: `multiplayer-sudoku-tarball-test-iter4-20260602T213310/validation/RE-VAL-iter4-multiplayer-sudoku.md`. Squad mirror: `.squad/files/validation/REVAL-ITER4-multiplayer-sudoku.md`. Auth: `gh auth switch --user tamirdresher_microsoft` confirmed (active id 188938611).


---

### 2026-06-02T21:50:00+03:00 — Re-validation iter-4 on tamir-squad-hq (WORST-CASE, data-reval-iter4-tamir-squad-hq)

**Dup:** https://github.com/tamirdresher_microsoft/tamir-squad-hq-tarball-test-iter4-20260602T213310
**Tarballs:**  .9.6-preview.9 (rebuilt since manifest's preview.8)
**Verdict:** Build-time fixes 🟢 GREEN end-to-end on the worst-case repo. Runtime bridge ❌ STILL FAILS for direct copilot --agent squad -p "..." invocations.

**Build-time wins (all 5 user MCP servers preserved verbatim):**
- Pre: 5 servers (azure-devops, bitwarden, bitwarden-shadow, EXAMPLE-trello, chrome-devtools). Post: same 5 byte-identical + new squad_state block.
- squad_state entry uses **iter-4 form**: 
px -y @bradygaster/squad-cli@insider state-mcp (dist-tag fallback per REGISTRY-PIN-UNPUBLISHED) — *not* an unresolvable @0.9.6-preview.9 pin.
- 18 state files migrated (1MB decisions.md + 17 agent histories) onto orphan squad-state cleanly; static files preserved on disk.
- 6 hooks installed; stateBackend: two-layer; pre-existing 	eamRoot/peers/devbox config preserved.
- Self-upgrade EPERM did NOT abort migration (UPGRADE-EPERM-FALSE-SUCCESS confirmed on the worst-case repo).

**Runtime failure (END-USER PROOF):**
- 4 continuity sessions, identical canonical invocation copilot --yolo --autopilot --agent squad -p "...".
- Orphan SHA frozen at deb2d49b across ALL 4 sessions (pre == post each time, zero growth).
- 3 of 4 sessions explicitly logged tools unavailable: "Scribe found the runtime state tools unavailable", "squad_state_* runtime tools aren't bound in this environment", "no squad_state_* runtime bridge is available".

**Root cause (confirmed again after alias experiment):** Copilot CLI 1.0.58 silently ignores project-level .copilot/mcp-config.json. The iter-4 MCP-NOT-AUTOLOADED wrapper (copilot-invocation.ts + 10 spawn sites) intercepts squad-spawned copilot processes but NOT the user's direct invocation. Retrofitted config is correct as an artefact, unreachable at runtime via the canonical entry point.

**Iter-5 recommendation:** ship squad copilot <args...> wrapper that pre-mixes --additional-mcp-config @<teamRoot>/.copilot/mcp-config.json, and make it the documented canonical end-user entry point.

**Report:** `.squad/files/validation/REVAL-ITER4-tamir-squad-hq.md` (mirror at `<dup>/validation/RE-VAL-iter4-tamir-squad-hq.md`). Decision drop: `.squad/decisions/inbox/data-reval-iter4-tamir-squad-hq.md`.

---

### 2026-06-02T213308+03:00 — Re-validation iter-4 / gh-ai-adoption2026 (data-reval-iter4)

**Bundle:** preview.8 manifest / preview.9 tarballs (re-pack). Twin SDK+CLI installed under `.npm-prefix-ghai-iter4`.
**Dups:**
- Fresh: tamirdresher_microsoft/gh-ai-adoption2026-tarball-test-iter4-20260602T213308
- Upgrade: tamirdresher_microsoft/gh-ai-adoption2026-tarball-upgrade-iter4-20260602T213308

**Build-time:** 🟢 GO. Fresh init two-layer clean; upgrade migrates 8 mutable files onto orphan, hooks install all 6, REGISTRY-PIN-UNPUBLISHED fallback verified (mcp-config rewritten to `@bradygaster/squad-cli@insider` because preview.9 unpublished).

**Runtime MCP:** 🔴 unresolved for direct-copilot pattern. Orphan SHA timeline `f5f7a48f → f5f7a48f → f5f7a48f → f5f7a48f` (0 commits across 3 sessions: Simpsons team build / Lisa schema / Frink KPI). Scribe + Coordinator self-reported "state bridge missing" verbatim. Iter-4 wrap fix scope = squad-spawned copilot (watch/loop/triage), NOT user-spawned `copilot --agent squad -p "..."`.

**Bug matrix:** ✅ 7 · 🔴 1 · n.a. 3.

**Iter-5 ask:** add `squad copilot <args>` subcommand to pre-mix `--additional-mcp-config` for the user-direct invocation path. Track github/copilot-cli#3642 for the upstream auto-load fix.

**Reports:** `.squad/files/validation/REVAL-ITER4-gh-ai-adoption2026.md` (mirror) · per-repo `validation/RE-VAL-iter4-gh-ai-adoption2026.md` on Dup A.



Full archive: .squad/agents/data/history-archive.md
