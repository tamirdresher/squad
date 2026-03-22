/**
 * Watch Command Rate Limiting Integration Tests
 *
 * Tests the circuit breaker integration in watch.ts and
 * the rate limit utilities in gh-cli.ts.
 */

import { describe, it, expect } from 'vitest';

describe('CLI: watch command rate limiting', () => {
  it('module exports reportBoard with optional light parameter', async () => {
    const mod = await import('@bradygaster/squad-cli/commands/watch');
    expect(typeof mod.reportBoard).toBe('function');
    // reportBoard should accept 2 or 3 args (state, round, light?)
    expect(mod.reportBoard.length).toBeGreaterThanOrEqual(2);
  });

  it('reportBoard handles all board states without crashing', async () => {
    const { reportBoard } = await import('@bradygaster/squad-cli/commands/watch');
    const state = {
      untriaged: 3,
      assigned: 2,
      drafts: 1,
      needsReview: 1,
      changesRequested: 0,
      ciFailures: 0,
      readyToMerge: 1,
    };
    // Should not throw
    expect(() => reportBoard(state, 1)).not.toThrow();
    expect(() => reportBoard(state, 2, 'green')).not.toThrow();
    expect(() => reportBoard(state, 3, 'amber')).not.toThrow();
    expect(() => reportBoard(state, 4, 'red')).not.toThrow();
  });

  it('reportBoard handles empty state', async () => {
    const { reportBoard } = await import('@bradygaster/squad-cli/commands/watch');
    const empty = {
      untriaged: 0,
      assigned: 0,
      drafts: 0,
      needsReview: 0,
      changesRequested: 0,
      ciFailures: 0,
      readyToMerge: 0,
    };
    expect(() => reportBoard(empty, 1, 'green')).not.toThrow();
  });
});

describe('gh-cli: rate limit utilities', () => {
  it('exports isRateLimitError function', async () => {
    const mod = await import('@bradygaster/squad-cli/core/gh-cli');
    expect(typeof mod.isRateLimitError).toBe('function');
  });

  it('isRateLimitError detects 429 errors', async () => {
    const { isRateLimitError } = await import('@bradygaster/squad-cli/core/gh-cli');
    expect(isRateLimitError(new Error('HTTP 429: rate limit exceeded'))).toBe(true);
    expect(isRateLimitError(new Error('API rate limit exceeded'))).toBe(true);
    expect(isRateLimitError(new Error('secondary rate limit hit'))).toBe(true);
    expect(isRateLimitError(new Error('You have exceeded a secondary rate limit'))).toBe(true);
  });

  it('isRateLimitError rejects non-rate-limit errors', async () => {
    const { isRateLimitError } = await import('@bradygaster/squad-cli/core/gh-cli');
    expect(isRateLimitError(new Error('Not found'))).toBe(false);
    expect(isRateLimitError(new Error('Network timeout'))).toBe(false);
    expect(isRateLimitError(new Error('Permission denied'))).toBe(false);
  });

  it('exports ghRateLimitCheck function', async () => {
    const mod = await import('@bradygaster/squad-cli/core/gh-cli');
    expect(typeof mod.ghRateLimitCheck).toBe('function');
  });
});