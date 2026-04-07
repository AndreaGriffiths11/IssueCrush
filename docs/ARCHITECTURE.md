# Architecture Guide

IssueCrush is a cross-platform mobile-first application built with React Native and Expo. This guide explains the architectural decisions, component structure, and data flow.

## Overview

````
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Expo)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              App.tsx (Composition Root)              │   │
│  │  • ThemeContext Provider                             │   │
│  │  • ErrorBoundary                                     │   │
│  │  • Platform-specific layout (mobile/desktop)        │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│    ┌────────────┴─────────────┐                             │
│    │                          │                             │
│    ▼                          ▼                             │
│  ┌─────────────┐        ┌──────────────────┐               │
│  │ AuthScreen  │        │ SwipeContainer   │               │
│  └─────────────┘        │  + IssueCard     │               │
│                         │  + Sidebar       │               │
│                         └──────────────────┘               │
│                                 │                           │
│                                 ▼                           │
│                    ┌───────────────────────┐               │
│                    │   Custom Hooks        │               │
│                    │  • useAuth            │               │
│                    │  • useIssues          │               │
│                    │  • useAnimations      │               │
│                    └───────────┬───────────┘               │
│                                │                           │
│                                ▼                           │
│                    ┌───────────────────────┐               │
│                    │   API & Services      │               │
│                    │  • github.ts          │               │
│                    │  • tokenStorage.ts    │               │
│                    │  • copilotService.ts  │               │
│                    └───────────┬───────────┘               │
└────────────────────────────────┼───────────────────────────┘
                                 │ HTTP
                    ┌────────────┴───────────┐
                    ▼                        ▼
        ┌───────────────────────┐   ┌───────────────────┐
        │  Express Server       │   │  Azure Functions  │
        │  (Local Dev)          │   │  (Production)     │
        │  • OAuth Callback     │   │  • OAuth Callback │
        │  • API Proxy          │   │  • API Proxy      │
        │  • AI Summaries       │   │  • AI Summaries   │
        └───────────┬───────────┘   └─────────┬─────────┘
                    │                         │
                    ▼                         ▼
        ┌───────────────────────┐   ┌───────────────────┐
        │  In-Memory Sessions   │   │  Cosmos DB        │
        │  (sessionStore.js)    │   │  (Sessions TTL)   │
        └───────────────────────┘   └───────────────────┘
                    │                         │
                    └────────┬────────────────┘
                             ▼
                    ┌────────────────────┐
                    │   GitHub API       │
                    │   • Issues         │
                    │   • OAuth          │
                    └────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │  Copilot SDK       │
                    │  • AI Summaries    │
                    └────────────────────┘
````

---

## Design Principles

### 1. Composition Over Inheritance

`App.tsx` is the **composition root**. It assembles the application from smaller, focused components rather than using inheritance hierarchies.

### 2. Architecture Boundaries

Strict separation of concerns prevents components from crossing boundaries:

- **`App.tsx`**: Composition only (providers, error boundary, layout branching)
- **Components**: Pure presentation, receive props/callbacks, no direct API calls
- **Hooks**: Business logic, state management, side effects
- **API Layer**: Network communication, token management

### 3. Platform Awareness

IssueCrush adapts to mobile and web environments without conditional compilation:

- **Token Storage**: `expo-secure-store` (mobile) vs `AsyncStorage` (web)
- **Layout**: Mobile-first with responsive desktop sidebar
- **OAuth Flow**: Device flow (mobile) vs web flow (browser)

---

## Component Structure

### App.tsx

The root component is responsible for:

1. **Context Providers**: `ThemeContext` wraps the entire app
2. **Error Boundary**: Catches unhandled errors (class component)
3. **Layout Branching**: Detects desktop vs mobile using `useWindowDimensions`
4. **State Management**: Handles authentication, issues, animations via hooks

**Key Rule**: `App.tsx` must not contain business logic. It only composes other components and provides context.

### Components

#### AuthScreen (`src/components/AuthScreen.tsx`)

Handles GitHub OAuth login UI:

- Displays login button
- Shows user information after authentication
- Provides logout functionality

**Props**:
- `isAuthenticated: boolean`
- `user: GitHubUser | null`
- `onLogin: () => void`
- `onLogout: () => void`

#### SwipeContainer (`src/components/SwipeContainer.tsx`)

Main swipe interface coordinator:

- Manages `react-native-deck-swiper` instance
- Coordinates swipe actions (left = close, right = keep)
- Handles undo functionality
- Shows action bar and keyboard shortcuts

**Props**:
- `issues: Issue[]`
- `onSwipeLeft: (index: number) => void`
- `onSwipeRight: (index: number) => void`
- `onUndo: () => void`
- `swiperRef: React.RefObject`

**Important**: `swiperRef` must be passed from `useIssues()` hook, never recreated inside the component.

#### IssueCard (`src/components/IssueCard.tsx`)

Pure rendering component for individual issue cards:

- Displays issue metadata (title, number, labels, author)
- Shows AI summary if available
- Handles "Get AI Summary" button clicks
- Opens issue in browser when tapped

**Props**:
- `issue: Issue`
- `onGetSummary?: () => void`
- `aiSummary?: string`
- `loadingSummary?: boolean`

**Key Rule**: No network calls. All data comes via props.

#### Sidebar (`src/components/Sidebar.tsx`)

Desktop-only sidebar for filters and actions:

- Repository filter input
- Progress indicator
- Action buttons (Close, Undo, Keep)
- Keyboard shortcuts help

**Props**:
- `repoFilter: string`
- `onRepoFilterChange: (filter: string) => void`
- `onRefresh: () => void`
- `issuesCount: number`
- `currentIndex: number`

---

## Custom Hooks

### useAuth (`src/hooks/useAuth.ts`)

Manages authentication state and GitHub OAuth flow.

**API** (frozen - breaking changes require updating all call sites):
````typescript
interface UseAuthReturn {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}
````

**Responsibilities**:
- Initiates OAuth flow (device or web)
- Exchanges authorization code for access token
- Stores token in platform-specific storage
- Fetches and caches user profile
- Handles logout and token cleanup

### useIssues (`src/hooks/useIssues.ts`)

Manages issue fetching, filtering, and state updates.

**API** (frozen):
````typescript
interface UseIssuesReturn {
  issues: Issue[];
  currentIndex: number;
  swiperRef: React.RefObject<Swiper>;
  repoFilter: string;
  setRepoFilter: (filter: string) => void;
  refreshIssues: () => Promise<void>;
  closeIssue: (issue: Issue) => Promise<void>;
  reopenIssue: (issue: Issue) => Promise<void>;
  undo: () => void;
  isLoading: boolean;
}
````

**Responsibilities**:
- Fetches issues from GitHub API
- Filters by repository
- Tracks swipe history for undo
- Updates issue state (open/closed)
- Manages swiper ref for undo functionality

**Critical**: `swiperRef` must be passed to `SwipeContainer` as a prop. Never create a new ref inside the component.

### useAnimations (`src/hooks/useAnimations.ts`)

Provides animation states for swipe feedback.

**API** (frozen):
````typescript
interface UseAnimationsReturn {
  closeOpacity: Animated.Value;
  keepOpacity: Animated.Value;
  animateClose: () => void;
  animateKeep: () => void;
  resetAnimations: () => void;
}
````

**Responsibilities**:
- Controls swipe overlay opacity
- Animates "CLOSE" and "KEEP" stamps
- Resets animations after swipe completes

---

## Data Flow

### Authentication Flow

1. User clicks "Start GitHub login" → `useAuth.login()`
2. Hook initiates OAuth (device flow or web flow)
3. User authorizes on GitHub
4. Callback receives authorization code
5. Frontend sends code to `/api/github-token`
6. Backend exchanges code for access token
7. Backend creates session, returns session token
8. Frontend stores session token in secure storage
9. `useAuth` fetches user profile and updates state

### Issue Fetching Flow

1. User enters repository filter (optional)
2. User clicks "Refresh" → `useIssues.refreshIssues()`
3. Hook calls `github.fetchIssues()` with filter
4. API request includes `X-Session-Token` header
5. Backend validates session
6. Backend proxies request to GitHub API
7. Issues returned and stored in hook state
8. `SwipeContainer` renders cards

### Swipe Flow

1. User swipes left → `SwipeContainer.onSwipeLeft(index)`
2. Hook calls `useIssues.closeIssue(issue)`
3. API request sent to `/api/issues/:owner/:repo/:number`
4. Backend calls GitHub API to update issue state
5. Issue removed from local state
6. Next card appears

### Undo Flow

1. User clicks "Undo" or presses `u` → `useIssues.undo()`
2. Hook retrieves last action from history
3. If issue was closed, `reopenIssue()` called
4. API request updates GitHub issue state
5. Issue re-inserted into local state
6. `swiperRef.current.swipeBack()` called to animate card back

---

## Session Management

### Local Development

Sessions stored in memory (`sessionStore.js`):

````javascript
const sessions = new Map();

export function createSession(githubToken) {
  const sessionToken = uuidv4();
  sessions.set(sessionToken, {
    githubToken,
    createdAt: Date.now(),
  });
  return sessionToken;
}
````

Sessions cleared on server restart. Suitable for development only.

### Production (Cosmos DB)

Sessions stored in Azure Cosmos DB (`api/src/sessionStore.js`):

- **Container**: `sessions` in `issuecrush` database
- **Partition Key**: `/id` (session token)
- **TTL**: 24 hours (automatic cleanup)
- **Auto-creation**: Database and container created if missing

````javascript
export async function createSession(githubToken) {
  const sessionToken = uuidv4();
  const document = {
    id: sessionToken,
    githubToken,
    createdAt: Date.now(),
    ttl: 86400, // 24 hours
  };
  await container.items.create(document);
  return sessionToken;
}
````

---

## API Integration

### GitHub API Client (`src/api/github.ts`)

Thin wrapper around GitHub REST API v3:

````typescript
export async function fetchIssues(
  sessionToken: string,
  repoFilter?: string
): Promise<Issue[]>;

export async function closeIssue(
  sessionToken: string,
  owner: string,
  repo: string,
  number: number
): Promise<Issue>;

export async function reopenIssue(
  sessionToken: string,
  owner: string,
  repo: string,
  number: number
): Promise<Issue>;
````

All requests routed through backend proxy to hide GitHub token.

### Copilot Service (`src/lib/copilotService.ts`)

Frontend wrapper for AI summaries:

````typescript
export async function getAISummary(
  sessionToken: string,
  issue: {
    title: string;
    body?: string;
    labels?: string[];
    comments?: number;
  }
): Promise<string>;
````

Calls `/api/ai-summary` which uses GitHub Copilot SDK on the backend.

---

## Platform-Specific Code

### Token Storage (`src/lib/tokenStorage.ts`)

Adapts to mobile vs web:

````typescript
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export async function setToken(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}
````

**Mobile**: `expo-secure-store` uses iOS Keychain and Android Keystore (encrypted)

**Web**: `AsyncStorage` uses browser localStorage (not encrypted, but origin-isolated)

---

## Known Constraints

### React Native Deck Swiper

The `react-native-deck-swiper` library requires:

1. A ref passed from the parent component
2. The ref used to call `swipeBack()` for undo functionality

**Violation Example** (breaks undo):
````typescript
// ❌ Bad: Creating ref inside component
function SwipeContainer() {
  const swiperRef = useRef(null); // Local ref
  // ...
}
````

**Correct Usage**:
````typescript
// ✅ Good: Ref from useIssues hook
function SwipeContainer({ swiperRef }) {
  // swiperRef passed from useIssues
  return <Swiper ref={swiperRef} />;
}
````

### Copilot SDK Permission Handler

GitHub Copilot SDK v0.1.32+ requires explicit permission approval:

````javascript
import { approveAll } from '@github/copilot-sdk/web/permissions';

const session = await createSession({
  token: githubToken,
  onPermissionRequest: approveAll, // Required!
});
````

Without `onPermissionRequest`, session creation throws an error.

### vscode-jsonrpc ESM Compatibility

The `vscode-jsonrpc@8` package lacks ESM exports, causing import failures in Node 20+ ESM modules.

**Solution**: Postinstall script (`scripts/patch-vscode-jsonrpc.js`) patches the package:

````javascript
// Adds to package.json:
"exports": {
  ".": {
    "import": "./lib/node/main.js",
    "require": "./lib/node/main.js"
  }
}
````

This script runs automatically via `npm install` (see `package.json` → `postinstall`).

---

## Build and Deployment

### Type Checking

Always run before committing:

````bash
npx tsc --noEmit
````

**Do not use**:
````bash
npx tsc --noEmit  # ❌ Installs wrong global package
````

Use the local binary:
````bash
./node_modules/.bin/tsc --noEmit  # ✅ Correct
````

### Web Build

````bash
npm run build  # expo export --platform web
````

**Note**: May fail due to network restrictions blocking `cdp.expo.dev`. Use `npx tsc --noEmit` as the build validation step instead.

### Deployment

- **Trigger**: Push to `main` branch
- **Platform**: Azure Static Web Apps
- **Workflow**: `.github/workflows/azure-swa.yml`
- **Environment**: Loads secrets from Azure SWA app settings

---

## Testing Strategy

### Unit Tests

- **Jest** for business logic
- **ts-jest** for TypeScript support
- **Coverage**: Utilities, API clients, services

**Run tests**:
````bash
npm test
````

**Key test files**:
- `src/api/github.test.ts` - GitHub API client
- `src/lib/tokenStorage.test.ts` - Token storage
- `src/lib/copilotService.test.ts` - Copilot service
- `server.test.js` - Express server endpoints

### Integration Tests

Manual testing checklist:

1. ✅ OAuth login (mobile device flow)
2. ✅ OAuth login (web flow)
3. ✅ Repository filter
4. ✅ Swipe left (close issue)
5. ✅ Swipe right (keep issue)
6. ✅ Undo button
7. ✅ AI summary generation
8. ✅ Session persistence (requires Cosmos DB)

---

## Extension Points

### Adding New Components

1. Create component in `src/components/`
2. Export from `src/components/index.ts`
3. Components should be functional with props/callbacks
4. No direct API calls - use hooks instead

### Adding New Hooks

1. Create hook in `src/hooks/`
2. Export from `src/hooks/index.ts`
3. Hooks should encapsulate state + side effects
4. Return stable API (breaking changes require migration)

### Adding New API Endpoints

1. Add route to `server.js` (local dev)
2. Add Azure Function to `api/src/app.js` (production)
3. Update `docs/API.md` with endpoint documentation
4. Ensure both implementations expose identical API contract

---

## Performance Considerations

### Issue Fetching

- Default: 30 issues per request (configurable via `per_page`)
- GitHub API rate limit: 5,000 requests/hour per user
- Caching: Not implemented (future enhancement)

### Animation Performance

- Uses `Animated.Value` from React Native for 60 FPS animations
- Swipe gestures handled by `react-native-deck-swiper` native module
- Minimal re-renders via `React.memo` on `IssueCard`

### Session Storage

- In-memory: O(1) lookup, limited by RAM
- Cosmos DB: ~10ms latency, automatic scaling

---

## Security

### Token Flow

1. GitHub OAuth token never sent to frontend
2. Session token (UUIDv4) acts as proxy
3. Backend validates session before proxying GitHub API calls

### CORS Configuration

Production: Azure SWA handles CORS automatically

Local Development:
````javascript
app.use(cors({
  origin: 'http://localhost:8081',
  credentials: true,
}));
````

### Environment Variables

Sensitive values never committed to version control:

- `GITHUB_CLIENT_SECRET` - Backend only
- `COSMOS_KEY` - Backend only
- `GH_TOKEN` / `COPILOT_PAT` - Backend only for AI summaries

---

## Troubleshooting

### Blank Screen on Web

**Cause**: Navigating directly to `http://localhost:8081` shows JSON manifest (Metro bundler endpoint)

**Solution**: Use `npm run web-dev` which opens correct web URL

### Undo Not Working

**Cause**: `swiperRef` not passed correctly from `useIssues` to `SwipeContainer`

**Solution**: Verify ref is passed as prop, not recreated in component

### AI Summaries Fail

**Cause**: Missing `GH_TOKEN` or `COPILOT_PAT` environment variable

**Solution**: Set environment variable with Copilot-enabled GitHub token

### Session Expired After Server Restart

**Cause**: Using in-memory session storage (local development)

**Solution**: Configure Cosmos DB for persistent sessions, or re-login after restart

---

## Further Reading

- [React Native Docs](https://reactnative.dev/docs)
- [Expo SDK 54 Docs](https://docs.expo.dev)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [react-native-deck-swiper](https://github.com/alexbrillant/react-native-deck-swiper)
- [Azure Cosmos DB NoSQL](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/)
