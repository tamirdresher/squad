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

  it('roundInProgress flag prevents overlapping rounds', async () => {
    // Simulate the guard logic used in runWatch's setInterval callback.
    // Verifies that a second "tick" while the first is still in flight is
    // a no-op and does not increment the counter a second time.
    let callCount = 0;
    let roundInProgress = false;

    const tick = async () => {
      if (roundInProgress) return;
      roundInProgress = true;
      try {
        callCount++;
        // Simulate slow async work
        await new Promise<void>(r => setTimeout(r, 20));
      } finally {
        roundInProgress = false;
      }
    };

    // Fire two ticks concurrently — only the first should execute the body
    await Promise.all([tick(), tick()]);
    expect(callCount).toBe(1);
  });

  it('roundInProgress resets to false after a round throws', async () => {
    // Verifies the finally block in the setInterval callback properly
    // releases the lock even when executeRound throws.
    let roundInProgress = false;

    const tick = async () => {
      if (roundInProgress) return;
      roundInProgress = true;
      try {
        throw new Error('Simulated round failure');
      } finally {
        roundInProgress = false;
      }
    };

    await expect(tick()).rejects.toThrow('Simulated round failure');
    // Lock must be released so subsequent rounds can run
    expect(roundInProgress).toBe(false);

    // Confirm next round proceeds normally
    let nextRanCount = 0;
    const tick2 = async () => {
      if (roundInProgress) return;
      roundInProgress = true;
      try { nextRanCount++; } finally { roundInProgress = false; }
    };
    await tick2();
    expect(nextRanCount).toBe(1);
  });

  it('rate limit interaction: getTrafficLight + shouldProceed block lower-priority agents on amber', async () => {
    const { getTrafficLight, shouldProceed } = await import('@bradygaster/squad-sdk/ralph/rate-limiting');
    // 10% remaining → amber
    const light = getTrafficLight(100, 1000);
    expect(light).toBe('amber');
    // P0 (Lead) allowed, P1+ blocked
    expect(shouldProceed(light, 0)).toBe(true);
    expect(shouldProceed(light, 1)).toBe(false);
    expect(shouldProceed(light, 2)).toBe(false);
  });

  it('rate limit interaction: getTrafficLight returns red at 0 remaining', async () => {
    const { getTrafficLight, shouldProceed } = await import('@bradygaster/squad-sdk/ralph/rate-limiting');
    const light = getTrafficLight(0, 5000);
    expect(light).toBe('red');
    // All agents blocked
    expect(shouldProceed(light, 0)).toBe(false);
    expect(shouldProceed(light, 1)).toBe(false);
    expect(shouldProceed(light, 2)).toBe(false);
  });

  it('PredictiveCircuitBreaker stays closed with no samples', async () => {
    const { PredictiveCircuitBreaker } = await import('@bradygaster/squad-sdk/ralph/rate-limiting');
    const pcb = new PredictiveCircuitBreaker({ maxSamples: 5, warningThresholdSeconds: 120 });
    expect(pcb.shouldOpen()).toBe(false);
    expect(pcb.predictExhaustion()).toBeNull();
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