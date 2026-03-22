# API Reference

Complete API documentation for IssueCrush hooks, utilities, and components.

## Hooks

### useAuth()

Manages GitHub OAuth authentication and session state.

**Returns:** `AuthState`

````typescript
interface AuthState {
  token: string | null;
  authError: string;
  copilotAvailable: boolean | null;
  startAuth: () => Promise<void>;
  logout: () => Promise<void>;
}
````

**Example:**
````typescript
import { useAuth } from './src/hooks';

function AuthScreen() {
  const { token, authError, startAuth, logout } = useAuth();
  
  if (token) {
    return <Button onPress={logout} title="Sign Out" />;
  }
  
  return <Button onPress={startAuth} title="Start GitHub login" />;
}
````

**Notes:**
- Token is stored securely using `expo-secure-store` (mobile) or `AsyncStorage` (web)
- OAuth flow differs by platform: device flow for mobile, web flow for browser
- Session tokens expire after 24 hours

---

### useIssues(token)

Manages issue loading, swiping, and state updates.

**Parameters:**
- `token` (string | null) - GitHub OAuth token from useAuth

**Returns:** `IssuesState`

````typescript
interface IssuesState {
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
  handleSwipeRight: (cardIndex: number) => void;
  handleUndo: () => Promise<void>;
  requestAiSummary: (issue: GitHubIssue) => Promise<string | null>;
  setRepoFilter: (filter: string) => void;
  setLabelFilter: (filter: string) => void;
}
````

**Example:**
````typescript
import { useIssues } from './src/hooks';

function IssueSwiper({ token }) {
  const {
    issues,
    loadingIssues,
    swiperRef,
    handleSwipeLeft,
    handleSwipeRight,
    loadIssues
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

**Notes:**
- `swiperRef` must be passed to `react-native-deck-swiper` for undo functionality
- Swipe left closes issue, swipe right keeps it open
- Haptic feedback fires on mobile (iOS/Android) but not web
- Issues are filtered by `repoFilter` and `labelFilter` when loading

---

### useAnimations(theme, feedback, currentIndex, issuesLength, inputFocused)

Manages UI animations for swipe overlays and feedback.

**Parameters:**
- `theme` (Theme) - Current theme object
- `feedback` (string) - Status message to display
- `currentIndex` (number) - Current card index
- `issuesLength` (number) - Total number of issues
- `inputFocused` (boolean) - Whether input is focused

**Returns:** `AnimationState`

````typescript
interface AnimationState {
  overlayOpacity: Animated.Value;
  overlayTranslateX: Animated.Value;
  feedbackOpacity: Animated.Value;
  fadeOutFeedback: () => void;
}
````

**Example:**
````typescript
import { useAnimations } from './src/hooks';

function SwipeOverlay({ theme, feedback, currentIndex, issuesLength }) {
  const { overlayOpacity, overlayTranslateX } = useAnimations(
    theme,
    feedback,
    currentIndex,
    issuesLength,
    false
  );
  
  return (
    <Animated.View style={{ opacity: overlayOpacity }}>
      <Text>CLOSED</Text>
    </Animated.View>
  );
}
````

---

### useKeyboardShortcuts(options)

Handles keyboard shortcuts for desktop users.

**Parameters:**
- `options.enabled` (boolean) - Enable/disable shortcuts
- `options.onLeft` (() => void) - Handler for left arrow / X key
- `options.onRight` (() => void) - Handler for right arrow / K key
- `options.onUndo` (() => void) - Handler for U key
- `options.onHelp` (() => void) - Handler for ? key

**Example:**
````typescript
import { useKeyboardShortcuts } from './src/hooks';

function App() {
  useKeyboardShortcuts({
    enabled: !inputFocused,
    onLeft: () => handleSwipeLeft(currentIndex),
    onRight: () => handleSwipeRight(currentIndex),
    onUndo: handleUndo,
    onHelp: () => setShowHelp(true)
  });
}
````

**Keyboard Shortcuts:**
- `←` or `X` - Close issue (swipe left)
- `→` or `K` - Keep issue (swipe right)
- `U` - Undo last action
- `?` - Show help dialog

---

## Utilities

### Token Storage

**Location:** `src/lib/tokenStorage.ts`

Cross-platform secure token storage.

#### getToken()

Retrieve stored session token.

````typescript
async function getToken(): Promise<string | null>
````

#### saveToken(sessionId)

Store session token securely.

````typescript
async function saveToken(sessionId: string): Promise<void>
````

#### deleteToken()

Remove stored session token.

````typescript
async function deleteToken(): Promise<void>
````

**Platform Behavior:**
- **iOS/Android:** Uses `expo-secure-store` (encrypted keychain)
- **Web:** Uses `@react-native-async-storage/async-storage` (localStorage)

---

### Copilot Service

**Location:** `src/lib/copilotService.ts`

Frontend wrapper for AI summary requests.

#### getAISummary(issue, sessionToken)

Request AI-generated issue summary.

````typescript
async function getAISummary(
  issue: GitHubIssue,
  sessionToken: string
): Promise<string>
````

**Parameters:**
- `issue` - GitHub issue object
- `sessionToken` - Session token from storage

**Returns:** AI-generated summary text

**Throws:** Error if API request fails or Copilot is unavailable

**Example:**
````typescript
import { copilotService } from './src/lib/copilotService';

const summary = await copilotService.getAISummary(issue, token);
console.log(summary); // "This issue requests a dark mode feature..."
````

---

### GitHub API Client

**Location:** `src/api/github.ts`

#### fetchIssues(token, repoFilter?, labelFilter?)

Fetch user's GitHub issues.

````typescript
async function fetchIssues(
  token: string,
  repoFilter?: string,
  labelFilter?: string
): Promise<GitHubIssue[]>
````

**Parameters:**
- `token` - GitHub OAuth token
- `repoFilter` - Optional repo filter (e.g., "owner/repo")
- `labelFilter` - Optional label filter (e.g., "bug")

**Returns:** Array of open issues assigned to or created by the user

---

#### closeIssue(token, owner, repo, issueNumber)

Close a GitHub issue.

````typescript
async function closeIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<void>
````

**Throws:** Error if API request fails or token lacks `repo` scope

---

#### reopenIssue(token, owner, repo, issueNumber)

Reopen a closed GitHub issue.

````typescript
async function reopenIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<void>
````

---

## Type Definitions

### GitHubIssue

````typescript
interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  repository_url: string;
  repository?: {
    full_name: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  user: {
    login: string;
    avatar_url: string;
  };
}
````

### Theme

````typescript
interface Theme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
  error: string;
  success: string;
  closeColor: string;
  keepColor: string;
}
````

## Components

Component documentation coming soon. See [App.tsx](../../App.tsx) and [src/components/](../../src/components/) for implementation details.

## See Also

- [Architecture Reference](architecture.md)
- [Environment Variables](environment-variables.md)
- [Authentication Flow Explanation](../explanation/auth-flow.md)
