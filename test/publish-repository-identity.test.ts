/**
 * Published package metadata must name the repository that publishes it.
 *
 * squad-npm-publish.yml runs `npm publish --provenance`, and the npm registry
 * rejects a provenance publish whose package.json repository.url names a
 * different repository than the workflow that built it. These URLs went stale
 * when the repo moved from bradygaster/squad to github/squad; this keeps the
 * next move from silently breaking publication.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CANONICAL_REPO = 'github/squad';
const CANONICAL_URL = `https://github.com/${CANONICAL_REPO}`;

// The root manifest is private, but it is kept aligned so tooling sees one repository.
const MANIFESTS = [
  { file: 'package.json', directory: undefined },
  { file: 'packages/squad-cli/package.json', directory: 'packages/squad-cli' },
  { file: 'packages/squad-sdk/package.json', directory: 'packages/squad-sdk' },
];

/** owner/repo from a GitHub https or git+https URL; null for anything else. */
function githubSlug(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const match = url.match(/^(?:git\+)?https:\/\/github\.com\/([^/]+\/[^/#?]+?)(?:\.git)?\/?$/);
  return match ? match[1] : null;
}

describe.each(MANIFESTS)('$file', ({ file, directory }) => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));

  it(`names ${CANONICAL_REPO} in repository.url, which npm provenance checks`, () => {
    const url = pkg.repository?.url;
    expect(githubSlug(url), `${file} repository.url ${JSON.stringify(url)}`).toBe(CANONICAL_REPO);
    expect(pkg.repository?.directory, `${file} repository.directory`).toBe(directory);
  });

  it(`points homepage and bugs.url at ${CANONICAL_REPO}`, () => {
    expect(pkg.homepage, `${file} homepage`).toBe(`${CANONICAL_URL}#readme`);
    expect(pkg.bugs?.url, `${file} bugs.url`).toBe(`${CANONICAL_URL}/issues`);
  });
});

describe('src/Squad.Agents.AI/Squad.Agents.AI.csproj', () => {
  const csproj = readFileSync(path.join(ROOT, 'src', 'Squad.Agents.AI', 'Squad.Agents.AI.csproj'), 'utf8');
  const property = (name: string) => csproj.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];

  it(`points the NuGet project and repository URLs at ${CANONICAL_REPO}`, () => {
    expect(property('PackageProjectUrl'), 'Squad.Agents.AI.csproj PackageProjectUrl').toBe(CANONICAL_URL);
    expect(property('RepositoryUrl'), 'Squad.Agents.AI.csproj RepositoryUrl').toBe(`${CANONICAL_URL}.git`);
  });

  it('packs a README that links the current repository', () => {
    const readme = readFileSync(path.join(ROOT, 'src', 'Squad.Agents.AI', 'README.md'), 'utf8');
    const stale = readme.split(/\r?\n/).filter((line) => line.includes('github.com/bradygaster/squad'));
    expect(stale, 'src/Squad.Agents.AI/README.md lines linking github.com/bradygaster/squad').toEqual([]);
  });
});
