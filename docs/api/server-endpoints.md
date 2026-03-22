# Server API Endpoints

The IssueCrush backend provides REST API endpoints for OAuth, issue management, and AI summaries. The Express server (`server.js`) mirrors Azure Functions (`api/src/app.js`) for local development.

## Base URL

- **Development**: `http://localhost:3000` (Express)
- **Production**: `https://gray-water-08b04e810.6.azurestaticapps.net` (Azure SWA)

## Authentication

Most endpoints require session authentication via the `X-Session-Token` header:

````http
GET /api/issues
X-Session-Token: <session-id>
````

Azure Static Web Apps intercepts the `Authorization` header, so we use `X-Session-Token` instead.

## Endpoints

### `GET /callback`

OAuth callback relay - GitHub redirects here, server relays code to frontend.

**Purpose**: Bridge the port gap between GitHub OAuth app (port 3000) and Expo app (port 8081)

**Query Parameters:**
- `code` - Authorization code from GitHub
- `state` - (Optional) OAuth state parameter
- `error` - (Optional) Error from GitHub

**Response**: HTTP 302 redirect to frontend with query params

**Example:**
````http
GET /callback?code=abc123&state=xyz

Response: 302 Found
Location: http://localhost:8081?code=abc123&state=xyz
````

---

### `POST /api/github-token`

Exchange OAuth code for session ID.

**Authentication**: None (public endpoint)

**Request Body:**
````json
{
  "code": "abc123..."
}
````

**Response (Success):**
````json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
````

**Response (Error):**
````json
{
  "error": "bad_verification_code",
  "error_description": "The code passed is incorrect or expired."
}
````

**Status Codes:**
- `200` - Success, session created
- `400` - Invalid code or missing parameters
- `500` - Server error or missing GitHub credentials

**Example:**
````bash
curl -X POST http://localhost:3000/api/github-token \
  -H "Content-Type: application/json" \
  -d '{"code": "abc123..."}'
````

---

### `POST /api/logout`

Destroy server-side session.

**Authentication**: `X-Session-Token` header (optional)

**Response:**
````json
{
  "ok": true
}
````

**Status Codes:**
- `200` - Always succeeds (even if session doesn't exist)

**Example:**
````bash
curl -X POST http://localhost:3000/api/logout \
  -H "X-Session-Token: <session-id>"
````

---

### `GET /api/health`

Health check and feature availability.

**Authentication**: None

**Response:**
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

**Status Codes:**
- `200` - Server is healthy

**Example:**
````bash
curl http://localhost:3000/api/health
````

---

### `GET /api/issues`

Fetch GitHub issues for the authenticated user.

**Authentication**: Required (`X-Session-Token`)

**Query Parameters:**
- `repo` - (Optional) Filter by repository, e.g., `facebook/react`
- `labels` - (Optional) Comma-separated label names, e.g., `bug,help wanted`

**Response:** Array of GitHub issues (excluding pull requests)

````json
[
  {
    "id": 123,
    "number": 42,
    "title": "Bug in authentication",
    "state": "open",
    "labels": [
      { "id": 1, "name": "bug", "color": "d73a4a" }
    ],
    "repository_url": "https://api.github.com/repos/owner/repo",
    "html_url": "https://github.com/owner/repo/issues/42",
    "body": "Issue description...",
    "created_at": "2026-03-01T12:00:00Z",
    "user": {
      "login": "octocat",
      "avatar_url": "https://github.com/octocat.png"
    }
  }
]
````

**Status Codes:**
- `200` - Success
- `401` - Session expired or invalid
- `404` - Repository not found or no access
- `500` - Server or GitHub API error

**Examples:**

````bash
# All issues assigned to authenticated user
curl http://localhost:3000/api/issues \
  -H "X-Session-Token: <session-id>"

# Issues from specific repository
curl "http://localhost:3000/api/issues?repo=facebook/react" \
  -H "X-Session-Token: <session-id>"

# Issues with specific label
curl "http://localhost:3000/api/issues?labels=bug" \
  -H "X-Session-Token: <session-id>"
````

**Implementation Notes:**

- Without `repo`: Uses GitHub Search API (`/search/issues?q=is:open is:issue assignee:@me`)
- With `repo`: Uses Repo Issues API (`/repos/{owner}/{repo}/issues`)
- Pull requests are automatically filtered out
- Results limited to 100 per request

---

### `PATCH /api/issues/:owner/:repo/:number`

Update issue state (open/closed).

**Authentication**: Required (`X-Session-Token`)

**URL Parameters:**
- `owner` - Repository owner
- `repo` - Repository name
- `number` - Issue number

**Request Body:**
````json
{
  "state": "closed"
}
````

**Response:** Updated issue object (same format as GET)

**Status Codes:**
- `200` - Success
- `401` - Session expired or invalid
- `403` - No permission to update issue
- `404` - Issue not found
- `500` - Server or GitHub API error

**Example:**

````bash
# Close issue #42
curl -X PATCH http://localhost:3000/api/issues/facebook/react/42 \
  -H "X-Session-Token: <session-id>" \
  -H "Content-Type: application/json" \
  -d '{"state": "closed"}'

# Reopen issue #42
curl -X PATCH http://localhost:3000/api/issues/facebook/react/42 \
  -H "X-Session-Token: <session-id>" \
  -H "Content-Type: application/json" \
  -d '{"state": "open"}'
````

---

### `POST /api/ai-summary`

Generate AI-powered issue summary using GitHub Copilot SDK.

**Authentication**: Required (`X-Session-Token`)

**Request Body:**
````json
{
  "issue": {
    "number": 42,
    "title": "Bug in authentication",
    "body": "Description...",
    "labels": [...],
    "repository": { "full_name": "owner/repo" },
    "created_at": "2026-03-01T12:00:00Z",
    "user": { "login": "octocat" }
  }
}
````

**Response (Success):**
````json
{
  "summary": "This issue reports an authentication bug affecting login flows. The problem appears to be in the OAuth callback handler. Recommended action: investigate the callback logic and add error logging."
}
````

**Response (Fallback):**
````json
{
  "summary": "📋 Bug in authentication\nLabels: bug, high-priority\n\nDescription...",
  "fallback": true,
  "note": "AI summary unavailable — showing basic analysis"
}
````

**Response (Copilot Required):**
````json
{
  "error": "Copilot access required",
  "message": "AI summaries require a GitHub Copilot subscription.",
  "requiresCopilot": true
}
````

**Status Codes:**
- `200` - Success (AI or fallback summary)
- `400` - Missing issue data
- `401` - Session expired or invalid
- `403` - User lacks Copilot subscription
- `500` - Server error

**Example:**

````bash
curl -X POST http://localhost:3000/api/ai-summary \
  -H "X-Session-Token: <session-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "issue": {
      "number": 42,
      "title": "Bug in authentication",
      "body": "Users cannot log in after password reset",
      "labels": [{"name": "bug"}]
    }
  }'
````

**Requirements:**
- Server must have `GH_TOKEN` or `COPILOT_PAT` environment variable
- User must have GitHub Copilot subscription
- Uses GPT-4.1 model via Copilot SDK

**Prompt Template:**

The AI receives:
- Issue title, number, repository, state, labels
- Created date and author
- Full issue body
- Instructions to provide 2-3 sentence summary with recommended action

---

## Session Management

### Session Storage

Sessions are stored with:
- **Development**: In-memory (lost on restart)
- **Production**: Azure Cosmos DB (persistent, 24-hour TTL)

### Session Structure

````json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "githubToken": "gho_...",
  "createdAt": "2026-03-22T10:00:00Z",
  "ttl": 86400
}
````

### Session Middleware

The `sessionMiddleware()` attaches session data to `req` object:

````javascript
app.use(sessionMiddleware());

// In route handlers:
req.sessionId       // Session ID from X-Session-Token header
req.githubToken     // GitHub token from session store
````

### Protected Routes

Use `requireSession()` middleware to enforce authentication:

````javascript
app.get('/api/issues', requireSession(), async (req, res) => {
  // req.githubToken is guaranteed to exist
});
````

---

## Error Handling

### Standard Error Response

````json
{
  "error": "Human-readable error message"
}
````

### Common Errors

| Status | Error | Meaning |
|--------|-------|---------|
| 400 | Missing required parameter | Client sent invalid request |
| 401 | Session expired | User needs to re-authenticate |
| 403 | Permission denied | User lacks required permissions |
| 404 | Not found | Resource doesn't exist or no access |
| 500 | Internal server error | Server or external API failure |

### GitHub API Errors

When proxying GitHub API, errors are passed through:

````json
{
  "error": "Repository not found or you lack access."
}
````

---

## Environment Variables

### Required

- `EXPO_PUBLIC_GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret

### Optional

- `PORT` - Server port (default: 3000)
- `EXPO_PUBLIC_API_URL` - API base URL (for client)
- `EXPO_PUBLIC_FRONTEND_URL` - Frontend URL for OAuth redirect (default: `http://localhost:8081`)
- `COSMOS_ENDPOINT` - Cosmos DB endpoint (for persistent sessions)
- `COSMOS_KEY` - Cosmos DB key
- `COSMOS_DATABASE` - Database name (default: `issuecrush`)
- `COSMOS_CONTAINER` - Container name (default: `sessions`)
- `GH_TOKEN` or `COPILOT_PAT` - GitHub token with Copilot access (for AI summaries)

---

## Rate Limiting

The server does not implement rate limiting. Relies on:
- GitHub API rate limits (5000 req/hour for authenticated users)
- Cosmos DB throughput limits (if configured)

Consider implementing rate limiting for production deployments.

---

## CORS

CORS is enabled for all origins in development:

````javascript
app.use(cors({ origin: true, credentials: true }));
````

For production, configure specific origins in `staticwebapp.config.json`.

---

## Related

- [GitHub API Client](./github-client.md) - Frontend client that calls these endpoints
- [Copilot Service](./copilot-service.md) - Frontend wrapper for AI summary endpoint
- [Session Store](../../sessionStore.js) - Session management implementation
