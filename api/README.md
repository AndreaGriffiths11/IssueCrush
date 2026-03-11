# IssueCrush API (Azure Functions)

This directory contains the Azure Functions backend that powers IssueCrush's authentication and AI features.

## Overview

The API provides three core services:

1. **GitHub OAuth** - Secure token exchange and session management
2. **GitHub API Proxy** - Fetch and manage issues with user's OAuth token
3. **AI Summaries** - GitHub Copilot-powered issue analysis

## Architecture

````
api/
├── src/
│   ├── app.js          # Azure Functions HTTP triggers
│   └── sessionStore.js # Cosmos DB session management
├── host.json           # Azure Functions host configuration
├── local.settings.json # Local development environment
└── package.json        # Backend-specific dependencies
````

## Dependencies

### Production Dependencies

- **`@azure/functions`** (^4.7.0) - Azure Functions runtime
- **`@azure/cosmos`** (^4.3.1) - Azure Cosmos DB client
- **`@github/copilot-sdk`** (^0.1.32) - GitHub Copilot AI integration

### Version Notes

- **Node.js 20+** required (specified in `engines`)
- **ESM modules** used (`"type": "module"`)
- All dependencies are independently versioned from the main app

## API Endpoints

### Health Check

````http
GET /api/health
````

Returns API status and Copilot availability.

**Response:**
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

### OAuth Token Exchange

````http
POST /api/github-token
````

Exchanges GitHub OAuth authorization code for access token, stores it server-side, and returns a session ID.

**Request Body:**
````json
{
  "code": "github_oauth_code_here"
}
````

**Response:**
````json
{
  "sessionToken": "uuid-session-id"
}
````

### Fetch Issues

````http
GET /api/issues?owner=owner&repo=repo
Authorization: session-token-here
````

Fetches open issues from specified repository using the user's OAuth token.

**Query Parameters:**
- `owner` (required) - Repository owner
- `repo` (optional) - Repository name (omit for all user's repos)

**Headers:**
- `Authorization: <session-token>` - Session token from OAuth exchange

**Response:**
````json
[
  {
    "id": 123,
    "number": 45,
    "title": "Issue title",
    "body": "Issue description",
    "state": "open",
    "user": { "login": "username" },
    "created_at": "2026-03-11T00:00:00Z"
  }
]
````

### Close Issue

````http
POST /api/close-issue
Authorization: session-token-here
````

Closes a GitHub issue.

**Request Body:**
````json
{
  "owner": "owner-name",
  "repo": "repo-name",
  "issueNumber": 45
}
````

### Reopen Issue

````http
POST /api/reopen-issue
Authorization: session-token-here
````

Reopens a previously closed issue.

**Request Body:**
````json
{
  "owner": "owner-name",
  "repo": "repo-name",
  "issueNumber": 45
}
````

### AI Summary

````http
POST /api/ai-summary
Authorization: session-token-here
````

Generates an AI-powered summary and analysis of a GitHub issue using GitHub Copilot SDK.

**Request Body:**
````json
{
  "issueTitle": "Issue title",
  "issueBody": "Issue description and details"
}
````

**Response:**
````json
{
  "summary": "AI-generated analysis of the issue..."
}
````

**Requirements:**
- User must have GitHub Copilot subscription
- `GH_TOKEN` or `COPILOT_PAT` environment variable must be set with Copilot access

### Sign Out

````http
POST /api/signout
Authorization: session-token-here
````

Destroys the server-side session and invalidates the session token.

## Session Management

Sessions are stored in Azure Cosmos DB with the following characteristics:

- **Container:** `sessions` in database `issuecrush`
- **Partition Key:** `/id` (session ID)
- **TTL:** 24 hours (automatic cleanup)
- **Schema:**
  ````json
  {
    "id": "session-uuid",
    "githubToken": "encrypted-token",
    "createdAt": "2026-03-11T12:00:00Z"
  }
  ````

### Fallback Storage

If Cosmos DB credentials are not configured, sessions fall back to in-memory storage (suitable for local development but not production).

## Environment Variables

### Required for OAuth

- `EXPO_PUBLIC_GITHUB_CLIENT_ID` - GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App client secret

### Required for Cosmos DB

- `COSMOS_ENDPOINT` - Cosmos DB account endpoint
- `COSMOS_KEY` - Cosmos DB primary key
- `COSMOS_DATABASE` - Database name (default: `issuecrush`)
- `COSMOS_CONTAINER` - Container name (default: `sessions`)

### Required for AI Features

- `GH_TOKEN` or `COPILOT_PAT` - GitHub token with Copilot access

## Local Development

### Using Express (Recommended)

The root `server.js` mirrors this API for local development:

````bash
cd /home/runner/work/IssueCrush/IssueCrush
npm run server  # Starts Express on port 3000
````

This is easier for local testing and automatically loads `.env` variables.

### Using Azure Functions Core Tools

For testing Azure Functions runtime locally:

````bash
cd api/
npm install
func start  # Requires Azure Functions Core Tools
````

## Deployment

### Azure Static Web Apps

When deployed to Azure SWA, functions are automatically deployed from this directory.

**Configuration:**
- Functions are proxied through `/api/*` routes
- Environment variables set in Azure Portal → Configuration
- Managed API routes defined in `staticwebapp.config.json`

### Manual Deployment

````bash
# Build and deploy API only
cd api/
npm ci
func azure functionapp publish <function-app-name>
````

## Security Notes

- **Session tokens** are UUIDs, not JWT (no client-side decoding)
- **GitHub tokens** never exposed to frontend
- **Authorization header** intercepted by Azure SWA; use `X-Session-Token` in production
- **CORS** configured per deployment (permissive in dev, restricted in prod)

## Troubleshooting

### "Copilot session creation failed"

Ensure `@github/copilot-sdk` version is 0.1.32+ and `approveAll` handler is configured:

````javascript
import { CopilotClient, approveAll } from '@github/copilot-sdk';
const session = await client.createSession({
  onPermissionRequest: approveAll,  // Required in v0.1.32+
});
````

### "Cannot find module error"

Run `npm install` in the `api/` directory (separate from root).

### "Cosmos DB connection failed"

Check that all `COSMOS_*` environment variables are set. Without them, sessions fall back to in-memory storage.

## Testing

Tests are located in the root directory:

````bash
cd ..
npm test -- server.test.js  # Test Express mirror of API
````

## Version History

| Version | Copilot SDK | Notes |
|---------|-------------|-------|
| 1.0.0   | 0.1.32      | Security update resolving Dependabot alert #17 |

---

**Related Documentation:**
- [Main README](../README.md) - Full application documentation
- [SECURITY.md](../SECURITY.md) - Security policy and best practices
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) - AI integration documentation
