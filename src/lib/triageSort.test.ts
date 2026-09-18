import { sortIssuesByTriage, filterOutStale, TRIAGE_SORTS } from './triageSort';
import type { GitHubIssue } from '../api/github';

function makeIssue(
  id: number,
  triage?: { effort?: number; staleness?: number; actionable?: number; stale?: boolean }
): GitHubIssue {
  const base = { id, number: id, title: `Issue ${id}` } as GitHubIssue;
  if (!triage) return base;

  const chips = triage.stale ? [{ label: 'STALE', tone: 'danger' as const }] : [];
  return {
    ...base,
    triage: {
      badge: { label: 'READY', tone: 'success', suggests: 'keep' },
      chips,
      raw: {
        action: 'implement',
        actionConfidence: 0.9,
        stalenessScore: triage.staleness ?? null,
        effortScore: triage.effort ?? null,
        actionableProbability: triage.actionable ?? null,
      },
    },
  };
}

const idsOf = (issues: GitHubIssue[]) => issues.map((i) => i.id);

describe('sortIssuesByTriage (AAA)', () => {
  it('leaves the deck untouched for the none sort (Arrange/Act/Assert)', () => {
    // Arrange
    const issues = [makeIssue(1, { effort: 3 }), makeIssue(2, { effort: 0 })];

    // Act
    const sorted = sortIssuesByTriage(issues, 'none');

    // Assert
    expect(idsOf(sorted)).toEqual([1, 2]);
  });

  it('puts the smallest effort first for quick wins (Arrange/Act/Assert)', () => {
    // Arrange
    const issues = [makeIssue(1, { effort: 3 }), makeIssue(2, { effort: 0.5 }), makeIssue(3, { effort: 2 })];

    // Act
    const sorted = sortIssuesByTriage(issues, 'effort_asc');

    // Assert
    expect(idsOf(sorted)).toEqual([2, 3, 1]);
  });

  it('puts the most stale first (Arrange/Act/Assert)', () => {
    // Arrange
    const issues = [makeIssue(1, { staleness: 0.2 }), makeIssue(2, { staleness: 2.9 }), makeIssue(3, { staleness: 1.5 })];

    // Act
    const sorted = sortIssuesByTriage(issues, 'stale_desc');

    // Assert
    expect(idsOf(sorted)).toEqual([2, 3, 1]);
  });

  it('puts the most actionable first (Arrange/Act/Assert)', () => {
    // Arrange
    const issues = [makeIssue(1, { actionable: 0.1 }), makeIssue(2, { actionable: 0.95 })];

    // Act
    const sorted = sortIssuesByTriage(issues, 'actionable_desc');

    // Assert
    expect(idsOf(sorted)).toEqual([2, 1]);
  });

  it('sorts untriaged issues last, not first (Arrange/Act/Assert)', () => {
    // Arrange — a null is absence of signal, not a zero. Treating it as 0 would
    // put every unscored issue at the head of an "easiest first" list.
    const issues = [makeIssue(1), makeIssue(2, { effort: 2 }), makeIssue(3, { effort: 0 })];

    // Act
    const sorted = sortIssuesByTriage(issues, 'effort_asc');

    // Assert
    expect(idsOf(sorted)).toEqual([3, 2, 1]);
  });

  it('sorts untriaged last for descending orders too (Arrange/Act/Assert)', () => {
    // Arrange
    const issues = [makeIssue(1), makeIssue(2, { staleness: 2.5 })];

    // Act
    const sorted = sortIssuesByTriage(issues, 'stale_desc');

    // Assert
    expect(idsOf(sorted)).toEqual([2, 1]);
  });

  it('does not mutate the input array (Arrange/Act/Assert)', () => {
    // Arrange
    const issues = [makeIssue(1, { effort: 3 }), makeIssue(2, { effort: 0 })];

    // Act
    sortIssuesByTriage(issues, 'effort_asc');

    // Assert
    expect(idsOf(issues)).toEqual([1, 2]);
  });

  it('exposes a human label for every sort key (Arrange/Act/Assert)', () => {
    // Arrange & Act
    const entries = Object.entries(TRIAGE_SORTS);

    // Assert
    expect(entries.length).toBeGreaterThan(1);
    for (const [, label] of entries) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe('filterOutStale (AAA)', () => {
  it('returns everything when the filter is off (Arrange/Act/Assert)', () => {
    // Arrange
    const issues = [makeIssue(1, { stale: true }), makeIssue(2)];

    // Act
    const filtered = filterOutStale(issues, false);

    // Assert
    expect(idsOf(filtered)).toEqual([1, 2]);
  });

  it('drops issues carrying the STALE chip (Arrange/Act/Assert)', () => {
    // Arrange — the server already applied the staleness threshold, so the
    // client filters on the outcome rather than re-deriving it
    const issues = [makeIssue(1, { stale: true }), makeIssue(2, { stale: false })];

    // Act
    const filtered = filterOutStale(issues, true);

    // Assert
    expect(idsOf(filtered)).toEqual([2]);
  });

  it('keeps untriaged issues even when filtering (Arrange/Act/Assert)', () => {
    // Arrange — hiding unjudged work is worse than showing an extra card
    const issues = [makeIssue(1), makeIssue(2, { stale: true })];

    // Act
    const filtered = filterOutStale(issues, true);

    // Assert
    expect(idsOf(filtered)).toEqual([1]);
  });
});
