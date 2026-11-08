/**
 * Docs site location contract.
 *
 * The repository moved from bradygaster/squad to github/squad. GitHub Pages does not redirect
 * after a transfer, so the old project site returns 404 and the docs are served from
 * https://github.github.com/squad/. GitHub does redirect the old repository URLs, but current
 * docs, samples, READMEs and contributor guides name github/squad. Only the historical records
 * in HISTORICAL_REPO_LINKS keep their old repository links as written.
 *
 * This module is the single source of truth for both guards: test/docs-site-location.test.ts
 * (root vitest, runs in CI) and the "docs site location" suite in
 * docs/tests/astro-features.test.mjs (`node --test` in docs/). It uses Node built-ins only.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SITE = 'https://github.github.com';
export const BASE = '/squad/';
export const REPO_URL = 'https://github.com/github/squad';

/** Settings that place the site. Each `pattern` captures the value and has the `d` flag for line numbers. */
export const SITE_SETTINGS = [
  {
    name: 'Astro site',
    file: 'docs/astro.config.mjs',
    pattern: /^[ \t]*site:[ \t]*['"`]([^'"`]*)['"`]/dm,
    expected: SITE,
  },
  {
    name: 'Astro base',
    file: 'docs/astro.config.mjs',
    pattern: /^[ \t]*base:[ \t]*['"`]([^'"`]*)['"`]/dm,
    expected: BASE,
  },
  {
    name: 'RSS site fallback',
    file: 'docs/src/pages/rss.xml.js',
    pattern: /context\.site\s*\?\?\s*['"`]([^'"`]*)['"`]/d,
    expected: `${SITE}${BASE}`,
  },
  {
    name: 'robots.txt Sitemap',
    file: 'docs/public/robots.txt',
    pattern: /^Sitemap:[ \t]*(\S+)/dm,
    expected: `${SITE}${BASE}sitemap-index.xml`,
  },
  {
    name: '"Edit this page" URL',
    file: 'docs/src/layouts/DocsLayout.astro',
    pattern: /const editUrl\s*=\s*currentSlug\s*\?\s*`([^`]*)`/d,
    expected: `${REPO_URL}/edit/dev/docs/src/content/docs/\${currentSlug}.md`,
  },
];

/**
 * A link to the retired project site: `//bradygaster.github.io/squad`, with or without a scheme,
 * in any case. `/squad` must end at a path boundary, so `/squadcaster/` is another site. The
 * implementation-provenance schema ID (`/squad/schemas/implementation-provenance/v1`) is an
 * identifier, not a link, so it is exempt, but only where the version ends the URL. That means
 * the version is followed by the end of the line, whitespace, one of ) " ' ` < > ], or a `#`
 * fragment, which points into the same schema. A `.` counts only as a sentence end, followed by
 * whitespace or the end of the line. Paths below the ID, dotted suffixes such as `v1.json` and
 * queries such as `v1?format=json` are links.
 */
export const RETIRED_SITE_LINK =
  /(?:https?:)?\/\/bradygaster\.github\.io\/squad(?![\w-])(?!\/schemas\/implementation-provenance\/v\d+(?:[\s)"'`<>\]#]|\.(?:\s|$)|$))[^\s)"'`<>\]]*/gi;

/**
 * A reference to the old repository location, in any case. This covers web and raw file URLs
 * (`github.com/bradygaster/squad`, `raw.githubusercontent.com/bradygaster/squad`), the SSH remote
 * (`git@github.com:bradygaster/squad`), REST paths (`repos/bradygaster/squad`) and the gh
 * `--repo` flag. The name must end at a boundary, so other repositories such as
 * `bradygaster/squad-cli` do not match. The `@bradygaster/` npm scope and `bradygaster/squad#NNN`
 * work references are not repository locations.
 */
export const OLD_REPO_LINK =
  /(?:(?<![\w.-])(?:github\.com[/:]|raw\.githubusercontent\.com\/|repos\/)|(?<![\w-])--repo[ =])bradygaster\/squad(?![\w-])[^\s)"'`<>\]]*/gi;

/** The files the migration covers: docs, samples, READMEs, contributor guides and the PR skill. */
export const SCANNED_PATHS = [
  'docs',
  'samples',
  'README.md',
  'README.zh.md',
  'CONTRIBUTING.md',
  'CONTRIBUTORS.md',
  'SUPPORT.md',
  'packages/squad-cli/README.md',
  'packages/squad-sdk/README.md',
  '.copilot/skills/pr-lifecycle/SKILL.md',
];

/** A numbered pull request, issue or discussion, or a commit: a record of where something happened. */
const PERMALINK = /^github\.com\/bradygaster\/squad\/(?:(?:pull|issues|discussions)\/\d+|commit\/[0-9a-f]{7,40})(?![\w-])/i;

/**
 * Historical records that keep their old repository links as written. Everything else in the
 * scanned files must name github/squad. A `path` ending in `/` covers a directory. An entry can
 * narrow what it keeps:
 *  - `links`: only links matching this (non-global) pattern are history;
 *  - `section`: only the lines from the `from` marker through the `to` marker (or the end of the
 *    file) are history. If a marker is missing, nothing in the file is exempt.
 * Add an entry only for a record of the past, never for a current instruction or link.
 */
export const HISTORICAL_REPO_LINKS = [
  {
    path: 'docs/src/content/blog/',
    reason: 'Blog posts are dated narrative and stay as published.',
  },
  {
    path: 'docs/src/content/docs/whatsnew.md',
    reason: 'Release notes for v1.1.0 and earlier are release history; the current 2.0 notes are documentation.',
    section: { from: /^## v1\.1\.0\b/ },
  },
  {
    path: 'docs/src/content/docs/guide/contributors.md',
    reason: 'Contributor credits cite the pull requests, issues and discussions where the work happened.',
    links: PERMALINK,
  },
  {
    path: 'docs/specification/',
    reason: 'Working-draft provenance cites the pull requests, issue and commit each draft came from; the Charter text is pinned by SHA-256.',
    links: PERMALINK,
  },
  {
    path: 'docs/src/content/docs/scenarios/upgrading.md',
    reason: 'The generated upgrade matrix records the CI runs and GitHub Releases behind its results (rendered from test-fixtures/spec/suite-v0.2/upgrade-matrix.json).',
    section: { from: /^<!-- UPGRADE-MATRIX:START -->/, to: /^<!-- UPGRADE-MATRIX:END -->/ },
  },
  {
    path: 'docs/_internal/launch/migration-announcement.md',
    reason: 'Launch announcement from when Squad first went public.',
  },
  {
    path: 'docs/_internal/prd-cli-polish.md',
    reason: 'Product requirements that quote the CLI banner text as it was proposed.',
  },
  {
    path: 'docs/_internal/proposals/fixed-input-box-design.md',
    reason: 'Design proposal with a mock-up of the CLI banner as it was proposed.',
  },
];

/** Tracked files under SCANNED_PATHS, repo-relative with `/`, except Astro's generated `.astro/` types. */
export function scannedFiles(root = REPO_ROOT) {
  let listed;
  try {
    listed = execFileSync('git', ['ls-files', '-z', '--', ...SCANNED_PATHS], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(`The docs site location guard lists tracked files with git; run it in a git checkout. ${error.message}`);
  }
  return listed
    .split('\0')
    .filter((path) => path && !path.split('/').includes('.astro'))
    .sort();
}

/** The scanned files as text, without binaries and tracked files missing from the working tree. */
export function readScannedFiles(root = REPO_ROOT) {
  const files = [];
  for (const path of scannedFiles(root)) {
    const absolute = join(root, path);
    let bytes;
    try {
      if (!statSync(absolute).isFile()) continue;
      bytes = readFileSync(absolute);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (bytes.includes(0)) continue;
    files.push({ path, text: bytes.toString('utf8') });
  }
  return files;
}

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** The value `setting.pattern` captures in `setting.file`, and the `file:line` it was read from. */
export function readSetting(setting, root = REPO_ROOT) {
  const text = readFileSync(join(root, setting.file), 'utf8');
  const match = setting.pattern.exec(text);
  if (!match) return { value: undefined, at: `${setting.file} (setting not found)` };
  const start = match.indices?.[1]?.[0] ?? match.index;
  return { value: match[1], at: `${setting.file}:${lineAt(text, start)}` };
}

/** `path:line: link` for every match of the global `pattern` in `files` ({ path, text }[]). */
export function findLinks(files, pattern) {
  const found = [];
  for (const { path, text } of files) {
    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(pattern)) found.push(`${path}:${index + 1}: ${match[0]}`);
    });
  }
  return found;
}

function covers(entry, path) {
  return entry.path.endsWith('/') ? path.startsWith(entry.path) : path === entry.path;
}

/** The 0-based [first, last] lines `entry` treats as history, or undefined if a marker is missing. */
function historyLines(entry, lines) {
  if (!entry.section) return [0, lines.length - 1];
  const first = lines.findIndex((line) => entry.section.from.test(line));
  if (first === -1) return undefined;
  if (!entry.section.to) return [first, lines.length - 1];
  const last = lines.findIndex((line, index) => index > first && entry.section.to.test(line));
  return last === -1 ? undefined : [first, last];
}

/**
 * Old repository links in `files`, split into `offenders` (`path:line: link`) and `kept`, the
 * links each `historical` entry keeps as history.
 */
export function scanOldRepoLinks(files, historical = HISTORICAL_REPO_LINKS) {
  const offenders = [];
  const kept = new Map(historical.map((entry) => [entry, []]));
  for (const { path, text } of files) {
    const lines = text.split('\n');
    const history = historical
      .filter((entry) => covers(entry, path))
      .map((entry) => ({ entry, range: historyLines(entry, lines) }));
    lines.forEach((line, index) => {
      for (const [link] of line.matchAll(OLD_REPO_LINK)) {
        const at = `${path}:${index + 1}: ${link}`;
        const keeper = history.find(({ entry, range }) =>
          range !== undefined && index >= range[0] && index <= range[1] && (!entry.links || entry.links.test(link)));
        if (keeper) kept.get(keeper.entry).push(at);
        else offenders.push(at);
      }
    });
  }
  return { offenders, kept };
}
