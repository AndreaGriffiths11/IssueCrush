import type { GitHubIssue } from '../api/github';

/**
 * Deck ordering and filtering driven by triage judgments.
 *
 * Kept free of React and react-native imports on purpose: this is pure policy
 * over data the server already produced, so it can be unit tested directly and
 * reused from the hook or any component.
 *
 * No thresholds live here. Sort order is presentation, not policy. The one
 * threshold that matters for filtering (staleness) is applied server-side by
 * `interpretTriage`, which is why "hide stale" checks for the STALE chip rather
 * than re-deriving the cutoff and risking drift from the backend.
 */

export const TRIAGE_SORTS = {
  none: 'GitHub order',
  effort_asc: 'Quick wins first',
  stale_desc: 'Most stale first',
  actionable_desc: 'Ready to start first',
} as const;

export type TriageSortKey = keyof typeof TRIAGE_SORTS;

function triageScoreFor(issue: GitHubIssue, sortKey: TriageSortKey): number | null {
  const raw = issue.triage?.raw;
  if (!raw) return null;
  if (sortKey === 'effort_asc') return raw.effortScore;
  if (sortKey === 'stale_desc') return raw.stalenessScore;
  if (sortKey === 'actionable_desc') return raw.actionableProbability;
  return null;
}

/** Untriaged issues always sort last — a null is absence of signal, not a zero. */
export function sortIssuesByTriage(issues: GitHubIssue[], sortKey: TriageSortKey): GitHubIssue[] {
  if (sortKey === 'none') return issues;

  const isDescending = sortKey !== 'effort_asc';

  return [...issues].sort((a, b) => {
    const scoreA = triageScoreFor(a, sortKey);
    const scoreB = triageScoreFor(b, sortKey);

    const aIsUnscored = typeof scoreA !== 'number';
    const bIsUnscored = typeof scoreB !== 'number';
    if (aIsUnscored && bIsUnscored) return 0;
    if (aIsUnscored) return 1;
    if (bIsUnscored) return -1;

    return isDescending ? scoreB - scoreA : scoreA - scoreB;
  });
}

/** Untriaged issues are always kept — hiding unjudged work is worse than an extra card. */
export function filterOutStale(issues: GitHubIssue[], hideStale: boolean): GitHubIssue[] {
  if (!hideStale) return issues;

  return issues.filter((issue) => {
    const chips = issue.triage?.chips;
    if (!chips) return true;
    return !chips.some((chip) => chip.label === 'STALE');
  });
}
