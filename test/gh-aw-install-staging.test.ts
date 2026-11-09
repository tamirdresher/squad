import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import {
  CONTRACT_DESTINATION,
  LEGACY_OWNERSHIP_DESTINATIONS,
  LEGACY_PACKAGE_NAMES,
  OWNERSHIP_DESTINATION,
  PACKAGE_NAME,
  UNOWNED_MUTABLE_ROUTER_SKILL,
  WORKFLOW_NAMES,
  materializeRuntime,
  compileWithPinnedActions,
  packageOwnershipDestination,
  verifyInstall,
  verifyStagedInstall,
} from '../workflows/shared/squad-install-verifier.mjs';
import { createFirstInstallFixture } from './helpers/gh-aw-install-fixture.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawnSync: vi.fn(actual.spawnSync) };
});

const revision = 'a'.repeat(40);
const [LEGACY_PACKAGE_NAME] = LEGACY_PACKAGE_NAMES;
const [LEGACY_OWNERSHIP] = LEGACY_OWNERSHIP_DESTINATIONS;
const roots: string[] = [];
const verifier = resolve('workflows/shared/squad-install-verifier.mjs');

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function write(root: string, path: string, content: string | Buffer): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function consumer(packageName: string = PACKAGE_NAME): string {
  const root = mkdtempSync(join(tmpdir(), 'squad-install-staging-'));
  roots.push(root);
  git(root, 'init', '--quiet');
  git(root, 'config', 'core.autocrlf', 'false');
  const fixture = createFirstInstallFixture(revision, 'package', packageName);
  for (const [path, content] of fixture.consumerFiles) write(root, path, content);
  write(root, packageOwnershipDestination(packageName), `${JSON.stringify(fixture.provenance, null, 2)}\n`);
  write(root, '.gitattributes', '* -text\n');
  write(root, '.gitignore', 'packages/\nlogs/\n*.local\n');
  write(root, '.github/aw/packages/unrelated.json', '{"private":true}\n');
  write(root, 'packages/unrelated.txt', 'ignored consumer file\n');
  write(root, '.github/aw/logs/private.log', 'ignored diagnostic\n');
  write(root, '.github/skills/secret.local', 'ignored local file\n');
  materializeRuntime(root);
  git(root, 'add', '--', '.gitattributes', '.github/aw/', '.github/workflows/', '.github/skills/');
  return root;
}

function stagedPaths(root: string): string[] {
  return git(root, 'ls-files', '-z').split('\0').filter(Boolean).sort();
}

function seedUnownedMutableRouter(root: string): void {
  write(root, UNOWNED_MUTABLE_ROUTER_SKILL, [
    '---',
    'name: agentic-workflows',
    '---',
    '',
    'Load mutable prompts from the current github/gh-aw repository.',
    '',
  ].join('\n'));
}

/** The indented commands the verifier prints after a heading, as one shell script. */
function printedCommands(stderr: string, heading: string): string {
  const lines = stderr.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex(line => line.startsWith(heading));
  expect(start, `verifier output must print "${heading}":\n${stderr}`).toBeGreaterThan(-1);
  const end = lines.findIndex((line, index) => index > start && !line.startsWith('  '));
  return lines.slice(start + 1, end < 0 ? undefined : end).map(line => line.slice(2)).join('\n');
}

function runPrintedCommands(root: string, commands: string, addStatus: number, materialize = false) {
  // No `set -e`: pasted commands keep running after a failure unless they stop themselves.
  // With `materialize`, the printed --materialize-runtime command runs the consumer's real verifier.
  const script = `
exec 3>&2
gh() {
  printf 'CALL gh %s\\n' "$*" >&3
  if [ "$1 $2" = "aw add" ]; then return "$ADD_STATUS"; fi
  return 0
}
node() {
  printf 'CALL node %s\\n' "$*" >&3
  if [ "$MATERIALIZE" = "1" ] && [ "$*" = ".github/workflows/shared/squad-install-verifier.mjs --materialize-runtime" ]; then
    command node "$@"
  fi
}
${commands}
`;
  const result = spawnSync('bash', ['-c', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ADD_STATUS: String(addStatus), MATERIALIZE: materialize ? '1' : '0' },
  });
  return result.stderr.split('\n').filter(line => line.startsWith('CALL '));
}

afterEach(() => {
  vi.clearAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('gh-aw: verified ownership staging under consumer ignore rules', () => {
  it('installs a coherent reset-capable package and excludes only the named historical Cast', async () => {
    const root = consumer();
    const reset = {
      schema: 'squad-bootstrap-reset/v1', id: 'retry-1',
      archived_pull_requests: [3], archived_issues: [],
    };
    write(root, '.squad/bootstrap-reset.json', JSON.stringify(reset));
    git(root, 'add', '--', '.squad/bootstrap-reset.json');
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'reviewed reset preparation');
    expect(verifyInstall(root, { expectedRevision: revision }).failures).toEqual([]);
    const installed = await import(pathToFileURL(join(root,
      '.github/workflows/shared/squad-bootstrap-validator.mjs')).href);
    const lock = parse(readFileSync(join(root, '.github/workflows/squad-bootstrap.lock.yml'), 'utf8'));
    expect(lock.on.workflow_dispatch.inputs.fresh_start.type).toBe('string');
    const writer = lock.jobs.materialize_bootstrap.steps.find(
      (step: { name?: string }) => step.name === 'Validate and materialize both artifacts',
    );
    expect(writer.env.SQUAD_BOOTSTRAP_FRESH_START).toBe('${{ inputs.fresh_start }}');
    expect(writer.with.script).toContain('stateModule.authorizeBootstrapReset');
    expect(writer.with.script).toContain('...resetState');
    expect(installed.readBootstrapReset(root)).toEqual(reset);
    expect(installed.hasCommittedBootstrapTeam(root)).toBe(false);
    const state = {
      reset, repository: 'octo/example', defaultBranch: 'main', issues: [],
      pullRequests: [{
        number: 3, title: '[squad] Cast your Squad', state: 'closed', merged_at: null,
        head: { ref: 'squad/bootstrap-cast', repo: { full_name: 'octo/example' } },
        base: { ref: 'main', repo: { full_name: 'octo/example' } },
      }],
    };
    expect(installed.classifyBootstrapState(state).action).toBe('reset_armed');
    expect(installed.classifyBootstrapState({ ...state, resetAuthorized: true }).action).toBe('create_both');
    expect(installed.classifyBootstrapState({ ...state, reset: null }).action).toBe('opt_out');
  });

  it('bounds staged reads to required paths in a large unrelated consumer tree', () => {
    const root = consumer();
    const unrelated = 'consumer-data';
    for (let index = 0; index < 20_000; index += 1) {
      write(root, `${unrelated}/ordinary-file-${index.toString().padStart(5, '0')}.txt`, 'consumer content\n');
    }
    git(root, 'add', '--', unrelated);
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'large consumer baseline');
    write(root, `${unrelated}/ordinary-file-00000.txt`, 'unstaged consumer edit\n');
    write(root, `${unrelated}/untracked.txt`, 'untracked consumer content\n');
    const before = stagedPaths(root);
    const tree = git(root, 'write-tree').trim();
    const unbounded = spawnSync('git', ['ls-tree', '-r', '-z', tree], { cwd: root });
    expect(unbounded.error).toMatchObject({ code: 'ENOBUFS' });
    const manifest = JSON.parse(readFileSync(join(root, CONTRACT_DESTINATION), 'utf8'));
    const required = [
      CONTRACT_DESTINATION,
      OWNERSHIP_DESTINATION,
      ...manifest.workflows.flatMap((entry: { destination: string; lock: string }) =>
        [entry.destination, entry.lock]),
      ...manifest.shared_runtime.flatMap((entry: { package_destination: string; destination: string }) =>
        [entry.package_destination, entry.destination]),
      ...manifest.skills.map((entry: { destination: string }) => entry.destination),
    ];
    const spawn = vi.mocked(spawnSync);
    spawn.mockClear();
    expect(verifyStagedInstall(root, { expectedRevision: revision, stageOwnership: true }).failures).toEqual([]);
    const queries = spawn.mock.calls.filter(([command, args]) => command === 'git' && args?.[0] === 'ls-tree');
    expect(queries).toHaveLength(1);
    expect(queries[0][1], `ls-tree must stay bounded to exact paths, including superseded ${LEGACY_OWNERSHIP}, `
      + 'plus one level of .github/aw/packages/ for case-variant ownership records')
      .toEqual([
        'ls-tree', '-z', expect.any(String), '--', ...new Set(required),
        '.github/workflows/aw.json', UNOWNED_MUTABLE_ROUTER_SKILL, ...LEGACY_OWNERSHIP_DESTINATIONS,
        '.github/aw/packages/',
      ]);
    const unrelatedObject = git(root, 'rev-parse', `HEAD:${unrelated}/ordinary-file-00000.txt`).trim();
    const blobReads = spawn.mock.calls.filter(([command, args]) => command === 'git' && args?.[0] === 'cat-file');
    expect(blobReads).toHaveLength(new Set(required).size);
    expect(blobReads.some(([, args]) => args?.includes(unrelatedObject))).toBe(false);
    expect(stagedPaths(root)).toEqual([...before, OWNERSHIP_DESTINATION].sort());
    expect(git(root, 'diff', '--cached', '--name-only').trim()).toBe(OWNERSHIP_DESTINATION);
    expect(git(root, 'diff', '--name-only').trim()).toBe(`${unrelated}/ordinary-file-00000.txt`);
    expect(readFileSync(join(root, unrelated, 'untracked.txt'), 'utf8')).toBe('untracked consumer content\n');
  }, 30_000);

  it('reproduces the silent omission, then force-stages only the exact required JSON', () => {
    const root = consumer();
    expect(verifyInstall(root, { expectedRevision: revision }).failures).toEqual([]);
    const before = stagedPaths(root);
    expect(before).not.toContain(OWNERSHIP_DESTINATION);
    expect(verifyStagedInstall(root).failures.join('\n')).toContain(
      `Required file is missing from staged tree: ${OWNERSHIP_DESTINATION}`,
    );

    expect(verifyStagedInstall(root, { expectedRevision: revision, stageOwnership: true }).failures).toEqual([]);
    expect(stagedPaths(root)).toEqual([...before, OWNERSHIP_DESTINATION].sort());
    expect(git(root, 'show', `:${OWNERSHIP_DESTINATION}`))
      .toBe(readFileSync(join(root, OWNERSHIP_DESTINATION), 'utf8'));
    for (const path of [
      '.github/aw/packages/unrelated.json', 'packages/unrelated.txt',
      '.github/aw/logs/private.log', '.github/skills/secret.local',
    ]) expect(stagedPaths(root)).not.toContain(path);
    expect(verifyStagedInstall(root, { stageOwnership: true }).failures).toEqual([]);

    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'fixture install');
    expect(git(root, 'diff', '--cached', '--name-only')).toBe('');
    expect(verifyStagedInstall(root).failures).toEqual([]);
  });

  it('runs the shipped CLI gate successfully and returns nonzero when metadata is missing', () => {
    const root = consumer();
    const args = [verifier, '--verify-staged-install', '--stage-ownership', '--source-revision', revision];
    expect(spawnSync(process.execPath, args, { cwd: root }).status).toBe(0);
    rmSync(join(root, OWNERSHIP_DESTINATION));
    const failed = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('do not commit/push');
    expect(failed.stderr).toMatch(/ownership record|ownership metadata/);
  });

  it('requires the exact consumer expiry configuration in the staged tree', () => {
    const root = consumer();
    const path = '.github/workflows/aw.json';
    const config = JSON.stringify({ maintenance: { action_failure_issue_expires: 24 } });
    write(root, path, config);
    compileWithPinnedActions(root);
    git(root, 'add', '--', '.github/workflows/');
    expect(verifyStagedInstall(root, { stageOwnership: true }).failures).toEqual([]);
    write(root, path, `${config}\n`);
    expect(verifyInstall(root).failures).toEqual([]);
    expect(verifyStagedInstall(root).failures.join('\n')).toContain(`Staged digest mismatch for ${path}`);
    git(root, 'add', '--', path);
    expect(verifyStagedInstall(root).failures).toEqual([]);

    rmSync(join(root, path));
    compileWithPinnedActions(root);
    git(root, 'add', '--', ...WORKFLOW_NAMES.map(name => `.github/workflows/${name}.lock.yml`));
    expect(verifyInstall(root).failures).toEqual([]);
    expect(verifyStagedInstall(root).failures.join('\n')).toContain(
      `Unverified compiler configuration remains in staged tree: ${path}`,
    );
    git(root, 'add', '--', path);
    expect(verifyStagedInstall(root).failures).toEqual([]);
  }, 120_000);

  it('rejects the clean-install gh-aw router until it is removed, then accepts the exact Squad skill', () => {
    const root = consumer();
    seedUnownedMutableRouter(root);
    const args = [verifier, '--verify-install', '--source-revision', revision];
    const rejected = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    expect(rejected.status).toBe(1);
    expect(rejected.stderr).toContain(
      `Unowned mutable gh-aw router skill must be removed: ${UNOWNED_MUTABLE_ROUTER_SKILL}`,
    );
    expect(rejected.stderr, `recovery must also delete ${LEGACY_OWNERSHIP}`).toContain([
      `  gh aw add github/squad/workflows@${revision} --force &&`,
      '  rm -f .github/aw/packages/bradygaster-squad-workflows-3632054824e8.json &&',
      `  rm -f ${UNOWNED_MUTABLE_ROUTER_SKILL} &&`,
      '  node .github/workflows/shared/squad-install-verifier.mjs --materialize-runtime &&',
      '  gh aw compile --strict &&',
      '  node .github/workflows/shared/squad-install-verifier.mjs --verify-install --strict-compile',
    ].join('\n'));

    rmSync(join(root, UNOWNED_MUTABLE_ROUTER_SKILL));
    const accepted = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    expect(accepted.status, accepted.stderr).toBe(0);
    expect(readFileSync(join(root, '.github/skills/gh-aw-enlistment/SKILL.md')))
      .toEqual(readFileSync(resolve('workflows/skills/gh-aw-enlistment/SKILL.md')));
  });

  it('accepts an explicitly staged router deletion and rejects an unstaged retained index entry', () => {
    const root = consumer();
    seedUnownedMutableRouter(root);
    git(root, 'add', '--', UNOWNED_MUTABLE_ROUTER_SKILL);
    git(root, 'add', '--force', '--', OWNERSHIP_DESTINATION);
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'pre-existing gh-aw scaffold');

    rmSync(join(root, UNOWNED_MUTABLE_ROUTER_SKILL));
    expect(verifyInstall(root).failures).toEqual([]);
    expect(verifyStagedInstall(root).failures.join('\n')).toContain(
      `Unowned mutable gh-aw router skill remains in staged tree: ${UNOWNED_MUTABLE_ROUTER_SKILL}`,
    );

    git(root, 'add', '--', UNOWNED_MUTABLE_ROUTER_SKILL);
    expect(verifyStagedInstall(root).failures).toEqual([]);
    expect(git(root, 'diff', '--cached', '--diff-filter=D', '--name-only').trim())
      .toBe(UNOWNED_MUTABLE_ROUTER_SKILL);
    expect(stagedPaths(root)).not.toContain(UNOWNED_MUTABLE_ROUTER_SKILL);
    expect(stagedPaths(root)).toContain('.github/skills/gh-aw-enlistment/SKILL.md');
  });

  it('rejects a mutated Squad-owned enlistment skill after removing the tool-owned router', () => {
    const root = consumer();
    write(root, '.github/skills/gh-aw-enlistment/SKILL.md', 'mutated\n');
    expect(verifyInstall(root).failures.join('\n')).toContain(
      'Installed digest mismatch for .github/skills/gh-aw-enlistment/SKILL.md',
    );
  });

  it('force-stages a legacy-identity install at its own native ownership path', () => {
    const root = consumer(LEGACY_PACKAGE_NAME);
    expect(stagedPaths(root)).not.toContain(LEGACY_OWNERSHIP);
    const result = verifyStagedInstall(root, { expectedRevision: revision, stageOwnership: true });
    expect(result.failures, `legacy record ${LEGACY_OWNERSHIP} must stage and verify`).toEqual([]);
    expect(result.packageName).toBe(LEGACY_PACKAGE_NAME);
    expect(stagedPaths(root)).toContain(LEGACY_OWNERSHIP);
    expect(stagedPaths(root)).not.toContain(OWNERSHIP_DESTINATION);
  }, 120_000);

  it('rejects a superseded legacy ownership record left in the staged tree after migrating', () => {
    const root = consumer();
    // The legacy install committed its record; reinstalling as github/squad/workflows leaves it.
    write(root, LEGACY_OWNERSHIP, readFileSync(join(root, OWNERSHIP_DESTINATION), 'utf8')
      .replaceAll(PACKAGE_NAME, LEGACY_PACKAGE_NAME));
    git(root, 'add', '--force', '--', LEGACY_OWNERSHIP, OWNERSHIP_DESTINATION);
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'legacy and migrated records');
    expect(
      verifyInstall(root).failures.join('\n'),
      `${OWNERSHIP_DESTINATION} and ${LEGACY_OWNERSHIP} both present`,
    ).toContain('Expected exactly one Squad package ownership record; found 2');

    rmSync(join(root, LEGACY_OWNERSHIP));
    expect(verifyInstall(root).failures).toEqual([]);
    expect(
      verifyStagedInstall(root, { stageOwnership: true }).failures.join('\n'),
      `index still holds deleted ${LEGACY_OWNERSHIP}`,
    ).toContain(
      `Superseded Squad package ownership record remains in staged tree: ${LEGACY_OWNERSHIP}`,
    );

    git(root, 'add', '--', '.github/aw/');
    expect(verifyStagedInstall(root, { stageOwnership: true }).failures).toEqual([]);
    expect(git(root, 'diff', '--cached', '--diff-filter=D', '--name-only').trim()).toBe(LEGACY_OWNERSHIP);
  }, 120_000);

  it.each([
    ['case-variant', 'GitHub/Squad/workflows', '.github/aw/packages/github-squad-workflows-9361b4232957.json',
      'Case-variant'],
    ['legacy-identity duplicate', LEGACY_PACKAGE_NAME, '.github/aw/packages/squad-workflows-copy.json', 'Stale'],
  ] as const)('rejects a %s ownership record deleted only from the working tree until its deletion is staged', (
    label, packageName, path, kind,
  ) => {
    const root = consumer();
    if (kind === 'Case-variant') {
      // `gh aw add GitHub/Squad/workflows@SHA` names its record by the identity exactly as typed.
      expect(path).toBe(`.github/aw/packages/github-squad-workflows-${
        createHash('sha256').update(packageName).digest('hex').slice(0, 12)}.json`);
    }
    write(root, path, readFileSync(join(root, OWNERSHIP_DESTINATION), 'utf8')
      .replaceAll(`"package": "${PACKAGE_NAME}"`, `"package": "${packageName}"`));
    git(root, 'add', '--force', '--', path, OWNERSHIP_DESTINATION);
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', `canonical and ${label} records`);
    expect(verifyInstall(root).failures.join('\n'), `${OWNERSHIP_DESTINATION} beside committed ${path} (${packageName})`)
      .toContain(`After reinstalling as ${PACKAGE_NAME}, delete ${path}.`);

    rmSync(join(root, path));
    expect(verifyInstall(root).failures, `working tree without ${path}`).toEqual([]);
    const args = [verifier, '--verify-staged-install', '--stage-ownership', '--source-revision', revision];
    const state = `${path} (${packageName}) deleted only from the working tree, still in the index`;
    const rejected = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    expect(rejected.status, `--verify-staged-install with ${state}:\n${rejected.stderr}`).toBe(1);
    expect(rejected.stderr, `--verify-staged-install with ${state}`).toContain(
      `${kind} Squad package ownership record remains in staged tree: ${path} (${packageName}); `
      + 'delete it and stage the deletion before commit/push.',
    );

    git(root, 'add', '--', '.github/aw/');
    expect(git(root, 'diff', '--cached', '--diff-filter=D', '--name-only').trim()).toBe(path);
    const accepted = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    expect(accepted.status, `--verify-staged-install after staging the deletion of ${path}:\n${accepted.stderr}`)
      .toBe(0);

    // The committed result is what a clean checkout verifies.
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', `delete the ${label} record`);
    const clone = mkdtempSync(join(tmpdir(), 'squad-install-staging-clone-'));
    roots.push(clone);
    execFileSync('git', ['-c', 'core.autocrlf=false', 'clone', '--quiet', root, clone]);
    expect(existsSync(join(clone, path)), `clean checkout must not contain ${path}`).toBe(false);
    expect(verifyInstall(clone, { expectedRevision: revision }).failures, `clean checkout of ${root}`).toEqual([]);
  }, 120_000);

  it('moves a legacy-owned install with a staged canonical record forward instead of deleting it', () => {
    const root = consumer(LEGACY_PACKAGE_NAME);
    // The canonical record was committed earlier, then removed from the working tree.
    write(root, OWNERSHIP_DESTINATION, readFileSync(join(root, LEGACY_OWNERSHIP), 'utf8')
      .replaceAll(LEGACY_PACKAGE_NAME, PACKAGE_NAME));
    git(root, 'add', '--force', '--', LEGACY_OWNERSHIP, OWNERSHIP_DESTINATION);
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'canonical and legacy records');
    rmSync(join(root, OWNERSHIP_DESTINATION));
    expect(verifyInstall(root).failures).toEqual([]);
    const failure = verifyStagedInstall(root, { stageOwnership: true }).failures.join('\n');
    const state = `${OWNERSHIP_DESTINATION} still staged in a ${LEGACY_PACKAGE_NAME} install`;
    expect(failure, state).toContain(
      `Squad package ownership record ${OWNERSHIP_DESTINATION} (${PACKAGE_NAME}) remains in the staged tree `
      + `of this ${LEGACY_PACKAGE_NAME} installation; do not delete it.`,
    );
    expect(failure, state).toContain(
      `Reinstall with gh aw add ${PACKAGE_NAME}@${revision} --force; only after it succeeds, `
      + `delete ${LEGACY_OWNERSHIP} and stage both changes`,
    );
    expect(failure, state).not.toContain('delete it and stage the deletion');
  }, 120_000);

  it('prints a non-fatal legacy-identity notice only after a legacy install verifies', () => {
    const args = [verifier, '--verify-install', '--source-revision', revision];
    const legacy = spawnSync(process.execPath, args, { cwd: consumer(LEGACY_PACKAGE_NAME), encoding: 'utf8' });
    expect(legacy.status, legacy.stderr).toBe(0);
    expect(legacy.stdout).toContain(`Squad gh-aw installation verified at ${revision}.`);
    expect(legacy.stderr, `a ${LEGACY_PACKAGE_NAME} install must print the move notice`).toContain([
      `Notice: verified under the legacy ${LEGACY_PACKAGE_NAME} package identity, accepted only so that existing `
        + 'installations can move; bradygaster/squad is now a separately controlled fork.',
      `To move to ${PACKAGE_NAME}, follow the gh-aw guide's Upgrading steps, starting with:`,
      `  gh aw add ${PACKAGE_NAME}@${revision} --force &&`,
      `  rm -f ${LEGACY_OWNERSHIP}`,
    ].join('\n'));
    const canonical = spawnSync(process.execPath, args, { cwd: consumer(), encoding: 'utf8' });
    expect(canonical.status, canonical.stderr).toBe(0);
    expect(canonical.stderr, `a ${PACKAGE_NAME} install must not print the legacy notice`).not.toContain('Notice:');
  }, 120_000);

  it('ignores unrelated native package ownership that does not claim the Squad manifest', () => {
    const root = consumer();
    write(root, '.github/aw/packages/unrelated.json', JSON.stringify({
      package: 'example/unrelated/workflows',
      files: [{ destination: '.github/aw/unrelated.manifest.json' }],
    }));
    expect(verifyInstall(root, { expectedRevision: revision }).failures).toEqual([]);
  }, 120_000);

  it.each([false, true])('rejects native fork ownership without suggesting canonical relabeling (canonical record: %s)',
    (retainCanonical) => {
      const packageName = 'example/squad/workflows';
      const root = retainCanonical ? consumer() : mkdtempSync(join(tmpdir(), 'squad-install-staging-'));
      if (!retainCanonical) roots.push(root);
      const fixture = createFirstInstallFixture(revision, 'package', packageName);
      if (!retainCanonical) {
        git(root, 'init', '--quiet');
        for (const [path, content] of fixture.consumerFiles) write(root, path, content);
        materializeRuntime(root);
      }
      const slug = packageName.replaceAll('/', '-');
      const hash = createHash('sha256').update(packageName).digest('hex').slice(0, 12);
      const ownership = `.github/aw/packages/${slug}-${hash}.json`;
      const ownershipBytes = `${JSON.stringify(fixture.provenance, null, 2)}\n`;
      write(root, ownership, ownershipBytes);
      if (!retainCanonical) {
        for (const entry of fixture.provenance.files) {
          expect(createHash('sha256').update(readFileSync(join(root, entry.destination))).digest('hex'),
            `native fork-owned bytes must be coherent: ${entry.destination}`).toBe(entry.sha256);
        }
      }
      for (const mode of ['--verify-install', '--verify-staged-install']) {
        const failed = spawnSync(process.execPath, [verifier, mode, '--source-revision', revision], {
          cwd: root, encoding: 'utf8',
        });
        expect(failed.status, failed.stderr).toBe(1);
        expect(failed.stderr).toContain(`Unsupported Squad package origin: "${packageName}".`);
        expect(failed.stderr).toContain(`This source revision declares ${PACKAGE_NAME}.`);
        expect(failed.stderr).toContain('Native installation and fork-network commit accessibility');
        expect(failed.stderr).toContain('do not relabel ownership or reinstall this fork revision');
        expect(failed.stderr).not.toContain('Safe recovery');
        expect(failed.stderr).not.toContain(`gh aw add ${PACKAGE_NAME}@${revision}`);
      }
      expect(readFileSync(join(root, ownership), 'utf8'), 'verification must not rewrite native ownership')
        .toBe(ownershipBytes);
    }, 120_000);

  it.each([
    [1, [LEGACY_OWNERSHIP, UNOWNED_MUTABLE_ROUTER_SKILL], []],
    [0, [], ['CALL node .github/workflows/shared/squad-install-verifier.mjs --materialize-runtime',
      'CALL gh aw compile --strict',
      'CALL node .github/workflows/shared/squad-install-verifier.mjs --verify-install --strict-compile']],
  ] as const)('runs the printed recovery cleanup only after the reinstall succeeds (gh aw add exits %i)',
    (addStatus, remaining, afterReinstall) => {
      const root = mkdtempSync(join(tmpdir(), 'squad-install-staging-'));
      roots.push(root);
      write(root, LEGACY_OWNERSHIP, `${JSON.stringify({ package: LEGACY_PACKAGE_NAME })}\n`);
      seedUnownedMutableRouter(root);
      const failed = spawnSync(process.execPath, [verifier, '--verify-install', '--source-revision', revision], {
        cwd: root, encoding: 'utf8',
      });
      expect(failed.status, failed.stderr).toBe(1);
      const commands = printedCommands(failed.stderr, 'Safe recovery');
      const calls = runPrintedCommands(root, commands, addStatus);
      const input = `printed recovery commands with gh aw add exiting ${addStatus}:\n${commands}`;
      expect([LEGACY_OWNERSHIP, UNOWNED_MUTABLE_ROUTER_SKILL].filter(path => existsSync(join(root, path))),
        `files left by the ${input}`).toEqual(remaining);
      expect(calls, input).toEqual([`CALL gh aw add ${PACKAGE_NAME}@${revision} --force`, ...afterReinstall]);
    });

  it.each([
    ['stale', (root: string, path: string) => write(root, path, 'stale materialized runtime\n')],
    ['missing', (root: string, path: string) => rmSync(join(root, path))],
  ] as const)('repairs a %s materialized runtime file with the printed recovery commands', (state, damage) => {
    // gh aw add rewrites only the package-owned copy under .github/aw/squad/runtime/.
    const path = '.github/workflows/shared/squad.md';
    const root = consumer();
    damage(root, path);
    const failed = spawnSync(process.execPath, [verifier, '--verify-install', '--source-revision', revision], {
      cwd: root, encoding: 'utf8',
    });
    expect(failed.status, `${state} ${path}: ${failed.stderr}`).toBe(1);
    const commands = printedCommands(failed.stderr, 'Safe recovery');
    runPrintedCommands(root, commands, 0, true);
    expect(verifyInstall(root, { expectedRevision: revision }).failures,
      `${state} ${path} after running the printed recovery commands:\n${commands}`).toEqual([]);
  }, 120_000);

  it.each([
    [1, [LEGACY_OWNERSHIP]],
    [0, []],
  ] as const)('removes the legacy record with the printed move commands only after the reinstall succeeds '
    + '(gh aw add exits %i)', (addStatus, remaining) => {
    const root = consumer(LEGACY_PACKAGE_NAME);
    const verified = spawnSync(process.execPath, [verifier, '--verify-install', '--source-revision', revision], {
      cwd: root, encoding: 'utf8',
    });
    expect(verified.status, verified.stderr).toBe(0);
    const commands = printedCommands(verified.stderr, `To move to ${PACKAGE_NAME}`);
    const calls = runPrintedCommands(root, commands, addStatus);
    const input = `printed legacy move commands with gh aw add exiting ${addStatus}:\n${commands}`;
    expect([LEGACY_OWNERSHIP].filter(path => existsSync(join(root, path))), `files left by the ${input}`)
      .toEqual(remaining);
    expect(calls, input).toEqual([`CALL gh aw add ${PACKAGE_NAME}@${revision} --force`]);
  }, 120_000);

  it('fails clearly when Git cannot force-stage the required ignored metadata', () => {
    const root = consumer();
    write(root, '.git/index.lock', 'locked\n');
    const result = verifyStagedInstall(root, { stageOwnership: true });
    expect(result.failures.join('\n')).toMatch(/git failed:[\s\S]*index\.lock/);
    expect(stagedPaths(root)).not.toContain(OWNERSHIP_DESTINATION);
  });

  it('fails closed when the verified index cannot be snapshotted', () => {
    const root = consumer();
    expect(verifyStagedInstall(root, { stageOwnership: true }).failures).toEqual([]);
    write(root, '.git/index.lock', 'locked\n');
    expect(verifyStagedInstall(root).failures.join('\n')).toMatch(/git failed:[\s\S]*index\.lock/);
  });

  it.each([
    CONTRACT_DESTINATION,
    '.github/workflows/squad.md',
    '.github/workflows/squad.lock.yml',
    '.github/workflows/shared/squad.md',
    '.github/aw/squad/runtime/shared/squad.md',
    '.github/skills/gh-aw-enlistment/SKILL.md',
  ])('rejects an omitted required artifact without force-adding it: %s', (path) => {
    const root = consumer();
    git(root, 'update-index', '--force-remove', '--', path);
    write(root, '.gitignore', `packages/\nlogs/\n*.local\n/${path}\n`);
    const result = verifyStagedInstall(root, { stageOwnership: true });
    expect(result.failures.join('\n')).toContain(`Required file is missing from staged tree: ${path}`);
    expect(stagedPaths(root)).not.toContain(path);
  });

  it.each([OWNERSHIP_DESTINATION, '.github/workflows/squad.lock.yml'])(
    'rejects stale staged bytes even when working-tree verification succeeds: %s', (path) => {
      const root = consumer();
      expect(verifyStagedInstall(root, { stageOwnership: true }).failures).toEqual([]);
      const original = readFileSync(join(root, path));
      write(root, path, 'stale staged contents\n');
      git(root, 'add', '--force', '--', path);
      write(root, path, original);
      expect(verifyInstall(root).failures).toEqual([]);
      expect(verifyStagedInstall(root, { stageOwnership: true }).failures.join('\n'))
        .toContain(`Staged digest mismatch for ${path}`);
    },
  );

  it('rejects a symlink staged in place of a required regular file', () => {
    const root = consumer();
    expect(verifyStagedInstall(root, { stageOwnership: true }).failures).toEqual([]);
    const path = '.github/workflows/squad.md';
    const object = git(root, 'rev-parse', `:${path}`).trim();
    git(root, 'update-index', '--cacheinfo', `120000,${object},${path}`);
    expect(verifyStagedInstall(root).failures.join('\n'))
      .toContain(`Required staged path is not a regular file: ${path}`);
  });

  it('rejects a required path replaced by an index directory without reading its descendants', () => {
    const root = consumer();
    expect(verifyStagedInstall(root, { stageOwnership: true }).failures).toEqual([]);
    const path = '.github/workflows/squad.md';
    const object = git(root, 'rev-parse', `:${path}`).trim();
    git(root, 'update-index', '--force-remove', '--', path);
    git(root, 'update-index', '--add', '--cacheinfo', `100644,${object},${path}/unexpected.txt`);
    expect(verifyInstall(root).failures).toEqual([]);
    expect(verifyStagedInstall(root).failures.join('\n'))
      .toContain(`Required staged path is not a regular file: ${path}`);
  });
});
