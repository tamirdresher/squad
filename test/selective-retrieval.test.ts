import { describe, expect, it } from 'vitest';
import { retrieveSpawnContext } from '@bradygaster/squad-sdk/agents';

const DECISIONS = `# Decisions

## Authentication

Use short-lived access tokens and rotate refresh tokens.

## Database

PostgreSQL is the supported production database.
`;

const HISTORY = `# Agent history

## OAuth incident

Refresh token rotation fixed the authentication replay bug.

## UI cleanup

The navigation spacing was reduced.
`;

describe('selective spawn-time retrieval experiment', () => {
  it('selects bounded lexical matches from decisions and history with provenance', () => {
    const result = retrieveSpawnContext({
      agentName: 'eecom',
      query: 'Fix the authentication refresh token replay bug',
      decisions: DECISIONS,
      history: HISTORY,
      maxItems: 2,
      maxInjectedBytes: 1024,
    });

    expect(result.context).toContain('Provenance: bounded-lexical-v1');
    expect(result.context).toContain('Use short-lived access tokens');
    expect(result.context).toContain('Refresh token rotation fixed');
    expect(result.context).not.toContain('PostgreSQL');
    expect(result.context).not.toContain('navigation spacing');
    expect(result.metrics.selectedIds).toHaveLength(2);
    expect(result.metrics.injectedBytes).toBeLessThanOrEqual(1024);
  });

  it('is deterministic and keeps instrumentation free of source content', () => {
    const input = {
      agentName: 'eecom',
      query: 'authentication refresh token',
      decisions: DECISIONS,
      history: HISTORY,
      maxItems: 1,
      maxInjectedBytes: 512,
    };

    const first = retrieveSpawnContext(input);
    const second = retrieveSpawnContext(input);
    const serializedMetrics = JSON.stringify(first.metrics);

    expect(second).toEqual(first);
    expect(serializedMetrics).not.toContain('short-lived access tokens');
    expect(serializedMetrics).not.toContain('replay bug');
    expect(first.metrics.querySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.metrics.selectedIds[0]).toMatch(/^(decisions|history):[a-f0-9]{16}$/);
  });

  it('reports input and injected bytes without selecting unrelated sections', () => {
    const result = retrieveSpawnContext({
      agentName: 'fido',
      query: 'kubernetes deployment',
      decisions: DECISIONS,
      history: HISTORY,
      maxItems: 3,
      maxInjectedBytes: 512,
    });

    expect(result.metrics.decisionInputBytes).toBe(Buffer.byteLength(DECISIONS, 'utf8'));
    expect(result.metrics.historyInputBytes).toBe(Buffer.byteLength(HISTORY, 'utf8'));
    expect(result.metrics.selectedIds).toEqual([]);
    expect(result.context).toContain('selected=none');
    expect(result.metrics.injectedBytes).toBe(Buffer.byteLength(result.context, 'utf8'));
  });
});
