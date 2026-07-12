#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileCharterFull,
  retrieveSpawnContext,
} from '../packages/squad-sdk/dist/agents/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUERY =
  'selective spawn-time retrieval coordinator prompt memory state backend nap policy';
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

function read(path) {
  return readFileSync(path, 'utf8');
}

function readIfPresent(path) {
  return existsSync(path) ? read(path) : '';
}

function bytes(value) {
  return Buffer.byteLength(value, 'utf8');
}

function percentReduction(baseline, treatment) {
  return baseline === 0 ? 0 : Number((((baseline - treatment) / baseline) * 100).toFixed(2));
}

function measure() {
  const coordinatorPrompt = read(join(ROOT, '.squad-templates', 'squad.agent.md'));
  const split = splitCoordinatorPrompt(coordinatorPrompt);
  const charter = read(join(ROOT, '.squad', 'agents', 'eecom', 'charter.md'));
  const team = read(join(ROOT, '.squad', 'team.md'));
  const routing = read(join(ROOT, '.squad', 'routing.md'));
  const decisions = read(join(ROOT, '.squad', 'decisions.md'));
  const historyPath = join(ROOT, '.squad', 'agents', 'eecom', 'history.md');
  const history = readIfPresent(historyPath);

  const baselineAgentPrompt = compileCharterFull({
    agentName: 'eecom',
    charterPath: join(ROOT, '.squad', 'agents', 'eecom', 'charter.md'),
    charterContent: charter,
    teamContext: team,
    routingRules: routing,
    decisions,
  }).prompt;
  const retrieval = retrieveSpawnContext({
    agentName: 'eecom',
    query: QUERY,
    decisions,
    history,
    maxItems: 6,
    maxInjectedBytes: 8 * 1024,
  });
  const treatmentAgentPrompt = compileCharterFull({
    agentName: 'eecom',
    charterPath: join(ROOT, '.squad', 'agents', 'eecom', 'charter.md'),
    charterContent: charter,
    teamContext: team,
    routingRules: routing,
    retrievedContext: retrieval.context,
  }).prompt;
  const contextRecord = {
    ...retrieval.metrics,
    systemPromptBytes: bytes(treatmentAgentPrompt),
  };
  const contractMarkers = [
    'You are **Squad (Coordinator)**',
    '### Directive Capture',
    '### Memory Governance Tools',
    '### Routing',
    '### How to Spawn an Agent',
    '### Reviewer Rejection Lockout Semantics — Strict Lockout',
  ];

  return {
    schemaVersion: 1,
    experiment: 'squad-v0.12-feasibility',
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim(),
    packageVersion: JSON.parse(read(join(ROOT, 'package.json'))).version,
    querySha256: retrieval.metrics.querySha256,
    inputs: {
      coordinatorPromptBytes: bytes(coordinatorPrompt),
      decisionBytes: bytes(decisions),
      historyBytes: bytes(history),
      historyPresent: history.length > 0,
    },
    selectiveRetrieval: {
      baselineSystemPromptBytes: bytes(baselineAgentPrompt),
      treatmentSystemPromptBytes: bytes(treatmentAgentPrompt),
      reductionBytes: bytes(baselineAgentPrompt) - bytes(treatmentAgentPrompt),
      reductionPercent: percentReduction(
        bytes(baselineAgentPrompt),
        bytes(treatmentAgentPrompt),
      ),
      injectedBytes: retrieval.metrics.injectedBytes,
      selectedIds: retrieval.metrics.selectedIds,
      record: contextRecord,
    },
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
      modelModeCorrectnessEvaluated: false,
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = measure();
  mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
  writeFileSync(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  writeFileSync(
    OUTPUT_JSONL,
    `${JSON.stringify(result.selectiveRetrieval.record)}\n`,
    'utf8',
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
