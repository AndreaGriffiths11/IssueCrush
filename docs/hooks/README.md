# Hooks Reference

IssueCrush uses custom React hooks to manage business logic and state. **Hooks own the business logic** - they handle API calls, state management, and side effects.

## Hook Principles

1. **Hooks own logic** - Business logic lives in hooks, not components
2. **Single responsibility** - Each hook has a clear, focused purpose
3. **Composable** - Hooks can use other hooks
4. **Testable** - Hooks can be tested independently
5. **Frozen APIs** - Hook signatures should remain stable; if a signature must change, update all call sites

## Hooks

### useAuth

Manages GitHub OAuth authentication and session state.

**Location**: `src/hooks/useAuth.ts`

**Signature:**

````typescript
function useAuth(): {
  token: string | null;
  authError: string;
  setAuthError: (error: string) => void;
  copilotAvailable: boolean | null;
  startLogin: () => Promise<void>;
  signOut: () => Promise<void>;
}
````

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `token` | `string \| null` | Session ID (null if not authenticated) |
| `authError` | `string` | Current authentication error message |
| `setAuthError` | `(error: string) => void` | Set error message |
| `copilotAvailable` | `boolean \| null` | Whether Copilot is available (null = checking) |
| `startLogin` | `() => Promise<void>` | Initiate OAuth login flow |
| `signOut` | `() => Promise<void>` | Sign out and clear session |

**Usage:**

````typescript
import { useAuth } from './hooks/useAuth';

function App() {
  const { token, authError, copilotAvailable, startLogin, signOut } = useAuth();
  
  if (!token) {
    return <AuthScreen onLogin={startLogin} authError={authError} />;
  }
  
  return <MainApp onSignOut={signOut} />;
}
````

**Features:**

- **Platform-aware OAuth flow**:
  - Web: Redirects to GitHub, handles callback via query params
  - Mobile: Opens in-app browser, captures redirect URI
- **Token hydration**: Loads session from storage on mount
- **Copilot availability check**: Polls `/api/health` with retry
- **OAuth callback handling**: Extracts code from URL and exchanges for session
- **Server-side token storage**: Only session IDs stored client-side

**Environment Variables:**

- `EXPO_PUBLIC_GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `EXPO_PUBLIC_GITHUB_SCOPE` - OAuth scope (default: `repo`)
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_REDIRECT_URI` - OAuth redirect URI (web only)

---

### useIssues

Manages GitHub issues loading, filtering, swipe actions, and AI summaries.

**Location**: `src/hooks/useIssues.ts`

**Signature:**

````typescript
function useIssues(token: string | null): {
  issues: GitHubIssue[];
  loadingIssues: boolean;
  loadingAiSummary: boolean;
  currentIndex: number;
  lastClosed: GitHubIssue | null;
  undoBusy: boolean;
  feedback: string;
  setFeedback: (message: string) => void;
  repoFilter: string;
  setRepoFilter: (filter: string) => void;
  labelFilter: string;
  setLabelFilter: (filter: string) => void;
  swiperRef: React.RefObject<Swiper<GitHubIssue>>;
  confettiRef: React.RefObject<any>;
  repoLabel: (issue: GitHubIssue) => string;
  loadIssues: () => Promise<void>;
  handleSwipeLeft: (cardIndex: number) => Promise<void>;
  handleSwipeRight: (cardIndex: number) => Promise<void>;
  onSwiped: (index: number) => void;
  handleUndo: () => Promise<void>;
  handleGetAiSummary: () => Promise<void>;
}
````

**Parameters:**

- `token` - Session ID (null if not authenticated)

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `issues` | `GitHubIssue[]` | Array of loaded issues |
| `loadingIssues` | `boolean` | Whether issues are loading |
| `loadingAiSummary` | `boolean` | Whether AI summary is loading |
| `currentIndex` | `number` | Current card index in swiper |
| `lastClosed` | `GitHubIssue \| null` | Last closed issue (for undo) |
| `undoBusy` | `boolean` | Whether undo is in progress |
| `feedback` | `string` | User feedback message |
| `setFeedback` | `(message: string) => void` | Set feedback message |
| `repoFilter` | `string` | Repository filter value |
| `setRepoFilter` | `(filter: string) => void` | Set repository filter |
| `labelFilter` | `string` | Label filter value |
| `setLabelFilter` | `(filter: string) => void` | Set label filter |
| `swiperRef` | `React.RefObject<Swiper>` | Ref for swiper component (required for undo) |
| `confettiRef` | `React.RefObject<any>` | Ref for confetti component |
| `repoLabel` | `(issue) => string` | Extract "owner/repo" from issue |
| `loadIssues` | `() => Promise<void>` | Fetch issues from API |
| `handleSwipeLeft` | `(cardIndex) => Promise<void>` | Close issue (swipe left) |
| `handleSwipeRight` | `(cardIndex) => Promise<void>` | Keep issue (swipe right) |
| `onSwiped` | `(index) => void` | Card swipe completed callback |
| `handleUndo` | `() => Promise<void>` | Undo last close |
| `handleGetAiSummary` | `() => Promise<void>` | Get AI summary for current issue |

**Usage:**

````typescript
import { useIssues } from './hooks/useIssues';

function MainApp({ token }: { token: string }) {
  const {
    issues,
    loadingIssues,
    currentIndex,
    lastClosed,
    swiperRef,
    repoFilter,
    setRepoFilter,
    loadIssues,
    handleSwipeLeft,
    handleSwipeRight,
    onSwiped,
    handleUndo,
  } = useIssues(token);
  
  return (
    <SwipeContainer
      issues={issues}
      swiperRef={swiperRef}
      currentIndex={currentIndex}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onSwiped={onSwiped}
      onUndo={handleUndo}
    />
  );
}
````

**Features:**

- **Issues loading** with filtering by repo and labels
- **Swipe actions** with haptic feedback (mobile only)
- **Undo functionality** with swipeBack() on swiper ref
- **AI summary loading** with per-issue caching
- **Auto-dismiss feedback** after 2.2 seconds
- **Confetti trigger** when all issues swiped
- **Progress tracking** via currentIndex

**Important:**

⚠️ **`swiperRef` must be passed as prop** - Never recreate inside a component. This ref is required for undo (swipeBack) functionality.

````typescript
// ✅ Good - pass ref as prop
<Swiper ref={swiperRef} />

// ❌ Bad - recreating ref breaks undo
const localRef = useRef();
<Swiper ref={localRef} />
````

---

### useAnimations

Provides animation values for swipe overlays and interactions.

**Location**: `src/hooks/useAnimations.ts`

**Signature:**

````typescript
function useAnimations(): {
  closeOpacity: Animated.Value;
  keepOpacity: Animated.Value;
  triggerCloseAnimation: () => void;
  triggerKeepAnimation: () => void;
  resetAnimations: () => void;
}
````

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `closeOpacity` | `Animated.Value` | Opacity value for "CLOSE" overlay |
| `keepOpacity` | `Animated.Value` | Opacity value for "KEEP" overlay |
| `triggerCloseAnimation` | `() => void` | Animate "CLOSE" stamp |
| `triggerKeepAnimation` | `() => void` | Animate "KEEP" stamp |
| `resetAnimations` | `() => void` | Reset all animations |

**Usage:**

````typescript
import { useAnimations } from './hooks/useAnimations';

function SwipeCard() {
  const {
    closeOpacity,
    keepOpacity,
    triggerCloseAnimation,
    triggerKeepAnimation,
  } = useAnimations();
  
  return (
    <>
      <Animated.View style={{ opacity: closeOpacity }}>
        <Text>CLOSE</Text>
      </Animated.View>
      <Animated.View style={{ opacity: keepOpacity }}>
        <Text>KEEP</Text>
      </Animated.View>
    </>
  );
}
````

**Animation Details:**

- **Duration**: 300ms
- **Easing**: `Animated.timing` with default easing
- **Values**: 0 (hidden) to 1 (fully visible)
- **Reset**: Returns to 0

---

### useKeyboardShortcuts

Manages keyboard shortcuts for desktop interactions.

**Location**: `src/hooks/useKeyboardShortcuts.ts`

**Signature:**

````typescript
function useKeyboardShortcuts(handlers: {
  onLeft: () => void;
  onRight: () => void;
  onUndo: () => void;
  onAiSummary: () => void;
  onRefresh: () => void;
  onHelp: () => void;
}): void
````

**Parameters:**

Object with handler functions for each shortcut:

| Handler | Keys | Action |
|---------|------|--------|
| `onLeft` | `ArrowLeft`, `X` | Swipe left (close issue) |
| `onRight` | `ArrowRight`, `K` | Swipe right (keep issue) |
| `onUndo` | `U` | Undo last action |
| `onAiSummary` | `A` | Get AI summary |
| `onRefresh` | `R` | Refresh issues |
| `onHelp` | `?` | Show help overlay |

**Usage:**

````typescript
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  useKeyboardShortcuts({
    onLeft: () => swiperRef.current?.swipeLeft(),
    onRight: () => swiperRef.current?.swipeRight(),
    onUndo: handleUndo,
    onAiSummary: handleGetAiSummary,
    onRefresh: loadIssues,
    onHelp: () => setShowHelp(true),
  });
  
  return <MainApp />;
}
````

**Platform:**

- Web only (no-op on mobile)
- Listens to `keydown` events
- Automatically cleans up on unmount

---

## Hook Composition

Hooks can use other hooks:

````typescript
// useAuth uses tokenStorage functions
import { getToken, saveToken, deleteToken } from '../lib/tokenStorage';

export function useAuth() {
  // Uses tokenStorage internally
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const hydrate = async () => {
      const stored = await getToken();
      if (stored) setToken(stored);
    };
    hydrate();
  }, []);
  
  // ...
}
````

## Testing Hooks

Use `@testing-library/react-hooks` for hook testing:

````typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuth } from './useAuth';

test('loads token from storage', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useAuth());
  
  await waitForNextUpdate();
  
  expect(result.current.token).toBe('test-session-id');
});
````

## Architecture Boundaries

From AGENTS.md:

> Hook APIs (`useAuth`, `useIssues`, `useAnimations`) are frozen — if a signature must change, update all call sites and explain why in the PR

When modifying hooks:
1. Consider backward compatibility
2. If breaking changes are needed, update ALL components that use the hook
3. Document the change in the PR description
4. Consider providing a deprecation path

## Related

- [Component Reference](../components/README.md) - Components that use these hooks
- [API Reference](../api/github-client.md) - APIs called by hooks
- [AGENTS.md](../../AGENTS.md) - Architecture patterns and boundaries
