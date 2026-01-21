# IssueCrush Quick Start Guide

## What Was Fixed

### Authentication Issues Resolved

1. **Added GITHUB_CLIENT_SECRET to environment**
   - Updated .env.example to include the required secret
   - Server now properly exchanges OAuth codes for tokens

2. **Fixed REDIRECT_URI consistency** (App.tsx:25-27)
   - Changed from dynamic `window.location` to fixed `http://localhost:8081`
   - Ensures exact match with GitHub OAuth app settings

3. **Enhanced error handling** (App.tsx:50-80)
   - Added detailed error messages and console logging
   - Better feedback when server is not running
   - Improved debugging experience

## Setup Instructions

### Step 1: Configure Environment Variables

Edit your `.env` file with your actual GitHub OAuth app credentials:

```bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=Ov23liABCDEF123456  # Your actual client ID
GITHUB_CLIENT_SECRET=abc123def456...             # Your actual client secret
EXPO_PUBLIC_GITHUB_SCOPE=public_repo
```

**Where to find these:**
1. Go to https://github.com/settings/developers
2. Click on your OAuth app (or create one)
3. Copy the Client ID and generate a new Client Secret

### Step 2: Verify GitHub OAuth App Settings

Ensure your GitHub OAuth app has:
- **Homepage URL**: `http://localhost:8081`
- **Authorization callback URL**: `http://localhost:8081`

### Step 3: Run the Test Script

```bash
./test-auth.sh
```

This will check:
- Environment variables are set correctly
- Server is running
- Health endpoint is responding

### Step 4: Start the Application

#### Option A: Start Both (Recommended)
```bash
npm run dev
```

This runs both the server and the Expo app concurrently.

#### Option B: Start Separately

Terminal 1:
```bash
npm run server
```

Terminal 2:
```bash
npm start
```

Then press `w` to open in web browser.

### Step 5: Test Authentication

1. Open http://localhost:8081 in your browser
2. Click "Start GitHub login"
3. You'll be redirected to GitHub
4. Authorize the app
5. You'll be redirected back with a code
6. Check browser console for logs:
   - "Exchanging code for token..."
   - "Token saved successfully"
7. You should see "Connected to GitHub"

## Troubleshooting

### "Failed to connect to auth server"

**Cause:** Server is not running

**Fix:**
```bash
npm run server
```

### "Server error: 500 - Missing GitHub credentials"

**Cause:** GITHUB_CLIENT_SECRET not set in .env

**Fix:** Add your actual client secret to `.env`

### "GitHub OAuth failed: bad_verification_code"

**Cause:** Code already used or expired (codes are single-use)

**Fix:** Click "Start GitHub login" again to get a fresh code

### Authentication succeeds but issues won't load

**Cause:** Token doesn't have required permissions

**Fix:**
1. Check EXPO_PUBLIC_GITHUB_SCOPE includes necessary permissions
2. Sign out and sign in again to get a new token with correct scopes

## Next Steps: Copilot SDK Integration

Once authentication is working, we'll add:

### AI-Powered Issue Summaries
- Automatic summarization of issue content
- Context-aware analysis using GitHub Copilot
- Smart insights for faster triage

The Copilot SDK will provide:
- Multi-turn conversations with issue context
- Custom tools for GitHub API integration
- Intelligent recommendations

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     IssueCrush App                       │
│                    (localhost:8081)                      │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ├─── Auth Flow ────────────────────┐
                 │                                   │
                 │  ┌──────────────────────┐         │
                 │  │  Express Server      │         │
                 ├──│  (localhost:3000)    │         │
                 │  │                      │         │
                 │  │ /api/github-token    │         │
                 │  │ /health              │         │
                 │  └──────┬───────────────┘         │
                 │         │                         │
                 │         │                         │
                 │         ▼                         │
                 │  ┌──────────────────────┐         │
                 └─▶│    GitHub OAuth      │◀────────┘
                    │    github.com        │
                    └──────────────────────┘
```

## Common Commands

```bash
# Install dependencies
npm install

# Start server only
npm run server

# Start app only
npm start

# Start both
npm run dev

# Test authentication setup
./test-auth.sh

# Build for production
npm run build  # (to be added)
```

## Support

- Read AUTH_SETUP.md for detailed authentication architecture
- Check server logs for OAuth errors
- Use browser DevTools console for client-side debugging
