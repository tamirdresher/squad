/**
 * Tests for `squad run-copilot` wrapper subcommand (iter-5).
 *
 * The wrapper exists because Copilot CLI 1.0.58 ignores project-level
 * `.copilot/mcp-config.json`. Without it the canonical end-user invocation
 * leaves the `squad_state` MCP server unwired. See
 * `.squad/files/validation/ALIAS-EXPERIMENT-VERDICT.md`.
 */

import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import {
  buildRunCopilotArgs,
  runRunCopilot,
} from '../packages/squad-cli/src/cli/commands/run-copilot.js';

function makeTempProject(withMcpConfig: boolean): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'squad-runcopilot-'));
  if (withMcpConfig) {
    mkdirSync(path.join(root, '.copilot'), { recursive: true });
    writeFileSync(
      path.join(root, '.copilot', 'mcp-config.json'),
      JSON.stringify({ mcpServers: {} }),
    );
  }
  return root;
}

describe('buildRunCopilotArgs (iter-5: project mcp-config injection)', () => {
  it('injects --additional-mcp-config when .copilot/mcp-config.json exists', () => {
    const root = makeTempProject(true);
    try {
      const args = buildRunCopilotArgs(root, ['--yolo', '--agent', 'squad', '-p', 'hello']);
      expect(args[0]).toBe('--additional-mcp-config');
      expect(args[1]).toBe(`@${path.join(root, '.copilot', 'mcp-config.json')}`);
      // user args preserved in order after the injection
      expect(args.slice(2)).toEqual(['--yolo', '--agent', 'squad', '-p', 'hello']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('passes user args through unchanged when project mcp-config is missing', () => {
    const root = makeTempProject(false);
    try {
      const userArgs = ['--yolo', '-p', 'noop'];
      const args = buildRunCopilotArgs(root, userArgs);
      expect(args).toEqual(userArgs);
      // ensure no injection sneaks in
      expect(args).not.toContain('--additional-mcp-config');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('handles empty user args gracefully when config exists', () => {
    const root = makeTempProject(true);
    try {
      const args = buildRunCopilotArgs(root, []);
      expect(args).toEqual([
        '--additional-mcp-config',
        `@${path.join(root, '.copilot', 'mcp-config.json')}`,
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('runRunCopilot (iter-5: subprocess wiring)', () => {
  it('spawns copilot with the augmented argv and resolves with the exit code', async () => {
    const root = makeTempProject(true);
    try {
      let capturedArgs: string[] | undefined;
      let capturedCmd: string | undefined;
      const fakeChild = new EventEmitter() as EventEmitter & { kill?: () => void };
      const spawnImpl = vi.fn((cmd: string, args: string[]) => {
        capturedCmd = cmd;
        capturedArgs = args;
        // emit exit asynchronously to mimic spawn semantics
        setImmediate(() => fakeChild.emit('exit', 0, null));
        return fakeChild as never;
      });

      const code = await runRunCopilot(root, ['--yolo'], {
        spawnImpl: spawnImpl as never,
        copilotBin: 'copilot',
      });

      expect(code).toBe(0);
      expect(capturedCmd).toBe('copilot');
      expect(capturedArgs?.[0]).toBe('--additional-mcp-config');
      expect(capturedArgs?.[capturedArgs.length - 1]).toBe('--yolo');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('propagates non-zero exit codes from the child copilot process', async () => {
    const root = makeTempProject(false);
    try {
      const fakeChild = new EventEmitter();
      const spawnImpl = vi.fn(() => {
        setImmediate(() => fakeChild.emit('exit', 42, null));
        return fakeChild as never;
      });

      const code = await runRunCopilot(root, ['--noop'], {
        spawnImpl: spawnImpl as never,
        copilotBin: 'copilot',
      });

      expect(code).toBe(42);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
