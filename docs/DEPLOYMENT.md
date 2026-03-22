# Deployment Guide

Complete guide to deploying IssueCrush to Azure Static Web Apps (SWA) and other platforms.

## Table of Contents

- [Azure Static Web Apps Deployment](#azure-static-web-apps-deployment)
- [Alternative Platforms](#alternative-platforms)
- [Environment Configuration](#environment-configuration)
- [Build Configuration](#build-configuration)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting](#troubleshooting)

---

## Azure Static Web Apps Deployment

### Prerequisites

- **Azure account** with active subscription
- **GitHub repository** with IssueCrush code
- **GitHub OAuth App** configured (see [Setup](#github-oauth-setup))
- **Azure Cosmos DB** account (optional but recommended for production)

### 1. Create Azure Resources

#### Option A: Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → Search for **Static Web App**
3. Fill in:
   - **Resource Group**: Create new (e.g., `issuecrush-rg`)
   - **Name**: `issuecrush` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Deployment source**: GitHub
4. Click **Sign in with GitHub** and authorize Azure
5. Select:
   - **Organization**: Your GitHub username
   - **Repository**: `IssueCrush`
   - **Branch**: `main`
6. Build Presets:
   - **Build preset**: Custom
   - **App location**: `/`
   - **API location**: `api`
   - **Output location**: `dist` (leave blank for default)
7. Click **Review + create** → **Create**

Azure will:
- Create the Static Web App resource
- Add a GitHub Actions workflow to `.github/workflows/azure-static-web-apps-*.yml`
- Trigger the first deployment automatically

#### Option B: Azure CLI

````bash
# Login to Azure
az login

# Create resource group
az group create \
  --name issuecrush-rg \
  --location eastus

# Create Static Web App
az staticwebapp create \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --source https://github.com/YOUR_USERNAME/IssueCrush \
  --location eastus \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --login-with-github
````

### 2. Configure Environment Variables

In the Azure Portal:

1. Navigate to your Static Web App
2. Go to **Settings** → **Configuration**
3. Click **+ Add** and add each variable:

````bash
# Required
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
EXPO_PUBLIC_GITHUB_SCOPE=repo

# Optional (for persistent sessions)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions

# Optional (for AI summaries)
GH_TOKEN=your_github_token_with_copilot_access
# OR
COPILOT_PAT=your_copilot_pat
````

4. Click **Save**

**Note**: Environment variables are **not** exposed to the client. `EXPO_PUBLIC_*` variables are bundled at build time.

### 3. Update GitHub OAuth App

Update your GitHub OAuth App callback URL:

1. Go to https://github.com/settings/developers
2. Click your OAuth App
3. Update **Authorization callback URL** to your SWA URL:
   - Example: `https://gray-water-08b04e810.6.azurestaticapps.net`
4. Click **Update application**

### 4. Deploy

Deployment happens automatically via GitHub Actions on every push to `main`.

Manual trigger:

````bash
# Push to main
git push origin main

# Or re-run the workflow in GitHub Actions
gh workflow run azure-static-web-apps-*.yml
````

---

## Alternative Platforms

### Vercel

````bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add EXPO_PUBLIC_GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add EXPO_PUBLIC_GITHUB_SCOPE
# ... (add all required variables)

# Deploy to production
vercel --prod
````

**Configuration** (`vercel.json`):

````json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/src/app.js"
    }
  ]
}
````

### Netlify

````bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Set environment variables in Netlify dashboard
# Build settings:
#   Base directory: (leave blank)
#   Build command: npm run build
#   Publish directory: dist
#   Functions directory: api

# Deploy to production
netlify deploy --prod
````

### Self-Hosted (Docker)

````dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY api/package*.json ./api/

# Install dependencies
RUN npm ci --production
RUN cd api && npm ci --production

# Copy source
COPY . .

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "server"]
````

````bash
# Build and run
docker build -t issuecrush .
docker run -p 3000:3000 \
  -e EXPO_PUBLIC_GITHUB_CLIENT_ID=... \
  -e GITHUB_CLIENT_SECRET=... \
  issuecrush
````

---

## Environment Configuration

### Build-Time Variables

Exposed to client (bundled during build):

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=...
EXPO_PUBLIC_GITHUB_SCOPE=repo
EXPO_PUBLIC_API_URL=https://your-app.azurestaticapps.net
EXPO_PUBLIC_REDIRECT_URI=https://your-app.azurestaticapps.net
````

**Important**: These are **public** and visible in client bundle. Never put secrets here.

### Runtime Variables

Server-side only (never exposed to client):

````bash
GITHUB_CLIENT_SECRET=...
COSMOS_ENDPOINT=...
COSMOS_KEY=...
GH_TOKEN=...
COPILOT_PAT=...
````

### Development vs Production

**Local Development** (`.env`):

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=dev_client_id
GITHUB_CLIENT_SECRET=dev_client_secret
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_REDIRECT_URI=http://localhost:8081
````

**Production** (Azure SWA Configuration):

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_client_secret
# API_URL and REDIRECT_URI auto-resolved from window.location.origin
````

---

## Build Configuration

### Expo Web Build

````bash
# Build for web
npm run build

# Output: dist/
````

Build configuration (`staticwebapp.config.json`):

````json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "platform": {
    "apiRuntime": "node:20"
  }
}
````

### Azure Functions Configuration

**Local** (`api/local.settings.json`):

````json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": ""
  }
}
````

**Production** (`api/host.json`):

````json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "logging": {
    "logLevel": {
      "default": "Information"
    }
  }
}
````

---

## Post-Deployment Verification

### 1. Check Deployment Status

````bash
# GitHub Actions
gh run list --workflow=azure-static-web-apps-*.yml

# Azure CLI
az staticwebapp show \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --query "defaultHostname" \
  --output tsv
````

### 2. Test Endpoints

````bash
# Health check (if implemented)
curl https://your-app.azurestaticapps.net/api/health

# Check Copilot availability
curl https://your-app.azurestaticapps.net/api/check-copilot
````

### 3. Test Authentication Flow

1. Navigate to your SWA URL
2. Click "Start GitHub login"
3. Authorize on GitHub
4. Verify redirect back to app
5. Check that session is created (login successful)

### 4. Test Issue Operations

1. Enter a repo filter (e.g., `owner/repo`)
2. Click "Refresh"
3. Verify issues load
4. Try swiping left to close an issue
5. Verify issue closes on GitHub
6. Test undo functionality

---

## Troubleshooting

### Build Failures

**Error**: `Cannot find module 'babel-preset-expo'`

**Solution**:
````bash
npm install --save-dev babel-preset-expo
````

**Error**: `expo export` fails with network error

**Solution**: Use type-check instead (Oryx build limitations):
````bash
./node_modules/.bin/tsc --noEmit
````

### Authentication Issues

**Error**: "Failed to connect to auth server"

**Cause**: API URL misconfigured or API not deployed

**Solution**:
- Check `EXPO_PUBLIC_API_URL` in SWA configuration
- Verify API functions deployed successfully
- Check Azure Functions logs in Portal

**Error**: "GitHub OAuth failed: bad_verification_code"

**Cause**: OAuth callback URL mismatch

**Solution**:
- Update GitHub OAuth App callback URL to match SWA URL
- Ensure no trailing slashes in URLs

### AI Summary Issues

**Error**: "AI summary failed: Unauthorized"

**Cause**: Missing or invalid `GH_TOKEN` / `COPILOT_PAT`

**Solution**:
- Verify token has Copilot access
- Check token is added to SWA configuration
- Ensure token has `repo` scope

### Session Issues

**Error**: "Session not found"

**Cause**: Session expired or Cosmos DB misconfigured

**Solution**:
- Check Cosmos DB connection (endpoint, key)
- Verify container `sessions` exists
- Check TTL is set to 86400 seconds
- For testing, use in-memory sessions (omit Cosmos config)

### CORS Issues

**Error**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause**: CORS not configured for custom domains

**Solution**:
- Azure SWA handles CORS automatically for same-origin
- For custom domains, ensure API and app share the same origin
- Check `staticwebapp.config.json` routes configuration

---

## Monitoring and Logs

### Azure Application Insights

1. Navigate to your Static Web App in Azure Portal
2. Go to **Monitoring** → **Application Insights**
3. Enable Application Insights
4. View:
   - Request failures
   - Performance metrics
   - Custom events

### Azure Functions Logs

````bash
# Stream logs in real-time
az webapp log tail \
  --name issuecrush \
  --resource-group issuecrush-rg
````

### GitHub Actions Logs

````bash
# View recent workflow runs
gh run list --workflow=azure-static-web-apps-*.yml

# View logs for specific run
gh run view <run-id> --log
````

---

## Rollback Strategy

### Option 1: Revert Commit

````bash
git revert <commit-hash>
git push origin main
# GitHub Actions auto-deploys previous version
````

### Option 2: Manual Rollback (Azure Portal)

1. Navigate to Static Web App
2. Go to **Deployments**
3. Select a previous successful deployment
4. Click **Activate**

---

## GitHub OAuth Setup

### Create OAuth App

1. Go to https://github.com/settings/developers
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: IssueCrush
   - **Homepage URL**: `https://your-app.azurestaticapps.net`
   - **Authorization callback URL**: `https://your-app.azurestaticapps.net`
4. Click **Register application**
5. Copy **Client ID**
6. Click **Generate a new client secret**
7. Copy **Client Secret** (only shown once)

### Update Environment Variables

Add to Azure SWA Configuration:

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
````

---

## Security Checklist

- [ ] GitHub Client Secret stored as environment variable (not in code)
- [ ] Cosmos DB key stored as environment variable
- [ ] GitHub OAuth callback URL matches deployed URL
- [ ] `EXPO_PUBLIC_*` variables contain no secrets
- [ ] HTTPS enforced in production
- [ ] Session TTL configured (24 hours)
- [ ] CORS configured correctly (same-origin)

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Azure SWA Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Expo Web Documentation](https://docs.expo.dev/guides/progressive-web-apps/)
