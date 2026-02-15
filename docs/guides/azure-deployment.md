# Azure Static Web Apps Deployment Guide

This guide covers deploying IssueCrush to Azure Static Web Apps with Azure Functions backend.

## Prerequisites

- **Azure Account** with an active subscription
- **Azure CLI** installed (`az` command)
- **GitHub repository** with IssueCrush code
- **GitHub OAuth App** configured for production URL

---

## Architecture Overview

````
┌────────────────────────────────────────────────────┐
│                                                    │
│          Azure Static Web Apps                     │
│                                                    │
│  ┌──────────────────┐      ┌──────────────────┐  │
│  │                  │      │                  │  │
│  │  Static Web App  │      │  Azure Functions │  │
│  │  (Expo/React)    │─────>│  (API Backend)   │  │
│  │                  │      │                  │  │
│  └──────────────────┘      └──────────────────┘  │
│                                     │             │
└─────────────────────────────────────┼─────────────┘
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │                        │
                         │   Azure Cosmos DB      │
                         │   (Session Storage)    │
                         │                        │
                         └────────────────────────┘
````

---

## Step 1: Create Azure Resources

### 1.1 Create Resource Group

````bash
az group create \
  --name issuecrush-rg \
  --location eastus
````

### 1.2 Create Cosmos DB Account

````bash
# Create Cosmos DB account (NoSQL API)
az cosmosdb create \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --locations regionName=eastus failoverPriority=0 \
  --default-consistency-level Session \
  --enable-automatic-failover false

# Get connection details
COSMOS_ENDPOINT=$(az cosmosdb show \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --query documentEndpoint -o tsv)

COSMOS_KEY=$(az cosmosdb keys list \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --query primaryMasterKey -o tsv)

echo "Cosmos Endpoint: $COSMOS_ENDPOINT"
echo "Cosmos Key: $COSMOS_KEY"
````

**Note:** Save these values - you'll need them for Azure SWA configuration.

---

## Step 2: Configure GitHub OAuth App

### 2.1 Create Production OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in production details:

````
Application name: IssueCrush
Homepage URL: https://your-app.azurestaticapps.net
Authorization callback URL: https://your-app.azurestaticapps.net
````

4. Click **"Register application"**
5. Note your **Client ID**
6. Click **"Generate a new client secret"**
7. Copy the **Client Secret** (you can't see it again!)

---

## Step 3: Create Azure Static Web App

### 3.1 Via Azure Portal (Recommended)

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"**
3. Search for **"Static Web App"**
4. Click **"Create"**

**Basics:**
- Subscription: (your subscription)
- Resource Group: `issuecrush-rg`
- Name: `issuecrush`
- Plan type: Free (or Standard for production)
- Region: (closest to your users)

**Deployment Details:**
- Source: GitHub
- Organization: (your GitHub username/org)
- Repository: IssueCrush
- Branch: `main`

**Build Details:**
- Build Presets: React
- App location: `/dist` (after `npx expo export --platform web`)
- Api location: `api`
- Output location: `` (leave empty)

5. Click **"Review + create"**
6. Click **"Create"**

**Result:**
- Azure SWA resource created
- GitHub Actions workflow added to your repo (`.github/workflows/azure-static-web-apps-*.yml`)
- Deployment API token added to GitHub Secrets

---

### 3.2 Via Azure CLI (Alternative)

````bash
# Install Azure Static Web Apps CLI extension
az extension add --name staticwebapp

# Create the Static Web App
az staticwebapp create \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --source https://github.com/YOUR_USERNAME/IssueCrush \
  --location eastus \
  --branch main \
  --app-location "dist" \
  --api-location "api" \
  --output-location "" \
  --login-with-github
````

---

## Step 4: Configure Environment Variables

### 4.1 Set Application Settings in Azure Portal

1. Go to your Static Web App in Azure Portal
2. Click **"Configuration"** in the left menu
3. Click **"Application settings"**
4. Add the following settings:

| Name | Value |
|------|-------|
| `EXPO_PUBLIC_GITHUB_CLIENT_ID` | Your GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | Your GitHub OAuth Client Secret |
| `COSMOS_ENDPOINT` | `https://issuecrush-cosmos.documents.azure.com:443/` |
| `COSMOS_KEY` | Your Cosmos DB primary key |
| `COSMOS_DATABASE` | `issuecrush` |
| `COSMOS_CONTAINER` | `sessions` |
| `GH_TOKEN` | (Optional) GitHub token with Copilot access for AI summaries |

5. Click **"Save"**

---

### 4.2 Via Azure CLI (Alternative)

````bash
# Get your Static Web App resource ID
SWA_ID=$(az staticwebapp show \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --query id -o tsv)

# Set application settings
az staticwebapp appsettings set \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --setting-names \
    EXPO_PUBLIC_GITHUB_CLIENT_ID="your_client_id" \
    GITHUB_CLIENT_SECRET="your_client_secret" \
    COSMOS_ENDPOINT="https://issuecrush-cosmos.documents.azure.com:443/" \
    COSMOS_KEY="your_cosmos_key" \
    COSMOS_DATABASE="issuecrush" \
    COSMOS_CONTAINER="sessions"
````

---

## Step 5: Configure GitHub Secrets

The Azure Portal automatically creates a GitHub Secret when you create the Static Web App. Verify it exists:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Verify **`AZURE_STATIC_WEB_APPS_API_TOKEN`** exists

Also add your GitHub OAuth Client ID as a secret:

1. Click **"New repository secret"**
2. Name: `EXPO_PUBLIC_GITHUB_CLIENT_ID`
3. Value: Your GitHub OAuth Client ID
4. Click **"Add secret"**

---

## Step 6: Customize GitHub Actions Workflow

The default workflow generated by Azure needs customization for Expo.

### 6.1 Edit `.github/workflows/azure-static-web-apps-*.yml`

Replace the auto-generated workflow with:

````yaml
name: Deploy to Azure Static Web Apps

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install frontend dependencies
        run: npm ci

      - name: Build Expo web
        run: npx expo export --platform web
        env:
          EXPO_PUBLIC_GITHUB_CLIENT_ID: ${{ secrets.EXPO_PUBLIC_GITHUB_CLIENT_ID }}
          EXPO_PUBLIC_GITHUB_SCOPE: ${{ vars.EXPO_PUBLIC_GITHUB_SCOPE || 'repo' }}
          EXPO_PUBLIC_API_URL: ""  # Empty for relative API paths in SWA

      - name: Install API dependencies
        run: cd api && npm ci

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "dist"
          api_location: "api"
          output_location: ""
          skip_app_build: true

  close_pull_request:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close PR Environment
    steps:
      - name: Close staging environment
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
````

**Key Changes:**
- Runs `npx expo export --platform web` to build the frontend
- Sets `app_location: "dist"` (Expo output directory)
- Uses `skip_app_build: true` (we build manually)
- Installs API dependencies before deployment

---

## Step 7: Configure Static Web App Routing

Create or verify `staticwebapp.config.json` in your repo root:

````json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/*.{css,scss,js,png,gif,jpg,svg,ico,json}"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
````

---

## Step 8: Deploy

### 8.1 Push to GitHub

````bash
git add .
git commit -m "Configure Azure SWA deployment"
git push origin main
````

### 8.2 Monitor Deployment

1. Go to your GitHub repository
2. Click **Actions** tab
3. Watch the workflow run
4. Build typically takes 3-5 minutes

### 8.3 Verify Deployment

````bash
# Get your Static Web App URL
az staticwebapp show \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --query defaultHostname -o tsv

# Test health endpoint
curl https://your-app.azurestaticapps.net/api/health
````

Expected response:
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

---

## Step 9: Test Production App

1. Open your app URL: `https://your-app.azurestaticapps.net`
2. Click **"Start GitHub login"**
3. Authorize on GitHub
4. Verify redirect back to your app
5. Fetch issues from a repository
6. Try closing an issue
7. Test AI summary feature

---

## Monitoring & Debugging

### View Logs in Azure Portal

1. Go to your Static Web App
2. Click **"Functions"** → **"View in Application Insights"**
3. Click **"Logs"**
4. Query logs:

````kusto
traces
| where timestamp > ago(1h)
| project timestamp, message
| order by timestamp desc
````

### Common Issues

#### "Failed to connect to auth server"

**Cause:** API functions not deployed or not running

**Solution:**
1. Check GitHub Actions workflow succeeded
2. Verify `api` directory deployed
3. Check Application Settings are configured

#### "Session expired or invalid"

**Cause:** Cosmos DB not configured or sessions not persisting

**Solution:**
1. Verify `COSMOS_*` environment variables in Application Settings
2. Check Cosmos DB firewall allows Azure services
3. Test Cosmos DB connectivity from backend

#### "GitHub OAuth failed: redirect_uri_mismatch"

**Cause:** GitHub OAuth app callback URL doesn't match production URL

**Solution:**
1. Go to GitHub OAuth app settings
2. Update Authorization callback URL to match Azure SWA URL
3. Try authentication again

---

## Cost Estimation

### Free Tier

- **Static Web Apps:** Free (100GB bandwidth, 2 custom domains)
- **Azure Functions:** Free (1M requests/month)
- **Cosmos DB:** Serverless (~$0.25/million requests)

**Estimated Monthly Cost:** $0-5 for low traffic (<10K users/month)

### Standard Tier

- **Static Web Apps:** $9/month (100GB bandwidth + staging environments)
- **Azure Functions:** Included
- **Cosmos DB:** Provisioned throughput (~$24/month for 400 RUs/second)

**Estimated Monthly Cost:** $30-50 for production traffic

---

## Scaling Considerations

### Horizontal Scaling

Azure Static Web Apps automatically scales:
- CDN-backed static content delivery
- Azure Functions auto-scale based on load
- No configuration required

### Cosmos DB Scaling

**Auto-scale (Recommended):**
````bash
az cosmosdb sql container throughput update \
  --account-name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --database-name issuecrush \
  --name sessions \
  --max-throughput 4000
````

**Manual Scaling:**
- Increase RUs in Azure Portal
- Cosmos DB → Data Explorer → Scale & Settings

---

## Security Hardening

### Enable HTTPS Only

Already enabled by default in Azure Static Web Apps.

### Restrict Cosmos DB Access

````bash
# Allow only Azure services
az cosmosdb update \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --enable-virtual-network false \
  --enable-public-network true \
  --ip-range-filter "0.0.0.0"  # Azure services only
````

### Custom Domain + SSL

1. Go to Static Web App → **Custom domains**
2. Click **"Add"**
3. Enter your domain (e.g., `issuecrush.example.com`)
4. Follow DNS configuration instructions
5. Azure provisions free SSL certificate

---

## Rollback Strategy

### Rollback to Previous Deployment

1. Go to GitHub Actions
2. Find the last successful workflow run
3. Click **"Re-run all jobs"**

### Rollback via Git

````bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-sha>
git push --force origin main
````

---

## CI/CD Best Practices

### Staging Environments

Pull requests automatically create staging environments:
- URL: `https://your-app-<pr-number>.azurestaticapps.net`
- Isolated from production
- Automatically destroyed when PR is closed

### Environment Variables per Environment

````yaml
- name: Build Expo web
  run: npx expo export --platform web
  env:
    EXPO_PUBLIC_GITHUB_CLIENT_ID: ${{ secrets.EXPO_PUBLIC_GITHUB_CLIENT_ID }}
    EXPO_PUBLIC_API_URL: ${{ github.event_name == 'pull_request' && '' || '' }}
````

---

## Troubleshooting Deployment

### Build Fails: "Cannot find module"

**Cause:** Missing dependencies

**Solution:**
````yaml
- name: Install frontend dependencies
  run: npm ci  # Not 'npm install' - use clean install

- name: Install API dependencies
  run: cd api && npm ci
````

### Build Fails: "Expo command not found"

**Cause:** Expo not installed globally

**Solution:** Use `npx`:
````yaml
- name: Build Expo web
  run: npx expo export --platform web
````

### Deployment Succeeds but Site Shows 404

**Cause:** Incorrect `app_location` in workflow

**Solution:** Verify Expo outputs to `dist/`:
````yaml
- name: Deploy
  with:
    app_location: "dist"  # Must match Expo output directory
````

---

## See Also

- [OAuth Flow Guide](../architecture/oauth-flow.md) - Authentication setup
- [Session Storage Guide](../architecture/session-storage.md) - Cosmos DB configuration
- [Backend API Reference](../api/backend-api.md) - API documentation
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
