// All GitHub API calls are proxied through the backend server.
// The client sends a session ID; the server uses the stored GitHub token.

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || '';

export type GitHubLabel = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
};

export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: GitHubLabel[];
  repository_url: string;
  html_url: string;
  repository?: {
    full_name: string;
  };
  pull_request?: unknown;
  aiSummary?: string;
  body?: string;
  created_at?: string;
  user?: {
    login: string;
    avatar_url: string;
  };
};

const authHeaders = (sessionId: string) => ({
  'X-Session-Token': sessionId,
  'Content-Type': 'application/json',
});

/**
 * Fetches open GitHub issues assigned to the authenticated user.
 * 
 * @param sessionId - Session ID from authentication (used as X-Session-Token header)
 * @param repoFilter - Optional repository filter (format: "owner/repo")
 * @param labelFilter - Optional label filter (comma-separated labels)
 * @returns Promise resolving to array of GitHub issues (pull requests excluded)
 * @throws Error if session is expired (401), repository not found (404), or fetch fails
 * 
 * @example
 * // Fetch all assigned issues
 * const issues = await fetchIssues(sessionId);
 * 
 * @example
 * // Fetch issues from a specific repository
 * const issues = await fetchIssues(sessionId, "octocat/Hello-World");
 * 
 * @example
 * // Fetch issues with specific labels
 * const issues = await fetchIssues(sessionId, undefined, "bug,help-wanted");
 */
export async function fetchIssues(sessionId: string, repoFilter?: string, labelFilter?: string): Promise<GitHubIssue[]> {
  const params = new URLSearchParams();
  if (repoFilter) params.set('repo', repoFilter);
  if (labelFilter) params.set('labels', labelFilter);

  const url = `${BACKEND_URL}/api/issues?${params}`;

  const response = await fetch(url, {
    headers: authHeaders(sessionId),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please sign in again.');
  }
  if (response.status === 404) {
    throw new Error('Repository not found or you lack access.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch issues.');
  }

  return response.json();
}

/**
 * Updates the state of a GitHub issue (open/closed).
 * 
 * @param sessionId - Session ID from authentication (used as X-Session-Token header)
 * @param issue - Issue object containing number and repository_url
 * @param state - Target state: "open" to reopen, "closed" to close
 * @returns Promise resolving to the updated GitHub issue
 * @throws Error if session is expired, user lacks permission, or update fails
 * 
 * @example
 * // Close an issue
 * const updated = await updateIssueState(sessionId, issue, "closed");
 * 
 * @example
 * // Reopen an issue
 * const updated = await updateIssueState(sessionId, issue, "open");
 */
export async function updateIssueState(
  sessionId: string,
  issue: Pick<GitHubIssue, 'number' | 'repository_url'>,
  state: 'open' | 'closed'
) {
  const repoPath = extractRepoPath(issue.repository_url);
  const url = `${BACKEND_URL}/api/issues/${repoPath}/${issue.number}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(sessionId),
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Unable to set issue to ${state}.`);
  }

  return (await response.json()) as GitHubIssue;
}

/**
 * Extracts the repository path (owner/repo) from a GitHub API repository URL.
 * 
 * @param repositoryUrl - Full GitHub API URL (e.g., "https://api.github.com/repos/owner/repo")
 * @returns Repository path in "owner/repo" format
 * 
 * @example
 * extractRepoPath("https://api.github.com/repos/octocat/Hello-World")
 * // Returns: "octocat/Hello-World"
 */
export function extractRepoPath(repositoryUrl: string) {
  const marker = '/repos/';
  const markerIndex = repositoryUrl.indexOf(marker);
  const hasMarker = markerIndex !== -1;
  if (!hasMarker) return repositoryUrl;

  const startOfRepoPath = markerIndex + marker.length;
  return repositoryUrl.slice(startOfRepoPath);
}
