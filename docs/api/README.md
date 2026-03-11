# IssueCrush API Reference

This document describes the backend API endpoints provided by the Azure Functions backend (`api/src/app.js`).

All endpoints use JSON for request and response bodies. Authentication is handled via session tokens stored in the `X-Session-Token` header (obtained via the OAuth flow).

## Table of Contents

- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [OAuth Token Exchange](#oauth-token-exchange)
  - [Logout](#logout)
  - [List Issues](#list-issues)
  - [Update Issue State](#update-issue-state)
  - [AI Summary](#ai-summary)
- [Error Responses](#error-responses)
- [Session Management](#session-management)

---

## Authentication

Most endpoints require authentication via a session token obtained through the OAuth flow.

**Session Token Header:**
````http
X-Session-Token: <session_id>
````

**How it works:**
1. Client initiates OAuth flow (device flow for mobile, web flow for browser)
2. Client exchanges OAuth code for session ID via `/api/github-token`
3. Client includes session ID in all subsequent requests
4. Backend retrieves GitHub token from session storage (Cosmos DB or in-memory)
5. Backend uses GitHub token to make API calls on behalf of the user

**Security:**
- GitHub OAuth tokens are **never** exposed to the client
- Session IDs expire after 24 hours (configurable TTL)
- Sessions are stored securely in Azure Cosmos DB or in-memory fallback

---

## Endpoints

### Health Check

Check backend status and Copilot availability.

**Endpoint:** `GET /api/health`

**Authentication:** None

**Response:**
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

**Use Cases:**
- Verify backend is running
- Check if AI summaries are available
- Frontend initialization health check

---

### OAuth Token Exchange

Exchange GitHub OAuth authorization code for a session ID.

**Endpoint:** `POST /api/github-token`

**Authentication:** None

**Request Body:**
````json
{
  "code": "github_oauth_code_here"
}
````

**Response (Success):**
````json
{
  "session_id": "64-char-hex-session-id"
}
````

**Response (Error):**
````json
{
  "error": "bad_verification_code",
  "error_description": "The code passed is incorrect or expired."
}
````

**Flow:**
1. Client obtains OAuth code from GitHub
2. Client sends code to this endpoint
3. Backend exchanges code for GitHub access token (using client secret)
4. Backend creates session in Cosmos DB with the GitHub token
5. Backend returns opaque session ID to client
6. Client stores session ID securely (SecureStore on mobile, AsyncStorage on web)

**Error Codes:**
- `400` - Invalid or missing authorization code
- `500` - Server configuration error (missing credentials)

---

### Logout

Destroy the current session.

**Endpoint:** `POST /api/logout`

**Authentication:** Session token (optional - endpoint always succeeds)

**Request Headers:**
````http
X-Session-Token: <session_id>
````

**Response:**
````json
{
  "ok": true
}
````

**Behavior:**
- If session ID provided, removes session from storage
- Always returns success (idempotent)
- Client should clear locally stored session ID

---

### List Issues

Fetch GitHub issues assigned to the authenticated user, with optional filtering.

**Endpoint:** `GET /api/issues`

**Authentication:** Required (session token)

**Request Headers:**
````http
X-Session-Token: <session_id>
````

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | No | Repository filter in format `owner/repo` (e.g., `facebook/react`) |
| `labels` | string | No | Comma-separated label names (e.g., `bug,help wanted`) |

**Examples:**

````http
# All issues assigned to authenticated user
GET /api/issues

# Issues in a specific repository
GET /api/issues?repo=facebook/react

# Issues with specific labels
GET /api/issues?labels=bug,high-priority

# Repository + labels combined
GET /api/issues?repo=facebook/react&labels=bug
````

**Response:**
````json
[
  {
    "id": 123456789,
    "number": 42,
    "title": "Fix authentication bug",
    "state": "open",
    "html_url": "https://github.com/owner/repo/issues/42",
    "repository_url": "https://api.github.com/repos/owner/repo",
    "repository": {
      "full_name": "owner/repo"
    },
    "labels": [
      {
        "id": 987654,
        "name": "bug",
        "color": "d73a4a",
        "description": "Something isn't working"
      }
    ],
    "body": "Description of the issue...",
    "created_at": "2026-03-10T12:00:00Z",
    "user": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/u/123456?v=4"
    }
  }
]
````

**Backend Behavior:**

- **Without `repo` parameter:** Uses GitHub search API with query `is:open is:issue assignee:@me`
- **With `repo` parameter:** Uses repository issues API `/repos/{owner}/{repo}/issues?state=open`
- Pull requests are automatically filtered out
- Limits results to 100 per request (GitHub API limitation)
- Sorted by most recently updated (search API only)

**Error Codes:**
- `401` - Session expired or invalid
- `404` - Repository not found or user lacks access
- `500` - Backend error

---

### Update Issue State

Open or close a GitHub issue.

**Endpoint:** `PATCH /api/issues/{owner}/{repo}/{number}`

**Authentication:** Required (session token)

**Request Headers:**
````http
X-Session-Token: <session_id>
Content-Type: application/json
````

**Path Parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `owner` | Repository owner | `facebook` |
| `repo` | Repository name | `react` |
| `number` | Issue number | `42` |

**Request Body:**
````json
{
  "state": "closed"
}
````

**Valid States:**
- `"open"` - Reopen the issue
- `"closed"` - Close the issue

**Response:**
````json
{
  "id": 123456789,
  "number": 42,
  "state": "closed",
  "title": "Fix authentication bug",
  "html_url": "https://github.com/owner/repo/issues/42",
  ...
}
````

**Example:**
````http
PATCH /api/issues/facebook/react/12345
X-Session-Token: abc123...
Content-Type: application/json

{
  "state": "closed"
}
````

**Requirements:**
- User must have `repo` scope (not just `public_repo`)
- User must have push access to the repository
- Issue must exist

**Error Codes:**
- `401` - Session expired or invalid
- `403` - Insufficient permissions (wrong OAuth scope or no push access)
- `404` - Repository or issue not found
- `500` - Backend error

---

### AI Summary

Generate an AI-powered summary of a GitHub issue using the GitHub Copilot SDK.

**Endpoint:** `POST /api/ai-summary`

**Authentication:** Required (session token)

**Request Headers:**
````http
X-Session-Token: <session_id>
Content-Type: application/json
````

**Request Body:**
````json
{
  "issue": {
    "number": 42,
    "title": "Fix authentication bug",
    "body": "When users try to log in with OAuth...",
    "state": "open",
    "labels": [
      { "name": "bug" },
      { "name": "priority-high" }
    ],
    "repository": {
      "full_name": "owner/repo"
    },
    "created_at": "2026-03-10T12:00:00Z",
    "user": {
      "login": "username"
    }
  }
}
````

**Response (Success):**
````json
{
  "summary": "This issue reports an OAuth authentication failure affecting user login. The bug appears to be in the token exchange flow. Recommended action: investigate the backend OAuth handler and verify redirect URIs match GitHub OAuth app configuration.",
  "fallback": false
}
````

**Response (Fallback - Copilot unavailable):**
````json
{
  "summary": "Fix authentication bug\nLabels: bug, priority-high\n\nWhen users try to log in with OAuth...\n\nReview the full issue details to determine next steps.",
  "fallback": true
}
````

**Response (Copilot Subscription Required):**
````json
{
  "error": "Copilot access required",
  "message": "AI summaries require a GitHub Copilot subscription.",
  "requiresCopilot": true
}
````

**Summary Format:**
The AI provides a 2-3 sentence summary containing:
1. What the issue is about
2. The key problem or request
3. Recommended action (e.g., "needs investigation", "ready to implement")

**Backend Requirements:**
- `GH_TOKEN` or `COPILOT_PAT` environment variable with Copilot access
- GitHub Copilot subscription
- Internet connectivity (calls GitHub Copilot API)

**Models:**
- Default: `gpt-4.1` (configurable in code)
- Response timeout: 30 seconds

**Fallback Behavior:**
If Copilot is unavailable or returns an error (except 401/403), the endpoint returns a basic summary composed of:
- Issue title
- Labels
- First sentence of issue body
- Generic action suggestion

**Error Codes:**
- `400` - No issue provided
- `401` - Session expired or invalid
- `403` - Copilot subscription required
- `500` - Backend error (with fallback summary)

---

## Error Responses

All error responses follow this format:

````json
{
  "error": "Brief error code or message",
  "message": "Optional detailed explanation"
}
````

**Common HTTP Status Codes:**

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| `400` | Bad Request | Missing or invalid parameters |
| `401` | Unauthorized | Session expired or invalid |
| `403` | Forbidden | Insufficient permissions or subscription required |
| `404` | Not Found | Repository or resource doesn't exist |
| `500` | Internal Server Error | Backend error or API failure |

**Session Expiration:**
Sessions expire after 24 hours. When a session expires, endpoints return:

````json
{
  "error": "Session expired or invalid. Please sign in again."
}
````

**Client Handling:**
- Detect `401` responses
- Clear stored session token
- Redirect user to authentication flow

---

## Session Management

### Storage Backend

**Production (Azure Cosmos DB):**
- Account: `issuecrush-cosmos`
- Database: `issuecrush`
- Container: `sessions`
- Partition Key: `/id`
- TTL: 24 hours (auto-expiration)

**Development (In-Memory Fallback):**
- Sessions stored in `Map()` when Cosmos DB not configured
- Sessions lost on server restart
- Suitable for local testing

### Configuration

Environment variables (Azure Static Web Apps Application Settings):

````bash
# Required for persistent sessions
COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

If `COSMOS_ENDPOINT` and `COSMOS_KEY` are not set, the backend automatically falls back to in-memory storage.

### Session Object

````javascript
{
  "id": "64-char-hex-session-id",
  "githubToken": "gho_xxxxx...",
  "createdAt": 1710155000000,
  "expiresAt": 1710241400000,
  "ttl": 86400
}
````

### Session Resolution

The `resolveSession()` function extracts the session token from either:
1. `X-Session-Token` header (preferred)
2. `Authorization` header (fallback, for testing)

**Why `X-Session-Token`?**
Azure Static Web Apps intercepts the `Authorization` header, so we use a custom header for production.

---

## Additional Resources

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub OAuth Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)

For implementation details, see:
- Backend code: [`api/src/app.js`](../../api/src/app.js)
- Session storage: [`api/src/sessionStore.js`](../../api/src/sessionStore.js)
- Frontend API client: [`src/api/github.ts`](../../src/api/github.ts)
