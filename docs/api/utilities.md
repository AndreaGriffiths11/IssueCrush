# Utilities API Reference

This document describes utility modules and services used in IssueCrush.

## Table of Contents

- [GitHub API Client](#github-api-client)
- [Copilot Service](#copilot-service)
- [Token Storage](#token-storage)
- [Color Utilities](#color-utilities)

---

## GitHub API Client

Module for interacting with GitHub Issues API via backend proxy.

**File**: `src/api/github.ts`

### Overview

All GitHub API calls are proxied through the backend server. The client sends a session ID via the `X-Session-Token` header, and the server uses the stored GitHub token to make authenticated requests.

### Types

#### GitHubLabel

````typescript
type GitHubLabel = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
};
````

#### GitHubIssue

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
  aiSummary?: string;         // Added by frontend after AI call
  body?: string;
  created_at?: string;
  user?: {
    login: string;
    avatar_url: string;
  };
};
````

### Functions

#### fetchIssues

Fetches issues from GitHub API with optional filters.

````typescript
async function fetchIssues(
  sessionId: string,
  repoFilter?: string,
  labelFilter?: string
): Promise<GitHubIssue[]>
````

**Parameters:**
- `sessionId` - Session token from `useAuth()`
- `repoFilter` - Optional repository filter (e.g., `"owner/repo"`)
- `labelFilter` - Optional comma-separated labels (e.g., `"bug,enhancement"`)

**Returns**: Array of open issues

**Throws**:
- `"Session expired. Please sign in again."` - 401 Unauthorized
- `"Repository not found or you lack access."` - 404 Not Found
- `"Failed to fetch issues."` - Other errors

**Example:**

````typescript
const issues = await fetchIssues(sessionId, 'facebook/react', 'bug');
// Fetches open issues in facebook/react with label "bug"
````

---

#### updateIssueState

Opens or closes a GitHub issue.

````typescript
async function updateIssueState(
  sessionId: string,
  issue: Pick<GitHubIssue, 'number' | 'repository_url'>,
  state: 'open' | 'closed'
): Promise<GitHubIssue>
````

**Parameters:**
- `sessionId` - Session token
- `issue` - Issue object (only `number` and `repository_url` required)
- `state` - Target state: `'open'` or `'closed'`

**Returns**: Updated issue object

**Throws**: Error with message from API or `"Unable to set issue to {state}."`

**Example:**

````typescript
await updateIssueState(sessionId, issue, 'closed');
// Closes the issue
````

---

#### extractRepoPath

Extracts "owner/repo" from GitHub repository URL.

````typescript
function extractRepoPath(repositoryUrl: string): string
````

**Parameters:**
- `repositoryUrl` - GitHub API repository URL (e.g., `"https://api.github.com/repos/owner/repo"`)

**Returns**: Repository path (e.g., `"owner/repo"`)

**Example:**

````typescript
const repoPath = extractRepoPath('https://api.github.com/repos/facebook/react');
// Returns: "facebook/react"
````

---

## Copilot Service

Service for requesting AI summaries of GitHub issues using the GitHub Copilot SDK.

**File**: `src/lib/copilotService.ts`

### Overview

The `CopilotService` class provides methods to check backend health and generate AI summaries for issues. All requests are proxied through the backend `/api/ai-summary` endpoint.

### Types

#### SummaryResult

````typescript
interface SummaryResult {
  summary: string;
  fallback?: boolean;         // True if using fallback mode (no Copilot)
  requiresCopilot?: boolean;  // True if Copilot subscription is needed
}
````

### Class: CopilotService

#### initialize()

Checks backend health and Copilot availability.

````typescript
async initialize(): Promise<{ copilotMode: string }>
````

**Returns**: Object with `copilotMode` string (`"copilot"`, `"fallback"`, or `"unknown"`)

**Throws**: `"Backend server not available"` if connection fails

**Example:**

````typescript
const { copilotMode } = await copilotService.initialize();
if (copilotMode === 'copilot') {
  console.log('AI summaries powered by GitHub Copilot');
}
````

---

#### summarizeIssue()

Generates an AI summary for a GitHub issue.

````typescript
async summarizeIssue(issue: GitHubIssue): Promise<SummaryResult>
````

**Parameters:**
- `issue` - GitHub issue object to summarize

**Returns**: `SummaryResult` object with summary text and metadata

**Throws**:
- `"No session available — please sign in"` - No token in storage
- `"Session expired. Please sign in again."` - 401 Unauthorized
- `"Failed to generate summary"` - Other errors

**Behavior**:
- Reads session token from storage via `getToken()`
- Sends issue to `/api/ai-summary` endpoint
- Returns Copilot-generated summary if available
- Returns error message if Copilot subscription required (status 403)

**Example:**

````typescript
try {
  const result = await copilotService.summarizeIssue(issue);
  
  if (result.requiresCopilot) {
    console.log('Copilot subscription required');
  } else {
    console.log('Summary:', result.summary);
  }
} catch (error) {
  console.error('AI summary failed:', error.message);
}
````

---

### Singleton Instance

````typescript
export const copilotService = new CopilotService();
````

Use the exported singleton instance rather than creating new instances.

---

## Token Storage

Secure storage for session tokens with platform-specific implementations.

**File**: `src/lib/tokenStorage.ts`

### Overview

Stores the opaque session ID (not the GitHub token). The actual GitHub token lives server-side in Cosmos DB. Uses `expo-secure-store` on mobile and `@react-native-async-storage/async-storage` on web.

### Constants

````typescript
const SESSION_KEY = 'issuecrush-session-id';
````

### Functions

#### saveToken

Saves session ID to secure storage.

````typescript
async function saveToken(sessionId: string): Promise<void>
````

**Parameters:**
- `sessionId` - Opaque session ID from backend

**Platform Behavior**:
- **Web**: Uses `AsyncStorage.setItem()`
- **Mobile**: Uses `SecureStore.setItemAsync()` (encrypted storage)

**Example:**

````typescript
await saveToken('abc123def456');
````

---

#### getToken

Retrieves session ID from storage.

````typescript
async function getToken(): Promise<string | null>
````

**Returns**: Session ID or `null` if not found

**Platform Behavior**:
- **Web**: Uses `AsyncStorage.getItem()`
- **Mobile**: Uses `SecureStore.getItemAsync()`

**Example:**

````typescript
const sessionId = await getToken();
if (sessionId) {
  console.log('User is signed in');
}
````

---

#### deleteToken

Removes session ID from storage (sign out).

````typescript
async function deleteToken(): Promise<void>
````

**Platform Behavior**:
- **Web**: Uses `AsyncStorage.removeItem()`
- **Mobile**: Uses `SecureStore.deleteItemAsync()`

**Example:**

````typescript
await deleteToken();
// User is now signed out locally
````

---

## Color Utilities

Helper functions for color manipulation.

**File**: `src/utils/colors.ts`

### getLabelColor

Determines appropriate text color (light/dark) for a given background color.

````typescript
function getLabelColor(hex: string): string
````

**Parameters:**
- `hex` - Hex color code without `#` (e.g., `"ff0000"`)

**Returns**: `"#ffffff"` (white) or `"#000000"` (black)

**Algorithm**: Uses relative luminance calculation to determine contrast

**Example:**

````typescript
const textColor = getLabelColor('ff0000');
// Returns: "#ffffff" (white text on red background)

const textColor2 = getLabelColor('ffff00');
// Returns: "#000000" (black text on yellow background)
````

---

## Helper Utilities

Additional utility functions exported from `src/utils/index.ts`.

### webCursor

Returns cursor style object for web platform, no-op on mobile.

````typescript
function webCursor(cursor: string): any
````

**Parameters:**
- `cursor` - CSS cursor value (e.g., `"pointer"`, `"default"`)

**Returns**: `{ cursor, touchAction: 'pan-y' }` on web, `{}` on mobile

**Example:**

````typescript
<TouchableOpacity style={[styles.button, webCursor('pointer')]}>
  <Text>Click Me</Text>
</TouchableOpacity>
````

---

### isWeb

Constant boolean indicating web platform.

````typescript
const isWeb: boolean = Platform.OS === 'web';
````

**Example:**

````typescript
if (isWeb) {
  // Web-specific code
  window.location.href = '/home';
}
````

---

## Backend API Endpoints

The frontend communicates with these backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/github-token` | POST | Exchange OAuth code for session token |
| `/api/issues` | GET | Fetch issues (with optional filters) |
| `/api/issues/:owner/:repo/:number` | PATCH | Update issue state |
| `/api/ai-summary` | POST | Generate AI summary for issue |
| `/api/health` | GET | Check backend health and Copilot status |
| `/api/logout` | POST | Invalidate session (sign out) |

All authenticated endpoints require `X-Session-Token` header with session ID.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | Yes |
| `EXPO_PUBLIC_GITHUB_CLIENT_ID` | GitHub OAuth App client ID | Yes |
| `EXPO_PUBLIC_GITHUB_SCOPE` | OAuth scope (default: `repo`) | No |
| `EXPO_PUBLIC_REDIRECT_URI` | OAuth redirect URI (web only) | No |

---

## See Also

- [Hooks API](./hooks.md)
- [Components API](./components.md)
- [Architecture Guide](../guides/architecture.md)
