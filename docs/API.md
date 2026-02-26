# API Reference

Complete API documentation for IssueCrush components, hooks, and utilities.

## Table of Contents

- [GitHub API Client](#github-api-client)
- [Hooks](#hooks)
  - [useAuth](#useauth)
  - [useIssues](#useissues)
  - [useAnimations](#useanimations)
- [Components](#components)
  - [AuthScreen](#authscreen)
  - [IssueCard](#issuecard)
  - [SwipeContainer](#swipecontainer)
  - [Sidebar](#sidebar)
- [Services](#services)
  - [CopilotService](#copilotservice)
  - [Token Storage](#token-storage)
- [Utilities](#utilities)
- [Backend API Endpoints](#backend-api-endpoints)

---

## GitHub API Client

Location: `src/api/github.ts`

### Types

#### `GitHubLabel`

Represents a GitHub issue label.

````typescript
type GitHubLabel = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
};
````

#### `GitHubIssue`

Represents a GitHub issue with all relevant metadata.

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

Fetches issues from GitHub through the backend proxy.

````typescript
async function fetchIssues(
  sessionId: string,
  repoFilter?: string,
  labelFilter?: string
): Promise<GitHubIssue[]>
````

**Parameters:**
- `sessionId` - User's session ID for authentication
- `repoFilter` - Optional repository filter (format: `owner/repo`)
- `labelFilter` - Optional comma-separated label names

**Returns:** Promise resolving to array of GitHub issues

**Throws:**
- Session expired error (401)
- Repository not found error (404)
- Generic fetch errors

**Example:**
````typescript
const issues = await fetchIssues(sessionId, 'octocat/Hello-World', 'bug,enhancement');
````

---

#### `updateIssueState()`

Updates an issue's state (open/closed) through the backend proxy.

````typescript
async function updateIssueState(
  sessionId: string,
  issue: Pick<GitHubIssue, 'number' | 'repository_url'>,
  state: 'open' | 'closed'
): Promise<GitHubIssue>
````

**Parameters:**
- `sessionId` - User's session ID for authentication
- `issue` - Issue object with at least `number` and `repository_url`
- `state` - Target state (`'open'` or `'closed'`)

**Returns:** Promise resolving to the updated GitHub issue

**Example:**
````typescript
await updateIssueState(sessionId, issue, 'closed');
````

---

#### `extractRepoPath()`

Extracts the owner/repo path from a GitHub repository URL.

````typescript
function extractRepoPath(repositoryUrl: string): string
````

**Parameters:**
- `repositoryUrl` - Full GitHub API repository URL

**Returns:** Repository path in `owner/repo` format

**Example:**
````typescript
const path = extractRepoPath('https://api.github.com/repos/octocat/Hello-World');
// Returns: 'octocat/Hello-World'
````

---

## Hooks

### useAuth

Location: `src/hooks/useAuth.ts`

Manages GitHub OAuth authentication, including device flow (mobile) and web flow (browser).

#### Returns

````typescript
{
  token: string | null;
  authError: string;
  copilotAvailable: boolean | null;
  startLogin: () => void;
  completeLogin: () => Promise<void>;
  logout: () => Promise<void>;
  pollDeviceCode: (deviceCode: string, interval: number) => void;
}
````

#### Properties

- `token` - Current session token (null if not authenticated)
- `authError` - Authentication error message (empty string if no error)
- `copilotAvailable` - Whether GitHub Copilot is available on the backend

#### Methods

##### `startLogin()`

Initiates the OAuth flow. On web, redirects to GitHub. On mobile, starts device flow.

**Example:**
````typescript
const { startLogin } = useAuth();

<Button onPress={startLogin} title="Start GitHub login" />
````

##### `completeLogin()`

Completes the web OAuth flow after redirect. Automatically called on web when URL contains authorization code.

##### `logout()`

Signs the user out and clears stored tokens.

**Example:**
````typescript
const { logout } = useAuth();

<Button onPress={logout} title="Sign Out" />
````

##### `pollDeviceCode()`

Polls GitHub for device authorization (mobile flow).

**Parameters:**
- `deviceCode` - Device code from GitHub device flow
- `interval` - Polling interval in seconds

---

### useIssues

Location: `src/hooks/useIssues.ts`

Manages issue loading, swipe actions, undo functionality, and AI summaries.

#### Parameters

````typescript
function useIssues(token: string | null)
````

#### Returns

````typescript
{
  issues: GitHubIssue[];
  loadingIssues: boolean;
  loadingAiSummary: boolean;
  currentIndex: number;
  lastClosed: GitHubIssue | null;
  undoBusy: boolean;
  feedback: string;
  repoFilter: string;
  labelFilter: string;
  swiperRef: React.RefObject<Swiper<GitHubIssue>>;
  confettiRef: React.RefObject<any>;
  repoLabel: (issue: GitHubIssue) => string;
  loadIssues: () => Promise<void>;
  handleSwipeLeft: (cardIndex: number) => Promise<void>;
  handleSwipeRight: (cardIndex: number) => Promise<void>;
  handleUndo: () => Promise<void>;
  handleAiSummary: (issue: GitHubIssue) => Promise<void>;
  setRepoFilter: (filter: string) => void;
  setLabelFilter: (filter: string) => void;
  setFeedback: (message: string) => void;
}
````

#### Key Methods

##### `loadIssues()`

Loads issues from GitHub based on current filters.

**Example:**
````typescript
const { loadIssues } = useIssues(token);

await loadIssues();
````

##### `handleSwipeLeft()`

Closes an issue and triggers haptic feedback (mobile only).

**Parameters:**
- `cardIndex` - Index of the card being swiped

##### `handleSwipeRight()`

Keeps an issue open and triggers haptic feedback (mobile only).

**Parameters:**
- `cardIndex` - Index of the card being swiped

##### `handleUndo()`

Reopens the last closed issue.

**Example:**
````typescript
const { handleUndo, lastClosed } = useIssues(token);

{lastClosed && <Button onPress={handleUndo} title="Undo" />}
````

##### `handleAiSummary()`

Requests an AI-generated summary for an issue using GitHub Copilot SDK.

**Parameters:**
- `issue` - The issue to summarize

**Example:**
````typescript
const { handleAiSummary } = useIssues(token);

await handleAiSummary(currentIssue);
````

---

### useAnimations

Location: `src/hooks/useAnimations.ts`

Manages UI animations for feedback messages and issue cards.

#### Parameters

````typescript
function useAnimations(
  theme: Theme,
  feedback: string,
  currentIndex: number,
  issuesLength: number,
  inputFocused: boolean
)
````

#### Returns

````typescript
{
  toastOpacity: Animated.Value;
  toastTranslateY: Animated.Value;
  cardScale: Animated.Value;
}
````

- `toastOpacity` - Animated value for toast notification opacity
- `toastTranslateY` - Animated value for toast vertical position
- `cardScale` - Animated value for card scaling effect

---

## Components

### AuthScreen

Location: `src/components/AuthScreen.tsx`

Displays authentication UI with GitHub OAuth login flow.

#### Props

````typescript
interface AuthScreenProps {
  onLogin: () => void;
  authError: string;
  isDesktop: boolean;
}
````

**Properties:**
- `onLogin` - Callback function to initiate login
- `authError` - Error message to display (if any)
- `isDesktop` - Whether running on desktop (affects layout)

**Example:**
````typescript
<AuthScreen
  onLogin={startLogin}
  authError={authError}
  isDesktop={isDesktop}
/>
````

---

### IssueCard

Location: `src/components/IssueCard.tsx`

Renders a single issue card with all details and actions.

#### Props

````typescript
interface IssueCardProps {
  issue: GitHubIssue;
  theme: Theme;
  isDark: boolean;
  repoLabel: string;
  loadingAiSummary: boolean;
  onAiSummary: () => void;
  onOpenIssue: () => void;
}
````

**Properties:**
- `issue` - The GitHub issue to display
- `theme` - Current theme object
- `isDark` - Whether dark mode is active
- `repoLabel` - Repository name to display
- `loadingAiSummary` - Whether AI summary is loading
- `onAiSummary` - Callback to request AI summary
- `onOpenIssue` - Callback to open issue in browser

**Features:**
- Displays issue title, number, labels, and body
- Shows AI summary if available
- Responsive layout for mobile and desktop
- Touch/click handling for opening issue in browser

---

### SwipeContainer

Location: `src/components/SwipeContainer.tsx`

Wrapper component for the swipeable card interface.

#### Props

````typescript
interface SwipeContainerProps {
  issues: GitHubIssue[];
  currentIndex: number;
  swiperRef: React.RefObject<Swiper<GitHubIssue>>;
  confettiRef: React.RefObject<any>;
  theme: Theme;
  isDark: boolean;
  onSwipeLeft: (index: number) => void;
  onSwipeRight: (index: number) => void;
  renderCard: (issue: GitHubIssue) => React.ReactNode;
}
````

**Properties:**
- `issues` - Array of issues to swipe through
- `currentIndex` - Current card index
- `swiperRef` - Ref to swiper component (for programmatic control)
- `confettiRef` - Ref to confetti animation component
- `theme` - Current theme object
- `isDark` - Whether dark mode is active
- `onSwipeLeft` - Callback when card is swiped left
- `onSwipeRight` - Callback when card is swiped right
- `renderCard` - Function to render each card

**Features:**
- Tinder-style swipe interface
- Overlay labels ("CLOSE" / "KEEP")
- Confetti animation on completion
- Desktop and mobile support

---

### Sidebar

Location: `src/components/Sidebar.tsx`

Desktop-only sidebar with filters, progress, and actions.

#### Props

````typescript
interface SidebarProps {
  theme: Theme;
  isDark: boolean;
  currentIndex: number;
  totalIssues: number;
  repoFilter: string;
  labelFilter: string;
  loadingIssues: boolean;
  lastClosed: GitHubIssue | null;
  undoBusy: boolean;
  onLoadIssues: () => void;
  onUndo: () => void;
  onLogout: () => void;
  onRepoFilterChange: (filter: string) => void;
  onLabelFilterChange: (filter: string) => void;
}
````

**Properties:**
- `theme` - Current theme object
- `isDark` - Whether dark mode is active
- `currentIndex` - Current issue index
- `totalIssues` - Total number of issues loaded
- `repoFilter` - Current repository filter
- `labelFilter` - Current label filter
- `loadingIssues` - Whether issues are loading
- `lastClosed` - Last closed issue (for undo)
- `undoBusy` - Whether undo is in progress
- `onLoadIssues` - Callback to refresh issues
- `onUndo` - Callback to undo last close
- `onLogout` - Callback to sign out
- `onRepoFilterChange` - Callback when repo filter changes
- `onLabelFilterChange` - Callback when label filter changes

**Features:**
- Repository and label filtering
- Progress tracking
- Action buttons (Refresh, Undo, Sign Out)
- Desktop-only (hidden on mobile)

---

## Services

### CopilotService

Location: `src/lib/copilotService.ts`

Provides AI-powered issue summaries via GitHub Copilot SDK on the backend.

#### Methods

##### `initialize()`

Checks backend availability and Copilot mode.

````typescript
async initialize(): Promise<{ copilotMode: string }>
````

**Returns:** Object with `copilotMode` property

**Throws:** Error if backend is unavailable

**Example:**
````typescript
const { copilotMode } = await copilotService.initialize();
console.log(`Copilot mode: ${copilotMode}`);
````

##### `summarizeIssue()`

Generates an AI summary for a GitHub issue.

````typescript
async summarizeIssue(issue: GitHubIssue): Promise<SummaryResult>
````

**Parameters:**
- `issue` - GitHub issue to summarize

**Returns:** Promise resolving to:
````typescript
interface SummaryResult {
  summary: string;
  fallback?: boolean;        // True if using fallback (no Copilot)
  requiresCopilot?: boolean; // True if Copilot subscription required
}
````

**Example:**
````typescript
const result = await copilotService.summarizeIssue(issue);
console.log(result.summary);
if (result.requiresCopilot) {
  console.log('Copilot subscription required');
}
````

---

### Token Storage

Location: `src/lib/tokenStorage.ts`

Secure token storage using `expo-secure-store` (mobile) or `AsyncStorage` (web).

#### Functions

##### `saveToken()`

Stores the session token securely.

````typescript
async function saveToken(sessionId: string): Promise<void>
````

**Parameters:**
- `sessionId` - Session ID to store

##### `getToken()`

Retrieves the stored session token.

````typescript
async function getToken(): Promise<string | null>
````

**Returns:** Session ID or null if not found

##### `deleteToken()`

Removes the stored session token.

````typescript
async function deleteToken(): Promise<void>
````

**Example:**
````typescript
// Save token after login
await saveToken(sessionId);

// Retrieve token
const token = await getToken();

// Delete on logout
await deleteToken();
````

---

## Utilities

Location: `src/utils/`

### `webCursor()`

Location: `src/utils/index.ts`

Returns cursor style for web platform only.

````typescript
function webCursor(cursor: string): any
````

**Parameters:**
- `cursor` - CSS cursor value (e.g., `'pointer'`, `'default'`)

**Returns:** Style object with cursor on web, empty object on mobile

**Example:**
````typescript
<TouchableOpacity style={[styles.button, webCursor('pointer')]}>
````

---

### `getLabelColor()`

Location: `src/utils/colors.ts`

Converts a hex color to an appropriate text color (black/white) for contrast.

````typescript
function getLabelColor(hex: string): string
````

**Parameters:**
- `hex` - Hex color code (e.g., `'FF0000'`)

**Returns:** `'#000000'` or `'#FFFFFF'` for optimal contrast

**Example:**
````typescript
const textColor = getLabelColor(label.color);
````

---

## Backend API Endpoints

Location: `api/src/app.js`

All endpoints are Azure Functions exposed through Azure Static Web Apps.

### Health Check

**Endpoint:** `GET /api/health`

**Response:**
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

---

### OAuth Token Exchange

**Endpoint:** `POST /api/github-token`

**Request Body:**
````json
{
  "code": "github_authorization_code"
}
````

**Response:**
````json
{
  "session_id": "generated_session_id"
}
````

**Error Response:**
````json
{
  "error": "error_code",
  "error_description": "Human-readable error message"
}
````

---

### Fetch Issues

**Endpoint:** `GET /api/issues`

**Query Parameters:**
- `repo` (optional) - Repository filter (`owner/repo`)
- `labels` (optional) - Comma-separated label names

**Headers:**
- `X-Session-Token` - User's session ID

**Response:** Array of `GitHubIssue` objects

**Error Codes:**
- `401` - Session expired or invalid
- `404` - Repository not found or no access

---

### Update Issue State

**Endpoint:** `PATCH /api/issues/:owner/:repo/:number`

**Headers:**
- `X-Session-Token` - User's session ID

**Request Body:**
````json
{
  "state": "open" | "closed"
}
````

**Response:** Updated `GitHubIssue` object

---

### AI Summary

**Endpoint:** `POST /api/ai-summary`

**Headers:**
- `X-Session-Token` - User's session ID

**Request Body:**
````json
{
  "issue": GitHubIssue
}
````

**Response:**
````json
{
  "summary": "AI-generated summary text",
  "fallback": false
}
````

**Error Response (Copilot Required):**
````json
{
  "message": "AI summaries require a GitHub Copilot subscription",
  "requiresCopilot": true
}
````

---

### Logout

**Endpoint:** `POST /api/logout`

**Headers:**
- `X-Session-Token` - User's session ID

**Response:**
````json
{
  "ok": true
}
````

---

## See Also

- [Architecture Documentation](./ARCHITECTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [README](../README.md)
