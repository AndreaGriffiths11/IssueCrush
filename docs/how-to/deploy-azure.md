# How to Deploy to Azure Static Web Apps

This guide walks you through deploying IssueCrush to Azure Static Web Apps with Azure Functions backend.

## Prerequisites

- **Azure Account:** [Create a free account](https://azure.microsoft.com/free/)
- **Azure CLI:** [Install Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- **GitHub Repository:** Your IssueCrush fork
- **Node.js 20+** installed locally

## Overview

Azure Static Web Apps (SWA) deployment includes:

1. Static web assets (Expo web build)
2. Azure Functions API (OAuth, GitHub proxy, AI summaries)
3. GitHub Actions workflow (automatic deployment)
4. Environment variables (secrets)

## Step 1: Create Azure Static Web App

### Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → search for "Static Web App"
3. Click **Create**
4. Fill in the details:
   - **Subscription:** Your Azure subscription
   - **Resource Group:** Create new → `issuecrush-rg`
   - **Name:** `issuecrush` (or your preferred name)
   - **Plan type:** Free (for development) or Standard (for production)
   - **Region:** Choose closest to your users
   - **Source:** GitHub
   - **Organization:** Your GitHub username
   - **Repository:** `IssueCrush`
   - **Branch:** `main`
5. **Build Details:**
   - **Build Presets:** Custom
   - **App location:** `/`
   - **API location:** `api`
   - **Output location:** `dist` (Expo web output)
6. Click **Review + Create** → **Create**

### Using Azure CLI

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
  --output-location "dist" \
  --login-with-github
````

## Step 2: Configure Build Settings

Azure SWA uses the existing `staticwebapp.config.json` in the repository:

````json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/api/*"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "platform": {
    "apiRuntime": "node:20"
  }
}
````

**No changes needed** - this is already configured correctly.

## Step 3: Set Up Environment Variables

In Azure Portal:

1. Go to your Static Web App resource
2. Click **Settings** → **Configuration**
3. Click **+ Add** to add each variable:

### Required Variables

| Name | Value | Description |
|------|-------|-------------|
| `EXPO_PUBLIC_GITHUB_CLIENT_ID` | `your_client_id` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | `your_client_secret` | GitHub OAuth app secret |
| `EXPO_PUBLIC_GITHUB_SCOPE` | `repo` | OAuth scope |
| `EXPO_PUBLIC_API_URL` | Leave empty or set to SWA URL | API base URL (defaults to same origin) |

### Optional Variables (for AI Summaries)

| Name | Value | Description |
|------|-------|-------------|
| `GH_TOKEN` | `ghp_xxxxx` or `ghu_xxxxx` | GitHub token with Copilot access |
| `COPILOT_PAT` | Alternative to GH_TOKEN | Copilot-specific token |

### Optional Variables (for Cosmos DB)

| Name | Value | Description |
|------|-------|-------------|
| `COSMOS_ENDPOINT` | `https://your-account.documents.azure.com:443/` | Cosmos DB endpoint |
| `COSMOS_KEY` | `your_primary_key` | Cosmos DB key |
| `COSMOS_DATABASE` | `issuecrush` | Database name |
| `COSMOS_CONTAINER` | `sessions` | Container name |

**Without Cosmos DB:** Sessions are stored in-memory (lost on cold start/restart).

Click **Save** after adding all variables.

## Step 4: Configure GitHub OAuth App

Update your GitHub OAuth app settings:

1. Go to https://github.com/settings/developers
2. Click on your OAuth app
3. Update URLs:
   - **Homepage URL:** `https://YOUR-SWA-NAME.azurestaticapps.net`
   - **Authorization callback URL:** `https://YOUR-SWA-NAME.azurestaticapps.net`

**Find your SWA URL:**
- Azure Portal → Static Web App → Overview → **URL**

## Step 5: Deploy

### Automatic Deployment (Recommended)

GitHub Actions workflow is automatically created when you create the SWA:

1. Check `.github/workflows/azure-static-web-apps-*.yml`
2. Push to `main` branch
3. GitHub Actions runs:
   - Installs dependencies (`npm install`)
   - Builds Expo web app (`npx expo export -p web`)
   - Deploys to Azure SWA

Monitor deployment:
- GitHub → Actions tab
- Azure Portal → Static Web App → **Deployments**

### Manual Deployment

Use the Azure SWA CLI:

````bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Build Expo web app
npx expo export -p web

# Deploy (requires SWA deployment token)
swa deploy ./dist \
  --api-location ./api \
  --deployment-token $SWA_DEPLOYMENT_TOKEN
````

**Get deployment token:**
- Azure Portal → Static Web App → **Manage deployment token**

## Step 6: Verify Deployment

1. **Visit your SWA URL:** `https://YOUR-SWA-NAME.azurestaticapps.net`
2. **Test authentication:**
   - Click "Start GitHub login"
   - Authorize on GitHub
   - Verify you're logged in
3. **Test issue loading:**
   - Enter a repo filter (e.g., `owner/repo`)
   - Click "Refresh"
   - Verify issues load
4. **Test API health:**
   - Visit: `https://YOUR-SWA-NAME.azurestaticapps.net/api/health`
   - Should return: `{"status":"healthy","copilotMode":"...","copilotAvailable":...}`

## Troubleshooting

### Build Failures

**Error:** `expo export` fails with network timeout

**Solution:**
- This is expected in CI environments (blocked access to `cdp.expo.dev`)
- The deployment still works — Expo falls back gracefully
- To verify type safety, add this to your workflow:

````yaml
- name: Type Check
  run: npx tsc --noEmit
````

### OAuth Callback Issues

**Error:** "The redirect_uri MUST match the registered callback URL"

**Solution:**
1. Check GitHub OAuth app callback URL matches SWA URL exactly
2. Ensure no trailing slashes
3. Redeploy after updating OAuth app settings

### API Endpoints Not Working

**Error:** 404 on `/api/*` endpoints

**Solution:**
1. Verify `api/` directory exists in repository
2. Check `staticwebapp.config.json` has correct `apiRuntime: "node:20"`
3. Ensure `api/package.json` exists with dependencies
4. Check Azure Portal → Static Web App → **Functions** tab for deployed functions

### Environment Variables Not Applied

**Error:** "Missing EXPO_PUBLIC_GITHUB_CLIENT_ID env var"

**Solution:**
1. Azure Portal → Static Web App → Configuration → verify variables are set
2. Click **Save** (variables aren't applied until you save)
3. Wait 2-3 minutes for SWA to restart
4. Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)

### Cosmos DB Connection Issues

**Error:** "Failed to connect to Cosmos DB"

**Solution:**
1. Verify `COSMOS_ENDPOINT` includes `https://` and port `:443/`
2. Check `COSMOS_KEY` is the **Primary Key** (not Read-Only Key)
3. Ensure Cosmos DB firewall allows Azure services
4. The app falls back to in-memory storage if Cosmos DB is unavailable

## Advanced Configuration

### Custom Domain

1. Azure Portal → Static Web App → **Custom domains**
2. Click **+ Add**
3. Enter your domain (e.g., `issuecrush.example.com`)
4. Follow DNS verification steps
5. Update GitHub OAuth app callback URL to custom domain

### Staging Environments

Create branch-based staging:

1. Push to a branch (e.g., `staging`)
2. Azure SWA auto-creates: `https://YOUR-SWA-NAME-staging.azurestaticapps.net`
3. Set environment variables per environment
4. Test before merging to `main`

### Monitoring and Logs

**Application Insights:**
1. Azure Portal → Static Web App → **Application Insights**
2. Click **Enable**
3. View logs, performance, errors in real-time

**Function Logs:**
1. Azure Portal → Static Web App → **Functions**
2. Click on a function → **Monitor**
3. View invocations, errors, execution time

## Related Documentation

- [Set Up Cosmos DB Session Storage](./setup-cosmos-db.md)
- [Configure GitHub Copilot SDK](./configure-copilot.md)
- [Architecture Overview](../reference/architecture/overview.md)
- [Backend Endpoints Reference](../reference/api/backend-endpoints.md)
