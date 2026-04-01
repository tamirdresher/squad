import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';

const TEST_ROOT = join(tmpdir(), `.test-cli-cost-${randomBytes(4).toString('hex')}`);
const TEAM_ROOT = join(TEST_ROOT, 'team');
const ORCH_DIR = join(TEAM_ROOT, '.squad', 'orchestration-log');
const LOG_DIR = join(TEAM_ROOT, '.squad', 'log');

function writeOrchestrationLog(fileName: string, agent: string, inputTokens: string, outputTokens: string, cost: string): void {
  writeFileSync(
    join(ORCH_DIR, fileName),
    [
      '# Orchestration Log Entry',
      '',
      '| Field | Value |',
      '|-------|-------|',
      `| **Agent routed** | ${agent} (Specialist) |`,
      `| **Token usage** | ${inputTokens} in / ${outputTokens} out — $${cost} |`,
      '',
    ].join('\n'),
    'utf8',
  );
}

describe('CLI: cost command', () => {
  beforeEach(() => {
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(ORCH_DIR, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it('module exports runCost function', async () => {
    const mod = await import('../../packages/squad-cli/src/cli/commands/cost.ts');
    expect(typeof mod.runCost).toBe('function');
  });

  it('aggregates all orchestration log usage with --all', async () => {
    const { runCost } = await import('../../packages/squad-cli/src/cli/commands/cost.ts');
    writeOrchestrationLog('2026-03-18T10-00-00Z-flight.md', 'Flight', '12,450', '3,200', '0.0234');
    writeOrchestrationLog('2026-03-18T10-01-00Z-control.md', 'Control', '8,100', '2,800', '0.0156');
    writeOrchestrationLog('2026-03-18T10-02-00Z-flight.md', 'Flight', '550', '100', '0.0010');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCost(['--all'], TEAM_ROOT);

    const output = logSpy.mock.calls.map(call => call.join(' ')).join('\n');
    expect(output).toContain('💰 Squad Cost Summary');
    expect(output).toContain('Flight');
    expect(output).toContain('13,000');
    expect(output).toContain('3,300');
    expect(output).toContain('$0.0244');
    expect(output).toContain('Control');
    expect(output).toContain('21,100');
    expect(output).toContain('6,100');
    expect(output).toContain('$0.0400');
    expect(output).toContain('2 agents across 3 spawns');
  });

  it('defaults to entries newer than the latest session log', async () => {
    const { runCost } = await import('../../packages/squad-cli/src/cli/commands/cost.ts');
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(join(LOG_DIR, '2026-03-18T10-01-30Z-session.md'), '# session\n', 'utf8');
    writeOrchestrationLog('2026-03-18T10-01-00Z-flight.md', 'Flight', '500', '100', '0.0010');
    writeOrchestrationLog('2026-03-18T10-02-00Z-booster.md', 'Booster', '900', '200', '0.0025');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCost([], TEAM_ROOT);

    const output = logSpy.mock.calls.map(call => call.join(' ')).join('\n');
    expect(output).toContain('Booster');
    expect(output).not.toContain('Flight');
    expect(output).toContain('1 agent across 1 spawn');
  });

  it('filters results by agent name', async () => {
    const { runCost } = await import('../../packages/squad-cli/src/cli/commands/cost.ts');
    writeOrchestrationLog('2026-03-18T10-00-00Z-flight.md', 'Flight', '100', '50', '0.0010');
    writeOrchestrationLog('2026-03-18T10-01-00Z-control.md', 'Control', '200', '70', '0.0020');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCost(['--all', '--agent', 'control'], TEAM_ROOT);

    const output = logSpy.mock.calls.map(call => call.join(' ')).join('\n');
    expect(output).toContain('Control');
    expect(output).not.toContain('Flight');
    expect(output).toContain('1 agent across 1 spawn for control');
  });

  it('prints the no-data message when orchestration log directory is missing', async () => {
    const { runCost } = await import('../../packages/squad-cli/src/cli/commands/cost.ts');
    rmSync(join(TEAM_ROOT, '.squad'), { recursive: true, force: true });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCost([], TEAM_ROOT);

    const output = logSpy.mock.calls.map(call => call.join(' ')).join('\n');
    expect(output).toContain('No token usage data found in orchestration logs.');
  });
});
