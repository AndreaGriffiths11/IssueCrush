# Deployment Guide

This guide explains how to deploy IssueCrush to Azure Static Web Apps and configure the production environment.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Azure Static Web Apps Deployment](#azure-static-web-apps-deployment)
- [Environment Configuration](#environment-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

IssueCrush is deployed to **Azure Static Web Apps** with:

- **Frontend**: Expo web build (React Native for web)
- **Backend**: Azure Functions v4 (Node 20, ESM)
- **Database**: Azure Cosmos DB NoSQL (session storage)

**Production URL**: https://gray-water-08b04e810.6.azurestaticapps.net

---

## Prerequisites

### Required Accounts
- GitHub account
- Azure account with active subscription
- GitHub OAuth App (for authentication)

### Required Tools (Local Development)
- Node.js 18+
- npm or yarn
- Azure CLI (optional, for manual deployment)
- Azure Functions Core Tools (optional)

---

## Local Development

### 1. Install Dependencies

````bash
git clone https://github.com/AndreaGriffiths11/IssueCrush.git
cd IssueCrush
npm install
````

### 2. Configure Environment

Create `.env` file:

````bash
cp .env.example .env
````

Edit `.env`:

````bash
# GitHub OAuth
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
EXPO_PUBLIC_GITHUB_SCOPE=repo

# Optional: Local Cosmos DB (or omit for in-memory storage)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions

# Optional: GitHub Copilot (for AI summaries)
GH_TOKEN=your_github_token_with_copilot_access
````

### 3. Run Locally

**Web development**:
````bash
npm run web-dev
````
Opens at http://localhost:8081

**Mobile development**:
````bash
npm run dev
````
Opens Expo dev server at http://localhost:8081 (scan QR code)

**Server only**:
````bash
npm run server
````
Express server runs on port 3000

### 4. Test Build

Type-check without building:
````bash
npx tsc --noEmit
````

Run tests:
````bash
npm test
````

---

## Azure Static Web Apps Deployment

### 1. Create Static Web App

#### Via Azure Portal

1. Go to https://portal.azure.com
2. Click **Create a resource** → **Static Web App**
3. Fill in details:
   - **Resource Group**: Create new (e.g., `issuecrush-rg`)
   - **Name**: `issuecrush` (or your preferred name)
   - **Plan type**: Free or Standard
   - **Region**: Choose closest to users
   - **Deployment source**: GitHub
4. Authorize GitHub access
5. Select repository: `AndreaGriffiths11/IssueCrush`
6. Build details:
   - **Build Presets**: Custom
   - **App location**: `/`
   - **Api location**: `api`
   - **Output location**: `dist` (Expo web build output)
7. Click **Review + Create**

Azure creates a GitHub Actions workflow at `.github/workflows/azure-swa.yml`

#### Via Azure CLI

````bash
az login

az staticwebapp create \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --source https://github.com/AndreaGriffiths11/IssueCrush \
  --location "West US 2" \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist" \
  --login-with-github
````

### 2. Create Cosmos DB (Session Storage)

#### Via Azure Portal

1. Go to **Create a resource** → **Azure Cosmos DB**
2. Select **NoSQL** API
3. Fill in details:
   - **Resource Group**: Same as Static Web App (`issuecrush-rg`)
   - **Account Name**: `issuecrush-cosmos`
   - **Location**: Same as Static Web App
   - **Capacity mode**: Serverless (for low traffic) or Provisioned
4. Click **Review + Create**
5. After deployment, go to **Keys** → Copy **URI** and **PRIMARY KEY**
6. Go to **Data Explorer** → Create database:
   - **Database ID**: `issuecrush`
   - **Container ID**: `sessions`
   - **Partition key**: `/id`
   - **Default TTL**: `86400` (24 hours in seconds)

#### Via Azure CLI

````bash
# Create Cosmos DB account
az cosmosdb create \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --locations regionName="West US 2" failoverPriority=0 \
  --default-consistency-level Session

# Create database
az cosmosdb sql database create \
  --account-name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --name issuecrush

# Create container with TTL
az cosmosdb sql container create \
  --account-name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --database-name issuecrush \
  --name sessions \
  --partition-key-path /id \
  --default-ttl 86400
````

---

## Environment Configuration

### Configure Secrets in Azure Portal

1. Go to your Static Web App resource
2. Click **Configuration** (under Settings)
3. Click **+ Add** for each environment variable:

| Name | Value | Description |
|------|-------|-------------|
| `EXPO_PUBLIC_GITHUB_CLIENT_ID` | Your GitHub OAuth client ID | OAuth authentication |
| `GITHUB_CLIENT_SECRET` | Your GitHub OAuth client secret | OAuth token exchange (server-side) |
| `EXPO_PUBLIC_GITHUB_SCOPE` | `repo` | OAuth scope |
| `COSMOS_ENDPOINT` | Cosmos DB URI | Session storage endpoint |
| `COSMOS_KEY` | Cosmos DB primary key | Session storage authentication |
| `COSMOS_DATABASE` | `issuecrush` | Database name |
| `COSMOS_CONTAINER` | `sessions` | Container name |
| `GH_TOKEN` | GitHub token with Copilot access | AI summaries (optional) |

4. Click **Save**

### Configure Routing

The `staticwebapp.config.json` file configures routing:

````json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/*.{css,scss,js,png,gif,ico,jpg,svg,woff,woff2,ttf,eot}"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ]
}
````

---

## CI/CD Pipeline

### GitHub Actions Workflow

Auto-generated at `.github/workflows/azure-swa.yml`:

````yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true

      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "dist"
````

### Deployment Process

1. Push to `main` branch
2. GitHub Actions workflow triggers
3. Builds Expo web app (`npx expo export --platform web`)
4. Deploys frontend to Azure Static Web Apps
5. Deploys Azure Functions (API) from `api/` directory
6. Updates environment variables from Azure configuration

### Build Commands

The workflow runs:

````bash
npm install
npm run build   # Runs: npx expo export --platform web
````

Output directory: `dist/`

---

## Monitoring

### View Logs

#### Azure Portal

1. Go to Static Web App resource
2. Click **Functions** → Select function (e.g., `github-token`)
3. Click **Monitor** → View invocation logs

#### Azure Functions Logs

1. Go to Static Web App → **Functions**
2. Click **Monitor**
3. View Application Insights logs

### Health Check

Visit: `https://your-app.azurestaticapps.net/api/health`

Response:
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "copilotMode": "copilot"
}
````

---

## Troubleshooting

### Issue: Build Fails with "Cannot find expo"

**Solution**: Ensure `expo` is in `dependencies`, not `devDependencies` in `package.json`.

### Issue: "Session expired" immediately after login

**Cause**: Cosmos DB not configured or credentials incorrect

**Solution**:
1. Verify `COSMOS_ENDPOINT` and `COSMOS_KEY` in Azure config
2. Check Cosmos DB firewall (allow Azure services)
3. Verify TTL is set to 86400 (24 hours)

### Issue: AI summaries fail with 403

**Cause**: Missing `GH_TOKEN` or no Copilot access

**Solution**:
1. Add `GH_TOKEN` environment variable in Azure config
2. Ensure token has Copilot access (Copilot subscription required)

### Issue: OAuth redirect fails

**Cause**: Redirect URI mismatch

**Solution**:
1. Update GitHub OAuth App settings
2. Set **Authorization callback URL** to: `https://your-app.azurestaticapps.net`
3. Update `EXPO_PUBLIC_REDIRECT_URI` in Azure config (if needed)

### Issue: API calls return 404

**Cause**: API functions not deployed or incorrect location

**Solution**:
1. Verify `api_location: "api"` in workflow file
2. Check `api/` directory structure matches Azure Functions requirements
3. Ensure `api/src/app.js` exports functions correctly

### Issue: "expo export" fails with network error

**Cause**: Blocked access to `cdp.expo.dev`

**Solution**:
This is known issue in CI environments. Use type-check instead:
````bash
npx tsc --noEmit   # Run before committing
````

---

## Production Checklist

- [ ] GitHub OAuth App created and configured
- [ ] Azure Static Web App created
- [ ] Azure Cosmos DB created with TTL enabled
- [ ] All environment variables configured in Azure portal
- [ ] `staticwebapp.config.json` committed to repo
- [ ] GitHub Actions workflow auto-generated and working
- [ ] Health endpoint returns `{ status: "ok" }`
- [ ] OAuth flow works end-to-end
- [ ] Issues can be fetched and closed
- [ ] AI summaries work (if Copilot configured)
- [ ] Sessions expire after 24 hours

---

## Rollback

### Revert to Previous Deployment

1. Go to GitHub repository
2. Click **Actions** → Select failed workflow
3. Find last successful workflow run
4. Click **Re-run jobs** → **Re-run all jobs**

OR

1. Revert commit locally
2. Push to `main` branch
3. GitHub Actions auto-deploys previous version

---

## Cost Optimization

### Azure Static Web Apps

- **Free tier**: 100 GB bandwidth/month, 0.5 GB storage
- **Standard tier**: $9/month + usage

### Azure Cosmos DB

- **Serverless**: Pay per request (best for low traffic)
- **Provisioned**: Fixed RU/s cost (better for consistent traffic)

### Monitoring Costs

- Enable Application Insights only if needed
- Use Free tier for low-traffic apps

---

## See Also

- [Architecture Overview](../architecture/overview.md)
- [Testing Guide](./testing.md)
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Cosmos DB Documentation](https://learn.microsoft.com/en-us/azure/cosmos-db/)
