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
  Authorization: `Bearer ${sessionId}`,
  'Content-Type': 'application/json',
});

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

export function extractRepoPath(repositoryUrl: string) {
  const marker = '/repos/';
  const idx = repositoryUrl.indexOf(marker);
  if (idx === -1) return repositoryUrl;
  return repositoryUrl.slice(idx + marker.length);
}
