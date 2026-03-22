# API Reference

## Overview

IssueCrush provides a backend API for GitHub OAuth authentication, session management, and GitHub API proxying. The API runs on Azure Functions in production and Express.js locally.

## Base URL

- **Production:** `https://gray-water-08b04e810.6.azurestaticapps.net/api`
- **Local Development:** `http://localhost:3000/api`

## Authentication

All API endpoints (except `/health` and `/github-token`) require authentication via session token.

### Session Token Header

````http
X-Session-Token: <session_id>
````

**Note:** Azure Static Web Apps intercepts the `Authorization` header, so we use `X-Session-Token` instead.

## Endpoints

### Health Check

Check API server status and Copilot availability.

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

### OAuth Token Exchange

Exchange GitHub OAuth authorization code for a session token.

````http
POST /api/github-token
Content-Type: application/json

{
  "code": "github_oauth_code"
}
````

**Response (Success):**

````json
{
  "session_id": "unique_session_id"
}
````

**Response (Error):**

````json
{
  "error": "error_code",
  "error_description": "Human-readable error message"
}
````

**Error Codes:**

| Code | Description |
|------|-------------|
| `400` | No authorization code provided |
| `500` | Missing GitHub credentials on server |
| `502` | GitHub OAuth service error |

### Fetch Issues

Retrieve GitHub issues for authenticated user.

````http
GET /api/issues?repo=owner/repo&labels=bug,feature
X-Session-Token: <session_id>
````

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | No | Repository filter (format: `owner/repo`) |
| `labels` | string | No | Comma-separated label filters |

**Response:**

````json
[
  {
    "id": 123456,
    "number": 42,
    "title": "Issue title",
    "state": "open",
    "labels": [
      {
        "id": 789,
        "name": "bug",
        "color": "d73a4a",
        "description": "Something isn't working"
      }
    ],
    "repository_url": "https://api.github.com/repos/owner/repo",
    "html_url": "https://github.com/owner/repo/issues/42",
    "repository": {
      "full_name": "owner/repo"
    },
    "body": "Issue description",
    "created_at": "2026-01-01T00:00:00Z",
    "user": {
      "login": "username",
      "avatar_url": "https://avatars.githubusercontent.com/u/123"
    }
  }
]
````

**Error Responses:**

| Status | Description |
|--------|-------------|
| `401` | Session expired or invalid |
| `404` | Repository not found or no access |
| `500` | Internal server error |

### Update Issue State

Close or reopen a GitHub issue.

````http
PATCH /api/issues/:owner/:repo/:number
Content-Type: application/json
X-Session-Token: <session_id>

{
  "state": "closed"
}
````

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `owner` | string | Repository owner |
| `repo` | string | Repository name |
| `number` | number | Issue number |

**Request Body:**

````json
{
  "state": "open" | "closed"
}
````

**Response:**

````json
{
  "id": 123456,
  "number": 42,
  "state": "closed",
  "title": "Issue title",
  ...
}
````

### AI Summary

Generate AI-powered issue analysis using GitHub Copilot SDK.

````http
POST /api/ai-summary
Content-Type: application/json
X-Session-Token: <session_id>

{
  "issue": {
    "title": "Issue title",
    "body": "Issue description",
    "number": 42,
    "repository": {
      "full_name": "owner/repo"
    }
  }
}
````

**Request Body:**

````json
{
  "issue": {
    "title": "string",
    "body": "string",
    "number": "number",
    "repository": {
      "full_name": "string"
    }
  }
}
````

**Response:**

````json
{
  "summary": "AI-generated analysis of the issue including context, requirements, and recommended next steps."
}
````

**Error Responses:**

| Status | Description |
|--------|-------------|
| `400` | Missing issue data |
| `401` | Session expired or invalid |
| `500` | Copilot SDK error or missing credentials |

**Requirements:**

- Server must have `GH_TOKEN` or `COPILOT_PAT` environment variable with Copilot access
- GitHub Copilot subscription or access required

### Logout

Destroy user session.

````http
POST /api/logout
X-Session-Token: <session_id>
````

**Response:**

````json
{
  "message": "Session destroyed"
}
````

## Session Storage

Sessions are stored with a 24-hour TTL (time-to-live). Session data includes:

````json
{
  "id": "unique_session_id",
  "githubToken": "encrypted_github_token",
  "createdAt": "ISO-8601-timestamp",
  "expiresAt": "ISO-8601-timestamp"
}
````

### Storage Backend

- **Production:** Azure Cosmos DB NoSQL
  - Account: `issuecrush-cosmos`
  - Database: `issuecrush`
  - Container: `sessions`
  - Partition key: `/id`
  
- **Local Development:** In-memory storage (sessions lost on server restart)

## Error Handling

All endpoints follow consistent error response format:

````json
{
  "error": "error_message"
}
````

HTTP status codes follow REST conventions:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad request (invalid input) |
| `401` | Unauthorized (session expired/invalid) |
| `404` | Not found |
| `500` | Internal server error |
| `502` | External service error (GitHub) |

## Rate Limiting

GitHub API rate limits apply:

- **Authenticated requests:** 5,000 requests/hour
- **Unauthenticated requests:** 60 requests/hour

The API does not implement additional rate limiting beyond GitHub's limits.

## CORS

CORS is enabled for all origins in development. In production, Azure Static Web Apps handles CORS configuration.

## Security

- OAuth client secret is never exposed to the frontend
- All GitHub API calls use the user's OAuth token (stored server-side)
- Tokens are stored securely:
  - Mobile: `expo-secure-store`
  - Web: `@react-native-async-storage/async-storage`
- Session tokens expire after 24 hours
- Azure SWA intercepts `Authorization` header, so `X-Session-Token` is used instead

## Environment Variables

Required server-side environment variables:

````bash
# GitHub OAuth
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Copilot SDK (optional, for AI summaries)
GH_TOKEN=github_token_with_copilot_access
# OR
COPILOT_PAT=copilot_personal_access_token

# Azure Cosmos DB (optional, falls back to in-memory)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

## Client SDK

The frontend provides a typed client in `src/api/github.ts`:

````typescript
import { fetchIssues, updateIssueState, GitHubIssue } from './api/github';

// Fetch issues
const issues: GitHubIssue[] = await fetchIssues(sessionId, 'owner/repo', 'bug');

// Close issue
await updateIssueState(sessionId, issue, 'closed');

// Reopen issue
await updateIssueState(sessionId, issue, 'open');
````

AI summary service in `src/lib/copilotService.ts`:

````typescript
import { copilotService } from './lib/copilotService';

// Get AI summary
const result = await copilotService.summarizeIssue(issue);
console.log(result.summary);
````

## Testing

Test the API locally:

````bash
# Start server
npm run server

# Health check
curl http://localhost:3000/api/health

# Test with session token
curl -H "X-Session-Token: your_session_id" \
  http://localhost:3000/api/issues
````

Run the test suite:

````bash
npm test
````

## Deployment

The API is deployed as Azure Functions (Node.js 20, ESM):

- **Trigger:** Push to `main` branch
- **Platform:** Azure Static Web Apps
- **Function App:** `api/` directory
- **Runtime:** Node.js 20
- **Module System:** ESM (type: "module" in package.json)

Configuration is managed in `.github/workflows/azure-swa.yml`.
