# Architecture

IssueCrush architecture documentation.

## System Overview

IssueCrush is a cross-platform React Native application built with Expo SDK 54. The architecture separates concerns into three main layers:

1. **Frontend** - React Native UI (mobile & web)
2. **Backend** - Express server (local dev) / Azure Functions (production)
3. **Storage** - In-memory (dev) / Azure Cosmos DB (production)

````
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ App.tsx  │──│  Hooks   │──│     Components        │ │
│  │          │  │          │  │ (AuthScreen, Swiper)  │ │
│  └──────────┘  └──────────┘  └───────────────────────┘ │
│        │             │                    │              │
│        └─────────────┴────────────────────┘              │
│                      │                                   │
│              Token Storage Layer                         │
│       (expo-secure-store / AsyncStorage)                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (X-Session-Token)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Express / Azure Functions)     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ OAuth Token  │  │ AI Summaries │  │ GitHub API   │  │
│  │  Exchange    │  │  (Copilot)   │  │    Proxy     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                            │                             │
│                      Session Store                       │
│                            │                             │
└────────────────────────────┼─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│     Session Storage (In-Memory / Cosmos DB)              │
│  { sessionId: "abc123", token: "gho_...", ttl: 24h }    │
└──────────────────────────────────────────────────────────┘
````

## Component Architecture

### Frontend Layer

The frontend follows a strict component hierarchy:

````
App.tsx (composition root)
├── ThemeContext.Provider
├── ErrorBoundary
└── Layout (mobile/desktop branching)
    ├── AuthScreen (if not authenticated)
    └── SwipeContainer (if authenticated)
        ├── Sidebar (desktop only)
        ├── IssueCard (current card)
        └── ActionBar (mobile)
````

**Key Principles:**
- **App.tsx is composition only** - No business logic, only provider setup and layout
- **Components receive props** - Never call hooks or APIs directly
- **Hooks contain logic** - useAuth, useIssues, useAnimations, useKeyboardShortcuts
- **Frozen hook APIs** - Signature changes require updating all call sites

### Hook Boundaries

````
┌────────────────────────────────────────────────┐
│                  App.tsx                       │
│  const { token, startAuth, logout } = useAuth()│
│  const { issues, swiperRef, ... } = useIssues(token)│
│  const animations = useAnimations(...)         │
│  useKeyboardShortcuts({ ... })                 │
└────────────────────────────────────────────────┘
         │           │            │
         ▼           ▼            ▼
    ┌─────────┐ ┌─────────┐ ┌──────────┐
    │ useAuth │ │useIssues│ │useAnima- │
    │         │ │         │ │  tions   │
    └────┬────┘ └────┬────┘ └──────────┘
         │           │
         ▼           ▼
   tokenStorage   github.ts
     (lib)          (api)
````

**Critical Constraints:**
- `swiperRef` from `useIssues` must be passed as prop (never recreate)
- `ErrorBoundary` must stay in App.tsx as class component
- Hook APIs frozen - breaking changes require explicit migration

## Backend Architecture

### Local Development (server.js)

Express server mirrors production Azure Functions locally:

````javascript
// server.js
app.post('/api/github-token', ...) // OAuth token exchange
app.post('/api/logout', ...)        // Session destruction
app.get('/api/issues', ...)         // GitHub issues proxy
app.post('/api/ai-summary', ...)    // Copilot SDK proxy
app.get('/api/health', ...)         // Health check
````

**Session Flow:**
1. Client sends OAuth code to `/api/github-token`
2. Server exchanges code for GitHub token
3. Server stores token in session store
4. Server returns `session_id` to client
5. Client stores `session_id` in secure storage
6. Client sends `X-Session-Token: session_id` header for subsequent requests

### Production (Azure Functions)

Azure Functions app mirrors the Express server structure:

````
api/
├── src/
│   ├── app.js           # All HTTP functions
│   └── sessionStore.js  # Cosmos DB session CRUD
├── host.json            # Azure Functions config
└── package.json         # Dependencies
````

**Session Storage:**
- **Local:** In-memory Map (lost on restart)
- **Production:** Azure Cosmos DB NoSQL
  - Database: `issuecrush`
  - Container: `sessions`
  - Partition key: `/id`
  - TTL: 24 hours (auto-delete)

## Authentication Flow

````
┌──────────┐                                  ┌──────────┐
│  Client  │                                  │  GitHub  │
└────┬─────┘                                  └────┬─────┘
     │                                             │
     │ 1. Start OAuth (device/web flow)           │
     ├────────────────────────────────────────────▶
     │                                             │
     │ 2. User authorizes on GitHub                │
     │                                             │
     │◀────────────────────────────────────────────┤
     │ 3. OAuth code                               │
     │                                             │
     ▼                                             │
┌──────────┐                                      │
│  Server  │                                      │
└────┬─────┘                                      │
     │ 4. POST /api/github-token (code)           │
     │                                             │
     │ 5. Exchange code for token                 │
     ├────────────────────────────────────────────▶
     │                                             │
     │◀────────────────────────────────────────────┤
     │ 6. GitHub access token                      │
     │                                             │
     │ 7. Create session (token → sessionId)       │
     │                                             │
     │ 8. Return sessionId                         │
     ├────────────────────────────────────────────▶
     │                                       Client stores
     │                                       sessionId
````

**Platform Differences:**
- **Mobile (iOS/Android):** Device flow - user visits GitHub URL to authorize
- **Web:** Web flow - redirect to GitHub, callback to same origin

## AI Integration

````
┌──────────────────────────────────────────────────────┐
│                      Client                          │
│  copilotService.getAISummary(issue, sessionToken)    │
└──────────────────────┬───────────────────────────────┘
                       │
                       │ POST /api/ai-summary
                       │ X-Session-Token: abc123
                       │ { issue: {...} }
                       ▼
┌──────────────────────────────────────────────────────┐
│                  Backend (server.js)                 │
│  1. resolveSession(sessionToken) → GitHub token      │
│  2. createSession(token, {onPermissionRequest})      │
│  3. session.chat(...) with issue context             │
│  4. Return AI summary text                           │
└──────────────────────────────────────────────────────┘
                       │
                       │ GitHub Copilot SDK
                       ▼
┌──────────────────────────────────────────────────────┐
│            GitHub Copilot Language Model             │
│  Analyzes issue and generates structured summary     │
└──────────────────────────────────────────────────────┘
````

**Requirements:**
- `GH_TOKEN` or `COPILOT_PAT` env var with Copilot access
- `@github/copilot-sdk` 0.1.32+
- `onPermissionRequest: approveAll` handler (required since v0.1.32)

## Data Flow

### Issue Loading

````
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. loadIssues()
     │    (with repoFilter, labelFilter)
     ▼
┌─────────────────┐
│  useIssues hook │
└────┬────────────┘
     │ 2. fetchIssues(token, repo, label)
     ▼
┌────────────────┐
│  github.ts API │
└────┬───────────┘
     │ 3. GET https://api.github.com/issues
     │    ?filter=assigned&state=open&repo=...
     ▼
┌────────────────┐
│   GitHub API   │
└────┬───────────┘
     │ 4. Returns issue array
     ▼
┌─────────────────┐
│  useIssues hook │
│  setIssues([])  │
└─────────────────┘
````

### Issue Closing (Swipe Left)

````
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. Swipe left gesture
     ▼
┌──────────────────┐
│ SwipeContainer   │
└────┬─────────────┘
     │ 2. handleSwipeLeft(cardIndex)
     ▼
┌─────────────────┐
│  useIssues hook │
└────┬────────────┘
     │ 3. Haptics.impactAsync(Heavy)
     │ 4. closeIssue(token, owner, repo, number)
     ▼
┌────────────────┐
│  github.ts API │
└────┬───────────┘
     │ 5. PATCH /repos/{owner}/{repo}/issues/{number}
     │    { state: "closed" }
     ▼
┌────────────────┐
│   GitHub API   │
└────┬───────────┘
     │ 6. Issue closed
     ▼
┌─────────────────┐
│  useIssues hook │
│  setLastClosed()│
│  setFeedback()  │
└─────────────────┘
````

## Platform-Specific Considerations

### Token Storage

| Platform | Storage Backend | Security |
|----------|----------------|----------|
| iOS | expo-secure-store → Keychain | Encrypted, biometric-protected |
| Android | expo-secure-store → KeyStore | Encrypted, hardware-backed |
| Web | AsyncStorage → localStorage | Not encrypted, HTTPS only |

### Haptic Feedback

| Platform | Implementation |
|----------|----------------|
| iOS/Android | Haptics.impactAsync() / notificationAsync() |
| Web | No-op (guarded by Platform.OS check) |

### OAuth Flow

| Platform | Flow Type | Redirect |
|----------|-----------|----------|
| Mobile | Device Flow | Polls GitHub for token |
| Web | Web Flow | Redirects to callback URL |

## Deployment Architecture

### Local Development

````
┌──────────────────────────────────────────────┐
│  http://localhost:8081 (Expo bundler)        │
│  ↓ Assets, JS bundles                        │
│  ┌────────────────────────────────────────┐  │
│  │  React Native app                      │  │
│  └────────────────────────────────────────┘  │
└───────────────────┬──────────────────────────┘
                    │
                    │ API calls
                    ▼
┌──────────────────────────────────────────────┐
│  http://localhost:3000 (Express)             │
│  ┌────────────────────────────────────────┐  │
│  │  OAuth + AI proxy server               │  │
│  └────────────────────────────────────────┘  │
│  sessionStore.js (in-memory Map)             │
└──────────────────────────────────────────────┘
````

### Production (Azure Static Web Apps)

````
┌─────────────────────────────────────────────────────┐
│  https://gray-water-08b04e810.6.azurestaticapps.net │
│  ┌───────────────────────────────────────────────┐  │
│  │  Static assets (JS, CSS, images)             │  │
│  │  React Native web bundle                     │  │
│  └───────────────────────────────────────────────┘  │
│                       │                              │
│                       │ /api/* routes                │
│                       ▼                              │
│  ┌───────────────────────────────────────────────┐  │
│  │  Azure Functions (Node 20 ESM)               │  │
│  │  OAuth + AI proxy endpoints                  │  │
│  └───────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│  Azure Cosmos DB NoSQL                               │
│  Database: issuecrush                                │
│  Container: sessions (24h TTL)                       │
└──────────────────────────────────────────────────────┘
````

**Key Files:**
- `staticwebapp.config.json` - Route configuration, headers, redirects
- `.github/workflows/azure-swa.yml` - CI/CD pipeline

## Known Constraints

### Architecture Boundaries (Do Not Cross)

1. **App.tsx must remain composition-only**
   - No business logic
   - Only provider setup, error boundary, layout branching

2. **Hook APIs are frozen**
   - Breaking changes require migration plan
   - All call sites must be updated

3. **`swiperRef` must be passed as prop**
   - Never recreate ref inside component
   - Required for undo (swipeBack) functionality

4. **Client secret never exposed to frontend**
   - Token exchange happens server-side only

5. **Azure SWA intercepts `Authorization` header**
   - Must use `X-Session-Token` for auth

### Technical Gotchas

1. **`expo export` may fail**
   - Blocked network access to `cdp.expo.dev`
   - Use `npx tsc --noEmit` as build check instead

2. **`vscode-jsonrpc` ESM patch required**
   - Postinstall script patches missing exports
   - Don't remove `postinstall` from package.json

3. **Copilot SDK requires approveAll handler**
   - Since v0.1.32, `onPermissionRequest: approveAll` required
   - Session creation throws without it

## See Also

- [API Reference](api.md)
- [Environment Variables](environment-variables.md)
- [Authentication Flow Explanation](../explanation/auth-flow.md)
- [Deployment Guide](../how-to/deployment.md)
