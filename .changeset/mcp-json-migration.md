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

**Migration (manual until `squad upgrade` ships a guided merge in a follow-up):**

If your repo already has `.copilot/mcp-config.json`, it is **not** touched by this release. Copy any custom `mcpServers.*` entries into the new `.mcp.json` and delete the old file. See the "Migrating from `.copilot/mcp-config.json`" section in `docs/features/mcp.md` for the full recipe. The user-level `~/.copilot/mcp-config.json` path is unaffected and remains valid for personal config.
