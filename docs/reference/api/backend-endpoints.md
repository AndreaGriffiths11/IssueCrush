# Backend API Endpoints Reference

Reference documentation for Azure Functions / Express API endpoints.

## Authentication

All endpoints (except `/api/github-token`) require the `X-Session-Token` header:

````http
X-Session-Token: session_abc123
````

## Endpoints

### POST /api/github-token

Exchange GitHub OAuth code for session ID.

**Request:**
````json
{
  "code": "github_oauth_code_here"
}
````

**Response:**
````json
{
  "session_id": "session_abc123"
}
````

**Errors:**
- `400` - Missing code
- `500` - GitHub token exchange failed

### GET /api/issues

Fetch user's GitHub issues.

**Query Parameters:**
- `repo` (optional) - Repository filter (`owner/repo`)
- `labels` (optional) - Label filter

**Response:**
````json
[
  {
    "id": 123,
    "number": 456,
    "title": "Bug in login",
    "state": "open",
    ...
  }
]
````

**Errors:**
- `401` - Session expired
- `404` - Repository not found
- `500` - GitHub API error

### PATCH /api/issues/:owner/:repo/:number

Update issue state.

**Request:**
````json
{
  "state": "closed"
}
````

**Response:** Updated issue object

**Errors:**
- `401` - Session expired
- `404` - Issue not found
- `500` - GitHub API error

### POST /api/ai-summary

Generate AI summary for an issue.

**Request:**
````json
{
  "issue": {
    "title": "...",
    "body": "...",
    ...
  }
}
````

**Response:**
````json
{
  "summary": "AI-generated summary text",
  "fallback": false
}
````

**Errors:**
- `401` - Session expired
- `403` - Copilot access required
- `500` - AI generation failed

### POST /api/logout

Delete session.

**Response:**
````json
{
  "message": "Logged out"
}
````

### GET /api/health

Health check and Copilot status.

**Response:**
````json
{
  "status": "healthy",
  "copilotMode": "copilot-sdk",
  "copilotAvailable": true
}
````

## Related Documentation

- [Hooks API Reference](./hooks.md)
- [GitHub Client API](./github-client.md)
- [Architecture Overview](../../architecture/overview.md)
