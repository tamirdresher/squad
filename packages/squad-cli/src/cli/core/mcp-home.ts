/**
 * iter-7: per-project HOME-write for the squad_state MCP entry.
 *
 * Background: prior iterations wrote `squad_state` into the project's
 * `.copilot/mcp-config.json`. This required users to invoke our `run-copilot`
 * wrapper (deleted in iter-7) to actually load the entry, because
 * github/copilot only auto-loads HOME-level `~/.copilot/mcp-config.json`
 * by default.
 *
 * iter-7 flips that: we write the entry directly to
 * `~/.copilot/mcp-config.json` under a per-project-namespaced key
 * `squad_state_<8charSha256ofProjectAbsPath>`, so:
 *   - Vanilla `copilot` picks it up automatically; no wrapper needed.
 *   - Multiple Squad projects on one machine don't collide.
 *   - Other user-configured MCP servers in HOME are preserved byte-for-byte
 *     (we round-trip through JSON.parse / JSON.stringify but only mutate the
 *     `mcpServers[squad_state_<hash>]` key).
 *
 * `tombstoneProjectSquadStateMcp` removes any pre-existing project-level
 * `squad_state` entry left by the SDK's init writer, which we keep untouched
 * for backward compat.
 *
 * @module cli/core/mcp-home
 */

import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { FSStorageProvider } from '@bradygaster/squad-sdk';
import type { SquadStateMcpSpec } from './mcp-spec.js';

const storage = new FSStorageProvider();

/** Stable 8-char per-project namespace suffix. */
export function projectMcpHash(dest: string): string {
  const resolved = path.resolve(dest);
  return crypto.createHash('sha256').update(resolved).digest('hex').slice(0, 8);
}

/**
 * Canonical HOME mcp-config path (`~/.copilot/mcp-config.json`).
 *
 * Tests may override by setting `SQUAD_HOME_DIR_OVERRIDE` to point at a
 * temp directory; otherwise this resolves to the real user's HOME.
 */
export function getHomeMcpConfigPath(): string {
  const override = process.env.SQUAD_HOME_DIR_OVERRIDE;
  const home = override && override.length > 0 ? override : os.homedir();
  return path.join(home, '.copilot', 'mcp-config.json');
}

interface McpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConfigShape {
  mcpServers?: Record<string, McpServerEntry>;
  [k: string]: unknown;
}

export interface EnsureHomeResult {
  written: boolean;
  key: string;
  path: string;
}

/**
 * Insert/update the per-project squad_state entry in HOME mcp-config.
 * Preserves all other entries unchanged.
 *
 * Throws on malformed existing HOME mcp-config rather than silently
 * overwriting — refusing to clobber a hand-edited file is safer than the
 * alternative.
 */
export function ensureSquadStateMcpInHome(
  dest: string,
  cliVersion: string,
  spec: SquadStateMcpSpec,
): EnsureHomeResult {
  const hash = projectMcpHash(dest);
  const key = `squad_state_${hash}`;
  const cfgPath = getHomeMcpConfigPath();

  let parsed: McpConfigShape;
  if (storage.existsSync(cfgPath)) {
    const raw = storage.readSync(cfgPath) ?? '{}';
    try {
      const obj = JSON.parse(raw) as unknown;
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        throw new Error(`${cfgPath}: root must be a JSON object`);
      }
      parsed = obj as McpConfigShape;
    } catch (err) {
      throw new Error(
        `Refusing to overwrite malformed ${cfgPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    parsed = {};
  }

  if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
    parsed.mcpServers = {};
  }

  const existing = parsed.mcpServers[key];
  const desired: McpServerEntry = { command: spec.command, args: [...spec.args] };

  if (
    existing &&
    existing.command === desired.command &&
    Array.isArray(existing.args) &&
    existing.args.length === desired.args!.length &&
    existing.args.every((a, i) => a === desired.args![i])
  ) {
    return { written: false, key, path: cfgPath };
  }

  parsed.mcpServers[key] = desired;

  // Tag with the producer + project path for forensic debugging when users
  // see an unfamiliar `squad_state_<hash>` entry in their HOME config.
  // Stored as a sibling top-level key so we don't pollute mcpServers.
  const meta = (parsed._squadProjects as Record<string, { path: string; version: string }> | undefined) ?? {};
  meta[key] = { path: path.resolve(dest), version: cliVersion };
  parsed._squadProjects = meta;

  storage.writeSync(cfgPath, JSON.stringify(parsed, null, 2) + '\n');
  return { written: true, key, path: cfgPath };
}

export interface TombstoneResult {
  removed: boolean;
  path: string;
}

/**
 * Remove a stale top-level `squad_state` entry from the project
 * `.copilot/mcp-config.json` (left there by the SDK's init writer for
 * backward compat). Preserves all other entries.
 */
export function tombstoneProjectSquadStateMcp(dest: string): TombstoneResult {
  const cfgPath = path.join(dest, '.copilot', 'mcp-config.json');
  if (!storage.existsSync(cfgPath)) return { removed: false, path: cfgPath };

  let parsed: unknown;
  try {
    parsed = JSON.parse(storage.readSync(cfgPath) ?? '{}');
  } catch {
    return { removed: false, path: cfgPath };
  }
  if (!parsed || typeof parsed !== 'object') return { removed: false, path: cfgPath };

  const config = parsed as McpConfigShape;
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    return { removed: false, path: cfgPath };
  }
  if (!('squad_state' in config.mcpServers)) {
    return { removed: false, path: cfgPath };
  }

  delete config.mcpServers.squad_state;
  storage.writeSync(cfgPath, JSON.stringify(config, null, 2) + '\n');
  return { removed: true, path: cfgPath };
}
