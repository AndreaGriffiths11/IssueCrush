# IssueCrush API Documentation

This document describes the API endpoints provided by the IssueCrush backend server for OAuth authentication, issue management, and AI-powered summaries.

## Overview

IssueCrush provides two backend implementations:

1. **Express Server** (`server.js`) - For local development
2. **Azure Functions** (`api/src/app.js`) - For Azure Static Web Apps deployment

Both implementations provide identical API contracts with consistent error handling.

## Base URLs

- **Local Development**: `http://localhost:3000`
- **Azure Production**: `https://gray-water-08b04e810.6.azurestaticapps.net/api`

## Authentication

All API endpoints (except OAuth and health check) require a session token obtained through the OAuth flow. The session token must be included in the `X-Session-Token` header.

````http
X-Session-Token: <session_id>
````

## Error Handling

All endpoints return consistent error responses with appropriate HTTP status codes:

````json
{
  "error": "Error message",
  "error_description": "Detailed description (OAuth errors only)"
}
````

### Common Status Codes

- `200` - Success
- `400` - Bad Request (missing parameters, invalid data)
- `401` - Unauthorized (session expired or invalid)
- `403` - Forbidden (insufficient permissions, e.g., Copilot access required)
- `404` - Not Found (repository not found or inaccessible)
- `500` - Internal Server Error

## Endpoints

### Health Check

Check server status and feature availability.

````http
GET /api/health
````

**Response**

````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

---

### OAuth Callback

Handles GitHub OAuth redirects and relays the authorization code to the frontend.

````http
GET /callback?code={code}&state={state}
````

**Query Parameters**

- `code` (string, optional) - GitHub authorization code
- `state` (string, optional) - OAuth state parameter for CSRF protection
- `error` (string, optional) - OAuth error code

**Behavior**

Redirects to the frontend URL (default: `http://localhost:8081`) with query parameters preserved.

**Example Redirect**

````
http://localhost:8081?code=abc123&state=xyz789
````

---

### Token Exchange

Exchanges a GitHub authorization code for a session token.

````http
POST /api/github-token
Content-Type: application/json
````

**Request Body**

````json
{
  "code": "github_authorization_code"
}
````

**Success Response** (`200`)

````json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
````

**Error Responses**

- `400` - Missing or invalid authorization code
- `500` - Missing GitHub credentials or OAuth exchange failed

**Notes**

- The GitHub access token is stored server-side and associated with the returned session ID
- Session tokens are stored in Azure Cosmos DB (production) or in-memory (development)
- Sessions have a 24-hour TTL (Time To Live)

---

### Logout

Destroys the current session and invalidates the session token.

````http
POST /api/logout
X-Session-Token: <session_id>
````

**Success Response** (`200`)

````json
{
  "ok": true
}
````

**Notes**

- Always returns success even if the session doesn't exist
- After logout, the session token is no longer valid

---

### Fetch Issues

Retrieves GitHub issues for the authenticated user.

````http
GET /api/issues?repo={owner/repo}&labels={label1,label2}
X-Session-Token: <session_id>
````

**Query Parameters**

- `repo` (string, optional) - Filter by specific repository (format: `owner/repo`)
- `labels` (string, optional) - Comma-separated list of labels to filter by

**Success Response** (`200`)

````json
[
  {
    "id": 123456789,
    "number": 42,
    "title": "Bug: App crashes on startup",
    "body": "Description of the issue...",
    "state": "open",
    "created_at": "2026-03-10T12:00:00Z",
    "updated_at": "2026-03-11T08:30:00Z",
    "html_url": "https://github.com/owner/repo/issues/42",
    "user": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/u/123456"
    },
    "labels": [
      {
        "name": "bug",
        "color": "d73a4a"
      }
    ],
    "repository": {
      "full_name": "owner/repo"
    }
  }
]
````

**Error Responses**

- `401` - Session expired or invalid
- `404` - Repository not found or user lacks access
- `500` - Failed to fetch issues from GitHub

**Notes**

- Returns all open issues assigned to or created by the authenticated user
- If no `repo` parameter is provided, fetches issues across all user repositories
- Results are sorted by creation date (newest first)

---

### Update Issue State

Closes or reopens a GitHub issue.

````http
PATCH /api/issues
Content-Type: application/json
X-Session-Token: <session_id>
````

**Request Body**

````json
{
  "repo": "owner/repo",
  "issue_number": 42,
  "state": "closed"
}
````

**Parameters**

- `repo` (string, required) - Repository in `owner/repo` format
- `issue_number` (number, required) - Issue number to update
- `state` (string, required) - New state: `"open"` or `"closed"`

**Success Response** (`200`)

````json
{
  "id": 123456789,
  "number": 42,
  "state": "closed",
  "html_url": "https://github.com/owner/repo/issues/42"
}
````

**Error Responses**

- `401` - Session expired or invalid
- `500` - Failed to update issue state

**Notes**

- Requires `repo` scope in the GitHub OAuth token
- Updates are reflected immediately on GitHub

---

### AI Summary

Generates an AI-powered summary of a GitHub issue using the GitHub Copilot SDK.

````http
POST /api/ai-summary
Content-Type: application/json
X-Session-Token: <session_id>
````

**Request Body**

````json
{
  "issue": {
    "title": "Bug: App crashes on startup",
    "body": "When I launch the app on iOS 17...",
    "number": 42,
    "repository": {
      "full_name": "owner/repo"
    }
  }
}
````

**Success Response** (`200`)

````json
{
  "summary": "This issue reports a crash during app startup on iOS 17. The problem appears to be related to...",
  "analysis": "The stack trace indicates a null pointer exception in the initialization code...",
  "recommendations": "1. Add null checks in the startup sequence\n2. Update iOS compatibility..."
}
````

**Error Responses**

- `400` - Missing or invalid issue data
- `401` - Session expired or invalid
- `403` - User does not have GitHub Copilot access
- `500` - AI service error

**Notes**

- Requires a GitHub Copilot subscription for the authenticated user
- Server must have `GH_TOKEN` or `COPILOT_PAT` environment variable set
- Summaries are generated in real-time (not cached)
- Processing time: typically 2-5 seconds depending on issue complexity

**Copilot Access Error**

If the user doesn't have Copilot access, the response includes a helpful message:

````json
{
  "error": "Copilot access required",
  "message": "AI summaries require a GitHub Copilot subscription. You can still use IssueCrush to triage issues without AI summaries.",
  "learnMoreUrl": "https://docs.github.com/en/copilot"
}
````

---

## Session Management

### Session Storage

Sessions are stored in:

- **Production**: Azure Cosmos DB NoSQL
  - Account: `issuecrush-cosmos`
  - Database: `issuecrush`
  - Container: `sessions`
  - Partition key: `/id`
  - TTL: 24 hours

- **Development**: In-memory storage (sessions lost on server restart)

### Session Resolution

The server resolves sessions in the following order:

1. `X-Session-Token` header (preferred)
2. `Authorization` header (fallback, format: `Bearer <session_id>`)

**Note**: Azure Static Web Apps intercepts the `Authorization` header for its own authentication, so frontend clients should use `X-Session-Token`.

### Session Lifecycle

1. User authenticates via GitHub OAuth
2. Backend exchanges code for access token
3. Session created with unique ID, access token stored
4. Frontend stores session ID securely
5. Frontend includes session ID in all API requests
6. Session expires after 24 hours of inactivity
7. User must re-authenticate after expiration

---

## Rate Limiting

IssueCrush respects GitHub's API rate limits:

- **Authenticated requests**: 5,000 requests/hour per user
- **Search API**: 30 requests/minute per user

Rate limit information is available in GitHub API response headers:

````
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1710163200
````

---

## Development vs. Production

### Express Server (Development)

- File: `server.js`
- Port: 3000
- Session storage: In-memory (configurable with Cosmos DB)
- Start: `npm run server`

### Azure Functions (Production)

- File: `api/src/app.js`
- Runtime: Node 20, ESM modules
- Session storage: Azure Cosmos DB
- Deploy: GitHub Actions on push to `main`

### Key Differences

1. **Import style**: Express uses CommonJS (`require`), Azure Functions uses ESM (`import`)
2. **Error handling**: Both use `return` statements in error handlers for consistent control flow
3. **Logging**: Express uses `console.log`, Azure Functions uses `context.log` and `context.error`
4. **Environment**: Azure Functions auto-scale and support multiple instances

---

## Security

### Token Security

- ✅ GitHub access tokens stored server-side only
- ✅ Client secret never exposed to frontend
- ✅ Sessions use cryptographically secure random IDs
- ✅ Tokens transmitted over HTTPS in production
- ✅ Sessions expire automatically (24-hour TTL)

### OAuth Flow

1. Frontend redirects user to GitHub authorization
2. GitHub redirects to `/callback` with authorization code
3. Backend exchanges code for access token (client secret required)
4. Backend stores token, returns session ID to frontend
5. Frontend stores session ID in secure storage

### Best Practices

- Always use HTTPS in production
- Set restrictive CORS policies
- Rotate client secrets periodically
- Monitor for unusual API usage patterns
- Implement request throttling if needed

---

## Troubleshooting

### Common Issues

#### "Session expired or invalid"

**Cause**: Session token is missing, invalid, or expired (24-hour TTL).

**Solution**: Sign out and sign in again to obtain a new session token.

---

#### "Copilot access required"

**Cause**: User doesn't have a GitHub Copilot subscription.

**Solution**: Subscribe to GitHub Copilot or use the app without AI summaries.

---

#### "Repository not found or you lack access"

**Cause**: Repository doesn't exist, is private, or user lacks permissions.

**Solution**:
- Verify the repository name is correct (`owner/repo`)
- Ensure the repository exists and is accessible
- Check that your OAuth token has the `repo` scope (not `public_repo`)

---

#### "Failed to fetch issues"

**Cause**: GitHub API error or network issue.

**Solution**:
- Check GitHub API status: https://www.githubstatus.com
- Verify your network connection
- Check server logs for detailed error messages

---

#### OAuth Errors

**`bad_verification_code`**
- The authorization code expired or was already used
- Solution: Click "Start GitHub login" again

**`redirect_uri_mismatch`**
- The callback URL doesn't match your GitHub OAuth App settings
- Solution: Update your GitHub OAuth App callback URL to match your environment

---

## Example API Workflows

### Complete Authentication Flow

````javascript
// 1. User clicks "Login with GitHub" in frontend
window.location.href = 'https://github.com/login/oauth/authorize?' +
  'client_id=YOUR_CLIENT_ID&' +
  'scope=repo&' +
  'state=random_state';

// 2. GitHub redirects to /callback?code=abc123&state=random_state
// Server redirects to frontend with code

// 3. Frontend exchanges code for session
const response = await fetch('http://localhost:3000/api/github-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'abc123' })
});
const { session_id } = await response.json();

// 4. Store session ID securely
await SecureStore.setItemAsync('session_token', session_id);
````

### Fetch and Close Issue

````javascript
// 1. Fetch issues
const session_id = await SecureStore.getItemAsync('session_token');
const issues = await fetch('http://localhost:3000/api/issues?repo=owner/repo', {
  headers: { 'X-Session-Token': session_id }
}).then(r => r.json());

// 2. Close an issue
await fetch('http://localhost:3000/api/issues', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Token': session_id
  },
  body: JSON.stringify({
    repo: 'owner/repo',
    issue_number: 42,
    state: 'closed'
  })
});
````

### Get AI Summary

````javascript
const session_id = await SecureStore.getItemAsync('session_token');
const summary = await fetch('http://localhost:3000/api/ai-summary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Token': session_id
  },
  body: JSON.stringify({
    issue: {
      title: 'Bug: App crashes',
      body: 'Description...',
      number: 42,
      repository: { full_name: 'owner/repo' }
    }
  })
}).then(r => r.json());

console.log(summary.summary);
````

---

## Related Documentation

- [README.md](../README.md) - Project overview and setup
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [GitHub REST API](https://docs.github.com/en/rest) - GitHub API reference
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) - Copilot integration docs
