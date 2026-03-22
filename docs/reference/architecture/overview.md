# Architecture Overview

IssueCrush is a cross-platform GitHub issue triage application built with React Native, Expo, and Azure Functions.

## System Architecture

````
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (React Native)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  AuthScreen  │  │ IssueCard    │  │  Sidebar     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Hooks Layer                         │       │
│  │  useAuth  useIssues  useAnimations  useKeyboard │       │
│  └─────────────────┬────────────────────────────────┘       │
│                    │                                         │
│  ┌─────────────────┴───────────────┐                        │
│  │     Client Services              │                        │
│  │  github.ts  │  copilotService.ts │                        │
│  │  tokenStorage.ts                 │                        │
│  └─────────────────┬─────────────────┘                       │
└────────────────────┼───────────────────────────────────────┘
                     │ HTTP + X-Session-Token
                     │
┌────────────────────┼───────────────────────────────────────┐
│                    │   SERVER (Azure Functions / Express)   │
│  ┌─────────────────▼─────────────────┐                      │
│  │        API Endpoints               │                      │
│  │  /api/github-token (OAuth)        │                      │
│  │  /api/issues (proxy to GitHub)    │                      │
│  │  /api/ai-summary (Copilot SDK)    │                      │
│  │  /api/logout                       │                      │
│  │  /api/health                       │                      │
│  └─────────┬──────────────────────────┘                      │
│            │                                                 │
│  ┌─────────▼──────────────┐                                 │
│  │  sessionStore.js       │                                 │
│  │  - resolveSession()    │                                 │
│  │  - createSession()     │                                 │
│  │  - getSession()        │                                 │
│  │  - deleteSession()     │                                 │
│  └─────────┬──────────────┘                                 │
│            │                                                 │
└────────────┼─────────────────────────────────────────────────┘
             │
   ┌─────────┴───────────┐         ┌─────────────────┐
   │  Cosmos DB NoSQL    │         │  GitHub API     │
   │  (Session Storage)  │         │  + Copilot SDK  │
   └─────────────────────┘         └─────────────────┘
````

## Architecture Layers

### Client Layer (React Native + Expo)

**Purpose:** Cross-platform UI and user interaction

**Key Components:**
- `App.tsx` - Root component (composition only: ThemeContext, ErrorBoundary, layout)
- `src/components/` - React components (AuthScreen, IssueCard, SwipeContainer, Sidebar)
- `src/hooks/` - Custom hooks (useAuth, useIssues, useAnimations, useKeyboardShortcuts)
- `src/lib/` - Client services (tokenStorage, copilotService)
- `src/api/` - API client (github.ts)

**Technologies:**
- React Native 0.81
- React 19.1
- Expo SDK 54
- TypeScript 5.9
- react-native-deck-swiper (swipe cards)
- react-native-reanimated (animations)

### Server Layer (Azure Functions / Express)

**Purpose:** OAuth token exchange, GitHub API proxy, AI summaries

**Dual Deployment:**
1. **Local Development:** Express server (`server.js` + `sessionStore.js`)
2. **Production:** Azure Functions (`api/src/app.js` + `api/src/sessionStore.js`)

**Endpoints:**
- `POST /api/github-token` - Exchange OAuth code for session ID
- `GET /api/issues` - Fetch user's GitHub issues (proxied)
- `PATCH /api/issues/:owner/:repo/:number` - Update issue state
- `POST /api/ai-summary` - Generate AI summary via Copilot SDK
- `POST /api/logout` - Delete session
- `GET /api/health` - Health check + Copilot availability

**Technologies:**
- Azure Functions v4
- Node.js 20 (ESM modules)
- @github/copilot-sdk 0.1.32
- Express (local dev only)

### Data Layer

**Session Storage:**
- **Production:** Azure Cosmos DB NoSQL (account: `issuecrush-cosmos`)
- **Local:** In-memory store (sessions lost on restart)

**Session Schema:**
````json
{
  "id": "session_abc123",
  "githubToken": "gho_xxxxx",
  "createdAt": "2026-03-22T16:00:00.000Z",
  "ttl": 86400
}
````

**TTL:** 24 hours (auto-deletion in Cosmos DB)

## Architecture Boundaries

These are **hard boundaries** that must be preserved:

### 1. App.tsx Responsibilities (Composition Only)

✅ **Allowed in App.tsx:**
- `ErrorBoundary` wrapper (class component)
- `ThemeContext` provider
- Mobile/desktop layout branching (`isDesktop` check)
- Rendering child components

❌ **Not Allowed in App.tsx:**
- Business logic
- Direct API calls
- State management (beyond layout mode)

### 2. Component Props (No Direct Hook/API Calls)

✅ **Components receive:**
- Props from parent
- Callbacks from hooks (passed as props)

❌ **Components must not:**
- Call `useAuth()`, `useIssues()` directly
- Make fetch calls to backend
- Access `tokenStorage` directly

**Correct Pattern:**
````typescript
// App.tsx
const { token, startLogin } = useAuth();
const { issues, loadIssues } = useIssues(token);

return <AuthScreen token={token} onLogin={startLogin} />;

// AuthScreen.tsx
export function AuthScreen({ token, onLogin }: Props) {
  // Use props/callbacks only
}
````

### 3. Hook API Stability (Frozen Signatures)

The hook APIs (`useAuth`, `useIssues`, `useAnimations`) are **frozen**. Changing signatures requires:

1. Updating all call sites
2. Documenting breaking change
3. Explaining rationale in PR description

**Why?** Multiple components and agent workflows depend on these APIs.

### 4. SwiperRef Propagation

The `swiperRef` from `useIssues()` **must be passed as a prop** to `<Swiper>`:

````typescript
// ✅ Correct
const { swiperRef } = useIssues(token);
return <Swiper ref={swiperRef} />;

// ❌ Incorrect
const localRef = useRef<Swiper>(null); // Undo breaks!
return <Swiper ref={localRef} />;
````

**Why?** The undo feature calls `swiperRef.current?.swipeBack()`. A different ref breaks undo.

### 5. Token Exchange (Server-Side Only)

OAuth token exchange **must happen server-side**:

````typescript
// ✅ Correct Flow
Client → POST /api/github-token { code }
Server → POST https://github.com/login/oauth/access_token { code, client_secret }
Server → Store token in Cosmos DB, return session_id
Client → Store session_id in SecureStore/AsyncStorage

// ❌ Never Do This
Client → Embed client_secret in app code (security vulnerability!)
Client → Exchange token directly with GitHub
````

**Why?** The client secret must never be exposed to the client.

### 6. Authentication Headers

All frontend→backend requests use **`X-Session-Token`** header:

````typescript
// ✅ Correct
headers: {
  'X-Session-Token': sessionId,
  'Content-Type': 'application/json',
}

// ❌ Incorrect
headers: {
  'Authorization': `Bearer ${sessionId}`, // Azure SWA intercepts this!
}
````

**Why?** Azure Static Web Apps intercepts the `Authorization` header for its own auth layer.

## Data Flow

### Issue Triage Flow

1. User swipes left on issue card
2. `SwipeContainer` calls `handleSwipeLeft(cardIndex)`
3. `useIssues` hook:
   - Triggers haptic feedback (mobile only)
   - Calls `updateIssueState(sessionId, issue, 'closed')`
4. `github.ts` sends `PATCH /api/issues/:owner/:repo/:number`
5. Backend (`api/src/app.js`):
   - Resolves session → GitHub token
   - Calls GitHub API: `PATCH /repos/:owner/:repo/issues/:number`
6. Success: Issue removed from deck, feedback shown
7. Failure: Error feedback shown, card remains

### Undo Flow

1. User clicks undo button
2. `SwipeContainer` calls `handleUndo()`
3. `useIssues` hook:
   - Checks if `lastClosed` exists
   - Calls `updateIssueState(sessionId, lastClosed, 'open')`
   - Calls `swiperRef.current?.swipeBack()` (animates card return)
4. Success: Card returns to deck, haptic success feedback
5. Failure: Error feedback, haptic error feedback

### AI Summary Flow

1. User clicks "✨ Get AI Summary" button
2. `IssueCard` calls `handleAiSummary(issue)`
3. `useIssues` hook:
   - Calls `copilotService.summarizeIssue(issue)`
4. `copilotService.ts` sends `POST /api/ai-summary`
5. Backend (`api/src/app.js`):
   - Resolves session → GitHub token
   - Creates Copilot SDK session
   - Streams AI response
6. Response updates `issue.aiSummary` property
7. `IssueCard` re-renders with AI summary displayed

## Platform-Specific Behavior

### Mobile (iOS/Android)

- **OAuth:** Device flow with in-app browser
- **Token Storage:** `expo-secure-store` (secure enclave)
- **Haptic Feedback:** Enabled for all swipe/undo actions
- **Keyboard Shortcuts:** Disabled

### Web (Browser)

- **OAuth:** Web flow with full-page redirect
- **Token Storage:** `@react-native-async-storage/async-storage` (localStorage)
- **Haptic Feedback:** Disabled
- **Keyboard Shortcuts:** Enabled (arrow keys, X/O, Z/U)

See [Platform Differences](./platform-differences.md) for detailed comparison.

## Deployment Environments

### Local Development

**Stack:**
- Expo dev server (port 8081)
- Express server (port 3000)
- In-memory session storage

**Commands:**
````bash
npm run web-dev    # Web + server
npm run dev        # Mobile + server
npm run server     # Server only
````

### Azure Static Web Apps (Production)

**Stack:**
- Azure SWA hosting (static files)
- Azure Functions (API endpoints)
- Azure Cosmos DB (session storage)

**URL:** https://gray-water-08b04e810.6.azurestaticapps.net

**Deployment:** Automatic via GitHub Actions on push to `main`

## Security Model

### Token Storage

- **Client-side:** Opaque session ID only (no GitHub token)
- **Server-side:** GitHub token stored in Cosmos DB
- **Expiration:** 24-hour TTL (auto-cleanup)

### API Authentication

1. Client sends `X-Session-Token` header
2. Server calls `resolveSession(req)` to get GitHub token
3. Server makes GitHub API calls with user's token
4. User data never leaves their GitHub account scope

### Secrets Management

- **Local:** `.env` file (not committed)
- **Production:** Azure SWA app settings
- **Client Secret:** Never exposed to client

## Scaling Considerations

### Current Scale

- **Users:** Single-tenant (individual developers)
- **Sessions:** In-memory (local) or Cosmos DB (cloud)
- **Rate Limits:** GitHub API (5000 req/hr authenticated)

### Bottlenecks

1. **GitHub API Rate Limits:** Each user has their own token → no shared pool
2. **Cosmos DB RU/s:** Session reads/writes (minimal cost at current scale)
3. **Azure Functions Cold Start:** ~2-3s first request after idle

## Related Documentation

- [Authentication Flow](./authentication-flow.md)
- [Session Management](./session-management.md)
- [Platform Differences](./platform-differences.md)
- [Hooks API Reference](../api/hooks.md)
- [Backend Endpoints Reference](../api/backend-endpoints.md)
