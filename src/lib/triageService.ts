import type { GitHubIssue } from '../api/github';
import { getToken } from './tokenStorage';

/** Visual tone for a badge or chip. Mapped to theme colors by the card. */
export type TriageTone = 'success' | 'warning' | 'danger' | 'neutral' | 'muted';

export interface TriageBadge {
  label: string;
  tone: TriageTone;
  /** Which swipe the model leans toward, or null when it has no clear read. */
  suggests: 'close' | 'keep' | null;
}

export interface TriageChip {
  label: string;
  tone: TriageTone;
}

/** Raw judgment values, kept so the UI can sort or filter without re-running inference. */
export interface TriageRaw {
  action: string | null;
  actionConfidence: number | null;
  stalenessScore: number | null;
  effortScore: number | null;
  actionableProbability: number | null;
}

export interface IssueTriage {
  badge: TriageBadge;
  chips: TriageChip[];
  raw: TriageRaw;
}

export interface TriageResult {
  triage?: IssueTriage;
  /** Set when the server has no TYPESAFE_API_KEY configured. Not an error. */
  unavailable?: boolean;
  message?: string;
}

/** Per-issue outcome from a batch run. One failure does not sink the others. */
export interface BatchTriageEntry {
  ok: boolean;
  triage?: IssueTriage;
  message?: string;
}

export interface BatchTriageResult {
  results?: Record<string, BatchTriageEntry>;
  /** How many issues the client asked for, before the server's cap. */
  requested?: number;
  /** How many the server actually attempted after capping. */
  attempted?: number;
  unavailable?: boolean;
  message?: string;
}

export class TriageService {
  private backendUrl = process.env.EXPO_PUBLIC_API_URL || '';

  async triageIssue(issue: GitHubIssue): Promise<TriageResult> {
    const sessionId = await getToken();

    if (!sessionId) {
      throw new Error('No session available — please sign in');
    }

    const response = await fetch(`${this.backendUrl}/api/triage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionId,
      },
      body: JSON.stringify({ issue }),
    });

    const data = await response.json();

    if (!response.ok) {
      const isUnauthorized = response.status === 401;
      if (isUnauthorized) {
        throw new Error('Session expired. Please sign in again.');
      }

      // A missing or rejected key is a configuration state, not a failure the
      // user can act on. Report it quietly so the rest of the app keeps working.
      const isUnconfigured = response.status === 503 && data.requiresTypeSafeKey;
      if (isUnconfigured) {
        const unavailableMessage = data.message || 'Structured triage is not configured.';
        return { unavailable: true, message: unavailableMessage };
      }

      throw new Error(data.error || 'Failed to triage issue');
    }

    return { triage: data.triage };
  }

  /**
   * Triage many issues in one request.
   *
   * Costs one API call per issue server-side, so this must only ever run from
   * an explicit user action — never on load.
   */
  async triageIssues(issues: GitHubIssue[]): Promise<BatchTriageResult> {
    const sessionId = await getToken();

    if (!sessionId) {
      throw new Error('No session available — please sign in');
    }

    const response = await fetch(`${this.backendUrl}/api/triage/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionId,
      },
      body: JSON.stringify({ issues }),
    });

    const data = await response.json();

    if (!response.ok) {
      const isUnauthorized = response.status === 401;
      if (isUnauthorized) {
        throw new Error('Session expired. Please sign in again.');
      }

      const isUnconfigured = response.status === 503 && data.requiresTypeSafeKey;
      if (isUnconfigured) {
        const unavailableMessage = data.message || 'Structured triage is not configured.';
        return { unavailable: true, message: unavailableMessage };
      }

      throw new Error(data.error || 'Failed to triage issues');
    }

    return { results: data.results, requested: data.requested, attempted: data.attempted };
  }
}

export const triageService = new TriageService();
