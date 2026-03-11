# IssueCrush Architecture

This document explains the system architecture, design decisions, and how the different components work together.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Authentication Flow](#authentication-flow)
- [Session Management](#session-management)
- [AI Integration](#ai-integration)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Deployment Architecture](#deployment-architecture)

---

## Overview

IssueCrush is a **React Native + Expo** mobile/web app with an **Azure Functions** backend. It uses a **swipe-based interface** (like Tinder) to help developers quickly triage GitHub issues.

**Key Design Principles:**
- **Cross-platform**: Single codebase for iOS, Android, and web
- **Secure**: OAuth tokens never exposed to client; session-based authentication
- **Scalable**: Serverless backend (Azure Functions) with persistent session storage (Cosmos DB)
- **AI-Enhanced**: Optional GitHub Copilot integration for intelligent issue summaries
- **Developer-Friendly**: Works locally without cloud dependencies (in-memory sessions)

---

## System Architecture

````
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  React Native (0.81) + Expo (SDK 54)                    │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐     │   │
│  │  │  AuthScreen│  │ IssueCard   │  │ Sidebar      │     │   │
│  │  │            │  │             │  │              │     │   │
│  │  └────────────┘  └─────────────┘  └──────────────┘     │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐     │   │
│  │  │ useAuth    │  │ useIssues   │  │useAnimations │     │   │
│  │  └────────────┘  └─────────────┘  └──────────────┘     │   │
│  │  ┌────────────────────────────────────────────────┐     │   │
│  │  │  tokenStorage.ts (SecureStore/AsyncStorage)    │     │   │
│  │  └────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (X-Session-Token header)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      BACKEND (Azure Functions v4)               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routes (api/src/app.js)                             │  │
│  │  • POST /api/github-token   (OAuth exchange)             │  │
│  │  • GET  /api/issues         (Fetch issues)               │  │
│  │  • PATCH /api/issues/{...}  (Update issue state)         │  │
│  │  • POST /api/ai-summary     (Copilot AI summary)         │  │
│  │  • POST /api/logout         (Destroy session)            │  │
│  │  • GET  /api/health         (Health check)               │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │  Session Store (api/src/sessionStore.js)                 │  │
│  │  ┌────────────────┐           ┌──────────────────────┐   │  │
│  │  │ Cosmos DB      │  Fallback │ In-Memory Map        │   │  │
│  │  │ (Production)   │◄──────────┤ (Development)        │   │  │
│  │  └────────────────┘           └──────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬────────────────────────────┬───────────────────────┘
             │                            │
             │ GitHub REST API            │ GitHub Copilot SDK
             │ (issues, OAuth)            │ (AI summaries)
             ▼                            ▼
    ┌─────────────────┐          ┌──────────────────┐
    │ GitHub.com      │          │ Copilot API      │
    │ OAuth + Issues  │          │ (GPT-4.1)        │
    └─────────────────┘          └──────────────────┘
````

---

## Frontend Architecture

### Technology Stack

- **React Native 0.81** - Core framework
- **React 19.1** - Latest React features
- **Expo SDK 54** - Build toolchain and native modules
- **TypeScript 5.9** - Type safety
- **react-native-deck-swiper** - Swipe card UI

### Component Structure

````
App.tsx                           # Root composition layer
├── ThemeContext.Provider        # Theme state (dark/light mode)
├── ErrorBoundary                # Top-level error handling
└── AppContent                   # Main app logic
    ├── useAuth()                # Authentication state + OAuth
    ├── useIssues()              # Issue data + swipe actions
    ├── useAnimations()          # UI animations
    ├── AuthScreen               # Login/logout UI
    ├── Sidebar (desktop)        # Filters, progress, actions
    └── SwipeContainer           # Card deck + overlays
        └── IssueCard            # Individual issue display
````

### Custom Hooks

**`useAuth()` - Authentication**
- Manages OAuth flow (device flow for mobile, web flow for browser)
- Stores session token in SecureStore (mobile) or AsyncStorage (web)
- Handles token exchange via backend
- Provides `signIn()`, `signOut()`, `token`, `authError`

**`useIssues()` - Issue Management**
- Fetches issues from backend (with repo/label filters)
- Handles swipe actions (close/keep)
- Manages undo functionality
- Loads AI summaries on demand
- Provides `issues`, `currentIndex`, `swiperRef`, `loadIssues()`, `handleSwipeLeft/Right()`

**`useAnimations()` - UI Animations**
- Manages fade-in/fade-out animations
- Controls overlay animations (NOPE/KEEP stamps)
- Provides `fadeAnim`, `overlayOpacity`

### State Management

**No external state library** - Uses React hooks:
- `useState` for component state
- `useCallback` for memoized functions
- `useRef` for swiper control and confetti trigger
- `useEffect` for side effects (URL params, token loading)

**Why no Redux/MobX?**
- Simple state tree (auth + issues)
- No complex data relationships
- Hooks provide sufficient structure

---

## Backend Architecture

### Technology Stack

- **Azure Functions v4** - Serverless compute
- **Node.js 20** - Runtime
- **ES Modules** - Modern JavaScript
- **@github/copilot-sdk 0.1.14** - AI integration
- **@azure/cosmos** - Session storage
- **@azure/functions** - HTTP triggers

### API Structure

All endpoints defined in `api/src/app.js` using Azure Functions HTTP triggers:

````javascript
app.http('githubToken', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'github-token',
  handler: async (request, context) => { ... }
});
````

**Why Azure Functions?**
- **Serverless**: No server management
- **Auto-scaling**: Handles traffic spikes
- **Pay-per-use**: Cost-efficient for low/moderate traffic
- **Integrated with Azure SWA**: Single deployment pipeline

### Session Storage

**Dual-backend design:**
- **Cosmos DB** (production): Persistent, globally distributed, TTL support
- **In-memory Map** (development): Zero config, instant setup

**Session Lifecycle:**
1. OAuth code exchange → Create session in storage
2. Client stores opaque session ID
3. Backend resolves session ID → GitHub token on every request
4. Session expires after 24 hours (Cosmos DB TTL)

**Cosmos DB Schema:**
````json
{
  "id": "session-id",           // Partition key
  "githubToken": "gho_xxxxx",
  "createdAt": 1710155000000,
  "expiresAt": 1710241400000,
  "ttl": 86400                  // Auto-delete after 24h
}
````

---

## Authentication Flow

### Mobile (Device Flow)

````
[Client]                    [Backend]                [GitHub]
   │                            │                        │
   │  1. Start Device Flow      │                        │
   │───────────────────────────>│                        │
   │                            │  2. Request device code│
   │                            │───────────────────────>│
   │                            │<───────────────────────│
   │                            │  3. Return device code │
   │<───────────────────────────│    & verification URL  │
   │                            │                        │
   │  4. Open verification URL in browser                │
   │────────────────────────────────────────────────────>│
   │                            │                        │
   │  5. User authorizes                                 │
   │<────────────────────────────────────────────────────│
   │                            │                        │
   │  6. Send device code       │                        │
   │───────────────────────────>│                        │
   │                            │  7. Exchange for token │
   │                            │───────────────────────>│
   │                            │<───────────────────────│
   │                            │  8. Return OAuth token │
   │                            │                        │
   │                            │  9. Store in session DB│
   │                            │───────────>            │
   │  10. Return session ID     │                        │
   │<───────────────────────────│                        │
   │                            │                        │
   │  11. Store session ID in SecureStore                │
````

### Web (OAuth Code Flow)

````
[Client]                    [Backend]                [GitHub]
   │                            │                        │
   │  1. Redirect to GitHub OAuth                        │
   │────────────────────────────────────────────────────>│
   │                            │                        │
   │  2. User authorizes                                 │
   │<────────────────────────────────────────────────────│
   │                            │                        │
   │  3. Redirect with code     │                        │
   │<────────────────────────────────────────────────────│
   │                            │                        │
   │  4. Send code to backend   │                        │
   │───────────────────────────>│                        │
   │                            │  5. Exchange for token │
   │                            │───────────────────────>│
   │                            │<───────────────────────│
   │                            │  6. Return OAuth token │
   │                            │                        │
   │                            │  7. Store in session DB│
   │                            │───────────>            │
   │  8. Return session ID      │                        │
   │<───────────────────────────│                        │
   │                            │                        │
   │  9. Store session ID in AsyncStorage                │
````

**Key Differences:**
- **Mobile**: Device flow doesn't require redirect URI configuration
- **Web**: Requires redirect URI to match OAuth app settings
- **Both**: Client never sees GitHub OAuth token (only session ID)

---

## Session Management

### Why Session-Based Instead of Token-Based?

**Security:**
- GitHub OAuth tokens have **read/write access** to user repositories
- Exposing tokens on client (especially web) is a security risk
- Session IDs are opaque and useless without backend access

**Azure SWA Constraint:**
- Azure Static Web Apps **intercepts** `Authorization` header
- Cannot reliably pass OAuth tokens in standard header
- Session tokens use custom `X-Session-Token` header

**Revocation:**
- Sessions can be destroyed server-side
- No need to invalidate GitHub tokens
- User logout = destroy session

### Session Resolution

Every authenticated request:
1. Client sends `X-Session-Token: <session-id>`
2. Backend calls `resolveSession(request)`
3. Function extracts session ID from header
4. Retrieves GitHub token from storage
5. Uses GitHub token for API calls

````javascript
async function resolveSession(request) {
  const sessionId = request.headers.get('x-session-token') ||
                    request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!sessionId) return null;
  
  // Fetch from Cosmos DB or in-memory Map
  const session = await getSession(sessionId);
  
  if (!session || session.expiresAt < Date.now()) {
    return null;  // Expired
  }
  
  return { sessionId, githubToken: session.githubToken };
}
````

---

## AI Integration

### GitHub Copilot SDK

**Purpose:** Generate intelligent issue summaries to help with quick triage.

**Flow:**
1. User taps "✨ Get AI Summary" on issue card
2. Frontend calls `POST /api/ai-summary` with issue data
3. Backend initializes Copilot client and session
4. Sends prompt to Copilot with issue details
5. Copilot analyzes and returns 2-3 sentence summary
6. Frontend displays summary on card

**Prompt Structure:**
````
You are analyzing a GitHub issue to help a developer quickly understand it 
and decide how to handle it.

Issue Details:
- Title: [title]
- Number: #[number]
- Repository: [repo]
- State: [state]
- Labels: [labels]
- Created: [date]
- Author: [user]

Issue Body:
[body]

Provide a concise 2-3 sentence summary that:
1. Explains what the issue is about
2. Identifies the key problem or request
3. Suggests a recommended action
````

**Model:** `gpt-4.1` (configurable)

**Timeout:** 30 seconds

**Fallback:** If Copilot unavailable, returns basic summary (title + labels + first sentence)

**Requirements:**
- Backend environment variable: `GH_TOKEN` or `COPILOT_PAT`
- GitHub Copilot subscription
- If unavailable, returns `403` with `requiresCopilot: true`

---

## Data Flow

### Fetch Issues

````
[Frontend]                     [Backend]                [GitHub API]
    │                              │                         │
    │  1. GET /api/issues?         │                         │
    │     repo=owner/repo          │                         │
    │─────────────────────────────>│                         │
    │  X-Session-Token: abc123     │                         │
    │                              │  2. Resolve session     │
    │                              │     → GitHub token      │
    │                              │                         │
    │                              │  3. GET /repos/.../     │
    │                              │     issues?state=open   │
    │                              │────────────────────────>│
    │                              │  Authorization: token   │
    │                              │<────────────────────────│
    │                              │  4. Return issues JSON  │
    │  5. Return filtered issues   │                         │
    │<─────────────────────────────│                         │
    │  (no pull requests)          │                         │
````

### Close Issue (Swipe Left)

````
[Frontend]                     [Backend]                [GitHub API]
    │                              │                         │
    │  1. PATCH /api/issues/       │                         │
    │     owner/repo/123           │                         │
    │─────────────────────────────>│                         │
    │  Body: { state: "closed" }   │                         │
    │  X-Session-Token: abc123     │                         │
    │                              │  2. Resolve session     │
    │                              │     → GitHub token      │
    │                              │                         │
    │                              │  3. PATCH /repos/.../   │
    │                              │     issues/123          │
    │                              │────────────────────────>│
    │                              │  Body: { state:         │
    │                              │    "closed" }           │
    │                              │<────────────────────────│
    │                              │  4. Return updated      │
    │                              │     issue               │
    │  5. Return success           │                         │
    │<─────────────────────────────│                         │
    │                              │                         │
    │  6. Update UI (remove card)  │                         │
    │  7. Show toast notification  │                         │
    │  8. Store lastClosed for undo│                         │
````

---

## Security Model

### Threat Model

**Protected Against:**
- ✅ OAuth token exposure (never sent to client)
- ✅ CSRF attacks (session tokens are opaque, not predictable)
- ✅ Session hijacking (HTTPS only, secure storage)
- ✅ Token theft from client storage (only session ID stored, expires in 24h)

**Relies On:**
- GitHub OAuth security
- HTTPS transport encryption
- Azure platform security (Functions + Cosmos DB)
- Client-side secure storage (SecureStore on mobile)

### Security Best Practices

1. **Never expose GitHub OAuth tokens**
   - Stored only in backend (Cosmos DB or in-memory)
   - Client receives opaque session ID

2. **Use HTTPS everywhere**
   - Azure SWA enforces HTTPS
   - Local dev uses `http://localhost` (acceptable for development)

3. **Secure token storage on client**
   - Mobile: `expo-secure-store` (encrypted keychain/keystore)
   - Web: `AsyncStorage` (localStorage, not encrypted but acceptable for session IDs)

4. **Session expiration**
   - 24-hour TTL limits damage from stolen session IDs
   - User must re-authenticate after expiry

5. **Proper OAuth scopes**
   - Use `repo` scope (required to close issues)
   - User explicitly consents during OAuth flow

6. **Backend validation**
   - All API calls validate session before GitHub API calls
   - Return `401` if session invalid/expired

---

## Deployment Architecture

### Azure Static Web Apps

````
┌────────────────────────────────────────────────────────────┐
│  Azure Static Web Apps                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Static Content (CDN)                                │ │
│  │  - HTML, CSS, JS bundles                             │ │
│  │  - Built from Expo web build                         │ │
│  │  - Served globally via Azure CDN                     │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Managed Functions                                   │ │
│  │  - Built from api/ folder                            │ │
│  │  - Auto-configured /api/* routing                    │ │
│  │  - Environment variables from App Settings           │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌────────────────────────────┐
              │  Azure Cosmos DB           │
              │  - NoSQL API               │
              │  - Global distribution     │
              │  - Automatic TTL           │
              └────────────────────────────┘
````

### CI/CD Pipeline

**Trigger:** Push to `main` branch

**Workflow:** `.github/workflows/azure-swa.yml`

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm install`)
4. Build Expo web app (`npx expo export --platform web`)
5. Deploy to Azure SWA (using `@azure/static-web-apps-deploy` action)
6. Azure SWA builds and deploys API functions automatically

**Environment Variables:**
Set in Azure Portal → Static Web App → Configuration:
- `EXPO_PUBLIC_GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `COSMOS_ENDPOINT` (optional)
- `COSMOS_KEY` (optional)
- `GH_TOKEN` or `COPILOT_PAT` (optional, for AI)

---

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev)
- [Azure Functions Documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)

For code details, see:
- Frontend: [`App.tsx`](../App.tsx), [`src/`](../src/)
- Backend: [`api/src/app.js`](../api/src/app.js)
- Session storage: [`api/src/sessionStore.js`](../api/src/sessionStore.js)
