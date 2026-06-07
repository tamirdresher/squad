# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Cross-repo Squad history, research repos, Squad SDK/CLI, Clawpilot/m, Azure agent systems
- **Created:** 2026-05-14T09:22:24.987+05:30

## Seven — Core Mission

Seven owns cross-repo learning & signal research. Key focus: state-backend community signal, memory research, ADC architecture validation, provenance documentation.

## 2026-06-06 — Real Source Code vs Spec Gap Pattern (Issue #600 Analysis)

**Lesson:** Always grep source code when evaluating implementation status. Template/spec docs are normative but can drift from actual shipped logic. Data's 2nd-pass archaeology found:
- **Shipped:** TwoLayerBackend.promoteNotes() has 2 production callers (CLI command + Ralph heartbeat)
- **Spec only:** spawn-time tier selection (`--include-cold`, `--include-wiki`) — zero callers in code

Without real-code verification, Seven's earlier assessment missed the retention-layer shipping. Recommended workflow: (1) read spec, (2) identify feature surface (functions, CLI flags, config keys), (3) grep code for callers, (4) verify production paths.

## Key Learnings (Active)

- **2026-06-02:** Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations
- Foundational Directives: Type safety (strict mode mandatory), hook-based governance, Node.js ≥20 ESM-only, append-only merge drivers for `.squad/decisions.md` and agent history files
- Routing Architecture: CLI-centric enforcement creates gaps on other platforms (VS Code); platform-neutral dispatch rules required with per-platform substitution mechanisms
- State-Backend: 5 dominant problem themes (upgrade gaps P1, two-layer incomplete P1, coordinator inconsistency P2, permission API breaking P1, state destruction on branch switch P1-resolved)
- Memory Research: E2E oracle + A/B value framework; real Copilot CLI E2E portfolio (smoke 40min + full 7.5-9hr); real subprocess, persistent memory, measurable delta distinguish from substitutes

### Workstreams pattern research (2026-06-02)

Reference files cited: `bradygaster/github-copilot-squad-research` `README.md`, `workstreams/README.md`, `workstreams/_template/README.md`, `workstreams/active/github-integration-surfaces/README.md`, `workstreams/active/repo-native-team-casting/README.md`, `.squad/ceremonies.md`, `.squad/decisions.md`, and `.squad/templates/scribe-charter.md`. A workstream there is a self-contained research folder under `workstreams/{active,closed,evergreen}` with README frontmatter (`status`, `created`, optional `closed`) and standard subfolders for reports, diagrams, artifacts, and drops; coordinator ceremony creates `workstreams/active/{slug}/`, stores findings under that folder, and updates the README, while decisions remain a global Scribe-merged log. Gap delta: squad-squad has rich decision/directive content but root `.squad/decisions.md`, flat `.squad/decisions/inbox/`, and `now.md` prose mix Squad.Agents.AI, state-backend, Durable/ADC/Azure, content, Clawpilot, and governance tracks. Recommended adoption shape: create internal `.squad/workstreams/{active,closed,evergreen,_template}` with per-workstream `decisions.md` and `decisions/inbox/`, keep legacy decisions unmoved, add `global` evergreen for cross-track directives, and teach Coordinator/Scribe to pass and merge by `WORKSTREAM_ID`.

## Cross-Repo Research Context

PR #3 Squad.Agents.AI provenance split identified: Data track (auth inventory), Reno implementation, Worf token hardening. Prior PoCs catalogued. Four files required per skill in marketplace: SKILL.md, manifest.json, plugin.json, README.md.

## 2026-06-02T10:50:37Z — 11-Mode Auth Inventory Research Context

Data authored 11-auth-mode inventory for Squad.Agents.AI expansion (Decision cleared, PASS_WITH_CONDITIONS). Inventory surfaces SDK auth surface consistency patterns; may inform future MAF/Copilot SDK research.

---
**Last Updated:** 2026-06-02T10:50:37Z  
**Archive:** `.squad/agents/seven/history-archive.md` (comprehensive baseline + state-backend triage)

## 2026-06-02T22:22:40+03:00 — Copilot CLI MCP config paths verified (issue #3642)

**Question:** Is @caarlos0's claim accurate that project MCP settings are loaded from .mcp.json, not .copilot/mcp-config.json?

**Verdict:** Accurate.

**Sources:**
- copilot --version -> `GitHub Copilot CLI 1.0.58`
- copilot mcp --help (run locally 2026-06-02) — authoritative output:
  ```
  Configuration is loaded from multiple sources:
    User       ~/.copilot/mcp-config.json
    Workspace  .mcp.json
    Plugin     Installed plugins with MCP servers
  ```

## 2026-06-02T22:51:18+03:00 — MCP Config Precedence-Order Re-spawn Pending

**Picard requested narrow follow-up** (per Picard's decision in `.squad/decisions/inbox/picard-mcp-json-migration-scope.md` Q3) on precedence-order semantics before Data writes the merge helper's conflict-resolution policy:

**Three empirical questions to resolve:**
1. Given same server name in both `.mcp.json` (workspace) and `~/.copilot/mcp-config.json` (user), which wins at dispatch time? (Workspace expected)
2. Are server entries from two files merged (union) or does one source shadow the other entirely?
3. What does Copilot CLI do if `.mcp.json` is malformed — fall back to user file or hard-fail?

**Deliverable:** 1-page decision at `.squad/decisions/inbox/seven-mcp-config-precedence.md` with three reproducible test commands + outputs on Copilot CLI 1.0.58+. Time-box: 30 min.

**Status:** Pending re-spawn. Picard has Data holding on merge-helper implementation until Seven's results land.
- https://github.com/github/copilot-cli/issues/3642 — maintainer @caarlos0 reply
- https://github.com/github/copilot-cli README — documents LSP config paths (~/.copilot/lsp-config.json, .github/lsp.json) but NOT MCP paths; copilot mcp --help is the authoritative source.

**Key findings:**
- Auto-loaded project-local MCP path: `.mcp.json` at repo root (only one).
- `.copilot/mcp-config.json` at repo root is NOT auto-loaded — only honored via `--additional-mcp-config`.
- No `.vscode/mcp.json` / `.cursor/mcp.json` auto-load.
- User-level: `~/.copilot/mcp-config.json`. Plugin-level: bundled with installed plugins.

---

## 2026-06-07 — v0.10.0 Release Preflight (Scribe Notification)

**Research-relevant:** Coordinator dispatched Data, Worf, Troi for full upstream bradygaster/squad v0.10.0 release audit. Key outcomes: Three pre-release blockers (workspace/preview/root package sync), four non-blocking warnings, GO for Phase 2. Prior decision surface: pre-release auth model documented in Worf log; version history & changelog alignment in Data log; messaging/comms pre-flight (Troi blog) ready pending Tamir confirmation. Cross-repo implications: upstream Squad v0.10.0 may surface new memory/research signal for state-backend track. Logs at `.squad/orchestration-log/2026-06-07T053651Z-{data,worf,troi}.md`.


**Implication for squad-cli:** Current workaround --additional-mcp-config @./.copilot/mcp-config.json targets a non-standard path. Migration = move file to `./.mcp.json` and drop the flag. Decision written to `.squad/decisions/inbox/seven-mcp-config-paths-verified.md`.

**Caveats:** Verified on 1.0.58 / Windows. Precedence among User/Workspace/Plugin not stated in help; re-verify after CLI upgrades.

## 2026-06-02T22:22:40+03:00 — MCP Config Precedence / Merge / Failure (RESOLVED)

### Learnings (empirical, Copilot CLI 1.0.58 / Windows)

**Question (a) — Precedence:** Workspace `.mcp.json` **wins** over user `~/.copilot/mcp-config.json` for same-named servers. Proven via `copilot mcp list --json` from a temp workspace dir: the resolved entry's `source` field reads `"workspace"` and `sourcePath` points at the temp `.mcp.json`; all of `command`, `args`, and `env` come from the workspace file, with the user definition completely invisible.

**Question (b) — Merge vs shadow:** **Full shadow at the field level, name-level union at the outer dict.** Test: workspace `probe_merge` defined `command`+`args` but NO `env`; user `probe_merge` had `env: { USER_ONLY_ENV: "user_value" }`. Resolved record had NO `env` key at all — the user's `env` did not leak in. → Higher-precedence source wholly replaces the lower one; the CLI does not deep-merge fields. Disjoint names (`probe_user_only`, `probe_workspace_only`) coexist with their respective `source` tags, confirming the union is purely at the server-name level.

**Question (c) — Malformed `.mcp.json`:** **Silent fallback to user file. Zero diagnostic.** Wrote literal `{` to `.mcp.json`; `copilot mcp list` exited `0`, printed only the three user servers, no warning on stdout or stderr. Identical behavior for empty file and for non-JSON garbage. `copilot mcp get probe_workspace_only` returns "Server not found" with the workspace-only name absent from "Available servers". **Debuggability hazard:** a typo in `.mcp.json` makes `squad_state` "disappear" with no clue why.

**Useful CLI artifact discovered:** `copilot mcp list --json` emits a `source` field (`"user"` | `"workspace"` | presumably `"plugin"`/`"builtin"`) and, for workspace entries, a `sourcePath`. This is the authoritative provenance probe for future precedence work — re-verify it survives future CLI bumps.

### Recommendation handed to Data
1. Same-name conflict → warn + prefer existing (do NOT silently overwrite a non-equivalent `squad_state` entry).
2. Pre-write JSON validation is mandatory — CLI swallows parse errors, so the helper must surface them itself.
3. Atomic temp-file rename so a crash mid-write never produces malformed JSON (which the CLI would then silently ignore, vanishing `squad_state`).
4. Plugin vs Workspace precedence NOT tested (out of scope); flag for follow-up if `squad-cli` ever ships as a plugin.

### Artifacts
- Decision: `.squad/decisions/inbox/seven-mcp-config-precedence.md` (full reproducer + exact CLI output).
- Production user config (`~/.copilot/mcp-config.json`) backed up before test, restored after, verified byte-equal; test temp dir removed.

## Learnings — Squad Memory Architecture (2026-06-06)

### What has landed in bradygaster/squad

- **Tiered-memory skill** (SKILL.md): Merged in commit `e11b5d3f` (2026-03-28, PR #606). Defines hot/cold/wiki tiers fully in documentation form. Files: `packages/squad-cli/templates/skills/tiered-memory/SKILL.md`, `packages/squad-sdk/templates/skills/tiered-memory/SKILL.md`, `docs/proposals/tiered-memory.md`. Proposal links back to issue #600. This is spec-complete, not runtime-complete.

- **Scribe archival thresholds** (charter update): Merged in commit `3cc22b4f` (2026-03-27, PR #637). Two-tier Scribe workflow: archive at 20KB/30-day then 50KB/7-day. Applies to `decisions.md`. All 7 Scribe charter templates updated. This is the closest thing to "promotion/demotion logic" that shipped — but it's size/age based, not issue-tag or semantic.

- **Memory governance provider** (PR #1145, merged ~2026-05-20): MemoryProvider contract, MemPalace/IndexServer providers, governed memory with classification, write/search/promote/delete/audit. This is the external memory provider model, NOT history.md tiering. Related to StorageProvider abstraction (`26047dc5`).

- **nap.ts hot/cold split**: Pre-dates #600. `compressHistory()` keeps last N sections, archives remainder to `history-archive.md`. HISTORY_THRESHOLD governs the trigger. Functional but not issue-tag-aware and does not integrate with spawn-time loading.

### What is still missing for #600

- **No `readRecentHistory()` or hot-only loading**: `agent-source.ts` (line 193–205) still reads full `history.md` at spawn — no hot-only filtering.
- **No `squad_history_read` tool**: On-demand cold/archive access from agent prompts does not exist. Identified in #686 research as the key implementation gap.
- **No wiki tier runtime**: `.squad/memory/wiki/` path and `scribe:wiki-write` tool are specced in the skill but not implemented. Issue #686 notes wiki is deferred pending StorageProvider (#640).
- **No issue-tag-based retention**: Not in nap.ts, not in agent-source.ts, not in any PR or commit. Not referenced in #686 research either.
- **No conditional cold-tier spawn loading**: `agent-source.ts` loads full history unconditionally.

### Issue status (as of 2026-06-06)

- #600 (main tiered memory): OPEN — skill merged, runtime not implemented
- #686 (research spike): OPEN — research complete per Ralph comment, no implementation PR
- #595 (hot/cold layer, subset of #600): OPEN — design done, no implementation PR
- No merged PR addresses runtime hot-only spawning or wiki tier

### Reusable insight

The pattern in bradygaster/squad: spec/skill ships first (low-friction PR), runtime implementation follows as separate issue. The skill template is normative guidance for agents, not enforced by the runtime. When evaluating "is X done?" always check agent-source.ts / nap.ts / spawn template runtime in addition to SKILL.md.

## Learnings — 4-Week Issue Triage (2026-05-09 → 2026-06-06)

### Issue cadence observations (63 issues, bradygaster/squad)

**What the team is focused on (high volume):**
- **State backend plumbing** — multiple issues in flight: CAS safety (#1211), upgrade-pipeline gaps (#1190, #1185), bypass via prompt choreography (#1157, closed). Two-layer is the team's active P1; there are at least 4 open gaps that need to ship before the backend is fleet-safe.
- **CI/release hygiene** — changelog gate (#1156, #1195), tarball/version (#1171, #1203), postinstall ESM patch (#1190). obit91 is the main contributor here; Brady and Tamir's CI work is attracting close follow-on scrutiny.
- **Upgrade pipeline** — multiple reporters hit broken upgrades; `--state-backend` migration (#1185) and template duplication are actively hurting users.
- **Plugin/registry extensibility** — mfrieman filed a coordinated burst of 6 issues (#1135–#1141) around `squad://` URI resolver, workstream installs, asset registry. Possibly pre-coordinated or AI-generated batch.

**What is getting little attention:**
- **Memory / tiered loading (#600, #595, #686)** — zero new issues in 4 weeks that directly track #600 runtime implementation. #1184 (idangutman) is a parallel external proposal, not an upstream continuation. The Hot-tier runtime gap (#686) is stalled.
- **StorageProvider / wiki tier (#640)** — no new issues or PRs in this batch. The dependency is undisturbed.
- **Spawn-API context loading** — no design doc filed; the gap identified in #686 (no `squad_history_read` tool, no hot-only spawn filter) has no new traction.
- **Permission contract** — #1191 (jonlester) covers the breaking bug; the two follow-up suggestions (protocolVersion warning, approveAll re-export) were not filed separately.

**Pattern worth noting:** External/community contributors (idangutman, ischrei, ralarcon, mfrieman, sytone) are filing issues faster than the core team is triaging them. Several issues lack labels and have no core-team response. This suggests a triage backlog is forming around memory and extensibility topics.
