// scripts/repo-health-report.mjs — zero dependencies
//
// Privileged half of Repo Health, run by squad-repo-health-report.yml through
// workflow_run from the default branch. The unprivileged `pull_request` run
// (squad-repo-health.yml) uploads one result artifact per scanner. Those files
// are untrusted data: a PR that edits squad-repo-health.yml decides what its own
// run uploads. This module:
//   1. reads each result with a size limit and an exact schema,
//   2. requires all results to name the same PR and head SHA,
//   3. binds that claim to the workflow_run payload and the live PR, which must
//      target dev,
//   4. posts only when the run's head commit (workflow_run.head_sha) has the
//      same blob of squad-repo-health.yml as its merge base with dev. Both blobs
//      are read by commit SHA, never from the live PR, so a push after binding
//      cannot change the answer. Then the run used the base branch's definition
//      and the scanners came from the PR's base commit (the evidence is
//      authoritative),
//   5. upserts or deletes the marker comments through repo-health-comment.mjs,
//      or, when it refuses a bound PR, overwrites its own marker comments with a
//      fixed notice naming the refused commit.

import { join } from 'node:path';
import { refuse as postRefusal, run as postFindings } from './repo-health-comment.mjs';
import {
  BindingError,
  bindPullRequest,
  quote,
  readUntrustedFile,
  readWorkflowRun,
} from './workflow-run-pr-binding.mjs';

export const RESULT_SCHEMA = 'squad-repo-health-result/v1';
export const MAX_RESULT_BYTES = 1024 * 1024;
export const WORKFLOW_PATH = '.github/workflows/squad-repo-health.yml';
export const RESULT_JOBS = ['leakage', 'architectural', 'security'];
/** The only base branch squad-repo-health.yml scans. */
export const REQUIRED_BASE = 'dev';

const SHA = /^[0-9a-f]{40}$/;

/**
 * Validate one scanner result envelope.
 * Exactly: { schema, job, pr_number, head_sha, output }.
 */
export function parseResult(text, job) {
  const file = `${job}.json`;
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new BindingError(`${file} is not JSON`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BindingError(`${file} must be a JSON object`);
  }
  const keys = Object.keys(value).sort().join(',');
  if (keys !== 'head_sha,job,output,pr_number,schema') {
    throw new BindingError(`${file} keys must be head_sha,job,output,pr_number,schema; got ${quote(keys)}`);
  }
  if (value.schema !== RESULT_SCHEMA) {
    throw new BindingError(`${file} schema must be ${RESULT_SCHEMA}; got ${quote(value.schema)}`);
  }
  if (value.job !== job) throw new BindingError(`${file} names job ${quote(value.job)}`);
  if (!Number.isSafeInteger(value.pr_number) || value.pr_number <= 0) {
    throw new BindingError(`${file} pr_number must be a positive integer; got ${quote(value.pr_number)}`);
  }
  if (typeof value.head_sha !== 'string' || !SHA.test(value.head_sha)) {
    throw new BindingError(`${file} head_sha must be 40 lowercase hex; got ${quote(value.head_sha)}`);
  }
  if (typeof value.output !== 'string') throw new BindingError(`${file} output must be a string`);
  return { job, prNumber: value.pr_number, headSha: value.head_sha, output: value.output };
}

/**
 * Read the result files. Each scanner's artifact is downloaded by its exact name
 * into its own directory, `<dir>/<job>/`. A scanner that failed uploads none.
 */
export function readResults(dir) {
  const results = [];
  for (const job of RESULT_JOBS) {
    const text = readUntrustedFile(join(dir, job), `${job}.json`, MAX_RESULT_BYTES);
    if (text !== null) results.push(parseResult(text, job));
  }
  return results;
}

/** Blob SHA of WORKFLOW_PATH at a commit, or null when there is no regular file there. */
async function workflowBlobAt({ github, owner, repo, sha }) {
  let data;
  try {
    ({ data } = await github.rest.repos.getContent({ owner, repo, path: WORKFLOW_PATH, ref: sha }));
  } catch (error) {
    if (error && error.status === 404) return null;
    throw error;
  }
  if (!data || Array.isArray(data) || data.type !== 'file' || typeof data.sha !== 'string' || !SHA.test(data.sha)) {
    return null;
  }
  return data.sha;
}

/**
 * Decide, from data pinned to commit SHAs, whether `headSha` changes WORKFLOW_PATH
 * against its merge base with REQUIRED_BASE. Returns why the results are not
 * authoritative, or null when both commits hold the same blob. A file missing on
 * either side counts as changed; API failures throw.
 */
export async function workflowChangeAt({ github, owner, repo, headSha }) {
  const { data: ref } = await github.rest.git.getRef({ owner, repo, ref: `heads/${REQUIRED_BASE}` });
  const baseSha = ref && ref.object && ref.object.sha;
  if (typeof baseSha !== 'string' || !SHA.test(baseSha)) {
    throw new BindingError(`refs/heads/${REQUIRED_BASE} does not name a commit: ${quote(baseSha)}`);
  }
  const { data: comparison } = await github.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${baseSha}...${headSha}`,
  });
  const mergeBase = comparison && comparison.merge_base_commit && comparison.merge_base_commit.sha;
  if (typeof mergeBase !== 'string' || !SHA.test(mergeBase)) {
    throw new BindingError(`no merge base between ${REQUIRED_BASE} ${baseSha} and ${headSha}: ${quote(mergeBase)}`);
  }

  const atHead = await workflowBlobAt({ github, owner, repo, sha: headSha });
  const atBase = await workflowBlobAt({ github, owner, repo, sha: mergeBase });
  if (atHead === null) return `${headSha} has no regular file ${WORKFLOW_PATH}`;
  if (atBase === null) return `merge base ${mergeBase} has no regular file ${WORKFLOW_PATH}`;
  if (atHead !== atBase) {
    return `${headSha} changes ${WORKFLOW_PATH} (blob ${atHead}; merge base ${mergeBase} has ${atBase})`;
  }
  return null;
}

/**
 * github-script entry point.
 * @returns {Promise<{ posted: string[], prNumber?: number, refused?: 'base' | 'workflow', overwritten?: number }>}
 */
export async function report({ github, context, core, dir }) {
  const { owner, repo } = context.repo;
  const run = readWorkflowRun(context.payload, { owner, repo });
  if (run.path !== WORKFLOW_PATH) {
    throw new BindingError(`workflow_run.path ${quote(run.path)} is not ${WORKFLOW_PATH}`);
  }

  const results = readResults(dir);
  if (results.length === 0) {
    core.notice('Repo Health uploaded no scanner results; no comment was changed.');
    return { posted: [] };
  }
  const [first] = results;
  for (const result of results) {
    if (result.prNumber !== first.prNumber || result.headSha !== first.headSha) {
      throw new BindingError(
        `scanner results disagree: ${first.job} names #${first.prNumber}@${first.headSha}, `
        + `${result.job} names #${result.prNumber}@${result.headSha}`,
      );
    }
  }

  const binding = await bindPullRequest({
    github,
    owner,
    repo,
    run,
    claim: { prNumber: first.prNumber, headSha: first.headSha },
  });
  if (!binding.bound) {
    core.warning(`Not posting Repo Health findings: ${binding.reason}`);
    return { posted: [] };
  }
  const prNumber = binding.pr.number;

  let refusal = null;
  if (binding.pr.baseRef !== REQUIRED_BASE) {
    refusal = { reason: 'base', detail: `PR #${prNumber} targets ${quote(binding.pr.baseRef)}, not ${REQUIRED_BASE}` };
  } else {
    const changed = await workflowChangeAt({ github, owner, repo, headSha: run.headSha });
    if (changed) refusal = { reason: 'workflow', detail: changed };
  }
  if (refusal) {
    core.notice(
      `Not posting Repo Health findings on PR #${prNumber}: ${refusal.detail}. Findings are authoritative only `
      + `when the run's head commit has the same ${WORKFLOW_PATH} as its merge base with ${REQUIRED_BASE}; `
      + 'otherwise the run followed the PR\'s own workflow definition. See .github/REPO_HEALTH_RUNBOOK.md.',
    );
    const overwritten = await postRefusal({
      github,
      context,
      issueNumber: prNumber,
      headSha: run.headSha,
      reason: refusal.reason,
    });
    return { posted: [], refused: refusal.reason, overwritten, prNumber };
  }

  // Each scanner's comment is independent, as when they were separate jobs.
  const posted = [];
  const failures = [];
  for (const result of results) {
    try {
      await postFindings({
        github,
        context,
        output: result.output,
        job: result.job,
        issueNumber: prNumber,
        headSha: run.headSha,
      });
      posted.push(result.job);
    } catch (error) {
      failures.push(error);
      core.error(`Repo Health ${result.job} reporter failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(failures, `${failures.length} Repo Health reporters failed`);
  }
  return { posted, prNumber };
}
