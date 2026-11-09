import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { requirePosixShell } from './posix-shell';

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8').replace(/\r\n/g, '\n');
}

const source = read('workflows/shared/squad.md');
const approved = JSON.parse(read('test/fixtures/squad-init-approved.json'));
const revision = '5c662ba015ec4f99befa51b0e8ca4f2148b0497f';
const actionPath = '.github/actions/squad-init/action.yml';
const installerPath = 'scripts/install.sh';
const action = parse(approved.files[actionPath].content);

/** A squad-init input as the runner resolves it for the activation step: its `with:` value, else the action default. */
function activationInput(name: string): string {
  const frontmatter = parse(source.slice('---\n'.length, source.indexOf('\n---\n', '---\n'.length)));
  const steps = frontmatter.jobs.activation.steps.filter(
    (step: { uses?: string }) => step.uses === `github/squad/.github/actions/squad-init@${revision}`,
  );
  expect(steps, `workflows/shared/squad.md activation steps using squad-init@${revision}`).toHaveLength(1);
  return String(steps[0].with?.[name] ?? action.inputs[name].default);
}

/**
 * Every `uses: <owner>/<repo>/.github/actions/squad-init@<ref>` step in tracked docs, skills, templates,
 * workflows and YAML comments, with the `repository` its `with:` block passes.
 */
function squadInitExamples(): { where: string; repository: string | null }[] {
  const tracked = spawnSync('git', ['ls-files', '-z', '--', '*.md', '*.mdx', '*.yml', '*.yaml'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  expect(tracked.status, `git ls-files: ${tracked.stderr}`).toBe(0);
  const examples: { where: string; repository: string | null }[] = [];
  for (const path of tracked.stdout.split('\0').filter(path => path && !path.startsWith('test/'))) {
    const lines = read(path).split('\n');
    lines.forEach((line, index) => {
      const uses = /^(\s*#?)\s*(?:-\s+)?uses:\s*['"]?[\w.-]+\/[\w.-]+\/\.github\/actions\/squad-init@/.exec(line);
      if (!uses) return;
      // An example inside YAML comments keeps the same `#` prefix on every line.
      const comment = uses[1].endsWith('#') ? uses[1] : '';
      const body = (text: string) => (text.startsWith(comment) ? text.slice(comment.length) : null);
      const keyColumn = body(line)!.indexOf('uses:');
      let inWith = false;
      let repository: string | null = null;
      for (const next of lines.slice(index + 1)) {
        const text = body(next);
        if (text === null || !text.trim() || text.trim().startsWith('```')) break;
        const column = text.search(/\S/);
        if (column < keyColumn) break;
        if (column === keyColumn) {
          inWith = /^with:\s*(?:#.*)?$/.test(text.trim());
          continue;
        }
        const value = inWith ? /^repository:\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/.exec(text.trim()) : null;
        if (value) repository = value[1];
      }
      examples.push({ where: `${path}:${index + 1}`, repository });
    });
  }
  return examples;
}

function pinnedInstallShell(platform: NodeJS.Platform = process.platform): string {
  const install = action.runs.steps.find((step: { id?: string }) => step.id === 'install');
  expect(install).toBeDefined();
  expect(install.shell).toBe('bash');
  return platform === 'win32' ? requirePosixShell() : install.shell;
}

function runPinnedInstall(mode: string) {
  const scratch = mkdtempSync(join(process.cwd(), '.squad-pinned-install-'));
  try {
    const write = (path: string, content: string) => {
      writeFileSync(join(scratch, path), content, { mode: 0o755 });
    };
    for (const path of ['action/.github/actions/squad-init', 'action/scripts', 'mock-bin', 'downloads', 'prefix/lib/squad']) {
      mkdirSync(join(scratch, path), { recursive: true });
    }
    write('action/scripts/install.sh', approved.files[installerPath].content);
    write('prefix/lib/squad/existing', 'preserve the installed CLI on verification failure');
    write('mock-bin/uname', '#!/bin/sh\ncase "$1" in -s) echo Linux;; -m) echo x86_64;; *) exit 99;; esac\n');
    write('mock-bin/npm', '#!/bin/sh\nexit 99\n');
    const digest = createHash('sha256').update('release archive').digest('hex');
    write('mock-bin/curl', `#!/bin/sh
set -eu
url="$2"
printf '%s\\n' "$url" >> "$PWD/fetches"
case "$url" in
  https://api.github.com/repos/github/squad/releases/latest)
    printf '{"tag_name":"v1.0.0"}\\n';;
  https://github.com/github/squad/releases/download/v1.0.0/squad-linux-x64.tar.gz)
    printf 'release archive' > "$4";;
  https://github.com/github/squad/releases/download/v1.0.0/SHA256SUMS.txt)
    case "$TEST_MODE" in
      download-failure) exit 22;;
      missing) printf '${digest}  squad-darwin-arm64.tar.gz\\n' > "$4";;
      duplicate) printf '${digest}  squad-linux-x64.tar.gz\\n${digest}  squad-linux-x64.tar.gz\\n' > "$4";;
      malformed) printf 'not-a-digest  squad-linux-x64.tar.gz\\n' > "$4";;
      mismatch) printf '${'0'.repeat(64)}  squad-linux-x64.tar.gz\\n' > "$4";;
      valid) printf '${digest}  squad-linux-x64.tar.gz\\n' > "$4";;
      *) exit 99;;
    esac;;
  *) echo "Unexpected network request: $url" >&2; exit 99;;
esac
`);
    write('mock-bin/tar', `#!/bin/sh
set -eu
printf 'extracted\\n' >> "$PWD/extractions"
mkdir -p "$4/squad-linux-x64"
printf '#!/bin/sh\\necho 1.0.0\\n' > "$4/squad-linux-x64/squad"
chmod +x "$4/squad-linux-x64/squad"
`);
    const install = action.runs.steps.find((step: { id?: string }) => step.id === 'install');
    expect(install).toBeDefined();
    const result = spawnSync(pinnedInstallShell(), ['--noprofile', '--norc', '-c', `
export PATH="$PWD/mock-bin:$PATH"
export TMPDIR="$PWD/downloads"
export ACTION_PATH="$PWD/action/.github/actions/squad-init"
export INPUT_PREFIX="$PWD/prefix"
export GITHUB_PATH="$PWD/github-path"
export GITHUB_OUTPUT="$PWD/github-output"
${install.run}
`], {
      cwd: scratch,
      env: {
        ...process.env,
        INPUT_VERSION: activationInput('version'),
        INPUT_REPO: activationInput('repository'),
        TEST_MODE: mode,
      },
      encoding: 'utf8',
      timeout: 60_000,
    });
    if (result.error) throw result.error;
    if (!existsSync(join(scratch, 'fetches'))) {
      throw new Error(
        `Pinned action harness stopped before its first download (status=${result.status}, signal=${result.signal}).\n`
        + `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    }
    return {
      status: result.status,
      output: result.stdout + result.stderr,
      extracted: existsSync(join(scratch, 'extractions')),
      preserved: existsSync(join(scratch, 'prefix/lib/squad/existing')),
      fetches: readFileSync(join(scratch, 'fetches'), 'utf8'),
      outputs: existsSync(join(scratch, 'github-output'))
        ? readFileSync(join(scratch, 'github-output'), 'utf8') : '',
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

describe('Squad standalone activation latest-release default', () => {
  it('delegates release selection to the immutable action without an override', () => {
    const install = source.match(
      /- name: Install Squad CLI from standalone release[\s\S]*?(?=\n\s+- name:)/,
    )?.[0];

    expect(install, 'workflows/shared/squad.md must retain the standalone install step').toBeDefined();
    expect(install).toContain(
      `uses: github/squad/.github/actions/squad-init@${revision}`,
    );
    expect(install).toContain("skip-init: 'true'");
    expect(install, 'workflows/shared/squad.md must use the action default, not a version input')
      .not.toMatch(/^\s+version:/m);
    expect(source, 'workflows/shared/squad.md must not resolve a workflow-level CLI override')
      .not.toContain('squad-release');
    expect(source).not.toContain('vars.SQUAD_CLI_VERSION');
    expect(source).not.toMatch(/\bnpm (?:install|ci|view)\b/);
    expect(source).toContain('SQUAD_CLI_VERSION: ${{ steps.squad-cli.outputs.version }}');
    expect(source).toContain('squad health --json');
  });

  it('binds the exact independently retrieved action and installer to the activation pin', () => {
    expect(approved.repository).toBe('github/squad');
    expect(approved.revision).toBe(revision);
    const digests = {
      [actionPath]: 'c759c5425c710db59a1a33f4a59f53117a2f2e25c1f0df4e41f27507afd82aa8',
      [installerPath]: '35713fde7941b64d4e46fb04fbf7dc16d5df9e4d03609f7de86154525c533723',
    };
    for (const [path, digest] of Object.entries(digests)) {
      const file = approved.files[path];
      const bytes = Buffer.from(file.content);
      expect(file.sha256).toBe(digest);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(digest);
      expect(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'))
        .toBe(file.gitBlob);
    }

    expect(action.inputs.version.default).toBe('latest');
    expect(pinnedInstallShell('linux')).toBe('bash');
    expect(pinnedInstallShell('darwin')).toBe('bash');
    expect(action.outputs.version.value).toBe('${{ steps.install.outputs.version }}');
    expect(action.runs.steps.find((step: { id?: string }) => step.id === 'install').run)
      .toContain('installer="${repo_root}/scripts/install.sh"');
  });

  it('passes repository explicitly because the pinned action still defaults to the superseded owner', () => {
    expect(action.inputs.repository.default, `squad-init@${revision} repository default`).toBe('bradygaster/squad');
    expect(
      activationInput('repository'),
      `workflows/shared/squad.md must pass repository to squad-init@${revision}, whose default is bradygaster/squad`,
    ).toBe('github/squad');
  });

  it('passes repository: github/squad in every squad-init example a reader could pin to an older revision', () => {
    const examples = squadInitExamples();
    expect([...new Set(examples.map(({ where }) => where.replace(/:\d+$/, '')))], 'files with squad-init examples')
      .toEqual(expect.arrayContaining([
        '.github/actions/squad-init/action.yml',
        'docs/src/content/docs/features/standalone-install.md',
        'workflows/shared/squad.md',
      ]));
    expect(
      examples.filter(({ repository }) => repository !== 'github/squad')
        .map(({ where, repository }) => `${where}: repository ${repository ?? 'not passed'}`),
      `squad-init examples without repository: github/squad; squad-init@${revision} defaults it to `
        + `${action.inputs.repository.default}`,
    ).toEqual([]);
  });

  it('executes the pinned action latest default with a verified platform archive', () => {
    const result = runPinnedInstall('valid');
    expect(
      result.fetches.trim().split('\n'),
      `squad-init@${revision} downloads with workflows/shared/squad.md inputs `
        + `(repository=${activationInput('repository')}, version=${activationInput('version')})`,
    ).toEqual([
      'https://api.github.com/repos/github/squad/releases/latest',
      'https://github.com/github/squad/releases/download/v1.0.0/squad-linux-x64.tar.gz',
      'https://github.com/github/squad/releases/download/v1.0.0/SHA256SUMS.txt',
    ]);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain('Checksum verified');
    expect(result.extracted).toBe(true);
    expect(result.outputs).toContain('version=1.0.0');
  }, 65_000);

  it('reports premature action failure before reading the download trace', () => {
    const install = action.runs.steps.find((step: { id?: string }) => step.id === 'install');
    const original = install.run;
    try {
      install.run = 'printf "harness setup failed\\n" >&2\nexit 2';
      expect(() => runPinnedInstall('valid')).toThrow(
        /before its first download \(status=2, signal=null\)[\s\S]*stderr:\nharness setup failed/,
      );
    } finally {
      install.run = original;
    }
  }, 65_000);

  it.each([
    ['download-failure', 'Checksum download failed'],
    ['missing', 'Expected exactly one checksum entry'],
    ['duplicate', 'Expected exactly one checksum entry'],
    ['malformed', 'not a 64-character SHA-256 digest'],
    ['mismatch', 'Checksum mismatch'],
  ])('fails closed in the pinned action on %s', (mode, diagnostic) => {
    const result = runPinnedInstall(mode);
    expect(result.status, result.output).toBe(1);
    expect(result.output).toContain(diagnostic);
    expect(result.extracted).toBe(false);
    expect(result.preserved).toBe(true);
    expect(result.outputs).toBe('');
  }, 65_000);

  it('does not leave automation that requires or reintroduces the removed CLI pin', () => {
    const publish = parse(read('.github/workflows/squad-npm-publish.yml'));

    expect(publish.jobs, 'squad-npm-publish.yml must not rewrite the latest-default activation')
      .not.toHaveProperty('bump-activation-pin');
    for (const path of [
      '.github/workflows/squad-cli-pin-drift.yml',
      'scripts/bump-activation-pin.mjs',
    ]) {
      expect(existsSync(join(process.cwd(), path)), `${path} requires the obsolete CLI literal`).toBe(false);
    }
  });

  it('documents latest CLI releases separately from immutable workflow source pins', () => {
    const docs = read('docs/src/content/docs/guide/gh-aw.md');

    expect(docs).not.toContain('`SQUAD_CLI_VERSION`');
    expect(docs).toContain('latest stable GitHub Release');
    expect(docs).toContain('checksum verification');
    expect(docs).toContain('SQUAD_SHA');
  });
});
