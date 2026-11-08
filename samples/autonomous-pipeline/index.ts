#!/usr/bin/env node
/**
 * Autonomous Pipeline — Squad SDK Showcase Demo
 *
 * A self-contained terminal application demonstrating the full Squad runtime:
 * CastingEngine, CostTracker, TelemetryCollector, SkillRegistry,
 * StreamingPipeline, response-tier selection, and OTel observability.
 *
 * Agents autonomously pick up tasks, route follow-up work, record decisions,
 * and accumulate learnings — all visualized in a live terminal dashboard.
 *
 * @module samples/autonomous-pipeline
 */

import {
  CastingEngine,
  CostTracker,
  TelemetryCollector,
  SkillRegistry,
  selectResponseTier,
  StreamingPipeline,
  initSquadTelemetry,
  getTracer,
  getMeter,
  recordAgentSpawn,
  recordAgentDuration,
  recordAgentDestroy,
  recordTokenUsage,
  recordSessionCreated,
  recordSessionClosed,
  VERSION,
} from '@bradygaster/squad-sdk';
import type {
  CastMember,
  AgentRole,
  ResponseTier,
  SquadConfig,
  TierContext,
  SquadTelemetryHandle,
} from '@bradygaster/squad-sdk';
import chalk from 'chalk';

// ============================================================================
// Types
// ============================================================================

type TaskStatus = 'queued' | 'in-progress' | 'done';
type AgentStatus = 'idle' | 'working' | 'done';

interface PipelineTask {
  id: string;
  title: string;
  description: string;
  requiredRole: AgentRole;
  complexity: number; // 1-5, drives simulated duration
  status: TaskStatus;
  assignedTo?: string;
  result?: string;
  startedAt?: number;
  completedAt?: number;
}

interface AgentState {
  member: CastMember;
  status: AgentStatus;
  currentTask?: PipelineTask;
  tasksCompleted: number;
  sessionId: string;
}

interface TimelineEntry {
  timestamp: number;
  agent: string;
  event: string;
  icon: string;
}

interface DecisionEntry {
  author: string;
  summary: string;
  timestamp: number;
}

interface MemoryEntry {
  agent: string;
  content: string;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const BANNER = `
╔══════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ${chalk.bold.cyan('⚡ SQUAD AUTONOMOUS PIPELINE')}                               ║
║   ${chalk.dim('Multi-agent task orchestration showcase')}                       ║
║                                                                ║
║   ${chalk.dim('SDK version:')} ${chalk.yellow(`v${VERSION}`).padEnd(52)}║
║                                                                ║
╚══════════════════════════════════════════════════════════════════╝
`;

const ROLE_ICONS: Record<string, string> = {
  lead: '👑',
  developer: '⚙️ ',
  tester: '🧪',
  scribe: '📝',
};

const STATUS_COLORS: Record<AgentStatus, (s: string) => string> = {
  idle: chalk.gray,
  working: chalk.yellow,
  done: chalk.green,
};

const TASK_STATUS_ICONS: Record<TaskStatus, string> = {
  queued: '◻️ ',
  'in-progress': '🔄',
  done: '✅',
};

// ============================================================================
// Minimal SquadConfig for tier selection demo
// ============================================================================

const DEMO_CONFIG: SquadConfig = {
  version: '1.0',
  team: { name: 'Pipeline Demo Squad' },
  routing: {
    rules: [
      { pattern: 'security|audit|vulnerability', agents: ['Hockney'], tier: 'full' },
      { pattern: 'document|docs|readme', agents: ['Verbal'], tier: 'lightweight' },
    ],
    defaultAgent: 'Keyser',
    fallbackBehavior: 'default-agent',
  },
  models: {
    default: 'claude-sonnet-4-20250514',
    defaultTier: 'standard',
    tiers: {
      premium: ['claude-sonnet-4-20250514'],
      standard: ['claude-sonnet-4-20250514'],
      fast: ['claude-haiku-3'],
    },
  },
  agents: [
    { name: 'Keyser', role: 'lead' },
    { name: 'McManus', role: 'developer' },
    { name: 'Fenster', role: 'tester' },
    { name: 'Verbal', role: 'scribe' },
  ],
};

// ============================================================================
// Task Queue
// ============================================================================

function createTaskQueue(): PipelineTask[] {
  return [
    {
      id: 'task-01',
      title: 'Design API schema',
      description: 'Define REST endpoints, request/response types, and auth flow for the user service.',
      requiredRole: 'lead',
      complexity: 2,
      status: 'queued',
    },
    {
      id: 'task-02',
      title: 'Implement auth endpoints',
      description: 'Build /login, /logout, /refresh token endpoints with JWT validation.',
      requiredRole: 'developer',
      complexity: 4,
      status: 'queued',
    },
    {
      id: 'task-03',
      title: 'Write unit tests for auth',
      description: 'Cover happy path, expired tokens, invalid credentials, and rate limiting.',
      requiredRole: 'tester',
      complexity: 3,
      status: 'queued',
    },
    {
      id: 'task-04',
      title: 'Document API endpoints',
      description: 'Write OpenAPI spec and developer guide for the auth service.',
      requiredRole: 'scribe',
      complexity: 2,
      status: 'queued',
    },
    {
      id: 'task-05',
      title: 'Implement user profiles',
      description: 'CRUD operations for user profiles with avatar upload and validation.',
      requiredRole: 'developer',
      complexity: 3,
      status: 'queued',
    },
    {
      id: 'task-06',
      title: 'Review auth implementation',
      description: 'Code review of auth endpoints — check for SQL injection, token leaks, error handling.',
      requiredRole: 'lead',
      complexity: 3,
      status: 'queued',
    },
    {
      id: 'task-07',
      title: 'Write integration tests',
      description: 'End-to-end test suite: register → login → access protected resource → logout.',
      requiredRole: 'tester',
      complexity: 4,
      status: 'queued',
    },
    {
      id: 'task-08',
      title: 'Security audit auth flow',
      description: 'Audit token storage, CORS policy, rate limiting, and password hashing.',
      requiredRole: 'lead',
      complexity: 4,
      status: 'queued',
    },
    {
      id: 'task-09',
      title: 'Update deployment docs',
      description: 'Document env vars, Docker setup, and CI/CD pipeline for the auth service.',
      requiredRole: 'scribe',
      complexity: 2,
      status: 'queued',
    },
    {
      id: 'task-10',
      title: 'Performance benchmark',
      description: 'Load test auth endpoints: measure p95 latency, throughput, and connection pooling.',
      requiredRole: 'developer',
      complexity: 3,
      status: 'queued',
    },
  ];
}

// ============================================================================
// Simulated work output (realistic agent responses)
// ============================================================================

const WORK_OUTPUTS: Record<string, string> = {
  'task-01': 'Schema defined: 4 endpoints, JWT bearer auth, typed request/response interfaces.',
  'task-02': 'Auth endpoints implemented: /login (POST), /logout (POST), /refresh (POST). bcrypt + JWT.',
  'task-03': '12 unit tests written. Coverage: 94%. Found edge case in token refresh — filed follow-up.',
  'task-04': 'OpenAPI 3.1 spec generated. Developer guide covers auth flow, error codes, rate limits.',
  'task-05': 'User profiles CRUD complete. Avatar upload via presigned S3 URLs. Validation with Zod.',
  'task-06': 'Review complete: 2 minor issues (error message leaks), 1 suggestion (add request IDs).',
  'task-07': '8 integration tests passing. Full flow: register → login → protected → logout → expired.',
  'task-08': 'Audit pass. Recommendations: rotate JWT signing key monthly, add OWASP headers.',
  'task-09': 'Deployment docs updated. Added Docker Compose example and Helm chart values.',
  'task-10': 'Benchmark: p95 = 45ms, 2.4k req/s sustained. Connection pool sized at 20.',
};

// ============================================================================
// Simulated cost data
// ============================================================================

function simulateCost(complexity: number): { inputTokens: number; outputTokens: number; cost: number } {
  const base = complexity * 800;
  const inputTokens = base + Math.floor(Math.random() * 400);
  const outputTokens = Math.floor(base * 0.6) + Math.floor(Math.random() * 300);
  const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;
  return { inputTokens, outputTokens, cost };
}

// ============================================================================
// Display Helpers
// ============================================================================

function printSection(title: string): void {
  console.log();
  console.log(chalk.bold.white(`  ── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`));
  console.log();
}

function printAgentStatus(agents: AgentState[]): void {
  printSection('AGENT STATUS');
  for (const agent of agents) {
    const icon = ROLE_ICONS[agent.member.role] ?? '🤖';
    const statusColor = STATUS_COLORS[agent.status];
    const statusLabel = statusColor(`[${agent.status.toUpperCase().padEnd(7)}]`);
    const taskInfo =
      agent.status === 'working' && agent.currentTask
        ? chalk.dim(` → ${agent.currentTask.title}`)
        : '';
    const completed = chalk.dim(` (${agent.tasksCompleted} done)`);
    console.log(
      `  ${icon} ${chalk.bold(agent.member.displayName.padEnd(24))} ${statusLabel}${taskInfo}${completed}`,
    );
  }
}

function printTaskQueue(tasks: PipelineTask[]): void {
  printSection('TASK QUEUE');
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const queued = tasks.filter((t) => t.status === 'queued').length;

  // Progress bar
  const barWidth = 40;
  const filled = Math.round((done / total) * barWidth);
  const active = Math.round((inProgress / total) * barWidth);
  const bar =
    chalk.green('█'.repeat(filled)) +
    chalk.yellow('█'.repeat(active)) +
    chalk.gray('░'.repeat(Math.max(0, barWidth - filled - active)));
  console.log(`  ${bar} ${done}/${total} complete`);
  console.log(
    chalk.dim(`  ${queued} queued · ${inProgress} in progress · ${done} done`),
  );
  console.log();

  for (const task of tasks) {
    const icon = TASK_STATUS_ICONS[task.status];
    const title =
      task.status === 'done'
        ? chalk.strikethrough.dim(task.title)
        : task.status === 'in-progress'
          ? chalk.yellow(task.title)
          : chalk.white(task.title);
    const assignee = task.assignedTo ? chalk.dim(` [${task.assignedTo}]`) : '';
    console.log(`  ${icon} ${title}${assignee}`);
  }
}

function printTimeline(timeline: TimelineEntry[]): void {
  printSection('TIMELINE');
  const recent = timeline.slice(-8);
  for (const entry of recent) {
    const elapsed = ((entry.timestamp - timeline[0].timestamp) / 1000).toFixed(1);
    console.log(
      `  ${chalk.dim(`+${elapsed.padStart(5)}s`)} ${entry.icon} ${chalk.bold(entry.agent.padEnd(10))} ${entry.event}`,
    );
  }
  if (timeline.length > 8) {
    console.log(chalk.dim(`  ... and ${timeline.length - 8} earlier events`));
  }
}

function printDecisions(decisions: DecisionEntry[]): void {
  if (decisions.length === 0) return;
  printSection('DECISIONS');
  for (const d of decisions) {
    console.log(`  📋 ${chalk.bold(d.author)}: ${chalk.italic(d.summary)}`);
  }
}

function printCostSummary(tracker: CostTracker): void {
  printSection('COST TRACKER');
  const summary = tracker.getSummary();
  console.log(
    `  💰 Total: ${chalk.green(`$${summary.totalEstimatedCost.toFixed(4)}`)}  ` +
      `${chalk.dim(`${summary.totalInputTokens.toLocaleString()} in / ${summary.totalOutputTokens.toLocaleString()} out`)}`,
  );
  console.log();
  for (const [name, entry] of summary.agents) {
    const pct = summary.totalEstimatedCost > 0
      ? ((entry.estimatedCost / summary.totalEstimatedCost) * 100).toFixed(0)
      : '0';
    const costBar = chalk.cyan('▓'.repeat(Math.max(1, Math.round(Number(pct) / 5))));
    console.log(
      `  ${costBar} ${chalk.bold(name.padEnd(12))} $${entry.estimatedCost.toFixed(4)} (${pct}%) · ${entry.turnCount} turns`,
    );
  }
}

function printSkillMatches(
  registry: SkillRegistry,
  task: PipelineTask,
  agentRole: string,
): void {
  const matches = registry.matchSkills(task.description, agentRole);
  if (matches.length > 0) {
    const top = matches[0];
    console.log(
      chalk.dim(`      📚 Skill match: "${top.skill.id}" (score: ${top.score.toFixed(2)}) — ${top.reason}`),
    );
  }
}

// ============================================================================
// Final Report
// ============================================================================

function printFinalReport(
  agents: AgentState[],
  tasks: PipelineTask[],
  decisions: DecisionEntry[],
  memories: MemoryEntry[],
  tracker: CostTracker,
  timeline: TimelineEntry[],
  startTime: number,
): void {
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const summary = tracker.getSummary();

  console.log();
  console.log(chalk.bold.cyan('╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║') + chalk.bold.white('                    PIPELINE COMPLETE                            ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════════════════╝'));
  console.log();

  // Stats grid
  const statsRow = (label: string, value: string) =>
    `  ${chalk.dim(label.padEnd(24))} ${chalk.bold(value)}`;

  console.log(statsRow('Total tasks:', `${tasks.length}`));
  console.log(statsRow('Tasks completed:', `${tasks.filter((t) => t.status === 'done').length}`));
  console.log(statsRow('Agents deployed:', `${agents.length}`));
  console.log(statsRow('Decisions recorded:', `${decisions.length}`));
  console.log(statsRow('Memories written:', `${memories.length}`));
  console.log(statsRow('Timeline events:', `${timeline.length}`));
  console.log(statsRow('Wall clock time:', `${totalTime}s`));
  console.log(statsRow('Total tokens:', `${(summary.totalInputTokens + summary.totalOutputTokens).toLocaleString()}`));
  console.log(statsRow('Estimated cost:', chalk.green(`$${summary.totalEstimatedCost.toFixed(4)}`)));
  console.log();

  // Per-agent summary
  printSection('AGENT SCOREBOARD');
  const sorted = [...agents].sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    const agentCost = summary.agents.get(a.member.name);
    const costStr = agentCost ? `$${agentCost.estimatedCost.toFixed(4)}` : '$0.0000';
    console.log(
      `  ${medal} ${chalk.bold(a.member.displayName.padEnd(26))} ${a.tasksCompleted} tasks · ${costStr}`,
    );
  }

  // OTel note
  console.log();
  if (process.env['OTEL_EXPORTER_OTLP_ENDPOINT']) {
    console.log(
      chalk.green(
        '  ✅ OTel telemetry exported → ' + process.env['OTEL_EXPORTER_OTLP_ENDPOINT'],
      ),
    );
    console.log(chalk.dim('     Open Aspire dashboard at http://localhost:18888 to view traces & metrics'));
  } else {
    console.log(
      chalk.dim(
        '  💡 Set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 to export to Aspire dashboard',
      ),
    );
  }

  console.log();
  console.log(chalk.dim(`  Squad SDK v${VERSION} · github.com/github/squad`));
  console.log();
}

// ============================================================================
// Skill definitions for the demo
// ============================================================================

function registerDemoSkills(registry: SkillRegistry): void {
  registry.registerSkill({
    id: 'jwt-auth',
    name: 'JWT Authentication',
    domain: 'auth',
    triggers: ['jwt', 'token', 'auth', 'login', 'refresh'],
    agentRoles: ['developer', 'security'],
    content: '# JWT Auth\n\nUse RS256 signing. Rotate keys monthly. Store refresh tokens server-side.',
  });

  registry.registerSkill({
    id: 'api-testing',
    name: 'API Testing Patterns',
    domain: 'testing',
    triggers: ['test', 'unit test', 'integration', 'coverage'],
    agentRoles: ['tester'],
    content: '# API Testing\n\nArrange-Act-Assert. Mock external deps. Aim for 90%+ coverage.',
  });

  registry.registerSkill({
    id: 'openapi-docs',
    name: 'OpenAPI Documentation',
    domain: 'documentation',
    triggers: ['document', 'openapi', 'spec', 'docs', 'api'],
    agentRoles: ['scribe'],
    content: '# OpenAPI\n\nUse 3.1 spec. Include examples for every endpoint. Validate with spectral.',
  });

  registry.registerSkill({
    id: 'security-audit',
    name: 'Security Audit Checklist',
    domain: 'security',
    triggers: ['security', 'audit', 'owasp', 'vulnerability', 'injection'],
    agentRoles: ['lead', 'security'],
    content: '# Security Audit\n\nCheck: SQL injection, XSS, CSRF, auth bypass, token storage, CORS.',
  });
}

// ============================================================================
// Core simulation logic
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findNextTask(tasks: PipelineTask[], role: AgentRole): PipelineTask | undefined {
  return tasks.find((t) => t.status === 'queued' && t.requiredRole === role);
}

/** Simulate the squad_route pattern — generates a follow-up task. */
function maybeRouteFollowUp(
  task: PipelineTask,
  agent: AgentState,
  tasks: PipelineTask[],
  timeline: TimelineEntry[],
): void {
  // After implementing auth, route testing work
  if (task.id === 'task-02') {
    timeline.push({
      timestamp: Date.now(),
      agent: agent.member.name,
      event: `squad_route → Fenster: "Write tests for auth endpoints"`,
      icon: '🔀',
    });
  }
  // After security audit, route doc update
  if (task.id === 'task-08') {
    const followUp: PipelineTask = {
      id: `task-fu-${Date.now()}`,
      title: 'Add OWASP security headers',
      description: 'Implement recommended security headers from audit findings.',
      requiredRole: 'developer',
      complexity: 2,
      status: 'queued',
    };
    tasks.push(followUp);
    timeline.push({
      timestamp: Date.now(),
      agent: agent.member.name,
      event: `squad_route → McManus: "${followUp.title}"`,
      icon: '🔀',
    });
  }
}

/** Simulate the squad_decide pattern. */
function maybeRecordDecision(
  task: PipelineTask,
  agent: AgentState,
  decisions: DecisionEntry[],
  timeline: TimelineEntry[],
): void {
  if (task.id === 'task-01') {
    decisions.push({
      author: agent.member.name,
      summary: 'Use JWT with RS256 signing for auth — enables key rotation without redeployment.',
      timestamp: Date.now(),
    });
    timeline.push({
      timestamp: Date.now(),
      agent: agent.member.name,
      event: 'squad_decide: "Use JWT with RS256 signing"',
      icon: '📋',
    });
  }
  if (task.id === 'task-06') {
    decisions.push({
      author: agent.member.name,
      summary: 'Add request-ID headers to all endpoints for distributed tracing.',
      timestamp: Date.now(),
    });
    timeline.push({
      timestamp: Date.now(),
      agent: agent.member.name,
      event: 'squad_decide: "Add request-ID headers"',
      icon: '📋',
    });
  }
  if (task.id === 'task-08') {
    decisions.push({
      author: agent.member.name,
      summary: 'Rotate JWT signing keys on a monthly schedule via automated ceremony.',
      timestamp: Date.now(),
    });
    timeline.push({
      timestamp: Date.now(),
      agent: agent.member.name,
      event: 'squad_decide: "Monthly JWT key rotation"',
      icon: '📋',
    });
  }
}

/** Simulate the squad_memory pattern. */
function maybeRecordMemory(
  task: PipelineTask,
  agent: AgentState,
  memories: MemoryEntry[],
  timeline: TimelineEntry[],
): void {
  if (task.id === 'task-03') {
    memories.push({
      agent: agent.member.name,
      content: 'Token refresh edge case: expired refresh token returns 401, not 403.',
      timestamp: Date.now(),
    });
    timeline.push({
      timestamp: Date.now(),
      agent: agent.member.name,
      event: 'squad_memory: "Token refresh returns 401"',
      icon: '🧠',
    });
  }
  if (task.id === 'task-05') {
    memories.push({
      agent: agent.member.name,
      content: 'Avatar uploads use presigned S3 URLs — max 5MB, image/* MIME only.',
      timestamp: Date.now(),
    });
    timeline.push({
      timestamp: Date.now(),
      agent: agent.member.name,
      event: 'squad_memory: "Avatar S3 presigned URLs"',
      icon: '🧠',
    });
  }
  if (task.id === 'task-10') {
    memories.push({
      agent: agent.member.name,
      content: 'Connection pool sweet spot: 20 connections for 2.4k req/s sustained load.',
      timestamp: Date.now(),
    });
    timeline.push({
      timestamp: Date.now(),
      agent: agent.member.name,
      event: 'squad_memory: "Pool size 20 optimal"',
      icon: '🧠',
    });
  }
}

// ============================================================================
// OTel metrics instrumentation
// ============================================================================

function emitOTelMetrics(agent: AgentState, task: PipelineTask, durationMs: number, cost: ReturnType<typeof simulateCost>): void {
  const tracer = getTracer('squad-pipeline-demo');
  const span = tracer.startSpan('pipeline.task.execute', {
    attributes: {
      'agent.name': agent.member.name,
      'agent.role': agent.member.role,
      'task.id': task.id,
      'task.title': task.title,
      'task.complexity': task.complexity,
      'duration_ms': durationMs,
    },
  });
  span.end();

  recordAgentDuration(agent.member.name, durationMs, 'success');

  recordTokenUsage({
    type: 'usage',
    sessionId: agent.sessionId,
    agentName: agent.member.name,
    model: 'claude-sonnet-4-20250514',
    inputTokens: cost.inputTokens,
    outputTokens: cost.outputTokens,
    estimatedCost: cost.cost,
    timestamp: new Date(),
  });
}

// ============================================================================
// Main pipeline
// ============================================================================

export async function runPipeline(): Promise<void> {
  const startTime = Date.now();

  // ── OTel initialization (connects to Aspire if endpoint is configured) ──
  let telemetryHandle: SquadTelemetryHandle | undefined;
  const otelEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
  if (otelEndpoint) {
    telemetryHandle = initSquadTelemetry({
      endpoint: otelEndpoint,
      serviceName: 'squad-pipeline-demo',
    } as Parameters<typeof initSquadTelemetry>[0]);
    console.log(chalk.green(`  ✅ OTel connected → ${otelEndpoint}`));
  }

  // ── Print banner ──
  console.log(BANNER);

  // ── Cast the team ──
  printSection('CASTING');
  const engine = new CastingEngine();
  const cast = engine.castTeam({
    universe: 'usual-suspects',
    requiredRoles: ['lead', 'developer', 'tester', 'scribe'],
    teamSize: 4,
  });
  for (const member of cast) {
    console.log(
      `  ${ROLE_ICONS[member.role] ?? '🤖'} ${chalk.bold(member.displayName)} — ${chalk.italic.dim(member.personality)}`,
    );
  }

  // ── Initialize SDK components ──
  const costTracker = new CostTracker();
  const telemetry = new TelemetryCollector({ enabled: true });
  const skillRegistry = new SkillRegistry();
  const streaming = new StreamingPipeline();

  registerDemoSkills(skillRegistry);

  telemetry.collectEvent({ name: 'squad.init', properties: { agents: cast.length, sample: 'autonomous-pipeline' } });

  // ── Build agent states ──
  const agents: AgentState[] = cast.map((member, i) => {
    const sessionId = `session-${member.name.toLowerCase()}-${i}`;
    streaming.attachToSession(sessionId);
    recordSessionCreated();
    recordAgentSpawn(member.name);
    telemetry.collectEvent({ name: 'squad.agent.spawn', properties: { agent: member.name, role: member.role } });
    return {
      member,
      status: 'idle' as AgentStatus,
      tasksCompleted: 0,
      sessionId,
    };
  });

  // ── Task queue ──
  const tasks = createTaskQueue();
  const timeline: TimelineEntry[] = [];
  const decisions: DecisionEntry[] = [];
  const memories: MemoryEntry[] = [];

  timeline.push({
    timestamp: Date.now(),
    agent: 'System',
    event: `Pipeline started with ${agents.length} agents and ${tasks.length} tasks`,
    icon: '🚀',
  });

  // ── Show initial state ──
  printAgentStatus(agents);
  printTaskQueue(tasks);
  console.log();

  // ── Response tier demonstration ──
  printSection('RESPONSE TIER SELECTION');
  const tierContext: TierContext = {
    agentAvailability: agents.map((a) => a.member.name),
    currentLoad: 0,
  };
  for (const task of tasks.slice(0, 3)) {
    const tier: ResponseTier = selectResponseTier(task.description, DEMO_CONFIG, tierContext);
    console.log(
      `  ${chalk.dim(task.title.padEnd(30))} → tier: ${chalk.bold(tier.tier.padEnd(12))} model: ${chalk.cyan(tier.modelTier)} (max ${tier.maxAgents} agents, ${tier.timeout}s timeout)`,
    );
  }

  // ── Autonomous execution loop ──
  printSection('AUTONOMOUS EXECUTION');
  console.log(chalk.dim('  Agents will autonomously pick up and execute tasks...\n'));

  await sleep(500);

  let round = 0;
  while (tasks.some((t) => t.status !== 'done')) {
    round++;
    let anyWorking = false;

    for (const agent of agents) {
      if (agent.status === 'working') {
        anyWorking = true;
        continue;
      }

      // Find a task matching this agent's role
      const task = findNextTask(tasks, agent.member.role);
      if (!task) continue;

      // Assign task
      task.status = 'in-progress';
      task.assignedTo = agent.member.name;
      task.startedAt = Date.now();
      agent.status = 'working';
      agent.currentTask = task;
      anyWorking = true;

      const icon = ROLE_ICONS[agent.member.role] ?? '🤖';
      console.log(
        `  ${icon} ${chalk.bold(agent.member.name)} ${chalk.yellow('picking up')} → ${chalk.white(task.title)}`,
      );

      // Show skill match
      printSkillMatches(skillRegistry, task, agent.member.role);

      timeline.push({
        timestamp: Date.now(),
        agent: agent.member.name,
        event: `Started: ${task.title}`,
        icon: '▶️',
      });

      // Simulate streaming work
      streaming.markMessageStart(agent.sessionId);
      const workDuration = 400 + task.complexity * 300 + Math.floor(Math.random() * 500);

      // Process simulated streaming deltas
      const chunkCount = 3 + Math.floor(Math.random() * 4);
      for (let ci = 0; ci < chunkCount; ci++) {
        await sleep(Math.floor(workDuration / chunkCount));
        await streaming.processEvent({
          type: 'message_delta',
          sessionId: agent.sessionId,
          agentName: agent.member.name,
          content: `chunk-${ci}`,
          index: ci,
          timestamp: new Date(),
        });
      }

      // Compute cost and record usage
      const cost = simulateCost(task.complexity);
      await streaming.processEvent({
        type: 'usage',
        sessionId: agent.sessionId,
        agentName: agent.member.name,
        model: 'claude-sonnet-4-20250514',
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        estimatedCost: cost.cost,
        timestamp: new Date(),
      });

      costTracker.recordUsage({
        sessionId: agent.sessionId,
        agentName: agent.member.name,
        model: 'claude-sonnet-4-20250514',
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        estimatedCost: cost.cost,
      });

      const durationMs = Date.now() - (task.startedAt ?? Date.now());

      // OTel instrumentation
      emitOTelMetrics(agent, task, durationMs, cost);

      // Complete the task
      task.status = 'done';
      task.completedAt = Date.now();
      task.result = WORK_OUTPUTS[task.id] ?? 'Task completed successfully.';
      agent.status = 'idle';
      agent.currentTask = undefined;
      agent.tasksCompleted++;

      console.log(
        `  ${chalk.green('✓')} ${chalk.bold(agent.member.name)} ${chalk.green('completed')} → ${chalk.dim(task.result.slice(0, 70))}...`,
      );
      console.log(
        chalk.dim(`      ${cost.inputTokens} in / ${cost.outputTokens} out · $${cost.cost.toFixed(4)} · ${durationMs}ms`),
      );

      timeline.push({
        timestamp: Date.now(),
        agent: agent.member.name,
        event: `Completed: ${task.title} (${durationMs}ms)`,
        icon: '✅',
      });

      // Trigger squad_route / squad_decide / squad_memory patterns
      maybeRouteFollowUp(task, agent, tasks, timeline);
      maybeRecordDecision(task, agent, decisions, timeline);
      maybeRecordMemory(task, agent, memories, timeline);

      telemetry.collectEvent({
        name: 'squad.run',
        properties: {
          agent: agent.member.name,
          task: task.id,
          durationMs,
          inputTokens: cost.inputTokens,
          outputTokens: cost.outputTokens,
        },
      });

      console.log();
    }

    // If no agent did anything this round, wait briefly
    if (!anyWorking) {
      await sleep(100);
    }
  }

  // ── Mark agents done ──
  for (const agent of agents) {
    agent.status = 'done';
    recordAgentDestroy(agent.member.name);
    recordSessionClosed();
  }

  timeline.push({
    timestamp: Date.now(),
    agent: 'System',
    event: `All ${tasks.length} tasks complete`,
    icon: '🏁',
  });

  telemetry.collectEvent({
    name: 'squad.run',
    properties: {
      totalTasks: tasks.length,
      totalAgents: agents.length,
      wallClockMs: Date.now() - startTime,
    },
  });

  // ── Final dashboard ──
  printAgentStatus(agents);
  printTaskQueue(tasks);
  printTimeline(timeline);
  printDecisions(decisions);
  printCostSummary(costTracker);
  printFinalReport(agents, tasks, decisions, memories, costTracker, timeline, startTime);

  // ── OTel shutdown ──
  if (telemetryHandle) {
    await telemetryHandle.shutdown();
    console.log(chalk.dim('  OTel telemetry flushed and shut down.'));
  }

  // Clean up streaming
  for (const agent of agents) {
    streaming.detachFromSession(agent.sessionId);
  }
  streaming.clear();
}

// ── Entry point ──
runPipeline().catch((err) => {
  console.error(chalk.red('Pipeline failed:'), err);
  process.exit(1);
});
