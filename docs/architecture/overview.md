# System Architecture Overview

This document explains the high-level architecture of IssueCrush.

## Architecture Diagram

````
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT APPS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  iOS App     │  │ Android App  │          │
│  │  (Browser)   │  │ (Expo Go)    │  │ (Expo Go)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                  │
│                            │                                      │
│                     React Native                                 │
│                     Expo SDK 54                                  │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  HTTPS Requests │
                    └────────┬────────┘
                             │
┌────────────────────────────┼──────────────────────────────────────┐
│                    BACKEND SERVER                                 │
├────────────────────────────┼──────────────────────────────────────┤
│                            │                                       │
│         ┌──────────────────┴──────────────────┐                  │
│         │                                      │                  │
│    ┌────▼────────┐                    ┌───────▼────────┐         │
│    │  Express.js │                    │ Azure Functions│         │
│    │  (Local Dev)│                    │   (Production) │         │
│    └────┬────────┘                    └───────┬────────┘         │
│         │                                      │                  │
│         └──────────────┬───────────────────────┘                  │
│                        │                                          │
│           ┌────────────┴────────────┐                            │
│           │                         │                             │
│    ┌──────▼──────┐          ┌──────▼──────────┐                 │
│    │   OAuth     │          │  GitHub API     │                 │
│    │   Handler   │          │     Proxy       │                 │
│    └──────┬──────┘          └──────┬──────────┘                 │
│           │                         │                             │
│           │                ┌────────▼──────────┐                 │
│           │                │  AI Summary       │                 │
│           │                │  (@github/copilot)│                 │
│           │                └───────────────────┘                 │
│           │                                                       │
└───────────┼───────────────────────────────────────────────────────┘
            │
            │
┌───────────┼───────────────────────────────────────────────────────┐
│       EXTERNAL SERVICES                                           │
├───────────┼───────────────────────────────────────────────────────┤
│           │                                                       │
│    ┌──────▼──────────────┐        ┌──────────────────┐          │
│    │  GitHub OAuth       │        │  GitHub API      │          │
│    │  (Authentication)   │        │  (Issues, Repos) │          │
│    └─────────────────────┘        └──────────────────┘          │
│                                                                   │
│    ┌──────────────────────────────────────────────┐             │
│    │  Azure Cosmos DB NoSQL                       │             │
│    │  (Session Storage - Production)              │             │
│    │  - Database: issuecrush                      │             │
│    │  - Container: sessions (TTL: 24 hours)       │             │
│    └──────────────────────────────────────────────┘             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
````

## System Components

### Frontend (React Native + Expo)

- **App.tsx**: Root component with composition-only logic
  - ThemeContext provider
  - ErrorBoundary wrapper
  - Layout branching (mobile/desktop)
  - Orchestrates hooks and components

- **Components**: Pure presentation components
  - AuthScreen, IssueCard, Sidebar, SwipeContainer
  - Receive all data via props (no direct API calls)

- **Hooks**: Business logic and state management
  - useAuth, useIssues, useAnimations, useKeyboardShortcuts
  - Encapsulate API calls, state, and side effects

- **API Client**: GitHub API wrapper
  - All requests proxied through backend
  - Uses session token for authentication

### Backend (Express / Azure Functions)

**Local Development**: `server.js` (Express)  
**Production**: `api/src/app.js` (Azure Functions v4, Node 20, ESM)

#### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/github-token` | Exchange OAuth code for session ID |
| `GET /api/issues` | Fetch GitHub issues (with filters) |
| `PATCH /api/issues/:owner/:repo/:number` | Update issue state |
| `POST /api/ai-summary` | Generate AI summary via Copilot SDK |
| `GET /api/health` | Health check + Copilot availability |
| `POST /api/logout` | Invalidate session |

#### Session Storage

- **Local Dev**: In-memory JavaScript Map (`sessionStore.js`)
- **Production**: Azure Cosmos DB NoSQL (`api/src/sessionStore.js`)
  - Account: `issuecrush-cosmos`
  - Database: `issuecrush`
  - Container: `sessions`
  - Partition Key: `/id`
  - TTL: 24 hours (automatic expiration)

Sessions store:
- `id`: Unique session ID (sent to client)
- `github_token`: User's GitHub OAuth token
- `createdAt`: Timestamp for TTL

### External Services

#### GitHub OAuth
- **Device Flow** (mobile): User authorizes on GitHub.com, enters code in app
- **Web Flow** (browser): Redirect to GitHub, callback with code
- **Scope**: `repo` (required to close issues)

#### GitHub API
- REST API v3
- Used for fetching issues and updating issue state
- Authenticated with user's OAuth token (stored server-side)

#### GitHub Copilot SDK
- Version: 0.1.32
- Generates AI summaries of issues
- Requires `GH_TOKEN` or `COPILOT_PAT` environment variable
- Uses `onPermissionRequest: approveAll` since v0.1.32

## Data Flow

### Authentication Flow

1. User clicks "Continue with GitHub"
2. Frontend initiates OAuth (device flow on mobile, web flow on browser)
3. GitHub redirects back with authorization code
4. Frontend sends code to `/api/github-token`
5. Backend exchanges code for GitHub access token
6. Backend creates session in Cosmos DB, returns session ID
7. Frontend stores session ID in secure storage (expo-secure-store or AsyncStorage)
8. All subsequent requests include `X-Session-Token` header

### Issue Fetching Flow

1. User clicks "Refresh" or app auto-loads on mount
2. Frontend calls `fetchIssues(sessionId, repoFilter, labelFilter)`
3. Request sent to `/api/issues` with session token
4. Backend retrieves GitHub token from session store
5. Backend calls GitHub API with user's token
6. Backend returns issues to frontend
7. Frontend displays issues in swiper

### Swipe Left (Close Issue) Flow

1. User swipes left or presses Close button
2. Frontend calls `handleSwipeLeft(cardIndex)`
3. Haptic feedback (mobile only)
4. Frontend calls `updateIssueState(sessionId, issue, 'closed')`
5. Backend calls GitHub API to close issue
6. Frontend stores issue in `lastClosed` for undo
7. Toast notification: "Closed #123 · owner/repo"

### Undo Flow

1. User clicks Undo button (or presses Z on desktop)
2. Frontend calls `handleUndo()`
3. `swiperRef.current.swipeBack()` animates card back
4. Frontend calls `updateIssueState(sessionId, lastClosed, 'open')`
5. Backend calls GitHub API to reopen issue
6. Success haptic feedback (mobile only)
7. Toast notification: "Reopened #123"

### AI Summary Flow

1. User clicks "Get AI Summary" button
2. Frontend calls `copilotService.summarizeIssue(issue)`
3. Request sent to `/api/ai-summary` with session token and issue data
4. Backend retrieves session and GitHub token
5. Backend calls Copilot SDK with issue title and body
6. Copilot generates summary
7. Backend returns summary to frontend
8. Frontend updates issue object with `aiSummary` property
9. Card displays summary in AI block

## Architecture Boundaries

### Critical Constraints

⚠️ **These boundaries are enforced and must not be violated:**

1. **App.tsx is composition only**
   - Contains: ThemeContext, ErrorBoundary, layout branching
   - Does NOT contain: business logic, API calls, state management

2. **Components receive props/callbacks**
   - Components render UI based on props
   - Components do NOT call hooks or APIs directly
   - Example: IssueCard receives `onGetAiSummary` callback, doesn't call `copilotService` directly

3. **Hook APIs are frozen**
   - Signatures of `useAuth`, `useIssues`, `useAnimations` must not change without updating all call sites
   - Refactors must preserve existing API contracts

4. **swiperRef must be passed as prop**
   - The ref from `useIssues().swiperRef` must be passed to components
   - Never recreate the ref inside a child component (breaks undo feature)

5. **No new dependencies unless required**
   - Minimize external dependencies
   - Evaluate alternatives before adding new packages

### Token Exchange Security

- **Client Secret never exposed to frontend**
- OAuth code exchange happens server-side only
- Frontend receives opaque session ID, not GitHub token
- All GitHub API calls proxied through backend

### Platform Differences

| Feature | Web | Mobile |
|---------|-----|--------|
| Token Storage | AsyncStorage | expo-secure-store (encrypted) |
| OAuth Flow | Redirect to GitHub | In-app browser (WebBrowser) |
| Haptic Feedback | Disabled | Enabled (Expo Haptics) |
| Keyboard Shortcuts | Enabled | Disabled |
| Link Opening | `window.open()` | WebBrowser.openBrowserAsync() |

## Deployment

### Local Development

````bash
npm run web-dev    # Server + web browser
npm run dev        # Server + Expo dev server (mobile)
npm run server     # Server only (port 3000)
````

### Production (Azure Static Web Apps)

- **URL**: https://gray-water-08b04e810.6.azurestaticapps.net
- **Resource Group**: `issuecrush-rg`
- **Auto-Deploy**: Pushes to `main` trigger GitHub Actions workflow
- **API**: Azure Functions v4 (Node 20, ESM)
- **Config**: `staticwebapp.config.json` (routing, API proxy)

#### Environment Variables (Azure Portal)

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
EXPO_PUBLIC_GITHUB_SCOPE=repo
GH_TOKEN=...                    # For Copilot SDK
COSMOS_ENDPOINT=...             # Cosmos DB connection
COSMOS_KEY=...
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

## Known Gotchas

1. **expo export may fail** due to blocked network access to `cdp.expo.dev`
   - Use `npx tsc --noEmit` as build check instead

2. **react-native-deck-swiper requires ref** for undo (swipeBack)
   - Ref must be passed from `useIssues()`, never recreated

3. **@github/copilot-sdk requires approveAll handler** since v0.1.32
   - `onPermissionRequest: approveAll` in `createSession()`

4. **vscode-jsonrpc lacks ESM exports**
   - Postinstall script patches this: `scripts/patch-vscode-jsonrpc.js`

5. **Azure SWA intercepts Authorization header**
   - Use `X-Session-Token` for frontend→API auth

## See Also

- [Data Flow Diagram](./data-flow.md)
- [Component Development Guide](../guides/component-development.md)
- [Deployment Guide](../guides/deployment.md)
