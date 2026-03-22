# Architecture Guide

This document provides a comprehensive overview of IssueCrush's architecture, design decisions, and key patterns.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Key Design Decisions](#key-design-decisions)

---

## High-Level Architecture

IssueCrush follows a **client-server architecture** with clear separation between frontend (React Native + Expo) and backend (Express/Azure Functions).

````
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React Native App (Expo SDK 54)                  │  │
│  │  • Components (UI)                                │  │
│  │  • Hooks (State + Logic)                          │  │
│  │  • API Client (Backend Communication)             │  │
│  └──────────────────────────────────────────────────┘  │
│            ↓ HTTPS (X-Session-Token)                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Server Layer                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Express Server / Azure Functions                 │  │
│  │  • OAuth Token Exchange                           │  │
│  │  • GitHub API Proxy                               │  │
│  │  • AI Summary Endpoint (Copilot SDK)              │  │
│  │  • Session Management                             │  │
│  └──────────────────────────────────────────────────┘  │
│            ↓ REST API                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   External Services                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  GitHub API  │  │ Cosmos DB    │  │ Copilot SDK  │  │
│  │  (REST v3)   │  │ (Sessions)   │  │ (AI)         │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
````

---

## Frontend Architecture

### Component Hierarchy

````
App.tsx (Root)
├── ThemeProvider
│   └── ErrorBoundary
│       ├── AuthScreen (when not authenticated)
│       └── Main Layout (when authenticated)
│           ├── Desktop Layout (isDesktop = true)
│           │   ├── Sidebar
│           │   └── SwipeContainer
│           └── Mobile Layout (isDesktop = false)
│               ├── SwipeContainer
│               └── Sidebar (collapsed/drawer)
│
├── SwipeContainer
│   ├── Swiper (react-native-deck-swiper)
│   │   └── IssueCard (for each issue)
│   ├── StampOverlay (CLOSED / KEEP)
│   ├── ProgressBar
│   └── ActionBar (Close / Undo / Keep)
│
└── IssueCard
    ├── IssueHeader (number, repo, state)
    ├── IssueTitle
    ├── IssueLabels
    ├── IssueMetadata (author, date)
    ├── IssueBody (truncated)
    └── AISummaryButton (if copilotAvailable)
````

---

### Architecture Boundaries

**Critical Rules** (enforced by code review and documented in AGENTS.md):

1. **`App.tsx` is composition only:**
   - ErrorBoundary (must wrap all children)
   - ThemeContext provider (root-level context)
   - Layout branching (isDesktop / mobile)
   - NO business logic, NO API calls, NO state management beyond layout

2. **Components receive props/callbacks:**
   - Components do NOT call hooks directly
   - Components do NOT call APIs directly
   - All data and callbacks flow from `App.tsx` → Components

3. **Hook APIs are frozen:**
   - `useAuth()`, `useIssues()`, `useAnimations()` signatures are stable
   - Breaking changes require updating all call sites
   - Document reason in PR description

4. **`swiperRef` must be passed as prop:**
   - Never recreate the ref inside a component
   - Always pass from `useIssues().swiperRef` → SwipeContainer

---

### State Management

IssueCrush uses **React hooks for state management** (no Redux/MobX). State is organized by concern:

| Hook | Responsibility |
|------|----------------|
| `useAuth()` | Authentication state, OAuth flow, session management |
| `useIssues()` | Issue fetching, filtering, CRUD operations, undo stack |
| `useAnimations()` | Swipe feedback animations, progress bar, stamp overlays |
| `useKeyboardShortcuts()` | Desktop keyboard shortcuts |
| `useTheme()` | Theme switching (currently light-only) |

**State Flow:**
````
useAuth() → token
          ↓
useIssues(token) → issues, filters, actions
          ↓
Components (props) → UI rendering
````

---

### Platform Differences

| Feature | iOS/Android | Web |
|---------|-------------|-----|
| Token Storage | `expo-secure-store` (Keychain) | `AsyncStorage` (localStorage) |
| OAuth Flow | Device flow (WebBrowser) | Web flow (redirect) |
| Haptic Feedback | `Haptics.impactAsync()` | No-op |
| Keyboard Shortcuts | Disabled | Enabled |
| Swiper | Touch gestures | Mouse drag + keyboard |

**Platform Detection:**
````typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Web-specific code
} else {
  // Mobile-specific code
}
````

---

## Backend Architecture

### Local Development vs Production

| Environment | Server | Functions | Session Storage |
|-------------|--------|-----------|-----------------|
| **Local Dev** | Express (`server.js`) | Inline functions | In-memory (`sessionStore.js`) or Cosmos DB |
| **Production** | Azure SWA | Azure Functions (`api/src/app.js`) | Cosmos DB (`api/src/sessionStore.js`) |

**Key Insight:** `server.js` mirrors the structure of `api/src/app.js` to ensure local development matches production behavior.

---

### API Endpoints

All endpoints are defined in both `server.js` (local) and `api/src/app.js` (Azure Functions):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Server status, Copilot availability |
| `/api/github-token` | POST | OAuth code → session ID exchange |
| `/api/issues` | GET | Fetch user's GitHub issues |
| `/api/issues/:owner/:repo/:number` | PATCH | Close or reopen issue |
| `/api/ai-summary` | POST | Generate AI summary via Copilot SDK |
| `/api/logout` | POST | Destroy session |

---

### Session Management

**Session Flow:**

````
1. User authorizes via GitHub OAuth
2. Backend exchanges code for GitHub access token
3. Backend stores token in Cosmos DB (or in-memory)
4. Backend returns session ID to client
5. Client stores session ID in secure storage
6. Client sends X-Session-Token header with every request
7. Backend resolves session → GitHub token → GitHub API call
````

**Session Store Interface:**
````javascript
createSession(githubToken, userLogin) → sessionId
getSession(sessionId) → { githubToken, userLogin, createdAt }
deleteSession(sessionId) → void
resolveSession(req) → { githubToken, userLogin }  // Reads from header
````

**Session Expiry:**
- TTL: 24 hours
- Enforced by Cosmos DB (automatic cleanup)
- In-memory sessions expire via periodic cleanup

---

### AI Summary Implementation

**Copilot SDK Integration:**

````javascript
import { CopilotClient, approveAll } from '@github/copilot-sdk';

// Use the logged-in user's GitHub token
const client = new CopilotClient({ githubToken: userToken });
await client.start();

const session = await client.createSession({
  model: 'gpt-4.1',
  onPermissionRequest: approveAll,  // Required since v0.1.32
});

const response = await session.sendAndWait({ prompt }, 30000);
const summary = response.data.content;

await session.destroy();
await client.stop();
````

**Key Decisions:**
- **User token, not server token:** Each AI summary uses the logged-in user's GitHub Copilot access (via `githubToken` option)
- **Per-request sessions:** Create/destroy session for each summary (no persistent sessions)
- **Timeout:** 30 seconds per request
- **Fallback:** If Copilot fails (non-auth), return basic summary (title + labels + first sentence)
- **Error handling:** Distinguish auth errors (403) from network errors

---

## Data Flow

### Authentication Flow

````
┌─────────┐                  ┌─────────┐                  ┌─────────┐
│  Client │                  │  Server │                  │  GitHub │
└────┬────┘                  └────┬────┘                  └────┬────┘
     │                            │                            │
     │ 1. Start OAuth             │                            │
     ├──────────────────────────► │                            │
     │                            │ 2. Redirect to GitHub      │
     │                            ├───────────────────────────► │
     │                            │                            │
     │ 3. User authorizes         │                            │
     │◄───────────────────────────┼────────────────────────────┤
     │                            │                            │
     │ 4. Callback with code      │                            │
     ├──────────────────────────► │                            │
     │                            │ 5. Exchange code for token │
     │                            ├───────────────────────────► │
     │                            │◄───────────────────────────┤
     │                            │ 6. Store token, create session
     │                            │                            │
     │◄───────────────────────────┤ 7. Return session ID       │
     │ 8. Store session ID        │                            │
     │                            │                            │
````

---

### Issue Fetching Flow

````
┌─────────┐                  ┌─────────┐                  ┌─────────┐
│  Client │                  │  Server │                  │  GitHub │
└────┬────┘                  └────┬────┘                  └────┬────┘
     │                            │                            │
     │ 1. GET /api/issues         │                            │
     │    X-Session-Token: abc123 │                            │
     ├──────────────────────────► │                            │
     │                            │ 2. Resolve session → token │
     │                            │                            │
     │                            │ 3. GET /search/issues      │
     │                            │    Authorization: token    │
     │                            ├───────────────────────────► │
     │                            │◄───────────────────────────┤
     │                            │ 4. Return issues           │
     │◄───────────────────────────┤                            │
     │ 5. Render IssueCard        │                            │
     │                            │                            │
````

---

### AI Summary Flow

````
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌─────────┐
│  Client │     │  Server │     │ Copilot SDK │     │  GitHub │
└────┬────┘     └────┬────┘     └──────┬──────┘     └────┬────┘
     │               │                  │                 │
     │ 1. Request    │                  │                 │
     │    summary    │                  │                 │
     ├──────────────► │                  │                 │
     │               │ 2. Resolve       │                 │
     │               │    session       │                 │
     │               │                  │                 │
     │               │ 3. Create client │                 │
     │               │    with user     │                 │
     │               │    GitHub token  │                 │
     │               ├─────────────────►│                 │
     │               │                  │ 4. Authenticate │
     │               │                  ├────────────────►│
     │               │                  │◄────────────────┤
     │               │ 5. Create session│                 │
     │               ├─────────────────►│                 │
     │               │ 6. Send prompt   │                 │
     │               ├─────────────────►│                 │
     │               │                  │ 7. LLM call     │
     │               │◄─────────────────┤                 │
     │◄──────────────┤ 8. Return summary│                 │
     │               │ 9. Cleanup       │                 │
     │               ├─────────────────►│                 │
     │               │                  │                 │
````

---

## Security Architecture

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **Client secret exposure** | Never sent to frontend; only used server-side |
| **Session hijacking** | HTTPS only; short TTL (24h); secure storage |
| **XSS attacks** | Security headers; no dangerouslySetInnerHTML |
| **CSRF** | SameSite cookies (future); stateless sessions |
| **Token leakage** | Secure storage (Keychain/localStorage); no logs |
| **Rate limit bypass** | GitHub API rate limits (5k/hour); Copilot SDK limits |

---

### Authentication Security

**OAuth Flow Security:**
- State parameter prevents CSRF (future enhancement)
- Code expires after 10 minutes
- One-time use only (server validates)
- HTTPS required for redirect URI

**Session Security:**
- Random session IDs (UUID v4)
- 24-hour expiry
- Server-side validation on every request
- No JWT (simpler, more secure for this use case)

---

### API Security

**Headers:**
````http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
````

**CORS:**
- Configured in Express for local dev
- Azure SWA handles CORS in production

---

## Deployment Architecture

### Azure Static Web Apps

````
                            ┌─────────────────────┐
                            │   Azure Front Door  │
                            │   (CDN + WAF)       │
                            └──────────┬──────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
         ┌──────────▼──────────┐              ┌──────────▼──────────┐
         │  Static Web App     │              │  Azure Functions    │
         │  (React Native Web) │              │  (Node.js 20 + ESM) │
         └──────────┬──────────┘              └──────────┬──────────┘
                    │                                     │
                    │                         ┌───────────▼───────────┐
                    │                         │  Azure Cosmos DB      │
                    │                         │  (Sessions, NoSQL)    │
                    │                         └───────────────────────┘
                    │
         ┌──────────▼──────────┐
         │  GitHub Actions     │
         │  (CI/CD Pipeline)   │
         └─────────────────────┘
````

**Key Features:**
- **Global CDN:** Fast content delivery worldwide
- **Automatic HTTPS:** Managed SSL certificates
- **Auto-scaling:** Handles traffic spikes
- **Git-based deployment:** Push to main = auto-deploy

---

## Key Design Decisions

### Why React Native + Expo?

**Decision:** Use React Native + Expo for cross-platform development.

**Rationale:**
- Single codebase for web, iOS, Android
- Expo SDK provides native modules (secure storage, OAuth, haptics)
- Faster iteration than native development
- Strong community and documentation

**Trade-offs:**
- Larger bundle size than pure web
- Some native features require custom development config

---

### Why Azure Functions over Serverless Framework?

**Decision:** Use Azure Functions for backend instead of AWS Lambda/Serverless Framework.

**Rationale:**
- Native integration with Azure Static Web Apps
- Built-in routing (no API Gateway config)
- Cosmos DB in same ecosystem
- Free tier sufficient for small projects

**Trade-offs:**
- Vendor lock-in (mitigated by Express parity)
- Azure CLI learning curve

---

### Why Cosmos DB over PostgreSQL?

**Decision:** Use Cosmos DB NoSQL for session storage.

**Rationale:**
- Built-in TTL (automatic session expiry)
- Partition key scaling
- Azure-native integration
- Serverless pricing model (pay per request)

**Trade-offs:**
- Overkill for simple key-value storage
- Higher cost at scale (use Redis/Upstash as alternative)

---

### Why X-Session-Token instead of Authorization?

**Decision:** Use custom `X-Session-Token` header instead of standard `Authorization`.

**Rationale:**
- Azure Static Web Apps intercepts `Authorization` header
- Custom headers pass through unchanged
- Session-based auth (not JWT) is simpler for this use case

**Trade-offs:**
- Non-standard (document in API reference)

---

### Why Per-Request Copilot Sessions?

**Decision:** Create/destroy Copilot SDK session for each AI summary request.

**Rationale:**
- Prevents session leaks (explicit cleanup)
- Simpler error handling (no session state)
- Matches serverless model (stateless functions)
- Each request uses user's own Copilot access

**Trade-offs:**
- Slightly slower (session creation overhead)
- More API calls to GitHub Copilot service

---

### Why Undo Stack instead of GitHub Issue History?

**Decision:** Maintain client-side undo stack instead of fetching issue history from GitHub.

**Rationale:**
- Faster undo (no API call)
- Works offline (until sync)
- Simple implementation (array of closed issues)
- Better UX (instant feedback)

**Trade-offs:**
- Limited to 10 items (memory constraint)
- Lost on page refresh (acceptable for this use case)

---

## Performance Considerations

### Frontend Optimization

- **Lazy loading:** Components loaded on demand
- **Memoization:** `useMemo` for expensive computations
- **Virtualization:** Only visible issue cards rendered (swiper handles this)
- **Image optimization:** WebP for assets, lazy load avatars

### Backend Optimization

- **Session caching:** In-memory cache for hot sessions (future)
- **GitHub API caching:** Cache issue lists (short TTL)
- **Connection pooling:** Reuse HTTP connections
- **Cosmos DB indexing:** Partition key on `/id` for fast lookups

### Network Optimization

- **HTTP/2:** Multiplexing requests
- **Compression:** Gzip/Brotli for API responses
- **CDN:** Static assets served from edge locations

---

## Monitoring and Observability

### Logging

````javascript
console.log('\u2705 Success message');  // ✅
console.error('\u274c Error message');  // ❌
console.log('\ud83e\udd16 AI operation');  // 🤖
console.log('\ud83d\udd12 Auth operation');  // 🔒
````

### Metrics to Track

- **Authentication:** Login success/failure rate
- **API:** Request count, latency, error rate
- **AI Summaries:** Request count, timeout rate, fallback rate
- **Issues:** Close/reopen count, undo count

---

## Future Architecture Improvements

### Planned Enhancements

1. **Offline Support:** Service worker for web, AsyncStorage cache for mobile
2. **Real-time Updates:** WebSocket for live issue updates
3. **Background Sync:** Queue actions for offline → online sync
4. **Redis Session Store:** Replace Cosmos DB for lower cost at scale
5. **GraphQL API:** Replace REST for flexible querying
6. **Dark Theme:** Implement theme switching
7. **Push Notifications:** Alert users to new issues (mobile)

---

## See Also

- [API.md](./API.md) — API reference
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Deployment guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Development setup
- [AGENTS.md](../AGENTS.md) — AI agent context
