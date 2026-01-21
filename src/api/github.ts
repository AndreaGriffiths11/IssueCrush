const API_ROOT = 'https://api.github.com';

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
};

const defaultHeaders = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
});

export async function fetchIssues(token: string, repoFilter?: string): Promise<GitHubIssue[]> {
  const url = repoFilter
    ? `${API_ROOT}/repos/${repoFilter}/issues?state=open&per_page=100`
    : `${API_ROOT}/issues?state=open&per_page=100`;

  const response = await fetch(url, {
    headers: defaultHeaders(token),
  });

  if (response.status === 404) {
    throw new Error('Repository not found or you lack access.');
  }

  if (response.status === 401) {
    throw new Error('Unauthorized. Please sign in again.');
  }

  if (!response.ok) {
    const message = await safeMessage(response);
    throw new Error(message || 'Failed to fetch issues.');
  }

  const data = (await response.json()) as GitHubIssue[];
  return data.filter((issue) => !issue.pull_request);
}

export async function updateIssueState(
  token: string,
  issue: Pick<GitHubIssue, 'number' | 'repository_url'>,
  state: 'open' | 'closed'
) {
  const repoPath = extractRepoPath(issue.repository_url);
  const endpoint = `${API_ROOT}/repos/${repoPath}/issues/${issue.number}`;

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      ...defaultHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    const message = await safeMessage(response);
    throw new Error(message || `Unable to set issue to ${state}.`);
  }

  return (await response.json()) as GitHubIssue;
}

export function extractRepoPath(repositoryUrl: string) {
  const marker = '/repos/';
  const idx = repositoryUrl.indexOf(marker);
  if (idx === -1) return repositoryUrl;
  return repositoryUrl.slice(idx + marker.length);
}

async function safeMessage(response: Response) {
  try {
    const body = await response.json();
    return body?.message as string | undefined;
  } catch {
    return undefined;
  }
}
