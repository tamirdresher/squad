# Repo Health workflow verification

The github org blocks `pull_request_target`, so Repo Health is split in two:

- `Repo Health` (`squad-repo-health.yml`) runs on `pull_request` with a read-only token and no
  secrets. Every job checks out the PR's base commit and fetches the PR head only as Git data.
  Never check out or execute PR-head code there. It uploads one result file per scanner
  (`repo-health-{leakage,architectural,security}`).
- **Base-controlled only when the PR leaves `squad-repo-health.yml` unchanged.** A `pull_request`
  run uses the workflow file from the PR merge commit, so a PR that edits that file controls every
  job of its own run, including the Bootstrap Protection check (it could make that job `exit 0`).
  The compensating control is code-owner review: `.github/CODEOWNERS` line 4 requests review from
  the code owners on every PR. As of 2026-11-07, `dev`'s rules require neither code-owner review
  nor any approval, and Bootstrap Protection is not a required check, so this control depends on
  reviewers reading workflow changes. Requiring code-owner review on `dev` would enforce it.
- `Repo Health Report` (`squad-repo-health-report.yml`) runs on `workflow_run` from the default
  branch and holds the write token. It downloads each scanner's artifact by its exact name and
  treats the results as untrusted data: exact schema, size limit, one PR and head SHA across all
  results, bound to the `workflow_run` payload and the live PR, which must target `dev`
  (`scripts/repo-health-report.mjs`, `scripts/workflow-run-pr-binding.mjs`). It posts only when
  the run's head commit holds the same `squad-repo-health.yml` blob as its merge base with `dev`.
  Both blobs are read by commit SHA, so a push after binding can't change the answer. Otherwise it
  logs a notice, posts no findings, and overwrites its own existing marker comments with a fixed
  notice naming the refused commit. Every posted comment names the head commit it describes.

Fork PRs from external contributors need a maintainer to approve their workflow runs first
(`approval_policy: all_external_contributors`); nothing is posted before that.

## Evidence levels

- **Shadow / non-authoritative:** `Repo Health Shadow (Non-Authoritative)` runs proposed scanners,
  reporter script bodies, and the reporter helper from the PR head under `pull_request`, a
  read-only token, no persisted checkout credentials, and fake Octokit. It can prove that proposed
  code compiles, preserves hostile text, and propagates API failures, but it cannot prove the
  default-branch reporter has picked up the merged implementation.
- **Post-merge / authoritative:** only a disposable PR opened after the change reaches `dev` and
  observed through `Repo Health Report` proves the default-branch writer now creates and cleans up
  its marker comment. A PR that changes `squad-repo-health.yml` itself never gets posted findings,
  so this canary is the only authoritative evidence for such a change.

Do not weaken a scanner, add an exclusion, or change a finding merely to make the base-controlled
check on the implementation PR green.

## Authoritative post-merge canary

Run this only after the workflow/helper change is on `dev`. It creates a disposable branch and PR
whose filename contains paired backticks, a bare `${`, an apostrophe, and a double quote. The
filename is data; do not execute it. Multiline transport coverage belongs in scanner diagnostic
messages, because the leakage scanner consumes Git's line-delimited `--name-only` output.

```bash
git fetch origin dev
git switch --create canary/repo-health-$(date +%s) origin/dev

node --input-type=module <<'NODE'
import { mkdirSync, writeFileSync } from 'node:fs';
const path = '.squad/canary-`paired`-${-apostrophe-\'-"double quote".md';
mkdirSync('.squad', { recursive: true });
writeFileSync(path, 'repo-health post-merge canary\n');
NODE

CANARY_PATH=$(node --input-type=module -e \
  'process.stdout.write(".squad/canary-`paired`-${-apostrophe-'\''-\"double quote\".md")')
git add -- "$CANARY_PATH"
git commit -m 'test: repo-health post-merge canary'
git push -u origin HEAD
PR_URL=$(gh pr create --base dev --title 'test: repo-health post-merge canary' \
  --body 'Disposable authoritative canary; do not merge.')
PR_NUMBER=${PR_URL##*/}
```

Wait for `Repo Health` and then `Repo Health Report` to complete, then verify exactly one
authoritative marker, the exact hostile filename, and the head commit it describes:

```bash
EXPECTED=$(node --input-type=module -e \
  'process.stdout.write(".squad/canary-`paired`-${-apostrophe-'\''-\"double quote\".md")')

gh api --paginate --slurp "repos/github/squad/issues/$PR_NUMBER/comments" \
  > canary-comments.json
node --input-type=module - "$EXPECTED" "$(git rev-parse HEAD)" <<'NODE'
import { readFileSync } from 'node:fs';
const [expected, head] = process.argv.slice(2);
const comments = JSON.parse(readFileSync('canary-comments.json', 'utf8')).flat();
const marked = comments.filter(({ body = '' }) =>
  body.includes('<!-- squad-repo-health-leakage -->'));
if (marked.length !== 1) throw new Error(`expected one marker comment, found ${marked.length}`);
const listed = marked[0].body.split('\n').filter((line) => line.startsWith('- `'));
if (listed.length !== 1 || listed[0] !== `- \`${expected}\``) {
  throw new Error(`expected exact raw semantic path, got ${JSON.stringify(listed)}`);
}
if (!marked[0].body.includes('Authoritative evidence')) {
  throw new Error('comment was not labeled authoritative');
}
if (!marked[0].body.includes(`Results for head commit \`${head}\``)) {
  throw new Error(`comment does not name head commit ${head}`);
}
NODE
rm canary-comments.json
```

Delete the file in the same PR, push, wait for the rerun, and prove stale cleanup:

```bash
git rm -- "$CANARY_PATH"
git commit -m 'test: clean up repo-health post-merge canary'
git push

# After Repo Health and Repo Health Report complete:
gh api --paginate --slurp "repos/github/squad/issues/$PR_NUMBER/comments" \
  > canary-comments.json
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
const comments = JSON.parse(readFileSync('canary-comments.json', 'utf8')).flat();
const marked = comments.filter(({ body = '' }) =>
  body.includes('<!-- squad-repo-health-leakage -->'));
if (marked.length !== 0) throw new Error(`stale marker remains: ${marked.length}`);
NODE
rm canary-comments.json
gh pr close "$PR_NUMBER" --delete-branch
git switch dev
```

Record the PR URL and the successful `Repo Health` and `Repo Health Report` run URLs (both
pushes) in the implementing PR or issue. This post-merge canary is the only authoritative evidence
for a repo-health workflow/reporter change; the pre-merge shadow remains intentionally
non-authoritative.
