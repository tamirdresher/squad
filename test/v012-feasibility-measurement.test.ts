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
    inputs: {
      coordinatorTemplate: { gitBlobBytes: number; logicalLines: number };
      dominantCliMode: {
        mode: string;
        templateIsDefaultShellSystemBody: boolean;
        composedSystemPromptBytes: number;
      };
      syntheticDecisionBytes: number;
      syntheticHistoryBytes: number;
      syntheticDataOnly: boolean;
    };
    selectiveRetrieval: {
      configurations: Array<{
        id: string;
        meanRecall: number;
        policyOmissionInvariantPass: boolean;
        gate: { pass: boolean };
        taskResults: Array<{ taskId: string; selectedIds: string[] }>;
      }>;
      proposedConfigurationGatePass: boolean;
    };
    securityProbe: {
      forbiddenPatternMatched: boolean;
      injectedIntoSystemContext: boolean;
      metricsRecordContainsPayload: boolean;
      payloadPersisted: boolean;
      payloadSha256: string;
    };
    coordinatorExternalization: {
      baselineBytes: number;
      coreBytes: number;
      onDemandBytes: number;
      onDemandSectionIds: string[];
      coreContractMarkers: Record<string, boolean>;
      byteGatePass: boolean;
      overallGatePass: boolean;
      modelModeCorrectnessEvaluated: boolean;
    };
  };

  it('measures exact base blobs separately from the default shell system prompt', () => {
    expect(measurement.inputs.coordinatorTemplate).toMatchObject({
      gitBlobBytes: 75_883,
      logicalLines: 1_047,
    });
    expect(measurement.inputs.dominantCliMode.mode).toBe('interactive-shell');
    expect(measurement.inputs.dominantCliMode.templateIsDefaultShellSystemBody).toBe(false);
    expect(measurement.inputs.dominantCliMode.composedSystemPromptBytes).toBeGreaterThan(0);
  });

  it('uses only deterministic synthetic decision and history inputs', () => {
    expect(measurement.inputs.syntheticDecisionBytes).toBe(168_550);
    expect(measurement.inputs.syntheticHistoryBytes).toBe(32_768);
    expect(measurement.inputs.syntheticDataOnly).toBe(true);
  });

  it('preserves both passing and failing retrieval budget results', () => {
    const twoKiB = measurement.selectiveRetrieval.configurations
      .find(configuration => configuration.id === '2k-top3');
    const fourKiB = measurement.selectiveRetrieval.configurations
      .find(configuration => configuration.id === '4k-top6');
    const negativeTask = fourKiB?.taskResults
      .find(task => task.taskId === 'negative-no-match');

    expect(twoKiB?.gate.pass).toBe(false);
    expect(twoKiB?.meanRecall).toBeLessThan(1);
    expect(fourKiB?.gate.pass).toBe(false);
    expect(fourKiB?.meanRecall).toBe(1);
    expect(fourKiB?.policyOmissionInvariantPass).toBe(false);
    expect(negativeTask?.selectedIds).toEqual([]);
    expect(measurement.selectiveRetrieval.proposedConfigurationGatePass).toBe(false);
  });

  it('records reproducible non-secret evidence for the frozen leakage stop', () => {
    expect(measurement.securityProbe.forbiddenPatternMatched).toBe(true);
    expect(measurement.securityProbe.injectedIntoSystemContext).toBe(true);
    expect(measurement.securityProbe.metricsRecordContainsPayload).toBe(false);
    expect(measurement.securityProbe.payloadPersisted).toBe(false);
    expect(measurement.securityProbe.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(measurement.securityProbe)).not.toContain('synthetic1234567890');
  });

  it('externalizes substantial on-demand guidance while preserving core contracts', () => {
    expect(measurement.coordinatorExternalization.onDemandBytes).toBeGreaterThan(20_000);
    expect(measurement.coordinatorExternalization.coreBytes).toBeLessThan(
      measurement.coordinatorExternalization.baselineBytes,
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
    expect(measurement.coordinatorExternalization.byteGatePass).toBe(false);
    expect(measurement.coordinatorExternalization.overallGatePass).toBe(false);
  });
});
