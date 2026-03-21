# Architecture Guide

IssueCrush follows a **modular, hook-based architecture** with clear separation of concerns. The application is built with React Native + Expo, using custom hooks for business logic and presentational components for UI.

## Design Principles

1. **Separation of Concerns** - Business logic lives in hooks, UI lives in components
2. **Single Responsibility** - Each component and hook has one clear purpose
3. **Composition over Inheritance** - Components compose smaller pieces rather than extending base classes
4. **Unidirectional Data Flow** - Props and callbacks flow down, events bubble up
5. **Platform Agnostic** - Works seamlessly on web, iOS, and Android

## High-Level Architecture

````text
App.tsx (Root Orchestrator)
├── ErrorBoundary (Error handling)
├── ThemeContext.Provider (Theme management)
└── Layout Branching (Mobile vs Desktop)
    ├── AuthScreen (Unauthenticated state)
    └── Main Interface (Authenticated state)
        ├── Sidebar (Desktop only - filters, progress)
        └── SwipeContainer (Issue swiper + overlays)
            └── IssueCard (Individual issue display)
````

## Directory Structure

````text
IssueCrush/
├── App.tsx                        # Root component - composition only
├── src/
│   ├── components/               # Presentational components
│   │   ├── AuthScreen.tsx       # OAuth login UI
│   │   ├── IssueCard.tsx        # Issue display card
│   │   ├── Sidebar.tsx          # Desktop sidebar (filters, stats)
│   │   └── SwipeContainer.tsx   # Swiper + action overlays
│   ├── hooks/                   # Custom React hooks (business logic)
│   │   ├── useAuth.ts          # Authentication state & OAuth
│   │   ├── useIssues.ts        # Issue fetching, swipe handling
│   │   └── useAnimations.ts    # Animation states & controls
│   ├── api/                    # External service clients
│   │   └── github.ts           # GitHub REST API client
│   ├── lib/                    # Utility libraries
│   │   ├── tokenStorage.ts    # Secure token persistence
│   │   └── copilotService.ts  # AI summary service
│   ├── theme/                  # Theme system
│   │   ├── ThemeContext.tsx   # React context for theme
│   │   └── themes.ts          # Theme definitions
│   └── utils/                  # Helper functions
│       ├── colors.ts          # Color utilities
│       └── index.ts           # Utility exports
├── server.js                   # Local dev server (OAuth + AI proxy)
├── sessionStore.js            # Local session storage
└── api/                       # Azure Functions (production backend)
    └── src/
        ├── app.js            # OAuth, issues, AI endpoints
        └── sessionStore.js   # Cosmos DB session management
````

## Core Components

### App.tsx - Root Orchestrator

**Role:** Composition and layout orchestration only. No business logic.

**Responsibilities:**
- Provide ErrorBoundary wrapper
- Provide ThemeContext
- Branch layout based on screen size (mobile vs desktop)
- Compose hooks and components
- Pass callbacks and props down the tree

**What App.tsx Does NOT Do:**
- ❌ Implement business logic
- ❌ Make API calls directly
- ❌ Manage complex state
- ❌ Define hooks

### Custom Hooks (Business Logic Layer)

#### `useAuth()` - Authentication Management
Handles GitHub OAuth flow and session management.

**Exports:**
- `token` - Current session token
- `authError` - OAuth error messages
- `copilotAvailable` - Whether AI features are available
- `startAuth()` - Initiate OAuth flow
- `logout()` - Clear session and token

**Platform Handling:**
- **Web:** Uses web OAuth flow with redirect
- **Mobile:** Uses device flow with polling

#### `useIssues()` - Issue Management
Manages issue fetching, swipe actions, and undo functionality.

**Exports:**
- `issues` - Array of GitHub issues
- `currentIndex` - Active card index
- `loadingIssues` - Loading state
- `feedback` - User feedback messages
- `repoFilter` / `setRepoFilter` - Repository filter
- `labelFilter` / `setLabelFilter` - Label filter
- `swiperRef` - Ref to Swiper component (required for undo)
- `confettiRef` - Ref to confetti cannon
- `loadIssues()` - Fetch issues from GitHub
- `handleSwipeLeft()` - Close issue
- `handleSwipeRight()` - Keep issue (no-op, just visual feedback)
- `handleUndo()` - Reopen last closed issue
- `handleAISummary()` - Get AI analysis of current issue

**Critical:** `swiperRef` must be passed to SwipeContainer for undo to work.

#### `useAnimations()` - Animation Coordination
Centralizes all animation states and controls.

**Exports:**
- Animation shared values (toast, progress, FAB buttons, crumble effect)
- Animated style objects ready for components
- `triggerCrumbleAnimation()` - Trigger paper crumble effect
- `showToast()` - Display toast notification
- `animateButtonPress()` - Button press animation

**Why Separate?** Keeps animation logic isolated and reusable.

### Presentational Components

#### `<AuthScreen />`
OAuth login interface with device code flow.

**Props:**
- `onAuthStart: () => Promise<void>` - Start OAuth flow
- `authError: string` - Error message to display

#### `<IssueCard />`
Displays a single GitHub issue with metadata and actions.

**Props:**
- `issue: GitHubIssue` - Issue data
- `onGetAISummary: () => void` - AI summary callback
- `loadingAiSummary: boolean` - AI loading state
- `theme: Theme` - Theme object

#### `<SwipeContainer />`
Wraps the deck swiper with action overlays and controls.

**Props:**
- `issues: GitHubIssue[]` - Array of issues
- `currentIndex: number` - Active index
- `swiperRef: React.RefObject<Swiper>` - **Required** swiper ref
- `confettiRef: React.RefObject<any>` - Confetti ref
- `onSwipeLeft: (index: number) => void` - Close handler
- `onSwipeRight: (index: number) => void` - Keep handler
- `onClose: () => void` - Programmatic close
- `onKeep: () => void` - Programmatic keep
- `onUndo: () => void` - Undo handler
- `undoBusy: boolean` - Undo in progress
- `lastClosed: GitHubIssue | null` - Last closed issue
- `onGetAISummary: () => void` - AI summary handler
- `loadingAiSummary: boolean` - AI loading state
- `animatedStyles: object` - Animation styles from useAnimations
- `theme: Theme` - Theme object

#### `<Sidebar />`
Desktop sidebar with filters, progress, and statistics.

**Props:**
- `issues: GitHubIssue[]` - All issues
- `currentIndex: number` - Active index
- `repoFilter: string` - Current repo filter
- `setRepoFilter: (v: string) => void` - Update repo filter
- `labelFilter: string` - Current label filter
- `setLabelFilter: (v: string) => void` - Update label filter
- `onRefresh: () => void` - Refresh issues
- `loadingIssues: boolean` - Loading state
- `onLogout: () => void` - Logout handler
- `animatedStyles: object` - Animation styles
- `theme: Theme` - Theme object

## Data Flow

### Authentication Flow

1. User taps "Start GitHub login" → `startAuth()` called
2. `useAuth` initiates OAuth (web flow or device flow)
3. User authorizes on GitHub
4. Token exchanged server-side at `/api/github-token`
5. Session ID saved to secure storage
6. `token` state updates → triggers issue fetch
7. App transitions to main interface

### Issue Swipe Flow

1. User swipes card left → SwipeContainer fires `onSwipeLeft(index)`
2. `useIssues.handleSwipeLeft()` called
3. GitHub API: `PATCH /repos/:owner/:repo/issues/:number { state: "closed" }`
4. Issue marked as closed locally
5. `lastClosed` updated for undo
6. Haptic feedback triggered (mobile only)
7. Next card displayed

### Undo Flow

1. User taps Undo button → `handleUndo()` called
2. Swiper's `swipeBack()` triggered via `swiperRef`
3. GitHub API: `PATCH /repos/:owner/:repo/issues/:number { state: "open" }`
4. Issue reopened on GitHub
5. `lastClosed` cleared
6. Success haptic (mobile only)

## Architecture Boundaries (MUST NOT CROSS)

### App.tsx Boundaries
✅ **Must Stay in App.tsx:**
- ErrorBoundary class component
- ThemeContext provider
- Mobile/desktop layout branching (`useWindowDimensions`)

❌ **Must NOT Move to App.tsx:**
- API calls
- Business logic
- Complex state management

### Component Boundaries
✅ **Components Should:**
- Receive data via props
- Fire callbacks for user actions
- Focus on presentation and layout
- Use theme object for styling

❌ **Components Must NOT:**
- Call hooks directly (except useTheme, useState, useCallback)
- Make API calls
- Manage authentication
- Duplicate logic from hooks

### Hook Boundaries
✅ **Hooks Should:**
- Encapsulate business logic
- Manage related state
- Handle API calls
- Return stable references (useCallback, useMemo)

❌ **Hooks Must NOT:**
- Render UI directly
- Import components
- Mutate props

### Frozen Hook APIs

The following hook signatures are **frozen** to prevent breaking changes:

````typescript
// useAuth - DO NOT change signature
function useAuth(): {
  token: string | null;
  authError: string;
  copilotAvailable: boolean | null;
  startAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

// useIssues - DO NOT change signature
function useIssues(token: string | null): {
  issues: GitHubIssue[];
  currentIndex: number;
  // ... (see hooks reference)
  swiperRef: React.RefObject<Swiper<GitHubIssue>>; // CRITICAL: must be passed to SwipeContainer
}

// useAnimations - DO NOT change signature
function useAnimations(
  theme: Theme,
  feedback: string,
  currentIndex: number,
  issuesLength: number,
  inputFocused: boolean
): {
  // Animation shared values and styles
  // ... (see hooks reference)
}
````

**If a signature must change:** Update ALL call sites and document the breaking change in the PR.

## State Management Strategy

IssueCrush uses **local component state + custom hooks** instead of Redux/MobX. This keeps the codebase simple and leverages React's built-in state primitives.

### State Location Guidelines

| State Type | Location | Example |
|------------|----------|---------|
| Authentication | `useAuth` hook | OAuth token, session |
| Issue data | `useIssues` hook | Issues array, filters |
| Animation | `useAnimations` hook | Shared values, styles |
| UI state (local) | Component useState | Input focus, modal open |
| Global theme | ThemeContext | Theme object |

## Critical Patterns

### Swiper Ref Pattern
The swiper ref MUST be created in `useIssues` and passed as a prop. Never recreate it in a component.

✅ **Correct:**
````typescript
// In useIssues
const swiperRef = useRef<Swiper<GitHubIssue>>(null);
return { swiperRef, /* ... */ };

// In App.tsx
const { swiperRef, handleUndo } = useIssues(token);
<SwipeContainer swiperRef={swiperRef} onUndo={handleUndo} />
````

❌ **Wrong:**
````typescript
// In SwipeContainer - DON'T DO THIS
const swiperRef = useRef<Swiper>(null); // Will break undo
````

### Token Storage Platform Pattern
Use platform-specific storage for security.

````typescript
// Mobile (iOS/Android)
import * as SecureStore from 'expo-secure-store';

// Web
import AsyncStorage from '@react-native-async-storage/async-storage';

// In code
if (Platform.OS === 'web') {
  await AsyncStorage.setItem(key, value);
} else {
  await SecureStore.setItemAsync(key, value);
}
````

### Haptic Feedback Pattern
Always guard haptics with platform check.

````typescript
if (Platform.OS !== 'web') {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}
````

## Theme System

IssueCrush uses a **light-theme-only design** as of the refactor that removed dark mode.

### Theme Structure

````typescript
export const lightTheme = {
  background: '#FAF9F6',       // Main background
  text: '#0A0A0A',            // Primary text
  primary: '#FF4D00',         // Brand color
  danger: '#D90429',          // Close/delete actions
  success: '#007A33',         // Keep/success actions
  cardBackground: '#FFFFFF',   // Card background
  // ... (see src/theme/themes.ts)
};

export type Theme = typeof lightTheme;
export type ThemeMode = 'light';
````

### Using Theme in Components

````typescript
import { useTheme } from '../theme';

function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>Hello</Text>
    </View>
  );
}
````

## Backend Architecture

IssueCrush has **two backend modes**:

### Local Development (server.js)
- Express server on port 3000
- In-memory session storage (sessionStore.js)
- OAuth token exchange at `/api/github-token`
- AI proxy at `/api/ai-summary`
- Issues endpoint at `/api/issues`

### Production (Azure Functions)
- Azure Static Web Apps + Functions
- Cosmos DB for session storage
- Same endpoints, same API contract
- Auto-deploys on push to `main`

**Key Pattern:** The local server mirrors production behavior for seamless development.

## Testing Strategy

- **Unit tests** for utilities and API clients (`*.test.ts`)
- **Integration tests** for server endpoints (`server.test.js`)
- **Type checking** with `npx tsc --noEmit`
- **Manual testing** on web, iOS, Android

## Known Gotchas

1. **expo export may fail** due to network restrictions (`cdp.expo.dev` blocked). Use `npx tsc --noEmit` as build check.
2. **swiperRef must survive refactors** - Undo won't work without it.
3. **@github/copilot-sdk requires approveAll** in `createSession()` since v0.1.32.
4. **vscode-jsonrpc lacks ESM exports** - Patched by postinstall script.

## Further Reading

- [Hooks API Reference](./HOOKS.md)
- [Component API Reference](./COMPONENTS.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [AGENTS.md](../AGENTS.md) - AI agent project context
