# Architecture Deep Dive

## Overview

IssueCrush is a cross-platform mobile-first application built with React Native and Expo, featuring a backend API for GitHub OAuth and AI-powered issue analysis. The architecture is designed for clarity, maintainability, and platform compatibility.

## System Architecture

````
┌─────────────────────────────────────────────────────────────┐
│                     Client (React Native)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │  App.tsx   │  │   Hooks    │  │      Components        │ │
│  │            │  │            │  │                        │ │
│  │  - Theme   │  │ - useAuth  │  │ - AuthScreen           │ │
│  │  - Error   │  │ - useIssues│  │ - SwipeContainer       │ │
│  │  - Layout  │  │            │  │ - IssueCard            │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
│         │               │                    │               │
│         └───────────────┼────────────────────┘               │
│                         │                                    │
│                    ┌────▼────┐                               │
│                    │   API   │                               │
│                    │ Clients │                               │
│                    └────┬────┘                               │
└─────────────────────────┼──────────────────────────────────┘
                          │
                    ┌─────▼─────┐
                    │  Backend  │
                    │    API    │
                    │           │
                    │ - OAuth   │
                    │ - Issues  │
                    │ - AI      │
                    └─────┬─────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐    ┌─────▼─────┐   ┌─────▼─────┐
    │ GitHub  │    │  Cosmos   │   │  Copilot  │
    │   API   │    │    DB     │   │    SDK    │
    └─────────┘    └───────────┘   └───────────┘
````

## Frontend Architecture

### Component Hierarchy

````
App.tsx (Root)
├── ThemeContext.Provider
│   └── ErrorBoundary
│       └── SafeAreaProvider
│           ├── AuthScreen (when !token)
│           └── Layout (when token)
│               ├── SwipeContainer (mobile)
│               │   ├── Swiper
│               │   │   └── IssueCard[]
│               │   └── ActionBar
│               └── Desktop Layout
│                   ├── Sidebar
│                   ├── SwipeContainer
│                   └── KeyboardShortcutsHelp
````

### Architecture Boundaries

The codebase enforces strict architectural boundaries to maintain clarity:

#### 1. App.tsx Responsibilities

**Must Stay in App.tsx:**
- `ErrorBoundary` (class component) — must wrap all children
- `ThemeContext.Provider` — root-level context
- Mobile/desktop layout branching (`isDesktop` / `useWindowDimensions`)

**Must NOT Move Out:**
These are composition concerns that define the app's structure.

#### 2. Component Boundaries

**Components are pure presentation:**
- Receive props and callbacks
- Do NOT call hooks directly (except UI-only hooks like `useState` for local UI state)
- Do NOT make API calls
- Do NOT manage global state

**Example:**

````typescript
// ✅ CORRECT: Component receives callbacks
function IssueCard({ issue, onSwipeLeft, onSwipeRight }) {
  return <View>...</View>;
}

// ❌ WRONG: Component calls hooks directly
function IssueCard({ issue }) {
  const { handleSwipeLeft } = useIssues(); // NO!
  return <View>...</View>;
}
````

#### 3. Hook API Boundaries

**Hook APIs are frozen:**
- `useAuth()`, `useIssues()`, `useAnimations()` signatures are stable
- If a signature must change, update ALL call sites and document in PR
- Breaking changes require careful migration

**Critical Pattern: swiperRef**

The `swiperRef` from `useIssues()` must be passed as a prop:

````typescript
// In parent component
const { swiperRef } = useIssues(token);

// Pass to child
<SwipeContainer swiperRef={swiperRef} ... />
````

**Never recreate the ref inside a component** — it breaks undo functionality.

#### 4. API Client Boundaries

**Token exchange happens server-side:**
- OAuth client secret is NEVER exposed to frontend
- Frontend sends authorization code to `/api/github-token`
- Backend exchanges code for token, stores in session
- Frontend receives session ID only

**All API calls use session token:**
- Header: `X-Session-Token` (Azure SWA intercepts `Authorization`)
- Session tokens expire after 24 hours
- Backend resolves session to GitHub token

### State Management

**No global state library** — state is colocated in hooks:

- **`useAuth`** — authentication state, OAuth flow, session management
- **`useIssues`** — issue data, swipe handlers, undo logic, AI summaries
- **`useAnimations`** — confetti and visual feedback
- **`useKeyboardShortcuts`** — keyboard navigation (desktop)

### Platform Compatibility

IssueCrush runs on three platforms with conditional logic:

````typescript
import { Platform } from 'react-native';

// Token storage
if (Platform.OS === 'web') {
  // Use @react-native-async-storage/async-storage
} else {
  // Use expo-secure-store
}

// Haptic feedback
if (Platform.OS !== 'web') {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}
````

**Platform-Specific Features:**

| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| OAuth Flow | Web flow (redirect) | Device flow (modal) | Device flow (modal) |
| Token Storage | AsyncStorage | SecureStore | SecureStore |
| Haptic Feedback | ❌ | ✅ | ✅ |
| Keyboard Shortcuts | ✅ | ❌ | ❌ |

## Backend Architecture

### Local vs. Production

The backend runs in two modes:

| Environment | Runtime | Code Location |
|-------------|---------|---------------|
| **Local Development** | Express.js | `server.js` |
| **Production** | Azure Functions | `api/src/app.js` |

Both implement the same API contract, with minor differences in request/response handling.

### Session Storage

Sessions are stored with different backends depending on environment:

````javascript
// Local: In-memory (sessionStore.js)
const sessions = new Map();

// Production: Cosmos DB (api/src/sessionStore.js)
const container = database.container('sessions');
````

**Session Schema:**

````json
{
  "id": "unique_session_id",
  "githubToken": "gho_...",
  "createdAt": "2026-03-22T12:00:00Z",
  "expiresAt": "2026-03-23T12:00:00Z",
  "ttl": 86400
}
````

**TTL (Time-To-Live):** 24 hours (Cosmos DB auto-deletes expired sessions)

### OAuth Flow

````
1. User clicks "Start GitHub login"
   ↓
2. Frontend redirects to GitHub OAuth
   https://github.com/login/oauth/authorize?client_id=...
   ↓
3. User authorizes app
   ↓
4. GitHub redirects with authorization code
   http://localhost:8081?code=abc123
   ↓
5. Frontend sends code to backend
   POST /api/github-token { code: "abc123" }
   ↓
6. Backend exchanges code for token
   POST https://github.com/login/oauth/access_token
   ↓
7. Backend creates session, stores token
   createSession(githubToken) → sessionId
   ↓
8. Backend returns session ID
   { session_id: "xyz789" }
   ↓
9. Frontend stores session ID securely
   SecureStore.setItemAsync("session", "xyz789")
````

### AI Summary Pipeline

````
1. User taps "✨ Get AI Summary"
   ↓
2. Frontend calls copilotService.summarizeIssue(issue)
   ↓
3. Frontend sends request to backend
   POST /api/ai-summary
   X-Session-Token: xyz789
   { issue: { ... } }
   ↓
4. Backend resolves session → GitHub token
   ↓
5. Backend creates Copilot SDK session
   const agent = await createSession({
     token: githubToken,
     onPermissionRequest: approveAll
   })
   ↓
6. Backend sends prompt to Copilot
   agent.chat([{
     role: 'user',
     content: `Analyze this issue: ${issue.title}...`
   }])
   ↓
7. Copilot returns analysis
   ↓
8. Backend returns summary to frontend
   { summary: "This issue addresses..." }
   ↓
9. Frontend updates issue card
   setIssues(prev => prev.map(item =>
     item.id === issue.id
       ? { ...item, aiSummary: summary }
       : item
   ))
````

### GitHub API Proxy

All GitHub API calls are proxied through the backend:

````
Frontend                Backend              GitHub API
   │                       │                      │
   │  GET /api/issues      │                      │
   ├──────────────────────>│                      │
   │  X-Session-Token      │                      │
   │                       │                      │
   │                       │  resolveSession()    │
   │                       │  ↓                   │
   │                       │  GET /issues         │
   │                       ├─────────────────────>│
   │                       │  Authorization:      │
   │                       │  Bearer gho_...      │
   │                       │                      │
   │                       │  200 [issues]        │
   │                       │<─────────────────────┤
   │                       │                      │
   │  200 [issues]         │                      │
   │<──────────────────────┤                      │
````

**Why Proxy?**

1. **Security:** OAuth token never sent to frontend
2. **Azure SWA Constraint:** `Authorization` header is intercepted, so we use `X-Session-Token`
3. **Session Management:** Backend resolves session → token

## Data Flow

### Issue Loading

````typescript
// 1. User enters repo filter and clicks "Refresh"
loadIssues() {
  // 2. Hook calls GitHub API client
  const data = await fetchIssues(token, repoFilter, labelFilter);
  
  // 3. Client sends request to backend
  GET /api/issues?repo=owner/repo&labels=bug
  X-Session-Token: xyz789
  
  // 4. Backend resolves session and proxies to GitHub
  const session = await resolveSession(request);
  const response = await fetch(GITHUB_API + '/issues', {
    headers: githubHeaders(session.githubToken)
  });
  
  // 5. Data flows back to frontend
  setIssues(data);
}
````

### Swipe Actions

````typescript
// 1. User swipes left (close issue)
handleSwipeLeft(cardIndex) {
  // 2. Haptic feedback (mobile only)
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  
  // 3. Update issue state
  const issue = issues[cardIndex];
  await updateIssueState(token, issue, 'closed');
  
  // 4. Backend proxies PATCH to GitHub
  PATCH /repos/owner/repo/issues/42
  { state: "closed" }
  
  // 5. Show feedback
  setFeedback(`Closed #${issue.number}`);
  
  // 6. Store for undo
  setLastClosed(issue);
}
````

### Undo Flow

````typescript
// 1. User taps "Undo"
handleUndo() {
  // 2. Swipe card back
  swiperRef.current?.swipeBack();
  setCurrentIndex(prev => prev - 1);
  
  // 3. Reopen issue on GitHub
  await updateIssueState(token, lastClosed, 'open');
  
  // 4. Success feedback
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  setFeedback(`Reopened #${lastClosed.number}`);
  
  // 5. Clear undo buffer
  setLastClosed(null);
}
````

## Known Gotchas

### 1. Expo Export Failures

**Issue:** `expo export` may fail due to blocked network access to `cdp.expo.dev`

**Solution:** Use `npx tsc --noEmit` as the build check instead

**Why:** TypeScript type-checking validates code without network access

### 2. Swiper Ref Survival

**Issue:** `react-native-deck-swiper` requires a stable ref for undo (swipeBack)

**Critical Pattern:**

````typescript
// ✅ CORRECT: Create ref in hook, pass as prop
const { swiperRef } = useIssues(token);
<SwipeContainer swiperRef={swiperRef} />

// ❌ WRONG: Create ref inside component
function SwipeContainer() {
  const swiperRef = useRef(); // NO! This breaks on refactor
}
````

### 3. Copilot SDK Permissions

**Issue:** `@github/copilot-sdk` v0.1.32+ requires permission handler

**Solution:**

````typescript
const agent = await createSession({
  token: githubToken,
  onPermissionRequest: approveAll // Required since v0.1.32
});
````

**Without this:** Session creation throws an error

### 4. vscode-jsonrpc ESM Exports

**Issue:** `vscode-jsonrpc@8` lacks ESM exports, breaks Copilot SDK

**Solution:** Postinstall script patches the package

````json
{
  "scripts": {
    "postinstall": "node scripts/patch-vscode-jsonrpc.js"
  }
}
````

**Do NOT remove** this postinstall script or the patch file.

### 5. Azure SWA Authorization Header

**Issue:** Azure Static Web Apps intercepts `Authorization` header

**Solution:** Use `X-Session-Token` header instead

````typescript
const authHeaders = (sessionId: string) => ({
  'X-Session-Token': sessionId,
  'Content-Type': 'application/json',
});
````

## Deployment Architecture

### Local Development

````
┌─────────────────────────────────────────┐
│  npm run web-dev                         │
│                                          │
│  ┌─────────────┐    ┌─────────────────┐ │
│  │ Express.js  │    │  Expo Dev Server│ │
│  │ (port 3000) │    │  (port 8081)    │ │
│  │             │    │                 │ │
│  │ - OAuth     │    │ - Metro bundler │ │
│  │ - Issues    │    │ - Hot reload    │ │
│  │ - AI proxy  │    │ - Web UI        │ │
│  └─────────────┘    └─────────────────┘ │
│         │                    │           │
│         └────────────────────┘           │
└─────────────────────────────────────────┘
         │
         ▼
  In-memory sessions
  (lost on restart)
````

### Production

````
┌────────────────────────────────────────────┐
│  Azure Static Web Apps                     │
│                                            │
│  ┌──────────────────┐   ┌────────────────┐│
│  │  Static Assets   │   │ Azure Functions││
│  │  (Expo web build)│   │  (Node.js 20)  ││
│  │                  │   │                ││
│  │  - HTML/CSS/JS   │   │  - OAuth       ││
│  │  - React bundle  │   │  - Issues      ││
│  │  - Assets        │   │  - AI proxy    ││
│  └──────────────────┘   └────────┬───────┘│
└───────────────────────────────────┼────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────▼─────┐   ┌────▼────┐   ┌─────▼─────┐
              │  Cosmos   │   │ GitHub  │   │  Copilot  │
              │    DB     │   │   API   │   │    SDK    │
              └───────────┘   └─────────┘   └───────────┘
````

**Deployment Trigger:**

- Push to `main` branch → GitHub Actions → Azure SWA deployment
- Workflow: `.github/workflows/azure-swa.yml`

## Code Clarity Standard

Every line of code should do exactly one thing. Use intermediate variables as documentation.

### Pattern Examples

#### ❌ Complex Fallback Chain

````typescript
const repoName = issue.repository?.full_name || (issue.repository_url ? extractRepoPath(issue.repository_url) : 'unknown');
````

#### ✅ Documented with Intermediate Variables

````typescript
const dedicatedRepoName = issue.repository?.full_name;
const fallbackRepoName = issue.repository_url 
  ? extractRepoPath(issue.repository_url) 
  : 'unknown';
const repoName = dedicatedRepoName || fallbackRepoName;
````

#### ❌ Magic Numbers

````typescript
if (Date.now() - session.createdAt > 86400000) {
  // expired
}
````

#### ✅ Named Constants

````typescript
const oneDayMs = 24 * 60 * 60 * 1000;
const sessionAge = Date.now() - session.createdAt;
const isExpired = sessionAge > oneDayMs;
if (isExpired) {
  // expired
}
````

## Testing Strategy

### Unit Tests

- **API Client:** `src/api/github.test.ts`
- **Token Storage:** `src/lib/tokenStorage.test.ts`
- **Copilot Service:** `src/lib/copilotService.test.ts`
- **Server:** `server.test.js`

### Type Checking

````bash
npx tsc --noEmit
````

Validates TypeScript types without building. Run before every commit.

### Integration Tests

Manual testing checklist:

1. ✅ OAuth login (web + mobile)
2. ✅ Load issues with/without filters
3. ✅ Swipe left to close
4. ✅ Swipe right to keep
5. ✅ Undo last action
6. ✅ AI summary generation
7. ✅ Desktop keyboard shortcuts
8. ✅ Mobile haptic feedback

## Performance Considerations

### Issue Loading

- GitHub API rate limit: 5,000 requests/hour (authenticated)
- Filter on server-side when possible
- Pagination not yet implemented (loads all open issues)

### AI Summaries

- On-demand only (user must click "✨ Get AI Summary")
- Cached in client state (survives card re-render)
- Not persisted (lost on page refresh)

### Token Storage

- Mobile: Encrypted in OS keychain via `expo-secure-store`
- Web: Unencrypted in browser storage via `AsyncStorage`
- Session tokens are opaque, expire after 24 hours

## Future Architecture Improvements

### Potential Enhancements

1. **Pagination:** Load issues in batches for large repos
2. **Offline Mode:** Cache issues locally, sync on reconnect
3. **Push Notifications:** Alert on new issues/mentions
4. **Batch Actions:** Close/label multiple issues at once
5. **Custom Filters:** Save and reuse filter combinations
6. **Analytics:** Track triage velocity and patterns

### Migration Paths

If architecture boundaries need to change:

1. Document reason in issue/PR
2. Update all call sites atomically
3. Update this document
4. Run full test suite
5. Deploy with rollback plan

## Additional Resources

- [API Reference](./API.md) — Complete API endpoint documentation
- [Development Guide](./DEVELOPMENT.md) — Setup and workflow
- [Deployment Guide](./DEPLOYMENT.md) — Production deployment
- [AGENTS.md](../AGENTS.md) — AI agent context and patterns
