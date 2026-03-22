# API Reference

IssueCrush exposes a backend API that handles GitHub OAuth authentication, issue management, and AI-powered summaries. The API is implemented in two environments:

- **Local Development**: Express server (`server.js`) running on port 3000
- **Production**: Azure Functions (`api/src/app.js`) deployed to Azure Static Web Apps

Both implementations provide identical endpoints and behavior.

## Table of Contents

- [Authentication](#authentication)
- [Session Management](#session-management)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [OAuth Token Exchange](#oauth-token-exchange)
  - [Logout](#logout)
  - [Fetch Issues](#fetch-issues)
  - [Update Issue State](#update-issue-state)
  - [AI Summary](#ai-summary)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

IssueCrush uses a **session-based authentication** pattern to keep GitHub OAuth tokens secure on the server:

1. Client exchanges OAuth code for a session ID via `/api/github-token`
2. Server stores the GitHub token and returns an opaque session ID
3. Client includes session ID in subsequent requests via `X-Session-Token` header
4. Server validates session and uses the stored GitHub token for GitHub API calls

**Client Never Touches the GitHub Token** - This prevents token leakage and simplifies token refresh logic.

### Authentication Headers

All authenticated endpoints require the following header:

````http
X-Session-Token: <session-id>
````

**Example:**

````http
GET /api/issues
X-Session-Token: abc123-session-id-xyz789
````

## Session Management

Sessions are stored server-side with a 24-hour TTL (time-to-live):

- **Local Development**: In-memory storage (lost on server restart) or optional Cosmos DB
- **Production**: Azure Cosmos DB NoSQL (persistent across deployments)

Sessions automatically expire after 24 hours of inactivity.

## Endpoints

### Health Check

Check if the API is running and Copilot features are available.

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

**Status Codes:**

- `200 OK` - Service is healthy

---

### OAuth Token Exchange

Exchange a GitHub OAuth authorization code for a session ID.

````http
POST /api/github-token
Content-Type: application/json
````

**Request Body:**

````json
{
  "code": "github_oauth_code_here"
}
````

**Response (Success):**

````json
{
  "session_id": "abc123-session-id-xyz789"
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

- `200 OK` - Token exchange successful
- `400 Bad Request` - Missing code or GitHub rejected the code
- `500 Internal Server Error` - Server configuration error (missing credentials)

**Notes:**

- The authorization code can only be used once
- Codes expire after 10 minutes
- The GitHub token is stored server-side and never exposed to the client

---

### Logout

Destroy the current session and invalidate the stored GitHub token.

````http
POST /api/logout
X-Session-Token: <session-id>
````

**Response:**

````json
{
  "ok": true
}
````

**Status Codes:**

- `200 OK` - Session destroyed (even if session was already invalid)

**Notes:**

- This endpoint always succeeds, even if the session doesn't exist
- After logout, the session ID is no longer valid

---

### Fetch Issues

Retrieve open GitHub issues assigned to the authenticated user.

````http
GET /api/issues?repo=<owner/repo>&labels=<label1,label2>
X-Session-Token: <session-id>
````

**Query Parameters:**

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| `repo`    | string | No       | Filter by repository (format: `owner/repo`)    |
| `labels`  | string | No       | Filter by labels (comma-separated)             |

**Response:**

````json
[
  {
    "id": 123456,
    "number": 42,
    "title": "Bug: App crashes on login",
    "state": "open",
    "labels": [
      {
        "id": 1,
        "name": "bug",
        "color": "d73a4a",
        "description": "Something isn't working"
      }
    ],
    "repository_url": "https://api.github.com/repos/owner/repo",
    "html_url": "https://github.com/owner/repo/issues/42",
    "body": "Steps to reproduce: 1. Open app 2. Click login...",
    "created_at": "2026-03-15T10:30:00Z",
    "user": {
      "login": "octocat",
      "avatar_url": "https://github.com/octocat.png"
    }
  }
]
````

**Behavior:**

- **Without `repo` filter**: Uses GitHub Search API (`assignee:@me is:open is:issue`)
- **With `repo` filter**: Uses GitHub Issues API (`/repos/{owner}/{repo}/issues`)
- **Pull requests are filtered out** - Only issues are returned
- Results are limited to 100 issues per request

**Status Codes:**

- `200 OK` - Issues retrieved successfully (may be empty array)
- `401 Unauthorized` - Session expired or invalid
- `404 Not Found` - Repository not found or user lacks access
- `500 Internal Server Error` - Network error or unexpected failure

**Example Usage:**

````bash
# All assigned issues
curl -H "X-Session-Token: abc123" \
  http://localhost:3000/api/issues

# Issues in a specific repo
curl -H "X-Session-Token: abc123" \
  "http://localhost:3000/api/issues?repo=octocat/Hello-World"

# Issues with specific labels
curl -H "X-Session-Token: abc123" \
  "http://localhost:3000/api/issues?labels=bug,help-wanted"

# Repo filter + label filter
curl -H "X-Session-Token: abc123" \
  "http://localhost:3000/api/issues?repo=octocat/Hello-World&labels=bug"
````

---

### Update Issue State

Close or reopen a GitHub issue.

````http
PATCH /api/issues/:owner/:repo/:number
X-Session-Token: <session-id>
Content-Type: application/json
````

**Path Parameters:**

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| `owner`   | string | Yes      | Repository owner (user/org)  |
| `repo`    | string | Yes      | Repository name              |
| `number`  | number | Yes      | Issue number                 |

**Request Body:**

````json
{
  "state": "closed"
}
````

**Valid States:**

- `open` - Reopen the issue
- `closed` - Close the issue

**Response:**

````json
{
  "id": 123456,
  "number": 42,
  "title": "Bug: App crashes on login",
  "state": "closed",
  "html_url": "https://github.com/owner/repo/issues/42"
}
````

**Status Codes:**

- `200 OK` - Issue state updated successfully
- `401 Unauthorized` - Session expired or invalid
- `403 Forbidden` - User lacks permission to modify the issue
- `404 Not Found` - Issue not found
- `500 Internal Server Error` - Network error or unexpected failure

**Example Usage:**

````bash
# Close an issue
curl -X PATCH \
  -H "X-Session-Token: abc123" \
  -H "Content-Type: application/json" \
  -d '{"state": "closed"}' \
  http://localhost:3000/api/issues/octocat/Hello-World/42

# Reopen an issue
curl -X PATCH \
  -H "X-Session-Token: abc123" \
  -H "Content-Type: application/json" \
  -d '{"state": "open"}' \
  http://localhost:3000/api/issues/octocat/Hello-World/42
````

**Notes:**

- Requires `repo` scope in OAuth token (not `public_repo`)
- GitHub automatically posts a comment when an issue is closed/reopened
- Users need write access to the repository to modify issues

---

### AI Summary

Generate an AI-powered summary of a GitHub issue using the GitHub Copilot SDK.

````http
POST /api/ai-summary
X-Session-Token: <session-id>
Content-Type: application/json
````

**Request Body:**

````json
{
  "issue": {
    "number": 42,
    "title": "Bug: App crashes on login",
    "body": "Steps to reproduce: 1. Open app 2. Click login...",
    "state": "open",
    "labels": [{"name": "bug"}],
    "repository": {
      "full_name": "octocat/Hello-World"
    },
    "user": {
      "login": "octocat"
    },
    "created_at": "2026-03-15T10:30:00Z"
  }
}
````

**Response (Success):**

````json
{
  "summary": "This issue reports a crash during the login flow. The bug appears to be a null pointer exception in the authentication handler. Recommended action: Assign to backend team for investigation and add error handling around the auth logic."
}
````

**Response (No Copilot Access):**

````json
{
  "error": "Copilot access required",
  "message": "AI summaries require a GitHub Copilot subscription.",
  "requiresCopilot": true
}
````

**Status Codes:**

- `200 OK` - Summary generated successfully
- `400 Bad Request` - Missing or invalid issue data
- `401 Unauthorized` - Session expired or invalid
- `403 Forbidden` - User does not have GitHub Copilot access
- `500 Internal Server Error` - Copilot SDK error or network failure

**Example Usage:**

````bash
curl -X POST \
  -H "X-Session-Token: abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "issue": {
      "number": 42,
      "title": "Bug: App crashes on login",
      "body": "Steps to reproduce: ...",
      "state": "open",
      "labels": [{"name": "bug"}],
      "repository": {"full_name": "octocat/Hello-World"}
    }
  }' \
  http://localhost:3000/api/ai-summary
````

**Requirements:**

- User must have an active **GitHub Copilot subscription**
- GitHub token must have `copilot` scope (automatically included with `repo` scope)
- Copilot SDK uses the `gpt-4.1` model with a 30-second timeout

**Notes:**

- The AI summary is generated fresh on each request (not cached)
- Summaries are 2-3 sentences designed for quick triage decisions
- The SDK automatically cleans up resources (session/client) after each request

---

## Error Handling

All error responses follow a consistent JSON structure:

````json
{
  "error": "Error message here",
  "message": "Optional detailed explanation"
}
````

### Common Error Scenarios

#### Session Expired (401)

````json
{
  "error": "Session expired or invalid. Please sign in again."
}
````

**Cause:** The session ID is invalid, expired (>24 hours old), or has been logged out.

**Solution:** Redirect the user to re-authenticate via GitHub OAuth.

#### GitHub Token Invalid (401)

````json
{
  "error": "Unauthorized. Please sign in again."
}
````

**Cause:** The stored GitHub token has been revoked or is invalid.

**Solution:** User must re-authenticate to get a fresh token.

#### Copilot Access Required (403)

````json
{
  "error": "Copilot access required",
  "message": "AI summaries require a GitHub Copilot subscription.",
  "requiresCopilot": true
}
````

**Cause:** User attempted to use AI summary without a Copilot subscription.

**Solution:** Upgrade to GitHub Copilot or hide AI features in the UI.

#### Repository Not Found (404)

````json
{
  "error": "Repository not found or you lack access."
}
````

**Cause:** The repository doesn't exist or the user doesn't have read access.

**Solution:** Verify the repository name and user permissions.

---

## Rate Limiting

IssueCrush respects GitHub's API rate limits:

- **Authenticated requests**: 5,000 requests/hour per user
- **Search API**: 30 requests/minute per user

**Rate Limit Headers:**

GitHub returns rate limit information in response headers:

````http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1680307200
````

**Handling Rate Limits:**

When you exceed the rate limit, GitHub returns `403 Forbidden`:

````json
{
  "message": "API rate limit exceeded",
  "documentation_url": "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"
}
````

**Best Practices:**

- Cache issue data on the client to reduce API calls
- Use the `repo` filter to avoid expensive search queries
- Monitor `X-RateLimit-Remaining` header and throttle requests proactively

---

## Related Documentation

- [Architecture Guide](../architecture/README.md) - System design and data flow
- [GitHub REST API](https://docs.github.com/rest) - Official GitHub API docs
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) - Copilot integration guide
- [Azure Functions](https://learn.microsoft.com/azure/azure-functions/) - Production hosting platform
