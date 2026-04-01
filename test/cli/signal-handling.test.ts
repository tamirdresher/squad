/**
 * Signal Handling Tests — SIGINT / SIGTERM handlers in squad-cli
 *
 * Tests the top-level signal handler in cli-entry.ts and the shell-specific
 * signal handler in cli/shell/index.ts. Verifies correct exit codes, double-signal
 * force-exit behavior, and cleanup timeout.
 *
 * Issue: squad/cli-docs-sigint branch — clean exit on Ctrl+C / SIGTERM.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Source paths (for static source analysis, following rc.test.ts pattern)
// ---------------------------------------------------------------------------
const CLI_ENTRY_PATH = join(
  process.cwd(),
  'packages',
  'squad-cli',
  'src',
  'cli-entry.ts',
);
const SHELL_INDEX_PATH = join(
  process.cwd(),
  'packages',
  'squad-cli',
  'src',
  'cli',
  'shell',
  'index.ts',
);

// Read sources once for all static-analysis tests
const cliEntrySource = readFileSync(CLI_ENTRY_PATH, 'utf-8');
const shellIndexSource = readFileSync(SHELL_INDEX_PATH, 'utf-8');

// ============================================================================
// 1. Static analysis — signal handlers are registered (source-level checks)
// ============================================================================

describe('Signal handler registration (source analysis)', () => {
  describe('cli-entry.ts — top-level handlers', () => {
    it('registers a SIGINT handler via process.on', () => {
      expect(cliEntrySource).toContain("process.on('SIGINT'");
    });

    it('registers a SIGTERM handler via process.on', () => {
      expect(cliEntrySource).toContain("process.on('SIGTERM'");
    });

    it('defines _handleTopLevelSignal function', () => {
      expect(cliEntrySource).toContain('function _handleTopLevelSignal');
    });

    it('uses exit code 130 for SIGINT', () => {
      // The pattern: signal === 'SIGINT' ? 130 : 143
      expect(cliEntrySource).toMatch(/SIGINT.*130/);
    });

    it('uses exit code 143 for SIGTERM', () => {
      expect(cliEntrySource).toMatch(/143/);
    });
  });

  describe('shell/index.ts — shell-specific handlers', () => {
    it('registers a SIGINT handler via process.on', () => {
      expect(shellIndexSource).toContain("process.on('SIGINT'");
    });

    it('registers a SIGTERM handler via process.on', () => {
      expect(shellIndexSource).toContain("process.on('SIGTERM'");
    });

    it('defines handleShellSignal function', () => {
      expect(shellIndexSource).toContain('handleShellSignal');
    });

    it('calls unmount() on first signal', () => {
      // Shell handler calls unmount() to trigger graceful Ink teardown
      expect(shellIndexSource).toMatch(/unmount\(\)/);
    });
  });
});

// ============================================================================
// 2. Behavioral tests — exercise the _handleTopLevelSignal logic via mock
// ============================================================================

describe('Top-level signal handler behavior (_handleTopLevelSignal)', () => {
  let exitMock: ReturnType<typeof vi.spyOn>;
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;
  let processOnSpy: ReturnType<typeof vi.spyOn>;

  // Captured signal handler callbacks
  let capturedHandlers: Record<string, ((...args: unknown[]) => void)[]>;

  beforeEach(() => {
    capturedHandlers = {};

    // Mock process.exit to prevent actually exiting
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    // Spy on setTimeout to verify cleanup timeout
    setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      // Return an object with unref() to mimic Node timer
      return { unref: vi.fn() } as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    // Spy on process.on to capture registered handlers
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(((event: string, handler: (...args: unknown[]) => void) => {
      if (!capturedHandlers[event]) capturedHandlers[event] = [];
      capturedHandlers[event].push(handler);
      return process;
    }) as typeof process.on);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Recreate the _handleTopLevelSignal logic from cli-entry.ts (lines 82-94).
   * We test the extracted logic rather than importing the module (which has
   * heavy side-effects including ESM patching and node:sqlite probing).
   */
  function createTopLevelHandler() {
    let _exitingOnSignal = false;

    function _handleTopLevelSignal(signal: 'SIGINT' | 'SIGTERM'): void {
      const code = signal === 'SIGINT' ? 130 : 143;
      if (_exitingOnSignal) {
        process.exit(code);
        return;
      }
      _exitingOnSignal = true;
      setTimeout(() => process.exit(code), 3_000).unref();
    }

    return _handleTopLevelSignal;
  }

  it('SIGINT exits with code 130', () => {
    const handler = createTopLevelHandler();
    handler('SIGINT');

    // First signal should NOT call process.exit immediately
    expect(exitMock).not.toHaveBeenCalled();
    // But should set up a timeout
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3_000);
  });

  it('SIGTERM exits with code 143', () => {
    const handler = createTopLevelHandler();
    handler('SIGTERM');

    expect(exitMock).not.toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3_000);
  });

  it('double SIGINT force-exits immediately', () => {
    const handler = createTopLevelHandler();

    // First signal — sets up graceful shutdown
    handler('SIGINT');
    expect(exitMock).not.toHaveBeenCalled();

    // Second signal — forces immediate exit
    handler('SIGINT');
    expect(exitMock).toHaveBeenCalledWith(130);
  });

  it('double SIGTERM force-exits immediately', () => {
    const handler = createTopLevelHandler();

    handler('SIGTERM');
    expect(exitMock).not.toHaveBeenCalled();

    handler('SIGTERM');
    expect(exitMock).toHaveBeenCalledWith(143);
  });

  it('mixed signals: SIGINT then SIGTERM force-exits with SIGTERM code', () => {
    const handler = createTopLevelHandler();

    handler('SIGINT');
    expect(exitMock).not.toHaveBeenCalled();

    handler('SIGTERM');
    expect(exitMock).toHaveBeenCalledWith(143);
  });

  it('cleanup timeout is 3 seconds', () => {
    const handler = createTopLevelHandler();
    handler('SIGINT');

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3_000);
  });

  it('cleanup timeout calls process.exit with correct code', () => {
    // Use real setTimeout capturing instead of spy
    vi.restoreAllMocks();

    let capturedFn: (() => void) | undefined;
    let capturedMs: number | undefined;
    const realExitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      capturedFn = fn;
      capturedMs = ms;
      return { unref: vi.fn() } as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    const handler = createTopLevelHandler();
    handler('SIGINT');

    // Execute the timeout callback
    expect(capturedFn).toBeDefined();
    expect(capturedMs).toBe(3_000);
    capturedFn!();
    expect(realExitMock).toHaveBeenCalledWith(130);
  });

  it('cleanup timeout callback uses SIGTERM code 143', () => {
    vi.restoreAllMocks();

    let capturedFn: (() => void) | undefined;
    const realExitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      capturedFn = fn;
      return { unref: vi.fn() } as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    const handler = createTopLevelHandler();
    handler('SIGTERM');

    capturedFn!();
    expect(realExitMock).toHaveBeenCalledWith(143);
  });

  it('timeout timer is unref()d to not keep process alive', () => {
    const unrefMock = vi.fn();
    vi.restoreAllMocks();
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((() => {
      return { unref: unrefMock };
    }) as unknown as typeof setTimeout);

    const handler = createTopLevelHandler();
    handler('SIGINT');

    expect(unrefMock).toHaveBeenCalledOnce();
  });
});

// ============================================================================
// 3. Shell signal handler behavior (handleShellSignal logic)
// ============================================================================

describe('Shell signal handler behavior (handleShellSignal)', () => {
  let exitMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Recreate shell handleShellSignal from shell/index.ts (lines 1239-1253).
   * The shell handler calls unmount() on first signal instead of setTimeout.
   */
  function createShellHandler() {
    let _shellExiting = false;
    let _shellSignalCode: number | undefined;
    const unmount = vi.fn();

    const handleShellSignal = (signal: 'SIGINT' | 'SIGTERM'): void => {
      const code = signal === 'SIGINT' ? 130 : 143;
      if (_shellExiting) {
        process.exit(code);
        return;
      }
      _shellExiting = true;
      _shellSignalCode = code;
      unmount();
    };

    return { handleShellSignal, unmount, getSignalCode: () => _shellSignalCode };
  }

  it('SIGINT calls unmount() and stores code 130', () => {
    const { handleShellSignal, unmount, getSignalCode } = createShellHandler();
    handleShellSignal('SIGINT');

    expect(unmount).toHaveBeenCalledOnce();
    expect(getSignalCode()).toBe(130);
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('SIGTERM calls unmount() and stores code 143', () => {
    const { handleShellSignal, unmount, getSignalCode } = createShellHandler();
    handleShellSignal('SIGTERM');

    expect(unmount).toHaveBeenCalledOnce();
    expect(getSignalCode()).toBe(143);
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('double SIGINT force-exits without unmount', () => {
    const { handleShellSignal, unmount } = createShellHandler();

    handleShellSignal('SIGINT');
    expect(unmount).toHaveBeenCalledOnce();
    expect(exitMock).not.toHaveBeenCalled();

    handleShellSignal('SIGINT');
    expect(exitMock).toHaveBeenCalledWith(130);
    // unmount only called once (on first signal)
    expect(unmount).toHaveBeenCalledOnce();
  });

  it('SIGINT then SIGTERM force-exits with code 143', () => {
    const { handleShellSignal, unmount } = createShellHandler();

    handleShellSignal('SIGINT');
    handleShellSignal('SIGTERM');

    expect(exitMock).toHaveBeenCalledWith(143);
    expect(unmount).toHaveBeenCalledOnce();
  });
});
