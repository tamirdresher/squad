/**
 * User-facing links to the Squad repository.
 *
 * Squad moved from bradygaster/squad to github/squad. These tests pin the
 * repository links the CLI and SDK print at runtime, and the repository
 * references in the canonical templates that `squad init` ships, so a stale
 * owner (or a link to a doc that no longer exists) fails here instead of
 * reaching users. Sources are imported directly so no build is needed.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkForUpdate, setVersionFetcher } from '../packages/squad-cli/src/cli/upgrade.js';
import { runInit } from '../packages/squad-cli/src/cli/core/init.js';
import { initSquad, getSDKTemplatesDir, MANIFEST_SKILL_NAMES } from '../packages/squad-sdk/src/config/init.js';
import { FSStorageProvider } from '../packages/squad-sdk/src/storage/fs-storage-provider.js';
import { resolveStateBackend, _resetGitNotesMigrationWarnForTesting } from '../packages/squad-sdk/src/state-backend.js';
import type { StateBackendType } from '../packages/squad-sdk/src/state-backend.js';

const REPO_URL = 'https://github.com/github/squad';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const stripAnsi = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, '');

const scratchDirs: string[] = [];
function scratchDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  scratchDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const dir of scratchDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('CLI runtime links', () => {
  it('checkForUpdate links the release notes on github/squad', async () => {
    setVersionFetcher(async () => '2.0.0');

    const info = await checkForUpdate('1.0.0');

    expect(info?.releaseUrl).toBe(`${REPO_URL}/releases/tag/v2.0.0`);
  });

  it('the .ai-team/ deprecation notice links issue #101 on github/squad', { timeout: 60_000 }, async () => {
    // A pre-.squad/ project keeps its team in .ai-team/.
    const dest = scratchDir('squad-legacy-link-');
    mkdirSync(join(dest, '.ai-team'));
    writeFileSync(join(dest, '.ai-team', 'team.md'), '# Team\n');
    vi.stubEnv('SQUAD_HOME_DIR_OVERRIDE', scratchDir('squad-legacy-link-home-'));
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logged.push(stripAnsi(args.map(String).join(' ')));
    });

    await runInit(dest);

    const details = logged.filter((line) => line.includes('Details:')).map((line) => line.trim());
    expect(details.length, 'runInit printed no .ai-team/ deprecation details line').toBeGreaterThan(0);
    for (const line of details) expect(line).toBe(`Details: ${REPO_URL}/issues/101`);
  });
});

describe('SDK runtime links', () => {
  it('the skill-template drift error asks users to report it on github/squad', async () => {
    const templatesDir = getSDKTemplatesDir();
    expect(templatesDir, 'SDK templates directory not found').toBeTruthy();
    const hiddenSkill = resolve(templatesDir!, 'skills', MANIFEST_SKILL_NAMES[0]);
    // Hide one manifest skill so initSquad takes its packaging-drift path.
    class HiddenSkillStorage extends FSStorageProvider {
      override existsSync(filePath: string): boolean {
        return resolve(filePath) === hiddenSkill ? false : super.existsSync(filePath);
      }
    }

    const error = await initSquad(
      {
        teamRoot: scratchDir('squad-drift-link-'),
        projectName: 'drift-link',
        agents: [{ name: 'edie', role: 'Engineer' }],
        configFormat: 'markdown',
      },
      new HiddenSkillStorage(),
    ).then(() => undefined, (err: unknown) => err);

    expect(error, 'initSquad did not fail on the hidden manifest skill').toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain(`missing from the SDK templates dir`);
    expect(message).toContain(MANIFEST_SKILL_NAMES[0]);
    expect(message).toContain(`please report it at ${REPO_URL}/issues.`);
  });

  it('the git-notes deprecation warning links a state-backends doc that exists on dev', () => {
    _resetGitNotesMigrationWarnForTesting();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const repoRoot = scratchDir('squad-git-notes-link-');
    const squadDir = join(repoRoot, '.squad');
    mkdirSync(squadDir);

    resolveStateBackend(squadDir, repoRoot, 'git-notes' as StateBackendType);

    const warning = warn.mock.calls.map((call) => String(call[0])).find((msg) => msg.includes("'git-notes' is deprecated"));
    expect(warning, 'resolveStateBackend printed no git-notes deprecation warning').toBeDefined();
    const links = warning!.match(/https:\/\/\S+/g) ?? [];
    expect(links, 'expected exactly one link in the git-notes warning').toHaveLength(1);
    const prefix = `${REPO_URL}/blob/dev/`;
    expect(links[0].startsWith(prefix), `git-notes warning links outside ${prefix}: ${links[0]}`).toBe(true);
    const docPath = links[0].slice(prefix.length);
    expect(existsSync(join(REPO_ROOT, docPath)), `git-notes warning links a doc that is not in this checkout: ${docPath}`).toBe(true);
  });
});

describe('canonical templates shipped by squad init', () => {
  // Repository-location forms only: web URLs, REST paths, and `gh --repo`.
  // `bradygaster/squad#NNN` provenance, the @bradygaster npm scope, and
  // @bradygaster as a person are intentionally allowed.
  const OLD_REPO_LOCATION = /github\.com\/bradygaster\/squad\b|repos\/bradygaster\/squad\b|--repo[ =]bradygaster\/squad\b/;
  // gh-aw-enlistment's package identity moves with the gh-aw install verifier.
  const SEPARATELY_MIGRATED = '.squad-templates/skills/gh-aw-enlistment/';

  it('point repository links at github/squad', () => {
    const files = globSync('.squad-templates/**/*', { cwd: REPO_ROOT })
      .map((file) => file.replace(/\\/g, '/'))
      .filter((file) => !file.startsWith(SEPARATELY_MIGRATED) && statSync(join(REPO_ROOT, file)).isFile());
    expect(files.length, 'no canonical templates found').toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      readFileSync(join(REPO_ROOT, file), 'utf8').split(/\r?\n/).forEach((line, index) => {
        if (OLD_REPO_LOCATION.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders, 'templates still point at bradygaster/squad').toEqual([]);
  });

  it('github-multi-account binds no specific account and matches the repo copy', () => {
    const read = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8').replace(/\r\n/g, '\n');
    const template = read('.squad-templates/skills/github-multi-account/SKILL.md');

    const offenders = template.split('\n').flatMap((line, index) => {
      const switchUser = /gh auth switch --user (\S+)/.exec(line)?.[1];
      const hardcodedSwitch = switchUser !== undefined && !/^(\$\w+|THEIR_(PERSONAL|WORK)_USERNAME)$/.test(switchUser);
      return hardcodedSwitch || /\bbradyg(aster|_microsoft)\b/.test(line) ? [`${index + 1}: ${line.trim()}`] : [];
    });
    expect(offenders, 'github-multi-account hardcodes a GitHub account').toEqual([]);

    expect(read('.copilot/skills/github-multi-account/SKILL.md'), '.copilot/skills/github-multi-account/SKILL.md must match the shipped template').toBe(template);
  });
});
