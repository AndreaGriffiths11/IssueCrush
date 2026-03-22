# Architecture Guide

This guide provides a comprehensive understanding of IssueCrush's architecture, design decisions, and technical patterns.

## Design Principles

### 1. Separation of Concerns

IssueCrush follows strict separation between:

- **Business Logic**: Encapsulated in custom hooks (`useAuth`, `useIssues`, `useAnimations`)
- **Presentation**: Pure components that receive data via props
- **State Management**: Managed by React hooks, flows down via props
- **Data Layer**: API clients and services

### 2. Unidirectional Data Flow

````
User Action → Hook Handler → State Update → Component Re-render
````

Data flows in one direction:
1. User triggers event (click, swipe, etc.)
2. Event calls hook function
3. Hook updates state
4. State flows down to components as props
5. Components re-render with new data

### 3. Props/Callbacks Pattern

Components NEVER:
- Call hooks directly (except `useTheme()` for styling)
- Make API calls directly
- Manage their own state (except local UI state)

Components ALWAYS:
- Receive data via props
- Call parent functions via callback props
- Render based on props

### 4. Platform Agnostic

Code is written to run on web, iOS, and Android:
- Platform checks (`Platform.OS === 'web'`) only where necessary
- Platform-specific APIs abstracted (token storage, link opening)
- Responsive design for different screen sizes

---

## Component Architecture

### Component Hierarchy

````
App.tsx
├─ ThemeProvider
│  └─ ErrorBoundary
│     ├─ AuthScreen (if not authenticated)
│     └─ Main UI (if authenticated)
│        ├─ Sidebar (desktop only)
│        ├─ SwipeContainer
│        │  ├─ Swiper (react-native-deck-swiper)
│        │  │  └─ IssueCard (foreach issue)
│        │  ├─ Overlays (CLOSE/KEEP stamps)
│        │  └─ Confetti
│        ├─ Toast (feedback messages)
│        ├─ ActionBar (mobile only)
│        └─ KeyboardShortcutsHelp (desktop only)
````

### Component Responsibilities

#### App.tsx (Composition Only)

**Does**:
- Wraps app in ThemeProvider and ErrorBoundary
- Calls hooks to get state and callbacks
- Branches layout (mobile vs desktop)
- Orchestrates component tree

**Does NOT**:
- Contain business logic
- Make API calls
- Perform data transformations

#### Components (Pure Presentation)

**Does**:
- Render UI based on props
- Call callback props on user interaction
- Manage local UI state (e.g., `useState` for focus state)

**Does NOT**:
- Call `useAuth`, `useIssues`, etc. directly
- Make fetch calls
- Store application state

#### Hooks (Business Logic)

**Does**:
- Manage application state
- Make API calls
- Handle side effects
- Provide data and callbacks to components

**Does NOT**:
- Render UI
- Import React Native components

---

## State Management

### Hook State Ownership

| Hook | State Owned |
|------|-------------|
| `useAuth` | token, authError, copilotAvailable |
| `useIssues` | issues, currentIndex, lastClosed, feedback, filters, loading states |
| `useAnimations` | animation values (shared values from reanimated) |
| `useKeyboardShortcuts` | (none - event listeners only) |

### State Flow Example

````typescript
// App.tsx
function App() {
  const { token, startLogin, signOut } = useAuth();
  const { 
    issues, 
    currentIndex, 
    handleSwipeLeft, 
    handleSwipeRight 
  } = useIssues(token);
  
  // State flows DOWN to components
  return (
    <SwipeContainer
      issues={issues}           // Data prop
      onSwipeLeft={handleSwipeLeft}  // Callback prop
      onSwipeRight={handleSwipeRight} // Callback prop
    />
  );
}
````

### Derived State

Compute derived values in render, not in state:

````typescript
// ✅ Correct: Derive in render
function Sidebar({ issues, currentIndex }: Props) {
  const triagedCount = Math.min(currentIndex + 1, issues.length);
  const progress = (triagedCount / issues.length) * 100;
  
  return <ProgressBar width={progress} />;
}

// ❌ Incorrect: Store in state
function Sidebar({ issues, currentIndex }: Props) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    setProgress((currentIndex + 1) / issues.length * 100);
  }, [currentIndex, issues.length]);
  
  return <ProgressBar width={progress} />;
}
````

---

## API Architecture

### Backend Proxy Pattern

All GitHub API calls are proxied through the backend:

````
Frontend → Backend (Express/Azure Functions) → GitHub API
````

**Why?**
1. **Security**: Client secret never exposed to frontend
2. **Token Management**: GitHub tokens stored server-side only
3. **Centralized Auth**: Single point for session validation
4. **Flexibility**: Can add caching, rate limiting, etc.

### Session Flow

````
1. User authorizes on GitHub
2. GitHub redirects with auth code
3. Frontend sends code to /api/github-token
4. Backend exchanges code for GitHub token
5. Backend stores GitHub token in Cosmos DB
6. Backend returns session ID to frontend
7. Frontend stores session ID in secure storage
8. All subsequent requests include X-Session-Token header
9. Backend resolves session to GitHub token
10. Backend makes GitHub API call with user's token
````

### Authentication Headers

**Frontend → Backend**:
````
X-Session-Token: abc123def456...
````

**Backend → GitHub**:
````
Authorization: Bearer ghp_XXXXXXXXXXXX
````

**Why X-Session-Token instead of Authorization?**  
Azure Static Web Apps intercepts the `Authorization` header for its own auth. We use a custom header to avoid conflicts.

---

## Data Model

### GitHubIssue

````typescript
type GitHubIssue = {
  id: number;                    // GitHub issue ID
  number: number;                // Issue number (e.g., 123)
  title: string;                 // Issue title
  state: 'open' | 'closed';      // Current state
  labels: GitHubLabel[];         // Array of labels
  repository_url: string;        // API URL for repository
  html_url: string;              // Web URL to view issue
  repository?: {
    full_name: string;           // "owner/repo"
  };
  pull_request?: unknown;        // Present if issue is PR
  aiSummary?: string;            // Added by frontend after AI call
  body?: string;                 // Issue description
  created_at?: string;           // ISO timestamp
  user?: {
    login: string;               // Author username
    avatar_url: string;          // Author avatar
  };
};
````

### Session (Server-side)

````typescript
type Session = {
  id: string;                    // Opaque session ID (sent to client)
  github_token: string;          // User's GitHub OAuth token
  createdAt: Date;               // For TTL (24 hours)
};
````

---

## Security Architecture

### Token Security

1. **Client Secret**: Never exposed to frontend
2. **GitHub Token**: Stored server-side only (Cosmos DB)
3. **Session ID**: Opaque identifier, no sensitive data
4. **Secure Storage**:
   - Mobile: `expo-secure-store` (encrypted keychain)
   - Web: `AsyncStorage` (localStorage wrapper)

### HTTPS Everywhere

- All communication uses HTTPS in production
- Local dev uses HTTP (localhost exception)

### CORS

Backend allows requests from:
- Production domain (Static Web App)
- Localhost (development)

---

## Performance Optimization

### 1. Lazy Loading

AI summaries loaded on-demand (not prefetched):

````typescript
// Only fetch when user clicks button
const handleGetAiSummary = async () => {
  if (issue.aiSummary) return; // Already loaded
  const result = await copilotService.summarizeIssue(issue);
  // Update issue in state
};
````

### 2. Memoization

Use `useCallback` for stable function references:

````typescript
const handleSwipeLeft = useCallback(async (index: number) => {
  // ... implementation
}, [issues, token]); // Only recreate if dependencies change
````

### 3. Animation Performance

Use `react-native-reanimated` for 60fps animations:
- Runs on UI thread (not JS thread)
- Interpolated values computed on GPU

### 4. Minimal Re-renders

Components only re-render when their props change:

````typescript
// ✅ Component receives minimal props
function IssueCard({ issue, onPress }: Props) {
  // Only re-renders when issue or onPress changes
}

// ❌ Don't pass entire state object
function IssueCard({ allState }: Props) {
  // Re-renders on ANY state change
}
````

---

## Error Handling Strategy

### 1. User-Facing Errors

Show clear, actionable error messages:

````typescript
// ❌ Bad
setError('Error: 401');

// ✅ Good
setError('Session expired. Please sign in again.');
````

### 2. Error Recovery

Provide recovery actions:

````typescript
try {
  await updateIssueState(token, issue, 'closed');
} catch (error) {
  setFeedback('Close failed: ' + error.message);
  setLastClosed(null); // Clear undo state
}
````

### 3. Graceful Degradation

Features degrade gracefully when unavailable:

````typescript
// AI summaries unavailable? Show message, don't crash
{copilotAvailable === false ? (
  <Text>AI summaries require local Copilot</Text>
) : (
  <Button onPress={handleGetAiSummary}>Get AI Summary</Button>
)}
````

---

## Known Constraints

### 1. Swiper Ref Requirement

`swiperRef` from `useIssues()` MUST be passed as a prop:

````typescript
// ✅ Correct
function App() {
  const { swiperRef } = useIssues(token);
  return <SwipeContainer swiperRef={swiperRef} />;
}

// ❌ Incorrect
function SwipeContainer() {
  const swiperRef = useRef(null); // Breaks undo
  return <Swiper ref={swiperRef} />;
}
````

**Why?** The undo feature calls `swiperRef.current.swipeBack()`, which must reference the same ref.

### 2. Hook APIs Frozen

Hook signatures (`useAuth`, `useIssues`, `useAnimations`) are frozen. Changing them requires:
1. Updating all call sites
2. Explaining why in PR

**Why?** Maintains stable API contract across refactors.

### 3. Expo Export Limitations

`expo export` may fail due to blocked `cdp.expo.dev` access. Use `npx tsc --noEmit` as build check instead.

---

## Design Patterns Used

### 1. Dependency Injection

Components receive dependencies via props:

````typescript
function IssueCard({ copilotService, issue }: Props) {
  // copilotService injected, not imported
}
````

### 2. Observer Pattern

Hooks notify components of state changes:

````typescript
const { feedback } = useIssues(token);
// Components observe feedback, re-render on change
````

### 3. Factory Pattern

Service singletons created once:

````typescript
export const copilotService = new CopilotService();
````

### 4. Strategy Pattern

Platform-specific strategies for storage:

````typescript
if (Platform.OS === 'web') {
  await AsyncStorage.setItem(key, value);
} else {
  await SecureStore.setItemAsync(key, value);
}
````

---

## Technology Choices

| Technology | Reason |
|------------|--------|
| React Native | Cross-platform (web, iOS, Android) |
| Expo | Simplifies native APIs, dev workflow |
| TypeScript | Type safety, better DX |
| react-native-reanimated | 60fps animations |
| react-native-deck-swiper | Tinder-style swipe UX |
| Express (local) | Easy local dev server |
| Azure Functions (prod) | Serverless, auto-scaling |
| Cosmos DB | Global distribution, auto-TTL |
| GitHub Copilot SDK | AI summaries |

---

## See Also

- [Data Flow](./data-flow.md)
- [System Overview](./overview.md)
- [Component Development Guide](../guides/component-development.md)
- [API Reference](../api/)
