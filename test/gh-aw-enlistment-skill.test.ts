/**
 * gh-aw-enlistment skill — structural validity, discoverability, and safety-gate
 * regression guard.
 *
 * The skill operationalizes the supported Squad gh-aw bootstrap
 * (docs/src/content/docs/guide/gh-aw.md). Its value is entirely in the safety
 * gates it encodes, so this suite asserts:
 *   1. The canonical SKILL.md parses into a valid SkillDefinition.
 *   2. Its frontmatter advertises the documented trigger phrases (discoverability).
 *   3. Its body still encodes every critical safety gate (allowlist, strict
 *      compile, never-auto-merge, read-only token, explicit staging).
 *   4. The canonical source and all four mirrors are byte-for-byte identical
 *      (the sync invariant every canonical skill upholds).
 *   5. Every upgrade block stops before any cleanup when the forced reinstall fails.
 *   6. The strict-compile warning gate accepts the four squad-init replacement
 *      warnings that the real compiler emits while legacy locks are committed,
 *      and nothing broader.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSkillFile } from '@bradygaster/squad-sdk/skills';
import {
  LEGACY_OWNERSHIP_DESTINATIONS,
  LEGACY_PACKAGE_NAMES,
  OWNERSHIP_DESTINATION,
  PACKAGE_NAME,
  UNOWNED_MUTABLE_ROUTER_SKILL,
  WORKFLOW_TUPLES,
  compileWithPinnedActions,
} from '../workflows/shared/squad-install-verifier.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SKILL_ID = 'gh-aw-enlistment';

const CANONICAL = `.squad-templates/skills/${SKILL_ID}/SKILL.md`;
const GUIDE = 'docs/src/content/docs/guide/gh-aw.md';
const AGENT_GUIDE = '.github/agents.md';
const MIRRORS = [
  `workflows/skills/${SKILL_ID}/SKILL.md`,
  `templates/skills/${SKILL_ID}/SKILL.md`,
  `packages/squad-cli/templates/skills/${SKILL_ID}/SKILL.md`,
  `packages/squad-sdk/templates/skills/${SKILL_ID}/SKILL.md`,
] as const;

// Public install commands are bound to the verifier's canonical package identity.
const INSTALL_COMMAND = `gh aw add "${PACKAGE_NAME}@\${SQUAD_SHA}"`;
const [LEGACY_PACKAGE_NAME] = LEGACY_PACKAGE_NAMES;
const [LEGACY_OWNERSHIP] = LEGACY_OWNERSHIP_DESTINATIONS;
const SQUAD_INIT_ACTION = `${PACKAGE_NAME.replace(/\/workflows$/, '')}/.github/actions/squad-init`;
const LEGACY_SQUAD_INIT_ACTION = `${LEGACY_PACKAGE_NAME.replace(/\/workflows$/, '')}/.github/actions/squad-init`;
const DELETION_ALLOWLIST = [
  `    grep -vxF -e '${UNOWNED_MUTABLE_ROUTER_SKILL}' |`,
  '    while IFS= read -r path; do',
].join('\n');
const DELETION_FILTER_END = '    done || true\n';

function extractDeletionGate(content: string, source: string): string {
  const start = content.indexOf('unexpected_deletions="$(');
  const end = content.indexOf('\n}', content.indexOf('test -z "${unexpected_deletions}"', start));
  expect(start, `${source}: staged-deletion gate must exist`).toBeGreaterThan(-1);
  expect(end, `${source}: staged-deletion gate must end with its STOP block`).toBeGreaterThan(start);
  return content.slice(start, end + 2);
}

/** The gate's filter: the exact allowlist, then the loop that admits only stale Squad ownership records. */
function extractDeletionFilter(content: string, source: string): string {
  const gate = extractDeletionGate(content, source);
  const start = gate.indexOf(DELETION_ALLOWLIST);
  const end = gate.indexOf(DELETION_FILTER_END, start);
  expect(start, `${source}: the staged-deletion filter must start with the exact allowlist`).toBeGreaterThan(-1);
  expect(end, `${source}: the staged-deletion filter must end its ownership-record loop`).toBeGreaterThan(start);
  return gate.slice(start, end + DELETION_FILTER_END.length);
}

/** Runs the gate with stubbed staged deletions; `head` holds the HEAD blob of each deleted path. */
function runDeletionGate(gate: string, deletions: readonly string[], head: Readonly<Record<string, string>> = {}) {
  const script = `
set -euo pipefail
git() {
  case "$1" in
    show) node -e '
      const head = JSON.parse(process.env.HEAD_BLOBS);
      const path = process.argv[1].replace(/^HEAD:/, "");
      if (!Object.hasOwn(head, path)) {
        console.error("fatal: path " + path + " does not exist in HEAD");
        process.exit(128);
      }
      process.stdout.write(head[path]);' "$2" ;;
    *) printf '%s' "$STAGED_DELETIONS" ;;
  esac
}
${gate}
`;
  return spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      STAGED_DELETIONS: deletions.map(path => `${path}\n`).join(''),
      HEAD_BLOBS: JSON.stringify(head),
    },
  });
}

/** gh-aw v0.91.5 names an ownership record by the identity exactly as typed (see packageOwnershipDestination). */
function typedOwnershipRecord(packageName: string): string {
  const slug = packageName.toLowerCase().replace(/[/\\:@]/g, '-').replace(/^-+|-+$/g, '');
  return `.github/aw/packages/${slug}-${createHash('sha256').update(packageName).digest('hex').slice(0, 12)}.json`;
}

const CASE_VARIANT_PACKAGE = 'GitHub/Squad/workflows';
const CASE_VARIANT_OWNERSHIP = typedOwnershipRecord(CASE_VARIANT_PACKAGE);
const LEGACY_CASE_VARIANT_PACKAGE = 'Bradygaster/Squad/workflows';
const LEGACY_CASE_VARIANT_OWNERSHIP = typedOwnershipRecord(LEGACY_CASE_VARIANT_PACKAGE);
// An exact-identity record at a path gh-aw does not write, such as a manual copy.
const NON_NATIVE_OWNERSHIP = '.github/aw/packages/squad-workflows-copy.json';
const ownershipBlob = (packageName: string) => `${JSON.stringify({ schemaVersion: 1, package: packageName })}\n`;

const IDENTITY_GATE_START = '# squad-package-identity-start';
const IDENTITY_GATE_END = '# squad-package-identity-end';
const IDENTITY_SHA = 'c'.repeat(40);
const LEGACY_INSTALL_PREFIX = `gh aw add "${LEGACY_PACKAGE_NAME}@`;
const MANIFEST_RULE = `\`${PACKAGE_NAME}\` verifies only at Squad revisions whose `
  + `\`workflows/squad-workflows.manifest.json\` declares \`"package": "${PACKAGE_NAME}"\``;
const IDENTITY_CANONICAL_HINT = `Use a revision whose manifest declares ${PACKAGE_NAME}, or ask the Squad maintainers `
  + `for one. Older revisions download the Squad CLI from the ${LEGACY_PACKAGE_NAME.replace(/\/workflows$/, '')} `
  + 'fork, which has no releases.';
const IDENTITY_UNREADABLE_STOP = 'STOP: cannot read workflows/squad-workflows.manifest.json from github/squad '
  + `at ${IDENTITY_SHA}.`;
const IDENTITY_UNREADABLE_HINT = 'Check gh auth status --hostname github.com and network access, '
  + 'and confirm SQUAD_SHA is a github/squad commit that has this manifest, then retry.';

function extractIdentityGate(content: string): string {
  const start = content.indexOf(IDENTITY_GATE_START);
  const end = content.indexOf(IDENTITY_GATE_END);
  expect(start, `${IDENTITY_GATE_START} must exist`).toBeGreaterThan(-1);
  expect(content.indexOf(IDENTITY_GATE_START, start + 1), 'one marked identity gate per document').toBe(-1);
  expect(end, `${IDENTITY_GATE_END} must follow its start marker`).toBeGreaterThan(start);
  return content.slice(start + IDENTITY_GATE_START.length + 1, end);
}

function runIdentityGate(gate: string, response: { manifestPackage?: string; fail?: boolean }) {
  const script = `
set -euo pipefail
exec 3>&2
gh() {
  printf 'CALL %s\\n' "$*" >&3
  if [ "$GH_FAIL" = "1" ]; then
    printf '{"message":"No commit found for the ref"}\\n'
    return 1
  fi
  printf '%s\\n' "$GH_PACKAGE"
}
SQUAD_SHA="${IDENTITY_SHA}"
${gate}
echo "IDENTITY GATE PASSED"
`;
  return spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: { ...process.env, GH_PACKAGE: response.manifestPackage ?? '', GH_FAIL: response.fail ? '1' : '0' },
  });
}

function fencedBlocks(text: string): string[] {
  return [...text.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)].map(match => match[1]);
}

function readRaw(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}
/** LF-normalized read — markdown is not pinned to LF, so Windows checkouts get CRLF. */
function readLF(rel: string): string {
  return readRaw(rel).replace(/\r\n/g, '\n');
}

const VERSION_GATE_START = '# gh-aw-exact-version-start';
const VERSION_GATE_END = '# gh-aw-exact-version-end';

function extractVersionGate(content: string): string {
  const start = content.indexOf(VERSION_GATE_START);
  const end = content.indexOf(VERSION_GATE_END);
  expect(start, `${VERSION_GATE_START} must exist`).toBeGreaterThan(-1);
  expect(end, `${VERSION_GATE_END} must follow its start marker`).toBeGreaterThan(start);
  return content.slice(start + VERSION_GATE_START.length, end);
}

function runVersionGate(
  gate: string,
  initialVersion: string,
  installedVersion: string,
  versionStream: 'stdout' | 'stderr' = 'stdout',
) {
  const script = `
set -euo pipefail
installed=0
exec 3>&2
gh() {
  if [ "$1" = "aw" ] && [ "$2" = "--version" ]; then
    printf 'CALL version\\n' >&3
    version="$INITIAL_VERSION"
    if [ "$installed" -eq 1 ]; then version="$INSTALLED_VERSION"; fi
    if [ "$VERSION_STREAM" = "stderr" ]; then
      printf 'gh-aw %s\\n' "$version" >&2
    else
      printf 'gh-aw %s\\n' "$version"
    fi
    return 0
  fi
  if [ "$1" = "extension" ] && [ "$2" = "remove" ] && [ "$3" = "gh-aw" ]; then
    printf 'CALL remove\\n' >&3
    return 0
  fi
  if [ "$1" = "extension" ] && [ "$2" = "install" ]; then
    printf 'CALL install %s %s\\n' "$3" "$4" >&3
    installed=1
    return 0
  fi
  return 64
}
${gate}
`;
  return spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      INITIAL_VERSION: initialVersion,
      INSTALLED_VERSION: installedVersion,
      VERSION_STREAM: versionStream,
    },
  });
}

const COMPILE_WARNINGS = [
  '.github/workflows/squad-review.md: warning: pull_request_target is a very dangerous trigger.',
  ".github/workflows/squad.md: warning: Both slash_command and bots triggers are configured. If a bot listed in bots: posts a comment that starts with the slash command text (e.g., /command-name), it will trigger the workflow and occupy the concurrency slot, potentially blocking simultaneous manual invocations. To ensure the workflow only runs on explicit user commands, remove the 'bots:' field.",
];

function assertCompileWarningContract(content: string): void {
  const regions = [...content.matchAll(
    /^<!-- compile-warning-allowlist-start -->\n```text\n([\s\S]*?)\n```\n<!-- compile-warning-allowlist-end -->$/gm,
  )];
  expect(regions).toHaveLength(1);
  expect(regions[0][1].split('\n')).toEqual(COMPILE_WARNINGS);
  const flat = content.replace(/\s+/g, ' ');
  expect(flat).toContain('require exactly two warnings, one occurrence of each exact diagnostic header');
  expect(flat).toContain(
    '**STOP** on any error, or on **any additional warning** beyond these two exact documented diagnostics and, '
    + 'during that migration only, the four exact squad-init replacement warnings.',
  );
  expect(flat).toContain('Also STOP if an allowed warning is missing, duplicated, changed, or attributed to another path');
  expect(flat).toContain('Compiled 8 workflows: 8 succeeded, 2 warnings');
  expect(flat).toContain('or if any required control is absent.');
  expect(flat).toContain('Do not suppress warnings or use `--approve` to bypass this gate.');
}

const SAFE_UPDATE_WARNING = 'warning: safe update mode detected unapproved changes';
// Each package workflow that runs the squad-init action reports the owner change.
const SQUAD_INIT_WORKFLOWS: string[] = WORKFLOW_TUPLES
  .filter(([, source]: string[]) => readLF(source).includes(`uses: ${SQUAD_INIT_ACTION}@`))
  .map(([name]: string[]) => name);
const MIGRATION_WARNINGS = SQUAD_INIT_WORKFLOWS.map(name => `.github/workflows/${name}.md: ${SAFE_UPDATE_WARNING}`);
const MIGRATION_CHANGES = [
  'New unapproved action(s):',
  `  - ${SQUAD_INIT_ACTION}`,
  'Previously-approved action(s) removed:',
  `  - ${LEGACY_SQUAD_INIT_ACTION}`,
];

function textRegions(content: string, name: string): string[][] {
  const pattern = new RegExp(`^<!-- ${name}-start -->\\n\`\`\`text\\n([\\s\\S]*?)\\n\`\`\`\\n<!-- ${name}-end -->$`, 'gm');
  return [...content.matchAll(pattern)].map(match => match[1].split('\n'));
}

function assertMigrationWarningContract(content: string): void {
  expect(textRegions(content, 'compile-warning-migration-allowlist'), 'one region with exactly the four warnings')
    .toEqual([MIGRATION_WARNINGS]);
  expect(textRegions(content, 'compile-warning-migration-changes'), 'one region with exactly the owner replacement')
    .toEqual([MIGRATION_CHANGES]);
  const flat = content.replace(/\s+/g, ' ');
  expect(flat).toContain('**Legacy-identity migration only.**');
  expect(flat).toContain(
    `whose locks committed at \`HEAD\` still use \`${LEGACY_SQUAD_INIT_ACTION}\`, gh-aw v0.91.5 compares safe updates `
    + 'against those committed locks, and `--approve` cannot clear that comparison before the upgrade is committed.',
  );
  expect(flat).toContain(
    'During that migration, also require exactly these four warnings, one occurrence of each exact diagnostic header',
  );
  expect(flat).toContain('with no other secret, action, redirect, or change');
  expect(flat).toContain('The summary is then `Compiled 8 workflows: 8 succeeded, 6 warnings`.');
  expect(flat).toContain('`Compiled 8 workflows: 8 succeeded, 2 warnings` (`6 warnings` during that migration)');
}

interface CompileWarning {
  header: string;
  changes: string[];
}

function parseCompileOutput(output: string): { warnings: CompileWarning[]; summary?: string } {
  const lines = output.replace(/\r\n/g, '\n').split('\n');
  const warnings: CompileWarning[] = [];
  lines.forEach((line, index) => {
    const match = /^(.+?\.md): (warning: .+)$/.exec(line);
    if (!match) return;
    const changes: string[] = [];
    if (match[2] === SAFE_UPDATE_WARNING) {
      for (const next of lines.slice(index + 1)) {
        if (next === 'Remediation options:') break;
        if (next.trim()) changes.push(next);
      }
    }
    // gh-aw prints native path separators; the documented gate uses POSIX paths.
    warnings.push({ header: `${match[1].replaceAll('\\', '/')}: ${match[2]}`, changes });
  });
  return { warnings, summary: /Compiled \d+ workflows?: \d+ succeeded, \d+ warnings?/.exec(output)?.[0] };
}

/** Applies a document's strict-compile warning gate to real compiler output; returns its STOP reasons. */
function compileGateFailures(content: string, output: string, migration: boolean): string[] {
  const [base = []] = textRegions(content, 'compile-warning-allowlist');
  const [migrationWarnings = []] = migration ? textRegions(content, 'compile-warning-migration-allowlist') : [];
  const [migrationChanges = []] = textRegions(content, 'compile-warning-migration-changes');
  const allowed = [...base, ...migrationWarnings];
  const { warnings, summary } = parseCompileOutput(output);
  const failures: string[] = [];
  for (const { header, changes } of warnings) {
    if (!allowed.includes(header)) {
      failures.push(`undocumented warning: ${header}`);
    } else if (header.endsWith(SAFE_UPDATE_WARNING) && changes.join('\n') !== migrationChanges.join('\n')) {
      failures.push(`undocumented safe-update change in ${header}: ${changes.join(' | ')}`);
    }
  }
  for (const header of allowed) {
    const count = warnings.filter(warning => warning.header === header).length;
    if (count !== 1) failures.push(`expected one "${header}", found ${count}`);
  }
  const expectedSummary = `Compiled 8 workflows: 8 succeeded, ${allowed.length} warnings`;
  if (summary !== expectedSummary) failures.push(`expected summary "${expectedSummary}", found "${summary}"`);
  return failures;
}

const MIGRATION_REVISION = 'e'.repeat(40);

/** Writes the package workflows that `gh aw add <packageName>@<revision>` installs, with a squad-init owner. */
function installPackageWorkflows(root: string, packageName: string, action: string): void {
  for (const [name, source] of WORKFLOW_TUPLES as string[][]) {
    const text = readLF(source).replaceAll(`uses: ${SQUAD_INIT_ACTION}@`, `uses: ${action}@`);
    const end = text.indexOf('\n---\n', 4);
    writeFileSync(
      resolve(root, `.github/workflows/${name}.md`),
      `${text.slice(0, end)}\nsource: ${packageName}@${MIGRATION_REVISION}${text.slice(end)}`,
    );
  }
}

/**
 * Commits locks compiled under the legacy squad-init owner, then reinstalls under the canonical
 * owner and runs the strict compiles a migration runs: with --approve, without it, and after the
 * upgrade commit. gh-aw v0.91.5 takes the safe-update baseline from the locks committed at HEAD.
 */
function compileCommittedLegacyMigration(): { approved: string; upgraded: string; committed: string } {
  const root = mkdtempSync(resolve(ROOT, '.squad-legacy-lock-migration-'));
  const git = (...args: string[]) => execFileSync('git', [
    '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
    '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args,
  ], { cwd: root, encoding: 'utf8' });
  const binary = process.env.SQUAD_GH_AW_BIN || 'gh';
  const prefix = process.env.SQUAD_GH_AW_BIN ? [] : ['aw'];
  const compile = (...flags: string[]) => {
    const result = spawnSync(binary, [...prefix, 'compile', '--strict', '--no-check-update', ...flags], {
      cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' }, timeout: 300_000,
    });
    const output = `${result.stdout}${result.stderr}`;
    expect(result.error ?? result.status, `gh aw compile --strict ${flags.join(' ')} failed:\n${output}`).toBe(0);
    return output;
  };
  try {
    git('init', '--quiet');
    git('config', 'core.autocrlf', 'false');
    // Like a real consumer: without a remote, gh-aw adds schedule-scattering warnings.
    git('remote', 'add', 'origin', 'https://github.com/octo/example.git');
    mkdirSync(resolve(root, '.github/workflows'), { recursive: true });
    cpSync(resolve(ROOT, 'workflows/shared'), resolve(root, '.github/workflows/shared'), { recursive: true });
    installPackageWorkflows(root, LEGACY_PACKAGE_NAME, LEGACY_SQUAD_INIT_ACTION);
    compileWithPinnedActions(root);
    for (const name of SQUAD_INIT_WORKFLOWS) {
      expect(readFileSync(resolve(root, `.github/workflows/${name}.lock.yml`), 'utf8'),
        `the committed legacy ${name}.lock.yml must use ${LEGACY_SQUAD_INIT_ACTION}`)
        .toContain(`uses: ${LEGACY_SQUAD_INIT_ACTION}@`);
    }
    git('add', '--', '.github');
    git('commit', '--quiet', '-m', `legacy ${LEGACY_PACKAGE_NAME} install`);
    installPackageWorkflows(root, PACKAGE_NAME, SQUAD_INIT_ACTION);
    const approved = compile('--approve');
    const upgraded = compile();
    git('add', '--', '.github');
    git('commit', '--quiet', '-m', `move to ${PACKAGE_NAME}`);
    return { approved, upgraded, committed: compile() };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe.each([CANONICAL, ...MIRRORS, GUIDE])('%s strict compile warning contract', path => {
  const content = readLF(path);

  it('allows exactly the native review advisory and bot-trigger diagnostic with hard-stop semantics', () => {
    assertCompileWarningContract(content);
  });

  it('conditions the native review exception on every existing control', () => {
    const flat = content.replace(/\s+/g, ' ');
    expect(flat).toContain('**only while all existing controls remain**');
    for (const control of [
      'same-repository head restriction', 'base-controlled workflow source',
      '`checkout: false` agent path', 'API-only inspection', 'exact run/head/attempt guard',
      'least-privilege jobs', 'advisory verdict', 'independent human approval',
    ]) expect(flat).toContain(control);
    expect(flat).toContain('`pull_request_target` is not generally safe');
  });

  it.each([
    ['unknown third warning', `${COMPILE_WARNINGS.join('\n')}\n.github/workflows/squad.md: warning: unknown diagnostic`],
    ['missing review warning', COMPILE_WARNINGS[1]],
    ['missing bot warning', COMPILE_WARNINGS[0]],
    ['duplicate warning', `${COMPILE_WARNINGS.join('\n')}\n${COMPILE_WARNINGS[0]}`],
    ['different workflow path', COMPILE_WARNINGS.join('\n').replace('squad-review.md', 'untrusted.md')],
    ['changed diagnostic', COMPILE_WARNINGS.join('\n').replace('very dangerous', 'safe')],
  ])('rejects a contract mutation allowing %s', (_label, replacement) => {
    const mutated = content.replace(COMPILE_WARNINGS.join('\n'), replacement);
    expect(mutated).not.toBe(content);
    expect(() => assertCompileWarningContract(mutated)).toThrow();
  });

  it('rejects removal of the error/additional-warning hard stop', () => {
    const mutated = content.replace('**STOP** on any error', 'Continue on any error');
    expect(mutated).not.toBe(content);
    expect(() => assertCompileWarningContract(mutated)).toThrow();
  });

  it('allows the four squad-init replacement warnings only during the legacy-identity migration', () => {
    expect(SQUAD_INIT_WORKFLOWS, 'package workflows that run squad-init').toHaveLength(4);
    assertMigrationWarningContract(content);
  });

  it.each([
    ['a fifth workflow', MIGRATION_WARNINGS.join('\n'),
      `${MIGRATION_WARNINGS.join('\n')}\n.github/workflows/squad-review.md: ${SAFE_UPDATE_WARNING}`],
    ['a missing workflow', MIGRATION_WARNINGS.join('\n'), MIGRATION_WARNINGS.slice(1).join('\n')],
    ['a new secret', MIGRATION_CHANGES.join('\n'),
      `New restricted secret(s):\n  - ACME_DEPLOY_KEY\n${MIGRATION_CHANGES.join('\n')}`],
    ['another removed action', MIGRATION_CHANGES.join('\n'),
      MIGRATION_CHANGES.join('\n').replace(LEGACY_SQUAD_INIT_ACTION, 'acme/squad/.github/actions/squad-init')],
    ['every upgrade', '**Legacy-identity migration only.**', '**Every upgrade.**'],
  ])('rejects a migration contract mutation allowing %s', (_label, original, replacement) => {
    const mutated = content.replace(original, replacement);
    expect(mutated).not.toBe(content);
    expect(() => assertMigrationWarningContract(mutated)).toThrow();
  });
});

const UPGRADE_SHA = 'd'.repeat(40);
const UPGRADE_CLEANUP = [LEGACY_OWNERSHIP, UNOWNED_MUTABLE_ROUTER_SKILL];

function upgradeBlock(path: string, content: string): string {
  const blocks = fencedBlocks(content).filter(block => block.includes(`${INSTALL_COMMAND} --force`));
  expect(blocks, `${path} must contain exactly one upgrade block`).toHaveLength(1);
  // The guide's block starts with a placeholder that the reader replaces.
  return blocks[0].replace(/^SQUAD_SHA="<40-character-commit-sha>"$/m, `SQUAD_SHA="${UPGRADE_SHA}"`);
}

function runUpgradeBlock(block: string, addStatus: number) {
  const root = mkdtempSync(resolve(ROOT, '.squad-upgrade-block-'));
  try {
    for (const path of UPGRADE_CLEANUP) {
      mkdirSync(dirname(resolve(root, path)), { recursive: true });
      writeFileSync(resolve(root, path), `${path}\n`);
    }
    // No `set -e`: a pasted or agent-run block keeps going after a failed command,
    // so the block itself must stop.
    const script = `
exec 3>&2
gh() {
  printf 'CALL gh %s\\n' "$*" >&3
  if [ "$1" = "api" ]; then printf '%s\\n' "${PACKAGE_NAME}"; return 0; fi
  if [ "$1 $2" = "aw add" ]; then return "$ADD_STATUS"; fi
  return 0
}
node() { printf 'CALL node %s\\n' "$*" >&3; }
SQUAD_SHA="${UPGRADE_SHA}"
${block}
echo "UPGRADE BLOCK COMPLETED"
`;
    const result = spawnSync('bash', ['-c', script], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ADD_STATUS: String(addStatus) },
    });
    return {
      ...result,
      calls: result.stderr.split('\n').filter(line => line.startsWith('CALL ')),
      remaining: UPGRADE_CLEANUP.filter(path => existsSync(resolve(root, path))),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe.each([CANONICAL, ...MIRRORS, GUIDE])('%s upgrade block', path => {
  const block = upgradeBlock(path, readLF(path));

  it('stops before any cleanup when the forced reinstall fails', () => {
    const result = runUpgradeBlock(block, 1);
    const input = `${path} upgrade block with \`gh aw add ${PACKAGE_NAME}@${UPGRADE_SHA} --force\` exiting 1`;
    expect(result.remaining, `${input} must keep ${UPGRADE_CLEANUP.join(' and ')}`).toEqual(UPGRADE_CLEANUP);
    expect(result.status, `${input} must exit 1:\n${result.stderr}`).toBe(1);
    expect(result.stderr, `${input} must say why it stopped`)
      .toContain('STOP: gh aw add --force failed, so this block removed nothing.');
    expect(result.calls.at(-1), `${input} must not run anything after the reinstall`)
      .toBe(`CALL gh aw add ${PACKAGE_NAME}@${UPGRADE_SHA} --force`);
    expect(result.stdout, input).not.toContain('UPGRADE BLOCK COMPLETED');
  });

  it('removes the superseded files and verifies after the reinstall succeeds', () => {
    const result = runUpgradeBlock(block, 0);
    const input = `${path} upgrade block with \`gh aw add ${PACKAGE_NAME}@${UPGRADE_SHA} --force\` exiting 0`;
    expect(result.status, `${input}:\n${result.stderr}`).toBe(0);
    expect(result.remaining, `${input} must delete ${UPGRADE_CLEANUP.join(' and ')}`).toEqual([]);
    expect(result.calls, input).toEqual([
      'CALL gh api --hostname github.com -H Accept: application/vnd.github.raw+json '
        + `repos/github/squad/contents/workflows/squad-workflows.manifest.json?ref=${UPGRADE_SHA} --jq .package`,
      `CALL gh aw add ${PACKAGE_NAME}@${UPGRADE_SHA} --force`,
      'CALL node .github/workflows/shared/squad-install-verifier.mjs --materialize-runtime',
      'CALL gh aw compile --strict',
      'CALL node .github/workflows/shared/squad-install-verifier.mjs --verify-install '
        + `--source-revision ${UPGRADE_SHA} --strict-compile`,
    ]);
    expect(result.stdout, input).toContain('UPGRADE BLOCK COMPLETED');
  });
});

const MANIFEST_API = 'repos/github/squad/contents/workflows/squad-workflows.manifest.json';
const BRANCH_REF = 'dev';
const BRANCH_REF_CLEANUP = [UNOWNED_MUTABLE_ROUTER_SKILL, LEGACY_OWNERSHIP];
const MANIFEST_BLOCK_SURFACES = [CANONICAL, ...MIRRORS, GUIDE, 'README.md'] as const;

/** Every fenced block that reads the package manifest through the contents API, named by its fence line. */
function manifestBlocks(path: string): { name: string; block: string }[] {
  const content = readLF(path);
  return [...content.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)]
    .filter(match => match[1].includes(MANIFEST_API))
    .map(match => ({ name: `${path}:${content.slice(0, match.index).split('\n').length}`, block: match[1] }));
}

function runWithBranchRef(block: string) {
  const root = mkdtempSync(resolve(ROOT, '.squad-sha-guard-'));
  try {
    for (const path of BRANCH_REF_CLEANUP) {
      mkdirSync(dirname(resolve(root, path)), { recursive: true });
      writeFileSync(resolve(root, path), `${path}\n`);
    }
    // The contents API accepts a branch as `ref`, so only the block's SHA guard can stop it.
    const script = `
exec 3>&2
gh() {
  printf 'CALL gh %s\\n' "$*" >&3
  case "$*" in
    "aw --version") printf 'gh aw version v0.91.5\\n' ;;
    "repo view --json nameWithOwner --jq .nameWithOwner") printf 'octo/example\\n' ;;
    "repo view --json defaultBranchRef --jq .defaultBranchRef.name") printf 'main\\n' ;;
    *"--jq .has_issues") printf 'true\\n' ;;
    *"${MANIFEST_API}"*) printf '%s\\n' "${PACKAGE_NAME}" ;;
  esac
  return 0
}
git() { printf 'CALL git %s\\n' "$*" >&3; }
node() { printf 'CALL node %s\\n' "$*" >&3; }
SQUAD_SHA="${BRANCH_REF}"
${block.replace(/^SQUAD_SHA="<40-character-commit-sha>"/m, `SQUAD_SHA="${BRANCH_REF}"`)}
echo "MANIFEST BLOCK COMPLETED"
`;
    const result = spawnSync('bash', ['-c', script], {
      cwd: root,
      encoding: 'utf8',
      // Any git call that escapes the stub fails instead of touching this repository.
      env: { ...process.env, GIT_DIR: resolve(root, 'no-git-dir') },
    });
    return {
      ...result,
      calls: result.stderr.split('\n').filter(line => line.startsWith('CALL ')),
      remaining: BRANCH_REF_CLEANUP.filter(path => existsSync(resolve(root, path))),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('SQUAD_SHA guard before every manifest identity check', () => {
  it('finds every runnable block that reads the manifest through the contents API', () => {
    expect(Object.fromEntries(MANIFEST_BLOCK_SURFACES.map(path => [path, manifestBlocks(path).length]))).toEqual({
      ...Object.fromEntries([CANONICAL, ...MIRRORS].map(path => [path, 3])),
      [GUIDE]: 3,
      'README.md': 1,
    });
  });

  it.each(MANIFEST_BLOCK_SURFACES.flatMap(manifestBlocks).map(({ name, block }) => [name, block]))(
    '%s stops on a branch name before the contents API, install, or cleanup',
    (name, block) => {
      const result = runWithBranchRef(block);
      const input = `${name} with SQUAD_SHA=${BRANCH_REF}`;
      expect({
        contentsApiCalls: result.calls.filter(call => call.includes(MANIFEST_API)),
        installCalls: result.calls.filter(call => call.startsWith('CALL gh aw add')),
        remaining: result.remaining,
        status: result.status,
      }, `${input} must stop before the contents API, install, or cleanup:\n${result.stderr}`).toEqual({
        contentsApiCalls: [],
        installCalls: [],
        remaining: BRANCH_REF_CLEANUP,
        status: 1,
      });
      expect(result.stderr, `${input} must say why it stopped`).toMatch(/^STOP: SQUAD_SHA must be /m);
      expect(result.stdout, input).not.toContain('MANIFEST BLOCK COMPLETED');
    },
  );
});

const VERIFIER = 'workflows/shared/squad-install-verifier.mjs';
const LEGACY_HINT_SURFACES = [
  CANONICAL, ...MIRRORS, GUIDE, 'README.md', AGENT_GUIDE, 'workflows/README.md', VERIFIER,
] as const;
// Revisions that declare only the legacy identity download the Squad CLI from the bradygaster/squad
// fork, so no install hint may send users there. Each shape is one way earlier text did that.
const LEGACY_INSTALL_SHAPES: ReadonlyArray<readonly [string, RegExp]> = [
  ['legacy install command', /gh aw add "?bradygaster\/squad\/workflows@/g],
  ['install under the legacy identity', /\binstall\b[^.;:]*?\bunder (?:that|the legacy|this) identity\b/gi],
  ['install an older revision', /(?<!\bnot )\binstall (?:it |an? |the )?(?:older|earlier)\b[^.;:]*?\brevisions? (?:as|under)\b/gi],
  ['install a legacy-only revision',
    /(?<!\bnot )\binstall (?:a|an|the)\b[^.;:]*?\bdeclares `?bradygaster\/squad\/workflows/gi],
  ['stay on a legacy revision', /\bstay on (?:a|an|the|that|such)\b[^.;:]*?\brevision/gi],
  ['keep installing', /\bkeep installing\b/gi],
  ['accept the legacy squad-init action name',
    /\breported as `?bradygaster\/squad\/\.github\/actions\/squad-init|\bnames the same squad-init action as `?bradygaster\/|\bAccept that name only\b/g],
  ['legacy identity as a steady state', /\bremains supported\b/gi],
];
// Any clause of prose or of a printed message that tells the reader to install the legacy identity.
const LEGACY_INSTALL_CLAUSE =
  /(?<!\b(?:not|never) )(?<![-/\w])(?:install|reinstall)\b(?:(?![.;:!?](?:\s|$))[\s\S])*?bradygaster\/squad\/workflows/gi;

/** Whitespace-flattened text, with the 1-based source line of every flattened character. */
function flattenLines(text: string): { flat: string; lines: number[] } {
  const chars: string[] = [];
  const lines: number[] = [];
  let line = 1;
  let lastSpace = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const space = /\s/.test(char);
    if (!space || !lastSpace) {
      chars.push(space ? ' ' : char);
      lines.push(line);
    }
    lastSpace = space;
    if (char === '\n') line += 1;
  }
  return { flat: chars.join(''), lines };
}

/** Markdown prose plus only the messages that runnable blocks print, line-aligned with the source. */
function readableMarkdown(text: string): string {
  return text.replace(/^```[^\n]*\n[\s\S]*?^```$/gm, block => block.split('\n').map(line =>
    [...line.matchAll(/\b(?:echo|printf)\s+(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/g)]
      .map(match => match[1] ?? match[2]).join(' ')).join('\n'));
}

function legacyInstallHints(path: string): string[] {
  const text = readLF(path);
  const findings: string[] = [];
  const scan = (source: string, shapes: ReadonlyArray<readonly [string, RegExp]>) => {
    const { flat, lines } = flattenLines(source);
    for (const [label, shape] of shapes) {
      for (const match of flat.matchAll(shape)) {
        findings.push(`${path}:${lines[match.index!]}: ${label}: "${match[0].slice(0, 200)}"`);
      }
    }
  };
  scan(text, LEGACY_INSTALL_SHAPES);
  if (path.endsWith('.md')) scan(readableMarkdown(text), [['install the legacy identity', LEGACY_INSTALL_CLAUSE]]);
  return findings;
}

describe('no install-time fallback to the legacy package identity', () => {
  it.each(LEGACY_HINT_SURFACES)('%s never tells users to install or stay on the legacy identity', path => {
    expect(legacyInstallHints(path), `${path}: install hints or STOP messages that send users to `
      + `${LEGACY_PACKAGE_NAME} (file:line: shape: text)`).toEqual([]);
  });

  it('keeps the legacy-to-canonical move and the verifier\'s transitional acceptance of the legacy identity', () => {
    const skillFilter = extractDeletionFilter(readLF(CANONICAL), CANONICAL);
    for (const path of [CANONICAL, GUIDE]) {
      const text = readLF(path);
      expect(fencedBlocks(text).some(block => block.includes(`${INSTALL_COMMAND} --force`)
        && block.includes(`\nrm -f ${LEGACY_OWNERSHIP}\n`)), `${path} must keep the upgrade's legacy-record cleanup`)
        .toBe(true);
      expect(text, `${path} must stage deletions through the skill's ownership-record filter`).toContain(skillFilter);
      expect(text, `${path} must keep the migration warning allowlist`).toContain(`- ${LEGACY_SQUAD_INIT_ACTION}\n`);
    }
    const legacyDeletion = runDeletionGate(extractDeletionGate(readLF(CANONICAL), CANONICAL), [LEGACY_OWNERSHIP],
      { [LEGACY_OWNERSHIP]: ownershipBlob(LEGACY_PACKAGE_NAME) });
    expect(legacyDeletion.status, `${CANONICAL} staged-deletion gate must allow deleting ${LEGACY_OWNERSHIP} `
      + `(${LEGACY_PACKAGE_NAME}): ${legacyDeletion.stderr}`).toBe(0);
    expect(LEGACY_PACKAGE_NAMES, `${VERIFIER} must keep accepting existing legacy installations`)
      .toEqual(['bradygaster/squad/workflows']);
    expect(readLF(VERIFIER)).toContain('Object.freeze([PACKAGE_NAME, ...LEGACY_PACKAGE_NAMES])');
  });
});

describe('gh-aw legacy-identity migration with committed legacy locks', () => {
  let outputs: { approved: string; upgraded: string; committed: string };
  beforeAll(() => {
    outputs = compileCommittedLegacyMigration();
  }, 900_000);

  const headers = (output: string) => parseCompileOutput(output).warnings.map(warning => warning.header).sort();

  it('repeats the squad-init owner replacement in every strict compile until the upgrade is committed', () => {
    const summary = (output: string) => parseCompileOutput(output).summary;
    expect(headers(outputs.approved), `gh aw compile --strict --approve output:\n${outputs.approved}`)
      .toEqual([...COMPILE_WARNINGS].sort());
    expect(summary(outputs.approved), outputs.approved).toBe('Compiled 8 workflows: 8 succeeded, 2 warnings');
    expect(headers(outputs.upgraded), `gh aw compile --strict output after --approve:\n${outputs.upgraded}`)
      .toEqual([...COMPILE_WARNINGS, ...MIGRATION_WARNINGS].sort());
    expect(summary(outputs.upgraded), outputs.upgraded).toBe('Compiled 8 workflows: 8 succeeded, 6 warnings');
    for (const warning of parseCompileOutput(outputs.upgraded).warnings) {
      if (warning.header.endsWith(SAFE_UPDATE_WARNING)) expect(warning.changes, warning.header).toEqual(MIGRATION_CHANGES);
    }
    expect(headers(outputs.committed), `gh aw compile --strict output after the upgrade commit:\n${outputs.committed}`)
      .toEqual([...COMPILE_WARNINGS].sort());
    expect(summary(outputs.committed), outputs.committed).toBe('Compiled 8 workflows: 8 succeeded, 2 warnings');
  });

  describe.each([CANONICAL, ...MIRRORS, GUIDE])('%s warning gate', path => {
    const content = readLF(path);

    it('accepts that migration compile, and those four warnings only during the migration', () => {
      const accepted = compileGateFailures(content, outputs.upgraded, true);
      expect(accepted, `${path} must accept the four squad-init replacement warnings of a migration whose `
        + `legacy locks are committed; compiler warnings: ${headers(outputs.upgraded).join('; ')}`).toEqual([]);
      expect(compileGateFailures(content, outputs.upgraded, false).sort(),
        `${path} must stop on those warnings outside the migration`).toEqual([
        ...MIGRATION_WARNINGS.map(header => `undocumented warning: ${header}`),
        'expected summary "Compiled 8 workflows: 8 succeeded, 2 warnings", '
          + 'found "Compiled 8 workflows: 8 succeeded, 6 warnings"',
      ].sort());
      expect(compileGateFailures(content, outputs.committed, false),
        `${path} must accept the compile after the upgrade commit`).toEqual([]);
    });

    const safeUpdateBlock = (workflow: string) =>
      `.github/workflows/${workflow}.md: ${SAFE_UPDATE_WARNING}\n\n${MIGRATION_CHANGES.join('\n')}\n\nRemediation options:\n`;

    it.each([
      ['a new secret', (output: string) => output.replace(MIGRATION_CHANGES[0],
        `New restricted secret(s):\n  - ACME_DEPLOY_KEY\n${MIGRATION_CHANGES[0]}`)],
      ['another removed action', (output: string) => output.replace(MIGRATION_CHANGES[3],
        '  - acme/squad/.github/actions/squad-init')],
      ['a replacement in another workflow', (output: string) => `${output}\n${safeUpdateBlock('squad-review')}`],
      ['a duplicated replacement', (output: string) => `${output}\n${safeUpdateBlock(SQUAD_INIT_WORKFLOWS[0])}`],
    ])('stops on a migration compile with %s', (label, mutate) => {
      const mutated = mutate(outputs.upgraded);
      expect(mutated).not.toBe(outputs.upgraded);
      expect(compileGateFailures(content, mutated, true), `${path} must stop on a migration compile with ${label}`)
        .not.toEqual([]);
    });
  });
});

describe('gh-aw-enlistment skill', () => {
  it('canonical SKILL.md exists', () => {
    expect(existsSync(resolve(ROOT, CANONICAL)), `${CANONICAL} should exist`).toBe(true);
  });

  it('parses into a valid SkillDefinition', () => {
    const skill = parseSkillFile(SKILL_ID, readLF(CANONICAL));
    expect(skill, 'skill should parse').toBeDefined();
    expect(skill!.id).toBe(SKILL_ID);
    expect(skill!.name).toContain(SKILL_ID);
    expect(skill!.content.length).toBeGreaterThan(0);
  });

  describe('discoverability — frontmatter trigger phrases', () => {
    const content = readLF(CANONICAL);
    // Assert against the PARSED triggers array, not raw text. `toContain` on the
    // whole document would still pass if a phrase were deleted from the
    // frontmatter and merely mentioned in prose — which is the exact regression
    // this block exists to catch, since a phrase in prose is not discoverable.
    // `skill.triggers` is the same array the runtime matcher iterates
    // (packages/squad-sdk/src/skills/index.ts), so this tests the real path.
    const skill = parseSkillFile(SKILL_ID, content);

    it('declares a non-empty triggers block in frontmatter', () => {
      expect(skill, 'skill should parse').toBeDefined();
      expect(Array.isArray(skill!.triggers), 'triggers should parse to an array').toBe(true);
      expect(skill!.triggers.length, 'triggers must not be empty').toBeGreaterThan(0);
    });

    // The three trigger phrases the skill must be discoverable by.
    for (const phrase of [
      'set up Squad agentic workflows',
      'enlist this repo in Squad',
      'install Squad gh-aw workflows',
    ]) {
      it(`is discoverable by "${phrase}"`, () => {
        expect(
          skill!.triggers,
          `"${phrase}" must be a frontmatter trigger, not merely present somewhere in the document`,
        ).toContain(phrase);
      });
    }
  });

  describe('safety gates encoded in the body', () => {
    const content = readLF(CANONICAL);

    // EXCLUSIVITY GUARD — these two tests enforce the exact set of
    // backtick-delimited tokens in the bounded allowlist region.
    // Using deep-equality on a sorted array (not .toContain) so that adding a
    // 4th entry, removing an entry, or renaming one all cause an immediate
    // failure.  The delimiters scope the extraction so identical strings that
    // appear elsewhere in the document (Anti-Patterns section, examples) do
    // NOT count.
    it('allowlist region delimiters exist exactly once each', () => {
      const startMatches = [...content.matchAll(/^<!-- allowlist-start -->$/gm)];
      const endMatches   = [...content.matchAll(/^<!-- allowlist-end -->$/gm)];
      expect(startMatches.length, '<!-- allowlist-start --> must appear exactly once').toBe(1);
      expect(endMatches.length,   '<!-- allowlist-end --> must appear exactly once').toBe(1);
    });

    it('allowlist region contains EXACTLY the two documented secrets and the one documented action — no more, no fewer', () => {
      const startTag = '<!-- allowlist-start -->';
      const endTag   = '<!-- allowlist-end -->';
      const startIdx = content.indexOf(startTag);
      const endIdx   = content.indexOf(endTag);
      expect(startIdx, 'allowlist-start delimiter must exist').toBeGreaterThan(-1);
      expect(endIdx,   'allowlist-end delimiter must exist').toBeGreaterThan(startIdx);

      // Extract strictly between the delimiter lines (exclusive).
      const region = content.slice(startIdx + startTag.length, endIdx);

      // Every backtick-delimited token in the region — order-independent exact set.
      const tokens = [...region.matchAll(/`([^`]+)`/g)].map(m => m[1]);
      expect(tokens.slice().sort(), 'allowlist tokens must be exactly the three documented entries').toEqual(
        [
          'SQUAD_GITHUB_APP_PRIVATE_KEY',
          'SQUAD_GITHUB_TOKEN',
          SQUAD_INIT_ACTION,
        ].sort()
      );

      // Structural: exactly 2 bullet lines (one for the two secrets, one for the action).
      const bulletLines = region.split('\n').filter(l => l.trimStart().startsWith('- '));
      expect(bulletLines.length, 'allowlist region must contain exactly 2 bullet lines').toBe(2);
    });

    it('installs one immutable native package with the 8/17/1 topology', () => {
      expect(content).toContain(': "${SQUAD_SHA:?STOP: set SQUAD_SHA to an explicit, maintainer-approved 40-character Squad commit SHA before installing.}"');
      expect(content).not.toContain('commits/dev');
      expect(content).toContain('^' + '[0-9a-f]{40}' + '$');
      expect(content, `skill must install ${PACKAGE_NAME}`).toContain(INSTALL_COMMAND);
      for (const block of fencedBlocks(content)) {
        expect(block, `no executable block may install the legacy ${LEGACY_PACKAGE_NAME} identity`)
          .not.toContain(LEGACY_INSTALL_PREFIX);
      }
      expect(content).toContain('exactly eight workflows, seventeen runtime resources, and one');
      for (const workflow of [
        'squad.md',
        'squad-implement-worker.md',
        'squad-review.md',
        'squad-deps-worker.md',
        'squad-retro.md',
        'squad-improvement-worker.md',
        'squad-bootstrap.md',
        'squad-command-router.md',
      ]) expect(content).toContain(workflow);
    });

    it('requires the package verifier to validate every shared runtime guard', () => {
      expect(content).toContain('squad-install-verifier.mjs --materialize-runtime');
      expect(content).toContain('--verify-install');
      expect(content).toContain('--source-revision "${SQUAD_SHA}"');
      expect(content).toContain('--strict-compile');
      expect(content).toContain('missing source/lock pair');
      expect(content).toContain('stale source/resource digest');
    });

    it('removes only gh-aw\'s mutable router and preserves the exact Squad skill', () => {
      expect(content.match(/rm -f \.github\/skills\/agentic-workflows\/SKILL\.md/g),
        'install, upgrade and correct-example blocks each remove the router').toHaveLength(3);
      expect(content).toContain('not part of the Squad package');
      expect(content).toContain('Do not adopt or vendor the rest');
      expect(content).toContain('.github/skills/gh-aw-enlistment/SKILL.md');
      expect(content, `${CANONICAL} must use the exact staged-deletion allowlist, then its ownership-record loop`)
        .toContain(DELETION_ALLOWLIST);
    });

    // The legacy record is allowed by its HEAD content, not its path, so these cases supply that content.
    it.each([
      ['no deletions', [], {}, 0],
      ['the mutable router', [UNOWNED_MUTABLE_ROUTER_SKILL], {}, 0],
      ['the superseded legacy ownership record', [LEGACY_OWNERSHIP],
        { [LEGACY_OWNERSHIP]: ownershipBlob(LEGACY_PACKAGE_NAME) }, 0],
      ['the router and the legacy record together', [UNOWNED_MUTABLE_ROUTER_SKILL, LEGACY_OWNERSHIP],
        { [LEGACY_OWNERSHIP]: ownershipBlob(LEGACY_PACKAGE_NAME) }, 0],
      ['the legacy record without a readable HEAD blob', [LEGACY_OWNERSHIP], {}, 1],
      ['the canonical ownership record', [OWNERSHIP_DESTINATION], {}, 1],
      ['an installed workflow', ['.github/workflows/squad.md'], {}, 1],
      ['a legacy-record prefix match', [`${LEGACY_OWNERSHIP}.bak`], {}, 1],
    ] as const)('the staged-deletion gate handles %s', (label, deletions, head, status) => {
      const result = runDeletionGate(extractDeletionGate(content, CANONICAL), deletions, head);
      const input = `${CANONICAL} staged-deletion gate with ${label} (${deletions.join(', ')}; HEAD ${JSON.stringify(head)})`;
      expect(result.status, `${input}: ${result.stderr}`).toBe(status);
      if (status === 1) {
        expect(result.stderr, input).toContain(`STOP: unexpected staged deletions:\n${deletions.join('\n')}`);
      }
    });

    // After a canonical reinstall the verifier says to delete every Squad ownership record except the one
    // gh-aw writes for github/squad/workflows, so the gate must let exactly those deletions through.
    it.each([
      [`the ${CASE_VARIANT_PACKAGE} record`, [CASE_VARIANT_OWNERSHIP],
        { [CASE_VARIANT_OWNERSHIP]: ownershipBlob(CASE_VARIANT_PACKAGE) }, []],
      [`the ${LEGACY_CASE_VARIANT_PACKAGE} record`, [LEGACY_CASE_VARIANT_OWNERSHIP],
        { [LEGACY_CASE_VARIANT_OWNERSHIP]: ownershipBlob(LEGACY_CASE_VARIANT_PACKAGE) }, []],
      ['the router, the legacy record and a case-variant record together',
        [UNOWNED_MUTABLE_ROUTER_SKILL, LEGACY_OWNERSHIP, CASE_VARIANT_OWNERSHIP],
        {
          [LEGACY_OWNERSHIP]: ownershipBlob(LEGACY_PACKAGE_NAME),
          [CASE_VARIANT_OWNERSHIP]: ownershipBlob(CASE_VARIANT_PACKAGE),
        }, []],
      [`a non-native ${PACKAGE_NAME} duplicate`, [NON_NATIVE_OWNERSHIP],
        { [NON_NATIVE_OWNERSHIP]: ownershipBlob(PACKAGE_NAME) }, []],
      [`a non-native ${LEGACY_PACKAGE_NAME} duplicate`, [NON_NATIVE_OWNERSHIP],
        { [NON_NATIVE_OWNERSHIP]: ownershipBlob(LEGACY_PACKAGE_NAME) }, []],
      [`an exact ${PACKAGE_NAME} record at a case-variant path`, [CASE_VARIANT_OWNERSHIP],
        { [CASE_VARIANT_OWNERSHIP]: ownershipBlob(PACKAGE_NAME) }, []],
      ['the canonical ownership record', [OWNERSHIP_DESTINATION],
        { [OWNERSHIP_DESTINATION]: ownershipBlob(PACKAGE_NAME) }, [OWNERSHIP_DESTINATION]],
      [`the canonical ownership record path holding a ${CASE_VARIANT_PACKAGE} record`, [OWNERSHIP_DESTINATION],
        { [OWNERSHIP_DESTINATION]: ownershipBlob(CASE_VARIANT_PACKAGE) }, [OWNERSHIP_DESTINATION]],
      ['another package\'s ownership record', ['.github/aw/packages/acme-tools-0123456789ab.json'],
        { '.github/aw/packages/acme-tools-0123456789ab.json': ownershipBlob('acme/tools') },
        ['.github/aw/packages/acme-tools-0123456789ab.json']],
      ['a record that is not JSON', [CASE_VARIANT_OWNERSHIP],
        { [CASE_VARIANT_OWNERSHIP]: `${CASE_VARIANT_PACKAGE}\n` }, [CASE_VARIANT_OWNERSHIP]],
      ['a record without a package', [CASE_VARIANT_OWNERSHIP],
        { [CASE_VARIANT_OWNERSHIP]: '{"schemaVersion":1}\n' }, [CASE_VARIANT_OWNERSHIP]],
      ['a record missing from HEAD', [CASE_VARIANT_OWNERSHIP], {}, [CASE_VARIANT_OWNERSHIP]],
      ['a case-variant record outside .github/aw/packages/', ['.github/aw/github-squad-workflows.json'],
        { '.github/aw/github-squad-workflows.json': ownershipBlob(CASE_VARIANT_PACKAGE) },
        ['.github/aw/github-squad-workflows.json']],
      ['a case-variant record nested below .github/aw/packages/', ['.github/aw/packages/old/record.json'],
        { '.github/aw/packages/old/record.json': ownershipBlob(CASE_VARIANT_PACKAGE) },
        ['.github/aw/packages/old/record.json']],
      ['a case-variant record without the .json suffix', [`${CASE_VARIANT_OWNERSHIP}.bak`],
        { [`${CASE_VARIANT_OWNERSHIP}.bak`]: ownershipBlob(CASE_VARIANT_PACKAGE) }, [`${CASE_VARIANT_OWNERSHIP}.bak`]],
      ['a case-variant record beside an installed workflow', [CASE_VARIANT_OWNERSHIP, '.github/workflows/squad.md'],
        { [CASE_VARIANT_OWNERSHIP]: ownershipBlob(CASE_VARIANT_PACKAGE) }, ['.github/workflows/squad.md']],
    ] as const)('the staged-deletion gate permits only stale Squad ownership records: %s', (
      label, deletions, head, stopped,
    ) => {
      const result = runDeletionGate(extractDeletionGate(content, CANONICAL), deletions, head);
      const input = `${CANONICAL} staged-deletion gate with ${label} (${deletions.join(', ')}; HEAD ${JSON.stringify(head)})`;
      expect(result.status, `${input}: ${result.stderr}`).toBe(stopped.length === 0 ? 0 : 1);
      if (stopped.length > 0) {
        expect(result.stderr, input).toContain(`STOP: unexpected staged deletions:\n${stopped.join('\n')}\n`);
      }
    });

    it('lists the permitted staged deletions exactly as the gate enforces them', () => {
      expect(content.replace(/\s+/g, ' '), `${CANONICAL} step 7 must describe the gate's ownership-record rule`)
        .toContain(
          'and a `.github/aw/packages/*.json` ownership record whose `package` is '
          + `\`${PACKAGE_NAME}\` or \`${LEGACY_PACKAGE_NAME}\` in any letter case, other than `
          + `\`${OWNERSHIP_DESTINATION}\`, the record gh-aw writes for \`${PACKAGE_NAME}\`. Those are the records `
          + 'the verifier tells you to delete',
        );
    });

    it('documents the legacy-identity migration that the verifier enforces', () => {
      const flat = content.replace(/\s+/g, ' ');
      const why = `skill must document migrating off ${LEGACY_PACKAGE_NAME} and deleting ${LEGACY_OWNERSHIP}`;
      expect(flat, why).toContain(
        'Earlier revisions, including ones committed after the repository moved to `github/squad`, '
        + `declare and verify only \`${LEGACY_PACKAGE_NAME}\``,
      );
      expect(flat, why).toContain(
        `\`${LEGACY_OWNERSHIP}\` after the forced reinstall, so the block deletes exactly that file before verifying`,
      );
      expect(flat, why).toContain('the verifier fails closed while both ownership records exist');
      expect(flat, 'skill must name the one-time squad-init safe-update change').toContain(
        `action \`${SQUAD_INIT_ACTION}\` added and \`bradygaster/squad/.github/actions/squad-init\` removed.`,
      );
      expect(flat, why).toContain('**STOP** on any other new secret or action.');
      expect(flat, 'skill must say why a legacy-identity installation has to move').toContain(
        'Those revisions download the Squad CLI from the separately controlled `bradygaster/squad` fork, '
        + `which has no releases, so move such an installation to a revision that declares \`${PACKAGE_NAME}\` `
        + 'with the block below.',
      );
      expect(flat, 'skill must accept the legacy identity only while an installation moves').toContain(
        `Verifiers of revisions that declare \`${PACKAGE_NAME}\` still accept the legacy identity, so an existing `
        + 'installation keeps verifying while it moves, and they print a notice that says to move it.',
      );
      expect(flat, 'skill must say a failed reinstall removes nothing')
        .toContain('If the forced reinstall fails, the block stops before it removes anything.');
      const upgrade = fencedBlocks(content).find(block => block.includes(`${INSTALL_COMMAND} --force`));
      expect(upgrade, 'skill must include an executable upgrade block').toBeDefined();
      const steps = [
        extractIdentityGate(content),
        `${INSTALL_COMMAND} --force`,
        `rm -f ${UNOWNED_MUTABLE_ROUTER_SKILL}`,
        `rm -f ${LEGACY_OWNERSHIP}`,
        'squad-install-verifier.mjs --materialize-runtime',
        'gh aw compile --strict',
        '--verify-install',
      ];
      const order = steps.map(step => upgrade!.indexOf(step));
      expect(order.every(index => index > -1), `upgrade block step positions: ${order.join(', ')}`).toBe(true);
      expect(order, 'upgrade block steps must run in order').toEqual([...order].sort((a, b) => a - b));
      const stepNumber = (title: string) => {
        const heading = content.split('\n').find(line => line.startsWith('### ') && line.endsWith(title));
        expect(heading, `skill must keep the step "${title}"`).toBeDefined();
        return /^### (\d+)\. /.exec(heading!)![1];
      };
      const compileStep = stepNumber('Always run the final strict compile WITHOUT `--approve`');
      const stageStep = stepNumber('Inspect generated files, then stage only the documented surfaces');
      const installStep = stepNumber('Install the native package at an explicit, maintainer-approved revision');
      expect(flat, 'the migration allowlist must name the step that holds the upgrade block')
        .toContain(`**Legacy-identity migration only.** While step ${installStep}'s upgrade block moves an installation`);
      const compileSection = content.slice(
        content.indexOf(`### ${compileStep}. `),
        content.indexOf(`### ${Number(compileStep) + 1}. `),
      );
      expect(compileSection.replace(/\s+/g, ' '), `step ${compileStep} must hold the two-warning check`)
        .toContain('require exactly two warnings');
      expect(compileSection, `step ${compileStep} must hold the legacy-identity migration allowlist`)
        .toContain('<!-- compile-warning-migration-allowlist-start -->');
      expect(flat, 'skill must route the migration warnings to the warning check by its current number').toContain(
        'Until the upgrade is committed, every strict compile repeats that change as four warnings, '
        + `which step ${compileStep} allows only for this migration.`,
      );
      expect(flat, 'the upgrade block must hand off to the warning check and staging steps by their current numbers')
        .toContain(`Apply step ${compileStep}'s warning check, including its legacy-identity migration allowlist, `
          + `to the compile output above, then stage and verify as in step ${stageStep}.`);
    });

    it('gates installation on the revision declaring the canonical package identity', () => {
      const gate = extractIdentityGate(content);
      expect(content.indexOf(IDENTITY_GATE_END), 'the identity gate must precede the install command')
        .toBeLessThan(content.indexOf(INSTALL_COMMAND));
      expect(content.split(gate).length - 1, 'install, upgrade and correct-example blocks must run the same gate')
        .toBe(3);
      const flat = content.replace(/\s+/g, ' ');
      expect(flat, 'skill must state the manifest cutoff').toContain(MANIFEST_RULE);
      expect(flat, 'skill must route older revisions to a canonical revision, not to the legacy identity').toContain(
        `Do not install an older revision under \`${LEGACY_PACKAGE_NAME}\` instead: its activation downloads the `
        + 'Squad CLI from the separately controlled `bradygaster/squad` fork, which has no releases. '
        + `Use a revision whose manifest declares \`${PACKAGE_NAME}\`, or ask the Squad maintainers for one.`,
      );
    });

    it.each([
      ['a revision declaring the canonical package', { manifestPackage: PACKAGE_NAME }, 'pass', ''],
      ['a revision declaring the legacy package', { manifestPackage: LEGACY_PACKAGE_NAME }, 'mismatch',
        LEGACY_PACKAGE_NAME],
      ['a case-variant package', { manifestPackage: 'GitHub/Squad/workflows' }, 'mismatch', 'GitHub/Squad/workflows'],
      ['an unreadable manifest', { fail: true }, 'unreadable', ''],
    ] as const)('the identity gate handles %s', (label, response, outcome, found) => {
      const result = runIdentityGate(extractIdentityGate(content), response);
      expect(result.status, `${label}: ${result.stderr}`).toBe(outcome === 'pass' ? 0 : 1);
      expect(result.stderr, `${label}: the gate must read the manifest at SQUAD_SHA on github.com`).toContain(
        'CALL api --hostname github.com -H Accept: application/vnd.github.raw+json '
        + `repos/github/squad/contents/workflows/squad-workflows.manifest.json?ref=${IDENTITY_SHA} --jq .package`,
      );
      if (outcome === 'pass') {
        expect(result.stdout, label).toContain('IDENTITY GATE PASSED');
        return;
      }
      expect(result.stdout, `${label} must stop before installing`).not.toContain('IDENTITY GATE PASSED');
      if (outcome === 'unreadable') {
        expect(result.stderr, `${label}: the stop must say the manifest could not be read`)
          .toContain(IDENTITY_UNREADABLE_STOP);
        expect(result.stderr, `${label}: the stop must point at gh auth, network access and SQUAD_SHA`)
          .toContain(IDENTITY_UNREADABLE_HINT);
        expect(result.stderr, `${label}: an unreadable manifest must not suggest the legacy identity`)
          .not.toContain(LEGACY_PACKAGE_NAME);
        return;
      }
      expect(result.stderr, label).toContain(
        `STOP: Squad ${IDENTITY_SHA} does not declare the ${PACKAGE_NAME} package (found '${found}').`,
      );
      expect(result.stderr, `${label}: a readable manifest routes to a ${PACKAGE_NAME} revision`)
        .toContain(IDENTITY_CANONICAL_HINT);
      expect(result.stderr, `${label}: a readable manifest is not an access problem`)
        .not.toContain(IDENTITY_UNREADABLE_HINT);
    });

    it('names the legacy squad-init action only for the legacy-identity migration', () => {
      const lines = content.split('\n');
      const reviewHeading = lines.find(line => line.startsWith('### ')
        && line.endsWith('Review the first-install safe-update report — approve ONLY the documented entries'));
      expect(reviewHeading, `${CANONICAL} must keep its safe-update review step`).toBeDefined();
      const reviewStart = content.indexOf(`${reviewHeading}\n`);
      const review = content.slice(reviewStart, content.indexOf('\n### ', reviewStart + 1));
      const antiPatterns = content.slice(content.indexOf('\n## Anti-Patterns\n'));
      expect(antiPatterns, `${CANONICAL} must keep its Anti-Patterns section`).toContain('Approving unknown safe updates');
      for (const [name, text] of [[reviewHeading!, review], ['## Anti-Patterns', antiPatterns]] as const) {
        expect(text, `${CANONICAL} "${name}" must not offer ${LEGACY_SQUAD_INIT_ACTION} as an approvable name`)
          .not.toContain(LEGACY_SQUAD_INIT_ACTION);
      }
      expect(antiPatterns.replace(/\s+/g, ' ')).toContain(
        `Approve ONLY \`SQUAD_GITHUB_APP_PRIVATE_KEY\`, \`SQUAD_GITHUB_TOKEN\`, and \`${SQUAD_INIT_ACTION}\`. `
        + 'Anything else is a STOP.',
      );
    });

    it('dates the identity cutoff by the manifest, not by the repository move', () => {
      for (const [path, text] of [
        [CANONICAL, content],
        [GUIDE, readLF(GUIDE)],
        ['workflows/README.md', readLF('workflows/README.md')],
        ['workflows/shared/squad-install-verifier.mjs', readLF('workflows/shared/squad-install-verifier.mjs')],
      ] as const) {
        expect(text.replace(/\s+/g, ' '), `${path} must not date the identity cutoff by the move`)
          .not.toMatch(/before (?:the (?:repository )?move|Squad moved|the repository moved)|pre-move/i);
      }
    });

    it('requires a final strict compile without --approve', () => {
      // The standalone command must appear as its own line (start-of-line in a
      // fenced bash block), not merely as a prose/backtick mention.  The
      // previous lookahead-only regex was flagged by a reviewer as a false
      // positive: the Anti-Patterns prose "finish with a plain `gh aw compile
      // --strict` (no `--approve`)" also matched it.
      //
      // Anchoring with ^, the `m` (multiline) flag, and allowing only an
      // optional trailing # comment means only real command lines satisfy the
      // pattern.  Lines with --approve (L140, L259, L295) do not match because
      // --approve follows --strict before any #.
      expect(content).toMatch(/^gh aw compile --strict(\s+#[^\n]*)?$/m);
    });

    it('keeps the default workflow token read-only', () => {
      expect(content).toContain('default_workflow_permissions=read');
    });

    it('uses native review authority without reviewer credentials or external services', () => {
      expect(content).toContain('native GitHub Actions/gh-aw runtime identity');
      expect(content).toContain('successful `review` job');
      expect(content).toContain('context-only requirement');
      expect(content).not.toMatch(/SQUAD_REVIEW_APP_|squad-review-authority/);
    });

    it('requires GitHub Issues before installation and stops when they cannot be enabled', () => {
      expect(content).toContain('gh api "repos/${owner_repo}" --jq \'.has_issues\'');
      expect(content).toContain(
        'gh api --method PATCH "repos/${owner_repo}"',
      );
      expect(content).toContain('-F has_issues=true --silent');
      expect(content).toContain('requires repository administration permission');
      expect(content).toContain('STOP before branch creation or `gh aw add`');
      expect(content.indexOf("issues_enabled=")).toBeLessThan(content.indexOf('git switch -c'));
      expect(content.indexOf("issues_enabled=")).toBeLessThan(
        content.indexOf(INSTALL_COMMAND),
      );
    });

    it('keeps the standalone correct example fail-closed', () => {
      const correctExample = content.slice(content.indexOf('### ✓ Correct:'));
      expect(correctExample).toContain('if ! gh api --method PATCH "repos/${owner_repo}"');
      expect(correctExample).toContain(
        'test "$(gh api "repos/${owner_repo}" --jq \'.has_issues\')" = "true" || {',
      );
      expect(correctExample).toContain('exit 1');
    });

    it('forbids blanket staging and mandates explicit paths', () => {
      expect(content).toMatch(/git add \.|git add -A|git commit -a/); // referenced as an anti-pattern
      expect(content).toContain('git add -- .gitattributes .github/aw/ .github/workflows/ .github/skills/');
      expect(content.match(/--verify-staged-install --stage-ownership --source-revision "\$\{SQUAD_SHA\}" \|\| exit 1/g))
        .toHaveLength(2);
      expect(content).toContain('Never force-add a directory or glob');
    });

    it('never auto-merges and defers automatic casting until after the bootstrap PR merges', () => {
      expect(content).toMatch(/auto-?merge/i);
      expect(content).toMatch(/never merge|do not merge|human-reviewed|human approval/i);
      expect(content).toContain('squad-bootstrap');
      expect(content).toContain('[Agentic Research] owner/repo — initial proposals');
    });

    it('pins and verifies the package-capable gh-aw compiler', () => {
      expect(content).toContain('gh_aw_version_output="$(gh aw --version 2>&1)"');
      expect(content).toContain('gh extension remove gh-aw');
      expect(content).toContain('required_gh_aw_version="v0.91.5"');
      expect(content).toContain('gh extension install --pin "${required_gh_aw_version}" github/gh-aw');
      expect(content).toContain('never select a newer release');
      expect(content).toContain('PowerShell');
    });

    it('resolves repo identity at runtime (no hardcoded owner/repo placeholder)', () => {
      expect(content).toContain('gh repo view --json nameWithOwner');
      expect(content).toContain('gh repo view --json defaultBranchRef');
    });

    it('names the bootstrap job\'s own PR-creation fallback branch as the real Cast branch, distinct from the human-run install branch', () => {
      // Regression for a Copilot review finding: this paragraph explains what
      // happens when the *automated* bootstrap workflow's own
      // github.rest.pulls.create call is refused (can_approve_pull_request_reviews
      // false). That fallback always pushes BOOTSTRAP_BRANCH
      // (workflows/shared/squad-bootstrap-validator.mjs), never the branch a
      // human creates by hand in step 2 below (chore/squad-gh-aw-bootstrap).
      // Conflating the two makes the compare URL example wrong and leaves an
      // operator looking at the wrong branch.
      const validatorSource = readLF('workflows/shared/squad-bootstrap-validator.mjs');
      const bootstrapBranchMatch = validatorSource.match(/^export const BOOTSTRAP_BRANCH = '([^']+)';$/m);
      expect(bootstrapBranchMatch, 'BOOTSTRAP_BRANCH constant must exist').not.toBeNull();
      const bootstrapBranch = bootstrapBranchMatch![1];
      expect(bootstrapBranch).toBe('squad/bootstrap-cast');

      const paragraphStart = content.indexOf("With it `false`, the bootstrap job's own");
      const paragraphEnd = content.indexOf('\n\n', paragraphStart);
      expect(paragraphStart, 'fallback-explanation paragraph must exist').toBeGreaterThan(-1);
      const paragraph = content.slice(paragraphStart, paragraphEnd);

      expect(paragraph).toContain(`\`${bootstrapBranch}\` branch`);
      expect(paragraph).toContain(`.../compare/<base>...${bootstrapBranch}?expand=1&title=...`);
      // Mutation guard: the paragraph must not (re-)claim the automated
      // fallback pushes the human's own manual install branch.
      expect(paragraph).not.toContain('pushes the\n`chore/squad-gh-aw-bootstrap` branch');
      expect(paragraph).not.toMatch(/compare\/<base>\.\.\.chore\/squad-gh-aw-bootstrap/);
    });
  });

  describe('gh-aw bootstrap documentation', () => {
    const guide = readLF(GUIDE);
    const agentGuide = readLF(AGENT_GUIDE);
    const versionGate = extractVersionGate(guide);

    it('accepts an existing exact v0.91.5 installation without reinstalling', () => {
      const result = runVersionGate(versionGate, 'v0.91.5', 'v0.91.5');
      expect(result.status).toBe(0);
      expect(result.stderr.match(/^CALL version$/gm)).toHaveLength(1);
      expect(result.stderr).not.toContain('CALL remove');
      expect(result.stderr).not.toContain('CALL install');
    });

    it('captures exact v0.91.5 version output emitted on stderr', () => {
      const result = runVersionGate(versionGate, 'v0.91.5', 'v0.91.5', 'stderr');
      expect(result.status).toBe(0);
      expect(result.stderr.match(/^CALL version$/gm)).toHaveLength(1);
      expect(result.stderr).not.toContain('CALL remove');
      expect(result.stderr).not.toContain('CALL install');
    });

    it('removes pre-existing v0.89.21 and verifies a clean v0.91.5 install', () => {
      const result = runVersionGate(versionGate, 'v0.89.21', 'v0.91.5');
      expect(result.status).toBe(0);
      expect(result.stderr.match(/^CALL version$/gm)).toHaveLength(2);
      expect(result.stderr.match(/^CALL remove$/gm)).toHaveLength(1);
      expect(result.stderr.match(/^CALL install --pin v0\.91\.5$/gm)).toHaveLength(1);
    });

    it('fails closed when a clean reinstall persistently reports v0.89.21', () => {
      const result = runVersionGate(versionGate, 'v0.89.21', 'v0.89.21');
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('required gh-aw v0.91.5, but found v0.89.21');
      expect(result.stderr.match(/^CALL version$/gm)).toHaveLength(2);
      expect(result.stderr.match(/^CALL remove$/gm)).toHaveLength(1);
      expect(result.stderr.match(/^CALL install --pin v0\.91\.5$/gm)).toHaveLength(1);
      expect(guide.indexOf(VERSION_GATE_END)).toBeLessThan(
        guide.indexOf('git switch -c chore/squad-gh-aw-bootstrap'),
      );
      expect(guide.indexOf(VERSION_GATE_END)).toBeLessThan(
        guide.indexOf(INSTALL_COMMAND),
      );
    });

    it('keeps the canonical skill version gate synchronized with the guide', () => {
      expect(extractVersionGate(readLF(CANONICAL))).toBe(versionGate);
    });

    it('checks the staged installation before every bootstrap commit', () => {
      expect(guide.match(/--verify-staged-install --stage-ownership --source-revision "\$\{SQUAD_SHA\}" \|\| exit 1/g))
        .toHaveLength(2);
    });

    it('removes the mutable gh-aw router before verification and permits only the documented staged deletions', () => {
      expect(guide.match(/rm -f \.github\/skills\/agentic-workflows\/SKILL\.md/g))
        .toHaveLength(3);
      const flatGuide = guide.replace(/\s+/g, ' ');
      expect(flatGuide).toContain(
        'The only permitted staged deletions are the exact router deletion above',
      );
      expect(flatGuide).toContain(`the superseded \`${LEGACY_OWNERSHIP}\` ownership record`);
      expect(flatGuide, `${GUIDE} must name every ownership-record deletion the verifier can require`)
        .toContain('and a `.github/aw/packages/*.json` ownership record whose `package` is '
          + `\`${PACKAGE_NAME}\` or \`${LEGACY_PACKAGE_NAME}\` in any letter case, other than `
          + `\`${OWNERSHIP_DESTINATION}\`, the record gh-aw writes for \`${PACKAGE_NAME}\`. Those are the records `
          + 'the verifier tells you to delete');
      expect(flatGuide).toContain('Any other deletion is a hard stop.');
      expect(guide.split(extractDeletionFilter(readLF(CANONICAL), CANONICAL)).length - 1,
        `both ${GUIDE} staging gates must use the ${CANONICAL} deletion filter`).toBe(2);
      expect(guide).toContain('.github/skills/gh-aw-enlistment/SKILL.md');
      expect(agentGuide).toContain('rm -f .github/skills/agentic-workflows/SKILL.md');
    });

    it('advertises only the canonical package identity on every public install surface', () => {
      for (const [path, text] of [
        [GUIDE, guide],
        [AGENT_GUIDE, agentGuide],
        ['README.md', readLF('README.md')],
      ] as const) {
        expect(text, `${path} must install ${PACKAGE_NAME}`).toContain(INSTALL_COMMAND);
        for (const block of fencedBlocks(text)) {
          expect(block, `${path}: no executable block may install the legacy ${LEGACY_PACKAGE_NAME} identity`)
            .not.toContain(LEGACY_INSTALL_PREFIX);
        }
      }
      expect(guide).toContain(`# (${SQUAD_INIT_ACTION}) and nothing else. STOP and`);
      expect(guide).toContain(`- Action: \`${SQUAD_INIT_ACTION}\``);
      expect(guide.replace(/\s+/g, ' '), `${GUIDE} must not offer ${LEGACY_SQUAD_INIT_ACTION} as a referenced name`)
        .not.toContain(`reported as \`${LEGACY_SQUAD_INIT_ACTION}\``);
      expect(guide).toContain(`\`${PACKAGE_NAME}@SHA\` for direct package includes`);
      expect(guide).toContain(`\`${PACKAGE_NAME}/package/<workflow>.md@SHA\` when installing dispatched`);
    });

    it('runs the skill\'s identity gate before every guide and README install command', () => {
      const gate = extractIdentityGate(readLF(CANONICAL));
      expect(extractIdentityGate(guide), 'the guide quick-start gate must match the skill').toBe(gate);
      const readme = readLF('README.md');
      for (const [path, text, copies] of [[GUIDE, guide, 3], ['README.md', readme, 1]] as const) {
        expect(text.split(gate).length - 1, `${path} identity gate copies`).toBe(copies);
        const installs = fencedBlocks(text).filter(block => block.includes(INSTALL_COMMAND));
        expect(installs, `${path} install blocks`).toHaveLength(copies);
        for (const block of installs) {
          expect(block.indexOf(gate), `${path}: every install block must run the identity gate`).toBeGreaterThan(-1);
          expect(block.indexOf(gate), `${path}: the identity gate must precede gh aw add`)
            .toBeLessThan(block.indexOf(INSTALL_COMMAND));
        }
      }
    });

    it('states which revisions verify the canonical identity on every install surface', () => {
      for (const [path, text] of [
        [GUIDE, guide],
        [AGENT_GUIDE, agentGuide],
        ['README.md', readLF('README.md')],
        ['workflows/README.md', readLF('workflows/README.md')],
      ] as const) {
        const flat = text.replace(/\s+/g, ' ');
        expect(flat, `${path} must state the manifest cutoff`).toContain(MANIFEST_RULE);
        expect(flat, `${path} must say why older revisions are not installed`).toMatch(
          /downloads? the Squad CLI from the separately controlled `bradygaster\/squad` fork, which has no releases/,
        );
        expect(flat, `${path} must route older revisions to a ${PACKAGE_NAME} revision`).toMatch(
          new RegExp(`declares \`${PACKAGE_NAME}\`, or ask the (?:Squad )?maintainers for one\\.`),
        );
      }
    });

    it('requires agents to execute the complete quick start through PR creation', () => {
      expect(guide).toContain('**Agent action required:**');
      expect(guide).toContain('the agent must execute this entire block');
      expect(guide).toContain('gh pr create');
      expect(agentGuide).toContain('execute the complete');
      expect(agentGuide).toContain('Do not only quote or run the `gh aw add` command');
    });

    it('resolves the repository dynamically before changing Actions permissions', () => {
      expect(guide).toContain(
        'owner_repo="$(gh repo view --json nameWithOwner --jq \'.nameWithOwner\')"',
      );
      expect(guide).toContain(
        'gh api --method PUT "repos/${owner_repo}/actions/permissions/workflow"',
      );
      expect(guide).not.toContain('repos/{owner}/{repo}/actions/permissions/workflow');
    });

    it('requires Issues before installation and documents the admin-permission stop', () => {
      const issuesCheck = guide.indexOf(
        'issues_enabled="$(gh api "repos/${owner_repo}" --jq \'.has_issues\')"',
      );
      expect(issuesCheck).toBeGreaterThan(-1);
      expect(guide).toContain('-F has_issues=true --silent');
      expect(guide).toContain('requires repository administration permission');
      expect(guide).toContain('do not continue to `gh aw add`');
      expect(issuesCheck).toBeLessThan(guide.indexOf('git switch -c chore/squad-gh-aw-bootstrap'));
      expect(issuesCheck).toBeLessThan(
        guide.indexOf(INSTALL_COMMAND),
      );
      expect(agentGuide).toContain('verifies that GitHub Issues are enabled');
      expect(agentGuide).toContain('bootstrap creates a research/proposals issue');
    });

    it('keeps standalone public install snippets behind the Issues guard', () => {
      const readme = readLF('README.md');
      const readmeInstall = readme.slice(readme.indexOf('### Install'));
      expect(readmeInstall.indexOf("issues_enabled=")).toBeGreaterThan(-1);
      expect(readmeInstall.indexOf("issues_enabled=")).toBeLessThan(
        readmeInstall.indexOf(INSTALL_COMMAND),
      );
      expect(readmeInstall).toContain(
        'test "$(gh api "repos/${owner_repo}" --jq \'.has_issues\')" = "true" || {',
      );

      const setupSection = guide.slice(
        guide.indexOf('### Enable GitHub Issues'),
        guide.indexOf('### Set Actions pull-request permissions (Profile A, recommended)'),
      );
      expect(setupSection).toContain(
        'test "$(gh api "repos/${owner_repo}" --jq \'.has_issues\')" = "true" || {',
      );
    });

    it('activates slash commands only after the bootstrap PR reaches the default branch', () => {
      expect(guide).toContain(
        'Once the bootstrap PR is merged into the default branch, the `/squad` slash',
      );
      expect(guide).toContain('Pushing the bootstrap branch or merely opening the');
      expect(guide).not.toContain('Once pushed, the `/squad` slash command is live');
      expect(agentGuide).toContain(
        '`/squad` slash commands become active only after that merge reaches',
      );
    });

    it('documents the native required review job without a credential prerequisite', () => {
      const flatGuide = guide.replace(/\s+/g, ' ');
      expect(flatGuide).toContain('stable required status context `Squad Review / review`');
      expect(guide).toContain('No custom Checks API publisher');
      expect(flatGuide).toContain('same-name source-identity question');
      expect(flatGuide).toContain('context-only `Squad Review / review` requirement is advisory');
      expect(agentGuide).toContain('requires no separate PAT');
      expect(guide).not.toMatch(/SQUAD_REVIEW_APP_|squad-review-authority/);
      expect(agentGuide).not.toMatch(/SQUAD_REVIEW_APP_|squad-review-authority/);
    });

    it('makes public-guide package verification fail fast and coherent', () => {
      expect(guide).toContain(INSTALL_COMMAND);
      expect(guide).toContain('squad-install-verifier.mjs --materialize-runtime');
      expect(guide).toContain('--verify-install');
      expect(guide).toContain('--source-revision "${SQUAD_SHA}"');
      expect(guide).toContain('--strict-compile');
      expect(guide).toContain('package ownership metadata');
      const upgrade = guide.slice(guide.indexOf('## Upgrading'));
      const add = upgrade.indexOf(`${INSTALL_COMMAND} --force`);
      const cleanup = upgrade.indexOf('rm -f .github/skills/agentic-workflows/SKILL.md');
      const legacyCleanup = upgrade.indexOf(`rm -f ${LEGACY_OWNERSHIP}\n`);
      const compile = upgrade.indexOf('gh aw compile --strict');
      const verify = upgrade.indexOf('squad-install-verifier.mjs \\\n  --verify-install');
      expect(add).toBeGreaterThan(-1);
      expect(cleanup).toBeGreaterThan(add);
      expect(legacyCleanup, `Upgrading must delete the superseded ${LEGACY_OWNERSHIP}`).toBeGreaterThan(add);
      expect(compile).toBeGreaterThan(cleanup);
      expect(compile).toBeGreaterThan(legacyCleanup);
      expect(verify).toBeGreaterThan(compile);
      const flatUpgrade = upgrade.replace(/\s+/g, ' ');
      expect(flatUpgrade).toContain('the verifier fails closed while both records exist');
      expect(flatUpgrade).toContain(
        `action \`${SQUAD_INIT_ACTION}\` added and \`bradygaster/squad/.github/actions/squad-init\` removed.`,
      );
      const gate = extractIdentityGate(readLF(CANONICAL));
      expect(upgrade.indexOf(gate), 'Upgrading must run the identity gate').toBeGreaterThan(-1);
      expect(upgrade.indexOf(gate), 'Upgrading must check the identity before reinstalling').toBeLessThan(add);
      expect(flatUpgrade, 'Upgrading must say why a legacy-identity installation has to move').toContain(
        'Those revisions download the Squad CLI from the separately controlled `bradygaster/squad` fork, which has '
        + 'no releases, so move such an installation with the block above.',
      );
      expect(flatUpgrade, 'Upgrading must accept the legacy identity only while an installation moves').toContain(
        `Verifiers of revisions that declare \`${PACKAGE_NAME}\` still accept the legacy identity, so an existing `
        + 'installation keeps verifying while it moves, and they print a notice that says to move it.',
      );
      expect(flatUpgrade, 'Upgrading must say a failed reinstall removes nothing')
        .toContain('If the forced reinstall fails, the block stops before it removes anything.');
      expect(flatUpgrade, 'Upgrading must route the migration warnings to the strict compile allowlist').toContain(
        'Until the upgrade is committed, every strict compile repeats that change as four warnings; accept them '
        + 'only through the legacy-identity migration allowlist in '
        + '[Strictly compile the installed workflows](#strictly-compile-the-installed-workflows).',
      );
      expect(guide, 'the linked strict compile section must exist').toContain('\n### Strictly compile the installed workflows\n');
    });
  });

  describe('template mirror parity', () => {
    for (const mirror of MIRRORS) {
      it(`${mirror} is byte-for-byte identical to the canonical source`, () => {
        expect(existsSync(resolve(ROOT, mirror)), `${mirror} should exist`).toBe(true);
        expect(readFileSync(resolve(ROOT, mirror)).equals(readFileSync(resolve(ROOT, CANONICAL)))).toBe(true);
      });
    }
  });
});
