/**
 * Docs site location guard.
 *
 * The repository moved from bradygaster/squad to github/squad. GitHub Pages does not redirect
 * after a transfer, so https://bradygaster.github.io/squad/ returns 404 and the docs site is
 * served from https://github.github.com/squad/. The contract lives in
 * scripts/docs-site-location.mjs: the site settings, the retired-site and old-repository link
 * patterns, the scanned files and the historical allowlist. docs/tests/astro-features.test.mjs
 * enforces the same module under `node --test`.
 *
 * This file runs the contract in CI and pins it. The expected settings, the pattern examples and
 * the allowlist behavior are written out here, so a change to the shared module cannot quietly
 * loosen the guard.
 */

import { describe, it, expect } from 'vitest';
import {
  BASE,
  HISTORICAL_REPO_LINKS,
  OLD_REPO_LINK,
  REPO_URL,
  RETIRED_SITE_LINK,
  SCANNED_PATHS,
  SITE,
  SITE_SETTINGS,
  findLinks,
  readScannedFiles,
  readSetting,
  scanOldRepoLinks,
} from '../scripts/docs-site-location.mjs';

interface ScannedFile {
  path: string;
  text: string;
}

let scanned: ScannedFile[] | undefined;
const scannedFiles = (): ScannedFile[] => (scanned ??= readScannedFiles());

const matches = (pattern: RegExp, text: string): string[] => [...text.matchAll(pattern)].map((match) => match[0]);

/** Asserts what `pattern` finds in `text`; a failure names the input and what was found. */
function expectMatches(pattern: RegExp, text: string, expected: string[]): void {
  const found = matches(pattern, text);
  expect(found, `${JSON.stringify(text)} -> ${JSON.stringify(found)}, expected ${JSON.stringify(expected)}`).toEqual(expected);
}

/** Asserts a list of `path:line: link` results; a failure lists what was found and expected. */
function expectLines(found: string[], expected: string[]): void {
  expect(found, `found:\n${found.join('\n')}\nexpected:\n${expected.join('\n')}\n`).toEqual(expected);
}

/** Current entry points: always scanned, never history. */
const CURRENT_FILES = [
  'README.md',
  'README.zh.md',
  'CONTRIBUTING.md',
  'CONTRIBUTORS.md',
  'SUPPORT.md',
  'packages/squad-cli/README.md',
  'packages/squad-sdk/README.md',
  '.copilot/skills/pr-lifecycle/SKILL.md',
  'samples/autonomous-pipeline/index.ts',
  'docs/astro.config.mjs',
  'docs/src/components/Header.astro',
  'docs/src/components/Footer.astro',
  'docs/src/pages/index.astro',
  'docs/src/layouts/DocsLayout.astro',
  'docs/src/plugins/remark-rewrite-links.mjs',
  'docs/src/content/docs/community.md',
  'docs/src/content/docs/get-started/installation.md',
  'docs/src/content/docs/guide/contributing.md',
];

describe('docs site location (https://github.github.com/squad/)', () => {
  it('the shared contract places the site at https://github.github.com/squad/ and the repository at github/squad', () => {
    const constants = { SITE, BASE, REPO_URL };
    expect(constants, JSON.stringify(constants)).toEqual({
      SITE: 'https://github.github.com',
      BASE: '/squad/',
      REPO_URL: 'https://github.com/github/squad',
    });
    const settings = Object.fromEntries(SITE_SETTINGS.map((setting) => [setting.name, `${setting.file} = ${setting.expected}`]));
    expect(settings, JSON.stringify(settings, null, 2)).toEqual({
      'Astro site': 'docs/astro.config.mjs = https://github.github.com',
      'Astro base': 'docs/astro.config.mjs = /squad/',
      'RSS site fallback': 'docs/src/pages/rss.xml.js = https://github.github.com/squad/',
      'robots.txt Sitemap': 'docs/public/robots.txt = https://github.github.com/squad/sitemap-index.xml',
      '"Edit this page" URL': 'docs/src/layouts/DocsLayout.astro = https://github.com/github/squad/edit/dev/docs/src/content/docs/${currentSlug}.md',
    });
  });

  it.each(SITE_SETTINGS)('$name in $file', (setting) => {
    const { value, at } = readSetting(setting);

    expect(value, `${at}: ${setting.name} is ${value}`).toBe(setting.expected);
  });

  it('scans the tracked docs, samples, READMEs and contributor guides', () => {
    const paths = scannedFiles().map((file) => file.path);

    const emptyRoots = SCANNED_PATHS.filter((root: string) => !paths.some((path) => path === root || path.startsWith(`${root}/`)));
    expect(emptyRoots, `scanned paths with no tracked text files: ${emptyRoots.join(', ')}`).toEqual([]);
    const unreached = CURRENT_FILES.filter((path) => !paths.includes(path));
    expect(unreached, `files the scan should have reached: ${unreached.join(', ')}`).toEqual([]);
  });

  it('nothing scanned links to the retired bradygaster.github.io/squad site', () => {
    const offenders = findLinks(scannedFiles(), RETIRED_SITE_LINK);

    expect(offenders, `Links to the retired docs site; use https://github.github.com/squad/...:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('everything scanned links to github/squad, apart from the historical records in HISTORICAL_REPO_LINKS', () => {
    const { offenders } = scanOldRepoLinks(scannedFiles());

    expect(offenders, [
      'Links to the old bradygaster/squad repository; use https://github.com/github/squad.',
      'Only records of the past belong in HISTORICAL_REPO_LINKS (scripts/docs-site-location.mjs):',
      ...offenders,
    ].join('\n')).toEqual([]);
  });

  it('every historical exemption still keeps an old link', () => {
    const { kept } = scanOldRepoLinks(scannedFiles());
    const unused = [...kept].filter(([, links]) => links.length === 0).map(([entry]) => entry.path);

    expect(unused, `HISTORICAL_REPO_LINKS entries that keep no old links; remove them: ${unused.join(', ')}`).toEqual([]);
  });

  it('every historical exemption gives its reason', () => {
    const unexplained = HISTORICAL_REPO_LINKS.filter((entry: { reason?: string }) => !entry.reason?.trim()).map((entry: { path: string }) => entry.path);

    expect(unexplained, `HISTORICAL_REPO_LINKS entries without a reason: ${unexplained.join(', ')}`).toEqual([]);
  });

  it('no historical exemption covers a current file', () => {
    // A permalink is the narrowest form of history, so any entry covering these files would keep it.
    const planted = CURRENT_FILES.map((path) => ({ path, text: 'Credit: https://github.com/bradygaster/squad/pull/1\n' }));
    const flagged = scanOldRepoLinks(planted).offenders;
    const exempted = CURRENT_FILES.filter((path) => !flagged.includes(`${path}:1: github.com/bradygaster/squad/pull/1`));

    expect(exempted, `current files that HISTORICAL_REPO_LINKS treats as history: ${exempted.join(', ')}`).toEqual([]);
  });
});

describe('retired-site pattern', () => {
  it.each([
    ['a page link', '[Model Selection](https://bradygaster.github.io/squad/docs/features/model-selection/)', ['https://bradygaster.github.io/squad/docs/features/model-selection/']],
    ['a protocol-relative link', '<a href="//bradygaster.github.io/squad/">Docs</a>', ['//bradygaster.github.io/squad/']],
    ['the site root in any case, at the end of a line', 'Docs: HTTP://BradyGaster.GitHub.io/Squad', ['HTTP://BradyGaster.GitHub.io/Squad']],
    ['a bracketed URL, without the bracket', '[https://bradygaster.github.io/squad/guide/]', ['https://bradygaster.github.io/squad/guide/']],
    ['a path under the schema directory', 'https://bradygaster.github.io/squad/schemas/implementation-provenance/', ['https://bradygaster.github.io/squad/schemas/implementation-provenance/']],
    ['an unversioned schema path', 'https://bradygaster.github.io/squad/schemas/implementation-provenance/latest', ['https://bradygaster.github.io/squad/schemas/implementation-provenance/latest']],
    ['a path below the versioned schema ID', 'https://bradygaster.github.io/squad/schemas/implementation-provenance/v1/../../docs/', ['https://bradygaster.github.io/squad/schemas/implementation-provenance/v1/../../docs/']],
    ['a suffixed schema version', 'https://bradygaster.github.io/squad/schemas/implementation-provenance/v1-draft', ['https://bradygaster.github.io/squad/schemas/implementation-provenance/v1-draft']],
    ['a .json suffix on the schema version', '[schema](https://bradygaster.github.io/squad/schemas/implementation-provenance/v1.json)', ['https://bradygaster.github.io/squad/schemas/implementation-provenance/v1.json']],
    ['a .html suffix on the schema version', 'https://bradygaster.github.io/squad/schemas/implementation-provenance/v1.html', ['https://bradygaster.github.io/squad/schemas/implementation-provenance/v1.html']],
    ['a dot after the schema version that does not end a sentence', '[schema](https://bradygaster.github.io/squad/schemas/implementation-provenance/v1.)', ['https://bradygaster.github.io/squad/schemas/implementation-provenance/v1.']],
    ['a query on the schema ID', 'https://bradygaster.github.io/squad/schemas/implementation-provenance/v1?format=json', ['https://bradygaster.github.io/squad/schemas/implementation-provenance/v1?format=json']],
  ])('matches %s', (_case, text, expected) => {
    expectMatches(RETIRED_SITE_LINK, text, expected);
  });

  it.each([
    ['another site whose path starts with squad', 'Another project: https://bradygaster.github.io/squadcaster/'],
    ['a hyphenated sibling path', 'https://bradygaster.github.io/squad-legacy/'],
    ['the versioned schema ID in prose', 'Schema: `https://bradygaster.github.io/squad/schemas/implementation-provenance/v1`.'],
    ['the versioned schema ID in JSON', '"$id": "https://bradygaster.github.io/squad/schemas/implementation-provenance/v12",'],
    ['the versioned schema ID at the end of a line', 'schema: https://bradygaster.github.io/squad/schemas/implementation-provenance/v1'],
    ['the versioned schema ID ending a sentence', 'The schema ID is https://bradygaster.github.io/squad/schemas/implementation-provenance/v1. It is not a page.'],
    ['the versioned schema ID in an autolink', '<https://bradygaster.github.io/squad/schemas/implementation-provenance/v1>'],
    ['a fragment of the versioned schema ID', '"$ref": "https://bradygaster.github.io/squad/schemas/implementation-provenance/v1#/$defs/goal"'],
    ['old-host link text with a new-host target', 'Visit the docs at [bradygaster.github.io/squad](https://github.github.com/squad/).'],
    ['the new site', 'https://github.github.com/squad/docs/'],
  ])('does not match %s', (_case, text) => {
    expectMatches(RETIRED_SITE_LINK, text, []);
  });

  it('names the file and line of each retired-site link', () => {
    const text = [
      'intro',
      'See [Model Selection](https://bradygaster.github.io/squad/docs/features/model-selection/).',
      'Another project: https://bradygaster.github.io/squadcaster/',
      '<a href="//bradygaster.github.io/squad/">Docs</a>',
      'Schema: `https://bradygaster.github.io/squad/schemas/implementation-provenance/v1`.',
      'Download the [schema](https://bradygaster.github.io/squad/schemas/implementation-provenance/v1.json).',
    ].join('\r\n');

    expectLines(findLinks([{ path: 'docs/example.md', text }], RETIRED_SITE_LINK), [
      'docs/example.md:2: https://bradygaster.github.io/squad/docs/features/model-selection/',
      'docs/example.md:4: //bradygaster.github.io/squad/',
      'docs/example.md:6: https://bradygaster.github.io/squad/schemas/implementation-provenance/v1.json',
    ]);
  });
});

describe('old-repository pattern', () => {
  it.each([
    ['a web link', '[Fork](https://github.com/bradygaster/squad)', ['github.com/bradygaster/squad']],
    ['a web link in any case', 'https://GitHub.com/BradyGaster/Squad/issues/new', ['GitHub.com/BradyGaster/Squad/issues/new']],
    ['a raw file URL', 'curl -fsSL https://raw.githubusercontent.com/bradygaster/squad/main/scripts/install.sh | sh', ['raw.githubusercontent.com/bradygaster/squad/main/scripts/install.sh']],
    ['the SSH remote', 'git remote add upstream git@github.com:bradygaster/squad.git', ['github.com:bradygaster/squad.git']],
    ['a REST path', 'curl https://api.github.com/repos/bradygaster/squad/releases', ['repos/bradygaster/squad/releases']],
    ['the gh --repo flag', 'gh pr create --base dev --repo bradygaster/squad --head me:branch', ['--repo bradygaster/squad']],
    ['the gh --repo= flag', 'gh issue list --repo=bradygaster/squad', ['--repo=bradygaster/squad']],
  ])('matches %s', (_case, text, expected) => {
    expectMatches(OLD_REPO_LINK, text, expected);
  });

  it.each([
    ['the npm scope', 'npm install -g @bradygaster/squad-cli@insider'],
    ['another repository whose name starts with squad', 'https://github.com/bradygaster/squadron'],
    ['a work reference', 'Ported from bradygaster/squad#131'],
    ['a look-alike host', 'https://mygithub.com/bradygaster/squad'],
    ['the new repository', 'git remote add upstream git@github.com:github/squad.git && gh pr create --repo github/squad'],
  ])('does not match %s', (_case, text) => {
    expectMatches(OLD_REPO_LINK, text, []);
  });

  it('keeps only documented history, and names the file and line of everything else', () => {
    const old = 'https://github.com/bradygaster/squad';
    const files = [
      { path: 'docs/src/content/blog/021-the-migration.md', text: `Old home: ${old}/blob/main/README.md` },
      { path: 'docs/src/content/docs/community.md', text: `intro\nStar us: ${old}` },
      { path: 'docs/src/content/docs/guide/contributors.md', text: `- [#298](${old}/pull/298)\nSee ${old}/blob/main/CONTRIBUTING.md` },
      { path: 'docs/specification/core-v0.1.md', text: `Provenance: [PR #2074](${old}/pull/2074)\nReference implementation: ${old}` },
      { path: 'docs/src/content/docs/whatsnew.md', text: `## v2.0.0\nFixed (${old}/pull/2279)\n## v1.1.0 — Stable Release\nPorted ([PR #131](${old}/pull/131))` },
      {
        path: 'docs/src/content/docs/scenarios/upgrading.md',
        text: `Report at ${old}/issues\n<!-- UPGRADE-MATRIX:START -->\n| [run](${old}/actions/runs/1) |\n<!-- UPGRADE-MATRIX:END -->\nAfter: ${old}/releases`,
      },
    ];

    const { offenders, kept } = scanOldRepoLinks(files);

    expectLines(offenders, [
      'docs/src/content/docs/community.md:2: github.com/bradygaster/squad',
      'docs/src/content/docs/guide/contributors.md:2: github.com/bradygaster/squad/blob/main/CONTRIBUTING.md',
      'docs/specification/core-v0.1.md:2: github.com/bradygaster/squad',
      'docs/src/content/docs/whatsnew.md:2: github.com/bradygaster/squad/pull/2279',
      'docs/src/content/docs/scenarios/upgrading.md:1: github.com/bradygaster/squad/issues',
      'docs/src/content/docs/scenarios/upgrading.md:5: github.com/bradygaster/squad/releases',
    ]);
    const keptByEntry = Object.fromEntries([...kept].filter(([, links]) => links.length > 0).map(([entry, links]) => [entry.path, links]));
    expect(keptByEntry, `kept:\n${JSON.stringify(keptByEntry, null, 2)}`).toEqual({
      'docs/src/content/blog/': ['docs/src/content/blog/021-the-migration.md:1: github.com/bradygaster/squad/blob/main/README.md'],
      'docs/specification/': ['docs/specification/core-v0.1.md:1: github.com/bradygaster/squad/pull/2074'],
      'docs/src/content/docs/guide/contributors.md': ['docs/src/content/docs/guide/contributors.md:1: github.com/bradygaster/squad/pull/298'],
      'docs/src/content/docs/whatsnew.md': ['docs/src/content/docs/whatsnew.md:4: github.com/bradygaster/squad/pull/131'],
      'docs/src/content/docs/scenarios/upgrading.md': ['docs/src/content/docs/scenarios/upgrading.md:3: github.com/bradygaster/squad/actions/runs/1'],
    });
  });

  it('exempts nothing in a file whose history marker is missing', () => {
    const old = 'https://github.com/bradygaster/squad';
    const files = [
      { path: 'docs/src/content/docs/whatsnew.md', text: `## v2.0.0\nPorted ([PR #131](${old}/pull/131))` },
      { path: 'docs/src/content/docs/scenarios/upgrading.md', text: `<!-- UPGRADE-MATRIX:START -->\n| [run](${old}/actions/runs/1) |` },
    ];

    expectLines(scanOldRepoLinks(files).offenders, [
      'docs/src/content/docs/whatsnew.md:2: github.com/bradygaster/squad/pull/131',
      'docs/src/content/docs/scenarios/upgrading.md:2: github.com/bradygaster/squad/actions/runs/1',
    ]);
  });
});
