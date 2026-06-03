/**
 * `squad run-copilot <args>` — drop-in wrapper for the bare `copilot` CLI
 * that ensures the project's `.copilot/mcp-config.json` is loaded.
 *
 * Why this exists
 * ===============
 * Copilot CLI 1.0.58 silently ignores project-level `.copilot/mcp-config.json`
 * and only auto-loads `~/.copilot/mcp-config.json`. As a result, the canonical
 * end-user invocation
 *
 *     copilot --yolo --autopilot --agent squad -p "..."
 *
 * leaves the `squad_state` MCP server unwired and the runtime state bridge
 * unavailable. Iter-4 wrapped 10 squad-internal spawn sites with
 * `--additional-mcp-config @<path>` but those wraps don't help when the user
 * starts copilot directly. Iter-5 surfaces this wrapper subcommand so the
 * documented canonical command becomes:
 *
 *     squad run-copilot --yolo --autopilot --agent squad -p "..."
 *
 * Naming note: `squad copilot` is already taken by the team-roster management
 * command (squad copilot [--off] [--auto-assign]). We picked `run-copilot`
 * per the iter-5 directive's failure-mode guidance.
 *
 * See `.squad/files/validation/ALIAS-EXPERIMENT-VERDICT.md` for the proof
 * that `--additional-mcp-config` is necessary and sufficient.
 */

import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';

export interface RunCopilotOptions {
  /**
   * Injection seam for tests — replaces `child_process.spawn`.
   * Defaults to the real `spawn` from `node:child_process`.
   */
  spawnImpl?: (cmd: string, args: string[], opts: SpawnOptions) => ChildProcess;
  /** Override the binary name (default: `copilot`). Tests use this. */
  copilotBin?: string;
}

/**
 * Build the augmented argv: when the project `.copilot/mcp-config.json` exists,
 * prepend `--additional-mcp-config @<absolute-path>` to the user's args. When
 * it doesn't (e.g. the user is in a non-squadified project), pass args through
 * untouched so the wrapper is transparent.
 */
export function buildRunCopilotArgs(teamRoot: string, userArgs: string[]): string[] {
  const configPath = path.join(teamRoot, '.copilot', 'mcp-config.json');
  let configExists = false;
  try {
    configExists = existsSync(configPath);
  } catch {
    configExists = false;
  }
  if (!configExists) return [...userArgs];
  return ['--additional-mcp-config', `@${configPath}`, ...userArgs];
}

/**
 * Run `copilot` with the project mcp-config injected. Resolves to the child
 * process's exit code (0 on success, non-zero on failure). Stdio is inherited
 * so the user sees the normal copilot UX (TTY, prompts, streaming output).
 */
export async function runRunCopilot(
  teamRoot: string,
  userArgs: string[],
  options: RunCopilotOptions = {},
): Promise<number> {
  const args = buildRunCopilotArgs(teamRoot, userArgs);
  const spawnFn = options.spawnImpl ?? spawn;
  const cmd = options.copilotBin ?? 'copilot';

  return await new Promise<number>((resolve, reject) => {
    const child = spawnFn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('exit', (code, signal) => {
      if (typeof code === 'number') {
        resolve(code);
      } else if (signal) {
        // Mirror common shell convention: 128 + signal number.
        // For unknown signal numbers, just use 1.
        resolve(1);
      } else {
        resolve(0);
      }
    });
  });
}
