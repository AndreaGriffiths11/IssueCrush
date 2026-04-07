# IssueCrush API Documentation

This document describes the backend API endpoints provided by IssueCrush. The API handles OAuth authentication, GitHub API proxying, and AI-powered issue summaries.

## Base URL

**Local Development:** `http://localhost:3000`  
**Production (Azure SWA):** `https://gray-water-08b04e810.6.azurestaticapps.net`

## Authentication

All API endpoints (except OAuth flow and health check) require a session token passed via the `X-Session-Token` header:

````http
X-Session-Token: <session_id>
````

The session ID is obtained after completing the GitHub OAuth flow via the `/api/github-token` endpoint.

---

## Endpoints

### Health Check

Check if the API server is running and whether AI summaries are available.

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

---

### OAuth Token Exchange

Exchange a GitHub OAuth authorization code for a session ID. The access token is stored server-side and never exposed to the client.

**Endpoint:** `POST /api/github-token`

**Authentication:** None required

**Request Body:**
````json
{
  "code": "github_oauth_code_here"
}
````

**Success Response (200):**
````json
{
  "session_id": "uuid-session-identifier"
}
````

**Error Responses:**

- **400 Bad Request** - Missing code or GitHub OAuth error
  ````json
  {
    "error": "bad_verification_code",
    "error_description": "The code passed is incorrect or expired."
  }
  ````

- **500 Internal Server Error** - Missing GitHub credentials
  ````json
  {
    "error": "Missing GitHub credentials"
  }
  ````

---

### Logout

Destroy the user's session and invalidate the session token.

**Endpoint:** `POST /api/logout`

**Authentication:** Required (`X-Session-Token` header)

**Response (200):**
````json
{
  "message": "Logged out successfully"
}
````

---

### List Issues

Fetch open GitHub issues assigned to or created by the authenticated user.

**Endpoint:** `GET /api/issues`

**Authentication:** Required (`X-Session-Token` header)

**Query Parameters:**

| Parameter | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| `repo`    | string | No       | Filter by repository (format: `owner/repo`)      |
| `labels`  | string | No       | Filter by comma-separated labels (e.g., `bug,help wanted`) |

**Success Response (200):**
````json
[
  {
    "id": 123456789,
    "number": 42,
    "title": "Add dark mode support",
    "state": "open",
    "html_url": "https://github.com/owner/repo/issues/42",
    "repository_url": "https://api.github.com/repos/owner/repo",
    "body": "Issue description...",
    "created_at": "2024-01-15T10:30:00Z",
    "labels": [
      {
        "id": 987654321,
        "name": "enhancement",
        "color": "a2eeef",
        "description": "New feature or request"
      }
    ],
    "user": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/u/123456?v=4"
    },
    "repository": {
      "full_name": "owner/repo"
    }
  }
]
````

**Error Responses:**

- **401 Unauthorized** - Invalid or expired session
  ````json
  {
    "error": "Unauthorized"
  }
  ````

- **500 Internal Server Error** - GitHub API error
  ````json
  {
    "error": "Failed to fetch issues from GitHub"
  }
  ````

---

### Close Issue

Close a specific GitHub issue.

**Endpoint:** `POST /api/issues/close`

**Authentication:** Required (`X-Session-Token` header)

**Request Body:**
````json
{
  "owner": "repository-owner",
  "repo": "repository-name",
  "issue_number": 42
}
````

**Success Response (200):**
````json
{
  "message": "Issue closed",
  "issue": {
    "number": 42,
    "state": "closed",
    "title": "Add dark mode support",
    "html_url": "https://github.com/owner/repo/issues/42"
  }
}
````

**Error Responses:**

- **400 Bad Request** - Missing required parameters
  ````json
  {
    "error": "Missing required parameters"
  }
  ````

- **401 Unauthorized** - Invalid or expired session
  ````json
  {
    "error": "Unauthorized"
  }
  ````

- **500 Internal Server Error** - Failed to close issue
  ````json
  {
    "error": "Failed to close issue"
  }
  ````

---

### Reopen Issue

Reopen a closed GitHub issue.

**Endpoint:** `POST /api/issues/reopen`

**Authentication:** Required (`X-Session-Token` header)

**Request Body:**
````json
{
  "owner": "repository-owner",
  "repo": "repository-name",
  "issue_number": 42
}
````

**Success Response (200):**
````json
{
  "message": "Issue reopened",
  "issue": {
    "number": 42,
    "state": "open",
    "title": "Add dark mode support",
    "html_url": "https://github.com/owner/repo/issues/42"
  }
}
````

**Error Responses:**

- **400 Bad Request** - Missing required parameters
  ````json
  {
    "error": "Missing required parameters"
  }
  ````

- **401 Unauthorized** - Invalid or expired session
  ````json
  {
    "error": "Unauthorized"
  }
  ````

- **500 Internal Server Error** - Failed to reopen issue
  ````json
  {
    "error": "Failed to reopen issue"
  }
  ````

---

### AI Issue Summary

Generate an AI-powered summary and analysis of a GitHub issue using GitHub Copilot.

**Endpoint:** `POST /api/ai-summary`

**Authentication:** Required (`X-Session-Token` header)

**Request Body:**
````json
{
  "title": "Add dark mode support",
  "body": "It would be great to have a dark mode option...",
  "repo": "owner/repo"
}
````

**Success Response (200):**
````json
{
  "summary": "This issue requests adding dark mode support to improve accessibility and user experience. The implementation should include:\n\n1. Theme toggle component in settings\n2. CSS/styling updates for dark colors\n3. Persist user preference in localStorage\n\nRecommended approach: Use CSS custom properties for theming and React Context for state management."
}
````

**Error Responses:**

- **400 Bad Request** - Missing required fields
  ````json
  {
    "error": "Missing title or body"
  }
  ````

- **401 Unauthorized** - Invalid or expired session
  ````json
  {
    "error": "Unauthorized - Please log in again"
  }
  ````

- **500 Internal Server Error** - AI service unavailable
  ````json
  {
    "error": "AI summary unavailable - missing Copilot access"
  }
  ````

**Requirements:**
- Server must have `GH_TOKEN` or `COPILOT_PAT` environment variable set
- The token must have GitHub Copilot access
- Request body must include both `title` and `body` fields

---

## Session Storage

Sessions are stored with the following characteristics:

- **TTL (Time To Live):** 24 hours
- **Storage:** Azure Cosmos DB (production) or in-memory (development)
- **Partition Key:** Session ID

When a session expires or is invalid, clients receive a `401 Unauthorized` response and should prompt the user to re-authenticate via the OAuth flow.

---

## Error Handling

All endpoints return JSON error responses with the following structure:

````json
{
  "error": "Human-readable error message"
}
````

Standard HTTP status codes are used:
- `200 OK` - Request succeeded
- `400 Bad Request` - Invalid or missing parameters
- `401 Unauthorized` - Authentication required or invalid session
- `500 Internal Server Error` - Server or external service error

---

## Rate Limiting

The API respects GitHub's rate limits. Authenticated requests have a limit of 5,000 requests per hour per user. When rate limited, the GitHub API returns a `403 Forbidden` response with:

````json
{
  "message": "API rate limit exceeded",
  "documentation_url": "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"
}
````

---

## Development Setup

To run the API locally:

````bash
# Install dependencies
npm install

# Configure environment variables in .env
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GH_TOKEN=your_copilot_token  # Optional, for AI summaries

# Start the server
npm run server
````

The server will start on `http://localhost:3000`.

---

## Security Considerations

- **Client Secret Protection:** The `GITHUB_CLIENT_SECRET` is never exposed to the client. All OAuth token exchanges happen server-side.
- **Session Storage:** User access tokens are stored server-side and never sent to the client. Clients only receive a session ID.
- **Token Scope:** OAuth scope must be set to `repo` (not `public_repo`) to enable closing issues.
- **HTTPS:** Production deployments must use HTTPS to protect session tokens in transit.
- **CORS:** The server enforces CORS policies to prevent unauthorized cross-origin requests.

---

## Azure Static Web Apps Configuration

When deployed to Azure Static Web Apps, API routes are automatically mapped:

- Frontend: `/*` → Static files
- API routes: `/api/*` → Azure Functions backend

See `staticwebapp.config.json` for routing configuration.
