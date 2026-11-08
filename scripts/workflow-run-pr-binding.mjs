// scripts/workflow-run-pr-binding.mjs — zero dependencies
//
// Binds a `workflow_run` event to one pull request before a privileged,
// default-branch job writes to it. The github org blocks `pull_request_target`,
// so PR automation that must comment is split in two: an unprivileged
// `pull_request` run, then a `workflow_run` run of this repository's default
// branch that holds the write token.
//
// Trust boundary: the `pull_request` run is untrusted. A fork controls that
// run's workflow file, so anything it uploads is data, never authority. A claim
// is accepted only when the live pull request agrees with the `workflow_run`
// payload, which GitHub (not the fork) produces: the same head SHA, the same
// head repository, and this repository as the base. When the payload lists pull
// requests based in this repository (same-repository runs), the claim must also
// name one of them.

import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const CLAIM_SCHEMA = 'squad-pr-claim/v1';
export const CLAIM_FILE = 'claim.json';
export const MAX_CLAIM_BYTES = 1024;

const SHA = /^[0-9a-f]{40}$/;

/** Malformed or inconsistent input. Callers let it fail the job. */
export class BindingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BindingError';
  }
}

/** JSON-quote an untrusted value for messages, so it can never start a workflow command line. */
export function quote(value) {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function sameName(left, right) {
  return typeof left === 'string' && typeof right === 'string'
    && left.length > 0 && left.toLowerCase() === right.toLowerCase();
}

/**
 * Read one file from a downloaded artifact. Returns null when it is absent.
 * Rejects anything that is not a small regular file.
 * @param {string} dir
 * @param {string} name
 * @param {number} maxBytes
 * @returns {string | null}
 */
export function readUntrustedFile(dir, name, maxBytes) {
  const path = join(dir, name);
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
  if (!stat.isFile()) throw new BindingError(`${name} is not a regular file`);
  if (stat.size > maxBytes) {
    throw new BindingError(`${name} is ${stat.size} bytes; the limit is ${maxBytes}`);
  }
  const bytes = readFileSync(path);
  if (bytes.length > maxBytes) {
    throw new BindingError(`${name} is ${bytes.length} bytes; the limit is ${maxBytes}`);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new BindingError(`${name} is not valid UTF-8`);
  }
}

/**
 * Validate a PR claim uploaded by a `pull_request` run.
 * Exactly: { "schema": "squad-pr-claim/v1", "pr_number": <int>, "head_sha": "<40 hex>" }.
 * @param {string} text
 * @returns {{ prNumber: number, headSha: string }}
 */
export function parseClaim(text) {
  if (typeof text !== 'string') throw new BindingError('claim must be text');
  if (Buffer.byteLength(text) > MAX_CLAIM_BYTES) {
    throw new BindingError(`claim exceeds ${MAX_CLAIM_BYTES} bytes`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new BindingError(`claim is not JSON: ${quote(text)}`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BindingError(`claim must be a JSON object, got ${quote(value)}`);
  }
  const keys = Object.keys(value).sort().join(',');
  if (keys !== 'head_sha,pr_number,schema') {
    throw new BindingError(`claim keys must be head_sha,pr_number,schema; got ${quote(keys)}`);
  }
  if (value.schema !== CLAIM_SCHEMA) {
    throw new BindingError(`claim schema must be ${CLAIM_SCHEMA}; got ${quote(value.schema)}`);
  }
  if (!Number.isSafeInteger(value.pr_number) || value.pr_number <= 0) {
    throw new BindingError(`claim pr_number must be a positive integer; got ${quote(value.pr_number)}`);
  }
  if (typeof value.head_sha !== 'string' || !SHA.test(value.head_sha)) {
    throw new BindingError(`claim head_sha must be 40 lowercase hex; got ${quote(value.head_sha)}`);
  }
  return { prNumber: value.pr_number, headSha: value.head_sha };
}

/**
 * Extract the GitHub-produced facts this binding relies on from a workflow_run payload.
 * @param {any} payload  github-script `context.payload`
 * @param {{ owner: string, repo: string }} repoRef
 */
export function readWorkflowRun(payload, { owner, repo }) {
  const run = payload && payload.workflow_run;
  if (!run || typeof run !== 'object') throw new BindingError('event payload has no workflow_run');
  if (run.event !== 'pull_request') {
    throw new BindingError(`workflow_run.event must be "pull_request"; got ${quote(run.event)}`);
  }
  if (typeof run.head_sha !== 'string' || !SHA.test(run.head_sha)) {
    throw new BindingError(`workflow_run.head_sha is not a commit SHA: ${quote(run.head_sha)}`);
  }
  const repository = `${owner}/${repo}`;
  if (!sameName(run.repository && run.repository.full_name, repository)) {
    throw new BindingError(
      `workflow_run.repository ${quote(run.repository && run.repository.full_name)} is not ${repository}`,
    );
  }
  const headRepository = run.head_repository && run.head_repository.full_name;
  if (typeof headRepository !== 'string' || headRepository.length === 0) {
    throw new BindingError('workflow_run.head_repository is missing');
  }
  const listed = Array.isArray(run.pull_requests) ? run.pull_requests : [];
  const numbers = (entries) => entries
    .map((pr) => pr && pr.number)
    .filter((number) => Number.isSafeInteger(number) && number > 0);
  const repositoryId = run.repository.id;
  if (listed.length > 0 && !Number.isSafeInteger(repositoryId)) {
    throw new BindingError('workflow_run.repository.id is missing');
  }
  const basePullRequests = numbers(listed.filter((pr) =>
    pr && pr.base && pr.base.repo && pr.base.repo.id === repositoryId));
  return {
    id: run.id,
    path: run.path,
    headSha: run.head_sha,
    headRepository,
    pullRequests: numbers(listed),
    basePullRequests,
  };
}

function mismatch(pr, run, repository, requireOpen) {
  if (!sameName(pr.base && pr.base.repo && pr.base.repo.full_name, repository)) {
    return `base repository is ${quote(pr.base && pr.base.repo && pr.base.repo.full_name)}, not ${repository}`;
  }
  if (pr.head && pr.head.sha !== run.headSha) {
    return `head is ${quote(pr.head.sha)}, but the run built ${run.headSha} (stale or forged claim)`;
  }
  if (!pr.head || !pr.head.repo || !sameName(pr.head.repo.full_name, run.headRepository)) {
    return `head repository ${quote(pr.head && pr.head.repo && pr.head.repo.full_name)} `
      + `is not the run's head repository ${quote(run.headRepository)}`;
  }
  if (requireOpen && pr.state !== 'open') return `state is ${quote(pr.state)}`;
  return null;
}

/**
 * Resolve the pull request a workflow_run belongs to and verify it against the
 * live API. With a claim, only the claimed number is considered (fork runs have
 * an empty `pull_requests`). Without one, only GitHub's own `pull_requests` are.
 * @returns {Promise<{ bound: true, pr: object } | { bound: false, reason: string }>}
 */
export async function bindPullRequest({ github, owner, repo, run, claim = null, requireOpen = true }) {
  const repository = `${owner}/${repo}`;
  let candidates;
  if (claim) {
    if (claim.headSha !== run.headSha) {
      throw new BindingError(
        `claim head_sha ${claim.headSha} does not match workflow_run head_sha ${run.headSha}`,
      );
    }
    // Fork runs list no pull requests; for them the live checks below are the binding.
    if (run.basePullRequests.length > 0 && !run.basePullRequests.includes(claim.prNumber)) {
      throw new BindingError(
        `claim names #${claim.prNumber}, but the run lists ${run.basePullRequests.map((n) => `#${n}`).join(', ')}`,
      );
    }
    candidates = [claim.prNumber];
  } else {
    candidates = run.pullRequests;
  }
  if (candidates.length === 0) {
    return { bound: false, reason: 'the run lists no pull request and carried no claim' };
  }

  const rejected = [];
  for (const number of candidates) {
    let pr;
    try {
      ({ data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: number }));
    } catch (error) {
      if (error && error.status === 404) {
        rejected.push(`#${number}: not found`);
        continue;
      }
      throw error;
    }
    const reason = mismatch(pr, run, repository, requireOpen);
    if (reason) {
      rejected.push(`#${number}: ${reason}`);
      continue;
    }
    return {
      bound: true,
      pr: {
        number: pr.number,
        headSha: pr.head.sha,
        baseRef: pr.base.ref,
        draft: pr.draft === true,
        labels: (pr.labels || [])
          .map((label) => label && label.name)
          .filter((name) => typeof name === 'string'),
      },
    };
  }
  return { bound: false, reason: rejected.join('; ') };
}

/**
 * github-script entry point. Sets step outputs `bound`, and when bound:
 * `pr_number`, `head_sha`, `base_ref`, `draft`, `labels` (JSON [{ name }]).
 * A claim is read from `claimDir` only for runs of `claimWorkflowPath`.
 */
export async function bindWorkflowRun({
  github,
  context,
  core,
  claimDir = '',
  claimWorkflowPath = '',
  requireOpen = true,
}) {
  const { owner, repo } = context.repo;
  const run = readWorkflowRun(context.payload, { owner, repo });

  let claim = null;
  if (claimWorkflowPath && run.path === claimWorkflowPath) {
    if (!claimDir) throw new BindingError(`a claim is required for ${claimWorkflowPath} runs`);
    const text = readUntrustedFile(claimDir, CLAIM_FILE, MAX_CLAIM_BYTES);
    if (text === null) throw new BindingError(`${CLAIM_FILE} is missing from the claim artifact`);
    claim = parseClaim(text);
  }

  const result = await bindPullRequest({ github, owner, repo, run, claim, requireOpen });
  core.setOutput('bound', String(result.bound));
  if (!result.bound) {
    core.warning(`Not writing to any pull request: ${result.reason}`);
    return result;
  }
  const { pr } = result;
  core.setOutput('pr_number', String(pr.number));
  core.setOutput('head_sha', pr.headSha);
  core.setOutput('base_ref', pr.baseRef);
  core.setOutput('draft', String(pr.draft));
  core.setOutput('labels', JSON.stringify(pr.labels.map((name) => ({ name }))));
  core.info(`Bound workflow run ${run.id} to PR #${pr.number} at ${pr.headSha}`);
  return result;
}
