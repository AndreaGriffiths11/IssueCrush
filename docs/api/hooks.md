# Hooks API Reference

This document describes the custom React hooks used in IssueCrush.

## Table of Contents

- [useAuth](#useauth)
- [useIssues](#useissues)
- [useAnimations](#useanimations)
- [useKeyboardShortcuts](#usekeyboardshortcuts)

---

## useAuth

Manages GitHub OAuth authentication, token storage, and session management.

### Usage

````typescript
import { useAuth } from '@/hooks';

function MyComponent() {
  const { token, startLogin, signOut, authError, copilotAvailable } = useAuth();
  
  return (
    <button onClick={startLogin}>
      {token ? 'Signed In' : 'Sign In'}
    </button>
  );
}
````

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `token` | `string \| null` | Current session token (stored session ID) |
| `authError` | `string` | Error message from authentication process |
| `setAuthError` | `(error: string) => void` | Update auth error state |
| `copilotAvailable` | `boolean \| null` | Whether GitHub Copilot AI is available on the server |
| `startLogin` | `() => Promise<void>` | Initiates GitHub OAuth flow |
| `signOut` | `() => Promise<void>` | Signs out user and clears session |

### Platform Behavior

- **Web**: Redirects to GitHub OAuth page, exchanges code for token on callback
- **Mobile**: Opens in-app browser with GitHub OAuth, handles deep link callback

### Environment Variables

- `EXPO_PUBLIC_GITHUB_CLIENT_ID` - GitHub OAuth App client ID (required)
- `EXPO_PUBLIC_GITHUB_SCOPE` - OAuth scope (default: `'repo'`)
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_REDIRECT_URI` - OAuth redirect URI (web only)

### Implementation Details

1. **Token Storage**: Uses `expo-secure-store` on mobile, `AsyncStorage` on web
2. **Token Exchange**: Sends auth code to `/api/github-token`, receives session ID
3. **Copilot Check**: Polls `/api/health` endpoint to detect AI availability
4. **Web Callback**: Automatically handles `?code=` query parameter on mount

### Error Handling

Common error messages:
- `"Missing EXPO_PUBLIC_GITHUB_CLIENT_ID env var"` - Configuration issue
- `"Failed to connect to auth server"` - Server not running or unreachable
- `"No authorization code received"` - OAuth flow interrupted
- `"Server error: 500"` - Backend token exchange failed

---

## useIssues

Manages issue loading, swipe actions, undo functionality, and AI summaries.

### Usage

````typescript
import { useIssues } from '@/hooks';

function SwipeInterface() {
  const {
    issues,
    swiperRef,
    loadIssues,
    handleSwipeLeft,
    handleSwipeRight,
    handleUndo,
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

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string \| null` | Session token from `useAuth()` |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `issues` | `GitHubIssue[]` | Array of loaded issues |
| `loadingIssues` | `boolean` | Whether issues are currently loading |
| `loadingAiSummary` | `boolean` | Whether AI summary is being fetched |
| `currentIndex` | `number` | Index of current card in swiper |
| `lastClosed` | `GitHubIssue \| null` | Most recently closed issue (for undo) |
| `undoBusy` | `boolean` | Whether undo operation is in progress |
| `feedback` | `string` | Current toast/feedback message |
| `setFeedback` | `(msg: string) => void` | Manually set feedback message |
| `repoFilter` | `string` | Current repository filter (e.g., `'owner/repo'`) |
| `setRepoFilter` | `(filter: string) => void` | Update repository filter |
| `labelFilter` | `string` | Current label filter |
| `setLabelFilter` | `(filter: string) => void` | Update label filter |
| `swiperRef` | `RefObject<Swiper>` | Ref for `react-native-deck-swiper` component |
| `confettiRef` | `RefObject<any>` | Ref for confetti cannon |
| `repoLabel` | `(issue: GitHubIssue) => string` | Extracts repo label from issue |
| `loadIssues` | `() => Promise<void>` | Load issues from GitHub API |
| `handleSwipeLeft` | `(index: number) => Promise<void>` | Close issue (swipe left) |
| `handleSwipeRight` | `(index: number) => Promise<void>` | Keep issue (swipe right) |
| `onSwiped` | `(index: number) => void` | Callback after any swipe completes |
| `handleUndo` | `() => Promise<void>` | Undo last close action |
| `handleGetAiSummary` | `() => Promise<void>` | Fetch AI summary for current issue |

### Behavior

#### Swipe Left (Close)
1. Triggers heavy haptic feedback (mobile only)
2. Calls GitHub API to close the issue
3. Stores issue in `lastClosed` for undo
4. Updates feedback: `"Closed #123 · owner/repo"`

#### Swipe Right (Keep)
1. Triggers light haptic feedback (mobile only)
2. No API call (issue stays open)
3. Updates feedback: `"Kept open · #123"`

#### Undo
1. Calls `swiperRef.current.swipeBack()` to animate card back
2. Decrements `currentIndex`
3. Calls GitHub API to reopen the issue
4. Triggers success haptic (mobile only)
5. Clears `lastClosed`

#### AI Summary
1. Only works if issue doesn't already have `aiSummary`
2. Calls `copilotService.summarizeIssue()`
3. Updates the issue in state with returned summary
4. Sets `loadingAiSummary` during fetch

### Critical Implementation Notes

⚠️ **Architecture Boundary**: `swiperRef` must be passed as a prop to components — never recreate it inside a child component. This ref is required for the undo feature.

---

## useAnimations

Provides animated styles and animation triggers for UI elements using `react-native-reanimated`.

### Usage

````typescript
import { useAnimations } from '@/hooks';
import Animated from 'react-native-reanimated';

function MyComponent() {
  const { toastAnimatedStyle, progressAnimatedStyle } = useAnimations(
    theme,
    feedback,
    currentIndex,
    issues.length,
    inputFocused
  );

  return (
    <>
      <Animated.View style={[styles.toast, toastAnimatedStyle]}>
        <Text>{feedback}</Text>
      </Animated.View>
      
      <Animated.View style={[styles.progress, progressAnimatedStyle]} />
    </>
  );
}
````

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `theme` | `Theme` | Current theme object |
| `feedback` | `string` | Current feedback message |
| `currentIndex` | `number` | Current issue index |
| `issuesLength` | `number` | Total number of issues |
| `inputFocused` | `boolean` | Whether input field is focused |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `showCrumble` | `boolean` | Whether crumble animation is active |
| `triggerCrumbleAnimation` | `() => void` | Start crumble effect |
| `crumbleAnimatedStyle` | `AnimatedStyle` | Animated style for crumble effect |
| `toastAnimatedStyle` | `AnimatedStyle` | Slide + fade animation for toast |
| `inputAnimatedStyle` | `AnimatedStyle` | Border color animation for input |
| `progressAnimatedStyle` | `AnimatedStyle` | Width animation for progress bar |
| `undoAnimatedStyle` | `AnimatedStyle` | Scale animation for undo button |
| `closeAnimatedStyle` | `AnimatedStyle` | Scale animation for close button |
| `keepAnimatedStyle` | `AnimatedStyle` | Scale animation for keep button |
| `handleClosePressIn` | `() => void` | PressIn handler for close button |
| `handleClosePressOut` | `() => void` | PressOut handler for close button |
| `handleKeepPressIn` | `() => void` | PressIn handler for keep button |
| `handleKeepPressOut` | `() => void` | PressOut handler for keep button |
| `handleUndoPressIn` | `() => void` | PressIn handler for undo button |
| `handleUndoPressOut` | `() => void` | PressOut handler for undo button |

### Animations

#### Toast Animation
- **Enter**: Slides up from `translateY: 100` to `0` with spring physics
- **Exit**: Slides down to `translateY: 100` and fades out
- **Duration**: 200-300ms
- **Trigger**: When `feedback` changes to non-empty string

#### Progress Bar Animation
- **Type**: Width percentage based on `currentIndex / issuesLength`
- **Spring Config**: `damping: 15, stiffness: 100`
- **Trigger**: When `currentIndex` or `issuesLength` changes

#### Input Focus Animation
- **Type**: Border color interpolation and width change
- **Colors**: `theme.border` → `theme.primary`
- **Border Width**: `1px` → `2px`
- **Duration**: 200ms
- **Trigger**: When `inputFocused` changes

#### Button Press Animations
- **Type**: Scale down to `0.9` on press, spring back to `1.0` on release
- **Spring Config**: Default spring physics
- **Usage**: Apply to FAB buttons for tactile feedback

#### Crumble Animation
- **Sequence**:
  1. Scale: `1.0` → `1.2` → `0.2` (150ms + 650ms)
  2. Rotate: `0deg` → `45deg` (800ms)
  3. Opacity: `1.0` → `0.0` (800ms)
  4. TranslateY: `0` → `150` (800ms)
- **Easing**: Cubic out/in
- **Use Case**: Dramatic delete/close effect

---

## useKeyboardShortcuts

Registers keyboard shortcuts for desktop users. Web only.

### Usage

````typescript
import { useKeyboardShortcuts } from '@/hooks';

function App() {
  useKeyboardShortcuts({
    onClose: handleSwipeLeft,
    onKeep: handleSwipeRight,
    onUndo: handleUndo,
    onRefresh: loadIssues,
    onHelp: () => setShowHelp(true),
  });
  
  return <MainUI />;
}
````

### Parameters

| Property | Type | Description |
|----------|------|-------------|
| `onClose` | `() => void` | Handler for close action |
| `onKeep` | `() => void` | Handler for keep action |
| `onUndo` | `() => void` | Handler for undo action |
| `onRefresh` | `() => void` | Handler for refresh action |
| `onHelp` | `() => void` | Handler for help modal |

### Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| <kbd>←</kbd> | Close | Swipe left (close issue) |
| <kbd>→</kbd> | Keep | Swipe right (keep issue) |
| <kbd>Z</kbd> | Undo | Undo last close action |
| <kbd>R</kbd> | Refresh | Reload issues |
| <kbd>?</kbd> | Help | Show keyboard shortcuts help |

### Platform Support

- **Web**: Fully supported
- **Mobile**: No-op (automatically disabled)

### Implementation Notes

- Uses `window.addEventListener('keydown', handler)`
- Cleans up event listener on unmount
- Only registers if `Platform.OS === 'web'`

---

## See Also

- [Components API](./components.md)
- [Utilities API](./utilities.md)
- [Architecture Guide](../guides/architecture.md)
