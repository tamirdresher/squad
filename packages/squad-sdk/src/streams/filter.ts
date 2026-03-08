/**
 * SubSquad-Aware Issue Filtering
 *
 * Filters GitHub issues to only those matching a SubSquad's labelFilter.
 * Intended to scope work to the active SubSquad during triage.
 *
 * @module streams/filter
 */

import type { ResolvedSubSquad } from './types.js';

/** Minimal issue shape for filtering. */
export interface SubSquadIssue {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
}

/** @deprecated Use SubSquadIssue instead */
export type WorkstreamIssue = SubSquadIssue;

/** @deprecated Use SubSquadIssue instead */
export type StreamIssue = SubSquadIssue;

/**
 * Filter issues to only those matching the SubSquad's label filter.
 *
 * Matching is case-insensitive. If the SubSquad has no labelFilter,
 * all issues are returned (passthrough).
 *
 * @param issues - Array of issues to filter
 * @param subsquad - The resolved SubSquad to filter by
 * @returns Filtered array of issues matching the SubSquad's label
 */
export function filterIssuesBySubSquad(
  issues: SubSquadIssue[],
  subsquad: ResolvedSubSquad,
): SubSquadIssue[] {
  const filter = subsquad.definition.labelFilter;
  if (!filter) {
    return issues;
  }

  const normalizedFilter = filter.toLowerCase();
  return issues.filter(issue =>
    issue.labels.some(label => label.name.toLowerCase() === normalizedFilter),
  );
}

/** @deprecated Use filterIssuesBySubSquad instead */
export const filterIssuesByWorkstream = filterIssuesBySubSquad;

/** @deprecated Use filterIssuesBySubSquad instead */
export const filterIssuesByStream = filterIssuesBySubSquad;
