# IssueCrush Troubleshooting Guide

This guide helps you diagnose and fix common issues when running or deploying IssueCrush.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [AI Summary Issues](#ai-summary-issues)
- [Build and Bundling Issues](#build-and-bundling-issues)
- [Session Storage Issues](#session-storage-issues)
- [Mobile-Specific Issues](#mobile-specific-issues)
- [Backend and API Issues](#backend-and-api-issues)
- [Deployment Issues](#deployment-issues)
- [Development Environment Issues](#development-environment-issues)

---

## Authentication Issues

### "Failed to connect to auth server"

**Symptoms:**
- Login button shows error immediately
- Cannot start OAuth flow
- Error message: "Failed to connect to auth server"

**Causes:**
1. Backend server not running
2. Wrong `EXPO_PUBLIC_API_URL` environment variable
3. Firewall blocking port 3000

**Solutions:**

1. **Start the backend server:**
   ````bash
   npm run server
   ````
   or
   ````bash
   npm run dev        # Starts both server and Expo
   npm run web-dev    # Starts both server and opens web
   ````

2. **Check server is running:**
   ````bash
   curl http://localhost:3000/api/health
   ````
   Should return:
   ````json
   {
     "status": "ok",
     "copilotAvailable": true,
     "message": "AI summaries powered by GitHub Copilot"
   }
   ````

3. **Verify environment variables:**
   ````bash
   # Check .env file exists
   cat .env
   
   # Should contain:
   EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ````

4. **Check firewall:**
   - Temporarily disable firewall
   - Or allow port 3000 for Node.js

---

### "GitHub OAuth failed: bad_verification_code"

**Symptoms:**
- OAuth flow completes on GitHub
- Error appears when redirecting back to app
- Error message: "bad_verification_code"

**Causes:**
1. OAuth code expired (codes are single-use and expire quickly)
2. Code already used
3. Clock skew between client and GitHub servers

**Solutions:**

1. **Retry the flow:**
   - Click "Start GitHub login" again
   - Complete authorization faster (within 60 seconds)

2. **Clear existing session:**
   ````bash
   # Mobile: Uninstall and reinstall app
   # Web: Clear localStorage in browser DevTools
   # Or click "Sign out" if visible
   ````

3. **Check system time:**
   - Ensure device clock is set to automatic
   - OAuth codes are time-sensitive

---

### "Issues won't close" / "403 Forbidden when closing issues"

**Symptoms:**
- Swipe left closes card visually
- Issue remains open on GitHub
- Error: "Failed to close issue" or "Insufficient permissions"

**Causes:**
1. OAuth scope is `public_repo` instead of `repo`
2. User lacks push access to repository
3. Token expired or revoked

**Solutions:**

1. **Check OAuth scope:**
   ````bash
   # In .env file
   EXPO_PUBLIC_GITHUB_SCOPE=repo  # NOT public_repo
   ````

2. **Re-authenticate with correct scope:**
   - Sign out of IssueCrush
   - Update `.env` if needed
   - Restart server
   - Sign in again
   - GitHub will prompt for new permissions

3. **Verify repository access:**
   - User must have **push access** (write or admin role)
   - For organization repos, check organization app permissions
   - GitHub OAuth app must be authorized for the organization

4. **Test with `curl`:**
   ````bash
   # Replace with your session token from browser DevTools → Application → Storage
   curl -X PATCH http://localhost:3000/api/issues/owner/repo/123 \
     -H "X-Session-Token: your-session-id" \
     -H "Content-Type: application/json" \
     -d '{"state":"closed"}'
   ````

---

### Session expired messages

**Symptoms:**
- Error: "Session expired or invalid. Please sign in again."
- Frequent re-authentication required

**Causes:**
1. Sessions expire after 24 hours (by design)
2. Server restarted (in-memory sessions lost)
3. Cosmos DB unavailable (session not stored)

**Solutions:**

1. **Expected behavior:**
   - 24-hour expiry is intentional for security
   - Sign in again to create new session

2. **Use Cosmos DB for persistence:**
   ````bash
   # In .env (for production) or Azure SWA App Settings
   COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
   COSMOS_KEY=your_cosmos_primary_key
   COSMOS_DATABASE=issuecrush
   COSMOS_CONTAINER=sessions
   ````

3. **Check backend logs:**
   ````bash
   # Local development
   npm run server
   # Look for: "Cosmos DB session store ready" or "using in-memory session store"
   ````

---

## AI Summary Issues

### "AI summary failed: Failed to fetch"

**Symptoms:**
- Clicking "✨ Get AI Summary" shows error
- Error message: "Failed to fetch" or "AI summary failed"

**Causes:**
1. Backend server not running
2. Missing `GH_TOKEN` or `COPILOT_PAT` environment variable
3. GitHub Copilot subscription inactive or unavailable
4. Network connectivity issues

**Solutions:**

1. **Check backend is running:**
   ````bash
   curl http://localhost:3000/api/health
   ````

2. **Verify Copilot token:**
   ````bash
   # Add to .env
   GH_TOKEN=ghp_yourGitHubPersonalAccessToken
   # OR
   COPILOT_PAT=ghp_yourCopilotSpecificToken
   ````

   **How to get a token:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `copilot` (if available) or standard `repo` scope
   - Copy token to `.env`

3. **Check Copilot subscription:**
   - Go to https://github.com/settings/copilot
   - Ensure "GitHub Copilot" is enabled
   - Individual or organization subscription required

4. **Test manually:**
   ````bash
   curl -X POST http://localhost:3000/api/ai-summary \
     -H "X-Session-Token: your-session-id" \
     -H "Content-Type: application/json" \
     -d '{
       "issue": {
         "number": 1,
         "title": "Test issue",
         "body": "This is a test",
         "state": "open",
         "labels": [],
         "repository": {"full_name": "owner/repo"}
       }
     }'
   ````

---

### "AI summaries require a GitHub Copilot subscription"

**Symptoms:**
- AI Summary button works but returns subscription error
- Message: "AI summaries require a GitHub Copilot subscription."

**Causes:**
- No active Copilot subscription on the GitHub account associated with `GH_TOKEN`

**Solutions:**

1. **Subscribe to GitHub Copilot:**
   - Individual: https://github.com/features/copilot
   - Organization: Contact your GitHub organization admin

2. **Use fallback summaries:**
   - IssueCrush automatically falls back to basic summaries (title + labels)
   - Feature still works, just without AI analysis

3. **Alternative: Skip AI feature:**
   - Simply don't click the AI Summary button
   - Swipe functionality works without AI

---

### AI summaries are slow or timeout

**Symptoms:**
- AI Summary button spins for 30+ seconds
- Error: "Copilot response timeout"

**Causes:**
1. GitHub Copilot API is slow or overloaded
2. Large issue body (>5000 characters)
3. Network latency

**Solutions:**

1. **Retry:**
   - Click the button again
   - Copilot API performance varies

2. **Reduce issue body size:**
   - Summarize issue body before requesting AI summary
   - Current timeout: 30 seconds (configurable in `api/src/app.js`)

3. **Check network:**
   ````bash
   ping api.github.com
   ````

---

## Build and Bundling Issues

### "Cannot find module 'babel-preset-expo'"

**Symptoms:**
- `npm start` or `npm run web` fails
- Error: `Cannot find module 'babel-preset-expo'`

**Causes:**
- Missing or corrupted dependencies

**Solutions:**

1. **Reinstall dependencies:**
   ````bash
   rm -rf node_modules package-lock.json
   npm install
   ````

2. **Manually install babel preset:**
   ````bash
   npm install --save-dev babel-preset-expo
   ````

3. **Check Node.js version:**
   ````bash
   node --version  # Should be 18+ or 20+
   ````

---

### "Cannot find module 'react-dom' or 'react-native-web'"

**Symptoms:**
- `npm run web` or `npm run web-dev` fails
- Missing web dependencies

**Causes:**
- Web dependencies not installed

**Solutions:**

1. **Install web dependencies:**
   ````bash
   npx expo install react-dom react-native-web
   ````

2. **Verify package.json:**
   ````json
   {
     "dependencies": {
       "react-dom": "^18.3.1",
       "react-native-web": "~0.19.13"
     }
   }
   ````

---

### Blank page or JSON manifest displayed

**Symptoms:**
- Navigating to `http://localhost:8081` shows blank page or JSON
- Web app doesn't load

**Causes:**
- Wrong URL (8081 is Metro bundler, not the web app)
- Metro bundler serving manifest instead of built app

**Solutions:**

1. **Use correct command:**
   ````bash
   npm run web-dev   # Automatically opens correct URL
   ````
   
   **Don't** navigate to `http://localhost:8081` manually

2. **Correct web URL:**
   - Expo will open the correct URL automatically (usually on port 8000 or higher)
   - Look for output: `› Opening http://localhost:XXXX in your browser...`

---

### Build fails with "Cannot find tsconfig.json"

**Symptoms:**
- TypeScript build fails
- Missing configuration file

**Solutions:**

1. **Verify tsconfig.json exists:**
   ````bash
   ls -la tsconfig.json
   ````

2. **Restore from repository:**
   ````bash
   git checkout tsconfig.json
   ````

3. **Check TypeScript version:**
   ````bash
   npx tsc --version
   ````

---

## Session Storage Issues

### Sessions lost after server restart (in-memory mode)

**Symptoms:**
- Users logged out after restarting `npm run server`
- Need to re-authenticate frequently during development

**Causes:**
- Using in-memory session storage (default without Cosmos DB)

**Solutions:**

1. **Expected behavior in development:**
   - In-memory storage is intentional for zero-config local dev
   - Sessions clear on restart

2. **Use Cosmos DB for persistence:**
   ````bash
   # Create Cosmos DB account in Azure Portal
   # Add to .env:
   COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
   COSMOS_KEY=your_primary_key
   COSMOS_DATABASE=issuecrush
   COSMOS_CONTAINER=sessions
   ````

3. **Alternative: Use longer development sessions:**
   - Don't restart server frequently
   - Use `nodemon` for auto-restart (preserves some state)

---

### Cosmos DB connection errors

**Symptoms:**
- Error: "Cosmos DB init failed, falling back to in-memory"
- Sessions not persisting despite Cosmos DB configuration

**Causes:**
1. Wrong Cosmos DB endpoint or key
2. Cosmos DB not configured with NoSQL API
3. Network/firewall blocking Cosmos DB access
4. Cosmos DB resource deleted or moved

**Solutions:**

1. **Verify credentials:**
   ````bash
   # In Azure Portal → Cosmos DB account → Settings → Keys
   # Copy Primary Connection String or Endpoint + Key
   ````

2. **Test connection:**
   ````bash
   # Use Azure CLI
   az cosmosdb check-name-exists --name issuecrush-cosmos
   ````

3. **Check API type:**
   - Must be **NoSQL** (Core SQL API)
   - Not Cassandra, MongoDB, Gremlin, or Table API

4. **Firewall rules:**
   - In Cosmos DB → Settings → Firewall and virtual networks
   - Allow access from "All networks" (or add your IP)

5. **Review backend logs:**
   ````bash
   npm run server
   # Look for: "Cosmos DB session store ready (issuecrush/sessions)"
   # Or: "Cosmos DB init failed" with specific error
   ````

---

## Mobile-Specific Issues

### "Expo Go app shows connection error"

**Symptoms:**
- QR code scanned but app won't load
- Error: "Could not connect to development server"

**Causes:**
1. Mobile device on different WiFi network
2. Firewall blocking Metro bundler port (8081)
3. Wrong LAN IP address

**Solutions:**

1. **Same network:**
   - Ensure phone and computer on same WiFi
   - Disable VPN on computer

2. **Restart Metro bundler:**
   ````bash
   npm start
   # Press 'r' to reload
   ````

3. **Manually enter URL:**
   - In Expo Go: "Enter URL manually"
   - Format: `exp://192.168.1.XXX:8081`
   - Replace with your computer's LAN IP

---

### SecureStore errors on Android

**Symptoms:**
- App crashes on Android when logging in
- Error: "SecureStore is not available"

**Causes:**
- Device doesn't support secure storage (rare on modern Android)

**Solutions:**

1. **Update Expo Go:**
   - Latest version has better SecureStore support

2. **Check Android version:**
   - Minimum Android 6.0 (API 23) required

3. **Fallback to AsyncStorage:**
   - For testing, temporarily modify `src/lib/tokenStorage.ts`

---

### iOS simulator shows blank white screen

**Symptoms:**
- App loads but shows white screen
- No errors in console

**Causes:**
1. React Native bundler not running
2. JavaScript bundle failed to load

**Solutions:**

1. **Reload app:**
   - Press `Cmd+R` in simulator
   - Or shake device → "Reload"

2. **Clear Metro cache:**
   ````bash
   npm start --clear
   ````

3. **Check console:**
   - Open Safari → Develop → Simulator → JSContext
   - Look for JavaScript errors

---

## Backend and API Issues

### CORS errors in browser console

**Symptoms:**
- Error: "Access-Control-Allow-Origin" header missing
- API calls fail from web app

**Causes:**
- CORS not configured on backend

**Solutions:**

1. **Check server.js (local dev):**
   ````javascript
   // Should have CORS middleware
   const cors = require('cors');
   app.use(cors());
   ````

2. **Azure Functions CORS:**
   - In `api/host.json`, CORS is configured via Azure SWA
   - For local testing, use Azure Functions Core Tools

---

### "Cannot read properties of undefined (reading 'githubToken')"

**Symptoms:**
- Backend crashes with null/undefined errors
- Session resolution fails

**Causes:**
- Session not found or expired
- Session store not initialized

**Solutions:**

1. **Check session exists:**
   ````bash
   # Enable debug logs in api/src/sessionStore.js
   console.log('Session retrieved:', session);
   ````

2. **Sign in again:**
   - Session may have expired
   - Create new session via OAuth flow

---

## Deployment Issues

### Azure SWA deployment fails

**Symptoms:**
- GitHub Actions workflow fails
- Deployment error in Azure Portal

**Causes:**
1. Missing environment variables in Azure SWA
2. Build command fails
3. Wrong Node.js version

**Solutions:**

1. **Set environment variables:**
   - Azure Portal → Static Web App → Configuration
   - Add:
     - `EXPO_PUBLIC_GITHUB_CLIENT_ID`
     - `GITHUB_CLIENT_SECRET`
     - `COSMOS_ENDPOINT` (optional)
     - `COSMOS_KEY` (optional)

2. **Check build logs:**
   - GitHub Actions → Latest workflow run → Build job
   - Look for error messages

3. **Verify Node version:**
   ````yaml
   # In .github/workflows/azure-swa.yml
   - uses: actions/setup-node@v4
     with:
       node-version: '20'  # Or 18+
   ````

---

### "npx expo export" fails with network error

**Symptoms:**
- `npx expo export` command hangs or fails
- Error: "Failed to connect to cdp.expo.dev"

**Causes:**
- Network blocking expo.dev domains
- Corporate firewall

**Solutions:**

1. **Use TypeScript check instead:**
   ````bash
   npx tsc --noEmit  # Type-check without bundling
   ````

2. **Skip Expo build in CI:**
   - Use pre-built static files
   - Or build locally and commit to repo (not recommended)

---

## Development Environment Issues

### "Error: EADDRINUSE: address already in use :::3000"

**Symptoms:**
- Cannot start server
- Port 3000 already in use

**Solutions:**

1. **Kill existing process:**
   ````bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ````

2. **Use different port:**
   ````bash
   PORT=3001 npm run server
   ````

---

### TypeScript errors after pulling latest code

**Symptoms:**
- `npx tsc --noEmit` shows errors
- Types don't match

**Solutions:**

1. **Reinstall dependencies:**
   ````bash
   rm -rf node_modules package-lock.json
   npm install
   ````

2. **Clear TypeScript cache:**
   ````bash
   rm -rf .tsbuildinfo
   ````

---

## Getting More Help

If your issue isn't covered here:

1. **Check GitHub Issues:**
   - https://github.com/AndreaGriffiths11/IssueCrush/issues
   - Search for similar problems

2. **Enable debug logs:**
   ````bash
   # Backend
   DEBUG=* npm run server
   
   # Frontend
   # Add console.log() in relevant files
   ````

3. **Create a new issue:**
   - Include error messages (full stack traces)
   - Steps to reproduce
   - Environment details (OS, Node version, device)
   - Screenshots if applicable

4. **Relevant documentation:**
   - [Architecture Guide](../architecture.md)
   - [API Reference](../api/README.md)
   - [Contributing Guide](../../CONTRIBUTING.md)
