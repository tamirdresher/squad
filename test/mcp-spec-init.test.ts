/**
 * Tests for the iter-5 mcp-spec extraction.
 *
 * Verifies that `resolveSquadStateMcpSpec` (extracted from upgrade.ts to a
 * shared module) still:
 *  - Returns the pinned version spec when the version is published on npm
 *  - Falls back to `@insider` when the version is unpublished (E404)
 *  - Falls back to `@insider` for the placeholder `0.0.0` version
 *
 * Also asserts that init.ts now imports and calls it (architectural check
 * for the INIT-vs-UPGRADE asymmetry fix surfaced in
 * `.squad/files/validation/REVAL-ITER4-multiplayer-sudoku.md`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock(
  '../packages/squad-cli/src/cli/core/npm-registry.js',
  () => ({
    isSquadCliVersionPublished: vi.fn(),
  }),
);

import { resolveSquadStateMcpSpec } from '../packages/squad-cli/src/cli/core/mcp-spec.js';
import { isSquadCliVersionPublished } from '../packages/squad-cli/src/cli/core/npm-registry.js';

const mockIsPublished = vi.mocked(isSquadCliVersionPublished);

describe('resolveSquadStateMcpSpec (iter-5: shared between init + upgrade)', () => {
  beforeEach(() => {
    mockIsPublished.mockReset();
  });

  it('returns the pinned version spec when the version is published', async () => {
    mockIsPublished.mockResolvedValue(true);
    const spec = await resolveSquadStateMcpSpec('0.9.6-preview.42');
    expect(spec).toBe('@bradygaster/squad-cli@0.9.6-preview.42');
  });

  it('falls back to @insider when the version is NOT published on npm', async () => {
    mockIsPublished.mockResolvedValue(false);
    const spec = await resolveSquadStateMcpSpec('0.9.6-preview.99999');
    expect(spec).toBe('@bradygaster/squad-cli@insider');
  });

  it('short-circuits to @insider for the placeholder 0.0.0 version', async () => {
    const spec = await resolveSquadStateMcpSpec('0.0.0');
    expect(spec).toBe('@bradygaster/squad-cli@insider');
    expect(mockIsPublished).not.toHaveBeenCalled();
  });

  it('short-circuits to @insider for empty version string', async () => {
    const spec = await resolveSquadStateMcpSpec('');
    expect(spec).toBe('@bradygaster/squad-cli@insider');
    expect(mockIsPublished).not.toHaveBeenCalled();
  });
});

describe('init.ts uses resolveSquadStateMcpSpec (asymmetry fix)', () => {
  // Source-level architectural check: init.ts must reference the shared
  // resolver to keep the npm-registry fallback consistent with upgrade.ts.
  it('packages/squad-cli/src/cli/core/init.ts imports and calls resolveSquadStateMcpSpec', () => {
    const initPath = path.join(
      process.cwd(),
      'packages',
      'squad-cli',
      'src',
      'cli',
      'core',
      'init.ts',
    );
    const src = readFileSync(initPath, 'utf-8');
    expect(src).toMatch(/resolveSquadStateMcpSpec/);
    expect(src).toMatch(/from ['"]\.\/mcp-spec\.js['"]/);
  });

  it('upgrade.ts re-exports resolveSquadStateMcpSpec from mcp-spec (compat)', () => {
    const upgradePath = path.join(
      process.cwd(),
      'packages',
      'squad-cli',
      'src',
      'cli',
      'core',
      'upgrade.ts',
    );
    const src = readFileSync(upgradePath, 'utf-8');
    expect(src).toMatch(/from ['"]\.\/mcp-spec\.js['"]/);
  });
});
