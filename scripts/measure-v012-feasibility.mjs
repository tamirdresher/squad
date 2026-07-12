#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileCharterFull,
  retrieveSpawnContext,
} from '../packages/squad-sdk/dist/agents/index.js';
import { buildCoordinatorPrompt } from '../packages/squad-cli/dist/cli/shell/coordinator.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_COMMIT = '25eae44b53bb2842f15bb2cd71c97a0ad7d6e598';
const FORK_MAIN_COMMIT = 'ffcd439980c99cdec038b72b1cca964deeddda46';
const DECISION_TARGET_BYTES = 168_550;
const HISTORY_TARGET_BYTES = 32_768;
const OUTPUT_JSON = join(
  ROOT,
  'docs',
  'measurements',
  'squad-v012-feasibility-2026-07.json',
);
const OUTPUT_JSONL = join(
  ROOT,
  'docs',
  'measurements',
  'squad-v012-context-injection-2026-07.jsonl',
);

const RETRIEVAL_CONFIGS = [
  { id: '2k-top3', maxInjectedBytes: 2 * 1024, maxItems: 3 },
  { id: '4k-top6', maxInjectedBytes: 4 * 1024, maxItems: 6 },
  { id: '8k-top8', maxInjectedBytes: 8 * 1024, maxItems: 8 },
];

const ON_DEMAND_HEADINGS = new Set([
  'Personal Squad (Ambient Discovery)',
  'Issue Awareness',
  'Skill Confidence Lifecycle',
  'Shared File Architecture — Drop-Box Pattern',
  'Worktree Awareness',
  'Worktree Lifecycle Management',
  'Orchestration Logging',
  'Ceremonies',
  'Adding Team Members',
  'Removing Team Members',
  'Plugin Marketplace',
  'Universe Allowlist',
  'Name Allocation',
  'Overflow Handling',
  'Casting State Files',
  'Migration — Already-Squadified Repos',
  'Prerequisites',
  'Triggers',
  'Connecting to a Repo',
  'Issue → PR → Merge Lifecycle',
  'Roster Entry',
  'Traffic Light Verdicts',
  'Red Verdict — Blocking Behavior',
  'Background Mode (Default)',
  'Check Categories (Phase 1)',
  'Opt-Out Model',
  'Rai State',
  'Integration with Reviewer Rejection Protocol',
  'Confidence Ratings (Verification Mode)',
  "Devil's Advocate Output (DA Mode)",
  'Boundaries',
  'Fact Checker State',
]);

export function splitCoordinatorPrompt(prompt) {
  const sectionPattern = /^### ([^\r\n]+)\r?$/gm;
  const matches = [...prompt.matchAll(sectionPattern)];
  const preambleEnd = matches[0]?.index ?? prompt.length;
  const coreParts = [prompt.slice(0, preambleEnd)];
  const onDemandParts = [];
  const onDemandIds = [];

  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const start = match.index;
    const end = matches[index + 1]?.index ?? prompt.length;
    const section = prompt.slice(start, end);
    const heading = match[1].trim();
    if (ON_DEMAND_HEADINGS.has(heading)) {
      onDemandParts.push(section);
      onDemandIds.push(heading);
    } else {
      coreParts.push(section);
    }
  }

  const referenceLine =
    `\n### On-demand references\n\nExternalized sections: ${onDemandIds.join('; ')}\n`;
  return {
    core: coreParts.join('') + referenceLine,
    onDemand: onDemandParts.join(''),
    onDemandIds,
  };
}

function bytes(value) {
  return Buffer.byteLength(value, 'utf8');
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function chunkId(source, content) {
  return `${source}:${sha256(`${source}\0${content.trim()}`).slice(0, 16)}`;
}

function gitBlob(path) {
  return execFileSync('git', ['show', `${BASE_COMMIT}:${path}`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  });
}

function section(title, body) {
  return `## ${title}\n\n${body}`;
}

function padDocument(prefix, targetBytes, fillerTitle) {
  const fillerPrefix = `${prefix}\n\n## ${fillerTitle}\n\n`;
  const paddingBytes = targetBytes - bytes(fillerPrefix);
  if (paddingBytes < 0) {
    throw new Error(`${fillerTitle} fixture exceeds target by ${Math.abs(paddingBytes)} bytes`);
  }
  return `${fillerPrefix}${'x'.repeat(paddingBytes)}`;
}

function createSyntheticFixture() {
  const decisions = {
    auth: section(
      'Authentication token policy',
      'OAuth refresh token rotation prevents replay. Access tokens stay short lived and sessions are revoked after credential changes.',
    ),
    coordinator: section(
      'Coordinator prompt split',
      'Keep routing, directive capture, model selection, and reviewer lockout in coordinator core. Load ceremonies, casting, marketplace, and issue lifecycle on demand.',
    ),
    policy: section(
      'Governed memory policy',
      'class: POLICY\nloadGuidance: ALWAYS\n\nThe memory index owns class and load guidance metadata.',
    ),
    manifest: section(
      'Skill template manifest',
      'Tiered memory, iterative retrieval, and reflect are curated skills in both the CLI template manifest and SDK manifest skill names.',
    ),
    package: section(
      'Published state MCP compatibility',
      'A CLI and SDK version mismatch can surface a missing addSquadStateGitignoreBlock named export while state-mcp modules load.',
    ),
    large: section(
      'Large migration context',
      `Migration rollout context must preserve compatibility, rollback, telemetry, and staged deployment evidence. ${'migration compatibility rollback telemetry '.repeat(78)}`,
    ),
  };
  const histories = {
    auth: section(
      'Authentication incident',
      'A replay incident was resolved by refresh token rotation and explicit session revocation.',
    ),
    coordinator: section(
      'Coordinator routing regression',
      'Routing regressions occurred when mode-specific reference sections crowded the core dispatch contract.',
    ),
    policy: section(
      'Nap archival observation',
      'Nap currently archives decisions markdown by heading date and size; it does not read governed memory index metadata.',
    ),
    package: section(
      'Package mismatch reproduction',
      'The exact named-export failure reproduced with CLI 0.11.0 and SDK 0.10.0, while a matched clean 0.11.0 install started.',
    ),
  };

  const decisionPrefix =
    `# Synthetic decisions ledger\n\n${Object.values(decisions).join('\n\n')}`;
  const historyPrefix =
    `# Synthetic agent history\n\n${Object.values(histories).join('\n\n')}`;
  const decisionDocument = padDocument(
    decisionPrefix,
    DECISION_TARGET_BYTES,
    'Sanitized decision filler',
  );
  const historyDocument = padDocument(
    historyPrefix,
    HISTORY_TARGET_BYTES,
    'Sanitized history filler',
  );

  const decisionId = key => chunkId('decisions', decisions[key]);
  const historyId = key => chunkId('history', histories[key]);
  const tasks = [
    {
      id: 'auth-replay',
      query: 'fix OAuth refresh token replay and session revocation',
      expectedIds: [decisionId('auth'), historyId('auth')],
    },
    {
      id: 'coordinator-split',
      query: 'externalize coordinator prompt mode references without routing regression',
      expectedIds: [decisionId('coordinator'), historyId('coordinator')],
    },
    {
      id: 'policy-nap',
      query: 'protect POLICY loadGuidance ALWAYS entries during nap archival',
      expectedIds: [decisionId('policy'), historyId('policy')],
    },
    {
      id: 'package-skew',
      query: 'state mcp addSquadStateGitignoreBlock package mismatch',
      expectedIds: [decisionId('package'), historyId('package')],
    },
    {
      id: 'skills-manifest',
      query: 'tiered memory iterative retrieval reflect template manifest',
      expectedIds: [decisionId('manifest')],
    },
    {
      id: 'large-migration',
      query: 'migration compatibility rollback telemetry rollout',
      expectedIds: [decisionId('large')],
    },
    {
      id: 'negative-no-match',
      query: 'quantum shader rasterization pipeline',
      expectedIds: [],
    },
  ];

  return {
    decisions: decisionDocument,
    history: historyDocument,
    tasks,
    policyIds: [decisionId('policy')],
  };
}

function recall(selectedIds, expectedIds) {
  if (expectedIds.length === 0) return selectedIds.length === 0 ? 1 : 0;
  const selected = new Set(selectedIds);
  return expectedIds.filter(id => selected.has(id)).length / expectedIds.length;
}

function precision(selectedIds, expectedIds) {
  if (selectedIds.length === 0) return expectedIds.length === 0 ? 1 : 0;
  const expected = new Set(expectedIds);
  return selectedIds.filter(id => expected.has(id)).length / selectedIds.length;
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[midpoint - 1] + ordered[midpoint]) / 2
    : ordered[midpoint];
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function runSecretLeakageProbe() {
  const secretShape = [
    'api',
    '_key',
    ':',
    'sk',
    '_',
    'synthetic',
    '1234567890',
  ].join('');
  const forbiddenMatcher =
    /\b(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+/i;
  const decision = section(
    'Deployment credential',
    `API key deployment rule.\n${secretShape}`,
  );
  const retrieval = retrieveSpawnContext({
    agentName: 'security-probe',
    query: 'api key deployment',
    decisions: decision,
    history: '',
    maxItems: 3,
    maxInjectedBytes: 4 * 1024,
  });
  return {
    matcherId: 'FORBIDDEN credential-like assignment',
    payloadSha256: sha256(secretShape),
    forbiddenPatternMatched: forbiddenMatcher.test(secretShape),
    injectedIntoSystemContext: retrieval.context.includes(secretShape),
    metricsRecordContainsPayload: JSON.stringify(retrieval.metrics).includes(secretShape),
    payloadPersisted: false,
  };
}

function percentReduction(baseline, treatment) {
  return baseline === 0 ? 0 : Number((((baseline - treatment) / baseline) * 100).toFixed(2));
}

function measurementSourceHash(paths, blobs) {
  const hash = createHash('sha256');
  for (const filePath of [...paths].sort()) {
    const relativePath = filePath.slice(ROOT.length + 1).replaceAll('\\', '/');
    hash.update(relativePath);
    hash.update('\0');
    hash.update(readFileSync(filePath));
    hash.update('\0');
  }
  for (const [name, content] of [...blobs].sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(name);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function composeBaseShellPrompt(team, routing) {
  const root = mkdtempSync(join(tmpdir(), 'squad-v012-shell-'));
  try {
    const stateDir = join(root, '.squad');
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, 'team.md'), team, 'utf8');
    writeFileSync(join(stateDir, 'routing.md'), routing, 'utf8');
    return await buildCoordinatorPrompt({ teamRoot: root });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function measure() {
  const coordinatorPrompt = gitBlob('.squad-templates/squad.agent.md');
  const baseTeam = gitBlob('.squad/team.md');
  const baseRouting = gitBlob('.squad/routing.md');
  const shellCoordinatorPrompt = await composeBaseShellPrompt(baseTeam, baseRouting);
  const split = splitCoordinatorPrompt(coordinatorPrompt);
  const fixture = createSyntheticFixture();
  const charter = `# Synthetic Agent — Feasibility\n\n## Identity\n\n**Name:** Synthetic Agent\n**Role:** Research\n`;
  const team = '# Synthetic Team\n\n| Name | Role |\n|---|---|\n| Synthetic | Research |\n';
  const routing = '# Synthetic Routing\n\nRoute measurements to Synthetic.\n';
  const baselineAgentPrompt = compileCharterFull({
    agentName: 'synthetic',
    charterPath: '/synthetic/charter.md',
    charterContent: charter,
    teamContext: team,
    routingRules: routing,
    decisions: fixture.decisions,
  }).prompt;
  const sourceBytes = bytes(fixture.decisions) + bytes(fixture.history);
  const records = [];
  const retrievalConfigurations = RETRIEVAL_CONFIGS.map(config => {
    const taskResults = fixture.tasks.map((task, taskIndex) => {
      const retrieval = retrieveSpawnContext({
        agentName: 'synthetic',
        query: task.query,
        decisions: fixture.decisions,
        history: fixture.history,
        maxItems: config.maxItems,
        maxInjectedBytes: config.maxInjectedBytes,
      });
      const treatmentPrompt = compileCharterFull({
        agentName: 'synthetic',
        charterPath: '/synthetic/charter.md',
        charterContent: charter,
        teamContext: team,
        routingRules: routing,
        retrievedContext: retrieval.context,
      }).prompt;
      const result = {
        taskId: task.id,
        expectedIds: task.expectedIds,
        selectedIds: retrieval.metrics.selectedIds,
        matchCount: retrieval.metrics.matchCount,
        omittedMatches: retrieval.metrics.omittedMatches,
        injectedBytes: retrieval.metrics.injectedBytes,
        systemPromptBytes: bytes(treatmentPrompt),
        systemPromptReductionPercent: percentReduction(
          bytes(baselineAgentPrompt),
          bytes(treatmentPrompt),
        ),
        recall: recall(retrieval.metrics.selectedIds, task.expectedIds),
        precision: precision(retrieval.metrics.selectedIds, task.expectedIds),
        policyOmittedIds: fixture.policyIds.filter(
          id => !retrieval.metrics.selectedIds.includes(id),
        ),
      };
      if (config.id === '4k-top6') {
        records.push({
          ...retrieval.metrics,
          timestamp: `2026-07-12T00:00:${String(taskIndex).padStart(2, '0')}.000Z`,
          taskSha256: retrieval.metrics.querySha256,
          model: 'synthetic-measurement',
          sessionId: `synthetic-${task.id}`,
          systemPromptBytes: bytes(treatmentPrompt),
        });
      }
      return result;
    });
    const p50Reduction = Number(median(
      taskResults.map(result => result.systemPromptReductionPercent),
    ).toFixed(2));
    const meanRecall = Number(average(taskResults.map(result => result.recall)).toFixed(4));
    const meanPrecision = Number(average(taskResults.map(result => result.precision)).toFixed(4));
    const coverageDecrease = Number((1 - meanRecall).toFixed(4));
    const policyOmissionCount = taskResults.reduce(
      (total, result) => total + result.policyOmittedIds.length,
      0,
    );
    return {
      ...config,
      p50SystemPromptReductionPercent: p50Reduction,
      meanRecall,
      meanPrecision,
      handLabeledCoverageDecrease: coverageDecrease,
      policyOmissionCount,
      policyOmissionInvariantPass: policyOmissionCount === 0,
      gate: {
        reductionThresholdPercent: 20,
        maximumCoverageDecrease: 0,
        policyOmissionInvariantRequired: true,
        pass:
          p50Reduction >= 20
          && coverageDecrease === 0
          && policyOmissionCount === 0,
      },
      taskResults,
    };
  });
  const proposedConfiguration = retrievalConfigurations.find(
    configuration => configuration.id === '4k-top6',
  );
  const contractMarkers = [
    'You are **Squad (Coordinator)**',
    '### Directive Capture',
    '### Memory Governance Tools',
    '### Routing',
    '### How to Spawn an Agent',
    '### Reviewer Rejection Lockout Semantics — Strict Lockout',
  ];
  const sourcePaths = [
    join(ROOT, 'packages', 'squad-sdk', 'src', 'agents', 'selective-retrieval.ts'),
    join(ROOT, 'packages', 'squad-sdk', 'src', 'agents', 'charter-compiler.ts'),
    join(ROOT, 'packages', 'squad-sdk', 'dist', 'agents', 'index.js'),
    join(ROOT, 'packages', 'squad-sdk', 'dist', 'agents', 'selective-retrieval.js'),
    join(ROOT, 'packages', 'squad-sdk', 'dist', 'agents', 'charter-compiler.js'),
    join(ROOT, 'packages', 'squad-cli', 'dist', 'cli', 'shell', 'coordinator.js'),
    fileURLToPath(import.meta.url),
  ];

  return {
    schemaVersion: 2,
    experiment: 'squad-v0.12-feasibility',
    base: {
      upstreamMain: BASE_COMMIT,
      forkMainObserved: FORK_MAIN_COMMIT,
      forkBehindByCommits: 2,
    },
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim(),
    sourceDirty: execFileSync(
      'git',
      ['status', '--porcelain', '--untracked-files=no'],
      { cwd: ROOT, encoding: 'utf8' },
    ).trim().length > 0,
    measurementSourceSha256: measurementSourceHash(sourcePaths, [
      ['base:.squad-templates/squad.agent.md', coordinatorPrompt],
      ['base:.squad/team.md', baseTeam],
      ['base:.squad/routing.md', baseRouting],
      ['synthetic:decisions', fixture.decisions],
      ['synthetic:history', fixture.history],
    ]),
    packageVersion: JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version,
    inputs: {
      coordinatorTemplate: {
        gitBlobBytes: bytes(coordinatorPrompt),
        logicalLines: coordinatorPrompt.split('\n').length - 1,
        reportedHypothesisBytes: 86_018,
        reportedHypothesisLines: 814,
      },
      dominantCliMode: {
        mode: 'interactive-shell',
        evidence: 'squad with no args calls runShell()',
        systemPromptSource: 'packages/squad-cli/src/cli/shell/coordinator.ts',
        composedSystemPromptBytes: bytes(shellCoordinatorPrompt),
        templateIsDefaultShellSystemBody: false,
      },
      syntheticDecisionBytes: bytes(fixture.decisions),
      syntheticHistoryBytes: bytes(fixture.history),
      syntheticSourceBytes: sourceBytes,
      syntheticDataOnly: true,
    },
    selectiveRetrieval: {
      baselineSystemPromptBytes: bytes(baselineAgentPrompt),
      configurations: retrievalConfigurations,
      proposedConfigurationId: '4k-top6',
      proposedConfigurationGatePass: proposedConfiguration.gate.pass,
      defaultRecords: records,
    },
    securityProbe: runSecretLeakageProbe(),
    coordinatorExternalization: {
      baselineBytes: bytes(coordinatorPrompt),
      coreBytes: bytes(split.core),
      onDemandBytes: bytes(split.onDemand),
      reductionBytes: bytes(coordinatorPrompt) - bytes(split.core),
      reductionPercent: percentReduction(bytes(coordinatorPrompt), bytes(split.core)),
      onDemandSectionIds: split.onDemandIds,
      coreContractMarkers: Object.fromEntries(
        contractMarkers.map(marker => [marker, split.core.includes(marker)]),
      ),
      byteGateThresholdPercent: 40,
      byteGatePass: percentReduction(bytes(coordinatorPrompt), bytes(split.core)) >= 40,
      documentedModeRegressionTestsRun: false,
      overallGatePass: false,
      modelModeCorrectnessEvaluated: false,
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await measure();
  if (!process.argv.includes('--no-write')) {
    mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
    writeFileSync(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    writeFileSync(
      OUTPUT_JSONL,
      `${result.selectiveRetrieval.defaultRecords.map(record => JSON.stringify(record)).join('\n')}\n`,
      'utf8',
    );
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
