# Components API Reference

This document describes the React Native components used in IssueCrush.

## Table of Contents

- [AuthScreen](#authscreen)
- [IssueCard](#issuecard)
- [Sidebar](#sidebar)
- [SwipeContainer](#swipecontainer)
- [KeyboardShortcutsHelp](#keyboardshortcutshelp)

---

## AuthScreen

Landing screen displayed before authentication. Shows branding, login button, and feature hints.

### Usage

````typescript
import { AuthScreen } from '@/components';

function App() {
  const { startLogin, authError } = useAuth();
  const { width } = useWindowDimensions();
  
  return (
    <AuthScreen
      onLogin={startLogin}
      authError={authError}
      isDesktop={width >= 1024}
      screenWidth={width}
    />
  );
}
````

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onLogin` | `() => void` | Yes | Callback when user clicks "Continue with GitHub" |
| `authError` | `string` | Yes | Error message to display (empty string = no error) |
| `isDesktop` | `boolean` | Yes | Whether device is desktop size (affects layout) |
| `isTablet` | `boolean` | No | Whether device is tablet size |
| `screenWidth` | `number` | No | Current screen width in pixels (default: 400) |

### Features

- Responsive typography based on `screenWidth`
- Gesture hint pills (Close, Keep, AI)
- GitHub OAuth trust message
- Feature list with icons
- Mobile/tablet/desktop layouts
- Created by attribution with heart icon

### Styling Notes

- Brand name split into "ISSUE" (heavy weight) and "CRUSH" (light weight)
- Font size adjusts: narrow (<400px) = 32pt, web = 52pt, mobile = 36pt
- Gesture pills use semantic colors (red for close, green for keep, blue for AI)

---

## IssueCard

Displays a single GitHub issue as a swipeable card with title, user info, labels, and AI summary section.

### Usage

````typescript
import { IssueCard } from '@/components';

function CardView() {
  const { issues, currentIndex, loadingAiSummary, copilotAvailable, repoLabel, handleGetAiSummary } = useIssues(token);
  const issue = issues[currentIndex];
  
  return (
    <IssueCard
      issue={issue}
      isDesktop={width >= 1024}
      isCurrent={true}
      copilotAvailable={copilotAvailable}
      loadingAiSummary={loadingAiSummary}
      repoLabel={repoLabel(issue)}
      onGetAiSummary={handleGetAiSummary}
    />
  );
}
````

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `issue` | `GitHubIssue` | Yes | Issue data from GitHub API |
| `isDesktop` | `boolean` | Yes | Whether device is desktop size |
| `isCurrent` | `boolean` | Yes | Whether this is the active card in swiper |
| `copilotAvailable` | `boolean \| null` | Yes | Whether AI summaries are available |
| `loadingAiSummary` | `boolean` | Yes | Whether AI summary is loading |
| `repoLabel` | `string` | Yes | Display label for repository (e.g., "owner/repo") |
| `onGetAiSummary` | `() => void` | Yes | Callback to request AI summary |

### Layout Sections

#### 1. Card Header
- Issue number badge (top-right corner)
- Title with alternating heavy/light font weights
- External link icon (opens issue in GitHub)

#### 2. User Row
- Avatar image (circular, smaller on mobile)
- Username (uppercase)
- Repository name (muted color)
- **Mobile**: Single line format (`USER · repo`)
- **Desktop**: Two-line format

#### 3. Labels
- Color-coded badge pills
- Smart text color (light/dark) based on background
- Limited display: 2 labels (mobile), 4 labels (desktop)

#### 4. AI Block
- Dark background (`#1a1a2e`)
- "AI INSIGHT" sticker badge
- Three states:
  1. **Summary loaded**: Scrollable text with syntax-highlighted header
  2. **Unavailable**: Message about local Copilot requirement
  3. **Not loaded**: "GET AI SUMMARY" button

### Behavior

- **Click title**: Opens issue in GitHub (new tab on web, in-app browser on mobile)
- **AI Button**: Only enabled when `isCurrent === true` (prevents out-of-order requests)
- **Mobile scrolling**: Card body is scrollable on mobile to fit all content
- **Desktop layout**: Fixed height, no scrolling needed

### Architecture Notes

⚠️ **Pure Render Component**: IssueCard receives all data via props and callbacks. It does NOT call hooks or APIs directly. This maintains the architecture boundary defined in AGENTS.md.

---

## Sidebar

Desktop-only sidebar with filters, progress tracker, and action buttons.

### Usage

````typescript
import { Sidebar } from '@/components';

function DesktopLayout() {
  const { 
    repoFilter, 
    setRepoFilter, 
    labelFilter, 
    setLabelFilter,
    issues,
    currentIndex,
    lastClosed,
    undoBusy,
    loadingIssues,
    loadIssues,
    handleUndo,
  } = useIssues(token);
  
  const { signOut } = useAuth();
  const { progressAnimatedStyle } = useAnimations(/* ... */);
  
  return (
    <Sidebar
      repoFilter={repoFilter}
      labelFilter={labelFilter}
      issues={issues}
      currentIndex={currentIndex}
      lastClosed={lastClosed}
      undoBusy={undoBusy}
      loadingIssues={loadingIssues}
      progressAnimatedStyle={progressAnimatedStyle}
      onChangeRepoFilter={setRepoFilter}
      onChangeLabelFilter={setLabelFilter}
      onRefresh={loadIssues}
      onSwipeLeft={() => swiperRef.current?.swipeLeft()}
      onSwipeRight={() => swiperRef.current?.swipeRight()}
      onUndo={handleUndo}
      onSignOut={signOut}
      onShowShortcuts={() => setShowHelp(true)}
    />
  );
}
````

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `repoFilter` | `string` | Yes | Current repository filter value |
| `labelFilter` | `string` | Yes | Current label filter value |
| `issues` | `GitHubIssue[]` | Yes | Array of loaded issues |
| `currentIndex` | `number` | Yes | Current card index |
| `lastClosed` | `GitHubIssue \| null` | Yes | Most recently closed issue |
| `undoBusy` | `boolean` | Yes | Whether undo is in progress |
| `loadingIssues` | `boolean` | Yes | Whether issues are loading |
| `progressAnimatedStyle` | `AnimatedStyle` | Yes | Animated style from `useAnimations` |
| `onChangeRepoFilter` | `(text: string) => void` | Yes | Repo filter change handler |
| `onChangeLabelFilter` | `(text: string) => void` | Yes | Label filter change handler |
| `onRefresh` | `() => void` | Yes | Refresh issues callback |
| `onSwipeLeft` | `() => void` | Yes | Close current issue |
| `onSwipeRight` | `() => void` | Yes | Keep current issue |
| `onUndo` | `() => void` | Yes | Undo last close |
| `onSignOut` | `() => void` | Yes | Sign out callback |
| `onShowShortcuts` | `() => void` | Yes | Show keyboard help |

### Layout Sections

#### 1. Brand
- Split "ISSUE" / "CRUSH" logo

#### 2. Filter Section
- Repository filter input (e.g., `"owner/repo"`)
- Label filter input (e.g., `"bug,enhancement"`)
- Icons: Filter and Tag

#### 3. Progress Section
- Animated progress bar
- Text: `"3 / 10 TRIAGED (30%)"`
- Updates as user swipes through issues

#### 4. Action Buttons
- Refresh (with loading spinner)
- Close (red background)
- Keep (green background)
- Undo (disabled when no `lastClosed`)

#### 5. Footer
- Keyboard shortcuts button (`?`)
- Sign out button

### Filter Behavior

- **Repository Filter**: Enter `"owner/repo"` to filter to specific repo (leave blank for all)
- **Label Filter**: Enter comma-separated labels (e.g., `"bug,help wanted"`)
- Changes require clicking "Refresh" to take effect

---

## SwipeContainer

Wraps the swiper component and manages overlays, empty states, and confetti.

### Usage

````typescript
import { SwipeContainer } from '@/components';

function MainApp() {
  const { issues, swiperRef, confettiRef, handleSwipeLeft, handleSwipeRight, onSwiped, repoLabel } = useIssues(token);
  const { copilotAvailable, loadingAiSummary, handleGetAiSummary } = /* ... */;
  
  return (
    <SwipeContainer
      issues={issues}
      swiperRef={swiperRef}
      confettiRef={confettiRef}
      isDesktop={width >= 1024}
      copilotAvailable={copilotAvailable}
      loadingAiSummary={loadingAiSummary}
      repoLabel={repoLabel}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onSwiped={onSwiped}
      onGetAiSummary={handleGetAiSummary}
    />
  );
}
````

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `issues` | `GitHubIssue[]` | Yes | Array of issues to display |
| `swiperRef` | `RefObject<Swiper>` | Yes | Ref for swiper component |
| `confettiRef` | `RefObject<any>` | Yes | Ref for confetti cannon |
| `isDesktop` | `boolean` | Yes | Desktop layout flag |
| `copilotAvailable` | `boolean \| null` | Yes | AI availability status |
| `loadingAiSummary` | `boolean` | Yes | AI loading state |
| `repoLabel` | `(issue: GitHubIssue) => string` | Yes | Function to extract repo label |
| `onSwipeLeft` | `(index: number) => Promise<void>` | Yes | Close handler |
| `onSwipeRight` | `(index: number) => Promise<void>` | Yes | Keep handler |
| `onSwiped` | `(index: number) => void` | Yes | After-swipe callback |
| `onGetAiSummary` | `() => void` | Yes | AI summary request |

### Features

#### Swiper Configuration
- Vertical swiping disabled
- Stack of 2 cards visible
- Background card at 95% scale
- 12px stack separation
- Infinite mode disabled

#### Overlays
- **Left Swipe**: Red "CLOSE" stamp with X icon
- **Right Swipe**: Green "KEEP" stamp with checkmark icon
- Rotation and opacity based on swipe position

#### Empty State
- Shown when `issues.length === 0`
- Message: "No issues to triage!"
- Subtitle: "All caught up 🎉"

#### Confetti
- Triggered on last card swipe
- Origin: `{ x: 0, y: 0 }` (top-left)

### Render Logic

- Maps `issues` array to `IssueCard` components
- Passes `isCurrent={index === currentIndex}` to each card
- Renders overlays and empty state conditionally

---

## KeyboardShortcutsHelp

Modal dialog showing available keyboard shortcuts. Desktop only.

### Usage

````typescript
import { KeyboardShortcutsHelp } from '@/components';

function App() {
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <>
      <MainUI onHelp={() => setShowHelp(true)} />
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}
    </>
  );
}
````

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onClose` | `() => void` | Yes | Callback when user closes modal |

### Shortcuts Displayed

| Key | Label | Description |
|-----|-------|-------------|
| `←` | Left Arrow | Close current issue |
| `→` | Right Arrow | Keep current issue |
| `Z` | Z Key | Undo last close |
| `R` | R Key | Refresh issues |
| `?` | Question Mark | Show this help |

### UI Elements

- Semi-transparent backdrop (`rgba(0,0,0,0.6)`)
- Centered modal card
- Close button (X icon, top-right)
- Grid layout for shortcuts
- Keyboard key badges with border

---

## Architecture Notes

### Component Props Pattern

All components follow the **props/callbacks pattern**:

✅ **Correct**: Components receive data and callbacks via props  
❌ **Incorrect**: Components call hooks or APIs directly

This maintains clear separation between:
- **Business Logic**: Lives in `App.tsx` via hooks
- **Presentation**: Components render UI based on props

### Frozen Hook APIs

Hook signatures (`useAuth`, `useIssues`, `useAnimations`) are frozen. If a signature must change:

1. Update all call sites in the same commit
2. Explain why in the commit message and PR description
3. Update this documentation

### swiperRef Requirement

`swiperRef` from `useIssues()` **must be passed as a prop** to components that render the swiper. Never recreate the ref inside a component—this breaks the undo feature.

---

## See Also

- [Hooks API](./hooks.md)
- [Utilities API](./utilities.md)
- [Component Development Guide](../guides/component-development.md)
