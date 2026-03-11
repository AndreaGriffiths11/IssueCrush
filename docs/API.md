# API Reference

IssueCrush backend API provides OAuth token exchange, GitHub issue management, and AI-powered summaries.

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: Same origin as app (Azure Static Web Apps)

## Authentication

Most endpoints require authentication via session token:

````http
X-Session-Token: <session_id>
````

Session ID is obtained after OAuth token exchange.

---

## Endpoints

### Health Check

Check API server status and AI availability.

````http
GET /api/health
````

**Response** (200 OK):

````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

**Notes**:
- Frontend retries up to 3 times with 2-second delays on startup
- `copilotAvailable: true` indicates Copilot SDK is configured

---

### OAuth Token Exchange

Exchange GitHub OAuth authorization code for session token.

````http
POST /api/github-token
Content-Type: application/json
````

**Request Body**:

````json
{
  "code": "github_oauth_code"
}
````

**Response** (200 OK):

````json
{
  "session_id": "unique_session_id",
  "expires_in": 86400
}
````

**Error Responses**:

````json
// 400 Bad Request - Invalid code
{
  "error": "bad_verification_code",
  "error_description": "The code passed is incorrect or expired."
}

// 500 Internal Server Error
{
  "error": "Missing GitHub credentials"
}
````

**Notes**:
- Session ID stored securely on client (expo-secure-store or AsyncStorage)
- Sessions expire after 24 hours (TTL)
- Client secret never exposed to frontend

---

### Fetch Issues

Get all open issues assigned to or created by the authenticated user.

````http
GET /api/issues
X-Session-Token: <session_id>
````

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | string | Optional. Filter by repository (format: `owner/repo`) |

**Response** (200 OK):

````json
[
  {
    "id": 123456,
    "number": 42,
    "title": "Bug: App crashes on startup",
    "body": "Detailed description...",
    "state": "open",
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-10T15:30:00Z",
    "html_url": "https://github.com/owner/repo/issues/42",
    "user": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/..."
    },
    "labels": [
      { "name": "bug", "color": "d73a4a" }
    ],
    "repository": {
      "full_name": "owner/repo",
      "html_url": "https://github.com/owner/repo"
    }
  }
]
````

**Error Responses**:

````json
// 401 Unauthorized
{
  "error": "Session expired or invalid. Please sign in again."
}
````

---

### Close Issue

Close a GitHub issue.

````http
PATCH /api/issues/:owner/:repo/:issue_number
X-Session-Token: <session_id>
Content-Type: application/json
````

**Request Body**:

````json
{
  "state": "closed"
}
````

**Response** (200 OK):

````json
{
  "id": 123456,
  "number": 42,
  "state": "closed",
  "closed_at": "2026-03-11T16:00:00Z"
}
````

**Error Responses**:

````json
// 403 Forbidden - Insufficient permissions
{
  "error": "Resource not accessible by personal access token"
}

// 404 Not Found
{
  "error": "Issue not found"
}
````

**Notes**:
- Requires `repo` scope (not `public_repo`)
- User must have write access to repository

---

### Reopen Issue

Reopen a closed GitHub issue.

````http
PATCH /api/issues/:owner/:repo/:issue_number
X-Session-Token: <session_id>
Content-Type: application/json
````

**Request Body**:

````json
{
  "state": "open"
}
````

**Response** (200 OK):

````json
{
  "id": 123456,
  "number": 42,
  "state": "open"
}
````

---

### AI Summary

Generate AI-powered issue summary using GitHub Copilot SDK.

````http
POST /api/ai-summary
X-Session-Token: <session_id>
Content-Type: application/json
````

**Request Body**:

````json
{
  "issue": {
    "number": 42,
    "title": "Bug: App crashes on startup",
    "body": "Detailed description...",
    "state": "open",
    "labels": [{ "name": "bug" }],
    "created_at": "2026-03-01T10:00:00Z",
    "user": { "login": "username" },
    "repository": { "full_name": "owner/repo" }
  }
}
````

**Response** (200 OK):

````json
{
  "summary": "This issue reports a critical startup crash affecting mobile users on Android 14. The error occurs during initialization of the auth module. Recommended action: Prioritize for immediate investigation, assign to mobile team."
}
````

**Error Responses**:

````json
// 403 Forbidden - Copilot access required
{
  "error": "Copilot access required",
  "message": "AI summaries require a GitHub Copilot subscription and valid GH_TOKEN or COPILOT_PAT."
}

// 500 Internal Server Error - Fallback summary
{
  "summary": "Issue #42: Bug: App crashes on startup (Open). Review manually for triage."
}
````

**Notes**:
- Requires `GH_TOKEN` or `COPILOT_PAT` environment variable
- Requires active GitHub Copilot subscription
- Uses GPT-4.1 model via Copilot SDK v0.1.32+
- 30-second timeout per request
- Graceful fallback on errors (except auth failures)

---

### Logout

Destroy server-side session.

````http
POST /api/logout
X-Session-Token: <session_id>
````

**Response** (204 No Content)

**Notes**:
- Also clears token from client-side storage
- Safe to call even if session already expired

---

## Error Handling

### Error Response Format

````json
{
  "error": "Error type or message",
  "message": "Optional detailed explanation"
}
````

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Request completed successfully |
| 204 | No Content | Success with no response body |
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Session expired, re-authenticate |
| 403 | Forbidden | Insufficient permissions or Copilot access required |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server error, retry or check logs |

---

## Rate Limiting

GitHub API rate limits apply:
- **Authenticated**: 5,000 requests/hour per user
- **Copilot SDK**: Subject to Copilot usage limits

Check response headers:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Session Management

- **Storage**: Azure Cosmos DB (production) or in-memory (development)
- **TTL**: 24 hours (auto-cleanup)
- **Partition Key**: Session ID
- **Token Storage**: Server-side only, never exposed to client

### Session Lifecycle

1. OAuth authorization code → `/api/github-token` → Session ID
2. Client stores session ID securely
3. Session ID sent in `X-Session-Token` header
4. Server resolves session → GitHub access token
5. Server makes GitHub API calls with user's token
6. After 24 hours or logout, session destroyed

---

## Development

### Running Locally

````bash
# Start API server
npm run server

# Test health endpoint
curl http://localhost:3000/api/health

# Test with session token
curl -H "X-Session-Token: your_session_id" \
     http://localhost:3000/api/issues
````

### Environment Variables

See `.env.example` for complete configuration.

Required:
- `EXPO_PUBLIC_GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Optional:
- `GH_TOKEN` or `COPILOT_PAT` (for AI features)
- `COSMOS_*` variables (for persistent sessions)

---

## Security

- **Client Secret**: Server-side only, never exposed
- **Access Tokens**: Stored server-side in sessions
- **Session IDs**: Securely stored on client
- **HTTPS**: Required in production (Azure SWA)
- **Token Scopes**: Minimum required (`repo`)

---

## Further Reading

- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)
