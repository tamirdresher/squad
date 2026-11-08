/**
 * Where CI runs the docs site location guard.
 *
 * squad-ci.yml routes each pull request by the paths it changes. The `test` job runs `npm test`,
 * which includes test/docs-site-location.test.ts, but it is skipped when only docs paths change.
 * So `docs-quality` runs the guard's `node --test` suite itself. These tests fail if that step
 * goes away, if the suite it runs stops importing the guard, or if docs-quality stops running for
 * docs-only pull requests.
 */

import { readFileSync } from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

type Step = { name?: string; uses?: string; run?: string };
type Job = { if?: string; steps?: Step[] };
type Workflow = { jobs: Record<string, Job> };

const ROOT = path.resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GUARD_SUITE = 'docs/tests/astro-features.test.mjs';
const GUARD_COMMAND = `node --test ${GUARD_SUITE}`;
const workflow = parse(readFileSync(path.join(ROOT, '.github', 'workflows', 'squad-ci.yml'), 'utf8')) as Workflow;
const docsQuality = workflow.jobs['docs-quality'];

/** Evaluates docs-quality's job-level `if:` the way the runner would for this event. */
function docsQualityRuns(eventName: string, outputs: Record<string, string>): boolean {
  return Boolean(runInNewContext(docsQuality?.if ?? 'true', {
    github: { event_name: eventName },
    needs: { changes: { result: 'success', outputs } },
    always: () => true,
    cancelled: () => false,
    success: () => true,
    failure: () => false,
  }));
}

describe('docs-quality runs the docs site location guard', () => {
  it(`runs ${GUARD_COMMAND}`, () => {
    const commands = (docsQuality?.steps ?? []).map((step) => step.run?.trim() ?? `uses: ${step.uses}`);

    expect(commands, `docs-quality steps in .github/workflows/squad-ci.yml:\n${commands.join('\n')}`).toContain(GUARD_COMMAND);
  });

  it(`${GUARD_SUITE} imports the guard from scripts/docs-site-location.mjs`, () => {
    const suite = readFileSync(path.join(ROOT, GUARD_SUITE), 'utf8');
    const imported = suite.match(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/\.\.\/scripts\/docs-site-location\.mjs'/)?.[1] ?? '';
    const names = imported.split(',').map((name) => name.trim()).filter(Boolean);
    const guard = ['SITE_SETTINGS', 'readSetting', 'readScannedFiles', 'RETIRED_SITE_LINK', 'findLinks', 'scanOldRepoLinks'];

    expect(guard.filter((name) => !names.includes(name)), `${GUARD_SUITE} imports [${names.join(', ')}]`).toEqual([]);
  });

  it('runs for docs-only pull requests and on push', () => {
    const docsOnly = { docs: 'true', code: 'false', workflows: 'false' };

    expect(docsQualityRuns('pull_request', docsOnly), `docs-quality if: ${docsQuality?.if}`).toBe(true);
    expect(docsQualityRuns('push', { docs: 'false', code: 'true', workflows: 'false' }), `docs-quality if: ${docsQuality?.if}`).toBe(true);
  });
});
