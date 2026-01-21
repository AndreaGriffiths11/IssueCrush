# Authentication Setup Guide

## Current Issues Fixed

1. **Added GITHUB_CLIENT_SECRET to .env.example**
2. **Fixed REDIRECT_URI to use consistent localhost:8081**
3. **Added better error handling and logging**

## Setup Steps

### 1. Add your GitHub Client Secret to .env

```bash
# Open .env and add your GITHUB_CLIENT_SECRET
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_actual_client_id
GITHUB_CLIENT_SECRET=your_actual_client_secret
EXPO_PUBLIC_GITHUB_SCOPE=public_repo
```

### 2. Verify GitHub OAuth App Configuration

Go to your GitHub OAuth app settings and ensure:
- **Authorization callback URL** is set to: `http://localhost:8081`

### 3. Start Both Server and App

```bash
# Option 1: Start both together
npm run dev

# Option 2: Start separately in two terminals
npm run server  # Terminal 1
npm start       # Terminal 2
```

### 4. Test the Flow

1. Open http://localhost:8081 in your browser
2. Click "Start GitHub login"
3. You'll be redirected to GitHub
4. Authorize the app
5. You'll be redirected back to localhost:8081?code=...
6. The app will exchange the code for a token via the server

## Debugging

### Check Server Status
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

### Common Issues

**"Failed to connect to auth server"**
- Server is not running
- Run `npm run server` first

**"Server error: 500"**
- Missing GITHUB_CLIENT_SECRET in .env
- Add the secret from your GitHub OAuth app

**"GitHub OAuth failed"**
- Code may be expired (codes are single-use)
- Redirect URI doesn't match GitHub app settings
- Check that redirect URI is exactly `http://localhost:8081`

**"Unauthorized. Please sign in again"**
- Token is invalid or expired
- Sign out and sign in again

## Architecture

```
┌─────────────────┐
│   Browser       │
│  localhost:8081 │
└────────┬────────┘
         │
         │ 1. Redirect to GitHub
         ▼
┌─────────────────┐
│   GitHub.com    │
│   OAuth Login   │
└────────┬────────┘
         │
         │ 2. Redirect back with code
         ▼
┌─────────────────┐
│   Browser       │
│  localhost:8081 │
│  ?code=abc123   │
└────────┬────────┘
         │
         │ 3. POST code to server
         ▼
┌─────────────────┐      4. Exchange      ┌─────────────┐
│  Express Server │ ───────────────────▶  │  GitHub API │
│  localhost:3000 │ ◀───────────────────  │             │
└────────┬────────┘      5. Return token  └─────────────┘
         │
         │ 6. Return token to app
         ▼
┌─────────────────┐
│   App saves     │
│   token locally │
└─────────────────┘
```
