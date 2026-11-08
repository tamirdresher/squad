import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  BindingError,
  CLAIM_FILE,
  CLAIM_SCHEMA,
  MAX_CLAIM_BYTES,
  bindPullRequest,
  bindWorkflowRun,
  parseClaim,
  readUntrustedFile,
  readWorkflowRun,
} from '../scripts/workflow-run-pr-binding.mjs';

// The privileged half of every split PR workflow (impact, readiness, repo health)
// trusts a pull request only after this module binds it. These cases are the
// attacks and races a fork-controlled `pull_request` run can produce.

const HEAD = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const REQUEST_PATH = '.github/workflows/squad-impact-request.yml';
const scratchRoot = mkdtempSync(join(process.cwd(), '.test-prt-binding-'));

afterAll(() => rmSync(scratchRoot, { recursive: true, force: true }));

function scratch(name: string): string {
  const dir = join(scratchRoot, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function claimText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ schema: CLAIM_SCHEMA, pr_number: 42, head_sha: HEAD, ...overrides });
}

function workflowRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 7001,
    event: 'pull_request',
    path: REQUEST_PATH,
    head_sha: HEAD,
    head_repository: { full_name: 'contributor/squad' },
    repository: { id: 101, full_name: 'github/squad' },
    pull_requests: [],
    ...overrides,
  };
}

function pullRequest(overrides: Record<string, unknown> = {}) {
  return {
    number: 42,
    state: 'open',
    draft: false,
    labels: [{ name: 'skip-changelog' }],
    head: { sha: HEAD, repo: { full_name: 'contributor/squad' } },
    base: { ref: 'dev', repo: { full_name: 'github/squad' } },
    ...overrides,
  };
}

function fakeGithub(pulls: Record<number, unknown>) {
  const requested: number[] = [];
  return {
    requested,
    rest: {
      pulls: {
        get: async ({ pull_number }: { pull_number: number }) => {
          requested.push(pull_number);
          const value = pulls[pull_number];
          if (value instanceof Error) throw value;
          if (!value) throw Object.assign(new Error('Not Found'), { status: 404 });
          return { data: value };
        },
      },
    },
  };
}

function fakeCore() {
  const outputs: Record<string, string> = {};
  const warnings: string[] = [];
  return {
    outputs,
    warnings,
    setOutput: (key: string, value: string) => { outputs[key] = value; },
    warning: (message: string) => { warnings.push(message); },
    info: () => undefined,
  };
}

const run = (overrides: Record<string, unknown> = {}) =>
  readWorkflowRun({ workflow_run: workflowRun(overrides) }, { owner: 'github', repo: 'squad' });

describe('parseClaim accepts only the exact claim shape', () => {
  it('accepts a well-formed claim', () => {
    expect(parseClaim(claimText())).toEqual({ prNumber: 42, headSha: HEAD });
  });

  it.each([
    ['not JSON', '{', 'claim is not JSON'],
    ['an array', '[]', 'must be a JSON object'],
    ['null', 'null', 'must be a JSON object'],
    ['an extra key', claimText({ base_ref: 'dev' }), 'base_ref'],
    ['a missing key', JSON.stringify({ schema: CLAIM_SCHEMA, pr_number: 42 }), 'got "pr_number,schema"'],
    ['another schema', claimText({ schema: 'squad-pr-claim/v2' }), 'squad-pr-claim/v2'],
    ['a string PR number', claimText({ pr_number: '42' }), '"42"'],
    ['a zero PR number', claimText({ pr_number: 0 }), 'pr_number must be a positive integer; got 0'],
    ['a fractional PR number', claimText({ pr_number: 4.2 }), '4.2'],
    ['an unsafe PR number', claimText({ pr_number: 2 ** 53 }), '9007199254740992'],
    ['a short SHA', claimText({ head_sha: 'abc123' }), '"abc123"'],
    ['an uppercase SHA', claimText({ head_sha: 'A'.repeat(40) }), 'A'.repeat(40)],
    ['an oversized claim', claimText({ head_sha: 'x'.repeat(MAX_CLAIM_BYTES) }), `exceeds ${MAX_CLAIM_BYTES} bytes`],
  ])('rejects %s and names the offending value', (_label, text, named) => {
    expect(() => parseClaim(text)).toThrow(BindingError);
    expect(() => parseClaim(text)).toThrow(named);
  });
});

describe('readUntrustedFile reads only small regular files', () => {
  it('returns null for a missing file', () => {
    expect(readUntrustedFile(scratch('missing'), CLAIM_FILE, 64)).toBeNull();
  });

  it('rejects a file over the limit before parsing it', () => {
    const dir = scratch('oversized');
    writeFileSync(join(dir, CLAIM_FILE), 'x'.repeat(65));
    expect(() => readUntrustedFile(dir, CLAIM_FILE, 64)).toThrow(`${CLAIM_FILE} is 65 bytes; the limit is 64`);
  });

  it('rejects a directory in place of the file', () => {
    const dir = scratch('directory');
    mkdirSync(join(dir, CLAIM_FILE));
    expect(() => readUntrustedFile(dir, CLAIM_FILE, 64)).toThrow(`${CLAIM_FILE} is not a regular file`);
  });

  it('rejects bytes that are not UTF-8', () => {
    const dir = scratch('binary');
    writeFileSync(join(dir, CLAIM_FILE), Buffer.from([0xff, 0xfe, 0x00]));
    expect(() => readUntrustedFile(dir, CLAIM_FILE, 64)).toThrow(`${CLAIM_FILE} is not valid UTF-8`);
  });
});

describe('readWorkflowRun trusts only GitHub-produced run facts', () => {
  it('extracts the head, head repository and listed pull requests', () => {
    const listed = [
      { number: 9, base: { repo: { id: 101 } } },
      { number: 3, base: { repo: { id: 999 } } },
      { number: 'x' },
      null,
    ];
    expect(run({ pull_requests: listed })).toEqual({
      id: 7001,
      path: REQUEST_PATH,
      headSha: HEAD,
      headRepository: 'contributor/squad',
      pullRequests: [9, 3],
      basePullRequests: [9],
    });
  });

  it.each([
    ['a push run', { event: 'push' }, 'workflow_run.event must be "pull_request"; got "push"'],
    ['a run from another repository', { repository: { full_name: 'attacker/squad' } }, '"attacker/squad" is not github/squad'],
    ['a malformed head SHA', { head_sha: 'HEAD' }, 'not a commit SHA: "HEAD"'],
    ['a run without a head repository', { head_repository: null }, 'head_repository is missing'],
    [
      'a run that lists pull requests without a repository id',
      { repository: { full_name: 'github/squad' }, pull_requests: [{ number: 9 }] },
      'workflow_run.repository.id is missing',
    ],
  ])('rejects %s', (_label, overrides, named) => {
    expect(() => run(overrides)).toThrow(named);
  });

  it('rejects an event that is not workflow_run', () => {
    expect(() => readWorkflowRun({ pull_request: {} }, { owner: 'github', repo: 'squad' }))
      .toThrow('event payload has no workflow_run');
  });
});

describe('bindPullRequest binds a claim only to the PR the run actually built', () => {
  const bind = (pulls: Record<number, unknown>, options: Record<string, unknown> = {}) => bindPullRequest({
    github: fakeGithub(pulls),
    owner: 'github',
    repo: 'squad',
    run: run(),
    claim: { prNumber: 42, headSha: HEAD },
    ...options,
  });

  it('binds a fork PR, whose run lists no pull requests, through its claim', async () => {
    await expect(bind({ 42: pullRequest() })).resolves.toEqual({
      bound: true,
      pr: { number: 42, headSha: HEAD, baseRef: 'dev', draft: false, labels: ['skip-changelog'] },
    });
  });

  it('binds a same-repository PR', async () => {
    const sameRepo = pullRequest({ head: { sha: HEAD, repo: { full_name: 'github/squad' } } });
    const result = await bindPullRequest({
      github: fakeGithub({ 42: sameRepo }),
      owner: 'github',
      repo: 'squad',
      run: run({
        head_repository: { full_name: 'github/squad' },
        pull_requests: [{ number: 42, base: { repo: { id: 101 } } }],
      }),
      claim: { prNumber: 42, headSha: HEAD },
    });
    expect(result).toMatchObject({ bound: true, pr: { number: 42 } });
  });

  it('refuses a claim naming a PR that the same-repository run does not list', async () => {
    const github = fakeGithub({ 42: pullRequest() });
    await expect(bindPullRequest({
      github,
      owner: 'github',
      repo: 'squad',
      run: run({ pull_requests: [{ number: 41, base: { repo: { id: 101 } } }] }),
      claim: { prNumber: 42, headSha: HEAD },
    })).rejects.toThrow('claim names #42, but the run lists #41');
    expect(github.requested).toEqual([]);
  });

  it('ignores listed pull requests based in other repositories', async () => {
    await expect(bindPullRequest({
      github: fakeGithub({ 42: pullRequest() }),
      owner: 'github',
      repo: 'squad',
      run: run({ pull_requests: [{ number: 3, base: { repo: { id: 999 } } }] }),
      claim: { prNumber: 42, headSha: HEAD },
    })).resolves.toMatchObject({ bound: true, pr: { number: 42 } });
  });

  it('refuses a claim whose head SHA is not the head the run built', async () => {
    await expect(bind({ 42: pullRequest() }, { claim: { prNumber: 42, headSha: OTHER } }))
      .rejects.toThrow(`claim head_sha ${OTHER} does not match workflow_run head_sha ${HEAD}`);
  });

  it('does not write to a PR whose head moved on (stale run)', async () => {
    const result = await bind({ 42: pullRequest({ head: { sha: OTHER, repo: { full_name: 'contributor/squad' } } }) });
    expect(result).toEqual({
      bound: false,
      reason: `#42: head is "${OTHER}", but the run built ${HEAD} (stale or forged claim)`,
    });
  });

  it('does not write to another fork\'s PR that happens to share the head SHA', async () => {
    const victim = pullRequest({ head: { sha: HEAD, repo: { full_name: 'victim/squad' } } });
    const result = await bind({ 42: victim });
    expect(result.bound).toBe(false);
    expect(result).toHaveProperty('reason', expect.stringContaining('"victim/squad" is not the run\'s head repository "contributor/squad"'));
  });

  it('does not write to a PR whose head repository is gone', async () => {
    const result = await bind({ 42: pullRequest({ head: { sha: HEAD, repo: null } }) });
    expect(result).toHaveProperty('reason', expect.stringContaining('head repository null'));
  });

  it('does not write to a PR based in another repository', async () => {
    const result = await bind({ 42: pullRequest({ base: { ref: 'dev', repo: { full_name: 'other/squad' } } }) });
    expect(result).toHaveProperty('reason', '#42: base repository is "other/squad", not github/squad');
  });

  it('does not write to a closed PR unless asked to', async () => {
    const closed = pullRequest({ state: 'closed' });
    await expect(bind({ 42: closed })).resolves.toEqual({ bound: false, reason: '#42: state is "closed"' });
    await expect(bind({ 42: closed }, { requireOpen: false })).resolves.toMatchObject({ bound: true });
  });

  it('treats a claimed PR that does not exist as unbound', async () => {
    await expect(bind({})).resolves.toEqual({ bound: false, reason: '#42: not found' });
  });

  it('propagates API failures other than 404', async () => {
    await expect(bind({ 42: Object.assign(new Error('API down'), { status: 502 }) })).rejects.toThrow('API down');
  });

  it('without a claim, binds only the pull requests GitHub listed on the run', async () => {
    const github = fakeGithub({ 7: pullRequest({ number: 7 }), 42: pullRequest() });
    const result = await bindPullRequest({
      github, owner: 'github', repo: 'squad', run: run({ pull_requests: [{ number: 7 }] }),
    });
    expect(result).toMatchObject({ bound: true, pr: { number: 7 } });
    expect(github.requested).toEqual([7]);
  });

  it('without a claim, a fork run (no listed pull requests) binds nothing', async () => {
    const github = fakeGithub({ 42: pullRequest() });
    await expect(bindPullRequest({ github, owner: 'github', repo: 'squad', run: run() }))
      .resolves.toEqual({ bound: false, reason: 'the run lists no pull request and carried no claim' });
    expect(github.requested).toEqual([]);
  });
});

describe('bindWorkflowRun (github-script entry point)', () => {
  const context = (overrides: Record<string, unknown> = {}) => ({
    repo: { owner: 'github', repo: 'squad' },
    payload: { workflow_run: workflowRun(overrides) },
  });

  it('reads the claim for request runs and exposes the bound PR as step outputs', async () => {
    const dir = scratch('claim-ok');
    writeFileSync(join(dir, CLAIM_FILE), claimText());
    const core = fakeCore();
    await bindWorkflowRun({
      github: fakeGithub({ 42: pullRequest({ draft: true }) }),
      context: context(),
      core,
      claimDir: dir,
      claimWorkflowPath: REQUEST_PATH,
    });
    expect(core.outputs).toEqual({
      bound: 'true',
      pr_number: '42',
      head_sha: HEAD,
      base_ref: 'dev',
      draft: 'true',
      labels: '[{"name":"skip-changelog"}]',
    });
  });

  it('fails a request run whose claim is missing', async () => {
    await expect(bindWorkflowRun({
      github: fakeGithub({ 42: pullRequest() }),
      context: context(),
      core: fakeCore(),
      claimDir: scratch('claim-missing'),
      claimWorkflowPath: REQUEST_PATH,
    })).rejects.toThrow(`${CLAIM_FILE} is missing from the claim artifact`);
  });

  it('fails a request run whose claim is malformed, without calling the API', async () => {
    const dir = scratch('claim-bad');
    writeFileSync(join(dir, CLAIM_FILE), claimText({ pr_number: -1 }));
    const github = fakeGithub({ 42: pullRequest() });
    await expect(bindWorkflowRun({
      github, context: context(), core: fakeCore(), claimDir: dir, claimWorkflowPath: REQUEST_PATH,
    })).rejects.toThrow('claim pr_number must be a positive integer; got -1');
    expect(github.requested).toEqual([]);
  });

  it('ignores claim files for runs of other workflows (Squad CI binds by its own PR list)', async () => {
    const dir = scratch('claim-ignored');
    writeFileSync(join(dir, CLAIM_FILE), claimText({ pr_number: 99 }));
    const core = fakeCore();
    const github = fakeGithub({ 7: pullRequest({ number: 7 }), 99: pullRequest({ number: 99 }) });
    await bindWorkflowRun({
      github,
      context: context({ path: '.github/workflows/squad-ci.yml', pull_requests: [{ number: 7 }] }),
      core,
      claimDir: dir,
      claimWorkflowPath: REQUEST_PATH,
    });
    expect(core.outputs.pr_number).toBe('7');
    expect(github.requested).toEqual([7]);
  });

  it('reports an unbound run as a warning and sets bound=false only', async () => {
    const dir = scratch('claim-stale');
    writeFileSync(join(dir, CLAIM_FILE), claimText());
    const core = fakeCore();
    await bindWorkflowRun({
      github: fakeGithub({ 42: pullRequest({ state: 'closed' }) }),
      context: context(),
      core,
      claimDir: dir,
      claimWorkflowPath: REQUEST_PATH,
    });
    expect(core.outputs).toEqual({ bound: 'false' });
    expect(core.warnings).toEqual(['Not writing to any pull request: #42: state is "closed"']);
  });
});
