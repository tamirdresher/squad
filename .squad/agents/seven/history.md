# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Cross-repo Squad history, research repos, Squad SDK/CLI, Clawpilot/m, Azure agent systems
- **Created:** 2026-05-14T09:22:24.987+05:30

## Seven — Core Mission

Seven owns cross-repo learning & signal research. Key focus: state-backend community signal, memory research, ADC architecture validation, provenance documentation.

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
