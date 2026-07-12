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
    expect(result.metrics.omittedMatches).toBeGreaterThan(0);
    expect(result.context).toContain('more matches — read decisions.md and agent history.md');
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
    expect(first.metrics.omittedMatches).toBeGreaterThan(0);
    expect(first.context).toMatch(/\[\+\d+ more matches — read decisions\.md\]/);
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
    expect(result.metrics.omittedMatches).toBe(0);
    expect(result.metrics.omittedDecisionMatches).toBe(0);
    expect(result.metrics.omittedHistoryMatches).toBe(0);
    expect(result.context).toContain('selected=none');
    expect(result.metrics.injectedBytes).toBe(Buffer.byteLength(result.context, 'utf8'));
  });

  it('rejects an explicit byte bound too small for provenance', () => {
    expect(() => retrieveSpawnContext({
      agentName: 'fido',
      query: 'authentication',
      decisions: DECISIONS,
      history: HISTORY,
      maxInjectedBytes: 255,
    })).toThrow(/maxInjectedBytes must be an integer >= 256/);
  });

  it('matches deterministic Unicode word and bigram tokens', () => {
    const result = retrieveSpawnContext({
      agentName: 'network',
      query: '修复身份验证令牌',
      decisions: '## 身份验证\n令牌必须定期轮换。\n\n## 数据库\n使用 PostgreSQL。\n',
      history: '',
      maxInjectedBytes: 1024,
    });

    expect(result.context).toContain('令牌必须定期轮换');
    expect(result.context).not.toContain('PostgreSQL');
    expect(result.metrics.selectedIds).toHaveLength(1);
  });

  it('defaults to the proposed 4096-byte budget', () => {
    const result = retrieveSpawnContext({
      agentName: 'eecom',
      query: 'authentication',
      decisions: DECISIONS,
      history: HISTORY,
    });

    expect(result.metrics.maxInjectedBytes).toBe(4096);
  });

  it('counts duplicate-content chunks as separate omitted matches', () => {
    const duplicate = '## Duplicate\n\nAuthentication token rotation.';
    const result = retrieveSpawnContext({
      agentName: 'eecom',
      query: 'authentication token rotation',
      decisions: `${duplicate}\n\n${duplicate}`,
      history: '',
      maxItems: 1,
      maxInjectedBytes: 1024,
    });

    expect(result.metrics.matchCount).toBe(2);
    expect(result.metrics.selectedIds).toHaveLength(1);
    expect(result.metrics.omittedMatches).toBe(1);
    expect(result.context).toContain('[+1 more matches — read decisions.md]');
  });
});
