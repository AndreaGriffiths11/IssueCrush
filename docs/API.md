# API Reference

Technical reference for IssueCrush's React hooks, components, and services.

## Table of Contents

- [Hooks](#hooks)
  - [useAuth](#useauth)
  - [useIssues](#useissues)
  - [useAnimations](#useanimations)
  - [useKeyboardShortcuts](#usekeyboardshortcuts)
- [Components](#components)
  - [AuthScreen](#authscreen)
  - [IssueCard](#issuecard)
  - [SwipeContainer](#swipecontainer)
  - [Sidebar](#sidebar)
- [Services](#services)
  - [GitHub API Client](#github-api-client)
  - [Copilot Service](#copilot-service)
  - [Token Storage](#token-storage)

---

## Hooks

### useAuth

**Location:** `src/hooks/useAuth.ts`

Manages GitHub OAuth authentication flow (device flow for mobile, web flow for browser).

#### Returns

````typescript
{
  token: string | null;              // Session ID (not the raw GitHub token)
  authError: string;                 // Error message from auth flow
  copilotAvailable: boolean | null;  // Whether Copilot is available
  login: () => Promise<void>;        // Initiates OAuth flow
  logout: () => Promise<void>;       // Clears session and token
  checkCopilot: () => Promise<void>; // Checks Copilot availability
}
````

#### Usage

````typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { token, login, logout, authError } = useAuth();
  
  if (!token) {
    return <Button onPress={login}>Login with GitHub</Button>;
  }
  
  return <Button onPress={logout}>Logout</Button>;
}
````

#### Implementation Notes

- **Platform-aware**: Uses device flow on mobile, web flow on web
- **Automatic token loading**: Checks for existing session on mount
- **Session-based auth**: Returns a session ID, not the raw GitHub token
- All actual GitHub operations use the backend server with session ID in `X-Session-Token` header

---

### useIssues

**Location:** `src/hooks/useIssues.ts`

Manages issue loading, swiping, and state updates.

#### Parameters

- `token: string | null` - Session ID from `useAuth`

#### Returns

````typescript
{
  issues: GitHubIssue[];                      // Current issue list
  loadingIssues: boolean;                     // Loading state
  loadingAiSummary: boolean;                  // AI summary loading state
  currentIndex: number;                       // Current card index
  lastClosed: GitHubIssue | null;            // Last closed issue (for undo)
  undoBusy: boolean;                          // Undo operation in progress
  feedback: string;                           // User feedback message
  repoFilter: string;                         // Current repo filter
  labelFilter: string;                        // Current label filter
  swiperRef: RefObject<Swiper<GitHubIssue>>; // Ref for swiper control
  confettiRef: RefObject<any>;               // Ref for confetti cannon
  repoLabel: (issue: GitHubIssue) => string; // Extract repo name
  loadIssues: () => Promise<void>;           // Load issues from API
  handleSwipeLeft: (index: number) => Promise<void>;  // Close issue
  handleSwipeRight: (index: number) => Promise<void>; // Keep issue
  handleUndo: () => Promise<void>;           // Undo last close
  getAISummary: (issue: GitHubIssue) => Promise<void>; // Fetch AI summary
  setRepoFilter: (filter: string) => void;   // Update repo filter
  setLabelFilter: (filter: string) => void;  // Update label filter
}
````

#### Usage

````typescript
import { useIssues } from './hooks/useIssues';

function IssueList({ token }: { token: string }) {
  const { 
    issues, 
    loadingIssues, 
    swiperRef, 
    handleSwipeLeft, 
    handleSwipeRight 
  } = useIssues(token);
  
  return (
    <Swiper
      ref={swiperRef}
      cards={issues}
      onSwipedLeft={handleSwipeLeft}
      onSwipedRight={handleSwipeRight}
    />
  );
}
````

#### Implementation Notes

- **Haptic feedback**: Provides tactile feedback on mobile (Heavy for close, Light for keep)
- **Undo mechanism**: Stores last closed issue for instant reopening
- **Filtering**: Supports repo and label filters (combined with AND logic)
- **AI summaries**: Cached per issue in `aiSummary` field

---

### useAnimations

**Location:** `src/hooks/useAnimations.ts`

Manages swipe overlay animations (stamp-style visual feedback).

#### Returns

````typescript
{
  leftOpacity: Animated.Value;   // Left overlay opacity
  rightOpacity: Animated.Value;  // Right overlay opacity
  startAnimation: (direction: 'left' | 'right') => void; // Trigger animation
  resetAnimation: () => void;    // Reset to initial state
}
````

#### Usage

````typescript
import { useAnimations } from './hooks/useAnimations';

function SwipeOverlays() {
  const { leftOpacity, rightOpacity, startAnimation } = useAnimations();
  
  return (
    <>
      <Animated.View style={{ opacity: leftOpacity }}>
        <Text>NOPE</Text>
      </Animated.View>
      <Animated.View style={{ opacity: rightOpacity }}>
        <Text>YEP</Text>
      </Animated.View>
    </>
  );
}
````

---

### useKeyboardShortcuts

**Location:** `src/hooks/useKeyboardShortcuts.ts`

Web-only keyboard shortcuts for accessibility.

#### Parameters

````typescript
{
  onLeft: () => void;   // Handler for left arrow / X key
  onRight: () => void;  // Handler for right arrow / Enter key
  onUndo: () => void;   // Handler for Z key
  enabled: boolean;     // Whether shortcuts are active
}
````

#### Supported Keys

- **Arrow Left / X** - Close issue (swipe left)
- **Arrow Right / Enter** - Keep issue (swipe right)
- **Z** - Undo last close
- **?** - Show keyboard shortcuts help

---

## Components

### AuthScreen

**Location:** `src/components/AuthScreen.tsx`

Handles authentication UI and OAuth flow initialization.

#### Props

````typescript
{
  login: () => Promise<void>;        // Login handler from useAuth
  logout: () => Promise<void>;       // Logout handler from useAuth
  authError: string;                 // Error message to display
  copilotAvailable: boolean | null;  // Copilot availability status
  checkCopilot: () => Promise<void>; // Check Copilot status
}
````

---

### IssueCard

**Location:** `src/components/IssueCard.tsx`

Pure render component for issue display. Receives all data as props.

#### Props

````typescript
{
  issue: GitHubIssue;              // Issue data
  onGetAISummary: () => void;      // AI summary request handler
  loadingAiSummary: boolean;       // AI loading state
  repoLabel: string;               // Repository name
  theme: ThemeColors;              // Current theme colors
  onOpenIssue: () => void;         // Open issue in browser
}
````

#### Architecture Note

- **Pure component**: No network calls, no hooks (except theme context)
- All actions delegated via props/callbacks
- Optimized for performance with memoization

---

### SwipeContainer

**Location:** `src/components/SwipeContainer.tsx`

Wraps the swiper component with overlays and action bar.

#### Props

````typescript
{
  issues: GitHubIssue[];
  currentIndex: number;
  swiperRef: RefObject<Swiper<GitHubIssue>>;
  confettiRef: RefObject<any>;
  onSwipeLeft: (index: number) => void;
  onSwipeRight: (index: number) => void;
  onUndo: () => void;
  undoBusy: boolean;
  theme: ThemeColors;
  // ... plus IssueCard props
}
````

---

### Sidebar

**Location:** `src/components/Sidebar.tsx`

Desktop-only sidebar with filters, progress, and actions.

#### Props

````typescript
{
  repoFilter: string;
  labelFilter: string;
  onRepoFilterChange: (value: string) => void;
  onLabelFilterChange: (value: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
  loadingIssues: boolean;
  issueCount: number;
  currentIndex: number;
  theme: ThemeColors;
}
````

---

## Services

### GitHub API Client

**Location:** `src/api/github.ts`

All GitHub API calls are proxied through the backend server. The client sends a session ID via `X-Session-Token` header; the server uses the stored GitHub token.

#### Functions

##### `fetchIssues(sessionId, repoFilter?, labelFilter?)`

````typescript
async function fetchIssues(
  sessionId: string, 
  repoFilter?: string, 
  labelFilter?: string
): Promise<GitHubIssue[]>
````

- **Returns**: Array of open issues
- **Filters**: Combined with AND logic
- **Endpoint**: `GET /api/issues`

##### `updateIssueState(sessionId, owner, repo, issueNumber, state)`

````typescript
async function updateIssueState(
  sessionId: string,
  owner: string,
  repo: string,
  issueNumber: number,
  state: 'open' | 'closed'
): Promise<void>
````

- **Closes or reopens** an issue
- **Endpoint**: `PATCH /api/issues/:owner/:repo/:number`

##### `extractRepoPath(repositoryUrl)`

````typescript
function extractRepoPath(url: string): string
````

Extracts `owner/repo` from GitHub API URL.

---

### Copilot Service

**Location:** `src/lib/copilotService.ts`

Frontend wrapper for AI summary requests.

#### Functions

##### `getAISummary(sessionId, issue)`

````typescript
async function getAISummary(
  sessionId: string, 
  issue: GitHubIssue
): Promise<string>
````

- **Returns**: AI-generated summary
- **Endpoint**: `POST /api/ai-summary`
- **Requires**: GitHub Copilot subscription and `GH_TOKEN` or `COPILOT_PAT` env var

---

### Token Storage

**Location:** `src/lib/tokenStorage.ts`

Platform-aware secure token storage.

#### Functions

##### `saveToken(token)`

````typescript
async function saveToken(token: string): Promise<void>
````

- **Mobile**: `expo-secure-store`
- **Web**: `AsyncStorage`

##### `getToken()`

````typescript
async function getToken(): Promise<string | null>
````

##### `deleteToken()`

````typescript
async function deleteToken(): Promise<void>
````

---

## Type Definitions

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
  aiSummary?: string;          // Cached AI summary
  body?: string;
  created_at?: string;
  user?: {
    login: string;
    avatar_url: string;
  };
};
````

### GitHubLabel

````typescript
type GitHubLabel = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
};
````

---

## Error Handling

All hooks and services follow consistent error patterns:

- **Network errors**: Displayed in `feedback` state (useIssues) or `authError` (useAuth)
- **No silent failures**: All errors surfaced to UI via toast or error text
- **Retry-friendly**: User can manually retry failed operations

---

## Performance Considerations

- **Swiper ref**: Must be passed as prop, never recreated inside components
- **Memoization**: IssueCard and child components use React.memo
- **Haptics**: Guarded with `Platform.OS !== 'web'` check
- **AI summaries**: Cached per issue to avoid redundant API calls

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guide](../CONTRIBUTING.md)
