---
"@bradygaster/squad-cli": minor
"@bradygaster/squad-sdk": minor
---

Migrate per-repo MCP server config from `.copilot/mcp-config.json` to `.mcp.json` at the repo root.

`.mcp.json` is the workspace-level MCP config path that GitHub Copilot CLI auto-loads (see `copilot mcp --help`, verified on Copilot CLI 1.0.58+). The legacy `.copilot/mcp-config.json` location was never auto-loaded — users had to pass `--additional-mcp-config .copilot/mcp-config.json` on every invocation, and most teams never noticed their MCP servers weren't actually loading. Closes the loop on [github/copilot-cli#3642](https://github.com/github/copilot-cli/issues/3642).

**What changes:**

- `squad init` (both `squad init` SDK flow and the legacy `index.cjs` entry) now writes the sample MCP config to `.mcp.json` at the repo root instead of `.copilot/mcp-config.json`.
- `squad init --mcp-frontmatter` still writes into the agent frontmatter and does not touch either file.
- Templates, internal docs, and user-facing docs (`features/mcp.md`, `concepts/portability.md`, `reference/config.md`, `features/enterprise-platforms.md`, `features/notifications.md`) now lead with `.mcp.json` and explain `~/.copilot/mcp-config.json` as the user-level fallback.
- The JSON schema (`{ mcpServers: { ... } }`) is unchanged — only the file path moves.

**Migration (Phase 2 — automatic):**

`squad upgrade` now folds any pre-existing `.copilot/mcp-config.json` into `.mcp.json` at the repo root and reports the count migrated. Conflict policy: when the same server name is defined in both files with different `command`/`args`/`env`, the workspace `.mcp.json` wins and a warning is printed so the user can reconcile. The legacy file is preserved (not deleted) for one deprecation cycle so users can verify the merge — delete it manually once you have confirmed the new file works.

During the same window, `squad init` dual-writes the `squad_state` pin into both `.mcp.json` (always) and a pre-existing `.copilot/mcp-config.json` (only if already present). Fresh inits never create the legacy file — the migration is one-way. The user-level `~/.copilot/mcp-config.json` path is unaffected.

If you prefer to migrate by hand, the recipe in `docs/features/mcp.md` still applies — `squad upgrade` just does it for you.
