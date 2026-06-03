/**
 * iter-7 tests for the HOME-level squad_state MCP writer + project tombstone.
 *
 * Validates:
 *   - Stable 8-char per-project hash key.
 *   - Existing HOME mcp-config entries preserved byte-for-byte.
 *   - Missing HOME mcp-config is created (and is valid JSON).
 *   - Malformed HOME mcp-config throws rather than silently overwriting.
 *   - Idempotency: re-writing the same spec is a no-op.
 *   - Tombstone removes only `squad_state` and preserves siblings.
 *   - Tombstone is a no-op when project mcp-config has no `squad_state`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  projectMcpHash,
  ensureSquadStateMcpInHome,
  tombstoneProjectSquadStateMcp,
  getHomeMcpConfigPath,
} from '../packages/squad-cli/src/cli/core/mcp-home.js';
import type { SquadStateMcpSpec } from '../packages/squad-cli/src/cli/core/mcp-spec.js';

const PINNED_SPEC: SquadStateMcpSpec = {
  source: 'pinned',
  command: 'npx',
  args: ['-y', '@bradygaster/squad-cli@0.9.6-preview.13', 'state-mcp'],
};

const INSIDER_SPEC: SquadStateMcpSpec = {
  source: 'insider',
  command: 'npx',
  args: ['-y', '@bradygaster/squad-cli@insider', 'state-mcp'],
};

describe('iter-7 mcp-home: per-project HOME-write + project tombstone', () => {
  let tmpHome: string;
  let tmpProject: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-home-'));
    tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-proj-'));
    process.env.SQUAD_HOME_DIR_OVERRIDE = tmpHome;
  });

  afterEach(() => {
    delete process.env.SQUAD_HOME_DIR_OVERRIDE;
    fs.rmSync(tmpHome, { recursive: true, force: true });
    fs.rmSync(tmpProject, { recursive: true, force: true });
  });

  it('produces a stable 8-character hex hash for the same project path', () => {
    const h1 = projectMcpHash(tmpProject);
    const h2 = projectMcpHash(tmpProject);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{8}$/);
  });

  it('produces different hashes for different project paths', () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-other-'));
    try {
      expect(projectMcpHash(tmpProject)).not.toBe(projectMcpHash(other));
    } finally {
      fs.rmSync(other, { recursive: true, force: true });
    }
  });

  it('creates ~/.copilot/mcp-config.json when missing', () => {
    const result = ensureSquadStateMcpInHome(tmpProject, '0.9.6-preview.13', PINNED_SPEC);
    expect(result.written).toBe(true);
    expect(result.key).toMatch(/^squad_state_[0-9a-f]{8}$/);
    expect(result.path).toBe(getHomeMcpConfigPath());

    const raw = fs.readFileSync(result.path, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers[result.key]).toEqual({
      command: 'npx',
      args: ['-y', '@bradygaster/squad-cli@0.9.6-preview.13', 'state-mcp'],
    });
  });

  it('preserves existing user-configured MCP servers in HOME', () => {
    const cfgPath = getHomeMcpConfigPath();
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fs.writeFileSync(
      cfgPath,
      JSON.stringify(
        {
          mcpServers: {
            'user-server': { command: 'node', args: ['my-mcp.js'] },
            'github-mcp': { command: 'docker', args: ['run', 'gh-mcp'] },
          },
        },
        null,
        2,
      ) + '\n',
    );

    ensureSquadStateMcpInHome(tmpProject, '0.9.6-preview.13', PINNED_SPEC);

    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    expect(parsed.mcpServers['user-server']).toEqual({ command: 'node', args: ['my-mcp.js'] });
    expect(parsed.mcpServers['github-mcp']).toEqual({ command: 'docker', args: ['run', 'gh-mcp'] });
    expect(parsed.mcpServers[`squad_state_${projectMcpHash(tmpProject)}`]).toBeDefined();
  });

  it('is idempotent: re-writing the same spec returns written=false', () => {
    const first = ensureSquadStateMcpInHome(tmpProject, '0.9.6-preview.13', PINNED_SPEC);
    expect(first.written).toBe(true);
    const second = ensureSquadStateMcpInHome(tmpProject, '0.9.6-preview.13', PINNED_SPEC);
    expect(second.written).toBe(false);
  });

  it('updates when the spec changes (pinned -> insider)', () => {
    ensureSquadStateMcpInHome(tmpProject, '0.9.6-preview.13', PINNED_SPEC);
    const result = ensureSquadStateMcpInHome(tmpProject, '0.9.6-preview.13', INSIDER_SPEC);
    expect(result.written).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(result.path, 'utf-8'));
    expect(parsed.mcpServers[result.key].args).toEqual([
      '-y',
      '@bradygaster/squad-cli@insider',
      'state-mcp',
    ]);
  });

  it('refuses to overwrite a malformed HOME mcp-config (throws)', () => {
    const cfgPath = getHomeMcpConfigPath();
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fs.writeFileSync(cfgPath, '{not valid json');
    expect(() => ensureSquadStateMcpInHome(tmpProject, '0.9.6-preview.13', PINNED_SPEC))
      .toThrow(/Refusing to overwrite malformed/);
  });

  it('refuses to overwrite a HOME mcp-config whose root is not an object', () => {
    const cfgPath = getHomeMcpConfigPath();
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fs.writeFileSync(cfgPath, '["not", "an", "object"]');
    expect(() => ensureSquadStateMcpInHome(tmpProject, '0.9.6-preview.13', PINNED_SPEC))
      .toThrow(/Refusing to overwrite malformed/);
  });

  it('tombstones stale project squad_state and preserves siblings', () => {
    const projCfg = path.join(tmpProject, '.copilot', 'mcp-config.json');
    fs.mkdirSync(path.dirname(projCfg), { recursive: true });
    fs.writeFileSync(
      projCfg,
      JSON.stringify(
        {
          mcpServers: {
            squad_state: { command: 'npx', args: ['-y', 'old', 'state-mcp'] },
            'EXAMPLE-server': { command: 'node', args: ['ex.js'] },
          },
        },
        null,
        2,
      ),
    );

    const result = tombstoneProjectSquadStateMcp(tmpProject);
    expect(result.removed).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(projCfg, 'utf-8'));
    expect(parsed.mcpServers.squad_state).toBeUndefined();
    expect(parsed.mcpServers['EXAMPLE-server']).toEqual({ command: 'node', args: ['ex.js'] });
  });

  it('tombstone is a no-op when project mcp-config has no squad_state', () => {
    const projCfg = path.join(tmpProject, '.copilot', 'mcp-config.json');
    fs.mkdirSync(path.dirname(projCfg), { recursive: true });
    fs.writeFileSync(projCfg, JSON.stringify({ mcpServers: { other: { command: 'x' } } }));
    const result = tombstoneProjectSquadStateMcp(tmpProject);
    expect(result.removed).toBe(false);
  });

  it('tombstone is a no-op when project mcp-config is missing', () => {
    const result = tombstoneProjectSquadStateMcp(tmpProject);
    expect(result.removed).toBe(false);
  });
});
