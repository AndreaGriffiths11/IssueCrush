# Data Flow

This document illustrates how data flows through IssueCrush for common operations.

## Overview

IssueCrush uses a **unidirectional data flow** pattern:

1. User actions trigger events
2. Hooks handle business logic and API calls
3. State updates flow down to components via props
4. Components re-render with new data

## Authentication Data Flow

````
┌─────────────┐
│    User     │
│ Clicks "Login" │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────┐
│  useAuth().startLogin()                │
│  - Web: window.location.href = GitHub │
│  - Mobile: WebBrowser.openAuthSession  │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  GitHub OAuth Page                     │
│  User authorizes app                   │
└──────┬─────────────────────────────────┘
       │
       ▼ (callback with code)
┌────────────────────────────────────────┐
│  useAuth().exchangeCodeForToken(code)  │
│  POST /api/github-token                │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Backend: server.js or app.js          │
│  1. Exchange code for GitHub token     │
│  2. Create session in Cosmos DB        │
│  3. Return session ID                  │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Frontend:                             │
│  1. saveToken(sessionId)               │
│     - Web: AsyncStorage                │
│     - Mobile: SecureStore              │
│  2. setToken(sessionId)                │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  App re-renders                        │
│  - token !== null                      │
│  - Shows main UI instead of AuthScreen │
└────────────────────────────────────────┘
````

## Issue Loading Data Flow

````
┌─────────────┐
│    User     │
│ Enters repo │
│ Clicks "Refresh" │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────┐
│  useIssues().loadIssues()              │
│  - setLoadingIssues(true)              │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  fetchIssues(token, repoFilter, ...)   │
│  GET /api/issues?repo=owner/repo       │
│  Headers: { X-Session-Token: ... }     │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Backend:                              │
│  1. resolveSession(x-session-token)    │
│  2. Read GitHub token from Cosmos DB   │
│  3. Call GitHub API:                   │
│     GET /user/issues?state=open&...    │
│  4. Return issue array                 │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Frontend:                             │
│  1. setIssues(data)                    │
│  2. setCurrentIndex(0)                 │
│  3. setFeedback("Loaded X issues")     │
│  4. setLoadingIssues(false)            │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Components re-render:                 │
│  - SwipeContainer shows issue cards    │
│  - Sidebar shows progress (0/X)        │
└────────────────────────────────────────┘
````

## Swipe Left (Close Issue) Data Flow

````
┌─────────────┐
│    User     │
│ Swipes left │
│ or clicks Close │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────┐
│  useIssues().handleSwipeLeft(index)    │
│  1. Haptics.impactAsync(Heavy)         │
│  2. setFeedback("Closed #123")         │
│  3. setLastClosed(issue)               │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  updateIssueState(token, issue, 'closed') │
│  PATCH /api/issues/owner/repo/123      │
│  Body: { state: "closed" }             │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Backend:                              │
│  1. resolveSession(x-session-token)    │
│  2. Read GitHub token from Cosmos DB   │
│  3. Call GitHub API:                   │
│     PATCH /repos/owner/repo/issues/123 │
│     Body: { state: "closed" }          │
│  4. Return updated issue               │
└──────┬─────────────────────────────────┘
       │
       ▼ (success)
┌────────────────────────────────────────┐
│  Frontend:                             │
│  - Issue closed on GitHub              │
│  - lastClosed stores issue for undo    │
│  - Toast shows "Closed #123"           │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  useIssues().onSwiped(index)           │
│  1. setCurrentIndex(index + 1)         │
│  2. setLoadingAiSummary(false)         │
│  3. If last card: confetti.start()     │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Components re-render:                 │
│  - Next card appears                   │
│  - Progress bar updates                │
│  - Undo button enabled                 │
└────────────────────────────────────────┘
````

## Undo Data Flow

````
┌─────────────┐
│    User     │
│ Clicks Undo │
│ or presses Z │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────┐
│  useIssues().handleUndo()              │
│  1. setUndoBusy(true)                  │
│  2. swiperRef.current.swipeBack()      │
│  3. setCurrentIndex(prev - 1)          │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  updateIssueState(token, lastClosed, 'open') │
│  PATCH /api/issues/owner/repo/123      │
│  Body: { state: "open" }               │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Backend:                              │
│  1. resolveSession(x-session-token)    │
│  2. Call GitHub API to reopen issue    │
│  3. Return updated issue               │
└──────┬─────────────────────────────────┘
       │
       ▼ (success)
┌────────────────────────────────────────┐
│  Frontend:                             │
│  1. Haptics.notificationAsync(Success) │
│  2. setFeedback("Reopened #123")       │
│  3. setLastClosed(null)                │
│  4. setUndoBusy(false)                 │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Components re-render:                 │
│  - Card animates back into view        │
│  - Undo button disabled                │
│  - Progress bar decrements             │
└────────────────────────────────────────┘
````

## AI Summary Data Flow

````
┌─────────────┐
│    User     │
│ Clicks "Get │
│ AI Summary" │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────┐
│  useIssues().handleGetAiSummary()      │
│  1. setLoadingAiSummary(true)          │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  copilotService.summarizeIssue(issue)  │
│  1. getToken() from storage            │
│  2. POST /api/ai-summary               │
│     Headers: { X-Session-Token }       │
│     Body: { issue }                    │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Backend:                              │
│  1. resolveSession(x-session-token)    │
│  2. Extract issue title & body         │
│  3. Call Copilot SDK:                  │
│     createSession()                    │
│     generateResponse(prompt)           │
│  4. Return { summary: "..." }          │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Frontend:                             │
│  1. setIssues(prevIssues =>            │
│      prevIssues.map((item, idx) =>     │
│        idx === currentIndex            │
│          ? { ...item, aiSummary }      │
│          : item                        │
│      )                                 │
│    )                                   │
│  2. setLoadingAiSummary(false)         │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  IssueCard re-renders:                 │
│  - AI block shows summary text         │
│  - Button disappears                   │
│  - Scrollable summary content          │
└────────────────────────────────────────┘
````

## State Management

### Hook State

Each hook manages its own state:

#### useAuth
- `token` - Current session ID
- `authError` - Error message
- `copilotAvailable` - AI availability flag

#### useIssues
- `issues` - Array of GitHubIssue objects
- `loadingIssues` - Loading state for issue fetch
- `loadingAiSummary` - Loading state for AI summary
- `currentIndex` - Index of current card
- `lastClosed` - Issue for undo functionality
- `undoBusy` - Undo in progress flag
- `feedback` - Toast message
- `repoFilter` - Repository filter string
- `labelFilter` - Label filter string

#### useAnimations
- `showCrumble` - Crumble animation state
- Shared values for animations (toast, progress, buttons)

### Props Flow

````
App.tsx
  ├─ useAuth() → { token, startLogin, signOut, ... }
  ├─ useIssues(token) → { issues, loadIssues, handleSwipeLeft, ... }
  ├─ useAnimations(...) → { toastAnimatedStyle, progressAnimatedStyle, ... }
  │
  ├─ If not authenticated:
  │   └─ <AuthScreen onLogin={startLogin} authError={authError} />
  │
  └─ If authenticated:
      ├─ <Sidebar
      │    repoFilter={repoFilter}
      │    onRefresh={loadIssues}
      │    onSwipeLeft={() => swiperRef.current?.swipeLeft()}
      │    ...
      │  />
      │
      └─ <SwipeContainer
           issues={issues}
           swiperRef={swiperRef}
           onSwipeLeft={handleSwipeLeft}
           onSwipeRight={handleSwipeRight}
           ...
         />
````

All state flows **down** as props. User actions trigger callbacks that update state in hooks, causing re-renders.

## Error Handling Flow

````
┌─────────────────────────────────────┐
│  API Call (e.g., fetchIssues)      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend returns error              │
│  - 401: Unauthorized                │
│  - 404: Not Found                   │
│  - 500: Server Error                │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend catch block               │
│  - Extract error message            │
│  - setFeedback(errorMessage)        │
│  - Haptics.notificationAsync(Error) │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Toast notification shows error     │
│  - Auto-dismisses after 2.2s        │
└─────────────────────────────────────┘
````

### Special Cases

- **401 Unauthorized**: "Session expired. Please sign in again."
- **404 Not Found**: "Repository not found or you lack access."
- **Network Error**: "Failed to connect to auth server: [message]"

## Session Expiration Flow

````
┌─────────────────────────────────────┐
│  Session created in Cosmos DB       │
│  TTL: 24 hours                      │
└──────┬──────────────────────────────┘
       │
       ▼ (24 hours later)
┌─────────────────────────────────────┐
│  Cosmos DB auto-deletes session     │
└──────┬──────────────────────────────┘
       │
       ▼ (user makes API request)
┌─────────────────────────────────────┐
│  Backend: resolveSession()          │
│  - Session not found in DB          │
│  - Returns 401 Unauthorized         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend receives 401              │
│  - Shows: "Session expired"         │
│  - User must sign in again          │
└─────────────────────────────────────┘
````

## See Also

- [System Overview](./overview.md)
- [Hooks API](../api/hooks.md)
- [Component Development Guide](../guides/component-development.md)
