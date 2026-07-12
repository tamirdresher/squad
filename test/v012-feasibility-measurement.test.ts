import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('v0.12 coordinator externalization simulation', () => {
  const output = execFileSync(
    process.execPath,
    [join(process.cwd(), 'scripts', 'measure-v012-feasibility.mjs'), '--no-write'],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  const measurement = JSON.parse(output) as {
    inputs: { templateCoordinatorPromptBytes: number };
    coordinatorExternalization: {
      coreBytes: number;
      onDemandBytes: number;
      onDemandSectionIds: string[];
      coreContractMarkers: Record<string, boolean>;
      modelModeCorrectnessEvaluated: boolean;
    };
  };

  it('externalizes substantial on-demand guidance while preserving core contracts', () => {
    expect(measurement.coordinatorExternalization.onDemandBytes).toBeGreaterThan(20_000);
    expect(measurement.coordinatorExternalization.coreBytes).toBeLessThan(
      measurement.inputs.templateCoordinatorPromptBytes,
    );
    expect(
      Object.values(measurement.coordinatorExternalization.coreContractMarkers),
    ).not.toContain(false);
  });

  it('does not treat static byte reduction as model-mode correctness evidence', () => {
    expect(measurement.coordinatorExternalization.onDemandSectionIds)
      .toContain('Plugin Marketplace');
    expect(measurement.coordinatorExternalization.onDemandSectionIds)
      .toContain('Issue → PR → Merge Lifecycle');
    expect(measurement.coordinatorExternalization.modelModeCorrectnessEvaluated).toBe(false);
  });
});
