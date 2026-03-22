# Component Reference

IssueCrush components follow a strict separation of concerns: **components receive props and callbacks, they do NOT call hooks or APIs directly**.

## Component Principles

1. **Pure UI** - Components are responsible only for rendering and user interactions
2. **Props-driven** - All data comes from props
3. **Callbacks** - Side effects are delegated via callback props
4. **Platform-aware** - Use Platform.OS checks for platform-specific behavior
5. **Theme-aware** - Use `useTheme()` hook for colors and styling

## Components

### AuthScreen

Login screen shown before authentication.

**Location**: `src/components/AuthScreen.tsx`

**Props:**

````typescript
interface AuthScreenProps {
  onLogin: () => void;          // Callback when login button pressed
  authError: string;            // Error message to display
  isDesktop: boolean;           // Desktop layout flag
  isTablet?: boolean;           // Tablet layout flag (optional)
  screenWidth?: number;         // Screen width for responsive sizing (optional)
}
````

**Usage:**

````typescript
import { AuthScreen } from './components/AuthScreen';

<AuthScreen
  onLogin={startLogin}
  authError={authError}
  isDesktop={isDesktop}
  screenWidth={dimensions.width}
/>
````

**Features:**
- Responsive brand logo and title
- Platform-specific styling (mobile/tablet/desktop)
- Feature list with icons (Swipe Interface, GitHub OAuth, AI Summaries, Cross-Platform)
- GitHub OAuth login button
- Error message display

---

### IssueCard

Displays a GitHub issue in a swipeable card format.

**Location**: `src/components/IssueCard.tsx`

**Props:**

````typescript
interface IssueCardProps {
  issue: GitHubIssue;           // Issue data
  isDesktop: boolean;           // Desktop layout flag
  isCurrent: boolean;           // Whether this is the active card in swiper
  copilotAvailable: boolean | null; // Whether AI summaries are available
  loadingAiSummary: boolean;    // Whether AI summary is loading
  repoLabel: string;            // Computed "owner/repo" label
  onGetAiSummary: () => void;   // Callback to fetch AI summary
}
````

**Usage:**

````typescript
import { IssueCard } from './components/IssueCard';

<IssueCard
  issue={currentIssue}
  isDesktop={isDesktop}
  isCurrent={index === currentIndex}
  copilotAvailable={copilotAvailable}
  loadingAiSummary={loadingAiSummary}
  repoLabel={repoLabel(currentIssue)}
  onGetAiSummary={handleGetAiSummary}
/>
````

**Features:**
- Issue number badge with external link icon
- Title with alternating font weights (brutalist design)
- Repository label
- Issue labels with color-coded badges
- AI summary section (collapsible, with loading state)
- "Get AI Summary" button (if no summary and Copilot available)
- Created date and author info
- Issue body with scroll view
- Tappable issue number to open in browser

---

### SwipeContainer

Container for the swipeable card deck with overlays and action buttons.

**Location**: `src/components/SwipeContainer.tsx`

**Props:**

````typescript
interface SwipeContainerProps {
  issues: GitHubIssue[];
  swiperRef: React.RefObject<Swiper<GitHubIssue>>;
  confettiRef: React.RefObject<any>;
  currentIndex: number;
  loadingAiSummary: boolean;
  copilotAvailable: boolean | null;
  lastClosed: GitHubIssue | null;
  undoBusy: boolean;
  isDesktop: boolean;
  repoLabel: (issue: GitHubIssue) => string;
  onSwipeLeft: (index: number) => void;
  onSwipeRight: (index: number) => void;
  onSwiped: (index: number) => void;
  onGetAiSummary: () => void;
  onUndo: () => void;
}
````

**Usage:**

````typescript
import { SwipeContainer } from './components/SwipeContainer';

<SwipeContainer
  issues={issues}
  swiperRef={swiperRef}
  confettiRef={confettiRef}
  currentIndex={currentIndex}
  loadingAiSummary={loadingAiSummary}
  copilotAvailable={copilotAvailable}
  lastClosed={lastClosed}
  undoBusy={undoBusy}
  isDesktop={isDesktop}
  repoLabel={repoLabel}
  onSwipeLeft={handleSwipeLeft}
  onSwipeRight={handleSwipeRight}
  onSwiped={onSwiped}
  onGetAiSummary={handleGetAiSummary}
  onUndo={handleUndo}
/>
````

**Features:**
- `react-native-deck-swiper` integration
- "CLOSE" and "KEEP" stamp overlays on swipe
- Progress indicator (e.g., "3 / 10")
- Action buttons: Close, Undo, Keep (mobile)
- Keyboard shortcuts indicator (desktop)
- Confetti animation on completion
- Empty state message

---

### Sidebar

Desktop sidebar for repo filtering, progress tracking, and actions.

**Location**: `src/components/Sidebar.tsx`

**Props:**

````typescript
interface SidebarProps {
  issues: GitHubIssue[];
  currentIndex: number;
  loadingIssues: boolean;
  repoFilter: string;
  labelFilter: string;
  lastClosed: GitHubIssue | null;
  undoBusy: boolean;
  copilotAvailable: boolean | null;
  loadingAiSummary: boolean;
  setRepoFilter: (filter: string) => void;
  setLabelFilter: (filter: string) => void;
  onRefresh: () => void;
  onUndo: () => void;
  onSignOut: () => void;
  onGetAiSummary: () => void;
}
````

**Usage:**

````typescript
import { Sidebar } from './components/Sidebar';

<Sidebar
  issues={issues}
  currentIndex={currentIndex}
  loadingIssues={loadingIssues}
  repoFilter={repoFilter}
  labelFilter={labelFilter}
  lastClosed={lastClosed}
  undoBusy={undoBusy}
  copilotAvailable={copilotAvailable}
  loadingAiSummary={loadingAiSummary}
  setRepoFilter={setRepoFilter}
  setLabelFilter={setLabelFilter}
  onRefresh={loadIssues}
  onUndo={handleUndo}
  onSignOut={signOut}
  onGetAiSummary={handleGetAiSummary}
/>
````

**Features:**
- Repository filter input
- Label filter input
- Refresh button with loading state
- Progress indicator with circular progress bar
- Action buttons (Undo, AI Summary, Sign Out)
- Keyboard shortcuts list
- Responsive design (collapses on smaller screens)

---

### KeyboardShortcutsHelp

Keyboard shortcuts help overlay (desktop only).

**Location**: `src/components/KeyboardShortcutsHelp.tsx`

**Props:**

````typescript
interface KeyboardShortcutsHelpProps {
  visible: boolean;
  onClose: () => void;
}
````

**Usage:**

````typescript
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';

<KeyboardShortcutsHelp
  visible={showHelp}
  onClose={() => setShowHelp(false)}
/>
````

**Features:**
- Modal overlay with keyboard shortcuts list
- Close button and Escape key support
- Desktop-only (not rendered on mobile)

**Shortcuts:**
- `←` or `X` - Close issue (swipe left)
- `→` or `K` - Keep open (swipe right)
- `U` - Undo
- `A` - AI Summary
- `R` - Refresh
- `?` - Show help

---

## Component Composition

Components are composed in `App.tsx`:

````
App.tsx
  ├── AuthScreen (if not authenticated)
  └── (if authenticated)
      ├── Sidebar (desktop only)
      └── SwipeContainer
          ├── IssueCard (for each issue)
          └── Action buttons
````

## Theme Integration

All components use the `useTheme()` hook for styling:

````typescript
import { useTheme } from '../theme';

function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.ink }}>Hello</Text>
    </View>
  );
}
````

**Available theme colors:**
- `background` - Main background
- `cardBackground` - Card background
- `cardBorder` - Card border
- `ink` - Primary text
- `inkLight` - Secondary text
- `buttonBackground` - Button background
- `buttonText` - Button text

## Platform Utilities

Use platform utilities for conditional behavior:

````typescript
import { Platform } from 'react-native';
import { isWeb, webCursor } from '../utils';

// Platform-specific code
if (Platform.OS === 'web') {
  // Web-only
}

// Web cursor
<TouchableOpacity style={webCursor('pointer')}>
````

## Label Colors

Use `getLabelColor` utility for label badges:

````typescript
import { getLabelColor } from '../utils';

const labelStyle = {
  backgroundColor: getLabelColor(label.color),
};
````

## External Links

Use the `openIssueLink` helper (in IssueCard) as reference:

````typescript
async function openIssueLink(url: string) {
  if (Platform.OS === 'web') {
    // Open in new tab
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  } else {
    // Open in-app browser
    await WebBrowser.openBrowserAsync(url, {
      controlsColor: '#38bdf8',
      toolbarColor: '#0b1224',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  }
}
````

## Testing

Component tests use Jest and React Native Testing Library:

````bash
npm test
````

See `src/components/*.test.tsx` for examples.

## Related

- [Hooks Reference](../hooks/README.md) - Custom hooks that power components
- [Theme System](../../src/theme/README.md) - Theme context and colors
- [AGENTS.md](../../AGENTS.md) - Architecture boundaries
