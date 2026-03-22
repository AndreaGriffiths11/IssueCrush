# Architecture Guide

IssueCrush is a cross-platform GitHub issue triage application built with React Native, Expo, and Azure cloud services. This guide explains the system architecture, component design, and key technical decisions.

## Table of Contents

- [System Overview](#system-overview)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Authentication Flow](#authentication-flow)
- [State Management](#state-management)
- [Data Flow](#data-flow)
- [Platform Support](#platform-support)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)

## System Overview

IssueCrush follows a **client-server architecture** with strict security boundaries:

````
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         React Native + Expo (iOS/Android/Web)        │   │
│  │                                                       │   │
│  │  Components → Hooks → API Client → Backend           │   │
│  │     ↓          ↓        ↓                             │   │
│  │  - AuthScreen  - useAuth   - github.ts               │   │
│  │  - IssueCard   - useIssues - copilotService.ts       │   │
│  │  - Sidebar     - useAnimations - tokenStorage.ts     │   │
│  │  - SwipeContainer                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS (Session Token)
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express (local) / Azure Functions (production)      │   │
│  │                                                       │   │
│  │  OAuth Handler → Session Store → GitHub API Proxy    │   │
│  │                       ↓                               │   │
│  │              Cosmos DB / In-Memory                    │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS (GitHub Token)
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                      External APIs                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • GitHub REST API (issues, auth, user data)         │   │
│  │  • GitHub Copilot SDK (AI summaries)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
````

**Key Principles:**

1. **Token Security**: GitHub OAuth tokens never leave the server
2. **Stateless Client**: Client stores only an opaque session ID
3. **API Proxy**: All GitHub API calls are proxied through the backend
4. **Platform Agnostic**: Same codebase runs on web, iOS, and Android

---

## Frontend Architecture

### Component Hierarchy

````
App.tsx (Root)
├── ThemeContext.Provider
│   └── ErrorBoundary
│       ├── AuthScreen (unauthenticated state)
│       └── Main Layout (authenticated state)
│           ├── Desktop Layout (width ≥ 768px)
│           │   ├── Sidebar (filters, progress, actions)
│           │   └── SwipeContainer
│           │       └── IssueCard (per issue)
│           └── Mobile Layout (width < 768px)
│               ├── SwipeContainer
│               │   └── IssueCard (per issue)
│               └── KeyboardShortcutsHelp (modal)
````

### Architecture Boundaries

IssueCrush enforces strict architectural boundaries to maintain code clarity:

| **Component**       | **Responsibility**                           | **Constraints**                                    |
|---------------------|----------------------------------------------|----------------------------------------------------|
| `App.tsx`           | Composition: providers, error handling, layout branching | No business logic, no API calls                    |
| `AuthScreen`        | OAuth UI, login/logout actions               | Receives callbacks via props                       |
| `IssueCard`         | Pure render of issue data                    | No network calls, no side effects                  |
| `Sidebar`           | Desktop: filters, progress, action buttons   | Delegates actions via callbacks                    |
| `SwipeContainer`    | Swipe UI, overlays, animations               | Delegates business logic to hooks                  |
| Hooks (`useAuth`, `useIssues`, `useAnimations`) | State management, API calls, side effects    | **Frozen APIs** - breaking changes require PR explanation |

**Why These Boundaries?**

- **Testability**: Pure components are easier to unit test
- **Reusability**: Components can be composed without tight coupling
- **Maintainability**: Clear separation prevents "god components"
- **Performance**: Pure components can use `React.memo` effectively

### Hook Architecture

IssueCrush uses **custom hooks** for all stateful logic:

#### `useAuth()` - Authentication State

````typescript
const {
  token,           // Session ID (opaque)
  authError,       // OAuth error message
  copilotAvailable, // Whether user has Copilot access
  login,           // Initiate OAuth flow
  logout,          // Destroy session
  handleCallback   // Process OAuth callback
} = useAuth();
````

**Responsibilities:**

- Handle OAuth flow (device flow on mobile, web flow on browser)
- Exchange authorization code for session ID
- Store/retrieve session ID in secure storage
- Check Copilot availability

**Platform Differences:**

- **Mobile**: Uses `expo-secure-store` (encrypted keychain)
- **Web**: Uses `@react-native-async-storage/async-storage` (localStorage)

#### `useIssues(token)` - Issue Management

````typescript
const {
  issues,          // Array of GitHub issues
  loadingIssues,   // Loading state for issue fetch
  loadingAiSummary, // Loading state for AI summary
  currentIndex,    // Current card index in swiper
  lastClosed,      // Last closed issue (for undo)
  feedback,        // User feedback message
  repoFilter,      // Repository filter value
  labelFilter,     // Label filter value
  swiperRef,       // Ref to swiper component (MUST BE PASSED AS PROP)
  confettiRef,     // Ref to confetti component
  loadIssues,      // Fetch issues from GitHub
  handleSwipeLeft, // Close issue action
  handleSwipeRight, // Keep issue action
  undoLastClose,   // Reopen last closed issue
  getAiSummary,    // Generate AI summary for issue
  setRepoFilter,   // Update repo filter
  setLabelFilter   // Update label filter
} = useIssues(token);
````

**Responsibilities:**

- Fetch issues from backend API
- Handle swipe gestures (close/keep)
- Manage undo functionality
- Generate AI summaries via Copilot
- Apply filters (repository, labels)
- Trigger haptic feedback (mobile only)

**Critical Design Decision:**

The `swiperRef` is created in `useIssues` and **must be passed** to `SwipeContainer` as a prop. This is required for the undo functionality (`swipeBack()` method). Never recreate the ref inside a component.

#### `useAnimations()` - Animation Utilities

````typescript
const {
  swipedDirection,     // 'left' | 'right' | null
  setSwipedDirection,  // Set animation direction
  stampOpacity,        // Animated opacity for stamp overlay
  triggerStampAnimation // Trigger stamp fade-in/out
} = useAnimations();
````

**Responsibilities:**

- Manage swipe overlay animations ("CLOSED" / "KEPT" stamps)
- Provide animated values for React Native Reanimated

#### `useKeyboardShortcuts()` - Keyboard Navigation

````typescript
const {
  visible,      // Keyboard help modal visibility
  showHelp,     // Show keyboard shortcuts help
  hideHelp      // Hide keyboard shortcuts help
} = useKeyboardShortcuts({
  onLeft: handleSwipeLeft,
  onRight: handleSwipeRight,
  onUndo: undoLastClose
});
````

**Responsibilities:**

- Register keyboard event listeners (desktop only)
- Show/hide keyboard shortcuts help modal
- Map keys to actions (←, →, u, ?)

---

## Backend Architecture

### Dual Implementation

IssueCrush has **two backend implementations** with identical behavior:

| **Environment**     | **Implementation**      | **Use Case**                     |
|---------------------|-------------------------|----------------------------------|
| Local Development   | `server.js` (Express)   | Fast iteration, no cloud costs  |
| Production          | `api/src/app.js` (Azure Functions) | Scalable, serverless deployment |

Both implementations:

1. Handle OAuth token exchange
2. Store sessions (in-memory or Cosmos DB)
3. Proxy GitHub API calls
4. Generate AI summaries via Copilot SDK

### Session Storage

Sessions are stored with a **24-hour TTL** (time-to-live):

````javascript
{
  id: "abc123-session-id-xyz789",  // Unique session ID
  githubToken: "gho_xxxxx...",     // GitHub OAuth token
  createdAt: 1680307200000,        // Unix timestamp
  expiresAt: 1680393600000         // Unix timestamp (createdAt + 24h)
}
````

**Storage Backends:**

| **Backend**       | **Local Dev** | **Production** | **Persistence**     |
|-------------------|---------------|----------------|---------------------|
| In-Memory         | Default       | Not recommended | Lost on restart     |
| Cosmos DB NoSQL   | Optional      | Recommended    | Persistent, scalable |

**Cosmos DB Configuration:**

- **Database**: `issuecrush`
- **Container**: `sessions`
- **Partition Key**: `/id`
- **TTL**: 24 hours (automatic cleanup)

### API Proxy Pattern

All GitHub API calls are proxied through the backend:

````
Client                    Backend                   GitHub API
  │                         │                           │
  │  X-Session-Token: abc  │                           │
  │ ────────────────────→  │                           │
  │                         │  Authorization: Bearer    │
  │                         │ ────────────────────────→ │
  │                         │                           │
  │                         │ ←──────────────────────── │
  │ ←────────────────────── │      Issue data           │
````

**Why Proxy?**

- **Security**: Client never sees the GitHub token
- **Simplicity**: Token refresh handled server-side
- **Control**: Rate limiting, logging, error handling in one place

---

## Authentication Flow

### OAuth Flow (Web Browser)

````
User                  Client                Backend              GitHub
 │                      │                      │                    │
 │  Click "Login"       │                      │                    │
 │ ──────────────────→  │                      │                    │
 │                      │  Redirect to GitHub  │                    │
 │                      │ ──────────────────────────────────────→  │
 │                      │                      │                    │
 │                      │  User authorizes app │                    │
 │ ←────────────────────────────────────────────────────────────── │
 │                      │                      │                    │
 │                      │  Callback with code  │                    │
 │ ──────────────────────────────────────────→ │                    │
 │                      │                      │                    │
 │                      │  POST /api/github-token                   │
 │                      │ ──────────────────→  │                    │
 │                      │                      │  Exchange code     │
 │                      │                      │ ─────────────────→ │
 │                      │                      │  Return token      │
 │                      │                      │ ←───────────────── │
 │                      │                      │                    │
 │                      │  Return session_id   │                    │
 │                      │ ←────────────────────│                    │
 │                      │                      │                    │
 │  Show app            │  Store session_id    │                    │
 │ ←────────────────────│                      │                    │
````

### OAuth Flow (Mobile Device)

Mobile uses GitHub's **Device Flow** (no browser redirect):

````
User                  Client                Backend              GitHub
 │                      │                      │                    │
 │  Click "Login"       │                      │                    │
 │ ──────────────────→  │  POST /login/device/code                 │
 │                      │ ───────────────────────────────────────→ │
 │                      │  Return device_code + user_code          │
 │                      │ ←─────────────────────────────────────── │
 │                      │                      │                    │
 │  Show user_code      │                      │                    │
 │ ←────────────────────│                      │                    │
 │                      │                      │                    │
 │  Open github.com/login/device              │                    │
 │  Enter user_code     │                      │                    │
 │ ───────────────────────────────────────────────────────────────→│
 │  Authorize app       │                      │                    │
 │ ←─────────────────────────────────────────────────────────────── │
 │                      │                      │                    │
 │                      │  Poll /login/oauth/access_token          │
 │                      │ ───────────────────────────────────────→ │
 │                      │  Return access_token                      │
 │                      │ ←─────────────────────────────────────── │
 │                      │                      │                    │
 │                      │  POST /api/github-token                   │
 │                      │ ──────────────────→  │                    │
 │                      │  Return session_id   │                    │
 │                      │ ←────────────────────│                    │
 │  Show app            │                      │                    │
 │ ←────────────────────│                      │                    │
````

**Key Difference**: Mobile requires user to manually enter a code on GitHub.com instead of a browser redirect.

---

## State Management

IssueCrush uses **local React state** (via hooks) instead of a global state library like Redux. This is intentional:

**Reasons:**

1. **Simplicity**: No boilerplate, no action creators, no reducers
2. **Component Isolation**: Each feature owns its state
3. **Server as Source of Truth**: App re-fetches data instead of caching aggressively
4. **Small State Surface**: Only auth token and issue list need persistence

**State Location:**

| **State**               | **Location**     | **Persistence**       |
|-------------------------|------------------|-----------------------|
| Session ID              | `useAuth`        | Secure storage        |
| GitHub Issues           | `useIssues`      | In-memory (refetch)   |
| UI State (swipe, filters) | `useIssues`  | In-memory (session)   |
| Theme                   | `ThemeContext`   | None (always dark)    |

**Trade-offs:**

- ✅ Less code, easier to understand
- ✅ No stale data bugs (always fresh from server)
- ❌ More network requests (mitigated by caching at HTTP layer)
- ❌ State lost on app refresh (acceptable for triage tool)

---

## Data Flow

### Fetching Issues

````
User clicks "Refresh"
        ↓
  useIssues.loadIssues()
        ↓
  github.fetchIssues(sessionId, repoFilter, labelFilter)
        ↓
  Backend: GET /api/issues?repo=...&labels=...
        ↓
  Backend validates session → retrieves GitHub token
        ↓
  Backend calls GitHub API (search or repo endpoint)
        ↓
  Backend filters out pull requests
        ↓
  Backend returns JSON array of issues
        ↓
  Client: setIssues(data)
        ↓
  SwipeContainer renders IssueCard for each issue
````

### Closing an Issue

````
User swipes left on card
        ↓
  useIssues.handleSwipeLeft(cardIndex)
        ↓
  Haptic feedback (mobile only)
        ↓
  Extract owner/repo from issue.repository_url
        ↓
  github.closeIssue(sessionId, owner, repo, issueNumber)
        ↓
  Backend: PATCH /api/issues/:owner/:repo/:number
        ↓
  Backend validates session → retrieves GitHub token
        ↓
  Backend calls GitHub API to close issue
        ↓
  Backend returns updated issue
        ↓
  Client: Remove issue from array
        ↓
  Client: Store in lastClosed (for undo)
        ↓
  Client: Show feedback toast
        ↓
  Client: Advance to next card
````

### Generating AI Summary

````
User clicks "✨ Get AI Summary"
        ↓
  useIssues.getAiSummary(issue)
        ↓
  copilotService.getAISummary(sessionId, issue)
        ↓
  Backend: POST /api/ai-summary
        ↓
  Backend validates session → retrieves GitHub token
        ↓
  Backend creates CopilotClient with user's GitHub token
        ↓
  Backend starts Copilot session (model: gpt-4.1)
        ↓
  Backend sends prompt with issue details
        ↓
  Copilot SDK returns AI-generated summary
        ↓
  Backend destroys Copilot session (cleanup)
        ↓
  Backend returns { summary: "..." }
        ↓
  Client: issue.aiSummary = summary
        ↓
  IssueCard renders AI summary in UI
````

---

## Platform Support

IssueCrush is built with React Native and Expo, enabling true cross-platform development:

### Web

- Uses `react-native-web` to render React Native components as HTML/CSS
- Runs in any modern browser (Chrome, Safari, Firefox, Edge)
- Supports keyboard shortcuts for power users
- Deployed to Azure Static Web Apps

**Known Limitation**: No haptic feedback (not supported in browsers)

### iOS

- Compiles to native iOS app via Expo
- Uses `expo-secure-store` (iOS Keychain) for token storage
- Supports haptic feedback via Taptic Engine
- Requires Expo Go or custom development build

### Android

- Compiles to native Android app via Expo
- Uses `expo-secure-store` (Android Keystore) for token storage
- Supports haptic feedback
- Requires Expo Go or custom development build

### Platform Detection

````typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Web-specific code
} else if (Platform.OS === 'ios') {
  // iOS-specific code
} else if (Platform.OS === 'android') {
  // Android-specific code
}
````

**Responsive Design:**

````typescript
const { width } = useWindowDimensions();
const isDesktop = width >= 768;

if (isDesktop) {
  // Desktop layout (sidebar + swiper)
} else {
  // Mobile layout (swiper only)
}
````

---

## Deployment

### Local Development

````bash
# Install dependencies
npm install

# Start Express server + Expo dev server
npm run dev

# OR start web-only (opens browser)
npm run web-dev
````

**Environment Variables:**

````bash
# .env
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
EXPO_PUBLIC_GITHUB_SCOPE=repo
EXPO_PUBLIC_API_URL=http://localhost:3000

# Optional: Cosmos DB for persistent sessions
COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
COSMOS_KEY=your_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

### Production (Azure Static Web Apps)

````
GitHub Repository
       │
       │ Push to main
       ↓
GitHub Actions (.github/workflows/azure-swa.yml)
       │
       ├─→ Build frontend: npx expo export --platform web
       ├─→ Build API: npm install (in api/ directory)
       └─→ Deploy to Azure SWA
               │
               ├─→ Frontend: Static files → Azure CDN
               └─→ Backend: Azure Functions (Node 20 runtime)
````

**Configuration:**

- **SWA Config**: `staticwebapp.config.json` (routes, redirects, API proxy)
- **Azure Functions**: `api/host.json` (runtime, extensions)
- **Environment Variables**: Set in Azure Portal (Application Settings)

**Required Environment Variables (Azure):**

````
EXPO_PUBLIC_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
COSMOS_ENDPOINT
COSMOS_KEY
COSMOS_DATABASE
COSMOS_CONTAINER
````

---

## Security Considerations

### Token Security

1. **Client Secret Never Exposed**: Only used server-side in token exchange
2. **GitHub Token Never Sent to Client**: Stored server-side, referenced by session ID
3. **Session ID is Opaque**: No way to reverse-engineer the GitHub token from it
4. **Secure Storage on Client**: Session ID stored in `expo-secure-store` (mobile) or `AsyncStorage` (web)

### Session Security

1. **24-Hour TTL**: Sessions auto-expire after 24 hours
2. **Server-Side Validation**: Every request validates session existence and expiration
3. **Logout Destroys Session**: Logging out immediately invalidates the session

### API Security

1. **Azure Functions Auth Level**: `anonymous` (session middleware handles auth)
2. **CORS Enabled**: Only for frontend domain in production
3. **No Rate Limiting on Backend**: Relies on GitHub's rate limits (5,000/hour)

### Known Risks

1. **Session Hijacking**: If an attacker steals the session ID, they can impersonate the user until expiration
   - **Mitigation**: Use HTTPS, secure storage, short TTL
2. **XSS Attacks**: If malicious code runs in the client, it can steal the session ID
   - **Mitigation**: React Native sanitizes content by default, no `dangerouslySetInnerHTML` used
3. **Server Compromise**: If the backend is compromised, all GitHub tokens are exposed
   - **Mitigation**: Use Azure Key Vault for secrets, enable audit logs, follow least-privilege principle

---

## Related Documentation

- [API Reference](../api/README.md) - Detailed endpoint documentation
- [AGENTS.md](../../../AGENTS.md) - Project knowledge for AI agents
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) - Development setup and guidelines
- [README.md](../../../README.md) - User-facing documentation
