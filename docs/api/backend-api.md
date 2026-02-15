# Backend API Reference

This document describes the Azure Functions API endpoints that power the IssueCrush backend.

## Base URL

- **Local Development:** `http://localhost:3000/api`
- **Production:** `https://gray-water-08b04e810.6.azurestaticapps.net/api`

## Authentication

Most endpoints require authentication via session token. Include the session token in the `X-Session-Token` header:

````
X-Session-Token: <session_id>
````

> **Note:** Azure Static Web Apps intercepts the `Authorization` header, so we use `X-Session-Token` instead.

---

## Endpoints

### Health Check

Check if the API server is available and Copilot is configured.

**Endpoint:** `GET /api/health`  
**Authentication:** None required

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

---

### GitHub OAuth Token Exchange

Exchange a GitHub OAuth authorization code for a session ID.

**Endpoint:** `POST /api/github-token`  
**Authentication:** None required

**Request Body:**
````json
{
  "code": "authorization_code_from_github"
}
````

**Response (Success):**
````json
{
  "session_id": "opaque_session_identifier"
}
````

**Response (Error):**
````json
{
  "error": "error_code",
  "error_description": "Human-readable error message"
}
````

**Status Codes:**
- `200` - Token exchange successful
- `400` - Invalid or missing authorization code
- `500` - Server configuration error or GitHub API failure

**Flow:**
1. Client initiates GitHub OAuth flow
2. GitHub redirects back with authorization code
3. Client sends code to this endpoint
4. Server exchanges code for GitHub access token
5. Server creates session with token in Cosmos DB
6. Server returns opaque session ID to client

**Security:**
- Client secret is never exposed to the frontend
- GitHub token is stored server-side only
- Client receives only an opaque session ID

---

### Logout

Destroy the user's session.

**Endpoint:** `POST /api/logout`  
**Authentication:** Required (`X-Session-Token` header)

**Response:**
````json
{
  "ok": true
}
````

**Status Codes:**
- `200` - Session destroyed (even if session didn't exist)

**Behavior:**
- Removes session from Cosmos DB
- Always returns success (idempotent)

---

### Fetch Issues

Retrieve GitHub issues for the authenticated user.

**Endpoint:** `GET /api/issues`  
**Authentication:** Required (`X-Session-Token` header)

**Query Parameters:**
- `repo` (optional) - Repository filter in format `owner/repo`
- `labels` (optional) - Comma-separated label names to filter by

**Examples:**
````
GET /api/issues
GET /api/issues?repo=owner/repo
GET /api/issues?labels=bug,help%20wanted
GET /api/issues?repo=owner/repo&labels=bug
````

**Response (Success):**
````json
[
  {
    "id": 123456789,
    "number": 42,
    "title": "Fix the bug",
    "state": "open",
    "labels": [
      {
        "id": 987654321,
        "name": "bug",
        "color": "d73a4a",
        "description": "Something isn't working"
      }
    ],
    "repository_url": "https://api.github.com/repos/owner/repo",
    "html_url": "https://github.com/owner/repo/issues/42",
    "body": "Issue description...",
    "created_at": "2024-01-15T10:30:00Z",
    "user": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/u/123456"
    }
  }
]
````

**Response (Error):**
````json
{
  "error": "Error message"
}
````

**Status Codes:**
- `200` - Issues retrieved successfully
- `401` - Session expired or invalid
- `404` - Repository not found or no access
- `500` - GitHub API error

**Behavior:**

**Without `repo` parameter:**
- Searches for issues assigned to the authenticated user
- Uses GitHub search API: `is:open is:issue assignee:@me`
- Excludes pull requests
- Sorted by most recently updated

**With `repo` parameter:**
- Lists open issues in the specified repository
- Uses GitHub REST API: `GET /repos/:owner/:repo/issues`
- Requires user to have read access to the repository
- Excludes pull requests

**With `labels` parameter:**
- Filters results to only issues with ALL specified labels
- Labels must match exactly (case-sensitive)

---

### Update Issue State

Open or close a GitHub issue.

**Endpoint:** `PATCH /api/issues/:owner/:repo/:number`  
**Authentication:** Required (`X-Session-Token` header)

**Path Parameters:**
- `owner` - Repository owner (username or organization)
- `repo` - Repository name
- `number` - Issue number

**Request Body:**
````json
{
  "state": "open"  // or "closed"
}
````

**Example:**
````
PATCH /api/issues/owner/repo/42
Content-Type: application/json
X-Session-Token: session_id

{
  "state": "closed"
}
````

**Response (Success):**
````json
{
  "id": 123456789,
  "number": 42,
  "state": "closed",
  "title": "Fix the bug",
  ...
}
````

**Response (Error):**
````json
{
  "error": "Error message"
}
````

**Status Codes:**
- `200` - Issue state updated successfully
- `400` - Invalid state value
- `401` - Session expired or invalid
- `403` - User lacks permission to modify the issue
- `404` - Repository or issue not found
- `500` - GitHub API error

**Required Permissions:**
- User must have `repo` scope (not just `public_repo`)
- User must have write access to the repository

---

### AI Summary

Generate an AI-powered summary of a GitHub issue using GitHub Copilot SDK.

**Endpoint:** `POST /api/ai-summary`  
**Authentication:** Required (`X-Session-Token` header)

**Request Body:**
````json
{
  "issue": {
    "number": 42,
    "title": "Issue title",
    "body": "Issue description...",
    "labels": [...],
    ...
  }
}
````

**Response (Success):**
````json
{
  "summary": "AI-generated issue summary...",
  "fallback": false
}
````

**Response (Copilot Required):**
````json
{
  "message": "AI summaries require a GitHub Copilot subscription.",
  "requiresCopilot": true
}
````

**Response (Error):**
````json
{
  "error": "Error message"
}
````

**Status Codes:**
- `200` - Summary generated successfully
- `401` - Session expired or invalid
- `403` - Copilot subscription required
- `500` - AI service error

**Configuration:**

The backend requires one of these environment variables:
- `GH_TOKEN` - GitHub token with Copilot access
- `COPILOT_PAT` - GitHub Personal Access Token with Copilot access

**Fallback Behavior:**

If Copilot is unavailable, the endpoint returns a structured fallback summary based on issue metadata (title, labels, length).

---

## Error Handling

All endpoints follow a consistent error response format:

````json
{
  "error": "Human-readable error message"
}
````

### Common Error Patterns

**Session Expired (401):**
````json
{
  "error": "Session expired or invalid. Please sign in again."
}
````

**Authorization Error (403):**
````json
{
  "error": "You don't have permission to perform this action"
}
````

**Not Found (404):**
````json
{
  "error": "Repository not found or you lack access."
}
````

**Server Error (500):**
````json
{
  "error": "Internal server error"
}
````

---

## Session Management

### Session Storage

Sessions are stored in Azure Cosmos DB (or in-memory for local development without Cosmos).

**Session Structure:**
````javascript
{
  id: "session_id",
  sessionId: "session_id",  // Partition key
  githubToken: "gho_...",
  createdAt: 1234567890,
  ttl: 86400  // 24 hours
}
````

### Session Resolution

The `resolveSession()` helper reads the session token from:
1. `X-Session-Token` header (primary)
2. `Authorization` header (fallback, but Azure SWA may intercept this)

### Session Lifecycle

1. **Creation:** `/api/github-token` creates a new session
2. **Usage:** Session ID passed in `X-Session-Token` header
3. **TTL:** Sessions expire after 24 hours automatically
4. **Destruction:** `/api/logout` explicitly deletes the session

---

## Rate Limiting

GitHub API rate limits apply:
- **Authenticated requests:** 5,000 requests per hour
- **Search API:** 30 requests per minute

The backend does not implement additional rate limiting.

---

## CORS Configuration

CORS is configured in Azure Static Web Apps via `staticwebapp.config.json`:
- **Development:** Allows `http://localhost:*`
- **Production:** Allows the Azure Static Web Apps domain

---

## Environment Variables

Required environment variables for the backend:

````bash
# Required
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret

# Optional: Cosmos DB for persistent sessions
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions

# Optional: AI summaries
GH_TOKEN=github_token_with_copilot_access
# OR
COPILOT_PAT=github_pat_with_copilot_access
````

---

## Security Considerations

### Token Security
- GitHub OAuth client secret is never exposed to the frontend
- GitHub access tokens are stored server-side only
- Session IDs are opaque and cannot be used to derive the GitHub token

### Session Security
- Sessions have 24-hour TTL
- Sessions are destroyed on logout
- Session validation on every authenticated request

### API Security
- All GitHub API calls use the user's OAuth token
- No elevation of privileges
- Users can only access resources they have permission for on GitHub

---

## See Also

- [Frontend API Reference](./frontend-api.md) - TypeScript client APIs
- [OAuth Flow Guide](../architecture/oauth-flow.md) - Detailed OAuth implementation
- [Session Storage Guide](../architecture/session-storage.md) - Cosmos DB session management
