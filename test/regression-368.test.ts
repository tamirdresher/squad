/**
 * Regression tests: Ghost retry (real timers), error boundaries, ThinkingIndicator integration.
 *
 * Filed as part of #368 stale-test fix sweep.
 * Covers the three biggest regression gaps identified in quality review:
 *   1. Ghost retry under real-ish conditions (not just vi.useFakeTimers)
 *   2. Error handling paths — components receiving unexpected/missing props
 *   3. ThinkingIndicator + animation sequencing
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import {
  withGhostRetry,
} from '../packages/squad-cli/src/cli/shell/index.js';
import {
  ThinkingIndicator,
  THINKING_PHRASES,
} from '../packages/squad-cli/src/cli/shell/components/ThinkingIndicator.js';
import { AgentPanel } from '../packages/squad-cli/src/cli/shell/components/AgentPanel.js';
import { MessageStream } from '../packages/squad-cli/src/cli/shell/components/MessageStream.js';

const h = React.createElement;

// ============================================================================
// 1. Ghost retry — real timer integration
// ============================================================================

describe('Ghost retry — real timer integration', () => {
  it('retries with actual delays (short backoff)', async () => {
    const calls: number[] = [];
    const sendFn = vi.fn(async () => {
      calls.push(Date.now());
      return calls.length < 3 ? '' : 'recovered';
    });

    const result = await withGhostRetry(sendFn, {
      maxRetries: 3,
      backoffMs: [10, 20, 40],
    });

    expect(result).toBe('recovered');
    expect(sendFn).toHaveBeenCalledTimes(3);
    expect(calls[1]! - calls[0]!).toBeGreaterThanOrEqual(5);
    expect(calls[2]! - calls[1]!).toBeGreaterThanOrEqual(10);
  });

  it('calls onRetry with correct attempt numbers under real timers', async () => {
    const onRetry = vi.fn();
    const sendFn = vi.fn()
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('ok');

    await withGhostRetry(sendFn, {
      maxRetries: 3,
      backoffMs: [5, 5, 5],
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, 3);
    expect(onRetry).toHaveBeenCalledWith(2, 3);
  });

  it('calls onExhausted after all retries fail under real timers', async () => {
    const onExhausted = vi.fn();
    const sendFn = vi.fn().mockResolvedValue('');

    const result = await withGhostRetry(sendFn, {
      maxRetries: 2,
      backoffMs: [5, 5],
      onExhausted,
    });

    expect(result).toBe('');
    expect(sendFn).toHaveBeenCalledTimes(3);
    expect(onExhausted).toHaveBeenCalledWith(2);
  });

  it('handles sendFn that throws on some attempts', async () => {
    let attempt = 0;
    const sendFn = vi.fn(async () => {
      attempt++;
      if (attempt === 1) throw new Error('network timeout');
      return 'recovered';
    });

    await expect(withGhostRetry(sendFn, { backoffMs: [5] }))
      .rejects.toThrow('network timeout');
  });

  it('handles sendFn returning falsy values (null, undefined, 0)', async () => {
    const sendFn = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce('finally');

    const result = await withGhostRetry(sendFn, {
      maxRetries: 4,
      backoffMs: [5, 5, 5, 5],
    });

    expect(result).toBe('finally');
    expect(sendFn).toHaveBeenCalledTimes(4);
  });

  it('debugLog receives ghost detection messages', async () => {
    const logs: unknown[][] = [];
    const sendFn = vi.fn()
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('ok');

    await withGhostRetry(sendFn, {
      maxRetries: 2,
      backoffMs: [5],
      debugLog: (...args: unknown[]) => logs.push(args),
      promptPreview: 'What is the build status?',
    });

    expect(logs.length).toBe(1);
    expect(logs[0]![0]).toBe('ghost response detected');
    const meta = logs[0]![1] as Record<string, unknown>;
    expect(meta.attempt).toBe(1);
    expect(meta.promptPreview).toContain('build status');
  });
});

// ============================================================================
// 2. Error handling — components with unexpected props
// ============================================================================

describe('Error handling — component resilience', () => {
  it('AgentPanel handles agents with minimal properties', () => {
    const agents = [
      { name: 'TestAgent', role: '', status: 'idle' as const, startedAt: new Date() },
    ];
    const { lastFrame } = render(h(AgentPanel, { agents }));
    expect(lastFrame()).toBeDefined();
  });

  it('AgentPanel handles agent with empty name', () => {
    const agents = [
      { name: '', role: 'dev', status: 'idle' as const, startedAt: new Date() },
    ];
    const { lastFrame } = render(h(AgentPanel, { agents }));
    expect(lastFrame()).toBeDefined();
  });

  it('MessageStream handles empty messages array', () => {
    const { lastFrame } = render(
      h(MessageStream, { messages: [], processing: false })
    );
    expect(lastFrame()).toBeDefined();
  });

  it('MessageStream handles messages with empty content', () => {
    const messages = [
      { role: 'assistant', content: '' },
      { role: 'user', content: '' },
    ];
    const { lastFrame } = render(
      h(MessageStream, { messages: messages as any, processing: false })
    );
    expect(lastFrame()).toBeDefined();
  });

  it('AgentPanel with many agents renders all names', () => {
    const agents = Array.from({ length: 10 }, (_, i) => ({
      name: `Agent${i}`,
      role: 'dev',
      status: (i % 2 === 0 ? 'idle' : 'working') as 'idle' | 'working',
      startedAt: new Date(),
    }));
    const { lastFrame } = render(h(AgentPanel, { agents }));
    const frame = lastFrame()!;
    expect(frame).toContain('Agent0');
    expect(frame).toContain('Agent9');
  });

  it('ThinkingIndicator handles extreme elapsedMs values', () => {
    const { lastFrame } = render(
      h(ThinkingIndicator, { isThinking: true, elapsedMs: 999999 })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('999s');
  });
});

// ============================================================================
// 3. ThinkingIndicator — animation sequencing
// ============================================================================

describe('ThinkingIndicator — animation sequencing', () => {
  it('returns null when not thinking', () => {
    const { lastFrame } = render(
      h(ThinkingIndicator, { isThinking: false, elapsedMs: 0 })
    );
    expect(lastFrame()!).toBe('');
  });

  it('renders spinner when thinking starts', () => {
    const { lastFrame } = render(
      h(ThinkingIndicator, { isThinking: true, elapsedMs: 0 })
    );
    const frame = lastFrame()!;
    expect(frame.length).toBeGreaterThan(0);
  });

  it('shows Thinking label by default', () => {
    process.env.NO_COLOR = '1';
    const { lastFrame } = render(
      h(ThinkingIndicator, { isThinking: true, elapsedMs: 0 })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('Thinking...');
    delete process.env.NO_COLOR;
  });

  it('shows activity hint when provided', () => {
    const { lastFrame } = render(
      h(ThinkingIndicator, { isThinking: true, elapsedMs: 0, activityHint: 'Searching files...' })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('Searching files...');
  });

  it('shows elapsed time after 1 second', () => {
    const { lastFrame } = render(
      h(ThinkingIndicator, { isThinking: true, elapsedMs: 3500 })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('3s');
  });

  it('does not show elapsed time under 1 second', () => {
    process.env.NO_COLOR = '1';
    const { lastFrame } = render(
      h(ThinkingIndicator, { isThinking: true, elapsedMs: 500 })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('Thinking...');
    expect(frame).not.toContain('0s');
    delete process.env.NO_COLOR;
  });

  it('transitions from thinking to not-thinking cleanly', async () => {
    const { lastFrame, rerender } = render(
      h(ThinkingIndicator, { isThinking: true, elapsedMs: 1000 })
    );
    expect(lastFrame()!.length).toBeGreaterThan(0);
    rerender(h(ThinkingIndicator, { isThinking: false, elapsedMs: 1000 }));
    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()!).toBe('');
  });

  it('activity hint overrides default label', () => {
    process.env.NO_COLOR = '1';
    const { lastFrame } = render(
      h(ThinkingIndicator, { isThinking: true, elapsedMs: 0, activityHint: 'Running tests' })
    );
    const frame = lastFrame()!;
    expect(frame).toContain('Running tests');
    expect(frame).not.toContain('Thinking...');
    delete process.env.NO_COLOR;
  });

  it('THINKING_PHRASES export is available for backward compat', () => {
    expect(THINKING_PHRASES).toBeDefined();
    expect(THINKING_PHRASES.length).toBeGreaterThan(0);
    expect(THINKING_PHRASES[0]).toBe('Thinking');
  });
});
