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
type Job = { name?: string; if?: string; permissions?: Record<string, string>; steps: Step[] };
type Workflow = {
  name: string;
  on: Record<string, Record<string, unknown> | null>;
  permissions?: Record<string, string>;
  jobs: Record<string, Job>;
};

const workflowsDir = join(process.cwd(), '.github', 'workflows');
const text = (file: string) => readFileSync(join(workflowsDir, file), 'utf8');
const load = (file: string) => parse(text(file)) as Workflow;
const stepsOf = (workflow: Workflow) => Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
const scriptOf = (step: Step) => String(step.with?.script ?? '');

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
      const checkouts = writerSteps.filter((step) => step.uses?.startsWith('actions/checkout@'));
      expect(checkouts.length, `${split.writer} checkouts`).toBe(1);
      expect(checkouts[0].with?.ref, `${split.writer} checkout must not choose a ref`).toBeUndefined();
      expect(checkouts[0].with?.repository, `${split.writer} checkout must not choose a repository`).toBeUndefined();
      const source = text(split.writer);
      expect(source, `${split.writer} has no pull_request payload`).not.toMatch(/github\.event\.pull_request\b/);
      expect(source, `${split.writer} must not fetch or switch to PR commits`).not.toMatch(/\bgit (?:fetch|checkout|switch)\b/);
      for (const step of writerSteps.filter((candidate) => candidate.with?.script)) {
        expect(scriptOf(step), `${split.writer} / ${step.name}: expressions belong in env, not script source`)
          .not.toContain('${{');
      }
    });

    if (split.artifact) {
      it('the writer downloads the request run\'s artifact as data, with a read-only checkout', () => {
        const checkout = writerSteps.find((step) => step.uses?.startsWith('actions/checkout@'))!;
        expect(checkout.with?.['persist-credentials'], `${split.writer} must not persist the write token`).toBe(false);
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
      const steps = stepsOf(load(split.writer));
      const download = steps.findIndex((step) => step.uses?.startsWith('actions/download-artifact@'));
      const bind = steps.findIndex((step) => step.id === 'bind');
      expect(bind, `${split.writer} needs a bind step`).toBeGreaterThan(download);
      expect(scriptOf(steps[bind])).toContain('/scripts/workflow-run-pr-binding.mjs');
      expect(scriptOf(steps[bind])).toContain(`claimWorkflowPath: '.github/workflows/${split.request}'`);
      expect(steps[bind].env).toEqual({ CLAIM_DIR: String(steps[download].with?.path) });
      const afterBind = steps.slice(bind + 1);
      expect(afterBind.length).toBeGreaterThan(0);
      for (const step of afterBind) {
        expect(step.if, `${split.writer} / ${step.name ?? step.uses} must wait for the binding`)
          .toBe("steps.bind.outputs.bound == 'true'");
      }
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
    const check = job.steps.find((step) => step.run === 'node scripts/pr-readiness.mjs');
    expect(check?.env).toMatchObject({
      PR_NUMBER: '${{ steps.bind.outputs.pr_number }}',
      PR_HEAD_SHA: '${{ steps.bind.outputs.head_sha }}',
      PR_BASE_REF: '${{ steps.bind.outputs.base_ref }}',
      PR_DRAFT: '${{ steps.bind.outputs.draft }}',
      PR_LABELS: '${{ steps.bind.outputs.labels }}',
    });
  });

  it('the request check run keeps the name the CI check excludes', () => {
    const request = load('squad-pr-readiness-request.yml');
    for (const [id, requestJob] of Object.entries(request.jobs)) {
      expect(SELF_CHECK_NAMES, `squad-pr-readiness-request.yml job ${id}`).toContain(requestJob.name ?? id);
    }
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
