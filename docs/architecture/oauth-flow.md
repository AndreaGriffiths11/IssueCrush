# OAuth Flow Architecture

This document explains the GitHub OAuth authentication flow in IssueCrush.

## Overview

IssueCrush uses **GitHub OAuth 2.0** with different flows for different platforms:
- **Web:** Authorization code flow with redirect
- **Mobile:** Authorization code flow with in-app browser

The client secret is never exposed to the frontend. Token exchange happens server-side.

---

## Architecture Diagram

````
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│             │                  │             │                  │             │
│   Client    │                  │   Backend   │                  │   GitHub    │
│  (Frontend) │                  │  (Azure     │                  │    OAuth    │
│             │                  │  Functions) │                  │             │
└─────────────┘                  └─────────────┘                  └─────────────┘
      │                                │                                │
      │ 1. Start OAuth                 │                                │
      │────────────────────────────────┼───────────────────────────────>│
      │    Redirect to GitHub          │                                │
      │    with client_id + scope      │                                │
      │                                │                                │
      │ 2. User authorizes app         │                                │
      │<───────────────────────────────┼────────────────────────────────│
      │    GitHub redirects back       │                                │
      │    with authorization code     │                                │
      │                                │                                │
      │ 3. POST /api/github-token      │                                │
      │    { code: "abc123" }          │                                │
      │───────────────────────────────>│                                │
      │                                │ 4. Exchange code for token     │
      │                                │    with client_secret          │
      │                                │───────────────────────────────>│
      │                                │                                │
      │                                │ 5. access_token response       │
      │                                │<───────────────────────────────│
      │                                │                                │
      │                                │ 6. Create session in Cosmos DB │
      │                                │    Store: sessionId → token    │
      │                                │                                │
      │ 7. Return session_id           │                                │
      │<───────────────────────────────│                                │
      │                                │                                │
      │ 8. Store session_id locally    │                                │
      │    (SecureStore / AsyncStorage)│                                │
      │                                │                                │
      │ 9. API requests with           │                                │
      │    X-Session-Token header      │                                │
      │───────────────────────────────>│                                │
      │                                │ 10. Resolve session            │
      │                                │     Look up GitHub token       │
      │                                │                                │
      │                                │ 11. Make GitHub API call       │
      │                                │     with user's token          │
      │                                │───────────────────────────────>│
      │                                │                                │
      │ 12. API response               │                                │
      │<───────────────────────────────│                                │
````

---

## Detailed Flow

### 1. Web Platform Flow

**Implementation:** `src/hooks/useAuth.ts`

#### Step 1: Initiate OAuth

Client constructs GitHub authorization URL:

````typescript
const authUrl = `https://github.com/login/oauth/authorize?` +
  `client_id=${CLIENT_ID}` +
  `&scope=${encodeURIComponent('repo')}` +
  `&redirect_uri=${encodeURIComponent(window.location.origin)}`;

window.location.href = authUrl;
````

**Key Parameters:**
- `client_id` - GitHub OAuth app client ID (public)
- `scope` - `repo` (required to close issues)
- `redirect_uri` - Your app's URL (must match OAuth app settings)

#### Step 2: User Authorizes

User is redirected to GitHub where they:
1. Review the requested permissions
2. Click "Authorize"
3. Get redirected back to your app

#### Step 3: Handle Callback

GitHub redirects back with authorization code:

````
https://your-app.com/?code=abc123def456
````

Client detects the `code` parameter and sends it to the backend:

````typescript
const response = await fetch(`${API_URL}/api/github-token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code })
});

const { session_id } = await response.json();
````

#### Step 4: Backend Token Exchange

**Implementation:** `api/src/app.js` - `githubToken` function

Backend exchanges code for access token:

````javascript
const response = await fetch('https://github.com/login/oauth/access_token', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    client_id: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,  // Never exposed to client!
    code
  })
});

const { access_token } = await response.json();
````

**Security:** Client secret is only used server-side.

#### Step 5: Create Session

Backend creates a session in Cosmos DB:

````javascript
const sessionId = await createSession(access_token);
// Returns opaque session ID, NOT the GitHub token
````

#### Step 6: Store Session ID

Client stores session ID securely:

````typescript
// Web: AsyncStorage
await AsyncStorage.setItem('issuecrush-session-id', session_id);

// Mobile: Expo SecureStore
await SecureStore.setItemAsync('issuecrush-session-id', session_id);
````

---

### 2. Mobile Platform Flow

**Implementation:** `src/hooks/useAuth.ts`

Mobile uses `expo-web-browser` to open an in-app browser:

````typescript
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'issuecrush',
  preferLocalhost: false
});

const authUrl = `https://github.com/login/oauth/authorize?` +
  `client_id=${CLIENT_ID}` +
  `&scope=${encodeURIComponent('repo')}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}`;

const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

if (result.type === 'success' && result.url) {
  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  
  // Exchange code for session (same as web)
  await exchangeCodeForToken(code);
}
````

**Key Differences:**
- Uses custom URL scheme: `issuecrush://`
- In-app browser closes automatically after authorization
- Code is extracted from the returned URL

---

## Session Management

### Session Structure

````typescript
{
  id: string;           // UUID v4
  sessionId: string;    // Same as id (partition key)
  githubToken: string;  // User's GitHub OAuth token
  createdAt: number;    // Unix timestamp
  ttl: number;          // Time-to-live in seconds (24 hours)
}
````

### Session Storage

**Production:** Azure Cosmos DB NoSQL
- Container: `sessions`
- Partition key: `/id`
- TTL: 24 hours (automatic cleanup)

**Development:** In-memory Map
- Falls back if Cosmos DB credentials not configured
- Lost on server restart

### Session Resolution

Every authenticated API request:

````javascript
async function resolveSession(request) {
  // 1. Get session ID from header
  const sessionId = request.headers.get('x-session-token') || 
                    request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!sessionId) return null;
  
  // 2. Look up session in Cosmos DB
  const session = await getSession(sessionId);
  
  // 3. Return session with GitHub token
  return session;  // { sessionId, githubToken, createdAt }
}
````

**Headers:**
- Primary: `X-Session-Token: <session_id>`
- Fallback: `Authorization: Bearer <session_id>`

> **Why X-Session-Token?** Azure Static Web Apps intercepts the `Authorization` header for its own authentication.

---

## Security Considerations

### What's Stored Where

| Data | Frontend | Backend |
|------|----------|---------|
| Client ID | ✅ Public env var | ✅ Public env var |
| Client Secret | ❌ Never | ✅ Secret env var |
| Authorization Code | ⏱️ Temporary | ⏱️ Used once |
| GitHub Access Token | ❌ Never | ✅ Cosmos DB |
| Session ID | ✅ Secure storage | ✅ Cosmos DB |

### Token Isolation

````
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │         │   Backend    │         │  Cosmos DB   │
│              │         │              │         │              │
│  Session ID  │────────>│  Session ID  │────────>│  GitHub      │
│  (opaque)    │         │    ↓         │         │  Token       │
│              │         │  Resolve     │         │              │
│              │         │    ↓         │         │              │
│              │<────────│  API Call    │         │              │
│              │         │  with Token  │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
````

**Benefits:**
- Frontend compromise doesn't leak GitHub tokens
- Session IDs can be revoked without changing GitHub tokens
- Backend controls all GitHub API access

### Scope Requirements

**Required Scope:** `repo`

**Why not `public_repo`?**
- `public_repo` only allows read access to public repositories
- **Closing issues** requires write access
- `repo` scope grants full repository access (required for issue state changes)

**Requesting Scope:**

````javascript
// .env
EXPO_PUBLIC_GITHUB_SCOPE=repo
````

**Changing Scope:**

If you change the scope, users must sign out and sign in again to get a new token with the updated permissions.

---

## Error Handling

### Common OAuth Errors

**`bad_verification_code`**
- **Cause:** Authorization code expired or already used
- **Solution:** Start login flow again

**`incorrect_client_credentials`**
- **Cause:** Invalid client ID or secret
- **Solution:** Check GitHub OAuth app settings

**`redirect_uri_mismatch`**
- **Cause:** Redirect URI doesn't match OAuth app settings
- **Solution:** Update OAuth app callback URL

**`access_denied`**
- **Cause:** User declined authorization
- **Solution:** User must authorize to use the app

### Session Errors

**`Session expired or invalid`**
- **Cause:** Session not found in Cosmos DB (TTL expired or invalid ID)
- **Solution:** Sign out and sign in again

**Implementation:**

````typescript
try {
  const issues = await fetchIssues(sessionId);
} catch (error) {
  if (error.message.includes('Session expired')) {
    await signOut();  // Clear local session and redirect to login
  }
}
````

---

## OAuth App Configuration

### GitHub OAuth App Settings

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in details:

**For Local Development:**
````
Application name: IssueCrush (Dev)
Homepage URL: http://localhost:8081
Authorization callback URL: http://localhost:8081
````

**For Production (Azure Static Web Apps):**
````
Application name: IssueCrush
Homepage URL: https://your-app.azurestaticapps.net
Authorization callback URL: https://your-app.azurestaticapps.net
````

**For Mobile:**

Add additional callback URL:
````
issuecrush://
````

### Environment Variables

**Frontend (.env):**
````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_oauth_client_id
EXPO_PUBLIC_GITHUB_SCOPE=repo
````

**Backend (Azure SWA App Settings or .env):**
````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
````

---

## Flow Sequence

### Successful Authentication

````
1. User clicks "Sign In"
2. → Redirect to github.com/login/oauth/authorize
3. User authorizes
4. → Redirect back with ?code=...
5. POST /api/github-token with code
6. ← Receive session_id
7. Store session_id in SecureStore
8. Set token state → App shows authenticated UI
````

### Authenticated API Request

````
1. User action (e.g., fetch issues)
2. Read session_id from SecureStore
3. POST /api/issues with X-Session-Token: session_id
4. Backend resolves session → GitHub token
5. Backend calls GitHub API with token
6. ← Backend returns GitHub API response
7. App displays data
````

### Sign Out

````
1. User clicks "Sign Out"
2. POST /api/logout with X-Session-Token
3. Backend destroys session in Cosmos DB
4. Delete session_id from SecureStore
5. Clear token state → App shows login screen
````

---

## Testing OAuth Locally

### 1. Start the Backend Server

````bash
npm run server
# Server starts on http://localhost:3000
````

### 2. Configure OAuth App

Ensure your GitHub OAuth app has `http://localhost:8081` as a callback URL.

### 3. Set Environment Variables

````bash
cp .env.example .env
# Edit .env with your GitHub OAuth credentials
````

### 4. Start the Frontend

**Web:**
````bash
npm run web-dev
# Opens http://localhost:8081 in browser
````

**Mobile:**
````bash
npm run dev
# Scan QR code with Expo Go
````

### 5. Test the Flow

1. Click "Start GitHub login"
2. Authorize on GitHub
3. Check that you're redirected back and authenticated
4. Try fetching issues
5. Try closing an issue (requires `repo` scope)

---

## See Also

- [Backend API Reference](../api/backend-api.md) - API endpoint details
- [Session Storage Guide](./session-storage.md) - Cosmos DB session management
- [Deployment Guide](../guides/azure-deployment.md) - Production setup
