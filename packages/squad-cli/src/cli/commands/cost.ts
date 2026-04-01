import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fatal } from '../core/errors.js';

interface CostArgs {
  showAll: boolean;
  agentFilter?: string;
}

interface CostEntry {
  agent: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  timestamp: string;
}

interface AgentTotals {
  agent: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  spawns: number;
}

const TOKEN_USAGE_RE =
  /\|\s*\*\*Token usage\*\*\s*\|\s*([\d,]+)\s+in\s*\/\s*([\d,]+)\s+out\s*[—-]\s*\$([\d.,]+)\s*\|/i;
const AGENT_RE = /\|\s*\*\*Agent routed\*\*\s*\|\s*(.+?)\s*\|/i;
const SAFE_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/;

function parseArgs(args: string[]): CostArgs {
  const showAll = args.includes('--all');
  const agentIdx = args.indexOf('--agent');
  const agentFilter = agentIdx !== -1 ? args[agentIdx + 1]?.trim() : undefined;

  if (agentIdx !== -1 && !agentFilter) {
    fatal('Usage: squad cost [--all] [--agent <name>]');
  }

  return { showAll, agentFilter };
}

function extractTimestamp(fileName: string): string | null {
  return fileName.match(SAFE_TIMESTAMP_RE)?.[0] ?? null;
}

function extractAgent(agentCell: string): string {
  return agentCell.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function parseNumber(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

function parseCostEntry(content: string, timestamp: string): CostEntry | null {
  const tokenMatch = content.match(TOKEN_USAGE_RE);
  const agentMatch = content.match(AGENT_RE);

  if (!tokenMatch || !agentMatch) {
    return null;
  }

  const agent = extractAgent(agentMatch[1] ?? '');
  const inputTokens = parseNumber(tokenMatch[1] ?? '0');
  const outputTokens = parseNumber(tokenMatch[2] ?? '0');
  const estimatedCost = Number((tokenMatch[3] ?? '0').replace(/,/g, ''));

  if (!agent || Number.isNaN(inputTokens) || Number.isNaN(outputTokens) || Number.isNaN(estimatedCost)) {
    return null;
  }

  return {
    agent,
    inputTokens,
    outputTokens,
    estimatedCost,
    timestamp,
  };
}

function sortNewestFirst(entries: readonly string[]): string[] {
  return [...entries].sort((a, b) => b.localeCompare(a));
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatCost(value: number): string {
  return `$${value.toFixed(4)}`;
}

function printNoData(): void {
  console.log('💰 No token usage data found in orchestration logs.');
  console.log('   Token tracking is recorded when agents report usage in their responses.');
}

function printSummary(entries: CostEntry[], agentFilter?: string): void {
  const totalsByAgent = new Map<string, AgentTotals>();

  for (const entry of entries) {
    const current = totalsByAgent.get(entry.agent) ?? {
      agent: entry.agent,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      spawns: 0,
    };

    current.inputTokens += entry.inputTokens;
    current.outputTokens += entry.outputTokens;
    current.estimatedCost += entry.estimatedCost;
    current.spawns += 1;
    totalsByAgent.set(entry.agent, current);
  }

  const rows = [...totalsByAgent.values()].sort((a, b) => b.estimatedCost - a.estimatedCost || a.agent.localeCompare(b.agent));
  const total = rows.reduce(
    (acc, row) => {
      acc.inputTokens += row.inputTokens;
      acc.outputTokens += row.outputTokens;
      acc.estimatedCost += row.estimatedCost;
      acc.spawns += row.spawns;
      return acc;
    },
    { inputTokens: 0, outputTokens: 0, estimatedCost: 0, spawns: 0 },
  );

  const agentWidth = Math.max(
    'Agent'.length,
    'Total'.length,
    ...rows.map(row => row.agent.length),
  ) + 2;
  const inputWidth = Math.max('Input Tokens'.length, ...rows.map(row => formatInteger(row.inputTokens).length), formatInteger(total.inputTokens).length) + 2;
  const outputWidth = Math.max('Output Tokens'.length, ...rows.map(row => formatInteger(row.outputTokens).length), formatInteger(total.outputTokens).length) + 2;
  const costWidth = Math.max('Est. Cost'.length, ...rows.map(row => formatCost(row.estimatedCost).length), formatCost(total.estimatedCost).length) + 2;

  const divider = `  ${'─'.repeat(agentWidth)}${' '.repeat(2)}${'─'.repeat(inputWidth)}${' '.repeat(2)}${'─'.repeat(outputWidth)}${' '.repeat(2)}${'─'.repeat(costWidth)}`;
  const formatRow = (label: string, inputTokens: number, outputTokens: number, estimatedCost: number): string =>
    `  ${label.padEnd(agentWidth)}${formatInteger(inputTokens).padStart(inputWidth)}  ${formatInteger(outputTokens).padStart(outputWidth)}  ${formatCost(estimatedCost).padStart(costWidth)}`;

  console.log('💰 Squad Cost Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log(
    `  ${'Agent'.padEnd(agentWidth)}${'Input Tokens'.padStart(inputWidth)}  ${'Output Tokens'.padStart(outputWidth)}  ${'Est. Cost'.padStart(costWidth)}`,
  );
  console.log(divider);
  for (const row of rows) {
    console.log(formatRow(row.agent, row.inputTokens, row.outputTokens, row.estimatedCost));
  }
  console.log(divider);
  console.log(formatRow('Total', total.inputTokens, total.outputTokens, total.estimatedCost));
  console.log();

  const filterLabel = agentFilter ? ` for ${agentFilter}` : '';
  console.log(`  📊 ${rows.length} agent${rows.length === 1 ? '' : 's'} across ${total.spawns} spawn${total.spawns === 1 ? '' : 's'}${filterLabel}`);
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name);
}

async function getCurrentSessionCutoff(teamRoot: string): Promise<string | null> {
  const sessionLogDir = join(teamRoot, '.squad', 'log');

  try {
    const logFiles = sortNewestFirst(await listMarkdownFiles(sessionLogDir));
    for (const file of logFiles) {
      const timestamp = extractTimestamp(file);
      if (timestamp) {
        return timestamp;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function runCost(args: string[], teamRoot: string): Promise<void> {
  const { showAll, agentFilter } = parseArgs(args);
  const orchestrationDir = join(teamRoot, '.squad', 'orchestration-log');

  let files: string[];
  try {
    files = sortNewestFirst(await listMarkdownFiles(orchestrationDir));
  } catch {
    printNoData();
    return;
  }

  if (files.length === 0) {
    printNoData();
    return;
  }

  const cutoffTimestamp = showAll ? null : await getCurrentSessionCutoff(teamRoot);
  const filteredFiles = files.filter(file => {
    const timestamp = extractTimestamp(file);
    if (!timestamp) {
      return false;
    }
    return cutoffTimestamp ? timestamp > cutoffTimestamp : true;
  });

  const entries: CostEntry[] = [];
  for (const file of filteredFiles) {
    const timestamp = extractTimestamp(file);
    if (!timestamp) {
      continue;
    }

    const content = await readFile(join(orchestrationDir, file), 'utf8');
    const parsed = parseCostEntry(content, timestamp);
    if (!parsed) {
      continue;
    }

    if (agentFilter && parsed.agent.toLowerCase() !== agentFilter.toLowerCase()) {
      continue;
    }

    entries.push(parsed);
  }

  if (entries.length === 0) {
    printNoData();
    return;
  }

  printSummary(entries, agentFilter);
}
