/**
 * MCP-BRIDGE-BROKEN regression test.
 *
 * Bug: `npx -y @bradygaster/squad-cli state-mcp` in .copilot/mcp-config.json
 * resolves to the npm `latest` dist-tag (currently 0.9.4) which does NOT have
 * the `state-mcp` command — so the squad_state MCP server never starts and
 * Copilot agents see zero squad_state_* tools at runtime, even though the
 * server is registered.
 *
 * Fix: the SDK's init.ts and the CLI's upgrade.ts now pin the package spec to
 * the currently-installed CLI version: `@bradygaster/squad-cli@<cliVersion>`.
 * The CLI's runEnsureChecks also retrofits existing mcp-config.json files on
 * `squad upgrade`.
 *
 * Bug evidence: data-3 baseline — `.squad/files/validation/UPGRADE-PATH-BASELINE-INSIDER3-REPORT.md`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureSquadStateMcpPinned } from '../packages/squad-cli/src/cli/core/upgrade.js';

function mkTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'squad-mcp-bridge-'));
}

function writeMcpConfig(dir: string, content: unknown): string {
  const dotCopilot = path.join(dir, '.copilot');
  fs.mkdirSync(dotCopilot, { recursive: true });
  const p = path.join(dotCopilot, 'mcp-config.json');
  fs.writeFileSync(p, JSON.stringify(content, null, 2) + '\n');
  return p;
}

describe('MCP-BRIDGE-BROKEN — squad_state launch spec pinning', () => {
  let dest: string;

  beforeEach(() => { dest = mkTempDir(); });
  afterEach(() => { fs.rmSync(dest, { recursive: true, force: true }); });

  it('pins squad_state to @bradygaster/squad-cli@<version> when args lack a version', () => {
    const cfgPath = writeMcpConfig(dest, {
      mcpServers: {
        squad_state: {
          command: 'npx',
          args: ['-y', '@bradygaster/squad-cli', 'state-mcp'],
        },
      },
    });

    const changed = ensureSquadStateMcpPinned(dest, '0.9.6-preview.1');
    expect(changed).toBe(true);

    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    expect(cfg.mcpServers.squad_state.args).toEqual([
      '-y',
      '@bradygaster/squad-cli@0.9.6-preview.1',
      'state-mcp',
    ]);
  });

  it('replaces a stale pinned version with the current CLI version', () => {
    const cfgPath = writeMcpConfig(dest, {
      mcpServers: {
        squad_state: {
          command: 'npx',
          args: ['-y', '@bradygaster/squad-cli@0.9.4', 'state-mcp'],
        },
      },
    });

    const changed = ensureSquadStateMcpPinned(dest, '0.9.6-preview.1');
    expect(changed).toBe(true);

    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    expect(cfg.mcpServers.squad_state.args[1]).toBe('@bradygaster/squad-cli@0.9.6-preview.1');
  });

  it('is idempotent — second call makes no changes', () => {
    writeMcpConfig(dest, {
      mcpServers: {
        squad_state: {
          command: 'npx',
          args: ['-y', '@bradygaster/squad-cli@0.9.6-preview.1', 'state-mcp'],
        },
      },
    });

    const changed = ensureSquadStateMcpPinned(dest, '0.9.6-preview.1');
    expect(changed).toBe(false);
  });

  it('preserves other configured MCP servers untouched', () => {
    const cfgPath = writeMcpConfig(dest, {
      mcpServers: {
        squad_state: {
          command: 'npx',
          args: ['-y', '@bradygaster/squad-cli', 'state-mcp'],
        },
        'EXAMPLE-github': {
          command: 'npx',
          args: ['-y', '@anthropic/github-mcp-server'],
          env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
        },
      },
    });

    ensureSquadStateMcpPinned(dest, '0.9.6-preview.1');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    expect(cfg.mcpServers['EXAMPLE-github']).toEqual({
      command: 'npx',
      args: ['-y', '@anthropic/github-mcp-server'],
      env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
    });
  });

  it('does nothing when no mcp-config.json exists', () => {
    const changed = ensureSquadStateMcpPinned(dest, '0.9.6-preview.1');
    expect(changed).toBe(false);
  });

  it('inserts squad_state entry when missing (e.g. pre-existing mcp-config from another tool)', () => {
    const cfgPath = writeMcpConfig(dest, { mcpServers: { 'EXAMPLE-github': { command: 'npx', args: ['-y', 'x'] } } });
    const changed = ensureSquadStateMcpPinned(dest, '0.9.6-preview.1');
    expect(changed).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    expect(cfg.mcpServers.squad_state).toEqual({
      command: 'npx',
      args: ['-y', '@bradygaster/squad-cli@0.9.6-preview.1', 'state-mcp'],
    });
    // Other servers preserved
    expect(cfg.mcpServers['EXAMPLE-github']).toEqual({ command: 'npx', args: ['-y', 'x'] });
  });

  it('inserts squad_state into a config with no mcpServers key at all', () => {
    const cfgPath = writeMcpConfig(dest, {});
    const changed = ensureSquadStateMcpPinned(dest, '0.9.6-preview.1');
    expect(changed).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    expect(cfg.mcpServers.squad_state.args[1]).toBe('@bradygaster/squad-cli@0.9.6-preview.1');
  });

  it('does nothing when version is unknown (0.0.0)', () => {
    writeMcpConfig(dest, {
      mcpServers: {
        squad_state: {
          command: 'npx',
          args: ['-y', '@bradygaster/squad-cli', 'state-mcp'],
        },
      },
    });
    const changed = ensureSquadStateMcpPinned(dest, '0.0.0');
    expect(changed).toBe(false);
  });
});
