import { describe, it, expect } from 'vitest';

import { defineBudget } from '../packages/squad-sdk/src/builders/index.js';
import { CostTracker } from '../packages/squad-sdk/src/runtime/cost-tracker.js';

function parseUsageFromLog(content: string): {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
} | null {
  const match =
    /\|\s*\*\*Token usage\*\*\s*\|\s*([\d,]+)\s+in\s*\/\s*([\d,]+)\s+out\s+—\s+\$([0-9]+(?:\.[0-9]+)?)\s*\|/.exec(
      content,
    );

  if (!match) {
    return null;
  }

  return {
    inputTokens: Number(match[1].replaceAll(',', '')),
    outputTokens: Number(match[2].replaceAll(',', '')),
    estimatedCost: Number(match[3]),
  };
}

describe('CostTracker', () => {
  it('CostTracker starts with zero totals', () => {
    const tracker = new CostTracker();
    const summary = tracker.getSummary();

    expect(summary.totalInputTokens).toBe(0);
    expect(summary.totalOutputTokens).toBe(0);
    expect(summary.totalEstimatedCost).toBe(0);
    expect(summary.agents.size).toBe(0);
    expect(summary.sessions.size).toBe(0);
  });

  it('recordUsage accumulates tokens and cost', () => {
    const tracker = new CostTracker();

    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 100,
      outputTokens: 50,
      estimatedCost: 0.01,
    });
    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 40,
      outputTokens: 10,
      estimatedCost: 0.0025,
    });

    const summary = tracker.getSummary();
    expect(summary.totalInputTokens).toBe(140);
    expect(summary.totalOutputTokens).toBe(60);
    expect(summary.totalEstimatedCost).toBeCloseTo(0.0125);
  });

  it('recordUsage groups by agent name', () => {
    const tracker = new CostTracker();

    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 100,
      outputTokens: 20,
      estimatedCost: 0.01,
    });
    tracker.recordUsage({
      sessionId: 'session-2',
      agentName: 'fenster',
      model: 'claude-opus-4.1',
      inputTokens: 200,
      outputTokens: 60,
      estimatedCost: 0.03,
    });
    tracker.recordUsage({
      sessionId: 'session-3',
      agentName: 'mcmanus',
      model: 'claude-haiku-4.5',
      inputTokens: 30,
      outputTokens: 10,
      estimatedCost: 0.001,
    });

    const fenster = tracker.getSummary().agents.get('fenster');
    const mcmanus = tracker.getSummary().agents.get('mcmanus');

    expect(fenster).toMatchObject({
      agentName: 'fenster',
      inputTokens: 300,
      outputTokens: 80,
      turnCount: 2,
      model: 'claude-opus-4.1',
    });
    expect(fenster?.estimatedCost).toBeCloseTo(0.04);
    expect(mcmanus).toMatchObject({
      agentName: 'mcmanus',
      inputTokens: 30,
      outputTokens: 10,
      turnCount: 1,
    });
  });

  it('recordUsage groups by session ID', () => {
    const tracker = new CostTracker();

    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 120,
      outputTokens: 30,
      estimatedCost: 0.01,
    });
    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'mcmanus',
      model: 'claude-haiku-4.5',
      inputTokens: 80,
      outputTokens: 25,
      estimatedCost: 0.003,
    });

    const session = tracker.getSummary().sessions.get('session-1');

    expect(session).toMatchObject({
      sessionId: 'session-1',
      inputTokens: 200,
      outputTokens: 55,
      turnCount: 2,
    });
    expect(session?.estimatedCost).toBeCloseTo(0.013);
  });

  it('recordFallback increments fallback counter', () => {
    const tracker = new CostTracker();

    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 75,
      outputTokens: 20,
      estimatedCost: 0.004,
    });
    tracker.recordFallback('fenster');
    tracker.recordFallback('fenster');

    expect(tracker.getSummary().agents.get('fenster')?.fallbackCount).toBe(2);
  });

  it('getSummary returns correct totals after multiple recordings', () => {
    const tracker = new CostTracker();

    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 500,
      outputTokens: 120,
      estimatedCost: 0.02,
    });
    tracker.recordUsage({
      sessionId: 'session-2',
      agentName: 'mcmanus',
      model: 'claude-haiku-4.5',
      inputTokens: 250,
      outputTokens: 80,
      estimatedCost: 0.005,
    });
    tracker.recordUsage({
      sessionId: 'session-2',
      agentName: 'mcmanus',
      model: 'claude-haiku-4.5',
      inputTokens: 150,
      outputTokens: 40,
      estimatedCost: 0.0025,
      isFallback: true,
    });

    const summary = tracker.getSummary();

    expect(summary.totalInputTokens).toBe(900);
    expect(summary.totalOutputTokens).toBe(240);
    expect(summary.totalEstimatedCost).toBeCloseTo(0.0275);
    expect(summary.agents.size).toBe(2);
    expect(summary.sessions.size).toBe(2);
    expect(summary.agents.get('mcmanus')?.fallbackCount).toBe(1);
  });

  it('formatSummary includes agent breakdown', () => {
    const tracker = new CostTracker();

    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 12450,
      outputTokens: 3200,
      estimatedCost: 0.0234,
      isFallback: true,
    });

    const output = tracker.formatSummary();

    expect(output).toContain('--- By Agent ---');
    expect(output).toContain('fenster');
    expect(output).toContain('12,450in / 3,200out');
    expect(output).toContain('$0.0234');
    expect(output).toContain('1 fallbacks');
  });

  it('formatSummary includes session breakdown', () => {
    const tracker = new CostTracker();

    tracker.recordUsage({
      sessionId: 'session-abc',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 500,
      outputTokens: 150,
      estimatedCost: 0.01,
    });

    const output = tracker.formatSummary();

    expect(output).toContain('--- By Session ---');
    expect(output).toContain('session-abc');
    expect(output).toContain('500in / 150out');
  });

  it('reset clears all data', () => {
    const tracker = new CostTracker();

    tracker.recordUsage({
      sessionId: 'session-1',
      agentName: 'fenster',
      model: 'claude-sonnet-4.5',
      inputTokens: 100,
      outputTokens: 40,
      estimatedCost: 0.005,
    });
    tracker.recordFallback('fenster');

    tracker.reset();

    const summary = tracker.getSummary();
    expect(summary.totalInputTokens).toBe(0);
    expect(summary.totalOutputTokens).toBe(0);
    expect(summary.totalEstimatedCost).toBe(0);
    expect(summary.agents.size).toBe(0);
    expect(summary.sessions.size).toBe(0);
  });
});

describe('BudgetDefinition', () => {
  it('defineBudget accepts valid config (perAgentSpawn + perSession + warnAt)', () => {
    const budget = defineBudget({
      perAgentSpawn: 50000,
      perSession: 500000,
      warnAt: 0.8,
    });

    expect(budget).toEqual({
      perAgentSpawn: 50000,
      perSession: 500000,
      warnAt: 0.8,
    });
  });

  it('defineBudget accepts partial config (only perAgentSpawn)', () => {
    expect(defineBudget({ perAgentSpawn: 100000 })).toEqual({
      perAgentSpawn: 100000,
    });
  });

  it('defineBudget accepts empty object', () => {
    expect(defineBudget({})).toEqual({});
  });

  it('defineBudget rejects negative perAgentSpawn', () => {
    expect(() => defineBudget({ perAgentSpawn: -1 })).toThrow(/perAgentSpawn/);
  });

  it('defineBudget rejects zero perAgentSpawn', () => {
    expect(() => defineBudget({ perAgentSpawn: 0 })).toThrow(/perAgentSpawn/);
  });

  it('defineBudget rejects warnAt > 1', () => {
    expect(() => defineBudget({ warnAt: 1.1 })).toThrow(/warnAt/);
  });

  it('defineBudget rejects warnAt < 0', () => {
    expect(() => defineBudget({ warnAt: -0.1 })).toThrow(/warnAt/);
  });

  it('defineBudget rejects non-number perSession', () => {
    expect(() => defineBudget({ perSession: '500000' as unknown as number })).toThrow(/perSession/);
  });

  it('defineBudget rejects NaN for perAgentSpawn', () => {
    expect(() => defineBudget({ perAgentSpawn: NaN })).toThrow(/perAgentSpawn/);
  });

  it('defineBudget rejects NaN for perSession', () => {
    expect(() => defineBudget({ perSession: NaN })).toThrow(/perSession/);
  });

  it('defineBudget rejects NaN for warnAt', () => {
    expect(() => defineBudget({ warnAt: NaN })).toThrow(/warnAt/);
  });

  it('defineBudget rejects Infinity for perAgentSpawn', () => {
    expect(() => defineBudget({ perAgentSpawn: Infinity })).toThrow(/perAgentSpawn/);
  });

  it('defineBudget rejects Infinity for perSession', () => {
    expect(() => defineBudget({ perSession: Infinity })).toThrow(/perSession/);
  });
});

describe('parseUsageFromLog', () => {
  it('Parses valid usage row: `| **Token usage** | 12,450 in / 3,200 out — $0.0234 |`', () => {
    const content = `# Orchestration Log

| Field | Value |
|-------|-------|
| **Token usage** | 12,450 in / 3,200 out — $0.0234 |
`;

    expect(parseUsageFromLog(content)).toEqual({
      inputTokens: 12450,
      outputTokens: 3200,
      estimatedCost: 0.0234,
    });
  });

  it('Returns null for logs without usage data', () => {
    const content = `# Orchestration Log

| Field | Value |
|-------|-------|
| **Outcome** | Completed |
`;

    expect(parseUsageFromLog(content)).toBeNull();
  });

  it('Handles commas in numbers', () => {
    const content = '| **Token usage** | 123,456 in / 7,890 out — $1.2345 |';

    expect(parseUsageFromLog(content)).toEqual({
      inputTokens: 123456,
      outputTokens: 7890,
      estimatedCost: 1.2345,
    });
  });
});
