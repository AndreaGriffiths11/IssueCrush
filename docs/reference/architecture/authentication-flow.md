# Authentication Flow

Detailed documentation of the OAuth and session management flow in IssueCrush.

## Overview

IssueCrush uses GitHub OAuth with a server-side token exchange pattern to keep client secrets secure.

## Flow Diagram

````
┌──────┐         ┌────────┐         ┌─────────┐         ┌────────────┐
│Client│         │Backend │         │ GitHub  │         │ Cosmos DB  │
└──┬───┘         └───┬────┘         └────┬────┘         └─────┬──────┘
   │                 │                   │                     │
   │ 1. Start Login  │                   │                     │
   ├────────────────>│                   │                     │
   │                 │                   │                     │
   │ 2. Redirect to GitHub OAuth         │                     │
   ├────────────────────────────────────>│                     │
   │                 │                   │                     │
   │ 3. User Authorizes                  │                     │
   │<────────────────────────────────────┤                     │
   │                 │                   │                     │
   │ 4. Callback with code               │                     │
   ├────────────────>│                   │                     │
   │                 │                   │                     │
   │                 │ 5. Exchange code for token              │
   │                 ├──────────────────>│                     │
   │                 │                   │                     │
   │                 │ 6. GitHub token   │                     │
   │                 │<──────────────────┤                     │
   │                 │                   │                     │
   │                 │ 7. Create session │                     │
   │                 ├──────────────────────────────────────>│
   │                 │                   │                     │
   │ 8. Return session_id                │                     │
   │<────────────────┤                   │                     │
````

## Detailed Steps

### 1. Client Initiates Login

Web:
````typescript
window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo`;
````

Mobile:
````typescript
const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
````

### 2-3. GitHub OAuth

User is redirected to GitHub, authorizes the app, and GitHub redirects back with authorization code.

### 4. Code Exchange

Client sends code to backend:
````typescript
POST /api/github-token
{
  "code": "authorization_code"
}
````

### 5-6. Backend Token Exchange

Backend exchanges code for GitHub token (client secret never exposed to client):
````typescript
const response = await fetch('https://github.com/login/oauth/access_token', {
  method: 'POST',
  body: JSON.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,  // Server-side only!
    code,
  }),
});
````

### 7. Session Creation

Backend stores GitHub token in Cosmos DB with 24-hour TTL:
````typescript
await createSession({
  id: sessionId,
  githubToken,
  createdAt: new Date().toISOString(),
  ttl: 86400,  // 24 hours
});
````

### 8. Return Session ID

Backend returns opaque session ID to client (not the GitHub token).

## Session Lifecycle

- **Creation:** On successful OAuth
- **Duration:** 24 hours (configurable TTL)
- **Storage:** Client stores session ID, server stores GitHub token
- **Renewal:** User must re-authenticate after expiration
- **Deletion:** On logout or after TTL

## Security Considerations

- Client secret never leaves server
- Session ID is opaque (no token data)
- GitHub token stored server-side only
- 24-hour TTL limits exposure
- HTTPS required in production

## Related Documentation

- [Session Management](./session-management.md)
- [Architecture Overview](./overview.md)
- [Hooks API Reference](../api/hooks.md)
