# Hooks API Reference

IssueCrush provides a set of custom React hooks for managing authentication, issues, animations, and keyboard shortcuts.

## Table of Contents

- [useAuth](#useauth)
- [useIssues](#useissues)
- [useAnimations](#useanimations)
- [useKeyboardShortcuts](#usekeyboardshortcuts)

---

## useAuth

Manages GitHub OAuth authentication and session management.

### Import

````typescript
import { useAuth } from './src/hooks/useAuth';
````

### Usage

````typescript
function MyComponent() {
  const {
    token,
    authError,
    setAuthError,
    copilotAvailable,
    startLogin,
    signOut,
  } = useAuth();

  // Use token for authenticated requests
  if (!token) {
    return <Button onPress={startLogin}>Sign In</Button>;
  }

  return <Button onPress={signOut}>Sign Out</Button>;
}
````

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `token` | `string \| null` | The session ID (opaque token stored client-side). The actual GitHub token is stored server-side. |
| `authError` | `string` | Authentication error message (empty string if no error) |
| `setAuthError` | `(error: string) => void` | Function to set/clear auth error messages |
| `copilotAvailable` | `boolean \| null` | Whether GitHub Copilot is available on the backend. `null` while checking. |
| `startLogin` | `() => Promise<void>` | Initiates GitHub OAuth flow (device flow on mobile, web flow on browser) |
| `signOut` | `() => Promise<void>` | Signs out user and clears session |

### Authentication Flow

1. **Web:** Redirects to GitHub OAuth, returns with code in URL query params
2. **Mobile:** Opens in-app browser, receives code via deep link
3. Code is exchanged for session ID via `/api/github-token` endpoint
4. Session ID is stored securely using platform-specific storage

### Platform-Specific Behavior

- **Web:** Uses `window.location.href` for OAuth redirect
- **Mobile:** Uses `expo-auth-session` and `expo-web-browser` for in-app OAuth
- **Storage:** See [Session Management](../architecture/session-management.md)

### Environment Variables

- `EXPO_PUBLIC_GITHUB_CLIENT_ID` - GitHub OAuth app client ID (required)
- `EXPO_PUBLIC_GITHUB_SCOPE` - OAuth scope (default: `repo`)
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_REDIRECT_URI` - OAuth redirect URI (defaults to current origin on web)

### Error Handling

Common errors returned in `authError`:

- `"Missing EXPO_PUBLIC_GITHUB_CLIENT_ID env var."` - Environment not configured
- `"GitHub OAuth failed: bad_verification_code"` - Code expired or already used
- `"Failed to connect to auth server"` - Backend server not running
- `"Session expired. Please sign in again."` - Session invalidated server-side

---

## useIssues

Manages GitHub issue fetching, swipe actions, and AI summaries.

### Import

````typescript
import { useIssues } from './src/hooks/useIssues';
````

### Usage

````typescript
function IssueManager() {
  const { token } = useAuth();
  const {
    issues,
    currentIssue,
    loadingIssues,
    loadIssues,
    handleSwipeLeft,
    handleSwipeRight,
    handleUndo,
    swiperRef,
  } = useIssues(token);

  useEffect(() => {
    if (token) {
      loadIssues();
    }
  }, [token, loadIssues]);

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

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string \| null` | Session ID from `useAuth` |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `issues` | `GitHubIssue[]` | Array of loaded GitHub issues |
| `currentIssue` | `GitHubIssue \| undefined` | Currently visible issue (at `currentIndex`) |
| `loadingIssues` | `boolean` | Whether issues are being fetched |
| `loadingAiSummary` | `boolean` | Whether AI summary is being generated |
| `currentIndex` | `number` | Index of current issue in the deck |
| `lastClosed` | `GitHubIssue \| null` | Most recently closed issue (for undo) |
| `undoBusy` | `boolean` | Whether undo operation is in progress |
| `feedback` | `string` | User feedback message (success/error) |
| `repoFilter` | `string` | Current repository filter |
| `labelFilter` | `string` | Current label filter |
| `swiperRef` | `RefObject<Swiper>` | **Critical:** Ref for react-native-deck-swiper. Must be passed to `<Swiper ref={swiperRef}>` for undo to work. |
| `confettiRef` | `RefObject<any>` | Ref for confetti animation component |
| `loadIssues` | `() => Promise<void>` | Fetches issues based on current filters |
| `handleSwipeLeft` | `(cardIndex: number) => Promise<void>` | Closes issue (triggers haptic feedback on mobile) |
| `handleSwipeRight` | `(cardIndex: number) => void` | Keeps issue open (triggers haptic feedback on mobile) |
| `handleUndo` | `() => Promise<void>` | Reopens last closed issue |
| `handleAiSummary` | `(issue: GitHubIssue) => Promise<void>` | Generates AI summary for an issue |
| `setRepoFilter` | `(filter: string) => void` | Sets repository filter (e.g., "owner/repo") |
| `setLabelFilter` | `(filter: string) => void` | Sets label filter |
| `setFeedback` | `(message: string) => void` | Sets user feedback message |
| `repoLabel` | `(issue: GitHubIssue) => string` | Extracts repository name from issue |

### Haptic Feedback

- **Swipe Left (Close):** Heavy impact (`Haptics.ImpactFeedbackStyle.Heavy`)
- **Swipe Right (Keep):** Light impact (`Haptics.ImpactFeedbackStyle.Light`)
- **Undo Success:** Success notification (`Haptics.NotificationFeedbackType.Success`)
- **Undo Error:** Error notification (`Haptics.NotificationFeedbackType.Error`)

**Note:** Haptic feedback only triggers on mobile (`Platform.OS !== 'web'`)

### AI Summaries

The `handleAiSummary` function:

1. Calls `/api/ai-summary` endpoint with issue details
2. Streams response from GitHub Copilot SDK
3. Updates `issue.aiSummary` property
4. Sets `loadingAiSummary` to `true` during generation

Requires `GH_TOKEN` or `COPILOT_PAT` environment variable on backend.

### State Management

- Issues are stored in component state (not persisted across sessions)
- Filters are in-memory (reset on page reload)
- Last closed issue is tracked for undo (only one level deep)

---

## useAnimations

Provides declarative animations for UI elements using `react-native-reanimated`.

### Import

````typescript
import { useAnimations } from './src/hooks/useAnimations';
````

### Usage

````typescript
import Animated from 'react-native-reanimated';

function AnimatedUI() {
  const { theme } = useTheme();
  const {
    toastAnimatedStyle,
    progressAnimatedStyle,
    closeAnimatedStyle,
    handleClosePressIn,
    handleClosePressOut,
  } = useAnimations(theme, feedback, currentIndex, issues.length, inputFocused);

  return (
    <>
      <Animated.View style={[styles.toast, toastAnimatedStyle]}>
        <Text>{feedback}</Text>
      </Animated.View>

      <Animated.View style={[styles.progress, progressAnimatedStyle]} />

      <Animated.View
        style={closeAnimatedStyle}
        onTouchStart={handleClosePressIn}
        onTouchEnd={handleClosePressOut}
      >
        <Button>Close</Button>
      </Animated.View>
    </>
  );
}
````

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `theme` | `Theme` | Current theme object from ThemeContext |
| `feedback` | `string` | Feedback message (triggers toast animation when non-empty) |
| `currentIndex` | `number` | Current issue index (drives progress bar) |
| `issuesLength` | `number` | Total number of issues (for progress calculation) |
| `inputFocused` | `boolean` | Whether input is focused (drives border animation) |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `showCrumble` | `boolean` | Whether crumble animation is playing |
| `triggerCrumbleAnimation` | `() => void` | Triggers the crumble effect (card destruction) |
| `crumbleAnimatedStyle` | `AnimatedStyle` | Animated style for crumble effect |
| `toastAnimatedStyle` | `AnimatedStyle` | Animated style for toast notification (slide up/fade) |
| `inputAnimatedStyle` | `AnimatedStyle` | Animated style for input border (color + width transition) |
| `progressAnimatedStyle` | `AnimatedStyle` | Animated style for progress bar (width transition) |
| `undoAnimatedStyle` | `AnimatedStyle` | Animated style for undo button (scale on press) |
| `closeAnimatedStyle` | `AnimatedStyle` | Animated style for close button (scale on press) |
| `keepAnimatedStyle` | `AnimatedStyle` | Animated style for keep button (scale on press) |
| `handleClosePressIn` | `() => void` | Call on close button press start |
| `handleClosePressOut` | `() => void` | Call on close button press end |
| `handleKeepPressIn` | `() => void` | Call on keep button press start |
| `handleKeepPressOut` | `() => void` | Call on keep button press end |
| `handleUndoPressIn` | `() => void` | Call on undo button press start |
| `handleUndoPressOut` | `() => void` | Call on undo button press end |

### Animation Details

- **Toast:** Spring animation for entry, timing for exit
- **Progress Bar:** Spring animation with damping for smooth transitions
- **Input Border:** Color interpolation + width transition
- **Button Press:** Scale to 0.9 with spring physics
- **Crumble Effect:** Scale, rotate, and fade out over 800ms

---

## useKeyboardShortcuts

Handles keyboard shortcuts for desktop users (web only).

### Import

````typescript
import { useKeyboardShortcuts } from './src/hooks/useKeyboardShortcuts';
````

### Usage

````typescript
function App() {
  const { handleSwipeLeft, handleSwipeRight, handleUndo } = useIssues(token);

  useKeyboardShortcuts({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onUndo: handleUndo,
    currentIndex,
  });

  return <MainUI />;
}
````

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `onSwipeLeft` | `(index: number) => void` | Callback when left arrow or 'X' pressed |
| `onSwipeRight` | `(index: number) => void` | Callback when right arrow or 'O' pressed |
| `onUndo` | `() => void` | Callback when 'Z' or 'U' pressed |
| `currentIndex` | `number` | Current issue index (passed to callbacks) |

### Keyboard Mappings

| Key(s) | Action |
|--------|--------|
| `←` (Left Arrow) | Swipe left / Close issue |
| `→` (Right Arrow) | Swipe right / Keep issue |
| `X` | Close issue (same as left arrow) |
| `O` | Keep issue (same as right arrow) |
| `Z` | Undo last close |
| `U` | Undo last close |

### Platform Support

Only active on `Platform.OS === 'web'`. No-op on mobile platforms.

### Implementation Notes

- Uses `window.addEventListener('keydown')` under the hood
- Automatically cleans up event listeners on unmount
- Prevents default browser behavior for handled keys

---

## Related Documentation

- [GitHub Client API](./github-client.md)
- [Copilot Service API](./copilot-service.md)
- [Architecture Overview](../architecture/overview.md)
- [Session Management](../architecture/session-management.md)
