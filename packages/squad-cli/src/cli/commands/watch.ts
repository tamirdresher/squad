/**
 * Watch command — Ralph's standalone polling process
 *
 * Integrates Predictive Circuit Breaker for rate limit protection.
 * When GitHub API quota runs low, Ralph backs off automatically
 * and resumes when quota recovers.
 *
 * @see https://github.com/bradygaster/squad/issues/515
 */

import fs from 'node:fs';
import path from 'node:path';
import { detectSquadDir } from '../core/detect-squad-dir.js';
import { fatal } from '../core/errors.js';
import { GREEN, RED, DIM, BOLD, RESET, YELLOW } from '../core/output.js';
import {
  parseRoutingRules,
  parseModuleOwnership,
  parseRoster,
  triageIssue,
  type TriageIssue,
} from '@bradygaster/squad-sdk/ralph/triage';
import { RalphMonitor } from '@bradygaster/squad-sdk/ralph';
import { EventBus } from '@bradygaster/squad-sdk/runtime/event-bus';
import {
  ghAvailable,
  ghAuthenticated,
  ghIssueList,
  ghIssueEdit,
  ghPrList,
  ghRateLimitCheck,
  isRateLimitError,
  type GhIssue,
  type GhPullRequest,
  type GhRateLimitStatus,
} from '../core/gh-cli.js';
import {
  PredictiveCircuitBreaker,
  getTrafficLight,
  shouldProceed,
  getRetryDelay,
  type TrafficLight,
} from '@bradygaster/squad-sdk/ralph/rate-limiting';

export interface BoardState {
  untriaged: number;
  assigned: number;
  drafts: number;
  needsReview: number;
  changesRequested: number;
  ciFailures: number;
  readyToMerge: number;
}

/** Circuit breaker state persisted between rounds */
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastRateLimitHit: string | null;
  cooldownMinutes: number;
  backoffRound: number;
}

function defaultCBState(): CircuitBreakerState {
  return {
    state: 'closed',
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    lastRateLimitHit: null,
    cooldownMinutes: 10,
    backoffRound: 0,
  };
}

function loadCBState(squadDir: string): CircuitBreakerState {
  const filePath = path.join(squadDir, 'ralph-circuit-breaker.json');
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch { /* corrupted — use defaults */ }
  return defaultCBState();
}

function saveCBState(squadDir: string, cbState: CircuitBreakerState): void {
  const filePath = path.join(squadDir, 'ralph-circuit-breaker.json');
  fs.writeFileSync(filePath, JSON.stringify(cbState, null, 2));
}

function trafficLightIcon(light: TrafficLight): string {
  if (light === 'green') return `${GREEN}\u{1F7E2}${RESET}`;
  if (light === 'amber') return `${YELLOW}\u{1F7E1}${RESET}`;
  return `${RED}\u{1F534}${RESET}`;
}

export function reportBoard(state: BoardState, round: number, light?: TrafficLight): void {
  const total = Object.values(state).reduce((a, b) => a + b, 0);

  if (total === 0) {
    console.log(`${DIM}\u{1F4CB} Board is clear \u2014 Ralph is idling${RESET}`);
    return;
  }

  const lightStr = light ? ` ${trafficLightIcon(light)}` : '';
  console.log(`\n${BOLD}\u{1F504} Ralph \u2014 Round ${round}${lightStr}${RESET}`);
  console.log('\u2501'.repeat(30));
  if (state.untriaged > 0) console.log(`  \u{1F534} Untriaged:         ${state.untriaged}`);
  if (state.assigned > 0) console.log(`  \u{1F7E1} Assigned:          ${state.assigned}`);
  if (state.drafts > 0) console.log(`  \u{1F7E1} Draft PRs:         ${state.drafts}`);
  if (state.changesRequested > 0) console.log(`  \u26A0\uFE0F  Changes requested: ${state.changesRequested}`);
  if (state.ciFailures > 0) console.log(`  \u274C CI failures:       ${state.ciFailures}`);
  if (state.needsReview > 0) console.log(`  \u{1F535} Needs review:      ${state.needsReview}`);
  if (state.readyToMerge > 0) console.log(`  \u{1F7E2} Ready to merge:    ${state.readyToMerge}`);
  console.log();
}

function emptyBoardState(): BoardState {
  return {
    untriaged: 0,
    assigned: 0,
    drafts: 0,
    needsReview: 0,
    changesRequested: 0,
    ciFailures: 0,
    readyToMerge: 0,
  };
}

type PRBoardState = Pick<BoardState, 'drafts' | 'needsReview' | 'changesRequested' | 'ciFailures' | 'readyToMerge'> & {
  totalOpen: number;
};

async function checkPRs(roster: ReturnType<typeof parseRoster>): Promise<PRBoardState> {
  const prs = await ghPrList({ state: 'open', limit: 20 });

  const squadPRs: GhPullRequest[] = prs.filter(pr =>
    pr.labels.some(l => l.name.startsWith('squad')) ||
    pr.headRefName.startsWith('squad/')
  );

  if (squadPRs.length === 0) {
    return { drafts: 0, needsReview: 0, changesRequested: 0, ciFailures: 0, readyToMerge: 0, totalOpen: 0 };
  }

  const drafts = squadPRs.filter(pr => pr.isDraft);
  const changesRequested = squadPRs.filter(pr => pr.reviewDecision === 'CHANGES_REQUESTED');
  const approved = squadPRs.filter(pr => pr.reviewDecision === 'APPROVED' && !pr.isDraft);
  const ciFailures = squadPRs.filter(pr =>
    pr.statusCheckRollup?.some(check => check.state === 'FAILURE' || check.state === 'ERROR')
  );
  const readyToMerge = approved.filter(pr =>
    !pr.statusCheckRollup?.some(c => c.state === 'FAILURE' || c.state === 'ERROR' || c.state === 'PENDING')
  );
  const changesRequestedSet = new Set(changesRequested.map(pr => pr.number));
  const ciFailureSet = new Set(ciFailures.map(pr => pr.number));
  const readyToMergeSet = new Set(readyToMerge.map(pr => pr.number));
  const needsReview = squadPRs.filter(pr =>
    !pr.isDraft &&
    !changesRequestedSet.has(pr.number) &&
    !ciFailureSet.has(pr.number) &&
    !readyToMergeSet.has(pr.number)
  );

  const memberNames = new Set(roster.map(m => m.name.toLowerCase()));
  const timestamp = new Date().toLocaleTimeString();

  if (drafts.length > 0) {
    console.log(`${DIM}[${timestamp}]${RESET} \u{1F7E1} ${drafts.length} draft PR(s) in progress`);
    for (const pr of drafts) {
      console.log(`  ${DIM}PR #${pr.number}: ${pr.title} (${pr.author.login})${RESET}`);
    }
  }
  if (changesRequested.length > 0) {
    console.log(`${YELLOW}[${timestamp}]${RESET} \u26A0\uFE0F ${changesRequested.length} PR(s) need revision`);
    for (const pr of changesRequested) {
      const owner = memberNames.has(pr.author.login.toLowerCase()) ? ` \u2014 ${pr.author.login}` : '';
      console.log(`  PR #${pr.number}: ${pr.title} \u2014 changes requested${owner}`);
    }
  }
  if (ciFailures.length > 0) {
    console.log(`${RED}[${timestamp}]${RESET} \u274C ${ciFailures.length} PR(s) with CI failures`);
    for (const pr of ciFailures) {
      const failedChecks = pr.statusCheckRollup?.filter(c => c.state === 'FAILURE' || c.state === 'ERROR') || [];
      const owner = memberNames.has(pr.author.login.toLowerCase()) ? ` \u2014 ${pr.author.login}` : '';
      console.log(`  PR #${pr.number}: ${pr.title}${owner} \u2014 ${failedChecks.map(c => c.name).join(', ')}`);
    }
  }
  if (readyToMerge.length > 0) {
    console.log(`${GREEN}[${timestamp}]${RESET} \u{1F7E2} ${readyToMerge.length} PR(s) ready to merge`);
    for (const pr of readyToMerge) {
      console.log(`  PR #${pr.number}: ${pr.title} \u2014 approved, CI green`);
    }
  }

  return {
    drafts: drafts.length,
    needsReview: needsReview.length,
    changesRequested: changesRequestedSet.size,
    ciFailures: ciFailureSet.size,
    readyToMerge: readyToMergeSet.size,
    totalOpen: squadPRs.length,
  };
}

/**
 * Run a single check cycle.
 * Throws rate limit errors so the caller can update the circuit breaker.
 */
async function runCheck(
  rules: ReturnType<typeof parseRoutingRules>,
  modules: ReturnType<typeof parseModuleOwnership>,
  roster: ReturnType<typeof parseRoster>,
  hasCopilot: boolean,
  autoAssign: boolean
): Promise<BoardState> {
  const timestamp = new Date().toLocaleTimeString();

  // Fetch open issues with squad label (may throw on rate limit)
  const issues = await ghIssueList({ label: 'squad', state: 'open', limit: 20 });

  const memberLabels = roster.map(m => m.label);
  const untriaged = issues.filter(issue => {
    const issueLabels = issue.labels.map(l => l.name);
    return !memberLabels.some(ml => issueLabels.includes(ml));
  });
  const assignedIssues = issues.filter(issue => {
    const issueLabels = issue.labels.map(l => l.name);
    return memberLabels.some(ml => issueLabels.includes(ml));
  });

  let unassignedCopilot: GhIssue[] = [];
  if (hasCopilot && autoAssign) {
    try {
      const copilotIssues = await ghIssueList({ label: 'squad:copilot', state: 'open', limit: 10 });
      unassignedCopilot = copilotIssues.filter(i => !i.assignees || i.assignees.length === 0);
    } catch {
      // Label may not exist yet
    }
  }

  for (const issue of untriaged) {
    const triageInput: TriageIssue = {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      labels: issue.labels.map((l) => l.name),
    };
    const triage = triageIssue(triageInput, rules, modules, roster);

    if (triage) {
      try {
        await ghIssueEdit(issue.number, { addLabel: triage.agent.label });
        console.log(
          `${GREEN}\u2713${RESET} [${timestamp}] Triaged #${issue.number} "${issue.title}" \u2192 ${triage.agent.name} (${triage.reason})`
        );
      } catch (e) {
        const err = e as Error;
        if (isRateLimitError(err)) throw err; // bubble up for circuit breaker
        console.error(`${RED}\u2717${RESET} [${timestamp}] Failed to label #${issue.number}: ${err.message}`);
      }
    }
  }

  for (const issue of unassignedCopilot) {
    try {
      await ghIssueEdit(issue.number, { addAssignee: 'copilot-swe-agent' });
      console.log(`${GREEN}\u2713${RESET} [${timestamp}] Assigned @copilot to #${issue.number} "${issue.title}"`);
    } catch (e) {
      const err = e as Error;
      if (isRateLimitError(err)) throw err;
      console.error(`${RED}\u2717${RESET} [${timestamp}] Failed to assign @copilot to #${issue.number}: ${err.message}`);
    }
  }

  const prState = await checkPRs(roster);

  return {
    untriaged: untriaged.length,
    assigned: assignedIssues.length,
    ...prState,
  };
}

/**
 * Execute a rate-limit-aware watch round.
 * Checks API quota before calling runCheck. On 429, opens the circuit
 * breaker and backs off. On recovery, closes it and resumes.
 */
async function executeRound(
  round: number,
  pcb: PredictiveCircuitBreaker,
  cbState: CircuitBreakerState,
  squadDir: string,
  rules: ReturnType<typeof parseRoutingRules>,
  modules: ReturnType<typeof parseModuleOwnership>,
  roster: ReturnType<typeof parseRoster>,
  hasCopilot: boolean,
  autoAssign: boolean,
): Promise<{ boardState: BoardState; light: TrafficLight }> {
  const timestamp = new Date().toLocaleTimeString();

  // 1. Check rate limit before doing work
  let light: TrafficLight = 'green';
  try {
    const rl = await ghRateLimitCheck();
    pcb.addSample(rl.remaining, rl.limit);
    light = getTrafficLight(rl.remaining, rl.limit);

    if (light !== 'green') {
      console.log(
        `${YELLOW}[${timestamp}]${RESET} Rate limit: ${rl.remaining}/${rl.limit} remaining ` +
        `(resets ${rl.resetAt})`
      );
    }
  } catch {
    // gh api rate_limit failed — proceed cautiously
  }

  // 2. Check circuit breaker state
  if (cbState.state === 'open') {
    const hitTime = cbState.lastRateLimitHit ? new Date(cbState.lastRateLimitHit).getTime() : 0;
    const elapsed = (Date.now() - hitTime) / 1000 / 60;
    if (elapsed < cbState.cooldownMinutes) {
      const remaining = Math.ceil(cbState.cooldownMinutes - elapsed);
      console.log(
        `${RED}[${timestamp}]${RESET} \u{26A1} Circuit OPEN \u2014 ` +
        `backing off (${remaining}min cooldown remaining)`
      );
      return { boardState: emptyBoardState(), light: 'red' };
    }
    // Cooldown expired — try half-open
    cbState.state = 'half-open';
    console.log(`${YELLOW}[${timestamp}]${RESET} \u{1F50C} Circuit HALF-OPEN \u2014 testing API...`);
  }

  // 3. Predictive check — open before hitting 429
  if (pcb.shouldOpen() && cbState.state === 'closed') {
    const eta = pcb.predictExhaustion();
    console.log(
      `${YELLOW}[${timestamp}]${RESET} \u{26A0}\uFE0F Predictive circuit breaker: ` +
      `quota exhaustion in ~${Math.round(eta ?? 0)}s \u2014 opening circuit`
    );
    cbState.state = 'open';
    cbState.lastRateLimitHit = new Date().toISOString();
    cbState.backoffRound++;
    await saveCBState(squadDir, cbState);
    return { boardState: emptyBoardState(), light: 'red' };
  }

  // 4. If traffic light is red and we're not in half-open test, skip
  if (light === 'red' && cbState.state !== 'half-open') {
    console.log(`${RED}[${timestamp}]${RESET} \u{1F6D1} Traffic light RED \u2014 skipping round`);
    return { boardState: emptyBoardState(), light };
  }

  // 5. Execute the actual check
  try {
    const boardState = await runCheck(rules, modules, roster, hasCopilot, autoAssign);

    // Success — update circuit breaker
    if (cbState.state === 'half-open') {
      cbState.consecutiveSuccesses++;
      if (cbState.consecutiveSuccesses >= 2) {
        cbState.state = 'closed';
        cbState.consecutiveFailures = 0;
        cbState.consecutiveSuccesses = 0;
        cbState.backoffRound = 0;
        console.log(`${GREEN}[${timestamp}]${RESET} \u{2705} Circuit CLOSED \u2014 API recovered`);
      }
    } else {
      cbState.consecutiveSuccesses++;
      cbState.consecutiveFailures = 0;
    }
    await saveCBState(squadDir, cbState);

    return { boardState, light };
  } catch (e) {
    const err = e as Error;
    if (isRateLimitError(err)) {
      // Rate limited — open circuit breaker
      cbState.state = 'open';
      cbState.consecutiveFailures++;
      cbState.consecutiveSuccesses = 0;
      cbState.lastRateLimitHit = new Date().toISOString();
      cbState.backoffRound++;
      // Exponential cooldown: 10min, 20min, 40min (capped at 60)
      cbState.cooldownMinutes = Math.min(10 * Math.pow(2, cbState.backoffRound - 1), 60);
      await saveCBState(squadDir, cbState);

      const delay = getRetryDelay(2, cbState.consecutiveFailures);
      console.error(
        `${RED}[${timestamp}]${RESET} \u{26A1} Rate limited! Circuit OPEN \u2014 ` +
        `cooldown ${cbState.cooldownMinutes}min (failure #${cbState.consecutiveFailures})`
      );
      return { boardState: emptyBoardState(), light: 'red' };
    }

    // Non-rate-limit error — log and continue
    console.error(`${RED}\u2717${RESET} [${timestamp}] Check failed: ${err.message}`);
    return { boardState: emptyBoardState(), light };
  }
}

/**
 * Run watch command — Ralph's local polling process
 */
export async function runWatch(dest: string, intervalMinutes: number): Promise<void> {
  if (isNaN(intervalMinutes) || intervalMinutes < 1) {
    fatal('--interval must be a positive number of minutes');
  }

  const squadDirInfo = detectSquadDir(dest);
  const teamMd = path.join(squadDirInfo.path, 'team.md');
  const routingMdPath = path.join(squadDirInfo.path, 'routing.md');

  if (!fs.existsSync(teamMd)) {
    fatal('No squad found \u2014 run init first.');
  }

  if (!(await ghAvailable())) {
    fatal('gh CLI not found \u2014 install from https://cli.github.com');
  }

  if (!(await ghAuthenticated())) {
    console.error(`${YELLOW}\u26A0\uFE0F${RESET} gh CLI not authenticated`);
    console.error(`   Run: ${BOLD}gh auth login${RESET}\n`);
    fatal('gh authentication required');
  }

  const content = fs.readFileSync(teamMd, 'utf8');
  const roster = parseRoster(content);
  const routingContent = fs.existsSync(routingMdPath) ? fs.readFileSync(routingMdPath, 'utf8') : '';
  const rules = parseRoutingRules(routingContent);
  const modules = parseModuleOwnership(routingContent);

  if (roster.length === 0) {
    fatal('No squad members found in team.md');
  }

  const hasCopilot = content.includes('\u{1F916} Coding Agent') || content.includes('@copilot');
  const autoAssign = content.includes('<!-- copilot-auto-assign: true -->');
  const monitorSessionId = 'ralph-watch';
  const eventBus = new EventBus();
  const monitor = new RalphMonitor({
    teamRoot: path.dirname(squadDirInfo.path),
    healthCheckInterval: intervalMinutes * 60 * 1000,
    staleSessionThreshold: intervalMinutes * 60 * 1000 * 3,
    statePath: path.join(squadDirInfo.path, '.ralph-state.json'),
  });
  await monitor.start(eventBus);
  await eventBus.emit({
    type: 'session:created',
    sessionId: monitorSessionId,
    agentName: 'Ralph',
    payload: { intervalMinutes },
    timestamp: new Date(),
  });

  // Initialize circuit breaker
  const pcb = new PredictiveCircuitBreaker({ maxSamples: 10, warningThresholdSeconds: 120 });
  const cbState = loadCBState(squadDirInfo.path);

  console.log(`\n${BOLD}\u{1F504} Ralph \u2014 Watch Mode${RESET}`);
  console.log(`${DIM}Polling every ${intervalMinutes} minute(s) for squad work. Ctrl+C to stop.${RESET}`);
  if (cbState.state !== 'closed') {
    console.log(`${YELLOW}\u26A0\uFE0F  Resuming with circuit breaker ${cbState.state}${RESET}`);
  }
  console.log();

  let round = 0;

  // Run immediately, then on interval
  round++;
  const { boardState: state, light } = await executeRound(
    round, pcb, cbState, squadDirInfo.path,
    rules, modules, roster, hasCopilot, autoAssign
  );
  await eventBus.emit({
    type: 'agent:milestone',
    sessionId: monitorSessionId,
    agentName: 'Ralph',
    payload: { milestone: `Completed watch round ${round}`, task: 'watch cycle' },
    timestamp: new Date(),
  });
  await monitor.healthCheck();
  reportBoard(state, round, light);

  return new Promise<void>((resolve) => {
    const intervalId = setInterval(
      async () => {
        round++;
        const { boardState: roundState, light: roundLight } = await executeRound(
          round, pcb, cbState, squadDirInfo.path,
          rules, modules, roster, hasCopilot, autoAssign
        );
        await eventBus.emit({
          type: 'agent:milestone',
          sessionId: monitorSessionId,
          agentName: 'Ralph',
          payload: { milestone: `Completed watch round ${round}`, task: 'watch cycle' },
          timestamp: new Date(),
        });
        await monitor.healthCheck();
        reportBoard(roundState, round, roundLight);
      },
      intervalMinutes * 60 * 1000
    );

    // Graceful shutdown — persist circuit breaker state
    let isShuttingDown = false;
    const shutdown = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      clearInterval(intervalId);
      process.off('SIGINT', shutdown);
      process.off('SIGTERM', shutdown);
      saveCBState(squadDirInfo.path, cbState);
      await eventBus.emit({
        type: 'session:destroyed',
        sessionId: monitorSessionId,
        agentName: 'Ralph',
        payload: null,
        timestamp: new Date(),
      });
      await monitor.stop();
      console.log(`\n${DIM}\u{1F504} Ralph \u2014 Watch stopped (circuit: ${cbState.state})${RESET}`);
      resolve();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}