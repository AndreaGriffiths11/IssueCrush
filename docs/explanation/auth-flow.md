# Authentication Flow

Understanding how IssueCrush handles GitHub OAuth authentication and session management.

## Overview

IssueCrush uses GitHub OAuth 2.0 for authentication with a session-based architecture. The flow differs between mobile and web platforms but follows the same security principles.

## Core Principle: Server-Side Token Exchange

````
┌──────────────────────────────────────────────────────┐
│  Critical Security Decision                          │
│                                                      │
│  GitHub access tokens are NEVER exposed to the      │
│  frontend. The server exchanges OAuth codes for     │
│  tokens and stores them server-side, returning      │
│  only a session ID to the client.                   │
└──────────────────────────────────────────────────────┘
````

**Why?**
- GitHub tokens have powerful permissions (close issues, push code, etc.)
- Storing tokens client-side risks exposure through XSS or local storage access
- Session IDs are single-purpose, scoped credentials that can be revoked instantly

---

## Web OAuth Flow

Used on desktop/laptop browsers.

### Step-by-Step

**1. User clicks "Start GitHub login"**
````typescript
// useAuth.ts
const startAuth = async () => {
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${CLIENT_ID}&scope=${SCOPE}&redirect_uri=${REDIRECT_URI}`;
  
  await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
};
````

**2. Browser redirects to GitHub**
````
https://github.com/login/oauth/authorize
  ?client_id=Ov23liAbC123XyZ
  &scope=repo
  &redirect_uri=http://localhost:8081
````

User sees GitHub's authorization screen.

**3. User authorizes → GitHub redirects back**
````
http://localhost:8081?code=abc123def456
````

**4. Client extracts code from URL**
````typescript
useEffect(() => {
  const url = window.location.href;
  if (url.includes('?code=')) {
    const code = new URL(url).searchParams.get('code');
    exchangeCodeForToken(code);
  }
}, []);
````

**5. Client sends code to server**
````typescript
// useAuth.ts
const exchangeCodeForToken = async (code: string) => {
  const response = await fetch(`${API_URL}/api/github-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  
  const data = await response.json();
  await saveToken(data.session_id); // Store session ID securely
  setToken(data.session_id);
};
````

**6. Server exchanges code for GitHub token**
````javascript
// api/src/app.js
app.http('githubToken', {
  handler: async (request) => {
    const { code } = await request.json();
    
    // Exchange with GitHub
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      body: JSON.stringify({
        client_id: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    
    const { access_token } = await response.json();
    
    // Store token server-side, return session ID
    const sessionId = await createSession(access_token);
    return { jsonBody: { session_id: sessionId } };
  }
});
````

**7. Client stores session ID**
````typescript
// lib/tokenStorage.ts (web)
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveToken(sessionId: string) {
  await AsyncStorage.setItem('github_session', sessionId);
}
````

---

## Mobile OAuth Flow (Device Flow)

Used on iOS/Android where redirect-based flow is problematic.

### Step-by-Step

**1. User clicks "Start GitHub login"**
````typescript
// useAuth.ts
const startAuth = async () => {
  // Request device code
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      scope: SCOPE
    })
  });
  
  const { device_code, user_code, verification_uri } = await response.json();
  
  // Show user_code to user
  Alert.alert(
    'GitHub Login',
    `Go to ${verification_uri} and enter code: ${user_code}`,
    [{ text: 'Open GitHub', onPress: () => openBrowser(verification_uri) }]
  );
  
  // Poll for authorization
  pollForAuthorization(device_code);
};
````

**2. User visits GitHub on any device**
````
https://github.com/login/device
Enter code: ABCD-1234
````

**3. App polls GitHub for authorization**
````typescript
const pollForAuthorization = async (deviceCode: string) => {
  const interval = setInterval(async () => {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      clearInterval(interval);
      // Send to server for session creation
      exchangeCodeForToken(data.access_token);
    }
  }, 5000); // Poll every 5 seconds
};
````

**4. Server creates session (same as web flow)**

**5. Client stores session ID in secure store**
````typescript
// lib/tokenStorage.ts (mobile)
import * as SecureStore from 'expo-secure-store';

export async function saveToken(sessionId: string) {
  await SecureStore.setItemAsync('github_session', sessionId);
}
````

---

## Session Storage

### Server-Side Session Store

````javascript
// api/src/sessionStore.js
import { CosmosClient } from '@azure/cosmos';

const sessions = new Map(); // In-memory fallback

export async function createSession(githubToken) {
  const sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    token: githubToken,
    createdAt: new Date().toISOString(),
    ttl: 86400 // 24 hours
  };
  
  if (cosmosClient) {
    // Store in Cosmos DB
    await container.items.create(session);
  } else {
    // Fallback to in-memory
    sessions.set(sessionId, session);
  }
  
  return sessionId;
}

export async function resolveSession(request) {
  const sessionId = request.headers.get('x-session-token');
  
  if (cosmosClient) {
    const { resource } = await container.item(sessionId, sessionId).read();
    return resource;
  } else {
    return sessions.get(sessionId);
  }
}
````

**Session Properties:**
- `id` - Random UUID (session identifier)
- `token` - GitHub OAuth access token
- `createdAt` - ISO timestamp
- `ttl` - Time to live (24 hours = 86400 seconds)

**Storage Backends:**
- **Development:** In-memory Map (lost on restart)
- **Production:** Azure Cosmos DB with automatic TTL expiry

---

## Making Authenticated Requests

### Client → Server

All API requests include session ID in custom header:

````typescript
// src/api/github.ts
export async function fetchIssues(sessionToken: string) {
  const response = await fetch(`${API_URL}/api/issues`, {
    headers: {
      'X-Session-Token': sessionToken
    }
  });
  
  return response.json();
}
````

**Why `X-Session-Token` instead of `Authorization`?**

Azure Static Web Apps intercepts the `Authorization` header for its own authentication. Using a custom header avoids conflicts.

---

### Server → GitHub

Server exchanges session ID for GitHub token:

````javascript
// api/src/app.js
app.http('issues', {
  handler: async (request) => {
    const session = await resolveSession(request);
    if (!session) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } };
    }
    
    // Use GitHub token for API call
    const response = await fetch('https://api.github.com/issues', {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    
    return { jsonBody: await response.json() };
  }
});
````

---

## Logout Flow

**1. User clicks "Sign Out"**
````typescript
// useAuth.ts
const logout = async () => {
  const sessionId = await getToken();
  
  // Destroy server-side session
  await fetch(`${API_URL}/api/logout`, {
    method: 'POST',
    headers: { 'X-Session-Token': sessionId }
  });
  
  // Clear client-side storage
  await deleteToken();
  setToken(null);
};
````

**2. Server deletes session**
````javascript
// api/src/app.js
app.http('logout', {
  handler: async (request) => {
    const session = await resolveSession(request);
    if (session) {
      await destroySession(session.id);
    }
    return { jsonBody: { ok: true } };
  }
});
````

---

## Security Considerations

### Token Storage

| Platform | Storage | Encryption | Access Control |
|----------|---------|------------|----------------|
| iOS | Keychain (SecureStore) | ✅ Yes | Biometric/PIN protected |
| Android | EncryptedSharedPreferences | ✅ Yes | Hardware-backed |
| Web | localStorage (AsyncStorage) | ❌ No | Browser sandbox only |

**Web Mitigation:**
- HTTPS enforced (Azure SWA auto-configures)
- Session IDs are single-purpose (can't be used directly with GitHub)
- 24-hour expiry limits exposure window
- HttpOnly cookies not used (breaks React Native compatibility)

---

### Token Scopes

````bash
EXPO_PUBLIC_GITHUB_SCOPE=repo
````

**Includes:**
- Read/write access to code
- Read/write access to issues and pull requests
- Close/reopen issues

**Does NOT include:**
- Admin permissions
- Organization access (unless granted)
- Actions/secrets access

**Why `repo` instead of `public_repo`?**

`public_repo` scope only allows access to public repositories. IssueCrush needs `repo` to close issues in private repositories.

---

### Session Expiry

````javascript
// api/src/sessionStore.js
{
  id: "abc123",
  token: "gho_...",
  ttl: 86400 // 24 hours
}
````

Cosmos DB automatically deletes expired sessions via TTL. In-memory sessions are garbage collected when the server restarts.

**User Experience:**
- After 24 hours, user must re-authenticate
- No refresh token mechanism (by design)
- Clear error message: "Session expired. Please sign in again."

---

## Platform Differences Summary

| Aspect | Web | Mobile |
|--------|-----|--------|
| OAuth Flow | Web flow (redirect) | Device flow (poll) |
| Token Storage | localStorage | Keychain/KeyStore |
| Encryption | No | Yes |
| Auth UI | Browser redirect | In-app browser + code entry |

---

## Debugging

### Check Session Status

````bash
# Get session ID from client storage
# iOS/Android: Check SecureStore
# Web: Check localStorage key 'github_session'

# Verify session on server
curl -H "X-Session-Token: abc123" \
  https://your-app.azurestaticapps.net/api/health
````

### Common Issues

**"Unauthorized" errors**
- Session expired (> 24 hours old)
- Session ID incorrect or not sent
- Server session store unavailable

**"Bad verification code" errors**
- OAuth code already used (can only be exchanged once)
- Code expired (10-minute window)
- Client ID/secret mismatch

---

## See Also

- [API Reference](../reference/api.md)
- [Environment Variables](../reference/environment-variables.md)
- [Architecture Reference](../reference/architecture.md)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
