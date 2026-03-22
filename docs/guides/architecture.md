# Architecture Guide

IssueCrush follows a client-server architecture with React Native frontend, Express/Azure Functions backend, and optional Azure Cosmos DB persistence.

## High-Level Overview

````
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Mobile     │  │     Web      │  │   Desktop    │      │
│  │  (Expo Go)   │  │  (Browser)   │  │  (Electron)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
│                    X-Session-Token                           │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Express / Azure Functions)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    OAuth     │  │   Issues     │  │  AI Summary  │      │
│  │   Handler    │  │    Proxy     │  │    (Copilot) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
  │    GitHub     │  │    GitHub     │  │    Copilot    │
  │     OAuth     │  │   REST API    │  │      SDK      │
  └───────────────┘  └───────────────┘  └───────────────┘
          │
          ▼
  ┌───────────────┐
  │  Cosmos DB    │
  │   (Sessions)  │
  └───────────────┘
````

## Frontend Architecture

### Component Hierarchy

````
App.tsx (root)
├── ThemeContext (dark/light mode)
├── ErrorBoundary (error handling)
└── Layout
    ├── AuthScreen (when not authenticated)
    └── Main Layout (when authenticated)
        ├── Sidebar (desktop only)
        ├── SwipeContainer
        │   ├── Deck Swiper
        │   │   └── IssueCard (one per issue)
        │   └── Action Bar (Close/Undo/Keep buttons)
        └── KeyboardShortcutsHelp
````

### Architecture Boundaries

IssueCrush enforces strict architectural boundaries:

1. **App.tsx is composition only**: Manages ThemeContext, ErrorBoundary, and layout branching
2. **Components receive props/callbacks**: No direct hook or API calls
3. **Hook APIs are frozen**: `useAuth`, `useIssues`, `useAnimations` signatures cannot change without updating all call sites
4. **swiperRef must be passed as prop**: Never recreated inside components

### Custom Hooks

| Hook               | Responsibility                                  |
|--------------------|-------------------------------------------------|
| useAuth            | GitHub OAuth flow, session management           |
| useIssues          | Fetch, swipe, undo, AI summary                  |
| useAnimations      | Swipe overlays, confetti, transitions           |
| useKeyboardShortcuts | Desktop keyboard navigation (←/→/U/?)         |

### State Management

- **No Redux/MobX**: React hooks + Context API only
- **Token storage**: Platform-specific (SecureStore on mobile, AsyncStorage on web)
- **Session state**: Managed server-side with 24-hour TTL

## Backend Architecture

### Development vs Production

| Environment  | Server         | Session Store | Port |
|--------------|----------------|---------------|------|
| Development  | Express.js     | In-memory     | 3000 |
| Production   | Azure Functions| Cosmos DB     | 443  |

Both environments use the **same application code** (`api/src/app.js`), ensuring consistency.

### Authentication Flow

#### Web Flow

````
1. User clicks "Start GitHub login"
2. Redirect to GitHub OAuth (client_id, scope, redirect_uri)
3. GitHub redirects back with authorization code
4. Frontend calls POST /api/github-token with code
5. Backend exchanges code for access_token
6. Backend creates session, stores token in Cosmos DB
7. Backend returns session_id to client
8. Client stores session_id (AsyncStorage on web)
9. All subsequent API calls include X-Session-Token header
````

#### Mobile Flow (Device Flow)

````
1. User clicks "Start GitHub login"
2. WebBrowser opens GitHub OAuth URL
3. User authorizes on GitHub
4. Callback URL captured with authorization code
5. Frontend calls POST /api/github-token
6. Backend exchanges code for access_token
7. Backend creates session, stores token
8. Backend returns session_id
9. Client stores session_id (SecureStore on mobile)
````

### Session Management

Sessions are managed by `sessionStore.js`:

- **createSession(token)**: Stores GitHub token, returns session ID
- **resolveSession(sessionId)**: Retrieves GitHub token for API calls
- **destroySession(sessionId)**: Invalidates session

**Storage Backend**:
- Cosmos DB (production): Persistent, TTL-based expiration
- In-memory (development): Fast but lost on restart

### API Proxying

All GitHub API calls are **proxied through the backend** to:

1. Keep GitHub token secure (never exposed to client)
2. Enable server-side session validation
3. Simplify client authentication

**Flow**:
````
Client → X-Session-Token → Backend → GitHub Token → GitHub API
````

## Data Flow

### Issue Swipe Flow

````
1. User swipes left on IssueCard
2. SwipeContainer calls handleSwipeLeft from useIssues
3. useIssues calls updateIssueState(token, issue, 'closed')
4. Frontend sends PATCH /api/issues/:owner/:repo/:number
5. Backend validates session, retrieves GitHub token
6. Backend calls GitHub API: PATCH /repos/:owner/:repo/issues/:number
7. GitHub API closes issue
8. Backend returns updated issue
9. Frontend updates UI, stores lastClosed for undo
````

### AI Summary Flow

````
1. User clicks "✨ Get AI Summary" on IssueCard
2. IssueCard calls handleGetAiSummary from useIssues
3. useIssues calls copilotService.summarizeIssue(issue)
4. Frontend sends POST /api/ai-summary with issue data
5. Backend validates session
6. Backend creates Copilot SDK session
7. Backend sends issue context to Copilot
8. Copilot returns AI-generated summary
9. Backend returns summary to client
10. Frontend updates issue.aiSummary in state
11. IssueCard displays summary
````

## Platform Differences

### Token Storage

| Platform | Library                    | Security           |
|----------|----------------------------|--------------------|
| iOS      | expo-secure-store          | Encrypted keychain |
| Android  | expo-secure-store          | Encrypted keystore |
| Web      | @react-native-async-storage| localStorage       |

### OAuth Flow

| Platform | Method                  | Redirect Handling      |
|----------|-------------------------|------------------------|
| Web      | Full page redirect      | URL query params       |
| Mobile   | WebBrowser in-app       | Deep link / URL scheme |

### Build Process

| Platform | Build Command      | Notes                              |
|----------|--------------------|------------------------------------|
| Web      | expo export --platform web | May fail if cdp.expo.dev blocked |
| iOS      | expo build:ios     | Requires Apple Developer account   |
| Android  | expo build:android | Generates APK/AAB                  |

**Build Validation**: Use `./node_modules/.bin/tsc --noEmit` for type checking (don't use `npx tsc` as it installs wrong package).

## Deployment

### Azure Static Web Apps

IssueCrush deploys to Azure SWA via GitHub Actions:

- **Trigger**: Push to `main` branch
- **Build**: React Native web bundle
- **API**: Azure Functions from `/api` directory
- **Environment**: Variables set in Azure Portal

### Infrastructure

````
Azure Resource Group: issuecrush-rg
├── Static Web App: gray-water-08b04e810
│   ├── Frontend: React Native web build
│   └── API: Azure Functions v4 (Node 20)
└── Cosmos DB: issuecrush-cosmos
    └── Database: issuecrush
        └── Container: sessions
            ├── Partition key: /id
            └── TTL: 86400 seconds (24 hours)
````

## Performance Considerations

### Bundle Size

- **Web bundle**: ~2.5 MB (gzipped)
- **Code splitting**: Not currently implemented
- **Tree shaking**: Enabled via Metro bundler

### API Response Times

| Endpoint         | Typical Response |
|------------------|------------------|
| /api/health      | < 50ms           |
| /api/issues      | 200-500ms        |
| /api/ai-summary  | 2-5 seconds      |

### Optimizations

1. **Issue caching**: Frontend caches issues until refresh
2. **AI summary caching**: Summaries stored in issue state
3. **Session validation**: Single DB lookup per request
4. **GitHub API**: Uses conditional requests (ETags)

## Security Architecture

### Secrets Management

- **Client Secret**: Never exposed to frontend, server-side only
- **GitHub Tokens**: Stored server-side, accessed via session ID
- **Session Tokens**: UUID v4, unpredictable, 24-hour expiration

### Request Flow

````
Client                Backend              Cosmos DB        GitHub API
  │                      │                    │                 │
  │  X-Session-Token     │                    │                 │
  ├─────────────────────>│                    │                 │
  │                      │  Lookup session    │                 │
  │                      ├───────────────────>│                 │
  │                      │  Return token      │                 │
  │                      │<───────────────────┤                 │
  │                      │                    │                 │
  │                      │  Authorization: Bearer <token>       │
  │                      ├────────────────────────────────────>│
  │                      │  Issue data                          │
  │                      │<────────────────────────────────────┤
  │  Issue data          │                    │                 │
  │<─────────────────────┤                    │                 │
````

### CORS Policy

- **Allowed Origins**: `http://localhost:8081`, production domain
- **Allowed Headers**: `X-Session-Token`, `Content-Type`
- **Credentials**: Not required (session token in header)

## Monitoring and Debugging

### Logging

- **Frontend**: `console.log` for development only
- **Backend**: Azure Application Insights (production)

### Error Handling

- **Frontend**: ErrorBoundary catches React errors
- **Backend**: Try/catch with descriptive error messages
- **GitHub API**: Error codes mapped to user-friendly messages

## Known Limitations

1. **No offline support**: Requires internet connection
2. **GitHub API rate limits**: 5,000 requests/hour (authenticated)
3. **AI summaries**: Requires GitHub Copilot subscription
4. **Mobile build**: expo export may fail if cdp.expo.dev blocked
5. **ESM patching**: vscode-jsonrpc requires postinstall patch

## See Also

- [API Reference](../api/README.md)
- [Deployment Guide](deployment.md)
- [AGENTS.md](../../AGENTS.md) (project context for AI agents)
