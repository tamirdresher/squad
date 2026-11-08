// scripts/repo-health-comment.mjs — zero dependencies
// Shared utility for posting/upserting repo health PR comments.
// DI pattern: run({ github, context, output, job, issueNumber, headSha }) for testability.
//
// Scanner output reaches this module from an artifact of the unprivileged
// `pull_request` run, so every parser below validates it strictly and throws
// instead of guessing. A rejected output changes no comment. Every posted
// comment names the head commit it describes. refuse() replaces the bot's own
// marker comments with fixed text when the reporter refuses a run's results.

import { validateSquadPath } from './git-path-decoder.mjs';

export const EVIDENCE_LABEL =
  '> **Authoritative evidence:** scanners from the PR base commit, posted by the default-branch `workflow_run` reporter.';

/** GITHUB_TOKEN writes comments as this account. */
export const BOT_LOGIN = 'github-actions[bot]';

const SHA = /^[0-9a-f]{40}$/;
const SEVERITIES = new Set(['error', 'warning', 'info']);
const MAX_FINDINGS = 1000;
const MAX_TEXT = 10000;
const MAX_FILES = 10000;

function evidence(headSha) {
  return [EVIDENCE_LABEL, `> Results for head commit \`${headSha}\`.`];
}

function isText(value) {
  return typeof value === 'string' && value.length <= MAX_TEXT;
}

function hasExactKeys(value, keys) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

/**
 * Parse `{ findings, summary }` printed by architectural-review.mjs or
 * security-review.mjs (pretty JSON, then a summary line) and validate each
 * finding's exact shape. Returns null when there are no findings.
 */
function parseFindings(output, label, findingKeys, validFinding) {
  const invalid = () => new Error(`Invalid ${label} scanner output`);
  const jsonMatch = typeof output === 'string' ? output.match(/\{[\s\S]*"findings"[\s\S]*\}/) : null;
  if (!jsonMatch) throw invalid();
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw invalid();
  }
  if (
    !hasExactKeys(parsed, ['findings', 'summary'])
    || !isText(parsed.summary)
    || !Array.isArray(parsed.findings)
    || parsed.findings.length > MAX_FINDINGS
    || !parsed.findings.every((finding) =>
      hasExactKeys(finding, findingKeys)
      && isText(finding.category)
      && SEVERITIES.has(finding.severity)
      && isText(finding.message)
      && validFinding(finding))
  ) {
    throw invalid();
  }
  return parsed.findings.length > 0 ? parsed : null;
}

const JOBS = {
  leakage: {
    marker: '<!-- squad-repo-health-leakage -->',
    title: 'Squad File Leakage',
    parse(output) {
      const parsed = JSON.parse(output);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Object.keys(parsed).sort().join(',') !== 'files,leaked' ||
        typeof parsed.leaked !== 'boolean' ||
        !Array.isArray(parsed.files) ||
        !parsed.files.every((file) => typeof file === 'string') ||
        parsed.leaked !== (parsed.files.length > 0)
      ) {
        throw new Error('Invalid Squad leakage scanner output');
      }
      parsed.files.forEach(validateSquadPath);
      return parsed.leaked ? parsed : null;
    },
    format(parsed, headSha) {
      const fileList = parsed.files.map(f => `- \`${f}\``).join('\n');
      return [
        '## ⚠️ Squad File Leakage Detected',
        '',
        ...evidence(headSha),
        '',
        'The following `.squad/` files were modified in this PR:',
        '',
        fileList,
        '',
        'These files affect team routing, agent charters, and decisions.',
        'If intentional, ensure approval from the team lead.',
      ].join('\n');
    },
  },
  architectural: {
    marker: '<!-- squad-architectural-review -->',
    title: 'Architectural Review',
    parse(output) {
      return parseFindings(
        output,
        'architectural review',
        ['category', 'severity', 'message', 'files'],
        (finding) => Array.isArray(finding.files)
          && finding.files.length <= MAX_FILES
          && finding.files.every(isText),
      );
    },
    format(parsed, headSha) {
      const severityIcon = { error: '🔴', warning: '🟡', info: 'ℹ️' };
      const rows = parsed.findings.map(f => {
        const icon = severityIcon[f.severity] || '❓';
        const files = f.files.length > 0
          ? f.files.map(fi => `\`${fi}\``).join(', ')
          : '—';
        return `| ${icon} ${f.severity} | **${f.category}** | ${f.message} | ${files} |`;
      });
      return [
        '## 🏗️ Architectural Review',
        '',
        ...evidence(headSha),
        '',
        parsed.summary,
        '',
        '| Severity | Category | Finding | Files |',
        '|----------|----------|---------|-------|',
        ...rows,
        '',
        '---',
        '*Automated architectural review — informational only.*',
      ].join('\n');
    },
  },
  security: {
    marker: '<!-- squad-security-review -->',
    title: 'Security Review',
    parse(output) {
      return parseFindings(
        output,
        'security review',
        ['category', 'severity', 'message', 'file', 'line'],
        (finding) => isText(finding.file)
          && Number.isSafeInteger(finding.line)
          && finding.line >= 0,
      );
    },
    format(parsed, headSha) {
      const severityIcon = { error: '🔴', warning: '🟡', info: 'ℹ️' };
      const rows = parsed.findings.map(f => {
        const icon = severityIcon[f.severity] || '❓';
        const loc = f.line ? `\`${f.file}:${f.line}\`` : (f.file ? `\`${f.file}\`` : '—');
        return `| ${icon} ${f.severity} | **${f.category}** | ${f.message} | ${loc} |`;
      });
      return [
        '## 🔒 Security Review',
        '',
        ...evidence(headSha),
        '',
        parsed.summary,
        '',
        '| Severity | Category | Finding | Location |',
        '|----------|----------|---------|----------|',
        ...rows,
        '',
        '---',
        '*Automated security review — informational only.*',
      ].join('\n');
    },
  },
};

function hasExactMarker(comment, marker) {
  return typeof comment.body === 'string' && comment.body.split('\n', 1)[0] === marker;
}

/**
 * Post or update a repo health comment on a PR.
 * @param {object} opts
 * @param {object} opts.github      Octokit instance (DI)
 * @param {object} opts.context     GitHub Actions context (DI)
 * @param {string} opts.output      Raw output from the scanner
 * @param {string} opts.job         'leakage' | 'architectural' | 'security'
 * @param {number} opts.issueNumber PR number, already bound to the workflow run
 *   (a workflow_run context has no `context.issue`)
 * @param {string} opts.headSha     Commit the results describe (workflow_run.head_sha)
 */
export async function run({ github, context, output, job, issueNumber, headSha }) {
  const config = JOBS[job];
  if (!config) throw new Error(`Unknown repo-health job type: ${job}`);
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    throw new Error(`repo-health ${job} needs a bound PR number, got ${JSON.stringify(issueNumber)}`);
  }
  if (typeof headSha !== 'string' || !SHA.test(headSha)) {
    throw new Error(`repo-health ${job} needs the bound head SHA, got ${JSON.stringify(headSha)}`);
  }

  const parsed = config.parse(output);

  // Fetch all comments (paginated) to find existing marker
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const existing = comments.find((comment) => hasExactMarker(comment, config.marker));

  // No findings — clean up stale marker comment if one exists
  if (!parsed) {
    if (existing) {
      await github.rest.issues.deleteComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existing.id,
      });
    }
    return;
  }

  const body = `${config.marker}\n${config.format(parsed, headSha)}`;

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body,
    });
  }
}

const REFUSALS = {
  workflow: 'its Repo Health run used the PR\'s own copy of `.github/workflows/squad-repo-health.yml`, '
    + 'which differs from the copy at its merge base with `dev`. That includes the Bootstrap Protection '
    + 'check on this commit. A code owner must review the workflow change; its authoritative evidence is '
    + 'the post-merge canary in `.github/REPO_HEALTH_RUNBOOK.md`.',
  base: 'the pull request no longer targets `dev`, the only base branch Repo Health scans.',
};

/**
 * When the reporter refuses a bound PR's results, overwrite its existing marker
 * comments with fixed text naming the refused commit, so findings or all-clears
 * for an earlier commit are not read as current. Only comments written by
 * BOT_LOGIN whose first line is the exact marker are touched; none is created.
 * @param {object} opts
 * @param {'workflow' | 'base'} opts.reason
 * @returns {Promise<number>} how many comments were overwritten
 */
export async function refuse({ github, context, issueNumber, headSha, reason }) {
  const notice = Object.hasOwn(REFUSALS, reason) ? REFUSALS[reason] : null;
  if (!notice) throw new Error(`Unknown repo-health refusal: ${JSON.stringify(reason)}`);
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    throw new Error(`repo-health refusal needs a bound PR number, got ${JSON.stringify(issueNumber)}`);
  }
  if (typeof headSha !== 'string' || !SHA.test(headSha)) {
    throw new Error(`repo-health refusal needs the refused head SHA, got ${JSON.stringify(headSha)}`);
  }

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  let overwritten = 0;
  for (const config of Object.values(JOBS)) {
    const body = [
      config.marker,
      `## ⚠️ ${config.title}: results refused`,
      '',
      `> Repo Health did not post results for head commit \`${headSha}\`: ${notice}`,
      '',
      'This replaces the findings posted here for an earlier commit.',
    ].join('\n');
    for (const comment of comments) {
      if (!hasExactMarker(comment, config.marker) || comment.user?.login !== BOT_LOGIN) continue;
      if (comment.body === body) continue;
      await github.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: comment.id,
        body,
      });
      overwritten += 1;
    }
  }
  return overwritten;
}
