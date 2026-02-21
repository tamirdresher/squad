/**
 * Tests for resolveSquad() and resolveGlobalSquadPath()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { resolveSquad, resolveGlobalSquadPath } from '../src/resolution.js';

const TMP = join(process.cwd(), `.test-resolution-${randomBytes(4).toString('hex')}`);

function scaffold(...dirs: string[]): void {
  for (const d of dirs) {
    mkdirSync(join(TMP, d), { recursive: true });
  }
}

describe('resolveSquad()', () => {
  beforeEach(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('returns path when .squad/ exists at startDir', () => {
    scaffold('.git', '.squad');
    expect(resolveSquad(TMP)).toBe(join(TMP, '.squad'));
  });

  it('returns null when no .squad/ exists and .git is at startDir', () => {
    scaffold('.git');
    expect(resolveSquad(TMP)).toBeNull();
  });

  it('walks up and finds .squad/ in parent', () => {
    scaffold('.git', '.squad', 'packages', 'packages/app');
    expect(resolveSquad(join(TMP, 'packages', 'app'))).toBe(join(TMP, '.squad'));
  });

  it('stops at .git boundary and does not walk above repo root', () => {
    // outer has .squad, inner is its own repo without .squad
    scaffold('outer/.squad', 'outer/inner/.git');
    expect(resolveSquad(join(TMP, 'outer', 'inner'))).toBeNull();
  });

  it('handles .git worktree file (not directory)', () => {
    scaffold('repo');
    // .git as a file (worktree pointer)
    writeFileSync(join(TMP, 'repo', '.git'), 'gitdir: /somewhere/.git/worktrees/repo');
    mkdirSync(join(TMP, 'repo', 'src'), { recursive: true });
    expect(resolveSquad(join(TMP, 'repo', 'src'))).toBeNull();
  });

  it('finds .squad in worktree that has it', () => {
    scaffold('repo/.squad', 'repo/src');
    writeFileSync(join(TMP, 'repo', '.git'), 'gitdir: /somewhere/.git/worktrees/repo');
    expect(resolveSquad(join(TMP, 'repo', 'src'))).toBe(join(TMP, 'repo', '.squad'));
  });

  it('defaults to cwd when no argument given', () => {
    // Just verify it doesn't throw
    const result = resolveSquad();
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('finds .squad/ at root from a deeply nested directory (3+ levels)', () => {
    scaffold('.git', '.squad', 'a/b/c/d');
    expect(resolveSquad(join(TMP, 'a', 'b', 'c', 'd'))).toBe(join(TMP, '.squad'));
  });

  it('finds the nearest .squad/ when multiple exist', () => {
    scaffold('.git', '.squad', 'packages/.squad', 'packages/app');
    // Starting from packages/app, the nearest .squad/ is packages/.squad
    expect(resolveSquad(join(TMP, 'packages', 'app'))).toBe(join(TMP, 'packages', '.squad'));
  });

  it('finds root .squad/ when no closer one exists', () => {
    scaffold('.git', '.squad', 'packages/app/src');
    expect(resolveSquad(join(TMP, 'packages', 'app', 'src'))).toBe(join(TMP, '.squad'));
  });

  it('follows symlinked .squad/ directory', function () {
    if (process.platform === 'win32') {
      // Symlinks on Windows require elevated privileges
      return;
    }
    const { symlinkSync } = require('node:fs') as typeof import('node:fs');
    scaffold('.git', 'real-squad', 'project/src');
    symlinkSync(join(TMP, 'real-squad'), join(TMP, 'project', '.squad'));
    expect(resolveSquad(join(TMP, 'project', 'src'))).toBe(join(TMP, 'project', '.squad'));
  });
});

describe('resolveGlobalSquadPath()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a string path', () => {
    const result = resolveGlobalSquadPath();
    expect(typeof result).toBe('string');
    expect(result.endsWith('squad')).toBe(true);
  });

  it('creates the directory if missing', () => {
    const result = resolveGlobalSquadPath();
    expect(existsSync(result)).toBe(true);
  });

  it('respects XDG_CONFIG_HOME on Linux', () => {
    if (process.platform === 'win32' || process.platform === 'darwin') return;

    const customXdg = join(TMP, 'xdg');
    mkdirSync(customXdg, { recursive: true });

    vi.stubEnv('XDG_CONFIG_HOME', customXdg);
    const result = resolveGlobalSquadPath();
    expect(result).toBe(join(customXdg, 'squad'));
    expect(existsSync(result)).toBe(true);
  });
});
