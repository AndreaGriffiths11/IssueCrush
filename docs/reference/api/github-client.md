# GitHub Client API Reference

API for interacting with GitHub via the backend proxy.

## Module: `src/api/github.ts`

All GitHub API calls are proxied through the backend server. The client sends a session ID; the server uses the stored GitHub token.

## Types

### GitHubLabel

````typescript
type GitHubLabel = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
};
````

### GitHubIssue

````typescript
type GitHubIssue = {
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
````

## Functions

### fetchIssues

Fetches GitHub issues for the authenticated user.

````typescript
async function fetchIssues(
  sessionId: string,
  repoFilter?: string,
  labelFilter?: string
): Promise<GitHubIssue[]>
````

**Parameters:**
- `sessionId` - Session ID from `useAuth`
- `repoFilter` - (optional) Repository in `owner/repo` format
- `labelFilter` - (optional) Label name

**Returns:** Array of GitHub issues

**Throws:**
- `"Session expired. Please sign in again."` (401)
- `"Repository not found or you lack access."` (404)
- `"Failed to fetch issues."` (other errors)

### updateIssueState

Updates an issue's state (open/closed).

````typescript
async function updateIssueState(
  sessionId: string,
  issue: Pick<GitHubIssue, 'number' | 'repository_url'>,
  state: 'open' | 'closed'
): Promise<GitHubIssue>
````

**Parameters:**
- `sessionId` - Session ID
- `issue` - Issue object (only `number` and `repository_url` required)
- `state` - New state (`'open'` or `'closed'`)

**Returns:** Updated issue object

**Throws:**
- Error message from backend if request fails

### extractRepoPath

Extracts repository path from GitHub API repository URL.

````typescript
function extractRepoPath(repositoryUrl: string): string
````

**Example:**
````typescript
const url = 'https://api.github.com/repos/facebook/react';
const path = extractRepoPath(url);
// Returns: 'facebook/react'
````

## Related Documentation

- [Hooks API Reference](./hooks.md)
- [Backend Endpoints Reference](./backend-endpoints.md)
