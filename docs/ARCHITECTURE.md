# Architecture

IssueCrush architecture documentation covering system design, data flow, and technical decisions.

## Overview

IssueCrush is a React Native application with an Express/Azure Functions backend, built for swiping through GitHub issues. The architecture emphasizes:

- **Security**: OAuth tokens never exposed to client, session-based authentication
- **Cross-platform**: Runs on web, iOS, and Android from a single codebase
- **Separation of concerns**: Clean boundaries between UI, business logic, and API
- **Progressive enhancement**: Works without AI features if Copilot unavailable

## System Architecture

````
┌─────────────────────────────────────────────────────────────┐
│                      Client (React Native + Expo)           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   App.tsx    │  │  Components  │  │    Hooks     │     │
│  │ (Composition)│←─┤  AuthScreen  │←─┤   useAuth    │     │
│  │              │  │  IssueCard   │  │  useIssues   │     │
│  │              │  │  Sidebar     │  │ useAnimations│     │
│  │              │  │SwipeContainer│  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↑                                    ↑              │
│         │                                    │              │
│         └────────────┬───────────────────────┘              │
│                      ↓                                      │
│              ┌──────────────┐                               │
│              │   Services   │                               │
│              │ ─────────────│                               │
│              │ GitHub API   │                               │
│              │ Copilot Svc  │                               │
│              │ TokenStorage │                               │
│              └──────────────┘                               │
└─────────────────────────────────────────────────────────────┘
                       ↓ HTTPS (X-Session-Token)
┌─────────────────────────────────────────────────────────────┐
│            Backend (Azure Functions / Express)               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    OAuth     │  │   Issues     │  │  AI Summary  │     │
│  │   Exchange   │  │   Proxy      │  │    Proxy     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                  ↓                  ↓             │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Session Store (Cosmos DB)              │      │
│  │         sessionId → GitHub Access Token          │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                       ↓ HTTPS (Bearer Token)
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│                                                              │
│  ┌──────────────┐              ┌──────────────┐            │
│  │  GitHub API  │              │GitHub Copilot│            │
│  │              │              │     SDK      │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
````

## Component Architecture

### App.tsx (Composition Layer)

**Responsibility:** Compose the UI using hooks and components. No business logic.

**Key Features:**
- Theme provider (ThemeContext)
- Error boundary for crash recovery
- Desktop/mobile layout branching
- Coordinates hooks and passes data to components

**Does NOT:**
- Make API calls directly
- Contain business logic
- Manage complex state (delegated to hooks)

### Hooks (Business Logic)

Location: `src/hooks/`

**Responsibility:** Encapsulate stateful logic and side effects.

#### `useAuth`
- GitHub OAuth flows (device + web)
- Token lifecycle (exchange, refresh, logout)
- Session management via backend
- Copilot availability detection

#### `useIssues`
- Issue fetching and filtering
- Swipe action handlers (close/keep)
- Undo functionality
- AI summary requests
- Haptic feedback (mobile only)

#### `useAnimations`
- Toast notifications (fade in/out)
- Card scaling effects
- Reactive to theme, feedback, and focus state

### Components (Presentation)

Location: `src/components/`

**Responsibility:** Render UI based on props. No direct API calls or hooks (except UI hooks like `useState` for local UI state).

#### Design Principles:
1. **Pure rendering** - Components receive data via props
2. **Callbacks** - Actions passed as props (e.g., `onSwipeLeft`)
3. **Theme-aware** - Receive `theme` and `isDark` props
4. **Responsive** - Adapt to `isDesktop` prop

**Example Pattern:**
````typescript
// ✅ Good: Component receives props
export function IssueCard({ issue, onAiSummary, theme }: IssueCardProps) {
  return (
    <View>
      <Button onPress={onAiSummary} title="Get AI Summary" />
    </View>
  );
}

// ❌ Bad: Component calls hooks/APIs directly
export function IssueCard({ issue }: IssueCardProps) {
  const { handleAiSummary } = useIssues(); // ❌ Don't do this
  return <Button onPress={() => handleAiSummary(issue)} />;
}
````

## Data Flow

### Authentication Flow

````
1. User clicks "Start GitHub login"
   ↓
2. Platform check:
   - Web: Redirect to GitHub OAuth
   - Mobile: Device flow (display code)
   ↓
3. User authorizes on GitHub
   ↓
4. GitHub returns authorization code
   ↓
5. Client sends code to /api/github-token
   ↓
6. Backend exchanges code for access_token
   ↓
7. Backend stores access_token in Cosmos DB
   ↓
8. Backend returns session_id to client
   ↓
9. Client stores session_id securely:
   - Mobile: expo-secure-store
   - Web: AsyncStorage
````

### Issue Fetch Flow

````
1. User enters repo filter (optional)
   ↓
2. Client calls loadIssues()
   ↓
3. GET /api/issues?repo=owner/repo
   Headers: X-Session-Token: <session_id>
   ↓
4. Backend resolves session → access_token
   ↓
5. Backend calls GitHub API with access_token
   ↓
6. Backend returns issues to client
   ↓
7. Client updates state, renders cards
````

### Swipe Flow (Close Issue)

````
1. User swipes left or clicks "Close"
   ↓
2. Haptic feedback (mobile only)
   ↓
3. Card animates off screen
   ↓
4. PATCH /api/issues/:owner/:repo/:number
   Body: { state: "closed" }
   Headers: X-Session-Token: <session_id>
   ↓
5. Backend resolves session → access_token
   ↓
6. Backend calls GitHub API to close issue
   ↓
7. Client updates lastClosed state
   ↓
8. Toast shows "Closed #123 · repo/name" with Undo button
````

### Undo Flow

````
1. User clicks "Undo" in toast
   ↓
2. Client calls updateIssueState(lastClosed, 'open')
   ↓
3. Backend reopens issue via GitHub API
   ↓
4. On success: swiperRef.swipeBack()
   ↓
5. Card animates back into view
   ↓
6. Toast shows "Reopened #123" with success haptic
````

### AI Summary Flow

````
1. User clicks "✨ Get AI Summary"
   ↓
2. POST /api/ai-summary
   Body: { issue: GitHubIssue }
   Headers: X-Session-Token: <session_id>
   ↓
3. Backend resolves session → access_token
   ↓
4. Backend calls GitHub Copilot SDK
   ↓
5. Backend returns summary or fallback
   ↓
6. Client stores aiSummary in issue object
   ↓
7. Card updates to show summary
````

## State Management

### Token State

**Location:** `useAuth` hook

````typescript
const [token, setToken] = useState<string | null>(null);
````

**Persistence:**
- Mobile: `expo-secure-store`
- Web: `AsyncStorage`

**Initialization:** Loaded on app mount via `getToken()`

### Issue State

**Location:** `useIssues` hook

````typescript
const [issues, setIssues] = useState<GitHubIssue[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [lastClosed, setLastClosed] = useState<GitHubIssue | null>(null);
````

**Reset Conditions:**
- New issue load
- Logout
- Filter change

### UI State

**Location:** Multiple hooks

- `useAnimations`: Toast and card animations
- `useAuth`: Loading states, errors
- `useIssues`: Loading states, feedback messages

## Session Management

### Backend Session Store

**Technology:** Azure Cosmos DB NoSQL (optional, falls back to in-memory)

**Schema:**
````javascript
{
  id: "session_id",          // Partition key
  sessionId: "session_id",   // Same as id
  githubToken: "gho_...",    // GitHub access token
  createdAt: Date,
  ttl: 86400                 // 24-hour TTL
}
````

**Operations:**
- `createSession(token)` - Store new token, return session ID
- `resolveSession(request)` - Extract session ID from headers, return token
- `destroySession(sessionId)` - Delete session on logout

**TTL:** Sessions expire after 24 hours (Cosmos DB automatic cleanup)

## Security Model

### Token Protection

1. **Client Secret Never Exposed**
   - Only stored in backend environment
   - Token exchange happens server-side

2. **Access Token Never Sent to Client**
   - Stored in Cosmos DB
   - Client only receives opaque session ID

3. **Session-Based Authentication**
   - Client sends `X-Session-Token` header
   - Backend looks up real GitHub token
   - Azure SWA intercepts `Authorization` header (hence `X-Session-Token`)

4. **Secure Storage**
   - Mobile: Encrypted via `expo-secure-store`
   - Web: Unencrypted `AsyncStorage` (acceptable for opaque session ID)

### Scope Requirements

**OAuth Scope:** `repo` (full repository access)

**Why not `public_repo`?**
- `public_repo` only grants read access to public repositories
- Closing issues requires write access
- `repo` includes both public and private repositories

## Platform Differences

### Mobile (iOS/Android)

- **OAuth Flow:** Device flow (user enters code on GitHub)
- **Token Storage:** `expo-secure-store` (hardware-backed encryption)
- **Haptic Feedback:** Native vibrations via `expo-haptics`
- **Navigation:** React Native navigation
- **Cursor:** No cursor styles

### Web (Browser)

- **OAuth Flow:** Standard redirect flow
- **Token Storage:** `AsyncStorage` (localStorage wrapper)
- **Haptic Feedback:** Disabled (web has no haptic API)
- **Navigation:** `window.location` redirects
- **Cursor:** CSS cursor styles applied via `webCursor()`

### Desktop Layout

**Detection:** `useWindowDimensions().width >= 768`

**Differences:**
- Shows `<Sidebar>` component (hidden on mobile)
- Wider card layout
- Horizontal layout (sidebar + main content)

## Error Handling

### Authentication Errors

1. **Session Expired (401)**
   - Caught in GitHub API client
   - Thrown as "Session expired. Please sign in again."
   - User must re-authenticate

2. **OAuth Errors**
   - Captured in `useAuth.exchangeCodeForToken()`
   - Displayed in `authError` state
   - Examples: `bad_verification_code`, `access_denied`

### API Errors

1. **Network Failures**
   - Caught in try/catch blocks
   - Displayed in `feedback` state
   - User can retry action

2. **Permission Errors (403)**
   - Scope insufficient or Copilot required
   - Clear error message displayed

3. **Not Found (404)**
   - Repository doesn't exist or no access
   - Error: "Repository not found or you lack access."

## Deployment Architecture

### Azure Static Web Apps

**Components:**
- **Frontend:** Static React Native web build
- **Backend:** Azure Functions (Node.js 20, ESM)
- **Database:** Cosmos DB NoSQL (optional)

**Environment Variables:**
- `EXPO_PUBLIC_GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth secret (backend only)
- `COSMOS_ENDPOINT` - Cosmos DB endpoint (optional)
- `COSMOS_KEY` - Cosmos DB key (optional)
- `GH_TOKEN` or `COPILOT_PAT` - GitHub token with Copilot access (AI features)

**Deployment Flow:**
1. Push to `main` branch
2. GitHub Actions builds React Native web + Azure Functions
3. Azure SWA deploys to staging slot
4. Automatic swap to production

### Local Development

**Architecture:**
- Express server (port 3000) - OAuth + AI proxy
- Expo dev server (port 8081) - React Native bundler
- Web browser or mobile device

**Session Storage:** In-memory (no Cosmos DB required)

## Performance Considerations

### Image Loading

- Issue avatars lazy-loaded
- Label colors pre-computed
- Repository names cached

### Animation Performance

- Native animations via `Animated` API
- Haptic feedback only on physical actions
- Card recycling via `react-native-deck-swiper`

### API Call Optimization

- Batch issue fetching (GitHub API pagination)
- Session token cached in state
- No redundant re-fetching

## Testing Strategy

### Unit Tests

**Location:** `.test.ts` files co-located with source

**Coverage:**
- `github.ts` - API client functions
- `tokenStorage.ts` - Token operations
- `copilotService.ts` - AI summary logic

**Framework:** Jest

### Integration Tests

**Coverage:**
- OAuth token exchange (`server.test.js`)
- Session lifecycle
- API proxy endpoints

### Manual Testing

**Platforms:**
- iOS simulator
- Android emulator
- Web browsers (Chrome, Safari, Firefox)

## Known Limitations

1. **Expo Export Blocked**
   - `expo export` may fail due to network restrictions
   - Workaround: Use `npx tsc --noEmit` for type-checking

2. **Device Flow UX**
   - Mobile OAuth requires manual code entry
   - No deep linking back to app

3. **Session Expiration**
   - No automatic refresh
   - User must manually re-authenticate after 24 hours

4. **AI Summaries**
   - Requires GitHub Copilot subscription
   - No fallback AI provider
   - Summary quality depends on issue content

## Future Architecture Considerations

### Potential Improvements

1. **Real-time Updates**
   - WebSocket connection for live issue updates
   - Push notifications for new issues

2. **Offline Support**
   - Cache issues locally
   - Queue actions for sync when online

3. **Advanced Filtering**
   - Assignee filtering
   - Date range filtering
   - Custom query syntax

4. **Multi-account Support**
   - Switch between GitHub accounts
   - Organization-specific views

5. **Analytics**
   - Track swipe patterns
   - Issue triage efficiency metrics

## Related Documentation

- [API Reference](./API.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [README](../README.md)
- [AGENTS.md](../AGENTS.md) - AI agent context
