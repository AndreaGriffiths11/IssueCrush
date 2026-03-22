# Component Reference

IssueCrush components follow strict architectural boundaries with props-based composition.

## Components

### AuthScreen

**Location**: `src/components/AuthScreen.tsx`

**Purpose**: Handles GitHub OAuth login and logout UI.

**Props**

| Name              | Type     | Required | Description                          |
|-------------------|----------|----------|--------------------------------------|
| onStartLogin      | function | Yes      | Called when user clicks login button |
| onSignOut         | function | Yes      | Called when user clicks sign out     |
| authError         | string   | No       | Error message to display             |
| copilotAvailable  | boolean  | No       | Whether AI features are available    |

**Example**

````tsx
<AuthScreen
  onStartLogin={startLogin}
  onSignOut={signOut}
  authError={authError}
  copilotAvailable={copilotAvailable}
/>
````

---

### IssueCard

**Location**: `src/components/IssueCard.tsx`

**Purpose**: Displays a single GitHub issue with AI summary support.

**Props**

| Name                | Type       | Required | Description                          |
|---------------------|------------|----------|--------------------------------------|
| issue               | GitHubIssue| Yes      | Issue data to display                |
| repoLabel           | string     | Yes      | Repository name (e.g., "owner/repo") |
| onGetAiSummary      | function   | No       | Called when AI summary requested     |
| loadingAiSummary    | boolean    | No       | Whether AI summary is loading        |
| copilotAvailable    | boolean    | No       | Whether AI features are available    |

**Example**

````tsx
<IssueCard
  issue={currentIssue}
  repoLabel="octocat/Hello-World"
  onGetAiSummary={handleGetAiSummary}
  loadingAiSummary={false}
  copilotAvailable={true}
/>
````

**Features**

- Clickable issue number (opens GitHub in browser)
- Label badges with color coding
- AI summary with expand/collapse
- Repository name truncation on mobile
- Responsive layout (mobile vs desktop)

---

### SwipeContainer

**Location**: `src/components/SwipeContainer.tsx`

**Purpose**: Swipe interface with deck of issue cards and action buttons.

**Props**

| Name                | Type       | Required | Description                          |
|---------------------|------------|----------|--------------------------------------|
| issues              | GitHubIssue[]| Yes    | Array of issues to display           |
| currentIndex        | number     | Yes      | Index of current card                |
| swiperRef           | RefObject  | Yes      | Ref to Swiper component (for undo)   |
| confettiRef         | RefObject  | Yes      | Ref to confetti component            |
| repoLabel           | function   | Yes      | Function to get repo label for issue |
| onSwipedLeft        | function   | Yes      | Called when card swiped left         |
| onSwipedRight       | function   | Yes      | Called when card swiped right        |
| onSwiped            | function   | Yes      | Called after any swipe               |
| onUndo              | function   | Yes      | Called when undo button pressed      |
| onGetAiSummary      | function   | Yes      | Called when AI summary requested     |
| lastClosed          | GitHubIssue| No       | Last closed issue (enables undo)     |
| undoBusy            | boolean    | No       | Whether undo is in progress          |
| loadingAiSummary    | boolean    | No       | Whether AI summary is loading        |
| copilotAvailable    | boolean    | No       | Whether AI features are available    |

**Example**

````tsx
<SwipeContainer
  issues={issues}
  currentIndex={currentIndex}
  swiperRef={swiperRef}
  confettiRef={confettiRef}
  repoLabel={repoLabel}
  onSwipedLeft={handleSwipeLeft}
  onSwipedRight={handleSwipeRight}
  onSwiped={onSwiped}
  onUndo={handleUndo}
  onGetAiSummary={handleGetAiSummary}
  lastClosed={lastClosed}
  undoBusy={undoBusy}
  loadingAiSummary={loadingAiSummary}
  copilotAvailable={copilotAvailable}
/>
````

**Features**

- Swipe gestures (left = close, right = keep)
- Action bar with Close/Undo/Keep buttons
- Swipe overlays (red "CLOSE" / green "KEEP")
- Confetti animation on completion
- Desktop keyboard shortcuts (←/→/U)

**Important**: `swiperRef` must come from `useIssues` hook. Never create a new ref inside this component.

---

### Sidebar

**Location**: `src/components/Sidebar.tsx`

**Purpose**: Desktop-only sidebar with filters and progress.

**Props**

| Name          | Type     | Required | Description                          |
|---------------|----------|----------|--------------------------------------|
| repoFilter    | string   | Yes      | Current repository filter            |
| setRepoFilter | function | Yes      | Update repository filter             |
| labelFilter   | string   | Yes      | Current label filter                 |
| setLabelFilter| function | Yes      | Update label filter                  |
| onRefresh     | function | Yes      | Called when refresh button clicked   |
| loadingIssues | boolean  | Yes      | Whether issues are loading           |
| currentIndex  | number   | Yes      | Current issue index                  |
| totalIssues   | number   | Yes      | Total number of issues               |
| onSignOut     | function | Yes      | Called when sign out clicked         |

**Example**

````tsx
<Sidebar
  repoFilter={repoFilter}
  setRepoFilter={setRepoFilter}
  labelFilter={labelFilter}
  setLabelFilter={setLabelFilter}
  onRefresh={loadIssues}
  loadingIssues={loadingIssues}
  currentIndex={currentIndex}
  totalIssues={issues.length}
  onSignOut={signOut}
/>
````

**Features**

- Repository filter input (e.g., "owner/repo")
- Label filter input (comma-separated)
- Refresh button
- Progress indicator (e.g., "5 / 20")
- Sign out button
- Only visible on desktop (width > 768px)

---

### KeyboardShortcutsHelp

**Location**: `src/components/KeyboardShortcutsHelp.tsx`

**Purpose**: Modal showing keyboard shortcuts (desktop only).

**Props**

| Name      | Type     | Required | Description                          |
|-----------|----------|----------|--------------------------------------|
| visible   | boolean  | Yes      | Whether modal is visible             |
| onClose   | function | Yes      | Called when modal should close       |

**Example**

````tsx
<KeyboardShortcutsHelp
  visible={showHelp}
  onClose={() => setShowHelp(false)}
/>
````

**Keyboard Shortcuts**

| Key | Action         |
|-----|----------------|
| ←   | Close issue    |
| →   | Keep issue     |
| U   | Undo last close|
| ?   | Show help      |

---

## Custom Hooks

### useAuth

**Location**: `src/hooks/useAuth.ts`

**Purpose**: GitHub OAuth authentication and session management.

**Returns**

| Property          | Type     | Description                          |
|-------------------|----------|--------------------------------------|
| token             | string   | Session token (null if not authed)   |
| authError         | string   | Authentication error message         |
| setAuthError      | function | Update error message                 |
| copilotAvailable  | boolean  | Whether AI features are available    |
| startLogin        | function | Start GitHub OAuth flow              |
| signOut           | function | Sign out and clear session           |

**Example**

````tsx
const {
  token,
  authError,
  copilotAvailable,
  startLogin,
  signOut,
} = useAuth();
````

**OAuth Flow**

- **Web**: Full page redirect to GitHub
- **Mobile**: In-app WebBrowser with deep link callback

---

### useIssues

**Location**: `src/hooks/useIssues.ts`

**Purpose**: Manage issues, swipes, undo, and AI summaries.

**Parameters**

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| token     | string | Yes      | Session token         |

**Returns**

| Property          | Type       | Description                          |
|-------------------|------------|--------------------------------------|
| issues            | GitHubIssue[]| Loaded issues                      |
| loadingIssues     | boolean    | Whether issues are loading           |
| loadingAiSummary  | boolean    | Whether AI summary is loading        |
| currentIndex      | number     | Index of current card                |
| lastClosed        | GitHubIssue| Last closed issue (for undo)         |
| undoBusy          | boolean    | Whether undo is in progress          |
| feedback          | string     | Toast feedback message               |
| setFeedback       | function   | Update feedback message              |
| repoFilter        | string     | Repository filter                    |
| setRepoFilter     | function   | Update repository filter             |
| labelFilter       | string     | Label filter                         |
| setLabelFilter    | function   | Update label filter                  |
| swiperRef         | RefObject  | Ref to Swiper component              |
| confettiRef       | RefObject  | Ref to confetti component            |
| repoLabel         | function   | Get repo label for issue             |
| loadIssues        | function   | Load/refresh issues                  |
| handleSwipeLeft   | function   | Handle swipe left (close)            |
| handleSwipeRight  | function   | Handle swipe right (keep)            |
| onSwiped          | function   | Handle any swipe completion          |
| handleUndo        | function   | Undo last close                      |
| handleGetAiSummary| function   | Request AI summary                   |

**Example**

````tsx
const {
  issues,
  loadingIssues,
  currentIndex,
  swiperRef,
  confettiRef,
  repoLabel,
  handleSwipeLeft,
  handleSwipeRight,
  onSwiped,
  handleUndo,
  handleGetAiSummary,
} = useIssues(token);
````

**Important**: The `swiperRef` must be passed to `SwipeContainer`. Never create a new ref.

---

### useAnimations

**Location**: `src/hooks/useAnimations.ts`

**Purpose**: Manage swipe overlay animations.

**Returns**

| Property          | Type       | Description                          |
|-------------------|------------|--------------------------------------|
| overlayOpacity    | Animated   | Animated value for overlay opacity   |
| overlayScale      | Animated   | Animated value for overlay scale     |
| resetAnimation    | function   | Reset animation to initial state     |
| fadeIn            | function   | Fade in overlay                      |
| fadeOut           | function   | Fade out overlay                     |

**Example**

````tsx
const {
  overlayOpacity,
  overlayScale,
  fadeIn,
  fadeOut,
} = useAnimations();
````

---

### useKeyboardShortcuts

**Location**: `src/hooks/useKeyboardShortcuts.ts`

**Purpose**: Desktop keyboard navigation.

**Parameters**

| Parameter         | Type     | Required | Description                          |
|-------------------|----------|----------|--------------------------------------|
| onLeft            | function | Yes      | Called when ← pressed                |
| onRight           | function | Yes      | Called when → pressed                |
| onUndo            | function | Yes      | Called when U pressed                |
| onShowHelp        | function | Yes      | Called when ? pressed                |
| enabled           | boolean  | Yes      | Whether shortcuts are enabled        |

**Example**

````tsx
useKeyboardShortcuts({
  onLeft: () => swiperRef.current?.swipeLeft(),
  onRight: () => swiperRef.current?.swipeRight(),
  onUndo: handleUndo,
  onShowHelp: () => setShowHelp(true),
  enabled: Platform.OS === 'web' && !!token,
});
````

---

## Utilities

### copilotService

**Location**: `src/lib/copilotService.ts`

**Purpose**: Frontend wrapper for AI summary API.

**Methods**

````typescript
summarizeIssue(issue: GitHubIssue): Promise<{ summary: string }>
````

**Example**

````tsx
import { copilotService } from '../lib/copilotService';

const result = await copilotService.summarizeIssue(issue);
console.log(result.summary);
````

---

### tokenStorage

**Location**: `src/lib/tokenStorage.ts`

**Purpose**: Platform-specific secure token storage.

**Methods**

````typescript
getToken(): Promise<string | null>
saveToken(token: string): Promise<void>
deleteToken(): Promise<void>
````

**Example**

````tsx
import { getToken, saveToken, deleteToken } from '../lib/tokenStorage';

// Get stored token
const token = await getToken();

// Save new token
await saveToken('session-id-123');

// Delete token
await deleteToken();
````

**Storage Backend**

- iOS/Android: `expo-secure-store` (encrypted keychain/keystore)
- Web: `@react-native-async-storage/async-storage` (localStorage)

---

### github API

**Location**: `src/api/github.ts`

**Purpose**: GitHub API client (proxied through backend).

**Methods**

````typescript
fetchIssues(
  sessionId: string,
  repoFilter?: string,
  labelFilter?: string
): Promise<GitHubIssue[]>

updateIssueState(
  sessionId: string,
  issue: Pick<GitHubIssue, 'number' | 'repository_url'>,
  state: 'open' | 'closed'
): Promise<GitHubIssue>

extractRepoPath(repositoryUrl: string): string
````

**Example**

````tsx
import { fetchIssues, updateIssueState } from '../api/github';

// Fetch issues
const issues = await fetchIssues(sessionId, 'owner/repo', 'bug,enhancement');

// Close issue
await updateIssueState(sessionId, issue, 'closed');
````

---

## Types

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

## Architecture Rules

### Component Boundaries

1. **App.tsx** is composition only (ThemeContext, ErrorBoundary, layout)
2. **Components receive props** — no direct hook or API calls
3. **Hook APIs are frozen** — signature changes require updating all call sites
4. **swiperRef must be passed** — never recreate inside components

### State Management

- **No global state libraries** (Redux, MobX)
- **React Context** for theme only
- **Custom hooks** for shared logic
- **Prop drilling** is acceptable for this app size

### Platform Differences

Always check `Platform.OS` for:
- Token storage (SecureStore vs AsyncStorage)
- Haptic feedback (not available on web)
- OAuth flow (redirect vs in-app browser)

**Example**

````tsx
if (Platform.OS !== 'web') {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}
````

---

## See Also

- [Architecture Guide](../guides/architecture.md)
- [API Reference](../api/README.md)
- [AGENTS.md](../../AGENTS.md)
