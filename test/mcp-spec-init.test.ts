/**
 * Tests for the mcp-spec helper.
 *
 * Iter-5 introduced the shared `resolveSquadStateMcpSpec` so init.ts and
 * upgrade.ts agree on the runtime-MCP fallback behavior. Iter-6 extends it
 * to return a full SquadStateMcpSpec (command + args + source) and to fall
 * back to the locally-installed package when neither the pinned version nor
 * the @insider dist-tag is published — required for in-flight preview
 * validation (smoke data-27 / data-28).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

vi.mock(
  '../packages/squad-cli/src/cli/core/npm-registry.js',
  () => ({
    isSquadCliVersionPublished: vi.fn(),
  }),
);

import {
  resolveSquadStateMcpSpec,
  _resetMcpSpecCache,
} from '../packages/squad-cli/src/cli/core/mcp-spec.js';
import { isSquadCliVersionPublished } from '../packages/squad-cli/src/cli/core/npm-registry.js';

const mockIsPublished = vi.mocked(isSquadCliVersionPublished);

describe('resolveSquadStateMcpSpec (iter-6: returns full SquadStateMcpSpec)', () => {
  beforeEach(() => {
    mockIsPublished.mockReset();
    _resetMcpSpecCache();
  });

  it('returns a pinned npx spec when the version is published on npm', async () => {
    mockIsPublished.mockResolvedValue(true);
    const spec = await resolveSquadStateMcpSpec('0.9.6-preview.42', {
      insiderAvailabilityProbe: async () => false,
      localPackageResolver: () => null,
    });
    expect(spec.source).toBe('pinned');
    expect(spec.command).toBe('npx');
    expect(spec.args).toEqual([
      '-y',
      '@bradygaster/squad-cli@0.9.6-preview.42',
      'state-mcp',
    ]);
  });

  it('falls back to @insider when the version is NOT published but @insider IS', async () => {
    mockIsPublished.mockResolvedValue(false);
    const spec = await resolveSquadStateMcpSpec('0.9.6-preview.99999', {
      insiderAvailabilityProbe: async () => true,
      localPackageResolver: () => null,
    });
    expect(spec.source).toBe('insider');
    expect(spec.command).toBe('npx');
    expect(spec.args).toEqual(['-y', '@bradygaster/squad-cli@insider', 'state-mcp']);
  });

  it('falls back to local install when neither pinned version nor @insider is published', async () => {
    mockIsPublished.mockResolvedValue(false);
    // Create a fake on-disk cli-entry so existsSync passes.
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'squad-mcp-local-'));
    try {
      const fakeEntry = path.join(tmp, 'dist', 'cli-entry.js');
      mkdirSync(path.dirname(fakeEntry), { recursive: true });
      writeFileSync(fakeEntry, '// stub');

      const spec = await resolveSquadStateMcpSpec('0.9.6-preview.99999', {
        insiderAvailabilityProbe: async () => false,
        localPackageResolver: () => fakeEntry,
      });
      expect(spec.source).toBe('local');
      // command must be an absolute node path so MCP loader can exec directly.
      expect(spec.command).toBe(process.execPath);
      expect(spec.args).toEqual([fakeEntry, 'state-mcp']);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('throws a clear error when all three branches fail', async () => {
    mockIsPublished.mockResolvedValue(false);
    await expect(
      resolveSquadStateMcpSpec('0.9.6-preview.99999', {
        insiderAvailabilityProbe: async () => false,
        localPackageResolver: () => null,
      }),
    ).rejects.toThrow(/Unable to resolve squad_state MCP launch spec/);
  });

  it('does not return a local spec when the resolver returns a path that does not exist', async () => {
    mockIsPublished.mockResolvedValue(false);
    await expect(
      resolveSquadStateMcpSpec('0.9.6-preview.99999', {
        insiderAvailabilityProbe: async () => false,
        localPackageResolver: () => path.join(os.tmpdir(), 'definitely-does-not-exist-12345', 'cli-entry.js'),
      }),
    ).rejects.toThrow(/Unable to resolve/);
  });

  it('short-circuits the registry HEAD check for the placeholder 0.0.0 version (still falls back)', async () => {
    const spec = await resolveSquadStateMcpSpec('0.0.0', {
      insiderAvailabilityProbe: async () => true,
      localPackageResolver: () => null,
    });
    expect(mockIsPublished).not.toHaveBeenCalled();
    expect(spec.source).toBe('insider');
  });

  it('short-circuits the registry HEAD check for empty version (still falls back)', async () => {
    const spec = await resolveSquadStateMcpSpec('', {
      insiderAvailabilityProbe: async () => true,
      localPackageResolver: () => null,
    });
    expect(mockIsPublished).not.toHaveBeenCalled();
    expect(spec.source).toBe('insider');
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
