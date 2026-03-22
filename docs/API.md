# API Reference

IssueCrush provides both frontend APIs (hooks, components, utilities) and backend REST endpoints. This document covers both.

## Table of Contents

- [Backend REST API](#backend-rest-api)
  - [Authentication](#authentication)
  - [Health Check](#health-check)
  - [OAuth Token Exchange](#oauth-token-exchange)
  - [Issues](#issues)
  - [AI Summary](#ai-summary)
  - [Logout](#logout)
- [Frontend APIs](#frontend-apis)
  - [Hooks](#hooks)
  - [Components](#components)
  - [Utilities](#utilities)

---

## Backend REST API

All backend endpoints are served by Express (local dev) or Azure Functions (production). Base URL:
- Local: `http://localhost:3000`
- Production: `https://gray-water-08b04e810.6.azurestaticapps.net`

### Authentication

All authenticated endpoints require the `X-Session-Token` header with a session ID obtained from the OAuth flow.

````http
X-Session-Token: <session-id>
````

**Note:** Azure Static Web Apps intercepts the standard `Authorization` header, so we use `X-Session-Token` instead.

---

### Health Check

Check server status and Copilot availability.

**Endpoint:** `GET /api/health`

**Response:**
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "copilotMode": "github-token",
  "timestamp": "2026-03-22T17:00:00.000Z"
}
````

**Fields:**
- `status`: Always `"ok"` if server is responding
- `copilotAvailable`: Whether AI summaries are available (requires Copilot access)
- `copilotMode`: How Copilot is authenticated (`"github-token"`, `"copilot-pat"`, or `"none"`)
- `timestamp`: ISO 8601 timestamp of the response

---

### OAuth Token Exchange

Exchange a GitHub OAuth authorization code for a session ID.

**Endpoint:** `POST /api/github-token`

**Request Body:**
````json
{
  "code": "github_oauth_code"
}
````

**Success Response (200):**
````json
{
  "session_id": "sess_abc123..."
}
````

**Error Response (400/500):**
````json
{
  "error": "bad_verification_code",
  "error_description": "The code passed is incorrect or expired."
}
````

**Implementation Notes:**
- Exchanges the code with GitHub using the client secret (server-side only)
- Stores the resulting GitHub access token in Cosmos DB or in-memory session store
- Returns a session ID that the client uses for subsequent API calls
- Session expires after 24 hours (TTL enforced by Cosmos DB)

---

### Issues

#### List Issues

Fetch GitHub issues for the authenticated user.

**Endpoint:** `GET /api/issues`

**Query Parameters:**
- `repo` (optional): Filter by repository (format: `owner/repo`)
- `labels` (optional): Comma-separated label filter (e.g., `bug,enhancement`)

**Headers:**
````http
X-Session-Token: <session-id>
````

**Success Response (200):**
````json
[
  {
    "id": 123456789,
    "number": 42,
    "title": "Fix authentication bug",
    "state": "open",
    "html_url": "https://github.com/owner/repo/issues/42",
    "repository_url": "https://api.github.com/repos/owner/repo",
    "repository": {
      "full_name": "owner/repo"
    },
    "labels": [
      {
        "id": 1234,
        "name": "bug",
        "color": "d73a4a",
        "description": "Something isn't working"
      }
    ],
    "user": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/u/123456"
    },
    "body": "Issue description...",
    "created_at": "2026-03-20T10:00:00Z"
  }
]
````

**Error Responses:**
- `401 Unauthorized`: Session expired or invalid
- `404 Not Found`: Repository not found or no access
- `500 Internal Server Error`: GitHub API error

---

#### Update Issue State

Close or reopen a GitHub issue.

**Endpoint:** `PATCH /api/issues/:owner/:repo/:issue_number`

**Path Parameters:**
- `owner`: Repository owner
- `repo`: Repository name
- `issue_number`: Issue number

**Headers:**
````http
X-Session-Token: <session-id>
Content-Type: application/json
````

**Request Body:**
````json
{
  "state": "closed"
}
````

**Success Response (200):**
````json
{
  "id": 123456789,
  "number": 42,
  "title": "Fix authentication bug",
  "state": "closed",
  "html_url": "https://github.com/owner/repo/issues/42"
}
````

**Error Responses:**
- `401 Unauthorized`: Session expired or invalid
- `403 Forbidden`: No permission to modify issue (check OAuth scope includes `repo`)
- `404 Not Found`: Issue not found
- `500 Internal Server Error`: GitHub API error

---

### AI Summary

Generate an AI-powered summary of a GitHub issue using GitHub Copilot SDK.

**Endpoint:** `POST /api/ai-summary`

**Headers:**
````http
X-Session-Token: <session-id>
Content-Type: application/json
````

**Request Body:**
````json
{
  "issue": {
    "number": 42,
    "title": "Fix authentication bug",
    "body": "Issue description...",
    "state": "open",
    "labels": [{ "name": "bug" }],
    "user": { "login": "username" },
    "repository": { "full_name": "owner/repo" },
    "created_at": "2026-03-20T10:00:00Z"
  }
}
````

**Success Response (200):**
````json
{
  "summary": "This issue reports an authentication bug where users cannot log in after password reset. The problem appears to be related to session token expiration. Recommended action: Investigate the token refresh logic in the auth middleware."
}
````

**Copilot Required (403):**
````json
{
  "error": "Copilot access required",
  "message": "AI summaries require a GitHub Copilot subscription.",
  "requiresCopilot": true
}
````

**Fallback Response (200):**
If Copilot fails but not due to auth issues, returns a basic summary:
````json
{
  "summary": "Fix authentication bug\nLabels: bug\n\nIssue description...\n\nReview the full issue details to determine next steps.",
  "fallback": true
}
````

**Error Responses:**
- `400 Bad Request`: Missing issue data
- `401 Unauthorized`: Session expired or invalid
- `403 Forbidden`: Copilot subscription required

**Implementation Notes:**
- Uses the user's GitHub OAuth token (via `githubToken` option in CopilotClient)
- Creates a temporary Copilot session for each request
- Properly cleans up sessions and client connections
- Falls back to basic summary if Copilot fails (except for auth errors)
- Times out after 30 seconds

---

### Logout

Destroy the server-side session.

**Endpoint:** `POST /api/logout`

**Headers:**
````http
X-Session-Token: <session-id>
````

**Success Response (200):**
````json
{
  "message": "Logged out"
}
````

**Error Response (500):**
````json
{
  "error": "Failed to logout"
}
````

---

## Frontend APIs

### Hooks

#### `useAuth()`

Manages GitHub OAuth authentication flow and session state.

**Import:**
````typescript
import { useAuth } from './src/hooks/useAuth';
````

**Usage:**
````typescript
const {
  token,           // Session ID or null
  authError,       // Error message string
  setAuthError,    // Clear or set error
  copilotAvailable,// Boolean or null (loading)
  startLogin,      // Function to start OAuth flow
  signOut,         // Function to sign out
} = useAuth();
````

**Features:**
- Automatically hydrates session from secure storage on mount
- Handles OAuth callback on web (reads `?code=...` from URL)
- Supports both web flow (redirect) and mobile flow (WebBrowser)
- Checks Copilot availability on mount with retries
- Platform-aware redirect URI handling

**OAuth Scopes:**
- Default: `repo` (required to close issues)
- Do NOT use `public_repo` — it's read-only for public repos

---

#### `useIssues(token)`

Manages issue fetching, filtering, and state updates (close/reopen/undo).

**Import:**
````typescript
import { useIssues } from './src/hooks/useIssues';
````

**Parameters:**
- `token`: Session ID (from `useAuth()`)

**Returns:**
````typescript
{
  issues: GitHubIssue[],           // Current filtered issues
  loading: boolean,                // Initial load state
  error: string,                   // Error message
  repoFilter: string,              // Current repo filter
  labelFilter: string,             // Current label filter
  swiperRef: React.RefObject,      // Ref for Swiper component
  setRepoFilter: (filter: string) => void,
  setLabelFilter: (filter: string) => void,
  refreshIssues: () => Promise<void>,
  closeIssue: (issue: GitHubIssue) => Promise<void>,
  keepIssue: () => void,
  undoLastClose: () => Promise<void>,
}
````

**Features:**
- Automatically fetches issues when token or filters change
- Maintains undo stack for closed issues (max 10)
- Provides haptic feedback on mobile (iOS/Android only)
- Wires `swiperRef` for programmatic swipe control

**Haptic Patterns:**
- Swipe left (close): Heavy impact
- Swipe right (keep): Light impact
- Undo success: Success notification
- Undo failure: Error notification

---

#### `useAnimations(theme, feedback, currentIndex, issuesLength, inputFocused)`

Manages swipe feedback animations (stamp overlays, progress bar).

**Import:**
````typescript
import { useAnimations } from './src/hooks/useAnimations';
````

**Parameters:**
- `theme`: Theme object (from `useTheme()`)
- `feedback`: Feedback state (`'close'`, `'keep'`, or `''`)
- `currentIndex`: Current issue index
- `issuesLength`: Total number of issues
- `inputFocused`: Whether input is focused (affects keyboard shortcuts)

**Returns:**
````typescript
{
  overlayOpacity: Animated.Value,     // Opacity for stamp overlay
  overlayScale: Animated.Value,       // Scale for stamp overlay
  stampRotation: string,              // Rotation transform for stamp
  progressBarWidth: Animated.Value,   // Progress bar width (0-100%)
}
````

---

#### `useKeyboardShortcuts(config)`

Handles keyboard shortcuts for desktop.

**Import:**
````typescript
import { useKeyboardShortcuts } from './src/hooks/useKeyboardShortcuts';
````

**Parameters:**
````typescript
{
  onSwipeLeft: () => void,    // Close action
  onSwipeRight: () => void,   // Keep action
  onUndo: () => void,         // Undo action
  onRefresh: () => void,      // Refresh action
  onToggleHelp: () => void,   // Toggle help modal
  inputFocused: boolean,      // Disable shortcuts when true
}
````

**Keyboard Shortcuts:**
- `←` or `X`: Close issue (swipe left)
- `→` or `O`: Keep issue (swipe right)
- `U`: Undo last close
- `R`: Refresh issues
- `?`: Toggle keyboard shortcuts help

---

### Components

#### `<AuthScreen />`

OAuth login/logout UI with status messages.

**Import:**
````typescript
import { AuthScreen } from './src/components/AuthScreen';
````

**Props:**
````typescript
{
  onLoginPress: () => void,
  onLogoutPress: () => void,
  authError: string,
  isLoading: boolean,
}
````

---

#### `<IssueCard />`

Displays a single issue with title, labels, metadata, and AI summary button.

**Import:**
````typescript
import { IssueCard } from './src/components/IssueCard';
````

**Props:**
````typescript
{
  issue: GitHubIssue,
  onGetSummary?: (issue: GitHubIssue) => void,
  copilotAvailable: boolean,
}
````

---

#### `<SwipeContainer />`

Main swipe interface with deck-swiper, action buttons, and overlays.

**Import:**
````typescript
import { SwipeContainer } from './src/components/SwipeContainer';
````

**Props:**
````typescript
{
  issues: GitHubIssue[],
  swiperRef: React.RefObject,
  onSwipedLeft: (index: number) => void,
  onSwipedRight: (index: number) => void,
  onClosePress: () => void,
  onKeepPress: () => void,
  onUndoPress: () => void,
  // ... (see component file for full props)
}
````

---

#### `<Sidebar />`

Desktop sidebar with filters, progress, and action buttons.

**Import:**
````typescript
import { Sidebar } from './src/components/Sidebar';
````

**Props:**
````typescript
{
  repoFilter: string,
  labelFilter: string,
  onRepoFilterChange: (value: string) => void,
  onLabelFilterChange: (value: string) => void,
  onRefresh: () => void,
  onLogout: () => void,
  // ... (see component file for full props)
}
````

---

### Utilities

#### Token Storage

Platform-aware secure token storage.

**Import:**
````typescript
import { saveToken, getToken, deleteToken } from './src/lib/tokenStorage';
````

**Functions:**
- `saveToken(sessionId: string): Promise<void>`
- `getToken(): Promise<string | null>`
- `deleteToken(): Promise<void>`

**Platform Behavior:**
- **Mobile (iOS/Android):** Uses `expo-secure-store` (encrypted keychain)
- **Web:** Uses `@react-native-async-storage/async-storage` (localStorage)

---

#### Copilot Service

Frontend client for AI summary endpoint.

**Import:**
````typescript
import { copilotService } from './src/lib/copilotService';
````

**Methods:**

**`initialize(): Promise<{ copilotMode: string }>`**
Checks backend health and Copilot availability.

**`summarizeIssue(issue: GitHubIssue): Promise<SummaryResult>`**
Generates AI summary for an issue.

**Types:**
````typescript
interface SummaryResult {
  summary: string;
  fallback?: boolean;        // True if basic fallback summary
  requiresCopilot?: boolean; // True if Copilot subscription needed
}
````

---

#### GitHub API Client

Frontend-to-backend API wrapper.

**Import:**
````typescript
import { fetchIssues, updateIssueState, extractRepoPath } from './src/api/github';
````

**Functions:**

**`fetchIssues(sessionId, repoFilter?, labelFilter?): Promise<GitHubIssue[]>`**
Fetches issues from `/api/issues`.

**`updateIssueState(sessionId, issue, state): Promise<GitHubIssue>`**
Updates issue state via `/api/issues/:owner/:repo/:number`.

**`extractRepoPath(repositoryUrl): string`**
Extracts `owner/repo` from GitHub API repository URL.

---

## Error Handling

### Common Error Patterns

**Session Expiration:**
````typescript
if (error.message.includes('Session expired')) {
  // Redirect to login
  signOut();
}
````

**Copilot Access Required:**
````typescript
if (error.requiresCopilot) {
  // Show Copilot subscription prompt
  alert('AI summaries require a GitHub Copilot subscription.');
}
````

**Network Errors:**
````typescript
try {
  await fetchIssues(token);
} catch (error) {
  if (error.message.includes('Failed to fetch')) {
    // Server not reachable
    setError('Cannot connect to server. Is it running?');
  }
}
````

---

## Environment Variables

### Frontend (Expo)

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
EXPO_PUBLIC_GITHUB_SCOPE=repo
EXPO_PUBLIC_API_URL=http://localhost:3000
````

### Backend (Express/Azure Functions)

````bash
GITHUB_CLIENT_SECRET=your_client_secret
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

**Optional:** If you don't configure Cosmos DB, sessions fall back to in-memory storage (fine for local dev, but sessions are lost on server restart).

---

## Rate Limits

### GitHub API
- **Authenticated:** 5,000 requests/hour per user
- **Search:** 30 requests/minute per user

### Copilot SDK
- Subject to GitHub Copilot rate limits (varies by subscription tier)
- We implement a 30-second timeout per summary request

---

## Security Notes

1. **Client Secret:** Never exposed to frontend — only used server-side in token exchange
2. **Session Storage:** Tokens stored securely (Keychain on mobile, localStorage on web)
3. **Session Expiry:** 24-hour TTL enforced by Cosmos DB
4. **OAuth Scope:** Use `repo` scope to enable issue closing (not `public_repo`)
5. **HTTPS:** Always use HTTPS in production (Azure SWA enforces this)

---

## See Also

- [README.md](../README.md) — Quick start guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Development setup
- [AGENTS.md](../AGENTS.md) — AI agent context and architecture
