# Environment Variables

Complete reference for configuring IssueCrush.

## Required Variables

### EXPO_PUBLIC_GITHUB_CLIENT_ID

GitHub OAuth App Client ID.

**Required:** Yes  
**Platform:** All  
**Example:** `Ov23liAbC123XyZ`

Create a GitHub OAuth App at https://github.com/settings/developers to obtain this value.

---

### GITHUB_CLIENT_SECRET

GitHub OAuth App Client Secret.

**Required:** Yes (server-side only)  
**Platform:** Server (never expose to client)  
**Example:** `ghp_abc123...`

⚠️ **Security Warning:** Never commit this value to source control or expose it to the frontend. Use environment variables or secret management.

---

### EXPO_PUBLIC_GITHUB_SCOPE

OAuth scope for GitHub API access.

**Required:** Yes  
**Platform:** All  
**Default:** `repo`  
**Example:** `repo`

Must be `repo` (not `public_repo`) to enable closing issues. See [GitHub OAuth Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps).

---

## Optional Variables

### EXPO_PUBLIC_API_URL

Backend API base URL.

**Required:** No  
**Platform:** All  
**Default (local):** `http://localhost:3000`  
**Default (production):** Same origin  
**Example:** `https://your-app.azurestaticapps.net`

Points the frontend to the backend API. In production (Azure SWA), defaults to the same origin since both frontend and API are served together.

---

### EXPO_PUBLIC_REDIRECT_URI

OAuth callback URL for web flow.

**Required:** No  
**Platform:** Web only  
**Default:** `window.location.origin`  
**Example:** `http://localhost:8081`

Override the default OAuth redirect URI. Useful for custom domains or non-standard ports.

---

## AI Features (Optional)

### GH_TOKEN

GitHub personal access token with Copilot access.

**Required:** No (disables AI summaries if missing)  
**Platform:** Server only  
**Example:** `ghp_abc123...`

Required for AI summary features. Must have Copilot subscription/access. Alternative to `COPILOT_PAT`.

---

### COPILOT_PAT

Dedicated Copilot personal access token.

**Required:** No (disables AI summaries if missing)  
**Platform:** Server only  
**Example:** `ghp_abc123...`

Alternative to `GH_TOKEN`. Use if you want separate tokens for OAuth and Copilot features.

---

## Session Storage (Optional)

### COSMOS_ENDPOINT

Azure Cosmos DB account endpoint.

**Required:** No (falls back to in-memory storage)  
**Platform:** Server only  
**Example:** `https://issuecrush-cosmos.documents.azure.com:443/`

Enables persistent session storage across server restarts and multiple instances.

---

### COSMOS_KEY

Azure Cosmos DB primary key.

**Required:** If `COSMOS_ENDPOINT` is set  
**Platform:** Server only  
**Example:** `abc123...==`

Find this in Azure Portal → Cosmos DB account → Keys.

---

### COSMOS_DATABASE

Cosmos DB database name.

**Required:** If `COSMOS_ENDPOINT` is set  
**Platform:** Server only  
**Default:** `issuecrush`  
**Example:** `issuecrush`

Database is auto-created if it doesn't exist.

---

### COSMOS_CONTAINER

Cosmos DB container name.

**Required:** If `COSMOS_ENDPOINT` is set  
**Platform:** Server only  
**Default:** `sessions`  
**Example:** `sessions`

Container is auto-created with:
- Partition key: `/id`
- TTL: 24 hours (automatic session expiry)

---

## Platform-Specific Behavior

### Variable Prefix

- **`EXPO_PUBLIC_`** - Exposed to frontend (mobile + web)
- **No prefix** - Server-side only (never exposed to client)

Expo automatically inlines `EXPO_PUBLIC_*` variables at build time. Never prefix secrets with `EXPO_PUBLIC_`.

---

## Configuration Examples

### Local Development (.env)

````bash
# GitHub OAuth (required)
EXPO_PUBLIC_GITHUB_CLIENT_ID=Ov23liAbC123XyZ
GITHUB_CLIENT_SECRET=ghp_abc123...
EXPO_PUBLIC_GITHUB_SCOPE=repo

# Local API URL (optional)
EXPO_PUBLIC_API_URL=http://localhost:3000

# AI Features (optional - enables "Get AI Summary")
GH_TOKEN=ghp_abc123...

# Session Storage (optional - in-memory fallback)
# COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
# COSMOS_KEY=abc123...==
# COSMOS_DATABASE=issuecrush
# COSMOS_CONTAINER=sessions
````

### Azure Static Web Apps (Production)

Set in Azure Portal → Static Web App → Configuration:

````bash
# GitHub OAuth (required)
EXPO_PUBLIC_GITHUB_CLIENT_ID=Ov23liAbC123XyZ
GITHUB_CLIENT_SECRET=ghp_abc123...
EXPO_PUBLIC_GITHUB_SCOPE=repo

# AI Features (optional)
GH_TOKEN=ghp_abc123...

# Session Storage (recommended for production)
COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
COSMOS_KEY=abc123...==
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

No need to set `EXPO_PUBLIC_API_URL` - it defaults to same origin in production.

---

## Security Best Practices

### ✅ Do

- Use `.env` for local development
- Add `.env` to `.gitignore`
- Use Azure Key Vault or similar for production secrets
- Rotate tokens periodically
- Use minimal OAuth scopes required
- Set secrets in Azure Portal configuration, not source code

### ❌ Don't

- Commit `.env` files to source control
- Share credentials in chat/email
- Use the same token for multiple environments
- Prefix secrets with `EXPO_PUBLIC_`
- Store secrets in client-side code or logs

---

## Troubleshooting

### "Missing GitHub credentials" error

**Cause:** `EXPO_PUBLIC_GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET` not set.

**Fix:** Create a GitHub OAuth App and set both variables.

---

### "AI summary failed" error

**Cause:** `GH_TOKEN` or `COPILOT_PAT` missing or lacks Copilot access.

**Fix:** 
1. Ensure you have a GitHub Copilot subscription
2. Create a PAT with Copilot access
3. Set `GH_TOKEN` or `COPILOT_PAT` environment variable

---

### OAuth callback fails in production

**Cause:** OAuth App callback URL doesn't match production URL.

**Fix:** 
1. Go to https://github.com/settings/developers
2. Edit your OAuth App
3. Update "Authorization callback URL" to match your Azure SWA URL

---

### Sessions lost on server restart

**Cause:** Using in-memory session storage (no Cosmos DB configured).

**Fix:** 
1. Create Azure Cosmos DB account (NoSQL API)
2. Set `COSMOS_ENDPOINT` and `COSMOS_KEY` environment variables
3. Restart server

---

## Environment Variable Precedence

1. `.env` file (local development)
2. Azure Static Web App configuration (production)
3. System environment variables
4. Default values (if any)

---

## See Also

- [Main README - Quick Start](../../README.md#quick-start)
- [Deployment Guide](../how-to/deployment.md)
- [Authentication Flow](../explanation/auth-flow.md)
