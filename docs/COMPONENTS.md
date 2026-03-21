# Component API Reference

IssueCrush uses **presentational components** that receive data via props and communicate via callbacks. This document provides detailed API documentation for each component.

## Table of Contents

- [AuthScreen](#authscreen) - OAuth login interface
- [IssueCard](#issuecard) - GitHub issue display card
- [SwipeContainer](#swipecontainer) - Swiper wrapper with overlays
- [Sidebar](#sidebar) - Desktop sidebar with filters

---

## `<AuthScreen />`

OAuth login interface with GitHub device code flow support.

### Import

````typescript
import { AuthScreen } from './src/components/AuthScreen';
````

### Props

````typescript
interface AuthScreenProps {
  onAuthStart: () => Promise<void>;
  authError: string;
}
````

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onAuthStart` | `() => Promise<void>` | ✅ | Callback to initiate OAuth flow |
| `authError` | `string` | ✅ | Error message to display (empty string if none) |

### Example Usage

````typescript
import { useAuth } from './src/hooks/useAuth';
import { AuthScreen } from './src/components/AuthScreen';

function App() {
  const { token, startAuth, authError } = useAuth();
  
  if (!token) {
    return <AuthScreen onAuthStart={startAuth} authError={authError} />;
  }
  
  return <MainInterface />;
}
````

### Features

- **Device Code Flow** - Displays 8-character code for mobile auth
- **Web Flow** - Redirects to GitHub authorization
- **Error Handling** - Shows OAuth errors with retry option
- **GitHub Branding** - GitHub logo and official color scheme
- **Responsive** - Adapts to mobile and desktop layouts

### Visual Design

- Centered layout with gradient background
- GitHub Invertocat logo
- Large "Start GitHub login" button
- Error messages in red with retry button

### Platform Behavior

| Platform | Behavior |
|----------|----------|
| Web | Redirects to GitHub OAuth page |
| iOS | Shows device code, user visits github.com/login/device |
| Android | Shows device code, user visits github.com/login/device |

---

## `<IssueCard />`

Displays a single GitHub issue with metadata, labels, and actions.

### Import

````typescript
import { IssueCard } from './src/components/IssueCard';
````

### Props

````typescript
interface IssueCardProps {
  issue: GitHubIssue;
  onGetAISummary: () => void;
  loadingAiSummary: boolean;
  theme: Theme;
}
````

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `issue` | `GitHubIssue` | ✅ | Issue data to display |
| `onGetAISummary` | `() => void` | ✅ | Callback for AI summary button |
| `loadingAiSummary` | `boolean` | ✅ | Whether AI summary is loading |
| `theme` | `Theme` | ✅ | Theme object for styling |

### Example Usage

````typescript
import { IssueCard } from './src/components/IssueCard';
import { useTheme } from './src/theme';

function MyComponent({ issue }: { issue: GitHubIssue }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  
  const handleAI = async () => {
    setLoading(true);
    await getAISummary(issue);
    setLoading(false);
  };
  
  return (
    <IssueCard
      issue={issue}
      onGetAISummary={handleAI}
      loadingAiSummary={loading}
      theme={theme}
    />
  );
}
````

### Features

#### Header Section
- **Repository name** - Clickable link (opens on GitHub)
- **Issue number** - Clickable badge (opens on GitHub)
- **User avatar** - Author profile picture
- **User login** - Author username

#### Body Section
- **Issue title** - Large, bold headline
- **Issue body** - Scrollable content area
- **Labels** - Colored badges with GitHub label colors
- **AI Summary button** - "✨ Get AI Summary" with loading state

#### Footer Section
- **Created date** - Relative time (e.g., "3 days ago")
- **Updated date** - Relative time

### Visual Design

- White card background with black border
- Rounded corners (12px)
- Drop shadow for depth
- Scrollable body (max 5 lines)
- Labels wrap to multiple lines if needed
- Responsive padding

### Interactions

| Element | Action | Result |
|---------|--------|--------|
| Repository name | Tap/Click | Opens repo on GitHub |
| Issue number | Tap/Click | Opens issue on GitHub |
| AI Summary button | Tap/Click | Triggers `onGetAISummary` |
| Card body | Scroll | Scrolls issue description |

### Accessibility

- All touchable elements have appropriate hit slop
- External links open in new tab (web)
- Loading states disable buttons
- Color contrast meets WCAG AA standards

---

## `<SwipeContainer />`

Wrapper for react-native-deck-swiper with action overlays and controls.

### Import

````typescript
import { SwipeContainer } from './src/components/SwipeContainer';
````

### Props

````typescript
interface SwipeContainerProps {
  issues: GitHubIssue[];
  currentIndex: number;
  swiperRef: React.RefObject<Swiper<GitHubIssue>>;
  confettiRef: React.RefObject<any>;
  onSwipeLeft: (index: number) => void;
  onSwipeRight: (index: number) => void;
  onClose: () => void;
  onKeep: () => void;
  onUndo: () => void;
  undoBusy: boolean;
  lastClosed: GitHubIssue | null;
  onGetAISummary: () => void;
  loadingAiSummary: boolean;
  animatedStyles: {
    undoStyle: any;
    closeStyle: any;
    keepStyle: any;
    progressStyle: any;
  };
  theme: Theme;
}
````

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `issues` | `GitHubIssue[]` | ✅ | Array of issues to display |
| `currentIndex` | `number` | ✅ | Index of active card |
| `swiperRef` | `React.RefObject<Swiper>` | ✅ | **CRITICAL**: Ref from useIssues |
| `confettiRef` | `React.RefObject<any>` | ✅ | Ref to confetti cannon |
| `onSwipeLeft` | `(index: number) => void` | ✅ | Swipe left callback (close) |
| `onSwipeRight` | `(index: number) => void` | ✅ | Swipe right callback (keep) |
| `onClose` | `() => void` | ✅ | Programmatic close action |
| `onKeep` | `() => void` | ✅ | Programmatic keep action |
| `onUndo` | `() => void` | ✅ | Undo last action |
| `undoBusy` | `boolean` | ✅ | Whether undo is in progress |
| `lastClosed` | `GitHubIssue \| null` | ✅ | Last closed issue (for undo) |
| `onGetAISummary` | `() => void` | ✅ | AI summary callback |
| `loadingAiSummary` | `boolean` | ✅ | AI loading state |
| `animatedStyles` | `object` | ✅ | Animation styles from useAnimations |
| `theme` | `Theme` | ✅ | Theme object |

### Example Usage

````typescript
import { SwipeContainer } from './src/components/SwipeContainer';
import { useIssues } from './src/hooks/useIssues';
import { useAnimations } from './src/hooks/useAnimations';
import { useTheme } from './src/theme';

function MainInterface({ token }: { token: string }) {
  const { theme } = useTheme();
  const {
    issues,
    currentIndex,
    swiperRef,
    confettiRef,
    handleSwipeLeft,
    handleSwipeRight,
    handleUndo,
    undoBusy,
    lastClosed,
    handleAISummary,
    loadingAiSummary,
  } = useIssues(token);
  
  const animatedStyles = useAnimations(
    theme,
    feedback,
    currentIndex,
    issues.length,
    false
  );
  
  return (
    <SwipeContainer
      issues={issues}
      currentIndex={currentIndex}
      swiperRef={swiperRef}
      confettiRef={confettiRef}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onClose={() => swiperRef.current?.swipeLeft()}
      onKeep={() => swiperRef.current?.swipeRight()}
      onUndo={handleUndo}
      undoBusy={undoBusy}
      lastClosed={lastClosed}
      onGetAISummary={handleAISummary}
      loadingAiSummary={loadingAiSummary}
      animatedStyles={animatedStyles}
      theme={theme}
    />
  );
}
````

### Features

#### Swiper Core
- **Tinder-style swipe gestures** - Left to close, right to keep
- **Card stack** - Up to 3 cards visible in stack
- **Infinite scroll** - Loops back to start when deck finishes
- **Vertical swipe disabled** - Horizontal only

#### Overlays
- **Left overlay (Close)** - Red "CLOSE" stamp appears on swipe left
- **Right overlay (Keep)** - Green "KEEP" stamp appears on swipe right
- **Opacity based on swipe distance** - Fades in as user swipes

#### Action Bar (Bottom)
Three action buttons with animations:
- **Undo button** (🔄) - Left, enabled when `lastClosed !== null`
- **Close button** (✕) - Center, triggers programmatic left swipe
- **Keep button** (✓) - Right, triggers programmatic right swipe

#### Progress Bar
- Visual indicator showing progress through deck
- Animated width based on `currentIndex / issues.length`

#### Empty State
Displays "No issues loaded" when `issues.length === 0`

### Swiper Configuration

````typescript
{
  cards: issues,
  renderCard: (card) => <IssueCard issue={card} />,
  onSwipedLeft: (index) => onSwipeLeft(index),
  onSwipedRight: (index) => onSwipeRight(index),
  cardIndex: currentIndex,
  backgroundColor: 'transparent',
  stackSize: 3,
  stackSeparation: 15,
  verticalSwipe: false,
  horizontalSwipe: true,
  infinite: true,
  animateOverlayLabelsOpacity: true,
  overlayLabels: {
    left: { title: 'CLOSE', style: { color: '#D90429' } },
    right: { title: 'KEEP', style: { color: '#007A33' } },
  },
}
````

### Interactions

| Action | Gesture/Button | Result |
|--------|---------------|--------|
| Close issue | Swipe left | Triggers `onSwipeLeft(index)` |
| Keep issue | Swipe right | Triggers `onSwipeRight(index)` |
| Close (button) | Tap Close (✕) | Calls `onClose()` |
| Keep (button) | Tap Keep (✓) | Calls `onKeep()` |
| Undo | Tap Undo (🔄) | Calls `onUndo()` |

### Critical Notes

⚠️ **swiperRef MUST come from useIssues** - Creating a new ref in this component will break undo functionality.

✅ **Correct:**
````typescript
// In parent
const { swiperRef } = useIssues(token);
<SwipeContainer swiperRef={swiperRef} />
````

❌ **Wrong:**
````typescript
// In SwipeContainer
const swiperRef = useRef<Swiper>(null); // BREAKS UNDO
````

---

## `<Sidebar />`

Desktop sidebar with filters, progress, and statistics. **Not displayed on mobile.**

### Import

````typescript
import { Sidebar } from './src/components/Sidebar';
````

### Props

````typescript
interface SidebarProps {
  issues: GitHubIssue[];
  currentIndex: number;
  repoFilter: string;
  setRepoFilter: (value: string) => void;
  labelFilter: string;
  setLabelFilter: (value: string) => void;
  onRefresh: () => void;
  loadingIssues: boolean;
  onLogout: () => void;
  animatedStyles: {
    inputBorderStyle: any;
    progressStyle: any;
  };
  theme: Theme;
}
````

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `issues` | `GitHubIssue[]` | ✅ | Array of all issues |
| `currentIndex` | `number` | ✅ | Current card index |
| `repoFilter` | `string` | ✅ | Repository filter value |
| `setRepoFilter` | `(value: string) => void` | ✅ | Update repo filter |
| `labelFilter` | `string` | ✅ | Label filter value |
| `setLabelFilter` | `(value: string) => void` | ✅ | Update label filter |
| `onRefresh` | `() => void` | ✅ | Refresh issues callback |
| `loadingIssues` | `boolean` | ✅ | Loading state |
| `onLogout` | `() => void` | ✅ | Logout callback |
| `animatedStyles` | `object` | ✅ | Animation styles |
| `theme` | `Theme` | ✅ | Theme object |

### Example Usage

````typescript
import { Sidebar } from './src/components/Sidebar';
import { useWindowDimensions } from 'react-native';

function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const {
    issues,
    currentIndex,
    repoFilter,
    setRepoFilter,
    labelFilter,
    setLabelFilter,
    loadIssues,
    loadingIssues,
  } = useIssues(token);
  
  const { logout } = useAuth();
  const { theme } = useTheme();
  const animatedStyles = useAnimations(/* ... */);
  
  return (
    <View style={{ flexDirection: 'row' }}>
      {isDesktop && (
        <Sidebar
          issues={issues}
          currentIndex={currentIndex}
          repoFilter={repoFilter}
          setRepoFilter={setRepoFilter}
          labelFilter={labelFilter}
          setLabelFilter={setLabelFilter}
          onRefresh={loadIssues}
          loadingIssues={loadingIssues}
          onLogout={logout}
          animatedStyles={animatedStyles}
          theme={theme}
        />
      )}
      <SwipeContainer /* ... */ />
    </View>
  );
}
````

### Sections

#### Header
- **IssueCrush logo** and title
- **GitHub branding**

#### Filters
- **Repository filter** - Text input (e.g., "facebook/react")
- **Label filter** - Text input (e.g., "bug")
- **Refresh button** - Reloads issues with current filters
- **Clear filters button** - Resets both filters

#### Statistics
- **Total Issues** - `issues.length`
- **Current Position** - `currentIndex + 1 of issues.length`
- **Progress Bar** - Visual progress indicator

#### Actions
- **Logout button** - Signs out of GitHub

### Visual Design

- Fixed width: 280px
- Light background with border
- Scrollable content
- Sections separated by dividers
- Icons from lucide-react-native (Filter, Tag, RefreshCw, Inbox, LogOut)

### Responsive Behavior

| Screen Width | Behavior |
|--------------|----------|
| < 768px | Hidden (mobile) |
| ≥ 768px | Visible (desktop) |

### Input Focus Animation

Inputs animate border color on focus using `animatedStyles.inputBorderStyle`.

---

## Common Patterns

### Pattern 1: Passing Theme

All components receive theme as a prop:

````typescript
import { useTheme } from './src/theme';

function Parent() {
  const { theme } = useTheme();
  
  return (
    <IssueCard theme={theme} /* ... */ />
  );
}
````

### Pattern 2: Callback Composition

Components don't call hooks - they receive callbacks:

````typescript
// ✅ Correct
function Parent() {
  const { handleSwipeLeft } = useIssues(token);
  return <SwipeContainer onSwipeLeft={handleSwipeLeft} />;
}

// ❌ Wrong
function SwipeContainer() {
  const { handleSwipeLeft } = useIssues(token); // Don't call hooks in child
}
````

### Pattern 3: Conditional Rendering

Desktop vs mobile layout handled in parent:

````typescript
const { width } = useWindowDimensions();
const isDesktop = width >= 768;

{isDesktop && <Sidebar /* ... */ />}
````

---

## Styling Guidelines

### StyleSheet Usage

All components use `StyleSheet.create` for performance:

````typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
});
````

### Platform-Specific Styles

Use `Platform.select` for platform differences:

````typescript
const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  }),
});
````

### Theme Colors

Always use theme object for colors:

````typescript
// ✅ Correct
<Text style={{ color: theme.text }}>Hello</Text>

// ❌ Wrong
<Text style={{ color: '#000000' }}>Hello</Text>
````

---

## Accessibility

### Touch Targets

All interactive elements have minimum 44x44 pt touch target:

````typescript
<TouchableOpacity
  style={{ padding: 12 }} // Ensures 44pt minimum
  onPress={onPress}
>
  <Icon size={20} />
</TouchableOpacity>
````

### Labels

Use `accessibilityLabel` for screen readers:

````typescript
<TouchableOpacity
  accessibilityLabel="Close issue"
  onPress={onClose}
>
  <X size={24} />
</TouchableOpacity>
````

### Color Contrast

All text meets WCAG AA standards:
- Primary text: 4.5:1 contrast
- Secondary text: 4.5:1 contrast
- Large text: 3:1 contrast

---

## Testing Components

Use `@testing-library/react-native` for component tests:

````typescript
import { render, fireEvent } from '@testing-library/react-native';
import { IssueCard } from './IssueCard';

test('IssueCard calls onGetAISummary when button pressed', () => {
  const mockHandler = jest.fn();
  const { getByText } = render(
    <IssueCard
      issue={mockIssue}
      onGetAISummary={mockHandler}
      loadingAiSummary={false}
      theme={lightTheme}
    />
  );
  
  fireEvent.press(getByText('✨ Get AI Summary'));
  expect(mockHandler).toHaveBeenCalled();
});
````

---

## Related Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Hooks API Reference](./HOOKS.md)
- [AGENTS.md](../AGENTS.md)
