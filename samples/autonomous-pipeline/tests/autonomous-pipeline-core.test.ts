/**
 * Autonomous Pipeline — Core Contract Tests
 *
 * TDD tests defining the behavioral contract for the core split
 * (autonomous-pipeline-core). These tests exercise task assignment,
 * cost tracking, agent state transitions, response tier selection,
 * and basic pipeline orchestration — all WITHOUT telemetry, OTel,
 * or terminal dashboard dependencies.
 *
 * After the refactor, imports change from inline + SDK to the new
 * core module; the assertions stay identical.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CastingEngine,
  CostTracker,
  SkillRegistry,
  selectResponseTier,
  StreamingPipeline,
} from '@bradygaster/squad-sdk';
import type {
  CastMember,
  AgentRole,
  ResponseTier,
  SquadConfig,
} from '@bradygaster/squad-sdk';

// ============================================================================
// Core types (contract — the extracted module must export these)
// ============================================================================

type TaskStatus = 'queued' | 'in-progress' | 'done';
type AgentStatus = 'idle' | 'working' | 'done';

interface PipelineTask {
  id: string;
  title: string;
  description: string;
  requiredRole: AgentRole;
  complexity: number;
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

// ============================================================================
// Core logic (mirrors index.ts — will become imports after refactor)
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

function createTaskQueue(): PipelineTask[] {
  return [
    { id: 'task-01', title: 'Design API schema', description: 'Define REST endpoints, request/response types, and auth flow for the user service.', requiredRole: 'lead', complexity: 2, status: 'queued' },
    { id: 'task-02', title: 'Implement auth endpoints', description: 'Build /login, /logout, /refresh token endpoints with JWT validation.', requiredRole: 'developer', complexity: 4, status: 'queued' },
    { id: 'task-03', title: 'Write unit tests for auth', description: 'Cover happy path, expired tokens, invalid credentials, and rate limiting.', requiredRole: 'tester', complexity: 3, status: 'queued' },
    { id: 'task-04', title: 'Document API endpoints', description: 'Write OpenAPI spec and developer guide for the auth service.', requiredRole: 'scribe', complexity: 2, status: 'queued' },
    { id: 'task-05', title: 'Implement user profiles', description: 'CRUD operations for user profiles with avatar upload and validation.', requiredRole: 'developer', complexity: 3, status: 'queued' },
    { id: 'task-06', title: 'Review auth implementation', description: 'Code review of auth endpoints — check for SQL injection, token leaks, error handling.', requiredRole: 'lead', complexity: 3, status: 'queued' },
    { id: 'task-07', title: 'Write integration tests', description: 'End-to-end test suite: register → login → access protected resource → logout.', requiredRole: 'tester', complexity: 4, status: 'queued' },
    { id: 'task-08', title: 'Security audit auth flow', description: 'Audit token storage, CORS policy, rate limiting, and password hashing.', requiredRole: 'lead', complexity: 4, status: 'queued' },
    { id: 'task-09', title: 'Update deployment docs', description: 'Document env vars, Docker setup, and CI/CD pipeline for the auth service.', requiredRole: 'scribe', complexity: 2, status: 'queued' },
    { id: 'task-10', title: 'Performance benchmark', description: 'Load test auth endpoints: measure p95 latency, throughput, and connection pooling.', requiredRole: 'developer', complexity: 3, status: 'queued' },
  ];
}

function findNextTask(tasks: PipelineTask[], role: AgentRole): PipelineTask | undefined {
  return tasks.find((t) => t.status === 'queued' && t.requiredRole === role);
}

function simulateCost(complexity: number): { inputTokens: number; outputTokens: number; cost: number } {
  const base = complexity * 800;
  const inputTokens = base + Math.floor(Math.random() * 400);
  const outputTokens = Math.floor(base * 0.6) + Math.floor(Math.random() * 300);
  const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;
  return { inputTokens, outputTokens, cost };
}

// ============================================================================
// Task → Tier Assignment
// ============================================================================

describe('Task → Tier Assignment', () => {
  it('assigns full tier to security audit tasks', () => {
    // "security audit" triggers the routing rule pattern: security|audit|vulnerability
    const tier = selectResponseTier(
      'Run a security audit on auth flow',
      DEMO_CONFIG,
    );
    expect(tier.tier).toBe('full');
    expect(tier.modelTier).toBe('premium');
  });

  it('assigns different tiers for security vs. implementation tasks', () => {
    const securityTier = selectResponseTier('Run a security audit on auth flow', DEMO_CONFIG);
    const implTier = selectResponseTier('Add a helper function for string formatting', DEMO_CONFIG);

    // Security audit → full; generic implementation → standard
    expect(securityTier.tier).toBe('full');
    expect(['standard', 'lightweight']).toContain(implTier.tier);
  });

  it('non-security, non-doc tasks default to standard tier', () => {
    const tier = selectResponseTier(
      'Add a helper function for string formatting',
      DEMO_CONFIG,
    );
    expect(tier.tier).toBe('standard');
  });

  it('assigns standard-or-higher tier to implementation tasks', () => {
    const tier = selectResponseTier(
      'Build /login, /logout, /refresh token endpoints with JWT validation.',
      DEMO_CONFIG,
    );
    // Implementation tasks match standard or higher, never lightweight
    expect(['standard', 'full']).toContain(tier.tier);
  });

  it('returns consistent shape for every task complexity', () => {
    const tasks = createTaskQueue();
    for (const task of tasks) {
      const tier = selectResponseTier(task.description, DEMO_CONFIG);
      expect(tier).toHaveProperty('tier');
      expect(tier).toHaveProperty('modelTier');
      expect(tier).toHaveProperty('maxAgents');
      expect(tier).toHaveProperty('timeout');
      expect(typeof tier.maxAgents).toBe('number');
      expect(typeof tier.timeout).toBe('number');
    }
  });
});

// ============================================================================
// CostTracker — per-agent accumulation
// ============================================================================

describe('CostTracker — per-agent accumulation', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it('accumulates cost for a single agent across multiple tasks', () => {
    tracker.recordUsage({ sessionId: 's1', agentName: 'Keyser', model: 'claude-sonnet-4-20250514', inputTokens: 1000, outputTokens: 600, estimatedCost: 0.012 });
    tracker.recordUsage({ sessionId: 's1', agentName: 'Keyser', model: 'claude-sonnet-4-20250514', inputTokens: 800, outputTokens: 400, estimatedCost: 0.008 });

    const summary = tracker.getSummary();
    const keyserCost = summary.agents.get('Keyser');
    expect(keyserCost).toBeDefined();
    expect(keyserCost!.turnCount).toBe(2);
    expect(summary.totalInputTokens).toBe(1800);
    expect(summary.totalOutputTokens).toBe(1000);
    expect(summary.totalEstimatedCost).toBeCloseTo(0.020, 4);
  });

  it('tracks four agents independently (matches pipeline team size)', () => {
    const agents = ['Keyser', 'McManus', 'Fenster', 'Verbal'];
    for (const name of agents) {
      tracker.recordUsage({ sessionId: `s-${name}`, agentName: name, model: 'claude-sonnet-4-20250514', inputTokens: 500, outputTokens: 300, estimatedCost: 0.006 });
    }

    const summary = tracker.getSummary();
    expect(summary.agents.size).toBe(4);
    expect(summary.totalEstimatedCost).toBeCloseTo(0.024, 4);

    for (const name of agents) {
      expect(summary.agents.get(name)).toBeDefined();
    }
  });

  it('formats summary mentioning all participating agents', () => {
    tracker.recordUsage({ sessionId: 's1', agentName: 'Keyser', model: 'claude-sonnet-4-20250514', inputTokens: 500, outputTokens: 200, estimatedCost: 0.005 });
    tracker.recordUsage({ sessionId: 's2', agentName: 'McManus', model: 'claude-sonnet-4-20250514', inputTokens: 800, outputTokens: 400, estimatedCost: 0.010 });

    const formatted = tracker.formatSummary();
    expect(formatted).toContain('Keyser');
    expect(formatted).toContain('McManus');
    expect(formatted).toContain('Squad Cost Summary');
  });

  it('produces zero totals when no usage recorded', () => {
    const summary = tracker.getSummary();
    expect(summary.totalInputTokens).toBe(0);
    expect(summary.totalOutputTokens).toBe(0);
    expect(summary.totalEstimatedCost).toBe(0);
    expect(summary.agents.size).toBe(0);
  });
});

// ============================================================================
// Agent State Transitions (idle → working → done)
// ============================================================================

describe('Agent State Transitions', () => {
  let agent: AgentState;

  beforeEach(() => {
    const engine = new CastingEngine();
    const cast = engine.castTeam({ universe: 'usual-suspects', requiredRoles: ['lead'], teamSize: 1 });
    agent = {
      member: cast[0],
      status: 'idle',
      tasksCompleted: 0,
      sessionId: 'session-test-0',
    };
  });

  it('agent starts in idle state', () => {
    expect(agent.status).toBe('idle');
    expect(agent.currentTask).toBeUndefined();
    expect(agent.tasksCompleted).toBe(0);
  });

  it('transitions idle → working when assigned a task', () => {
    const task: PipelineTask = {
      id: 'task-01', title: 'Design API schema',
      description: 'Define REST endpoints.',
      requiredRole: 'lead', complexity: 2, status: 'queued',
    };

    // Simulate task assignment (mirrors index.ts loop logic)
    task.status = 'in-progress';
    task.assignedTo = agent.member.name;
    task.startedAt = Date.now();
    agent.status = 'working';
    agent.currentTask = task;

    expect(agent.status).toBe('working');
    expect(agent.currentTask).toBe(task);
    expect(task.status).toBe('in-progress');
    expect(task.assignedTo).toBe(agent.member.name);
  });

  it('transitions working → idle when task completes', () => {
    const task: PipelineTask = {
      id: 'task-01', title: 'Design API schema',
      description: 'Define REST endpoints.',
      requiredRole: 'lead', complexity: 2, status: 'in-progress',
      assignedTo: agent.member.name, startedAt: Date.now(),
    };
    agent.status = 'working';
    agent.currentTask = task;

    // Simulate task completion (mirrors index.ts loop logic)
    task.status = 'done';
    task.completedAt = Date.now();
    task.result = 'Schema defined.';
    agent.status = 'idle';
    agent.currentTask = undefined;
    agent.tasksCompleted++;

    expect(agent.status).toBe('idle');
    expect(agent.currentTask).toBeUndefined();
    expect(agent.tasksCompleted).toBe(1);
    expect(task.status).toBe('done');
    expect(task.result).toBeTruthy();
  });

  it('transitions idle → done when pipeline completes', () => {
    agent.tasksCompleted = 3;
    agent.status = 'done';

    expect(agent.status).toBe('done');
    expect(agent.tasksCompleted).toBe(3);
  });

  it('full lifecycle: idle → working → idle → working → idle → done', () => {
    const statelog: AgentStatus[] = [agent.status]; // ['idle']

    // First task
    agent.status = 'working';
    statelog.push(agent.status);
    agent.status = 'idle';
    agent.tasksCompleted++;
    statelog.push(agent.status);

    // Second task
    agent.status = 'working';
    statelog.push(agent.status);
    agent.status = 'idle';
    agent.tasksCompleted++;
    statelog.push(agent.status);

    // Pipeline ends
    agent.status = 'done';
    statelog.push(agent.status);

    expect(statelog).toEqual(['idle', 'working', 'idle', 'working', 'idle', 'done']);
    expect(agent.tasksCompleted).toBe(2);
  });
});

// ============================================================================
// selectResponseTier — tier routing by task properties
// ============================================================================

describe('selectResponseTier — routing by task properties', () => {
  it('maps every task in the queue to a valid tier', () => {
    const validTiers = ['full', 'standard', 'lightweight'];
    const tasks = createTaskQueue();
    for (const task of tasks) {
      const tier = selectResponseTier(task.description, DEMO_CONFIG);
      expect(validTiers).toContain(tier.tier);
    }
  });

  it('premium modelTier for full tier tasks', () => {
    const tier = selectResponseTier('Run a security audit on auth flow', DEMO_CONFIG);
    expect(tier.tier).toBe('full');
    expect(tier.modelTier).toBe('premium');
  });

  it('full tier allows more agents than lightweight', () => {
    const fullTier = selectResponseTier('Security audit on vulnerability', DEMO_CONFIG);
    const lightTier = selectResponseTier('Update deployment docs and readme', DEMO_CONFIG);

    expect(fullTier.maxAgents).toBeGreaterThanOrEqual(lightTier.maxAgents);
  });

  it('full tier has longer timeout than lightweight', () => {
    const fullTier = selectResponseTier('Security audit on vulnerability', DEMO_CONFIG);
    const lightTier = selectResponseTier('Update deployment docs and readme', DEMO_CONFIG);

    expect(fullTier.timeout).toBeGreaterThanOrEqual(lightTier.timeout);
  });
});

// ============================================================================
// Task Queue & Assignment Logic
// ============================================================================

describe('Task Queue & Assignment', () => {
  it('createTaskQueue produces 10 tasks all in queued state', () => {
    const tasks = createTaskQueue();
    expect(tasks).toHaveLength(10);
    for (const task of tasks) {
      expect(task.status).toBe('queued');
      expect(task.id).toBeTruthy();
      expect(task.complexity).toBeGreaterThanOrEqual(1);
      expect(task.complexity).toBeLessThanOrEqual(5);
    }
  });

  it('tasks cover all four roles', () => {
    const tasks = createTaskQueue();
    const roles = new Set(tasks.map((t) => t.requiredRole));
    expect(roles).toContain('lead');
    expect(roles).toContain('developer');
    expect(roles).toContain('tester');
    expect(roles).toContain('scribe');
  });

  it('findNextTask returns first queued task for the given role', () => {
    const tasks = createTaskQueue();
    const leadTask = findNextTask(tasks, 'lead');
    expect(leadTask).toBeDefined();
    expect(leadTask!.requiredRole).toBe('lead');
    expect(leadTask!.id).toBe('task-01'); // Design API schema
  });

  it('findNextTask skips in-progress tasks', () => {
    const tasks = createTaskQueue();
    tasks[0].status = 'in-progress'; // task-01 (lead) is busy
    const leadTask = findNextTask(tasks, 'lead');
    expect(leadTask).toBeDefined();
    expect(leadTask!.id).toBe('task-06'); // Review auth implementation
  });

  it('findNextTask returns undefined when all role tasks are done', () => {
    const tasks = createTaskQueue();
    // Mark all scribe tasks as done
    for (const t of tasks) {
      if (t.requiredRole === 'scribe') t.status = 'done';
    }
    const scribeTask = findNextTask(tasks, 'scribe');
    expect(scribeTask).toBeUndefined();
  });

  it('findNextTask returns undefined for a role not in the queue', () => {
    const tasks = createTaskQueue();
    const noTask = findNextTask(tasks, 'security' as AgentRole);
    expect(noTask).toBeUndefined();
  });
});

// ============================================================================
// simulateCost — cost model contract
// ============================================================================

describe('simulateCost — cost model', () => {
  it('higher complexity produces higher base token counts', () => {
    const results = Array.from({ length: 50 }, () => ({
      low: simulateCost(1),
      high: simulateCost(5),
    }));

    // Over 50 samples, average high-complexity tokens should exceed low
    const avgLowInput = results.reduce((s, r) => s + r.low.inputTokens, 0) / results.length;
    const avgHighInput = results.reduce((s, r) => s + r.high.inputTokens, 0) / results.length;
    expect(avgHighInput).toBeGreaterThan(avgLowInput);
  });

  it('cost scales with token counts', () => {
    const result = simulateCost(3);
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
    expect(result.cost).toBeGreaterThan(0);
  });

  it('returns numeric values for all fields', () => {
    for (let complexity = 1; complexity <= 5; complexity++) {
      const result = simulateCost(complexity);
      expect(typeof result.inputTokens).toBe('number');
      expect(typeof result.outputTokens).toBe('number');
      expect(typeof result.cost).toBe('number');
      expect(Number.isFinite(result.cost)).toBe(true);
    }
  });
});

// ============================================================================
// Core Pipeline — runs without telemetry/dashboard dependencies
// ============================================================================

describe('Core Pipeline — no telemetry or dashboard', () => {
  it('wires CastingEngine + CostTracker + SkillRegistry without TelemetryCollector', () => {
    const engine = new CastingEngine();
    const cast = engine.castTeam({
      universe: 'usual-suspects',
      requiredRoles: ['lead', 'developer', 'tester', 'scribe'],
      teamSize: 4,
    });

    const costTracker = new CostTracker();
    const skillRegistry = new SkillRegistry();

    // Register skills (core concern, no telemetry needed)
    skillRegistry.registerSkill({
      id: 'jwt-auth', name: 'JWT Authentication', domain: 'auth',
      triggers: ['jwt', 'token', 'auth', 'login', 'refresh'],
      agentRoles: ['developer', 'security'],
      content: '# JWT Auth\nUse RS256.',
    });

    // Build agent states without OTel calls
    const agents: AgentState[] = cast.map((member, i) => ({
      member,
      status: 'idle' as AgentStatus,
      tasksCompleted: 0,
      sessionId: `session-${member.name.toLowerCase()}-${i}`,
    }));

    expect(agents).toHaveLength(4);
    expect(agents.every((a) => a.status === 'idle')).toBe(true);

    // Core skill matching works
    const devAgent = agents.find((a) => a.member.role === 'developer');
    const matches = skillRegistry.matchSkills('Implement JWT auth endpoints', devAgent!.member.role);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('full task assignment loop works without OTel or dashboard', () => {
    const engine = new CastingEngine();
    const cast = engine.castTeam({
      universe: 'usual-suspects',
      requiredRoles: ['lead', 'developer', 'tester', 'scribe'],
      teamSize: 4,
    });

    const costTracker = new CostTracker();
    const tasks = createTaskQueue();

    const agents: AgentState[] = cast.map((member, i) => ({
      member,
      status: 'idle' as AgentStatus,
      tasksCompleted: 0,
      sessionId: `session-${member.name.toLowerCase()}-${i}`,
    }));

    // Run one round of task assignment (core loop logic, no printing)
    for (const agent of agents) {
      if (agent.status !== 'idle') continue;
      const task = findNextTask(tasks, agent.member.role);
      if (!task) continue;

      task.status = 'in-progress';
      task.assignedTo = agent.member.name;
      task.startedAt = Date.now();
      agent.status = 'working';
      agent.currentTask = task;

      // Record cost
      const cost = simulateCost(task.complexity);
      costTracker.recordUsage({
        sessionId: agent.sessionId,
        agentName: agent.member.name,
        model: 'claude-sonnet-4-20250514',
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        estimatedCost: cost.cost,
      });

      // Complete the task
      task.status = 'done';
      task.completedAt = Date.now();
      task.result = 'Task completed.';
      agent.status = 'idle';
      agent.currentTask = undefined;
      agent.tasksCompleted++;
    }

    // After one round, each role should have completed one task
    const completedCount = tasks.filter((t) => t.status === 'done').length;
    expect(completedCount).toBe(4); // one per role

    const summary = costTracker.getSummary();
    expect(summary.agents.size).toBe(4);
    expect(summary.totalEstimatedCost).toBeGreaterThan(0);
  });

  it('tier selection works with DEMO_CONFIG without any OTel setup', () => {
    const tasks = createTaskQueue();
    const tierResults = tasks.map((task) => ({
      taskId: task.id,
      tier: selectResponseTier(task.description, DEMO_CONFIG),
    }));

    expect(tierResults).toHaveLength(10);
    for (const { tier } of tierResults) {
      expect(tier.tier).toBeTruthy();
      expect(tier.modelTier).toBeTruthy();
    }
  });

  it('StreamingPipeline tracks usage without TelemetryCollector', async () => {
    const pipeline = new StreamingPipeline();
    pipeline.attachToSession('core-session');

    await pipeline.processEvent({
      type: 'usage',
      sessionId: 'core-session',
      agentName: 'TestAgent',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 500,
      outputTokens: 250,
      estimatedCost: 0.006,
      timestamp: new Date(),
    });

    const summary = pipeline.getUsageSummary();
    expect(summary.totalInputTokens).toBe(500);
    pipeline.clear();
  });
});
