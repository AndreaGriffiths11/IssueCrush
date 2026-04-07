# API Reference

IssueCrush provides a REST API for authentication, issue management, and AI-powered summaries. The API is implemented as both an Express server (local development) and Azure Functions (production).

## Base URLs

- **Local Development**: `http://localhost:3000`
- **Production**: `https://gray-water-08b04e810.6.azurestaticapps.net`

## Authentication

Most endpoints require a session token obtained after GitHub OAuth authentication. Include the session token in the `X-Session-Token` header:

````http
X-Session-Token: your-session-token-here
````

> **Note**: The `Authorization` header is intercepted by Azure Static Web Apps. Always use `X-Session-Token` for client authentication.

## Endpoints

### Health Check

Check API availability and Copilot status.

**Request:**
````http
GET /api/health
````

**Response:**
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

---

### Exchange OAuth Code

Exchange a GitHub OAuth authorization code for an access token and create a session.

**Request:**
````http
POST /api/github-token
Content-Type: application/json

{
  "code": "github_oauth_code"
}
````

**Response:**
````json
{
  "access_token": "gho_...",
  "token_type": "bearer",
  "scope": "repo",
  "session_token": "uuid-v4-session-token"
}
````

**Error Responses:**
- `400` - No authorization code provided
- `500` - Missing GitHub credentials or OAuth exchange failed

---

### Logout

Destroy the current session.

**Request:**
````http
POST /api/logout
X-Session-Token: your-session-token
````

**Response:**
````json
{
  "message": "Logged out"
}
````

---

### List Issues

Fetch issues from GitHub repositories accessible to the authenticated user.

**Request:**
````http
GET /api/issues?repo=owner/repo&state=open&per_page=30
X-Session-Token: your-session-token
````

**Query Parameters:**
- `repo` (optional) - Filter by repository in `owner/repo` format. Omit to fetch from all repositories.
- `state` (optional) - Issue state: `open`, `closed`, or `all`. Default: `open`
- `per_page` (optional) - Number of results per page (1-100). Default: `30`

**Response:**
````json
[
  {
    "id": 123456789,
    "number": 42,
    "title": "Fix authentication bug",
    "body": "Issue description...",
    "state": "open",
    "html_url": "https://github.com/owner/repo/issues/42",
    "repository_url": "https://api.github.com/repos/owner/repo",
    "user": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/u/..."
    },
    "labels": [
      {
        "name": "bug",
        "color": "d73a4a"
      }
    ],
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-20T14:45:00Z"
  }
]
````

**Error Responses:**
- `401` - Invalid or missing session token
- `500` - GitHub API request failed

---

### Update Issue

Close or reopen a GitHub issue.

**Request:**
````http
PATCH /api/issues/:owner/:repo/:number
Content-Type: application/json
X-Session-Token: your-session-token

{
  "state": "closed"
}
````

**Path Parameters:**
- `owner` - Repository owner username
- `repo` - Repository name
- `number` - Issue number

**Body Parameters:**
- `state` - New issue state: `open` or `closed`

**Response:**
````json
{
  "id": 123456789,
  "number": 42,
  "state": "closed",
  "title": "Fix authentication bug",
  "updated_at": "2026-01-20T15:00:00Z"
}
````

**Error Responses:**
- `400` - Invalid state parameter
- `401` - Invalid or missing session token
- `404` - Issue not found
- `500` - GitHub API request failed

---

### AI Summary

Generate an AI-powered summary and analysis of a GitHub issue using the GitHub Copilot SDK.

**Request:**
````http
POST /api/ai-summary
Content-Type: application/json
X-Session-Token: your-session-token

{
  "title": "Fix authentication bug",
  "body": "Detailed issue description...",
  "labels": ["bug", "priority-high"],
  "comments": 5
}
````

**Body Parameters:**
- `title` (required) - Issue title
- `body` (optional) - Issue description
- `labels` (optional) - Array of label names
- `comments` (optional) - Number of comments on the issue

**Response:**
````json
{
  "summary": "This issue reports an authentication bug where users are unable to log in after OAuth flow completes. The error suggests a token validation failure. Recommended next steps: 1) Check session storage configuration, 2) Verify OAuth scopes include 'repo', 3) Review token exchange endpoint logs."
}
````

**Error Responses:**
- `400` - Missing required fields (title)
- `401` - Invalid or missing session token
- `500` - Copilot SDK error or missing `GH_TOKEN`/`COPILOT_PAT` environment variable

**Notes:**
- Requires a GitHub Copilot subscription
- The backend must have `GH_TOKEN` or `COPILOT_PAT` configured
- Summary generation typically takes 2-5 seconds

---

## Session Storage

Sessions are stored in Azure Cosmos DB (production) or in-memory (local development). Each session:

- Has a 24-hour time-to-live (TTL)
- Maps a session token to a GitHub access token
- Is automatically cleaned up after expiration

### Local Development

Without Cosmos DB configuration, sessions are stored in memory and cleared when the server restarts. This is suitable for development but not for production.

### Production (Cosmos DB)

Configure the following environment variables for persistent session storage:

````bash
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

The database and container are automatically created if they don't exist.

---

## Error Handling

All errors follow this structure:

````json
{
  "error": "Human-readable error message"
}
````

### Common Error Codes

| Code | Meaning |
|------|---------|
| `400` | Bad Request - Invalid or missing parameters |
| `401` | Unauthorized - Invalid or missing session token |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error - Backend processing failed |

---

## Rate Limiting

IssueCrush respects GitHub API rate limits:

- **Authenticated requests**: 5,000 requests per hour
- **OAuth apps**: Rate limits apply per user

If you exceed rate limits, GitHub returns a `403` status with rate limit information in the response headers.

---

## Examples

### Complete Authentication Flow

1. Redirect user to GitHub OAuth:
````
https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=repo
````

2. GitHub redirects to your callback with `code` parameter

3. Exchange code for token and session:
````bash
curl -X POST http://localhost:3000/api/github-token \
  -H "Content-Type: application/json" \
  -d '{"code": "github_oauth_code"}'
````

4. Use session token in subsequent requests:
````bash
curl http://localhost:3000/api/issues \
  -H "X-Session-Token: session-token-from-step-3"
````

### Swipe Workflow

1. **Fetch issues**:
````bash
curl http://localhost:3000/api/issues?repo=owner/repo \
  -H "X-Session-Token: YOUR_SESSION_TOKEN"
````

2. **Get AI summary** (optional):
````bash
curl -X POST http://localhost:3000/api/ai-summary \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: YOUR_SESSION_TOKEN" \
  -d '{"title": "Bug title", "body": "Bug description"}'
````

3. **Close issue** (swipe left):
````bash
curl -X PATCH http://localhost:3000/api/issues/owner/repo/42 \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: YOUR_SESSION_TOKEN" \
  -d '{"state": "closed"}'
````

4. **Reopen issue** (undo):
````bash
curl -X PATCH http://localhost:3000/api/issues/owner/repo/42 \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: YOUR_SESSION_TOKEN" \
  -d '{"state": "open"}'
````

---

## Security

- **Client Secret**: Never exposed to the frontend. Token exchange happens server-side only.
- **Session Tokens**: UUIDv4 tokens that expire after 24 hours.
- **Token Storage**: 
  - Mobile: `expo-secure-store` (encrypted keychain/keystore)
  - Web: `AsyncStorage` (localStorage, not encrypted but isolated per origin)
- **CORS**: Configured to allow requests from the app's origin only.

---

## Implementation Notes

### Server Files

- **`server.js`** - Express server for local development
- **`api/src/app.js`** - Azure Functions for production

Both implementations expose the same API contract, ensuring development/production parity.

### Session Resolution

The `resolveSession()` function checks for session tokens in this order:

1. `X-Session-Token` header (preferred)
2. `Authorization` header (fallback, but intercepted by Azure SWA)

This dual-header approach ensures compatibility across different deployment environments.
