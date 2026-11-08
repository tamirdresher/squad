import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { RESULT_JOBS, RESULT_SCHEMA, WORKFLOW_PATH } from '../scripts/repo-health-report.mjs';
import { CLAIM_FILE, CLAIM_SCHEMA } from '../scripts/workflow-run-pr-binding.mjs';
import { SELF_CHECK_NAMES } from '../scripts/pr-readiness.mjs';

// The github org blocks `pull_request_target`: every such run ends in
// startup_failure. PR automation that writes back is therefore split into an
// unprivileged `pull_request` workflow and a default-branch `workflow_run`
// writer. These tests pin that trust boundary for each split.

type Step = {
  name?: string;
  id?: string;
  uses?: string;
  if?: string;
  run?: string;
  'continue-on-error'?: boolean;
  env?: Record<string, string>;
  with?: Record<string, string | number | boolean>;
};
type Concurrency = string | { group: string; 'cancel-in-progress'?: boolean | string };
type Job = {
  name?: string;
  if?: string;
  needs?: string | string[];
  outputs?: Record<string, string>;
  concurrency?: Concurrency;
  permissions?: Record<string, string>;
  steps: Step[];
};
type Workflow = {
  name: string;
  on: Record<string, Record<string, unknown> | null>;
  permissions?: Record<string, string>;
  concurrency?: Concurrency;
  jobs: Record<string, Job>;
};

const workflowsDir = join(process.cwd(), '.github', 'workflows');
const text = (file: string) => readFileSync(join(workflowsDir, file), 'utf8');
const load = (file: string) => parse(text(file)) as Workflow;
const stepsOf = (workflow: Workflow) => Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
const scriptOf = (step: Step) => String(step.with?.script ?? '');
const needsOf = (job: Job) => [job.needs ?? []].flat();
const groupOf = (concurrency: Concurrency) => (typeof concurrency === 'string' ? concurrency : concurrency.group);

function triggers(workflow: Workflow): string[] {
  const on = workflow.on as unknown;
  if (typeof on === 'string') return [on];
  if (Array.isArray(on)) return on;
  return Object.keys(on ?? {});
}

/** Evaluate a job-level `if:` (==, !=, &&, ||, property access) like the runner. */
function jobRuns(job: Job, github: Record<string, unknown>): boolean {
  if (!job.if) return true;
  return Boolean(runInNewContext(job.if, { github }));
}

function workflowRunEvent(workflowRun: Record<string, unknown>) {
  return {
    event_name: 'workflow_run',
    actor: (workflowRun.actor as { login: string }).login,
    event: { workflow_run: workflowRun },
  };
}

/** Render the `${{ }}` expressions in a string like the runner; a missing value renders as ''. */
function render(template: string, contexts: Record<string, unknown>): string {
  return template.replace(/\$\{\{([\s\S]*?)\}\}/g, (_match, expression: string) => {
    const value = runInNewContext(expression, contexts);
    return value === undefined || value === null ? '' : String(value);
  });
}

/**
 * The concurrency groups one workflow_run delivery joins. GitHub puts the whole
 * run in a workflow-level group before it evaluates any job's `if:`. A job-level
 * group is joined only by a job that runs: every job it needs succeeded (the
 * implicit success()) and its `if:` holds. `binding` is what the bind step sets,
 * or null when it throws, which fails its job (a forged or malformed claim).
 */
function joinedGroups(
  workflow: Workflow,
  workflowRun: Record<string, unknown>,
  binding: Record<string, string> | null,
): string[] {
  const github = { ...workflowRunEvent(workflowRun), workflow: workflow.name };
  const groups = workflow.concurrency ? [render(groupOf(workflow.concurrency), { github })] : [];
  const succeeded = new Map<string, Record<string, string>>();
  for (const [id, job] of Object.entries(workflow.jobs)) {
    if (!needsOf(job).every((need) => succeeded.has(need))) continue;
    const needs = Object.fromEntries(
      needsOf(job).map((need) => [need, { result: 'success', outputs: succeeded.get(need) }]),
    );
    if (job.if && !runInNewContext(job.if, { github, needs })) continue;
    if (job.concurrency) groups.push(render(groupOf(job.concurrency), { github, needs }));
    const binds = job.steps.some((step) => step.id === 'bind');
    if (binds && binding === null) continue;
    const steps = { bind: { outputs: binds ? binding ?? {} : {} } };
    succeeded.set(id, Object.fromEntries(
      Object.entries(job.outputs ?? {}).map(([key, value]) => [key, render(value, { steps })]),
    ));
  }
  return groups;
}

interface Split {
  writer: string;
  request: string;
  requestOn: Record<string, unknown>;
  requestPermissions: Record<string, string>;
  writerPermissions: Record<string, string>;
  artifact: { name?: string; pattern?: string } | null;
  conclusions: string[];
  skipsDependabot: boolean;
}

const SPLITS: Split[] = [
  {
    writer: 'squad-heartbeat.yml',
    request: 'squad-heartbeat-pr-closed.yml',
    requestOn: { types: ['closed'] },
    requestPermissions: {},
    writerPermissions: { issues: 'write', contents: 'read', 'pull-requests': 'read', actions: 'write' },
    artifact: null,
    conclusions: ['success'],
    skipsDependabot: false,
  },
  {
    writer: 'squad-impact.yml',
    request: 'squad-impact-request.yml',
    requestOn: { branches: ['dev'], types: ['opened', 'synchronize', 'reopened'] },
    requestPermissions: {},
    writerPermissions: { actions: 'read', contents: 'read', 'pull-requests': 'write' },
    artifact: { name: 'squad-impact-request' },
    conclusions: ['success'],
    skipsDependabot: true,
  },
  {
    writer: 'squad-pr-readiness.yml',
    request: 'squad-pr-readiness-request.yml',
    requestOn: {
      branches: ['dev', 'main', 'insider'],
      types: ['opened', 'synchronize', 'reopened', 'edited', 'ready_for_review'],
    },
    requestPermissions: {},
    writerPermissions: {
      actions: 'read',
      contents: 'read',
      'pull-requests': 'write',
      statuses: 'read',
      checks: 'read',
    },
    artifact: { name: 'squad-pr-readiness-request' },
    conclusions: ['success'],
    skipsDependabot: true,
  },
  {
    writer: 'squad-repo-health-report.yml',
    request: 'squad-repo-health.yml',
    requestOn: { branches: ['dev'], types: ['opened', 'synchronize', 'reopened'] },
    requestPermissions: { contents: 'read' },
    writerPermissions: { actions: 'read', contents: 'read', 'pull-requests': 'write' },
    // Three artifacts, each downloaded by exact name: see the Repo Health describe below.
    artifact: null,
    conclusions: ['success', 'failure'],
    skipsDependabot: true,
  },
];

describe('no workflow depends on the blocked pull_request_target event', () => {
  it('every .github/workflows file is triggered without pull_request_target', () => {
    const offenders = readdirSync(workflowsDir)
      .filter((file) => /\.ya?ml$/.test(file))
      .filter((file) => triggers(load(file)).includes('pull_request_target'));
    expect(offenders, 'these workflows trigger on pull_request_target, which the github org blocks')
      .toEqual([]);
  });
});

for (const split of SPLITS) {
  const requestPath = `.github/workflows/${split.request}`;

  describe(`${split.request} (pull_request) → ${split.writer} (workflow_run)`, () => {
    const request = load(split.request);
    const writer = load(split.writer);
    const [writerJob] = Object.values(writer.jobs);
    const writerSteps = stepsOf(writer);

    it('the pull_request half keeps the old event filter and is unprivileged', () => {
      expect(request.on, `${split.request} triggers`).toEqual({ pull_request: split.requestOn });
      expect(request.permissions, `${split.request} permissions`).toEqual(split.requestPermissions);
      for (const [id, job] of Object.entries(request.jobs)) {
        expect(job.permissions, `${split.request} job ${id} must not widen permissions`).toBeUndefined();
      }
      expect(text(split.request), `${split.request} must not read secrets`).not.toMatch(/\$\{\{[^}]*\bsecrets\./);
      expect(
        stepsOf(request).filter((step) => step.uses?.startsWith('actions/github-script')).map((step) => step.name),
        `${split.request} must not script the API`,
      ).toEqual([]);
    });

    it('the writer runs only from workflow_run of the request workflow, by its current name', () => {
      expect(triggers(writer), `${split.writer} triggers`).not.toContain('pull_request');
      expect(writer.on.workflow_run, `${split.writer} workflow_run trigger`).toMatchObject({ types: ['completed'] });
      expect(writer.on.workflow_run?.workflows, `${split.writer} must follow "${request.name}"`)
        .toContain(request.name);
    });

    it('the writer holds only the permissions it needs', () => {
      expect(writer.permissions, `${split.writer} permissions`).toEqual(split.writerPermissions);
      for (const [id, job] of Object.entries(writer.jobs)) {
        expect(job.permissions, `${split.writer} job ${id} must not widen permissions`).toBeUndefined();
      }
    });

    it('the writer job is bound to a completed pull_request run of exactly that workflow file', () => {
      const accepted = {
        event: 'pull_request',
        conclusion: split.conclusions[0],
        path: requestPath,
        actor: { login: 'octocat' },
        pull_requests: [],
      };
      for (const conclusion of split.conclusions) {
        expect(jobRuns(writerJob, workflowRunEvent({ ...accepted, conclusion })), `${split.writer}: ${conclusion}`)
          .toBe(true);
      }
      const rejected: Array<[string, Record<string, unknown>]> = [
        ['a push run', { event: 'push' }],
        ['a cancelled run', { conclusion: 'cancelled' }],
        ['a skipped run (Dependabot request)', { conclusion: 'skipped' }],
        ['a same-named workflow at another path', { path: '.github/workflows/renamed-copy.yml' }],
      ];
      if (!split.conclusions.includes('failure')) rejected.push(['a failed run', { conclusion: 'failure' }]);
      if (split.skipsDependabot) rejected.push(['a Dependabot run', { actor: { login: 'dependabot[bot]' } }]);
      for (const [label, overrides] of rejected) {
        expect(jobRuns(writerJob, workflowRunEvent({ ...accepted, ...overrides })), `${split.writer} ran for ${label}`)
          .toBe(false);
      }
    });

    it('the writer checks out only the default branch and never fetches or runs PR code', () => {
      for (const [id, job] of Object.entries(writer.jobs)) {
        const checkouts = job.steps.filter((step) => step.uses?.startsWith('actions/checkout@'));
        expect(checkouts.length, `${split.writer} job ${id} checkouts`).toBe(1);
        expect(checkouts[0].with?.ref, `${split.writer} job ${id} checkout must not choose a ref`).toBeUndefined();
        expect(checkouts[0].with?.repository, `${split.writer} job ${id} checkout must not choose a repository`)
          .toBeUndefined();
      }
      const source = text(split.writer);
      expect(source, `${split.writer} has no pull_request payload`).not.toMatch(/github\.event\.pull_request\b/);
      expect(source, `${split.writer} must not fetch or switch to PR commits`).not.toMatch(/\bgit (?:fetch|checkout|switch)\b/);
      for (const step of writerSteps.filter((candidate) => candidate.with?.script)) {
        expect(scriptOf(step), `${split.writer} / ${step.name}: expressions belong in env, not script source`)
          .not.toContain('${{');
      }
    });

    if (split.artifact) {
      it('the writer downloads the request run\'s artifact as data, with read-only checkouts', () => {
        for (const checkout of writerSteps.filter((step) => step.uses?.startsWith('actions/checkout@'))) {
          expect(
            checkout.with?.['persist-credentials'],
            `${split.writer} / ${checkout.name ?? checkout.uses}: must not persist the write token`,
          ).toBe(false);
        }
        const download = writerSteps.find((step) => step.uses?.startsWith('actions/download-artifact@'));
        expect(download, `${split.writer} downloads the request artifact`).toBeTruthy();
        expect(download!.with).toMatchObject({
          ...split.artifact,
          'run-id': '${{ github.event.workflow_run.id }}',
          'github-token': '${{ github.token }}',
        });
        expect(String(download!.with?.path)).toMatch(/^\$\{\{ runner\.temp \}\}\//);
      });
    }
  });
}

describe('claim-carrying requests upload only the claim the writer validates', () => {
  for (const split of SPLITS.filter((candidate) => candidate.artifact?.name)) {
    it(`${split.request} writes ${CLAIM_SCHEMA} and checks out nothing`, () => {
      const steps = stepsOf(load(split.request));
      expect(steps.filter((step) => step.uses?.startsWith('actions/checkout@')), split.request).toEqual([]);
      const claim = steps.find((step) => step.run?.includes(CLAIM_SCHEMA));
      expect(claim, `${split.request} must write a ${CLAIM_SCHEMA} claim`).toBeTruthy();
      expect(claim!.env).toEqual({
        PR_NUMBER: '${{ github.event.pull_request.number }}',
        HEAD_SHA: '${{ github.event.pull_request.head.sha }}',
      });
      const upload = steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
      expect(upload?.with).toMatchObject({ name: split.artifact!.name, path: `\${{ runner.temp }}/claim/${CLAIM_FILE}` });
    });

    it(`${split.writer} binds the claim before anything writes`, () => {
      const jobs = Object.entries(load(split.writer).jobs);
      const [bindJobId, bindJob] = jobs.find(([, job]) => job.steps.some((step) => step.id === 'bind')) ?? [];
      expect(bindJobId, `${split.writer} needs a bind step`).toBeDefined();
      expect(bindJobId, `${split.writer}: the first job, which the event filter gates, must bind`).toBe(jobs[0][0]);
      const steps = bindJob!.steps;
      const download = steps.findIndex((step) => step.uses?.startsWith('actions/download-artifact@'));
      const bind = steps.findIndex((step) => step.id === 'bind');
      expect(download, `${split.writer} job ${bindJobId} must download the claim it binds`).toBeGreaterThanOrEqual(0);
      expect(bind, `${split.writer} must bind after downloading the claim`).toBeGreaterThan(download);
      expect(scriptOf(steps[bind])).toContain('/scripts/workflow-run-pr-binding.mjs');
      expect(scriptOf(steps[bind])).toContain(`claimWorkflowPath: '.github/workflows/${split.request}'`);
      expect(steps[bind].env).toEqual({ CLAIM_DIR: String(steps[download].with?.path) });
      const afterBind = steps.slice(bind + 1);
      for (const step of afterBind) {
        expect(step.if, `${split.writer} / ${step.name ?? step.uses} must wait for the binding`)
          .toBe("steps.bind.outputs.bound == 'true'");
      }
      // Any other job writes for the bound PR only, after the binding job.
      const dependents = jobs.filter(([id]) => id !== bindJobId);
      for (const [id, job] of dependents) {
        expect(needsOf(job), `${split.writer} job ${id} must wait for job ${bindJobId}`).toContain(bindJobId);
        expect(job.if, `${split.writer} job ${id} must run only for a bound PR`)
          .toBe(`needs.${bindJobId}.outputs.bound == 'true'`);
      }
      if (dependents.length > 0) {
        expect(bindJob!.outputs?.bound, `${split.writer} job ${bindJobId} must expose the binding`)
          .toBe('${{ steps.bind.outputs.bound }}');
      }
      expect(afterBind.length + dependents.length, `${split.writer} does nothing after binding`).toBeGreaterThan(0);
    });
  }
});

describe('Squad Heartbeat keeps its triggers and reads nothing from the PR run', () => {
  const heartbeat = load('squad-heartbeat.yml');
  const [job] = Object.values(heartbeat.jobs);

  it('still runs on issue events and manual dispatch', () => {
    expect(heartbeat.on).toMatchObject({ issues: { types: ['closed', 'labeled'] }, workflow_dispatch: null });
    expect(jobRuns(job, { event_name: 'issues', actor: 'octocat', event: {} })).toBe(true);
    expect(jobRuns(job, { event_name: 'workflow_dispatch', actor: 'octocat', event: {} })).toBe(true);
  });

  it('runs for Dependabot PR closes, as pull_request_target did', () => {
    const run = {
      event: 'pull_request',
      conclusion: 'success',
      path: '.github/workflows/squad-heartbeat-pr-closed.yml',
      actor: { login: 'dependabot[bot]' },
    };
    expect(jobRuns(job, workflowRunEvent(run))).toBe(true);
  });

  it('uses no artifact, output or field of the PR run in any step', () => {
    for (const step of job.steps) {
      expect(JSON.stringify(step), `squad-heartbeat.yml / ${step.name ?? step.uses}`).not.toMatch(/workflow_run/);
    }
    expect(stepsOf(load('squad-heartbeat-pr-closed.yml')).every((step) => !step.uses)).toBe(true);
  });
});

describe('Squad PR Readiness keeps its Squad CI refresh and old inputs', () => {
  const readiness = load('squad-pr-readiness.yml');
  const [job] = Object.values(readiness.jobs);
  const ciRun = (overrides: Record<string, unknown>) => workflowRunEvent({
    event: 'pull_request',
    conclusion: 'failure',
    path: '.github/workflows/squad-ci.yml',
    actor: { login: 'octocat' },
    pull_requests: [{ number: 7 }],
    ...overrides,
  });

  it('refreshes after any Squad CI pull_request run that lists a PR', () => {
    expect(load('squad-ci.yml').name).toBe('Squad CI');
    expect(readiness.on.workflow_run?.workflows).toEqual(['Squad CI', 'Squad PR Readiness Request']);
    expect(jobRuns(job, ciRun({}))).toBe(true);
    expect(jobRuns(job, ciRun({ pull_requests: [] })), 'fork CI runs list no PR').toBe(false);
    expect(jobRuns(job, ciRun({ event: 'push' })), 'push runs of Squad CI').toBe(false);
    expect(jobRuns(job, ciRun({ actor: { login: 'dependabot[bot]' } })), 'Dependabot CI runs').toBe(false);
  });

  it('feeds the checklist only bound, API-sourced PR facts', () => {
    expect(readiness.jobs.bind?.outputs, 'squad-pr-readiness.yml job bind must pass on only the bind step outputs')
      .toEqual({
        bound: '${{ steps.bind.outputs.bound }}',
        pr_number: '${{ steps.bind.outputs.pr_number }}',
        head_sha: '${{ steps.bind.outputs.head_sha }}',
        base_ref: '${{ steps.bind.outputs.base_ref }}',
        draft: '${{ steps.bind.outputs.draft }}',
        labels: '${{ steps.bind.outputs.labels }}',
      });
    const check = stepsOf(readiness).find((step) => step.run === 'node scripts/pr-readiness.mjs');
    const facts = Object.fromEntries(Object.entries(check?.env ?? {}).filter(([key]) => key.startsWith('PR_')));
    expect(facts, 'squad-pr-readiness.yml / Check PR readiness: PR facts must come from job bind').toEqual({
      PR_NUMBER: '${{ needs.bind.outputs.pr_number }}',
      PR_HEAD_SHA: '${{ needs.bind.outputs.head_sha }}',
      PR_BASE_REF: '${{ needs.bind.outputs.base_ref }}',
      PR_DRAFT: '${{ needs.bind.outputs.draft }}',
      PR_LABELS: '${{ needs.bind.outputs.labels }}',
    });
  });

  it('the request check run keeps the name the CI check excludes', () => {
    const request = load('squad-pr-readiness-request.yml');
    for (const [id, requestJob] of Object.entries(request.jobs)) {
      expect(SELF_CHECK_NAMES, `squad-pr-readiness-request.yml job ${id}`).toContain(requestJob.name ?? id);
    }
  });

  it('the writer check runs keep names the CI check excludes', () => {
    // workflow_run check runs land on the default-branch tip: the head commit of any PR from dev.
    for (const [id, writerJob] of Object.entries(readiness.jobs)) {
      expect(SELF_CHECK_NAMES, `squad-pr-readiness.yml job ${id}`).toContain(writerJob.name ?? id);
    }
  });
});

// #2420: a workflow-level group is joined by every workflow_run delivery before any
// job's `if:` is evaluated. Keyed by head branch, it let skipped runs (fork and push
// runs of Squad CI) cancel real refreshes, and let PRs from one branch to different
// bases cancel each other. Only bound runs may join a group, one per PR head.
describe('Squad PR Readiness deduplicates only bound refreshes, per PR head', () => {
  const FILE = 'squad-pr-readiness.yml';
  const readiness = load(FILE);
  const CI = '.github/workflows/squad-ci.yml';
  const REQUEST = '.github/workflows/squad-pr-readiness-request.yml';
  const HEAD_SHA = 'c'.repeat(40);
  const delivery = (
    path: string,
    headRepository: string,
    headBranch: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    event: 'pull_request',
    conclusion: 'success',
    path,
    head_sha: HEAD_SHA,
    head_branch: headBranch,
    head_repository: { full_name: headRepository },
    actor: { login: 'octocat' },
    pull_requests: [],
    ...overrides,
  });
  const bound = (pr: number, base: string, head = HEAD_SHA) => ({
    bound: 'true', pr_number: String(pr), head_sha: head, base_ref: base, draft: 'false', labels: '[]',
  });

  it('sets no workflow-level group; only the bound posting job joins one, keyed by the PR number and head SHA', () => {
    const workflowGroup = readiness.concurrency && groupOf(readiness.concurrency);
    expect(readiness.concurrency, `${FILE} sets workflow-level group "${workflowGroup}"; every delivery joins it`)
      .toBeUndefined();
    const grouped = Object.fromEntries(Object.entries(readiness.jobs)
      .filter(([, job]) => job.concurrency !== undefined)
      .map(([id, job]) => [id, job.concurrency]));
    expect(grouped, `${FILE} job-level concurrency groups: ${JSON.stringify(grouped)}`).toEqual({
      readiness: {
        group: 'squad-pr-readiness-${{ needs.bind.outputs.pr_number }}-${{ needs.bind.outputs.head_sha }}',
        'cancel-in-progress': true,
      },
    });
    expect(readiness.jobs.readiness?.needs, `${FILE} job readiness must wait for job bind`).toBe('bind');
    expect(readiness.jobs.readiness?.if, `${FILE} job readiness must run only for a bound PR`)
      .toBe("needs.bind.outputs.bound == 'true'");
  });

  const neverGrouped: Array<[string, Record<string, unknown>, Record<string, string> | null]> = [
    ['a Squad CI run of a fork PR, which lists no PR', delivery(CI, 'contributor/squad', 'feature'), null],
    ['a Squad CI push run on dev', delivery(CI, 'github/squad', 'dev', { event: 'push' }), null],
    [
      'a Dependabot Squad CI run',
      delivery(CI, 'github/squad', 'dependabot/npm', {
        actor: { login: 'dependabot[bot]' },
        pull_requests: [{ number: 11 }],
      }),
      null,
    ],
    [
      'a cancelled request run',
      delivery(REQUEST, 'github/squad', 'feature', { conclusion: 'cancelled', pull_requests: [{ number: 7 }] }),
      null,
    ],
    [
      'a request run whose PR moved on or closed (unbound)',
      delivery(REQUEST, 'contributor/squad', 'feature'),
      { bound: 'false' },
    ],
    ['a request run with a forged claim (bind fails)', delivery(REQUEST, 'contributor/squad', 'feature'), null],
  ];

  it.each(neverGrouped)('%s joins no concurrency group', (label, workflowRun, binding) => {
    const groups = joinedGroups(readiness, workflowRun, binding);
    expect(groups, `${FILE}: ${label} joined ${groups.map((group) => `"${group}"`).join(', ')}`).toEqual([]);
  });

  it('runs for different PRs never share a group, and runs for one PR head still do', () => {
    // #7 and #8 share a head branch but target different bases; #9 is a fork PR; #10 is dev → main.
    const listed = { pull_requests: [{ number: 7 }, { number: 8 }] };
    const ciOf7 = delivery(CI, 'github/squad', 'feature', { ...listed, conclusion: 'failure' });
    const runs: Array<[number, string, Record<string, unknown>, Record<string, string>]> = [
      [7, 'request run of #7 (feature → dev)', delivery(REQUEST, 'github/squad', 'feature', listed), bound(7, 'dev')],
      [7, 'Squad CI run of #7', ciOf7, bound(7, 'dev')],
      [8, 'request run of #8 (feature → main)', delivery(REQUEST, 'github/squad', 'feature', listed), bound(8, 'main')],
      [9, 'request run of fork PR #9', delivery(REQUEST, 'contributor/squad', 'feature'), bound(9, 'dev')],
      [
        10,
        'request run of #10 (dev → main)',
        delivery(REQUEST, 'github/squad', 'dev', { pull_requests: [{ number: 10 }] }),
        bound(10, 'main'),
      ],
    ];
    const prsByGroup = new Map<string, { group: string; prs: Set<number> }>();
    for (const [pr, label, workflowRun, binding] of runs) {
      const groups = joinedGroups(readiness, workflowRun, binding);
      expect(groups, `${FILE}: the ${label} must join exactly one group`).toHaveLength(1);
      // GitHub compares group names case-insensitively.
      const entry = prsByGroup.get(groups[0].toLowerCase()) ?? { group: groups[0], prs: new Set<number>() };
      entry.prs.add(pr);
      prsByGroup.set(groups[0].toLowerCase(), entry);
    }
    const shared = [...prsByGroup.values()]
      .filter(({ prs }) => prs.size > 1)
      .map(({ group, prs }) => `"${group}" is shared by ${[...prs].map((pr) => `#${pr}`).join(' and ')}`);
    expect(shared, `${FILE}: concurrency groups shared by different PRs: ${shared.join('; ')}`).toEqual([]);
    expect(prsByGroup.size, `${FILE}: runs of one PR head must share its group, so a newer refresh cancels an older one`)
      .toBe(new Set(runs.map(([pr]) => pr)).size);
  });

  // GitHub cancels (cancel-in-progress) or replaces (while pending) only jobs in the same
  // group. bind checks the head outside any group, so a delivery can bind head A and
  // reach the posting job after head B's refresh started. In B's group it would cancel
  // or replace that refresh, then skip as stale: B's checklist would never be posted.
  it('a late run bound to an older head cannot cancel or replace the current head\'s refresh', () => {
    const OLD = 'a'.repeat(40);
    const NEW = 'b'.repeat(40);
    const listed = { pull_requests: [{ number: 7 }] };
    const groupFor = (label: string, path: string, head: string) => {
      const workflowRun = delivery(path, 'github/squad', 'feature', { ...listed, head_sha: head });
      const groups = joinedGroups(readiness, workflowRun, bound(7, 'dev', head));
      expect(groups, `${FILE}: the ${label} must join exactly one group`).toHaveLength(1);
      return groups[0];
    };
    const late = groupFor(`Squad CI run of #7 bound to ${OLD}`, CI, OLD);
    const current = groupFor(`request run of #7 bound to ${NEW}`, REQUEST, NEW);
    const currentCi = groupFor(`Squad CI run of #7 bound to ${NEW}`, CI, NEW);
    // GitHub compares group names case-insensitively.
    expect(
      late.toLowerCase(),
      `${FILE}: the late run bound to ${OLD} joins "${late}", the group of the refresh for current head ${NEW}`,
    ).not.toBe(current.toLowerCase());
    expect(currentCi.toLowerCase(), `${FILE}: refreshes of head ${NEW} must share one group, so the newer one wins`)
      .toBe(current.toLowerCase());
  });
});

describe('Repo Health scans with base-commit scripts and hands results to the reporter', () => {
  const repoHealth = load('squad-repo-health.yml');

  it('the reporter guards the file this workflow lives in', () => {
    expect(WORKFLOW_PATH).toBe('.github/workflows/squad-repo-health.yml');
  });

  it('checks out only the PR base commit in every job', () => {
    for (const [id, job] of Object.entries(repoHealth.jobs)) {
      const checkouts = job.steps.filter((step) => step.uses?.startsWith('actions/checkout@'));
      expect(checkouts.length, `squad-repo-health.yml job ${id} checkouts`).toBe(1);
      expect(checkouts[0].with?.ref, `squad-repo-health.yml job ${id} must check out the base commit`)
        .toBe('${{ github.event.pull_request.base.sha }}');
    }
  });

  it('touches the PR head only as Git data', () => {
    const headLines = text('squad-repo-health.yml')
      .split(/\r?\n/)
      .filter((line) => line.includes('github.event.pull_request.head.sha'));
    expect(headLines.length).toBeGreaterThan(0);
    const offenders = headLines.filter((line) =>
      !/git fetch origin|git diff|git rev-list|node scripts\/|^\s+HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}$/.test(line));
    expect(offenders, 'PR head SHA used outside fetch/diff/scanner arguments').toEqual([]);
  });

  it.each(RESULT_JOBS)('uploads the %s result the reporter reads', (job) => {
    const steps = stepsOf(repoHealth);
    const pack = steps.find((step) => step.run?.includes(`--arg job ${job} `));
    expect(pack?.run, `squad-repo-health.yml must package the ${job} result`).toContain(RESULT_SCHEMA);
    expect(pack?.run).toContain(`> "$RUNNER_TEMP/repo-health/${job}.json"`);
    const upload = steps.find((step) => step.with?.name === `repo-health-${job}`);
    expect(upload?.with?.path).toBe(`\${{ runner.temp }}/repo-health/${job}.json`);
  });

  it('the reporter downloads each scanner artifact by exact name into its own directory', () => {
    const steps = stepsOf(load('squad-repo-health-report.yml'));
    const checkout = steps.find((step) => step.uses?.startsWith('actions/checkout@'));
    expect(checkout?.with?.['persist-credentials'], 'the reporter must not persist the write token').toBe(false);
    const downloads = steps.filter((step) => step.uses?.startsWith('actions/download-artifact@'));
    expect(downloads.map((step) => step.with)).toEqual(RESULT_JOBS.map((job) => ({
      name: `repo-health-${job}`,
      path: `\${{ runner.temp }}/repo-health/${job}`,
      'run-id': '${{ github.event.workflow_run.id }}',
      'github-token': '${{ github.token }}',
    })));
    for (const step of downloads) {
      expect(step['continue-on-error'], `${step.name}: a scanner that failed uploads nothing`).toBe(true);
    }
    const report = steps.find((step) => scriptOf(step).includes('/scripts/repo-health-report.mjs'));
    expect(report?.env).toEqual({ REPO_HEALTH_RESULTS: '${{ runner.temp }}/repo-health' });
  });
});
