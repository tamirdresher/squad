import { createHash } from 'node:crypto';
import path from 'node:path';
import type { StorageProvider } from '../storage/storage-provider.js';

const DEFAULT_MAX_ITEMS = 6;
const DEFAULT_MAX_INJECTED_BYTES = 4 * 1024;
const MIN_INJECTED_BYTES = 256;
const ALGORITHM = 'bounded-lexical-v1';

export interface SelectiveRetrievalOptions {
  /** Explicit experiment gate. Disabled and behavior-preserving unless true. */
  enabled: boolean;
  maxItems?: number;
  maxInjectedBytes?: number;
  /** Absolute path, or a path relative to the lifecycle manager team root. */
  recordPath?: string;
}

export interface ContextInjectionRecord {
  schemaVersion: 1;
  event: 'squad.context-injection';
  algorithm: typeof ALGORITHM;
  agentName: string;
  timestamp: string;
  taskSha256: string;
  querySha256: string;
  model: string;
  sessionId: string;
  systemPromptBytes: number;
  decisionInputBytes: number;
  historyInputBytes: number;
  injectedBytes: number;
  selectedIds: string[];
  matchCount: number;
  omittedMatches: number;
  omittedDecisionMatches: number;
  omittedHistoryMatches: number;
  maxItems: number;
  maxInjectedBytes: number;
}

export interface SelectiveRetrievalInput {
  agentName: string;
  query: string;
  decisions: string;
  history: string;
  maxItems?: number;
  maxInjectedBytes?: number;
}

export interface SelectiveRetrievalResult {
  context: string;
  metrics: Omit<
    ContextInjectionRecord,
    'timestamp' | 'taskSha256' | 'model' | 'sessionId' | 'systemPromptBytes'
  >;
}

interface RetrievalChunk {
  id: string;
  source: 'decisions' | 'history';
  ordinal: number;
  content: string;
  score: number;
}

export function retrieveSpawnContext(input: SelectiveRetrievalInput): SelectiveRetrievalResult {
  const maxItems = normalizePositiveInteger(input.maxItems, DEFAULT_MAX_ITEMS);
  const maxInjectedBytes = input.maxInjectedBytes ?? DEFAULT_MAX_INJECTED_BYTES;
  if (!Number.isInteger(maxInjectedBytes) || maxInjectedBytes < MIN_INJECTED_BYTES) {
    throw new RangeError(`maxInjectedBytes must be an integer >= ${MIN_INJECTED_BYTES}`);
  }
  const querySha256 = sha256(input.query);
  const queryTokens = new Set(tokenize(input.query));
  const chunks = [
    ...parseChunks(input.decisions, 'decisions'),
    ...parseChunks(input.history, 'history'),
  ]
    .map(chunk => ({
      ...chunk,
      score: overlapScore(queryTokens, chunk.content),
    }))
    .filter(chunk => chunk.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || sourceOrder(left.source) - sourceOrder(right.source)
      || left.ordinal - right.ordinal
      || left.id.localeCompare(right.id));

  const selected: RetrievalChunk[] = [];
  for (const chunk of chunks) {
    if (selected.length >= maxItems) break;
    const candidate = [...selected, chunk];
    const omissions = countOmissions(chunks, candidate);
    if (byteLength(formatContext(querySha256, candidate, omissions)) <= maxInjectedBytes) {
      selected.push(chunk);
    }
  }

  const omissions = countOmissions(chunks, selected);
  const omittedMatches = omissions.decisions + omissions.history;
  const context = formatContext(querySha256, selected, omissions);
  return {
    context,
    metrics: {
      schemaVersion: 1,
      event: 'squad.context-injection',
      algorithm: ALGORITHM,
      agentName: input.agentName,
      querySha256,
      decisionInputBytes: byteLength(input.decisions),
      historyInputBytes: byteLength(input.history),
      injectedBytes: byteLength(context),
      selectedIds: selected.map(chunk => chunk.id),
      matchCount: chunks.length,
      omittedMatches,
      omittedDecisionMatches: omissions.decisions,
      omittedHistoryMatches: omissions.history,
      maxItems,
      maxInjectedBytes,
    },
  };
}

export async function appendContextInjectionRecord(
  storage: StorageProvider,
  recordPath: string,
  record: ContextInjectionRecord,
): Promise<void> {
  await storage.mkdir(path.dirname(recordPath), { recursive: true });
  await storage.append(recordPath, `${JSON.stringify(record)}\n`);
}

function parseChunks(content: string, source: RetrievalChunk['source']): RetrievalChunk[] {
  const normalized = content.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const starts: number[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (/^#{2,3}\s+\S/.test(lines[index]!)) starts.push(index);
  }
  if (starts.length === 0 || starts[0] !== 0) starts.unshift(0);

  return starts.map((start, ordinal) => {
    const end = starts[ordinal + 1] ?? lines.length;
    const chunkContent = lines.slice(start, end).join('\n').trim();
    return {
      id: `${source}:${sha256(`${source}\0${chunkContent}`).slice(0, 16)}`,
      source,
      ordinal,
      content: chunkContent,
      score: 0,
    };
  }).filter(chunk => chunk.content.length > 0);
}

function formatContext(
  querySha256: string,
  chunks: RetrievalChunk[],
  omissions: { decisions: number; history: number },
): string {
  const selected = chunks.map(chunk => chunk.id).join(',');
  const provenance =
    `> Provenance: ${ALGORITHM}; query-sha256=${querySha256}; selected=${selected || 'none'}`;
  const omittedMatches = omissions.decisions + omissions.history;
  let readTarget = '';
  if (omissions.decisions > 0 && omissions.history > 0) {
    readTarget = 'decisions.md and agent history.md';
  } else if (omissions.decisions > 0) {
    readTarget = 'decisions.md';
  } else if (omissions.history > 0) {
    readTarget = 'agent history.md';
  }
  const overflow = omittedMatches > 0
    ? `[+${omittedMatches} more matches — read ${readTarget}]`
    : '';
  return [provenance, ...chunks.map(chunk => chunk.content), overflow]
    .filter(Boolean)
    .join('\n\n');
}

function countOmissions(
  chunks: RetrievalChunk[],
  selected: RetrievalChunk[],
): { decisions: number; history: number } {
  const selectedIds = new Set(selected.map(chunk => chunk.id));
  const omitted = chunks.filter(chunk => !selectedIds.has(chunk.id));
  return {
    decisions: omitted.filter(chunk => chunk.source === 'decisions').length,
    history: omitted.filter(chunk => chunk.source === 'history').length,
  };
}

function tokenize(value: string): string[] {
  const runs = value
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
  const tokens: string[] = [];
  for (const run of runs) {
    const characters = [...run];
    if (characters.some(character => character.codePointAt(0)! > 0x7f)) {
      if (characters.length >= 2) tokens.push(run);
      for (let index = 0; index < characters.length - 1; index++) {
        tokens.push(`${characters[index]}${characters[index + 1]}`);
      }
    } else if (characters.length >= 3) {
      tokens.push(run);
    }
  }
  return tokens;
}

function overlapScore(queryTokens: Set<string>, content: string): number {
  const contentTokens = new Set(tokenize(content));
  let score = 0;
  for (const token of queryTokens) {
    if (contentTokens.has(token)) score++;
  }
  return score;
}

function sourceOrder(source: RetrievalChunk['source']): number {
  return source === 'decisions' ? 0 : 1;
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  return value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback;
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
