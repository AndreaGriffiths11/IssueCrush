# API Reference

IssueCrush backend API provides GitHub OAuth authentication, session management, and AI-powered issue summaries.

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: `https://gray-water-08b04e810.6.azurestaticapps.net`

## Authentication

All protected endpoints require a session token passed via the `X-Session-Token` header:

````http
X-Session-Token: <session_id>
````

Session tokens are obtained through the OAuth flow (see [GitHub Token Exchange](#github-token-exchange)).

## Endpoints

### Health Check

Check API availability and feature status.

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

### GitHub Token Exchange

Exchange a GitHub OAuth authorization code for a session token.

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

**Success Response**

````json
{
  "session_id": "uuid-v4-session-token"
}
````

**Error Response**

````json
{
  "error": "No authorization code provided"
}
````

### Fetch Issues

Retrieve GitHub issues assigned to or created by the authenticated user.

````http
GET /api/issues?repo=owner/repo&labels=bug,enhancement
X-Session-Token: <session_id>
````

**Query Parameters**

| Parameter | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| repo      | string | No       | Filter by repository (owner/name)    |
| labels    | string | No       | Comma-separated list of label names  |

**Response**

````json
[
  {
    "id": 123456789,
    "number": 42,
    "title": "Add swipe gestures",
    "state": "open",
    "body": "Issue description...",
    "html_url": "https://github.com/owner/repo/issues/42",
    "repository_url": "https://api.github.com/repos/owner/repo",
    "labels": [
      {
        "id": 987654321,
        "name": "enhancement",
        "color": "a2eeef",
        "description": "New feature or request"
      }
    ],
    "user": {
      "login": "octocat",
      "avatar_url": "https://avatars.githubusercontent.com/u/583231"
    },
    "created_at": "2026-03-15T10:30:00Z"
  }
]
````

**Error Responses**

| Status | Error                                           |
|--------|-------------------------------------------------|
| 401    | Session expired. Please sign in again.          |
| 404    | Repository not found or you lack access.        |
| 500    | Failed to fetch issues.                         |

### Update Issue State

Open or close a GitHub issue.

````http
PATCH /api/issues/:owner/:repo/:issue_number
X-Session-Token: <session_id>
Content-Type: application/json
````

**Path Parameters**

| Parameter    | Type   | Description           |
|--------------|--------|-----------------------|
| owner        | string | Repository owner      |
| repo         | string | Repository name       |
| issue_number | number | Issue number          |

**Request Body**

````json
{
  "state": "closed"
}
````

**Response**

````json
{
  "id": 123456789,
  "number": 42,
  "title": "Add swipe gestures",
  "state": "closed",
  "html_url": "https://github.com/owner/repo/issues/42"
}
````

**Error Responses**

| Status | Error                              |
|--------|------------------------------------|
| 401    | Session expired or unauthorized    |
| 403    | Insufficient permissions           |
| 404    | Issue not found                    |

### Get AI Summary

Generate an AI-powered summary of a GitHub issue using GitHub Copilot SDK.

````http
POST /api/ai-summary
X-Session-Token: <session_id>
Content-Type: application/json
````

**Request Body**

````json
{
  "issueNumber": 42,
  "issueTitle": "Add swipe gestures",
  "issueBody": "We should add support for...",
  "repoName": "owner/repo"
}
````

**Response**

````json
{
  "summary": "This issue requests adding swipe gesture support for mobile devices. Key technical requirements include touch event handling and gesture recognition. Recommended next steps: 1) Research react-native-gesture-handler, 2) Create a proof of concept..."
}
````

**Error Responses**

| Status | Error                                               |
|--------|-----------------------------------------------------|
| 400    | Missing required fields                             |
| 401    | Session expired or unauthorized                     |
| 503    | GitHub Copilot SDK unavailable or subscription issue|

### Logout

Destroy the user session and invalidate the session token.

````http
POST /api/logout
X-Session-Token: <session_id>
````

**Response**

````json
{
  "success": true
}
````

## Rate Limiting

GitHub API enforces rate limits:

- **Authenticated requests**: 5,000 requests/hour
- **Search API**: 30 requests/minute

The API does not implement additional rate limiting beyond GitHub's limits.

## Error Format

All error responses follow this structure:

````json
{
  "error": "Human-readable error message"
}
````

## CORS

The API allows cross-origin requests from:

- `http://localhost:8081` (local development)
- Production domain (Azure Static Web Apps)

## Session Storage

Sessions are stored in:

- **Production**: Azure Cosmos DB (NoSQL API)
- **Local Development**: In-memory storage (lost on server restart)

Sessions expire after 24 hours of inactivity.

## Environment Variables

The API requires these environment variables:

| Variable                     | Required | Description                        |
|------------------------------|----------|------------------------------------|
| EXPO_PUBLIC_GITHUB_CLIENT_ID | Yes      | GitHub OAuth App client ID         |
| GITHUB_CLIENT_SECRET         | Yes      | GitHub OAuth App client secret     |
| GH_TOKEN or COPILOT_PAT      | No       | Token for GitHub Copilot access    |
| COSMOS_ENDPOINT              | No       | Azure Cosmos DB endpoint           |
| COSMOS_KEY                   | No       | Azure Cosmos DB primary key        |
| COSMOS_DATABASE              | No       | Cosmos DB database name            |
| COSMOS_CONTAINER             | No       | Cosmos DB container name           |

## See Also

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps)
- [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/)
