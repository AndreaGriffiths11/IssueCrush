# Frontend API Reference

This document describes the TypeScript APIs available in the IssueCrush frontend application.

## Table of Contents

- [GitHub API Client](#github-api-client)
- [Token Storage](#token-storage)
- [Copilot Service](#copilot-service)
- [Custom Hooks](#custom-hooks)
- [Theme System](#theme-system)
- [Utilities](#utilities)

---

## GitHub API Client

**Module:** `src/api/github.ts`

The GitHub API client handles all communication with the backend server for GitHub operations.

### Types

#### `GitHubLabel`

Represents a GitHub issue label.

````typescript
type GitHubLabel = {
  id: number;
  name: string;
  color: string;  // Hex color without #
  description?: string | null;
};
````

#### `GitHubIssue`

Represents a GitHub issue with all its metadata.

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

### Functions

#### `fetchIssues()`

Fetches issues from GitHub via the backend API.

**Signature:**
````typescript
async function fetchIssues(
  sessionId: string,
  repoFilter?: string,
  labelFilter?: string
): Promise<GitHubIssue[]>
````

**Parameters:**
- `sessionId` - User's session ID stored in secure storage
- `repoFilter` (optional) - Repository in format `owner/repo` to filter issues
- `labelFilter` (optional) - Comma-separated label names to filter by

**Returns:**  
Array of GitHub issues matching the filters.

**Throws:**
- `Error` with message "Session expired. Please sign in again." if session is invalid (401)
- `Error` with message "Repository not found or you lack access." if repo doesn't exist (404)
- `Error` with backend error message for other failures

**Example:**
````typescript
import { fetchIssues } from './src/api/github';

const issues = await fetchIssues(sessionId, 'owner/repo', 'bug,help wanted');
````

---

#### `updateIssueState()`

Opens or closes a GitHub issue.

**Signature:**
````typescript
async function updateIssueState(
  sessionId: string,
  issue: Pick<GitHubIssue, 'number' | 'repository_url'>,
  state: 'open' | 'closed'
): Promise<GitHubIssue>
````

**Parameters:**
- `sessionId` - User's session ID
- `issue` - Object containing issue `number` and `repository_url`
- `state` - New state: `'open'` or `'closed'`

**Returns:**  
The updated issue object.

**Throws:**
- `Error` if the update fails

**Example:**
````typescript
await updateIssueState(sessionId, { number: 42, repository_url: '...' }, 'closed');
````

---

#### `extractRepoPath()`

Extracts the `owner/repo` path from a GitHub API repository URL.

**Signature:**
````typescript
function extractRepoPath(repositoryUrl: string): string
````

**Parameters:**
- `repositoryUrl` - GitHub API URL like `https://api.github.com/repos/owner/repo`

**Returns:**  
The `owner/repo` portion of the URL.

**Example:**
````typescript
const path = extractRepoPath('https://api.github.com/repos/owner/repo');
// Returns: 'owner/repo'
````

---

## Token Storage

**Module:** `src/lib/tokenStorage.ts`

Secure storage for the user's session ID. Uses `expo-secure-store` on mobile and `AsyncStorage` on web.

> **Note:** The session ID is NOT the GitHub token. The actual GitHub token is stored server-side for security.

### Functions

#### `saveToken()`

Saves the session ID to secure storage.

**Signature:**
````typescript
async function saveToken(sessionId: string): Promise<void>
````

**Parameters:**
- `sessionId` - The opaque session ID returned from `/api/github-token`

---

#### `getToken()`

Retrieves the session ID from secure storage.

**Signature:**
````typescript
async function getToken(): Promise<string | null>
````

**Returns:**  
The session ID, or `null` if not found.

---

#### `deleteToken()`

Removes the session ID from secure storage.

**Signature:**
````typescript
async function deleteToken(): Promise<void>
````

---

## Copilot Service

**Module:** `src/lib/copilotService.ts`

Service for generating AI-powered issue summaries using GitHub Copilot.

### Types

#### `SummaryResult`

Result from an AI summary request.

````typescript
interface SummaryResult {
  summary: string;
  fallback?: boolean;        // True if using fallback mode
  requiresCopilot?: boolean; // True if Copilot subscription is required
}
````

### Class: `CopilotService`

#### `initialize()`

Checks if the backend server is available.

**Signature:**
````typescript
async initialize(): Promise<{ copilotMode: string }>
````

**Throws:**
- `Error` if the backend is unavailable

---

#### `summarizeIssue()`

Generates an AI summary for a GitHub issue.

**Signature:**
````typescript
async summarizeIssue(issue: GitHubIssue): Promise<SummaryResult>
````

**Parameters:**
- `issue` - The GitHub issue to summarize

**Returns:**  
A `SummaryResult` with the generated summary.

**Throws:**
- `Error` with message "No session available — please sign in" if not authenticated
- `Error` with message "Session expired. Please sign in again." for 401 responses
- `Error` for other failures

**Example:**
````typescript
import { copilotService } from './src/lib/copilotService';

const result = await copilotService.summarizeIssue(issue);
console.log(result.summary);
````

---

## Custom Hooks

**Module:** `src/hooks/`

### `useAuth()`

**Module:** `src/hooks/useAuth.ts`

Manages GitHub OAuth authentication flow and session state.

**Returns:**
````typescript
{
  token: string | null;          // Current session ID
  authError: string;             // Authentication error message
  setAuthError: (error: string) => void;
  copilotAvailable: boolean | null;  // Whether Copilot is available
  startLogin: () => Promise<void>;   // Initiates OAuth flow
  signOut: () => Promise<void>;      // Signs out and destroys session
}
````

**Features:**
- Handles OAuth flow for both web and mobile platforms
- Web: Redirects to GitHub authorization page
- Mobile: Opens in-app browser with `expo-web-browser`
- Automatically hydrates session from storage on mount
- Handles OAuth callback on web

**Example:**
````typescript
import { useAuth } from './src/hooks/useAuth';

function MyComponent() {
  const { token, startLogin, signOut } = useAuth();

  if (!token) {
    return <Button onPress={startLogin} title="Sign In" />;
  }

  return <Button onPress={signOut} title="Sign Out" />;
}
````

---

### `useIssues()`

**Module:** `src/hooks/useIssues.ts`

Manages GitHub issues state, including fetching, filtering, and updating.

**Parameters:**
- `token: string | null` - User's session ID

**Returns:**
````typescript
{
  issues: GitHubIssue[];
  loading: boolean;
  error: string;
  repoFilter: string;
  labelFilter: string;
  setRepoFilter: (filter: string) => void;
  setLabelFilter: (filter: string) => void;
  refreshIssues: () => Promise<void>;
  removeIssue: (issueId: number) => void;
  updateLocalIssueState: (issueId: number, state: 'open' | 'closed') => void;
}
````

**Features:**
- Fetches issues on mount when token is available
- Supports repository and label filtering
- Provides local state updates for optimistic UI
- Handles loading and error states

---

### `useAnimations()`

**Module:** `src/hooks/useAnimations.ts`

Manages all UI animations in the application.

**Parameters:**
````typescript
(
  theme: Theme,
  feedback: string,
  currentIndex: number,
  issuesLength: number,
  inputFocused: boolean
)
````

**Returns:**
````typescript
{
  // Animated styles for various UI elements
  overlayAnimatedStyle: any;
  confettiAnimatedStyle: any;
  stampAnimatedStyle: any;
  closeStampOpacity: SharedValue<number>;
  keepStampOpacity: SharedValue<number>;
  // ... additional animation properties
}
````

---

## Theme System

**Module:** `src/theme/`

### Types

#### `Theme`

Theme configuration object.

````typescript
type Theme = {
  bg: string;           // Background color
  bgSecondary: string;  // Secondary background
  surface: string;      // Surface color
  text: string;         // Primary text color
  textSecondary: string;
  border: string;
  accent: string;       // Accent/brand color
  success: string;
  error: string;
  // ... additional color properties
};
````

#### `ThemeMode`

````typescript
type ThemeMode = 'light' | 'dark' | 'system';
````

### Constants

- `lightTheme` - Pre-configured light theme
- `darkTheme` - Pre-configured dark theme

### Hooks

#### `useTheme()`

**Module:** `src/theme/ThemeContext.tsx`

Access the current theme and theme controls.

**Returns:**
````typescript
{
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}
````

---

## Utilities

### `getLabelColor()`

**Module:** `src/utils/colors.ts`

Converts a GitHub label hex color to a usable color string.

**Signature:**
````typescript
function getLabelColor(hex: string): string
````

**Parameters:**
- `hex` - Hex color code (with or without `#`)

**Returns:**  
Formatted hex color string with `#`.

**Example:**
````typescript
const color = getLabelColor('ff0000');
// Returns: '#ff0000'
````

---

## Error Handling

All async API functions follow a consistent error handling pattern:

1. **Authentication Errors (401)**: Throw with message about expired session
2. **Not Found (404)**: Throw with message about missing resource
3. **Other Errors**: Throw with backend error message or generic failure message

**Best Practice:**
````typescript
try {
  const issues = await fetchIssues(sessionId);
} catch (error) {
  if (error.message.includes('Session expired')) {
    // Prompt user to sign in again
    signOut();
  } else {
    // Display error message
    setError(error.message);
  }
}
````

---

## Security Notes

- **Session IDs**: The frontend only stores an opaque session ID, never the actual GitHub token
- **Token Storage**: Uses platform-appropriate secure storage (`expo-secure-store` on mobile, `AsyncStorage` on web)
- **API Proxy**: All GitHub API calls are proxied through the backend to keep the client secret secure
- **Authentication Headers**: Uses `X-Session-Token` header for all authenticated requests

---

## See Also

- [Backend API Reference](./backend-api.md) - Azure Functions API endpoints
- [Architecture Guide](../architecture/oauth-flow.md) - OAuth and session architecture
- [Deployment Guide](../guides/azure-deployment.md) - Deploying to production
