/**
 * Helpers for spawning the Copilot CLI from squad-managed code paths.
 *
 * Background — Copilot CLI 1.0.58 silently IGNORES project-level
 * `.copilot/mcp-config.json` and only auto-loads the user-level
 * `~/.copilot/mcp-config.json`. As a result, the `squad_state` MCP entry that
 * squad writes into the project config is never picked up, so `squad_state_*`
 * tools never become available in spawned sessions and the runtime state
 * bridge stays unwired.
 *
 * Mitigation: every time squad invokes `copilot` as a subprocess, we inject
 * `--additional-mcp-config @<path-to-project-config>` so the project file is
 * explicitly loaded for that session. We only inject when:
 *  - the command being spawned is the bare `copilot` binary (i.e. the user
 *    did not override via `--agent-cmd`)
 *  - a `.copilot/mcp-config.json` file actually exists under `teamRoot`
 *
 * See `.squad/files/validation/ALIAS-EXPERIMENT-VERDICT.md` for the empirical
 * proof that this flag is required for `squad_state_*` tools to register.
 */

import path from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Build the extra CLI args needed to make the Copilot CLI load this project's
 * `.copilot/mcp-config.json`. Returns an empty array when injection is not
 * needed (custom agent command, or no project config to inject).
 *
 * The Copilot CLI accepts either inline JSON or a file path prefixed with `@`
 * (verified via `copilot --help`: "Additional MCP servers configuration as
 * JSON string or file path (prefix with @)"). We use the `@<path>` form to
 * avoid argv quoting issues with multi-line JSON on Windows.
 */
export function buildAdditionalMcpConfigArgs(cmd: string, teamRoot: string | undefined): string[] {
  if (cmd !== 'copilot') return [];
  if (!teamRoot) return [];
  const configPath = path.join(teamRoot, '.copilot', 'mcp-config.json');
  try {
    if (!existsSync(configPath)) return [];
  } catch {
    return [];
  }
  return ['--additional-mcp-config', `@${configPath}`];
}

/**
 * Prepend the additional-mcp-config args to the user's args. Returns the full
 * argv list to pass to spawn/execFile for the given cmd. The injection slots
 * the flag BEFORE other args so positional `-p <prompt>` and similar still
 * work correctly.
 */
export function withAdditionalMcpConfig(
  cmd: string,
  args: string[],
  teamRoot: string | undefined,
): string[] {
  const extra = buildAdditionalMcpConfigArgs(cmd, teamRoot);
  return extra.length > 0 ? [...extra, ...args] : args;
}
