# Architecture Overview

Detailed technical architecture of IssueCrush.

## Table of Contents

- [System Architecture](#system-architecture)
- [Authentication Flow](#authentication-flow)
- [Data Flow](#data-flow)
- [Component Hierarchy](#component-hierarchy)
- [Backend Architecture](#backend-architecture)
- [Session Management](#session-management)
- [Security Model](#security-model)

---

## System Architecture

IssueCrush uses a **client-server architecture** with clear separation of concerns:

````
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React Native)                    │
├─────────────────────────────────────────────────────────────┤
│  App.tsx (composition only)                                  │
│    ├── ThemeContext                                          │
│    ├── ErrorBoundary                                         │
│    └── Layout branching (mobile/desktop)                     │
│                                                               │
│  Components (pure render)                                    │
│    ├── AuthScreen                                            │
│    ├── IssueCard                                             │
│    ├── SwipeContainer                                        │
│    └── Sidebar                                               │
│                                                               │
│  Hooks (business logic)                                      │
│    ├── useAuth (OAuth flow)                                  │
│    ├── useIssues (issue management)                          │
│    └── useAnimations (UI feedback)                           │
│                                                               │
│  Services (API clients)                                      │
│    ├── github.ts (GitHub API proxy)                          │
│    ├── copilotService.ts (AI summaries)                      │
│    └── tokenStorage.ts (secure storage)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP (X-Session-Token header)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                SERVER (Express / Azure Functions)            │
├─────────────────────────────────────────────────────────────┤
│  OAuth Endpoints                                             │
│    ├── POST /api/device-code (mobile)                        │
│    ├── POST /api/github-token (web)                          │
│    └── POST /api/logout                                      │
│                                                               │
│  GitHub API Proxy                                            │
│    ├── GET /api/issues                                       │
│    └── PATCH /api/issues/:owner/:repo/:number                │
│                                                               │
│  AI Services                                                 │
│    ├── POST /api/ai-summary                                  │
│    └── GET /api/check-copilot                                │
│                                                               │
│  Session Storage                                             │
│    └── Cosmos DB / In-Memory                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────┤
│  GitHub API (REST + OAuth)                                   │
│  GitHub Copilot SDK (AI summaries)                           │
└─────────────────────────────────────────────────────────────┘
````

---

## Authentication Flow

### Mobile (Device Flow)

````
1. Client calls useAuth.login()
   ↓
2. POST /api/device-code
   → GitHub: POST /login/device/code
   ← Returns: device_code, user_code, verification_uri
   ↓
3. Client opens verification_uri in browser
   User authorizes the app
   ↓
4. Client polls: POST /api/github-token
   Server polls: POST /login/oauth/access_token
   ← Returns: access_token
   ↓
5. Server creates session in Cosmos DB
   Returns: session_id
   ↓
6. Client stores session_id in expo-secure-store
````

### Web (OAuth Flow)

````
1. Client calls useAuth.login()
   ↓
2. Client redirects to GitHub OAuth authorize URL
   User authorizes the app
   ↓
3. GitHub redirects to callback URL with code
   ↓
4. Client sends code: POST /api/github-token
   Server exchanges code for token
   ← Returns: session_id
   ↓
5. Client stores session_id in AsyncStorage
````

### Session-Based Requests

All subsequent API calls include the session ID:

````
GET /api/issues
Headers:
  X-Session-Token: <session_id>

Server:
1. Reads session_id from header
2. Fetches session from Cosmos DB
3. Uses stored GitHub token for API call
4. Returns data to client
````

**Why session-based?**
- GitHub token never exposed to client
- Supports token refresh without client updates
- Azure SWA intercepts `Authorization` header, so we use custom `X-Session-Token`

---

## Data Flow

### Issue Loading

````
useIssues.loadIssues()
  ↓
github.fetchIssues(sessionId, repoFilter, labelFilter)
  ↓
GET /api/issues?repo=owner/repo&label=bug
  ↓
Server: Fetch from GitHub API
  ← Returns: GitHubIssue[]
  ↓
setState: issues, currentIndex, feedback
````

### Issue Closing (Swipe Left)

````
User swipes left
  ↓
handleSwipeLeft(cardIndex)
  ↓
Haptic feedback (mobile only)
  ↓
updateIssueState(sessionId, owner, repo, number, 'closed')
  ↓
PATCH /api/issues/:owner/:repo/:number
  ↓
Server: GitHub API PATCH /repos/:owner/:repo/issues/:number
  ← Success
  ↓
setState: lastClosed = issue
Show toast: "Issue #123 closed"
````

### Undo

````
handleUndo()
  ↓
Check: lastClosed exists?
  ↓
updateIssueState(sessionId, owner, repo, number, 'open')
  ↓
swiperRef.current?.swipeBack()
  ← Card animates back
  ↓
Haptic success notification
Show toast: "Issue #123 reopened"
````

---

## Component Hierarchy

````
App.tsx
├── ThemeContext.Provider
│   └── ErrorBoundary (class component)
│       ├── AuthScreen (if !token)
│       │   ├── Login button
│       │   ├── Copilot status
│       │   └── Error display
│       │
│       └── Main UI (if token)
│           ├── Desktop Layout (isDesktop)
│           │   ├── Sidebar
│           │   │   ├── Repo filter
│           │   │   ├── Label filter
│           │   │   ├── Progress indicator
│           │   │   └── Actions (refresh, logout)
│           │   │
│           │   └── SwipeContainer
│           │       ├── Swiper (react-native-deck-swiper)
│           │       │   └── IssueCard[]
│           │       │       ├── Issue metadata
│           │       │       ├── AI summary button
│           │       │       └── Tap to open on GitHub
│           │       │
│           │       ├── Overlays (animated stamps)
│           │       │   ├── Left overlay (NOPE)
│           │       │   └── Right overlay (YEP)
│           │       │
│           │       └── Action Bar
│           │           ├── Close button
│           │           ├── Undo button
│           │           └── Keep button
│           │
│           └── Mobile Layout (!isDesktop)
│               ├── Header (repo filter, actions)
│               ├── SwipeContainer (same as above)
│               └── Footer (progress, feedback toast)
│
└── Confetti Cannon (hidden, triggered on undo)
````

---

## Backend Architecture

### Local Development (server.js)

Express server that mirrors Azure Functions locally:

- **Port 3000**
- **In-memory session storage** (optional Cosmos DB)
- **CORS enabled** for localhost:8081 (Expo dev server)

### Production (Azure Functions)

- **Azure Static Web Apps** (SWA) hosting
- **Azure Functions v4** (Node 20, ESM modules)
- **Cosmos DB NoSQL** for session persistence
- **GitHub Actions** for CI/CD

### Environment Variables

````bash
# OAuth
EXPO_PUBLIC_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...         # Server-side only
EXPO_PUBLIC_GITHUB_SCOPE=repo    # Must be 'repo' to close issues

# API URL
EXPO_PUBLIC_API_URL=http://localhost:3000  # Local dev
# (Production: same origin as SWA)

# Session Storage (optional, falls back to in-memory)
COSMOS_ENDPOINT=https://....documents.azure.com:443/
COSMOS_KEY=...
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions

# AI Features (optional)
GH_TOKEN=...          # GitHub token with Copilot access
COPILOT_PAT=...       # Alternative to GH_TOKEN
````

---

## Session Management

### Session Object

````typescript
{
  id: string;              // UUID v4
  github_token: string;    // GitHub OAuth token
  created_at: number;      // Unix timestamp (ms)
  ttl: number;             // 86400 (24 hours)
}
````

### Storage Strategy

**Cosmos DB (Production)**
- **Container**: `sessions`
- **Partition key**: `/id`
- **TTL**: 24 hours (automatic cleanup)

**In-Memory (Local Dev)**
- **Implementation**: Map<string, Session>
- **Cleanup**: setInterval every 60 seconds removes expired sessions
- **Limitation**: Lost on server restart

### Session Resolution

````javascript
function resolveSession(req) {
  // Azure SWA intercepts 'Authorization' header
  // so we use 'X-Session-Token' instead
  const sessionId = 
    req.headers['x-session-token'] || 
    req.headers['authorization'];
  
  if (!sessionId) throw new Error('Missing session token');
  
  return sessionStore.getSession(sessionId);
}
````

---

## Security Model

### Token Security

- **Client secret** never exposed to frontend
- **GitHub token** stored server-side only
- **Session ID** is the only credential stored client-side
- **Secure storage**:
  - Mobile: `expo-secure-store` (iOS Keychain, Android Keystore)
  - Web: `AsyncStorage` (localStorage)

### Session Security

- **Short-lived**: 24-hour TTL
- **Single-use logout**: Session deleted on logout
- **No refresh mechanism**: User re-authenticates after expiry

### API Security

- **All GitHub operations** require valid session ID
- **Session validation** on every request
- **No CORS** in production (same origin)
- **HTTPS only** in production

### Scope Restrictions

- **Required scope**: `repo` (not `public_repo`)
- **Why**: Closing issues requires write access
- **Tradeoff**: App can access private repos (necessary for functionality)

---

## Known Constraints

### Architecture Boundaries

From `AGENTS.md`:

- `ErrorBoundary` (class component) stays in `App.tsx` — must wrap all children
- `ThemeContext` provider stays in `App.tsx` — root-level context
- Mobile/desktop layout branching stays in `App.tsx`
- Components receive props/callbacks — they do NOT call hooks or APIs directly
- Hook APIs are frozen — signature changes require updating all call sites
- `swiperRef` must be passed as prop — never recreate inside a component

### Known Gotchas

- `expo export` may fail due to blocked `cdp.expo.dev` access — use `./node_modules/.bin/tsc --noEmit` as build check
- `react-native-deck-swiper` requires ref wired via `useIssues().swiperRef` for undo
- `@github/copilot-sdk` requires `onPermissionRequest: approveAll` in `createSession()`
- `vscode-jsonrpc@8` lacks ESM exports — patched by `scripts/patch-vscode-jsonrpc.js` (postinstall)

---

## Performance Optimizations

- **Component memoization**: IssueCard uses React.memo
- **Ref forwarding**: Swiper ref prevents unnecessary re-renders
- **AI summary caching**: Stored in `issue.aiSummary` field
- **Haptic feedback**: Platform-guarded to avoid web errors
- **Lazy loading**: Issues loaded on-demand, not on mount

---

## See Also

- [API Reference](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [AGENTS.md](../AGENTS.md) - AI agent context
