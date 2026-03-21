# Hooks API Reference

IssueCrush uses **custom React hooks** to encapsulate business logic and keep components focused on presentation. This document provides detailed API documentation for each hook.

## Table of Contents

- [useAuth](#useauth) - Authentication and OAuth
- [useIssues](#useissues) - Issue management and swipe actions
- [useAnimations](#useanimations) - Animation coordination

---

## `useAuth()`

Manages GitHub OAuth authentication, session management, and Copilot availability detection.

### Import

````typescript
import { useAuth } from './src/hooks/useAuth';
````

### Signature

````typescript
function useAuth(): {
  token: string | null;
  authError: string;
  copilotAvailable: boolean | null;
  startAuth: () => Promise<void>;
  logout: () => Promise<void>;
}
````

### Return Values

#### `token: string | null`
Current session token. `null` if not authenticated.

**Usage:**
````typescript
const { token } = useAuth();

if (!token) {
  return <AuthScreen />;
}
````

#### `authError: string`
OAuth error message. Empty string if no error.

**Common errors:**
- `"bad_verification_code"` - Code expired or already used
- `"Server error: 401"` - Invalid client credentials
- `"Failed to connect to auth server"` - Server not running

#### `copilotAvailable: boolean | null`
Whether GitHub Copilot AI features are available. `null` if not yet checked.

**Checked on:**
- Initial app load
- After successful authentication

#### `startAuth(): Promise<void>`
Initiates the GitHub OAuth flow.

**Platform Behavior:**
- **Web:** Opens GitHub authorization in same window, returns via redirect
- **Mobile:** Uses device flow - displays code and polls for authorization

**Example:**
````typescript
const { startAuth, authError } = useAuth();

<Button onPress={startAuth} title="Login with GitHub" />
{authError && <Text>{authError}</Text>}
````

**OAuth Flow:**
1. User calls `startAuth()`
2. Web: Redirect to `https://github.com/login/oauth/authorize`
3. Mobile: POST to `https://github.com/login/device/code`
4. User authorizes on GitHub
5. Code exchanged for token at `/api/github-token`
6. Session ID saved to secure storage
7. `token` state updates

#### `logout(): Promise<void>`
Clears authentication state and removes stored token.

**Example:**
````typescript
const { logout } = useAuth();

<Button onPress={logout} title="Sign Out" />
````

### Environment Variables

`useAuth` requires these environment variables:

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
EXPO_PUBLIC_GITHUB_SCOPE=repo  # Use 'repo', not 'public_repo'
EXPO_PUBLIC_API_URL=http://localhost:3000  # Optional, defaults to ''
EXPO_PUBLIC_REDIRECT_URI=http://localhost:3000  # Web only
````

### Security Notes

- Tokens stored in `expo-secure-store` (mobile) or `AsyncStorage` (web)
- Client secret never exposed to frontend
- Token exchange happens server-side
- All GitHub API calls use user's OAuth token

---

## `useIssues(token)`

Manages GitHub issue fetching, swipe actions, undo functionality, and AI summaries.

### Import

````typescript
import { useIssues } from './src/hooks/useIssues';
````

### Signature

````typescript
function useIssues(token: string | null): {
  // State
  issues: GitHubIssue[];
  loadingIssues: boolean;
  loadingAiSummary: boolean;
  currentIndex: number;
  lastClosed: GitHubIssue | null;
  undoBusy: boolean;
  feedback: string;
  repoFilter: string;
  labelFilter: string;
  
  // Refs
  swiperRef: React.RefObject<Swiper<GitHubIssue>>;
  confettiRef: React.RefObject<any>;
  
  // Actions
  setRepoFilter: (value: string) => void;
  setLabelFilter: (value: string) => void;
  loadIssues: () => Promise<void>;
  handleSwipeLeft: (cardIndex: number) => Promise<void>;
  handleSwipeRight: (cardIndex: number) => Promise<void>;
  handleUndo: () => Promise<void>;
  handleAISummary: () => Promise<void>;
  repoLabel: (issue: GitHubIssue) => string;
}
````

### Return Values

#### State

##### `issues: GitHubIssue[]`
Array of GitHub issues fetched from the API.

**Type Definition:**
````typescript
interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  html_url: string;
  repository_url: string;
  repository?: {
    full_name: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
}
````

##### `loadingIssues: boolean`
Whether issues are currently being fetched.

##### `loadingAiSummary: boolean`
Whether an AI summary request is in progress.

##### `currentIndex: number`
Index of the currently visible issue card. Updates on swipe.

##### `lastClosed: GitHubIssue | null`
The most recently closed issue. Used for undo functionality. `null` if no issue has been closed.

##### `undoBusy: boolean`
Whether an undo operation is in progress.

##### `feedback: string`
User-facing feedback message. Examples:
- `"Loaded 23 open issues"`
- `"No open issues found"`
- `"Closed issue #42"`
- `"AI summary failed: Not available"`

##### `repoFilter: string`
Current repository filter. Empty string = all repos.

**Format:** `owner/repo` (e.g., `"facebook/react"`)

##### `labelFilter: string`
Current label filter. Empty string = all labels.

**Format:** Label name (e.g., `"bug"`, `"help wanted"`)

#### Refs

##### `swiperRef: React.RefObject<Swiper<GitHubIssue>>`
**CRITICAL:** Ref to the Swiper component. **Must** be passed to `<SwipeContainer />` for undo to work.

**Usage:**
````typescript
const { swiperRef, handleUndo } = useIssues(token);

<SwipeContainer
  swiperRef={swiperRef}
  onUndo={handleUndo}
  // ...
/>
````

##### `confettiRef: React.RefObject<any>`
Ref to the confetti cannon component for celebration effects.

#### Actions

##### `setRepoFilter(value: string): void`
Updates the repository filter. Does not trigger fetch - call `loadIssues()` to apply.

##### `setLabelFilter(value: string): void`
Updates the label filter. Does not trigger fetch - call `loadIssues()` to apply.

##### `loadIssues(): Promise<void>`
Fetches issues from GitHub with current filters applied.

**Example:**
````typescript
const { loadIssues, loadingIssues, setRepoFilter } = useIssues(token);

<TextInput
  value={repoFilter}
  onChangeText={setRepoFilter}
  placeholder="owner/repo"
/>
<Button
  onPress={loadIssues}
  title="Refresh"
  disabled={loadingIssues}
/>
````

**Behavior:**
- Resets `currentIndex` to 0
- Updates `feedback` with result count
- Catches and displays errors in `feedback`

##### `handleSwipeLeft(cardIndex: number): Promise<void>`
Called when user swipes left (close issue).

**Actions:**
1. Triggers haptic feedback (mobile only)
2. Closes issue on GitHub via API
3. Updates `lastClosed` for undo
4. Updates `feedback` message

**Example:**
````typescript
<SwipeContainer
  onSwipeLeft={handleSwipeLeft}
  // ...
/>
````

##### `handleSwipeRight(cardIndex: number): Promise<void>`
Called when user swipes right (keep issue).

**Actions:**
1. Triggers light haptic feedback (mobile only)
2. Displays "Kept issue" message
3. No GitHub API call (issue stays open)

##### `handleUndo(): Promise<void>`
Reopens the last closed issue.

**Requirements:**
- `lastClosed` must not be null
- `swiperRef` must be connected to Swiper component

**Actions:**
1. Calls `swiperRef.current?.swipeBack()` to restore card
2. Reopens issue on GitHub via API
3. Triggers success haptic (mobile only)
4. Clears `lastClosed`

**Example:**
````typescript
<Button
  onPress={handleUndo}
  disabled={!lastClosed || undoBusy}
  title="Undo"
/>
````

##### `handleAISummary(): Promise<void>`
Fetches AI-powered summary of current issue using GitHub Copilot SDK.

**Requirements:**
- `GH_TOKEN` or `COPILOT_PAT` must be set in server environment
- Server must be running on port 3000

**Actions:**
1. Sets `loadingAiSummary` to true
2. Sends issue to `/api/ai-summary` endpoint
3. Opens alert with AI analysis
4. Handles auth errors and suggests fixes

**Example:**
````typescript
<Button
  onPress={handleAISummary}
  disabled={loadingAiSummary}
  title="✨ Get AI Summary"
/>
````

##### `repoLabel(issue: GitHubIssue): string`
Extracts repository name from issue object.

**Returns:**
- `issue.repository.full_name` if available
- Otherwise, parses `repository_url` and extracts `owner/repo`

---

## `useAnimations(theme, feedback, currentIndex, issuesLength, inputFocused)`

Centralizes animation state and controls for a consistent, performant UI.

### Import

````typescript
import { useAnimations } from './src/hooks/useAnimations';
````

### Signature

````typescript
function useAnimations(
  theme: Theme,
  feedback: string,
  currentIndex: number,
  issuesLength: number,
  inputFocused: boolean
): {
  // Toast animation
  toastTranslateY: Animated.SharedValue<number>;
  toastOpacity: Animated.SharedValue<number>;
  toastStyle: ReturnType<typeof useAnimatedStyle>;
  showToast: () => void;
  
  // Input focus animation
  inputBorderColor: Animated.SharedValue<number>;
  inputBorderStyle: ReturnType<typeof useAnimatedStyle>;
  
  // Progress bar
  progressWidth: Animated.SharedValue<number>;
  progressStyle: ReturnType<typeof useAnimatedStyle>;
  
  // FAB button animations
  undoScale: Animated.SharedValue<number>;
  closeScale: Animated.SharedValue<number>;
  keepScale: Animated.SharedValue<number>;
  undoStyle: ReturnType<typeof useAnimatedStyle>;
  closeStyle: ReturnType<typeof useAnimatedStyle>;
  keepStyle: ReturnType<typeof useAnimatedStyle>;
  animateButtonPress: (button: 'undo' | 'close' | 'keep') => void;
  
  // Crumble animation
  showCrumble: boolean;
  crumbleStyle: ReturnType<typeof useAnimatedStyle>;
  triggerCrumbleAnimation: () => void;
}
````

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `theme` | `Theme` | Theme object from ThemeContext |
| `feedback` | `string` | Current feedback message (triggers toast) |
| `currentIndex` | `number` | Active card index (updates progress) |
| `issuesLength` | `number` | Total issues count (calculates progress %) |
| `inputFocused` | `boolean` | Input focus state (triggers border animation) |

### Return Values

#### Toast Animation

##### `toastStyle: AnimatedStyle`
Apply to toast notification container.

##### `showToast(): void`
Manually trigger toast animation (auto-triggers on `feedback` change).

**Example:**
````typescript
<Animated.View style={[styles.toast, toastStyle]}>
  <Text>{feedback}</Text>
</Animated.View>
````

#### Input Focus Animation

##### `inputBorderStyle: AnimatedStyle`
Animates input border color on focus/blur.

**Example:**
````typescript
<Animated.View style={[styles.input, inputBorderStyle]}>
  <TextInput />
</Animated.View>
````

#### Progress Bar

##### `progressStyle: AnimatedStyle`
Width animation for progress bar.

**Calculation:** `(currentIndex / issuesLength) * 100%`

**Example:**
````typescript
<View style={styles.progressBar}>
  <Animated.View style={[styles.progressFill, progressStyle]} />
</View>
````

#### FAB Button Animations

##### `undoStyle / closeStyle / keepStyle: AnimatedStyle`
Scale animations for action buttons.

##### `animateButtonPress(button: 'undo' | 'close' | 'keep'): void`
Trigger press animation (scale down → scale up).

**Example:**
````typescript
<Animated.View style={undoStyle}>
  <TouchableOpacity
    onPressIn={() => animateButtonPress('undo')}
    onPress={handleUndo}
  >
    <RotateCcw />
  </TouchableOpacity>
</Animated.View>
````

#### Crumble Animation

##### `showCrumble: boolean`
Whether crumble overlay is visible.

##### `crumbleStyle: AnimatedStyle`
Scale, rotation, opacity animation for paper-crumbling effect.

##### `triggerCrumbleAnimation(): void`
Start crumble animation sequence.

**Example:**
````typescript
{showCrumble && (
  <Animated.View style={[styles.crumble, crumbleStyle]}>
    {/* Crumble visual */}
  </Animated.View>
)}

<Button onPress={triggerCrumbleAnimation} title="Close with Style" />
````

---

## Best Practices

### 1. Hook Composition in Components

✅ **Correct:**
````typescript
function MyScreen() {
  const { token, logout } = useAuth();
  const { issues, loadIssues, swiperRef } = useIssues(token);
  const { theme } = useTheme();
  const animatedStyles = useAnimations(theme, feedback, currentIndex, issues.length, false);
  
  return <SwipeContainer swiperRef={swiperRef} /* ... */ />;
}
````

❌ **Wrong:**
````typescript
function MyScreen() {
  const allAuth = useAuth(); // Don't pass entire hook result
  return <SwipeContainer authHook={allAuth} />;
}
````

### 2. Memoization

All hook callbacks are memoized with `useCallback` for performance. Don't re-wrap them.

✅ **Correct:**
````typescript
const { handleSwipeLeft } = useIssues(token);
<SwipeContainer onSwipeLeft={handleSwipeLeft} />
````

❌ **Wrong:**
````typescript
const { handleSwipeLeft } = useIssues(token);
<SwipeContainer onSwipeLeft={() => handleSwipeLeft(index)} /> // Unnecessary wrapper
````

### 3. Ref Handling

Never recreate refs in child components. Always pass them down.

✅ **Correct:**
````typescript
// App.tsx
const { swiperRef } = useIssues(token);
<SwipeContainer swiperRef={swiperRef} />

// SwipeContainer.tsx
export function SwipeContainer({ swiperRef }: { swiperRef: React.RefObject<Swiper> }) {
  return <Swiper ref={swiperRef} />;
}
````

❌ **Wrong:**
````typescript
// SwipeContainer.tsx
export function SwipeContainer() {
  const swiperRef = useRef<Swiper>(null); // BREAKS UNDO
  return <Swiper ref={swiperRef} />;
}
````

---

## TypeScript Types

### GitHubIssue

Full type definition available in `src/api/github.ts`:

````typescript
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  html_url: string;
  repository_url: string;
  repository?: {
    full_name: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
}
````

### Theme

See `src/theme/themes.ts` for full theme type definition.

---

## Testing Hooks

Use `@testing-library/react-hooks` for isolated hook testing:

````typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuth } from './useAuth';

test('useAuth logout clears token', async () => {
  const { result } = renderHook(() => useAuth());
  
  await act(async () => {
    await result.current.logout();
  });
  
  expect(result.current.token).toBeNull();
});
````

---

## Related Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Component API Reference](./COMPONENTS.md)
- [AGENTS.md](../AGENTS.md)
