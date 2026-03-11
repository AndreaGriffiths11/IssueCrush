# Architecture

IssueCrush follows a client-server architecture with React Native frontend and Express/Azure Functions backend.

## System Overview

````
┌─────────────────────────────────────────────────────────────────┐
│                        IssueCrush Client                        │
│                    (React Native + Expo)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  AuthScreen  │  │  SwipeScreen │  │   Sidebar    │         │
│  │  (OAuth UI)  │  │ (Issue Cards)│  │  (Filters)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴───────┐         │
│  │              Custom Hooks Layer                   │         │
│  │  • useAuth (authentication)                       │         │
│  │  • useIssues (issue CRUD, swipe logic)            │         │
│  │  • useAnimations (UI animations)                  │         │
│  └────────────────────────┬──────────────────────────┘         │
│                           │                                     │
│  ┌────────────────────────┴──────────────────────────┐         │
│  │            API Client Layer                       │         │
│  │  • src/api/github.ts                              │         │
│  │  • src/lib/copilotService.ts                      │         │
│  │  • src/lib/tokenStorage.ts                        │         │
│  └────────────────────────┬──────────────────────────┘         │
└─────────────────────────────┼─────────────────────────────────┘
                              │ HTTPS/REST API
                              │ X-Session-Token header
┌─────────────────────────────┼─────────────────────────────────┐
│                        Backend Server                           │
│              (Express / Azure Functions v4)                     │
├─────────────────────────────┴─────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐         │
│  │            API Endpoints (api/src/app.js)        │         │
│  │  • POST /api/github-token (OAuth exchange)       │         │
│  │  • GET  /api/issues (fetch issues)               │         │
│  │  • PATCH /api/issues/:owner/:repo/:number        │         │
│  │  • POST /api/ai-summary (Copilot SDK)            │         │
│  │  • GET  /api/health (readiness check)            │         │
│  │  • POST /api/logout (session destroy)            │         │
│  └──────────────┬───────────────────────────────────┘         │
│                 │                                               │
│  ┌──────────────┴───────────────┬──────────────────┐          │
│  │    Session Store             │   Copilot SDK    │          │
│  │  (api/src/sessionStore.js)   │  (v0.1.32+)      │          │
│  │  • Cosmos DB (prod)          │  • GPT-4.1       │          │
│  │  • In-memory (dev)           │  • approveAll    │          │
│  └──────────────┬───────────────┴──────────────────┘          │
└─────────────────┼────────────────────────────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    │   Azure Cosmos DB NoSQL    │
    │   • DB: issuecrush         │
    │   • Container: sessions    │
    │   • TTL: 24 hours          │
    └────────────────────────────┘
````

---

## Component Architecture

### Frontend (React Native + Expo)

````
App.tsx (composition layer)
├── ErrorBoundary (catches React errors)
├── ThemeContext.Provider (light/dark theme)
└── AppContent
    ├── useAuth() → authentication state
    ├── useIssues() → issue management + swipe logic
    ├── useAnimations() → fade/scale animations
    │
    ├── AuthScreen (OAuth UI)
    │   ├── Login button
    │   ├── Device flow (mobile)
    │   └── Web flow (browser)
    │
    ├── SwipeContainer (desktop + mobile)
    │   ├── react-native-deck-swiper
    │   ├── IssueCard (pure render)
    │   │   ├── Title, number, labels
    │   │   ├── Repository info
    │   │   ├── AI summary button
    │   │   └── Tap → open in GitHub
    │   ├── Swipe overlays (NOPE/KEEP)
    │   └── Action bar (Close/Undo/Keep)
    │
    └── Sidebar (desktop only)
        ├── Progress stats
        ├── Repo filter
        ├── Refresh button
        └── Sign out
````

**Key Patterns**:
- **Composition over inheritance**: App.tsx coordinates, doesn't implement
- **Hooks for logic**: Business logic in custom hooks, not components
- **Props drilling**: Components receive theme, callbacks via props
- **Ref management**: `swiperRef` from `useIssues` passed to SwipeContainer

---

## Authentication Flow

### Mobile (Device Flow)

````
1. User taps "Start GitHub login"
   ↓
2. useAuth.startLogin() opens browser
   ↓
3. GitHub OAuth authorize page
   ↓
4. User approves → redirect with ?code=...
   ↓
5. App captures code from redirect URI
   ↓
6. POST /api/github-token { code }
   ↓
7. Backend exchanges code for access_token
   ↓
8. Backend creates session in Cosmos DB
   ↓
9. Response: { session_id, expires_in }
   ↓
10. Frontend stores session_id in expo-secure-store
````

### Web (OAuth Flow)

````
1. User clicks "Start GitHub login"
   ↓
2. window.location.href = GitHub authorize URL
   ↓
3. User approves → redirect to localhost:3000?code=...
   ↓
4. useAuth.exchangeCodeForToken(code)
   ↓
5. POST /api/github-token { code }
   ↓
6. Backend exchanges code for access_token
   ↓
7. Backend creates session
   ↓
8. Response: { session_id }
   ↓
9. Frontend stores session_id in AsyncStorage
````

**Security Notes**:
- Client secret NEVER exposed to frontend
- Access tokens stored server-side only
- Session IDs rotated on login
- 24-hour session TTL

---

## AI Integration Flow

### Initialization (App Startup)

````
1. useAuth mounts
   ↓
2. Check /api/health endpoint
   ↓
3. If server starting → retry 3x with 2s delays
   ↓
4. Response: { copilotAvailable: true }
   ↓
5. Enable AI summary button in UI
````

### Summary Generation

````
1. User taps "✨ Get AI Summary" on IssueCard
   ↓
2. copilotService.getAISummary(issue, token)
   ↓
3. POST /api/ai-summary
   Headers: X-Session-Token: <session_id>
   Body: { issue: {...} }
   ↓
4. Backend resolves session → GitHub token
   ↓
5. Backend initializes Copilot SDK:
   • CopilotClient()
   • client.start()
   • createSession({ model: 'gpt-4.1', onPermissionRequest: approveAll })
   ↓
6. Send prompt with issue details
   ↓
7. Wait for 'assistant.message' event (30s timeout)
   ↓
8. Response: { summary: "..." }
   ↓
9. Frontend displays summary in IssueCard
````

**Error Handling**:
- **No GH_TOKEN**: Health check returns `copilotAvailable: false`, button disabled
- **Invalid token**: 403 response → clear error message
- **Timeout**: Fall through to fallback summary
- **Other errors**: Graceful fallback (not 403)

---

## Session Management

### Cosmos DB Schema

````javascript
{
  id: "session_abc123",          // Partition key
  githubToken: "gho_encrypted",  // User's GitHub access token
  createdAt: "2026-03-11T10:00:00Z",
  ttl: 86400                      // Auto-delete after 24 hours
}
````

### Session Lifecycle

````
CREATE:
  POST /api/github-token
  → createSession(githubToken)
  → Store in Cosmos DB with TTL
  → Return session_id to client

READ:
  Any authenticated endpoint
  → Extract X-Session-Token header
  → resolveSession(request)
  → Query Cosmos DB by session_id
  → Return githubToken for API calls

DELETE:
  POST /api/logout
  → Extract X-Session-Token header
  → destroySession(sessionId)
  → Delete from Cosmos DB
  → Client clears local storage
````

### Fallback (Development)

If `COSMOS_*` variables not set:
- Sessions stored in `Map<string, Session>` (in-memory)
- Lost on server restart
- Fine for local development

---

## Data Flow

### Issue Swipe Left (Close)

````
1. User swipes left on IssueCard
   ↓
2. onSwipedLeft(index) in SwipeContainer
   ↓
3. useIssues.handleCloseIssue(issue)
   ↓
4. Haptics.impactAsync(Heavy)
   ↓
5. PATCH /api/issues/:owner/:repo/:number
   Headers: X-Session-Token: <session_id>
   Body: { state: "closed" }
   ↓
6. Backend resolves session → GitHub token
   ↓
7. PATCH https://api.github.com/repos/:owner/:repo/issues/:number
   Headers: Authorization: Bearer <github_token>
   Body: { state: "closed" }
   ↓
8. GitHub API response: 200 OK
   ↓
9. Backend passes through response
   ↓
10. Frontend updates local state (remove from list)
    ↓
11. Haptics.notificationAsync(Success)
````

### Undo (Reopen)

````
1. User taps "Undo" button
   ↓
2. useIssues.handleUndo()
   ↓
3. swiperRef.current.swipeBack()
   ↓
4. Issue reappears in deck
   ↓
5. PATCH /api/issues/:owner/:repo/:number
   Body: { state: "open" }
   ↓
6. GitHub API reopens issue
   ↓
7. Frontend restores to issue list
   ↓
8. Haptics.notificationAsync(Success)
````

---

## Error Handling Strategy

### Layered Error Boundaries

1. **React ErrorBoundary**: Catches render errors, shows fallback UI
2. **Network Errors**: Try/catch in API client, return `{ error }` objects
3. **GitHub API Errors**: Parse response, show user-friendly messages
4. **Copilot SDK Errors**: Distinguish auth failures from other errors

### Error Classification

````javascript
// Authentication errors → 401/403 → redirect to login
if (isAuthError || isAuthStatusCode) {
  return { status: 403, error: 'Copilot access required' };
}

// Network errors → retry with exponential backoff
for (let i = 0; i < retries; i++) {
  try { /* ... */ }
  catch { await sleep(2000 * i); }
}

// Other errors → graceful fallback
catch (error) {
  return { summary: fallbackSummary(issue) };
}
````

---

## Build & Deployment

### Local Development

````bash
# 1. Install dependencies
npm install
# Runs postinstall script: patch vscode-jsonrpc exports

# 2. Start server + app
npm run web-dev   # Web browser
npm run dev       # Mobile + Expo Go
````

### Production (Azure Static Web Apps)

````yaml
# .github/workflows/azure-swa.yml
1. Build React Native app: npx expo export --platform web
2. Build API functions: npm install --prefix api
3. Deploy to Azure SWA:
   - App: build/
   - API: api/
   - Config: staticwebapp.config.json
````

**Environment Variables** (set in Azure Portal):
- `EXPO_PUBLIC_GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GH_TOKEN` or `COPILOT_PAT`
- `COSMOS_ENDPOINT`, `COSMOS_KEY`, etc.

---

## Technical Decisions

### Why Expo?

- Cross-platform (web, iOS, Android) from single codebase
- Secure storage (expo-secure-store)
- OAuth handling (expo-auth-session, expo-web-browser)
- Fast iteration with hot reload

### Why Express + Azure Functions?

- **Express (dev)**: Easy local development, full control
- **Azure Functions (prod)**: Serverless, auto-scaling, integrated with SWA
- Same code runs in both environments (ESM + Azure Functions v4)

### Why Cosmos DB?

- Serverless (pay-per-request)
- Global distribution (low latency)
- TTL support (auto-cleanup)
- NoSQL flexibility

### Why Copilot SDK?

- Official GitHub AI integration
- Pre-trained on code and issues
- Contextual understanding
- Managed service (no fine-tuning needed)

---

## Performance Considerations

### Client-Side Optimizations

- **Lazy Loading**: Components load on demand
- **Memoization**: `useCallback`, `useMemo` for expensive operations
- **StyleSheet**: Compiled styles, not inline objects
- **Platform-Specific**: `Platform.select()` for web/mobile differences

### Server-Side Optimizations

- **Session Caching**: Sessions cached in memory (Cosmos DB fallback)
- **Connection Pooling**: GitHub API client reused
- **Timeout Management**: 30s Copilot timeout, prevents hanging requests
- **Error Fast-Path**: Auth errors return immediately, no retry

### Network Optimizations

- **Minimal Payloads**: Only essential issue fields
- **Pagination**: GitHub API paged results (future enhancement)
- **Health Check Retry**: Exponential backoff prevents startup spam

---

## Security Architecture

### Defense in Depth

1. **Client Secret Protection**: Server-side only, env vars
2. **Token Storage**: Secure storage (keychain on iOS, EncryptedSharedPreferences on Android)
3. **Session Isolation**: Session IDs can't be guessed (crypto.randomBytes)
4. **TTL**: Auto-expire sessions after 24h
5. **HTTPS**: Required in production (Azure SWA enforces)
6. **Scope Minimization**: Only request `repo` scope

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Client secret exposure | Never in frontend code or Git |
| Session hijacking | HTTPS only, secure storage, short TTL |
| Token leakage | Server-side storage, never in logs |
| XSS attacks | React Native sandboxing, no `dangerouslySetInnerHTML` |
| Copilot prompt injection | Sanitize inputs, structured prompts |

---

## Monitoring & Observability

### Logging

- **Azure Application Insights**: Automatic in Azure Functions
- **Console Logs**: `context.log()` in functions, `console.log()` in dev
- **Error Tracking**: ErrorBoundary captures React errors

### Metrics

- Session creation rate
- Issue close/reopen counts
- AI summary success/failure ratio
- API response times

### Health Checks

- `/api/health` endpoint
- Frontend retry logic
- Auto-recovery from transient failures

---

## Future Enhancements

- [ ] Pagination for large issue lists
- [ ] Offline support (sync when back online)
- [ ] Advanced filters (labels, milestones, assignees)
- [ ] Batch operations (close multiple issues)
- [ ] Analytics dashboard (triage velocity, AI accuracy)
- [ ] WebSocket for real-time updates
- [ ] Multi-language support (i18n)

---

## Further Reading

- [AGENTS.md](../AGENTS.md) - AI agent context
- [API.md](API.md) - API reference
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guide
- [README.md](../README.md) - Setup instructions
