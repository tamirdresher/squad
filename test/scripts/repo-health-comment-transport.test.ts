import { afterAll, describe, it, expect } from 'vitest';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileFunction, constants as vmConstants } from 'node:vm';
import { parse as parseYaml } from 'yaml';
import {
  BOT_LOGIN,
  EVIDENCE_LABEL,
  refuse as refuseComments,
  run as runComment,
} from '../../scripts/repo-health-comment.mjs';
import { REQUIRED_BASE, RESULT_SCHEMA, WORKFLOW_PATH } from '../../scripts/repo-health-report.mjs';

// Regression coverage for #1770 and the repo-health trust boundary (#1800).
//
// `actions/github-script` compiles the `script:` body with `new AsyncFunction(...)`.
// Anything a workflow interpolates into that body via `${{ ... }}` becomes JavaScript
// *source*, so a finding message that quotes code in backticks terminates the enclosing
// template literal and the rest of the report is parsed as code
// (`SyntaxError: Unexpected identifier 'git'`).
//
// The github org blocks pull_request_target, so the scanners now run in the
// unprivileged `pull_request` workflow (squad-repo-health.yml) and upload results;
// the default-branch `workflow_run` reporter (squad-repo-health-report.yml) posts
// them. These tests run the real reporter workflow script, with result files on
// disk, through the real modules and a fake Octokit.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const workflowsDir = join(repoRoot, '.github', 'workflows');
const REPORTER = 'squad-repo-health-report.yml';
const HEAD = 'c'.repeat(40);
const scratchRoot = mkdtempSync(join(repoRoot, '.test-repo-health-'));

afterAll(() => rmSync(scratchRoot, { recursive: true, force: true }));

let scratchCount = 0;
function scratch(): string {
  const dir = join(scratchRoot, String(++scratchCount));
  mkdirSync(dir, { recursive: true });
  return dir;
}

interface Step {
  name: string;
  indent: number;
  body: string[];
}

function readWorkflow(file: string): string {
  return readFileSync(join(workflowsDir, file), 'utf-8');
}

/** Split a workflow into named steps using YAML block indentation. */
function parseSteps(text: string): Step[] {
  const steps: Step[] = [];
  let current: Step | null = null;

  for (const line of text.split(/\r?\n/)) {
    const start = line.match(/^(\s*)- name:\s*(.*)$/);
    if (start) {
      if (current) steps.push(current);
      current = { name: start[2].trim(), indent: start[1].length, body: [line] };
      continue;
    }
    if (!current) continue;
    if (line.trim() === '') {
      current.body.push(line);
      continue;
    }
    const indent = line.match(/^\s*/)![0].length;
    if (indent <= current.indent) {
      steps.push(current);
      current = null;
      continue;
    }
    current.body.push(line);
  }
  if (current) steps.push(current);
  return steps;
}

/** Read the `env:` mapping of a step (raw values, expressions unresolved). */
function stepEnv(step: Step): Record<string, string> {
  const env: Record<string, string> = {};
  const index = step.body.findIndex((line) => /^\s*env:\s*$/.test(line));
  if (index < 0) return env;

  const indent = step.body[index].match(/^\s*/)![0].length;
  for (let i = index + 1; i < step.body.length; i++) {
    const line = step.body[i];
    if (line.trim() === '') continue;
    if (line.match(/^\s*/)![0].length <= indent) break;
    const pair = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (pair) env[pair[1]] = pair[2].trim();
  }
  return env;
}

/** Read a `<key>: |` literal block of a step (`script` or `run`), dedented. */
function stepBlock(step: Step, key: 'script' | 'run'): string | null {
  const index = step.body.findIndex((line) => new RegExp(`^\\s*${key}:\\s*\\|\\s*$`).test(line));
  if (index < 0) return null;

  const indent = step.body[index].match(/^\s*/)![0].length;
  const lines: string[] = [];
  for (let i = index + 1; i < step.body.length; i++) {
    const line = step.body[i];
    if (line.trim() === '') {
      lines.push('');
      continue;
    }
    if (line.match(/^\s*/)![0].length <= indent) break;
    lines.push(line.slice(indent + 2));
  }
  return lines.join('\n');
}

const stepScript = (step: Step) => stepBlock(step, 'script');

/** Apply GitHub Actions `${{ }}` expression substitution, as the runner does. */
function substitute(text: string, values: Record<string, string>): string {
  return text.replace(/\$\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression: string) => {
    const key = expression.trim();
    if (!(key in values)) throw new Error(`Test does not model expression: ${key}`);
    return values[key];
  });
}

type ApiMethod = 'createComment' | 'updateComment' | 'deleteComment' | 'listComments';

interface FakeComment {
  id: number;
  body: string;
  user?: { login: string };
}

interface FakeOptions {
  comments?: FakeComment[];
  fail?: ApiMethod;
  pull?: Record<string, unknown>;
  /** Successive pulls.get results; the last repeats. Models a push after binding. */
  pulls?: Array<Record<string, unknown>>;
  /** The live PR file list. The reporter must not decide authority from it. */
  files?: Array<{ filename: string; previous_filename?: string }>;
  /** getContent data for WORKFLOW_PATH by commit SHA: null is a 404, an Error is thrown. */
  blobs?: Record<string, unknown>;
  devTip?: unknown;
  mergeBase?: unknown;
  compareFailure?: Error;
}

// Commit-pinned fixtures: the dev tip, the merge base of dev and HEAD, a commit
// pushed after binding, and blob SHAs of squad-repo-health.yml.
const DEV_TIP = '1'.repeat(40);
const MERGE_BASE = '2'.repeat(40);
const BASE_BLOB = '3'.repeat(40);
const PR_BLOB = '4'.repeat(40);
const MOVED = '5'.repeat(40);
const workflowFile = (sha: string) => ({ type: 'file', path: WORKFLOW_PATH, sha });
const BOT = { login: BOT_LOGIN };

function openPull(overrides: Record<string, unknown> = {}) {
  return {
    number: 1770,
    state: 'open',
    draft: false,
    labels: [],
    head: { sha: HEAD, repo: { full_name: 'contributor/squad' } },
    base: { ref: 'dev', repo: { full_name: 'github/squad' } },
    ...overrides,
  };
}

function makeOctokit(options: FakeOptions = {}) {
  const created: Array<{ body: string }> = [];
  const updated: Array<{ comment_id: number; body: string }> = [];
  const deleted: Array<{ comment_id: number }> = [];
  const calls = {
    getRef: [] as Array<Record<string, unknown>>,
    compare: [] as Array<Record<string, unknown>>,
    getContent: [] as Array<{ path: string; ref: string }>,
  };
  const failure = new Error(`mocked ${options.fail ?? 'API'} failure`);
  const rejectIf = (method: ApiMethod) => {
    if (options.fail === method) throw failure;
  };
  const pulls = options.pulls ?? [options.pull ?? openPull()];
  let pullReads = 0;
  const blobs: Record<string, unknown> = {
    [HEAD]: workflowFile(BASE_BLOB),
    [MERGE_BASE]: workflowFile(BASE_BLOB),
    ...options.blobs,
  };
  const rest = {
    pulls: {
      get: async () => ({ data: pulls[Math.min(pullReads++, pulls.length - 1)] }),
      listFiles: () => undefined,
    },
    git: {
      getRef: async (params: { ref: string }) => {
        calls.getRef.push(params);
        const sha = 'devTip' in options ? options.devTip : DEV_TIP;
        return { data: { ref: `refs/${params.ref}`, object: { type: 'commit', sha } } };
      },
    },
    repos: {
      compareCommitsWithBasehead: async (params: { basehead: string }) => {
        calls.compare.push(params);
        if (options.compareFailure) throw options.compareFailure;
        const sha = 'mergeBase' in options ? options.mergeBase : MERGE_BASE;
        return { data: { merge_base_commit: { sha } } };
      },
      getContent: async (params: { path: string; ref: string }) => {
        calls.getContent.push(params);
        const data = params.path === WORKFLOW_PATH ? blobs[params.ref] : undefined;
        if (data instanceof Error) throw data;
        if (data === undefined || data === null) throw Object.assign(new Error('Not Found'), { status: 404 });
        return { data };
      },
    },
    issues: {
      listComments: () => undefined,
      createComment: async (params: { body: string }) => {
        rejectIf('createComment');
        created.push(params);
      },
      updateComment: async (params: { comment_id: number; body: string }) => {
        rejectIf('updateComment');
        updated.push(params);
      },
      deleteComment: async (params: { comment_id: number }) => {
        rejectIf('deleteComment');
        deleted.push(params);
      },
    },
  };
  const github = {
    paginate: async (method: unknown) => {
      if (method === rest.pulls.listFiles) return options.files ?? [{ filename: 'scripts/demo.sh' }];
      rejectIf('listComments');
      return options.comments ?? [];
    },
    rest,
  };
  const writes = () => created.length + updated.length + deleted.length;
  return { github, created, updated, deleted, writes, failure, calls };
}

function makeCore() {
  const notices: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  return {
    notices,
    warnings,
    errors,
    notice: (message: string) => notices.push(message),
    warning: (message: string) => warnings.push(message),
    error: (message: string) => errors.push(message),
    info: () => undefined,
  };
}

const context = {
  repo: { owner: 'github', repo: 'squad' },
  payload: {
    workflow_run: {
      id: 1770,
      event: 'pull_request',
      path: '.github/workflows/squad-repo-health.yml',
      head_sha: HEAD,
      head_repository: { full_name: 'contributor/squad' },
      repository: { id: 101, full_name: 'github/squad' },
      pull_requests: [],
    },
  },
};

type Job = 'leakage' | 'architectural' | 'security';

/** The directory the reporter workflow downloads artifact `repo-health-<job>` into, by exact name. */
function downloadDir(runnerTemp: string, job: Job): string {
  const steps = parseYaml(readWorkflow(REPORTER)).jobs.report.steps as Array<{ with?: Record<string, unknown> }>;
  const download = steps.find((step) => step.with?.name === `repo-health-${job}`);
  expect(download, `${REPORTER} must download repo-health-${job} by its exact name`).toBeTruthy();
  return substitute(String(download!.with!.path), { 'runner.temp': runnerTemp });
}

/** Where a downloaded `<job>.json` lands; creates its directory. */
function resultFile(runnerTemp: string, job: Job): string {
  const dir = downloadDir(runnerTemp, job);
  mkdirSync(dir, { recursive: true });
  return join(dir, `${job}.json`);
}

/** Write result files as squad-repo-health.yml packages them, where the reporter downloads them. */
function writeResults(
  outputs: Partial<Record<Job, string>>,
  claim: { prNumber?: number; headSha?: string } = {},
): string {
  const runnerTemp = scratch();
  mkdirSync(join(runnerTemp, 'repo-health'));
  for (const [job, output] of Object.entries(outputs)) {
    writeFileSync(resultFile(runnerTemp, job as Job), JSON.stringify({
      schema: RESULT_SCHEMA,
      job,
      pr_number: claim.prNumber ?? 1770,
      head_sha: claim.headSha ?? HEAD,
      output,
    }));
  }
  return runnerTemp;
}

function reporterStep(): Step {
  const step = parseSteps(readWorkflow(REPORTER))
    .find((candidate) => (stepScript(candidate) ?? '').includes('/scripts/repo-health-report.mjs'));
  expect(step, `no reporter step found in ${REPORTER}`).toBeTruthy();
  return step!;
}

/**
 * Execute the reporter workflow script exactly the way `actions/github-script` does:
 * resolve the step env, compile the body as an async function, and invoke it.
 */
async function runReporter(
  runnerTemp: string,
  octokit = makeOctokit(),
  core = makeCore(),
) {
  const step = reporterStep();
  const script = stepScript(step);
  expect(script).not.toContain('${{');

  const values = { 'runner.temp': runnerTemp };
  const applied: Record<string, string> = { GITHUB_WORKSPACE: pathToFileURL(repoRoot).href };
  for (const [key, raw] of Object.entries(stepEnv(step))) applied[key] = substitute(raw, values);

  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(applied)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    // `vm.compileFunction` mirrors github-script's AsyncFunction and lets the body's
    // `await import(...)` resolve. Compilation is where the pre-#1770 bug detonated.
    const compiled = compileFunction(
      `return (async () => {\n${script}\n})();`,
      ['github', 'context', 'core'],
      { importModuleDynamically: vmConstants.USE_MAIN_CONTEXT_DEFAULT_LOADER },
    ) as (...args: unknown[]) => Promise<unknown>;
    await compiled(octokit.github, context, core);
  } finally {
    for (const key of Object.keys(applied)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
  return { ...octokit, core };
}

// Every hostile character that has ever shown up in a real finding message:
// a backtick pair (quoted code), a bare `${` (template substitution opener),
// an apostrophe, a double quote, and an embedded newline.
//
// The quoted command below is deliberately one the security scanner does NOT
// flag. These fixtures are added lines in the PR diff, so quoting a command on
// the scanner's unsafe-git denylist makes it emit a real finding against this
// very file — and that finding is itself backtick-wrapped. Keep the backticks;
// keep the command boring.
const HOSTILE_MESSAGE =
  'Unsafe git operation: `git cherry-pick --no-commit` — quoting `code` here, ' +
  'plus a bare ${ opener, an apostrophe \' and a "double quote".\nSecond line of the message.';

const HOSTILE_PATH = ".squad/canary-`paired`-${-apostrophe-'-\"double quote\".md";

function securityReport() {
  const payload = {
    findings: [
      {
        category: 'unsafe-git',
        severity: 'error',
        message: HOSTILE_MESSAGE,
        file: 'scripts/demo.sh',
        line: 12,
      },
    ],
    summary: '🔒 Security review: 1 error(s).',
  };
  return `${JSON.stringify(payload, null, 2)}\n\n${payload.summary}`;
}

function architecturalReport() {
  const payload = {
    findings: [
      {
        category: 'layering',
        severity: 'warning',
        message: HOSTILE_MESSAGE,
        files: ['packages/squad-cli/src/demo.ts'],
      },
    ],
    summary: '🏗️ Architectural review: 1 warning(s).',
  };
  return `${JSON.stringify(payload, null, 2)}\n\n${payload.summary}`;
}

function leakageReport() {
  return JSON.stringify({ leaked: true, files: [HOSTILE_PATH] }, null, 2);
}

function realLeakageReport(): string {
  const cwd = scratch();
  const git = (args: string[]) => execFileSync(
    'git',
    args,
    { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  git(['init', '--quiet', '-b', 'dev']);
  git(['config', 'core.quotePath', 'true']);
  git(['config', 'user.name', 'Squad Test']);
  git(['config', 'user.email', 'test@example.invalid']);
  writeFileSync(join(cwd, 'README.md'), 'base\n');
  git(['add', '--', 'README.md']);
  git(['commit', '--quiet', '-m', 'base']);
  git(['switch', '--quiet', '-c', 'feature']);
  mkdirSync(join(cwd, '.squad'));
  writeFileSync(join(cwd, HOSTILE_PATH), 'canary\n');
  git(['add', '--', HOSTILE_PATH]);
  git(['commit', '--quiet', '-m', 'canary']);

  const result = spawnSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'check-squad-leakage.mjs'), 'dev', 'HEAD'],
    { cwd, encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  return result.stdout;
}

const hasJq = spawnSync('jq', ['--version'], { encoding: 'utf8' }).status === 0;
const hasBash = spawnSync('bash', ['-c', 'true'], { encoding: 'utf8' }).status === 0;
// Windows file names cannot contain `"`, so the hostile canary file cannot exist there.
const canCreateHostilePath = process.platform !== 'win32';

describe('repo-health reporter survives hostile finding content (#1770)', () => {
  it('reports a security finding whose message contains backticks', async () => {
    const { created } = await runReporter(writeResults({ security: securityReport() }));

    expect(created).toHaveLength(1);
    expect(created[0].body).toContain('<!-- squad-security-review -->');
    expect(created[0].body).toContain(HOSTILE_MESSAGE);
    expect(created[0].body).toContain(EVIDENCE_LABEL);
    expect(created[0].body).toContain(`${EVIDENCE_LABEL}\n> Results for head commit \`${HEAD}\`.`);
  });

  it('reports an architectural finding whose message contains backticks', async () => {
    const { created } = await runReporter(writeResults({ architectural: architecturalReport() }));

    expect(created).toHaveLength(1);
    expect(created[0].body).toContain('<!-- squad-architectural-review -->');
    expect(created[0].body).toContain(HOSTILE_MESSAGE);
    expect(created[0].body).toContain(EVIDENCE_LABEL);
  });

  it('reports leaked squad files whose paths contain backticks', async () => {
    const { created } = await runReporter(writeResults({ leakage: leakageReport() }));

    expect(created).toHaveLength(1);
    expect(created[0].body).toContain('<!-- squad-repo-health-leakage -->');
    expect(created[0].body).toContain(HOSTILE_PATH);
    expect(created[0].body).toContain(EVIDENCE_LABEL);
    expect(created[0].body.match(/<!-- squad-repo-health-leakage -->/g)).toHaveLength(1);
  });

  it('posts all three scanners\' findings from one run, one comment each', async () => {
    const { created } = await runReporter(writeResults({
      leakage: leakageReport(),
      architectural: architecturalReport(),
      security: securityReport(),
    }));

    expect(created.map((comment) => comment.body.split('\n', 1)[0])).toEqual([
      '<!-- squad-repo-health-leakage -->',
      '<!-- squad-architectural-review -->',
      '<!-- squad-security-review -->',
    ]);
  });

  it.skipIf(!canCreateHostilePath)('passes real scanner output through the reporter with the exact raw path', async () => {
    const { created } = await runReporter(writeResults({ leakage: realLeakageReport() }));

    expect(created).toHaveLength(1);
    expect(created[0].body).toContain(HOSTILE_PATH);
    expect(created[0].body.match(/<!-- squad-repo-health-leakage -->/g)).toHaveLength(1);
    expect(created[0].body).toContain(EVIDENCE_LABEL);
  });

  it.skipIf(!hasJq || !hasBash)(
    'carries scanner output through the workflow\'s own packaging command',
    async () => {
      const packaging = parseSteps(readWorkflow('squad-repo-health.yml'))
        .map((step) => stepBlock(step, 'run') ?? '')
        .find((run) => run.includes('--arg job leakage '));
      expect(packaging, 'squad-repo-health.yml must package the leakage result').toBeTruthy();

      const runnerTemp = scratch().replace(/\\/g, '/');
      mkdirSync(join(runnerTemp, 'repo-health'));
      const scannerOutput = canCreateHostilePath ? realLeakageReport() : leakageReport();
      writeFileSync(join(runnerTemp, 'repo-health', 'output.txt'), scannerOutput);
      const packed = spawnSync('bash', ['-eo', 'pipefail', '-c', packaging!], {
        encoding: 'utf8',
        env: { ...process.env, RUNNER_TEMP: runnerTemp, PR_NUMBER: '1770', HEAD_SHA: HEAD },
      });
      expect(packed.status, packed.stderr).toBe(0);
      // upload-artifact `repo-health-leakage`, then download-artifact by that name into its own directory.
      copyFileSync(join(runnerTemp, 'repo-health', 'leakage.json'), resultFile(runnerTemp, 'leakage'));

      const { created } = await runReporter(runnerTemp);
      expect(created).toHaveLength(1);
      expect(created[0].body).toContain(`- \`${HOSTILE_PATH}\``);
    },
  );

  it.each([
    ['empty', ''],
    ['malformed JSON', '{'],
    ['wrong JSON type', '[]'],
    ['extra property', '{"leaked":false,"files":[],"error":null}'],
    ['inconsistent clean result', '{"leaked":false,"files":[".squad/stale.md"]}'],
    ['inconsistent leaked result', '{"leaked":true,"files":[]}'],
    ['empty path', '{"leaked":true,"files":[""]}'],
    ['absolute path', '{"leaked":true,"files":["/.squad/stale.md"]}'],
    ['outside path', '{"leaked":true,"files":["outside.md"]}'],
    ['newline path', '{"leaked":true,"files":[".squad/line\\nbreak.md"]}'],
  ])('rejects %s leakage output without deleting a stale marker', async (_label, output) => {
    const octokit = makeOctokit({ comments: [{ id: 42, body: '<!-- squad-repo-health-leakage -->\nold' }] });

    await expect(runReporter(writeResults({ leakage: output }), octokit)).rejects.toThrow();
    expect(octokit.writes()).toBe(0);
  });

  const finding = { category: 'layering', severity: 'warning', message: 'm', files: ['a.ts'] };
  const securityFinding = { category: 'eval-usage', severity: 'error', message: 'm', file: 'a.ts', line: 3 };
  it.each([
    ['architectural', 'not JSON', 'Security review: clean'],
    ['architectural', 'an extra top-level key', JSON.stringify({ findings: [], summary: 's', extra: 1 })],
    ['architectural', 'findings that are not an array', JSON.stringify({ findings: {}, summary: 's' })],
    ['architectural', 'an unknown severity', JSON.stringify({ findings: [{ ...finding, severity: 'fatal' }], summary: 's' })],
    ['architectural', 'files that are not a list', JSON.stringify({ findings: [{ ...finding, files: 'a.ts' }], summary: 's' })],
    ['architectural', 'an extra finding key', JSON.stringify({ findings: [{ ...finding, url: 'x' }], summary: 's' })],
    ['security', 'a missing line', JSON.stringify({ findings: [{ ...securityFinding, line: undefined }], summary: 's' })],
    ['security', 'a negative line', JSON.stringify({ findings: [{ ...securityFinding, line: -1 }], summary: 's' })],
    ['security', 'an oversized message', JSON.stringify({ findings: [{ ...securityFinding, message: 'x'.repeat(10001) }], summary: 's' })],
  ])('rejects %s output with %s without touching its marker', async (job, _label, output) => {
    const marker = job === 'security' ? '<!-- squad-security-review -->' : '<!-- squad-architectural-review -->';
    const octokit = makeOctokit({ comments: [{ id: 42, body: `${marker}\nold` }] });

    await expect(runReporter(writeResults({ [job]: output }), octokit))
      .rejects.toThrow(`Invalid ${job === 'security' ? 'security' : 'architectural'} review scanner output`);
    expect(octokit.writes()).toBe(0);
  });
});

describe('repo-health comment lifecycle uses the real reporter contract', () => {
  const marker = '<!-- squad-security-review -->';

  it('updates the one existing marker comment and preserves hostile multiline text exactly', async () => {
    const { created, updated, deleted } = await runReporter(
      writeResults({ security: securityReport() }),
      makeOctokit({ comments: [{ id: 42, body: `${marker}\nold` }] }),
    );

    expect(created).toEqual([]);
    expect(deleted).toEqual([]);
    expect(updated).toHaveLength(1);
    expect(updated[0].body.match(/<!-- squad-security-review -->/g)).toHaveLength(1);
    expect(updated[0].body).toContain(HOSTILE_MESSAGE);
  });

  it('deletes a stale marker comment when the scanner is clean', async () => {
    const { created, updated, deleted } = await runReporter(
      writeResults({ security: JSON.stringify({ findings: [], summary: 'clean' }) }),
      makeOctokit({ comments: [{ id: 42, body: `${marker}\nold` }] }),
    );

    expect(created).toEqual([]);
    expect(updated).toEqual([]);
    expect(deleted).toEqual([{ owner: 'github', repo: 'squad', comment_id: 42 }]);
  });

  it('does not treat a marker embedded in another reporter body as ownership', async () => {
    const injected = [
      '<!-- squad-repo-health-leakage -->',
      '## leakage',
      '- `.squad/<!-- squad-security-review -->.md`',
    ].join('\n');
    const { created, updated, deleted } = await runReporter(
      writeResults({ security: JSON.stringify({ findings: [], summary: 'clean' }) }),
      makeOctokit({ comments: [{ id: 42, body: injected }] }),
    );

    expect(created).toEqual([]);
    expect(updated).toEqual([]);
    expect(deleted).toEqual([]);
  });

  it('leaves the comment of a scanner that uploaded nothing (it failed) untouched', async () => {
    const leakageMarker = '<!-- squad-repo-health-leakage -->';
    const { created, updated, deleted } = await runReporter(
      writeResults({ security: JSON.stringify({ findings: [], summary: 'clean' }) }),
      makeOctokit({ comments: [{ id: 41, body: `${leakageMarker}\nold` }, { id: 42, body: `${marker}\nold` }] }),
    );

    expect(created).toEqual([]);
    expect(updated).toEqual([]);
    expect(deleted).toEqual([{ owner: 'github', repo: 'squad', comment_id: 42 }]);
  });

  it('refuses to post without a bound PR number (workflow_run has no context.issue)', async () => {
    const octokit = makeOctokit();
    for (const issueNumber of [undefined, 0, '1770']) {
      await expect(runComment({
        github: octokit.github, context, output: securityReport(), job: 'security', issueNumber,
      })).rejects.toThrow('repo-health security needs a bound PR number');
    }
    expect(octokit.writes()).toBe(0);
  });

  it('refuses to post without the bound head SHA', async () => {
    const octokit = makeOctokit();
    for (const headSha of [undefined, 'HEAD', HEAD.toUpperCase(), `${HEAD}\n`]) {
      await expect(runComment({
        github: octokit.github, context, output: securityReport(), job: 'security', issueNumber: 1770, headSha,
      })).rejects.toThrow('repo-health security needs the bound head SHA');
    }
    expect(octokit.writes()).toBe(0);
  });

  for (const method of ['listComments', 'createComment', 'updateComment', 'deleteComment'] as const) {
    it(`propagates mocked ${method} failures so the github-script step is red`, async () => {
      const clean = method === 'deleteComment';
      const existing = method === 'updateComment' || method === 'deleteComment'
        ? [{ id: 42, body: `${marker}\nold` }]
        : [];
      const output = clean
        ? JSON.stringify({ findings: [], summary: 'clean' })
        : securityReport();

      await expect(runReporter(
        writeResults({ security: output }),
        makeOctokit({ comments: existing, fail: method }),
      )).rejects.toThrow(`mocked ${method} failure`);
    });
  }
});

describe('repo-health reporter binds untrusted results before writing', () => {
  it('posts nothing when the PR head moved on after the scan', async () => {
    const octokit = makeOctokit({ pull: openPull({ head: { sha: 'd'.repeat(40), repo: { full_name: 'contributor/squad' } } }) });
    const { core } = await runReporter(writeResults({ security: securityReport() }), octokit);

    expect(octokit.writes()).toBe(0);
    expect(core.warnings.join('\n')).toContain('stale or forged claim');
  });

  it('refuses results whose head SHA is not the head the run built', async () => {
    const octokit = makeOctokit();
    await expect(runReporter(writeResults({ security: securityReport() }, { headSha: 'e'.repeat(40) }), octokit))
      .rejects.toThrow(`claim head_sha ${'e'.repeat(40)} does not match workflow_run head_sha ${HEAD}`);
    expect(octokit.writes()).toBe(0);
  });

  it('refuses results that disagree about which PR they belong to', async () => {
    const runnerTemp = writeResults({ security: securityReport() });
    writeFileSync(resultFile(runnerTemp, 'leakage'), JSON.stringify({
      schema: RESULT_SCHEMA, job: 'leakage', pr_number: 9, head_sha: HEAD, output: leakageReport(),
    }));
    const octokit = makeOctokit();

    await expect(runReporter(runnerTemp, octokit)).rejects.toThrow('scanner results disagree');
    expect(octokit.writes()).toBe(0);
  });

  it.each([
    ['another schema', { schema: 'squad-repo-health-result/v0' }, 'schema must be squad-repo-health-result/v1'],
    ['another job', { job: 'security' }, 'leakage.json names job "security"'],
    ['an extra key', { exit_code: 0 }, 'exit_code'],
    ['a string PR number', { pr_number: '1770' }, 'pr_number must be a positive integer; got "1770"'],
  ])('refuses a result file with %s', async (_label, overrides, named) => {
    const runnerTemp = scratch();
    mkdirSync(join(runnerTemp, 'repo-health'));
    writeFileSync(resultFile(runnerTemp, 'leakage'), JSON.stringify({
      schema: RESULT_SCHEMA, job: 'leakage', pr_number: 1770, head_sha: HEAD, output: leakageReport(), ...overrides,
    }));
    const octokit = makeOctokit();

    await expect(runReporter(runnerTemp, octokit)).rejects.toThrow(named);
    expect(octokit.writes()).toBe(0);
  });

  it('refuses an oversized result file before parsing it', async () => {
    const runnerTemp = writeResults({ security: `${securityReport()}${' '.repeat(1024 * 1024)}` });
    const octokit = makeOctokit();

    await expect(runReporter(runnerTemp, octokit)).rejects.toThrow('the limit is 1048576');
    expect(octokit.writes()).toBe(0);
  });

  it('changes nothing when the run uploaded no results', async () => {
    const runnerTemp = scratch();
    mkdirSync(join(runnerTemp, 'repo-health'));
    const octokit = makeOctokit({ comments: [{ id: 42, body: '<!-- squad-security-review -->\nold' }] });
    const { core } = await runReporter(runnerTemp, octokit);

    expect(octokit.writes()).toBe(0);
    expect(core.notices).toEqual(['Repo Health uploaded no scanner results; no comment was changed.']);
  });

  it('reads each result only from its own artifact\'s directory', async () => {
    const runnerTemp = writeResults({ leakage: '{"leaked":false,"files":[]}' });
    // A leakage artifact that also carries a security result must not count as one.
    writeFileSync(join(downloadDir(runnerTemp, 'leakage'), 'security.json'), JSON.stringify({
      schema: RESULT_SCHEMA, job: 'security', pr_number: 1770, head_sha: HEAD, output: securityReport(),
    }));
    const octokit = makeOctokit();
    await runReporter(runnerTemp, octokit);

    expect(octokit.writes()).toBe(0);
  });
});

describe('repo-health reporter decides authority from commit-pinned data', () => {
  const forgedClean = '{"leaked":false,"files":[]}';

  it('posts when the run\'s head commit keeps its merge base\'s workflow blob, reading both by SHA', async () => {
    const octokit = makeOctokit();
    const { created } = await runReporter(writeResults({ security: securityReport() }), octokit);

    expect(created).toHaveLength(1);
    expect(octokit.calls.getRef).toEqual([{ owner: 'github', repo: 'squad', ref: `heads/${REQUIRED_BASE}` }]);
    expect(octokit.calls.compare).toEqual([{ owner: 'github', repo: 'squad', basehead: `${DEV_TIP}...${HEAD}` }]);
    expect(octokit.calls.getContent.map(({ path, ref }) => `${path}@${ref}`))
      .toEqual([`${WORKFLOW_PATH}@${HEAD}`, `${WORKFLOW_PATH}@${MERGE_BASE}`]);
  });

  it('posts nothing when the head moves between binding and the check', async () => {
    // Bound while the PR head is HEAD, whose workflow edit forged these results. The author
    // then pushes MOVED without that edit, so live PR data (head, files) now looks clean.
    const octokit = makeOctokit({
      pulls: [openPull(), openPull({ head: { sha: MOVED, repo: { full_name: 'contributor/squad' } } })],
      files: [{ filename: 'scripts/demo.sh' }],
      blobs: { [HEAD]: workflowFile(PR_BLOB), [MOVED]: workflowFile(BASE_BLOB) },
    });
    const { core } = await runReporter(
      writeResults({ security: securityReport(), leakage: forgedClean }),
      octokit,
    );

    expect(octokit.writes()).toBe(0);
    expect(core.notices.join('\n')).toContain(`${HEAD} changes ${WORKFLOW_PATH}`);
  });

  it('replaces, never deletes, the leakage warning a forged clean result targets', async () => {
    const octokit = makeOctokit({
      blobs: { [HEAD]: workflowFile(PR_BLOB) },
      comments: [{ id: 41, user: BOT, body: '<!-- squad-repo-health-leakage -->\n## ⚠️ Squad File Leakage Detected' }],
    });
    await runReporter(writeResults({ leakage: forgedClean }), octokit);

    expect(octokit.created).toEqual([]);
    expect(octokit.deleted).toEqual([]);
    expect(octokit.updated.map(({ comment_id }) => comment_id)).toEqual([41]);
    expect(octokit.updated[0].body.split('\n', 1)[0]).toBe('<!-- squad-repo-health-leakage -->');
    expect(octokit.updated[0].body).toContain(`results for head commit \`${HEAD}\``);
  });

  it.each([
    ['changes the workflow', { [HEAD]: workflowFile(PR_BLOB) }, `${HEAD} changes ${WORKFLOW_PATH}`],
    ['deletes or renames the workflow away', { [HEAD]: null }, `${HEAD} has no regular file ${WORKFLOW_PATH}`],
    ['makes the workflow a symlink', { [HEAD]: { type: 'symlink', path: WORKFLOW_PATH, sha: BASE_BLOB } }, `${HEAD} has no regular file`],
    ['makes the workflow a directory', { [HEAD]: [] }, `${HEAD} has no regular file`],
    ['is based where the workflow does not exist', { [MERGE_BASE]: null }, `merge base ${MERGE_BASE} has no regular file`],
    ['and its merge base both lack the workflow', { [HEAD]: null, [MERGE_BASE]: null }, `${HEAD} has no regular file`],
  ])('posts nothing for a head commit that %s', async (_label, blobs, named) => {
    const octokit = makeOctokit({ blobs, comments: [{ id: 42, body: '<!-- squad-security-review -->\nold' }] });
    const { core } = await runReporter(writeResults({ security: securityReport() }), octokit);

    expect(octokit.writes()).toBe(0);
    expect(core.notices.join('\n')).toContain(named);
  });

  it('posts when only dev changed the workflow after the PR branched', async () => {
    // Head and merge base share a blob; the dev tip moved on. A PR that does not touch the
    // file runs the base's definition, so this run is authoritative.
    const octokit = makeOctokit({ blobs: { [DEV_TIP]: workflowFile('6'.repeat(40)) } });
    const { created } = await runReporter(writeResults({ security: securityReport() }), octokit);

    expect(created).toHaveLength(1);
  });

  it.each([
    ['the compare API fails', { compareFailure: Object.assign(new Error('compare unavailable'), { status: 502 }) }, 'compare unavailable'],
    ['dev does not resolve to a commit', { devTip: 'dev' }, 'refs/heads/dev does not name a commit'],
    ['the comparison has no merge base', { mergeBase: undefined }, 'no merge base between dev'],
    ['reading the workflow fails', { blobs: { [HEAD]: Object.assign(new Error('contents unavailable'), { status: 500 }) } }, 'contents unavailable'],
  ])('fails without writing when %s', async (_label, options, named) => {
    const octokit = makeOctokit({
      ...options,
      comments: [{ id: 42, user: BOT, body: '<!-- squad-security-review -->\nold' }],
    });

    await expect(runReporter(writeResults({ security: securityReport() }), octokit)).rejects.toThrow(named);
    expect(octokit.writes()).toBe(0);
  });
});

describe('repo-health reporter makes a refusal visible on the bound PR', () => {
  const security = '<!-- squad-security-review -->';

  it('refuses a PR that no longer targets dev', async () => {
    const octokit = makeOctokit({
      pull: openPull({ base: { ref: 'main', repo: { full_name: 'github/squad' } } }),
      comments: [{ id: 42, user: BOT, body: `${security}\nold` }],
    });
    const { core } = await runReporter(writeResults({ security: securityReport() }), octokit);

    expect(octokit.created).toEqual([]);
    expect(octokit.deleted).toEqual([]);
    expect(octokit.updated.map(({ comment_id }) => comment_id)).toEqual([42]);
    expect(octokit.updated[0].body).toContain('no longer targets `dev`');
    expect(core.notices.join('\n')).toContain('PR #1770 targets "main", not dev');
  });

  it('overwrites only its own marker comments, with fixed text naming the refused commit', async () => {
    const octokit = makeOctokit({
      blobs: { [HEAD]: workflowFile(PR_BLOB) },
      comments: [
        { id: 41, user: BOT, body: '<!-- squad-repo-health-leakage -->\nold leakage warning' },
        { id: 42, user: BOT, body: `${security}\nold findings` },
        { id: 43, user: { login: 'mallory' }, body: `${security}\nnot the bot's` },
        { id: 44, user: BOT, body: `quoted\n${security}` },
        { id: 45, user: BOT, body: '<!-- squad-impact-analysis -->\nanother reporter' },
      ],
    });
    await runReporter(writeResults({ security: securityReport() }), octokit);

    expect(octokit.created).toEqual([]);
    expect(octokit.deleted).toEqual([]);
    expect(octokit.updated.map(({ comment_id }) => comment_id)).toEqual([41, 42]);
    expect(octokit.updated.map(({ body }) => body.split('\n', 1)[0]))
      .toEqual(['<!-- squad-repo-health-leakage -->', security]);
    for (const { body } of octokit.updated) {
      expect(body).toContain(`did not post results for head commit \`${HEAD}\``);
      expect(body).toContain('Bootstrap Protection');
      expect(body).not.toContain(HOSTILE_MESSAGE);
    }
  });

  it('leaves a comment that already carries the same refusal alone', async () => {
    const options = { blobs: { [HEAD]: workflowFile(PR_BLOB) } };
    const first = makeOctokit({ ...options, comments: [{ id: 42, user: BOT, body: `${security}\nold` }] });
    await runReporter(writeResults({ security: securityReport() }), first);
    const [{ body }] = first.updated;

    const again = makeOctokit({ ...options, comments: [{ id: 42, user: BOT, body }] });
    await runReporter(writeResults({ security: securityReport() }), again);
    expect(again.writes()).toBe(0);
  });

  it('rejects an unknown reason, an unbound PR and a malformed SHA without writing', async () => {
    const octokit = makeOctokit({ comments: [{ id: 42, user: BOT, body: `${security}\nold` }] });
    const refuse = (overrides: Record<string, unknown>) => refuseComments({
      github: octokit.github, context, issueNumber: 1770, headSha: HEAD, reason: 'workflow', ...overrides,
    });

    await expect(refuse({ reason: 'toString' })).rejects.toThrow('Unknown repo-health refusal: "toString"');
    await expect(refuse({ issueNumber: 0 })).rejects.toThrow('repo-health refusal needs a bound PR number');
    await expect(refuse({ headSha: 'HEAD' })).rejects.toThrow('repo-health refusal needs the refused head SHA');
    expect(octokit.writes()).toBe(0);
  });
});

describe('hand-written github-script bodies never embed workflow expressions', () => {
  // Structural guard: `${{ }}` inside a script body means untrusted-shaped data can
  // become part of the parsed script. Pass it through `env:` instead.
  for (const file of ['squad-repo-health.yml', REPORTER, 'squad-impact.yml']) {
    it(`${file} keeps all interpolation out of script bodies`, () => {
      const offenders = parseSteps(readWorkflow(file))
        .filter((step) => (stepScript(step) ?? '').includes('${{'))
        .map((step) => step.name);

      expect(offenders).toEqual([]);
    });
  }
});

describe('repo-health workflow trust boundary (#1800)', () => {
  const scanner = readWorkflow('squad-repo-health.yml');
  const reporter = readWorkflow(REPORTER);
  const shadow = readWorkflow('squad-repo-health-shadow.yml');

  it('runs the scanners unprivileged, from the base commit, with the PR head as data only', () => {
    expect(scanner).toMatch(/^on:\n {2}pull_request:\n/m);
    expect(scanner).not.toMatch(/^\s+pull_request_target:/m);
    expect(scanner).toMatch(/^permissions:\n {2}contents: read\n\n/m);
    expect(scanner).not.toMatch(/^\s+(?:pull-requests|issues|statuses|checks|actions): write/m);
    expect(scanner).not.toContain('actions/github-script');
    expect(scanner).not.toMatch(/ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.(?:ref|sha)/);
    expect(scanner).not.toMatch(/git (?:checkout|switch|reset)[^\n]*pull_request\.head/);
    expect(scanner).toContain('Fetch PR head (data only — not executed)');
    const checkoutRefs = scanner.match(/^\s+ref: .*$/gm) ?? [];
    expect(checkoutRefs.length).toBe(5);
    expect(new Set(checkoutRefs.map((line) => line.trim())))
      .toEqual(new Set(['ref: ${{ github.event.pull_request.base.sha }}']));
  });

  it('posts from the default branch only, with the narrowest write scope', () => {
    expect(reporter).toMatch(/^on:\n {2}workflow_run:\n {4}workflows: \["Repo Health"\]\n {4}types: \[completed\]\n/m);
    expect(reporter).toMatch(/^permissions:\n {2}actions: read\n {2}contents: read\n {2}pull-requests: write\n\n/m);
    expect(reporter).toContain('persist-credentials: false');
    expect(reporter).not.toMatch(/\bgit (?:fetch|checkout|switch)\b/);
    expect(reporter).not.toMatch(/^\s+ref:/m);
    expect(reporter).toContain('import(`${process.env.GITHUB_WORKSPACE}/scripts/repo-health-report.mjs`)');
  });

  it('labels posted findings with the evidence level the runbook canary checks', () => {
    expect(EVIDENCE_LABEL).toMatch(/^> \*\*Authoritative evidence:\*\* /);
    expect(EVIDENCE_LABEL, 'the label must name the reporter that actually posts').toContain('`workflow_run` reporter');
    expect(EVIDENCE_LABEL).not.toContain('pull_request_target');
  });

  it('runs PR-head proposals only in an explicitly non-authoritative read-only workflow', () => {
    expect(shadow).toMatch(/^name: Repo Health Shadow \(Non-Authoritative\)$/m);
    expect(shadow).toMatch(/^on:\n {2}pull_request:/m);
    expect(shadow).toMatch(/permissions:\n {2}contents: read\n/);
    expect(shadow).not.toMatch(/^\s+pull-requests: write|^\s+issues: write|^\s+pull_request_target:/m);
    expect(shadow).toContain('persist-credentials: false');
    expect(shadow).toContain('fake Octokit');
    expect(shadow).toContain('NON-AUTHORITATIVE');
  });

  it('names the default-branch workflow_run reporter as the authoritative writer', () => {
    const reporterName = /^name: (.+)$/m.exec(reporter)?.[1];
    expect(reporterName, 'the runbook canary waits for this name').toBe('Repo Health Report');
    expect(shadow).toContain(`\n# ${reporterName} (workflow_run, default branch) remains the authoritative writer.\n`);
    expect(shadow, 'the github org blocks pull_request_target').not.toContain('pull_request_target');
    const summary = shadow.split('\n').find((line) => line.includes('post-merge canary'));
    expect(summary, 'the shadow summary must name the authoritative path').toContain(reporterName);
  });

  it('discloses that the checks are base-controlled only while a PR leaves the workflow unchanged', () => {
    const prose = (text: string) => text.replace(/\r?\n[#\s]*/g, ' ');
    const runbook = prose(readFileSync(join(repoRoot, '.github', 'REPO_HEALTH_RUNBOOK.md'), 'utf-8'));
    const header = prose(scanner);
    expect(header).toContain('base-controlled only when the PR leaves this file unchanged');
    expect(header).toContain('including the result of the Bootstrap Protection check');
    expect(header).toContain('.github/CODEOWNERS line 4');
    expect(runbook).toContain('**Base-controlled only when the PR leaves `squad-repo-health.yml` unchanged.**');
    expect(runbook).toContain('`.github/CODEOWNERS` line 4');
    expect(runbook).toContain('require neither code-owner review nor any approval');
    const codeowners = readFileSync(join(repoRoot, '.github', 'CODEOWNERS'), 'utf-8').split(/\r?\n/);
    expect(codeowners[3], 'the docs cite the catch-all rule on CODEOWNERS line 4').toMatch(/^\* @/);
  });

  it('re-runs whenever a workflow or script it exercises changes', () => {
    const { on, jobs } = parseYaml(shadow);
    const paths: string[] = on.pull_request.paths;
    expect(paths).toEqual(expect.arrayContaining([
      '.github/workflows/squad-repo-health.yml',
      `.github/workflows/${REPORTER}`,
      '.github/workflows/squad-repo-health-shadow.yml',
      'scripts/repo-health-report.mjs',
      'scripts/workflow-run-pr-binding.mjs',
    ]));

    // Files the shadow runs, plus the reporter's scripts, followed through relative imports.
    const runs = jobs.shadow.steps.map((step: { run?: string }) => step.run ?? '').join('\n');
    const named = /\b(?:scripts|test)\/[\w./-]+\.(?:mjs|ts)\b/g;
    const pending = [...(runs.match(named) ?? []), ...(reporter.match(named) ?? [])];
    const exercised = new Set<string>();
    for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
      if (exercised.has(file)) continue;
      exercised.add(file);
      const source = readFileSync(join(repoRoot, file), 'utf-8');
      for (const [, specifier] of source.matchAll(/\b(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+\.mjs)['"]/g)) {
        pending.push(posix.join(posix.dirname(file), specifier));
      }
    }
    expect([...exercised]).toEqual(expect.arrayContaining([
      'scripts/check-squad-leakage.mjs',
      'scripts/repo-health-report.mjs',
      'test/scripts/repo-health-comment-transport.test.ts',
    ]));
    expect([...exercised].filter((file) => !paths.includes(file))).toEqual([]);
  });
});
