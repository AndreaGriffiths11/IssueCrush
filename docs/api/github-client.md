# GitHub API Client

The GitHub API client (`src/api/github.ts`) provides a typed interface for fetching and updating GitHub issues. All requests are proxied through the backend server to keep GitHub tokens secure.

## Overview

- **Location**: `src/api/github.ts`
- **Purpose**: Fetch issues, update issue state (open/closed)
- **Authentication**: Session-based via `X-Session-Token` header
- **Backend URL**: Set via `EXPO_PUBLIC_API_URL` environment variable

## Types

### `GitHubLabel`

````typescript
type GitHubLabel = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
};
````

### `GitHubIssue`

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
  aiSummary?: string;        // Added by frontend after AI summary
  body?: string;
  created_at?: string;
  user?: {
    login: string;
    avatar_url: string;
  };
};
````

## Functions

### `fetchIssues()`

Fetches open GitHub issues for the authenticated user with optional filtering.

````typescript
async function fetchIssues(
  sessionId: string,
  repoFilter?: string,
  labelFilter?: string
): Promise<GitHubIssue[]>
````

**Parameters:**
- `sessionId` - Session token obtained after authentication
- `repoFilter` - (Optional) Filter by repository, e.g., `"owner/repo"`
- `labelFilter` - (Optional) Filter by label name, e.g., `"bug"`

**Returns:** Array of open issues

**Errors:**
- `401` - Session expired, user needs to re-authenticate
- `404` - Repository not found or no access
- Other errors include descriptive message from server

**Example:**

````typescript
import { fetchIssues } from './api/github';

// Fetch all issues
const allIssues = await fetchIssues(sessionId);

// Fetch issues from specific repo
const repoIssues = await fetchIssues(sessionId, 'facebook/react');

// Fetch issues with specific label
const bugs = await fetchIssues(sessionId, undefined, 'bug');
````

---

### `updateIssueState()`

Updates an issue's state (open or closed).

````typescript
async function updateIssueState(
  sessionId: string,
  issue: Pick<GitHubIssue, 'number' | 'repository_url'>,
  state: 'open' | 'closed'
): Promise<GitHubIssue>
````

**Parameters:**
- `sessionId` - Session token
- `issue` - Issue object with `number` and `repository_url`
- `state` - Target state: `'open'` or `'closed'`

**Returns:** Updated issue object

**Errors:**
- Throws error with descriptive message on failure

**Example:**

````typescript
import { updateIssueState } from './api/github';

// Close an issue
const closedIssue = await updateIssueState(
  sessionId,
  { number: 123, repository_url: 'https://api.github.com/repos/owner/repo' },
  'closed'
);

// Reopen an issue
const reopenedIssue = await updateIssueState(
  sessionId,
  issue,
  'open'
);
````

---

### `extractRepoPath()`

Extracts the `owner/repo` path from a GitHub repository URL.

````typescript
function extractRepoPath(repositoryUrl: string): string
````

**Parameters:**
- `repositoryUrl` - GitHub API repository URL (e.g., `https://api.github.com/repos/owner/repo`)

**Returns:** Repository path (e.g., `owner/repo`)

**Example:**

````typescript
import { extractRepoPath } from './api/github';

const url = 'https://api.github.com/repos/facebook/react';
const path = extractRepoPath(url);
// => 'facebook/react'
````

## Architecture Notes

### Why Proxy Through Backend?

All GitHub API calls are proxied through the backend server for security:

1. **Token Security** - GitHub access tokens stay server-side in Cosmos DB
2. **Session-Based Auth** - Client only stores an opaque session ID
3. **CORS Handling** - Server handles CORS and rate limiting
4. **Unified Auth** - Works consistently across web and mobile

### Request Flow

````
Client                    Server                    GitHub API
  │                         │                           │
  │ fetchIssues(sessionId)  │                           │
  ├────────────────────────>│                           │
  │                         │ GET /user/issues         │
  │                         │ (with stored token)       │
  │                         ├──────────────────────────>│
  │                         │                           │
  │                         │<──────────────────────────┤
  │<────────────────────────┤                           │
  │   [GitHubIssue[]]       │                           │
````

### Error Handling

The client provides specific error messages for common scenarios:

- **401**: Session expired → triggers re-authentication flow
- **404**: Repository not found → user may need to adjust filter
- **Other errors**: Descriptive message from server response

Always wrap API calls in try-catch:

````typescript
try {
  const issues = await fetchIssues(sessionId, repoFilter);
  // Handle success
} catch (error) {
  // Show error message to user
  setFeedback(error.message);
}
````

## Testing

See `src/api/github.test.ts` for unit tests and mock examples.

## Related

- [Server Endpoints](./server-endpoints.md) - Backend API implementation
- [useIssues Hook](../hooks/README.md#useissues) - Issues management hook that uses this client
