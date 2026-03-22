# Deployment Guide

## Overview

IssueCrush is deployed to **Azure Static Web Apps** (SWA) with automatic deployments triggered by pushes to the `main` branch. This guide covers deployment configuration, environment setup, and troubleshooting.

## Deployment Architecture

````
GitHub Repository (main branch)
        │
        ▼
GitHub Actions Workflow
  (.github/workflows/azure-swa.yml)
        │
        ├─── Build Static Assets
        │    └─ npx expo export --platform web
        │
        └─── Deploy to Azure SWA
             ├─ Static assets → Azure CDN
             └─ Azure Functions → Function App
````

## Prerequisites

- **Azure Account** with active subscription
- **GitHub Repository** with admin access
- **Azure Static Web Apps** resource created
- **GitHub Actions** enabled on repository

## Azure Static Web Apps Setup

### 1. Create Azure SWA Resource

#### Option A: Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"** → **"Static Web App"**
3. Fill in the form:
   - **Subscription:** Your Azure subscription
   - **Resource Group:** `issuecrush-rg` (create new or use existing)
   - **Name:** `issuecrush` (or your preferred name)
   - **Plan type:** Free (or Standard for production)
   - **Region:** Choose closest to your users
   - **Source:** GitHub
   - **Organization:** Your GitHub username
   - **Repository:** `IssueCrush`
   - **Branch:** `main`
   - **Build Details:**
     - **Build Presets:** Custom
     - **App location:** `/`
     - **Api location:** `api`
     - **Output location:** `dist`
4. Click **"Review + create"** → **"Create"**

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
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist" \
  --login-with-github
````

### 2. Configure GitHub Actions

Azure SWA automatically creates a GitHub Actions workflow file. Verify it exists:

````bash
.github/workflows/azure-static-web-apps-*.yml
````

If it doesn't exist, create `.github/workflows/azure-swa.yml`:

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
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web app
        run: npx expo export --platform web
      
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "dist"

  close_pull_request_job:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
````

### 3. Configure Deployment Token

The deployment token is automatically added to GitHub Secrets when you create the SWA resource. Verify it exists:

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Look for `AZURE_STATIC_WEB_APPS_API_TOKEN_*`

If missing, get it from Azure Portal:

1. Go to your Static Web App resource
2. Settings → Configuration → Deployment tokens
3. Copy the deployment token
4. Add it to GitHub Secrets as `AZURE_STATIC_WEB_APPS_API_TOKEN`

## Environment Variables

### Azure SWA Configuration

Set environment variables in Azure Portal:

1. Go to your Static Web App resource
2. Settings → **Configuration**
3. Click **"Add"** for each variable

**Required Variables:**

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret
EXPO_PUBLIC_GITHUB_SCOPE=repo
````

**Optional Variables (Copilot):**

````bash
GH_TOKEN=github_token_with_copilot_access
# OR
COPILOT_PAT=copilot_personal_access_token
````

**Optional Variables (Cosmos DB):**

````bash
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

### GitHub OAuth Setup (Production)

Create a separate OAuth App for production:

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** `IssueCrush Production`
   - **Homepage URL:** `https://your-swa-url.azurestaticapps.net`
   - **Authorization callback URL:** `https://your-swa-url.azurestaticapps.net`
4. Copy Client ID and Client Secret
5. Add to Azure SWA environment variables

**Important:** Use the production SWA URL, not localhost.

## Azure Cosmos DB Setup (Optional)

For persistent session storage across multiple instances:

### 1. Create Cosmos DB Account

#### Azure Portal

1. Create a resource → **Azure Cosmos DB**
2. Select **NoSQL API**
3. Fill in:
   - **Account name:** `issuecrush-cosmos` (or your choice)
   - **Location:** Same as SWA
   - **Capacity mode:** Serverless (for low cost)
4. Click **"Review + create"** → **"Create"**

#### Azure CLI

````bash
az cosmosdb create \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --locations regionName=eastus \
  --kind GlobalDocumentDB \
  --capabilities EnableServerless
````

### 2. Get Connection Details

1. Go to Cosmos DB account
2. Settings → **Keys**
3. Copy:
   - **URI** (endpoint)
   - **PRIMARY KEY**

### 3. Database Auto-Creation

The app automatically creates the database and container on first run:

- **Database:** `issuecrush`
- **Container:** `sessions`
- **Partition key:** `/id`
- **TTL:** 24 hours (auto-delete expired sessions)

**No manual setup required!**

### 4. Add to Azure SWA

1. Go to Static Web App → Configuration
2. Add environment variables:

````bash
COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
COSMOS_KEY=your_primary_key_here
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

## Static Web App Configuration

The `staticwebapp.config.json` file configures routing and API behavior:

````json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "platform": {
    "apiRuntime": "node:20"
  },
  "globalHeaders": {
    "content-security-policy": "default-src 'self' https://api.github.com https://*.github.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  }
}
````

**Key Settings:**

- **API Runtime:** Node.js 20
- **API Routes:** All `/api/*` routes are public
- **SPA Fallback:** All routes serve `index.html` (React Router support)
- **CSP:** Content Security Policy for security

## Deployment Process

### Automatic Deployment

Every push to `main` triggers automatic deployment:

1. **GitHub Actions** runs the workflow
2. **Build Step:** `npx expo export --platform web` creates static bundle
3. **Deploy Step:** Uploads to Azure SWA
4. **Azure Functions:** Automatically deployed from `api/` directory
5. **Live:** Changes go live in ~2 minutes

### Manual Deployment

Deploy manually using Azure CLI:

````bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Build the app
npx expo export --platform web

# Deploy
swa deploy \
  --deployment-token $AZURE_STATIC_WEB_APPS_API_TOKEN \
  --app-location dist \
  --api-location api
````

### Deploy from Local Machine

````bash
# Build
npm run build

# Deploy with SWA CLI
swa deploy --env production
````

## Monitoring and Logs

### View Logs

#### Azure Portal

1. Go to your Static Web App
2. Click **"Functions"** (left sidebar)
3. Select a function
4. Click **"Monitor"**
5. View invocation logs

#### Azure CLI

````bash
# Stream function logs
az webapp log tail \
  --name issuecrush \
  --resource-group issuecrush-rg
````

### Application Insights (Optional)

Enable Application Insights for advanced monitoring:

1. Go to Static Web App → Settings → **Application Insights**
2. Click **"Enable"**
3. Create new Application Insights resource
4. View metrics, traces, and errors

### Health Check

Check if the API is running:

````bash
curl https://your-swa-url.azurestaticapps.net/api/health
````

**Expected response:**

````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

## Custom Domain Setup

### 1. Add Custom Domain

1. Go to Static Web App → Settings → **Custom domains**
2. Click **"Add"**
3. Enter your domain (e.g., `issuecrush.com`)
4. Choose validation method:
   - **CNAME** (recommended for subdomains)
   - **TXT** (for apex domains)

### 2. Configure DNS

Add DNS records at your domain registrar:

**For subdomain (app.issuecrush.com):**

````
Type: CNAME
Name: app
Value: your-swa-url.azurestaticapps.net
````

**For apex domain (issuecrush.com):**

````
Type: TXT
Name: @
Value: [validation code from Azure]

Type: ALIAS or ANAME
Name: @
Value: your-swa-url.azurestaticapps.net
````

### 3. Enable HTTPS

HTTPS is automatically enabled via Azure-managed certificates.

- **Certificate:** Auto-renewed by Azure
- **Redirection:** HTTP → HTTPS (automatic)

### 4. Update OAuth App

Update your GitHub OAuth App callback URL:

1. Go to https://github.com/settings/developers
2. Select your production OAuth App
3. Update **Authorization callback URL** to your custom domain
4. Update `EXPO_PUBLIC_REDIRECT_URI` in Azure SWA configuration

## Rollback Strategy

### Revert to Previous Deployment

#### Option A: Redeploy Previous Commit

````bash
git revert HEAD
git push origin main
````

This triggers a new deployment with the previous code.

#### Option B: Azure Portal Rollback

Azure SWA doesn't support built-in rollback. Use Git to revert:

````bash
# Find the commit to rollback to
git log --oneline

# Reset to that commit
git reset --hard <commit-hash>

# Force push (use with caution!)
git push --force origin main
````

**⚠️ Warning:** Force push rewrites history. Coordinate with team first.

### Deployment Slots (Standard Plan Only)

For zero-downtime deployments:

1. Use staging slots to test before production
2. Swap slots when ready
3. Instant rollback by swapping back

## Troubleshooting

### Build Failures

**"expo export failed"**

- Check `package.json` for correct Expo version
- Verify all dependencies are in `package.json`
- Review GitHub Actions logs for specific errors

**"TypeScript errors"**

- Run `npx tsc --noEmit` locally
- Fix all type errors before pushing
- Ensure `tsconfig.json` is correct

### Deployment Failures

**"Static Web Apps deployment failed"**

- Check GitHub Actions logs
- Verify `AZURE_STATIC_WEB_APPS_API_TOKEN` is set
- Ensure `staticwebapp.config.json` is valid JSON

**"Function app failed to start"**

- Check `api/package.json` for correct Node version
- Verify all API dependencies are listed
- Review function logs in Azure Portal

### Runtime Errors

**"Session expired" on every request**

- Check Cosmos DB connection (if using)
- Verify environment variables are set in Azure
- Check function logs for session errors

**"AI summaries not working"**

- Verify `GH_TOKEN` or `COPILOT_PAT` is set
- Check token has Copilot access
- Review function logs for Copilot SDK errors

**"OAuth fails after deployment"**

- Update GitHub OAuth App callback URL
- Verify `EXPO_PUBLIC_GITHUB_CLIENT_ID` is production ID
- Check `GITHUB_CLIENT_SECRET` is set

### Performance Issues

**"Slow response times"**

- Check Azure region (should be close to users)
- Review Application Insights metrics
- Consider upgrading to Standard plan
- Enable CDN caching for static assets

**"Cosmos DB throttling"**

- Check Request Units (RU) consumption
- Increase provisioned throughput
- Or switch to serverless mode

## Cost Optimization

### Free Tier

Azure SWA Free tier includes:

- **100 GB bandwidth/month**
- **0.5 GB storage**
- **2 custom domains**
- **Unlimited API calls** (within compute limits)

**Good for:** Small projects, prototypes, personal use

### Standard Tier ($9/month)

Includes:

- **Unlimited bandwidth**
- **Unlimited storage**
- **Unlimited custom domains**
- **Deployment slots** (staging)
- **SLA:** 99.95% uptime

**Good for:** Production apps, commercial use

### Cosmos DB Costs

**Serverless mode:**
- Pay per request (~$0.25 per million reads)
- No minimum cost
- Best for low/variable traffic

**Provisioned throughput:**
- Fixed cost based on RU/s
- More predictable billing
- Best for consistent traffic

### Cost Reduction Tips

1. **Use Serverless Cosmos DB** for session storage
2. **Optimize bundle size** (smaller = faster = cheaper)
3. **Enable caching** for static assets
4. **Delete unused resources** (old SWA instances, etc.)
5. **Monitor usage** with Azure Cost Management

## Scaling

### Horizontal Scaling

Azure SWA automatically scales:

- **Static content:** Served via global CDN
- **API Functions:** Auto-scale based on load
- **No configuration needed**

### Geographic Distribution

Deploy to multiple regions for lower latency:

1. Create SWA in each region
2. Use Azure Front Door for global routing
3. Configure DNS for geo-routing

**Note:** Requires Standard plan and additional setup.

## Security Best Practices

### Environment Variables

- **Never commit** secrets to Git
- **Use Azure Key Vault** for sensitive data (optional)
- **Rotate secrets** regularly
- **Audit access** to secrets

### API Security

- **Validate all inputs** on backend
- **Rate limit** API endpoints (not built-in, requires custom code)
- **Monitor for abuse** via Application Insights
- **Use HTTPS only** (enforced by Azure SWA)

### Content Security Policy

Review and tighten CSP in `staticwebapp.config.json`:

````json
{
  "globalHeaders": {
    "content-security-policy": "default-src 'self'; ..."
  }
}
````

## Backup and Disaster Recovery

### Code Backup

- **GitHub** is the source of truth
- **Enable branch protection** on `main`
- **Tag releases** for easy rollback

### Cosmos DB Backup

Cosmos DB includes automatic backups:

- **Frequency:** Every 4 hours
- **Retention:** 30 days
- **Restore:** Contact Azure Support

**For critical data:** Export to Azure Blob Storage periodically.

### Monitoring and Alerts

Set up alerts for:

- **High error rates** (>5% errors)
- **Slow response times** (>2s p95)
- **High costs** (>$50/month)
- **Low availability** (<99%)

## CI/CD Best Practices

### Pull Request Previews

Azure SWA automatically creates preview environments for PRs:

- **URL:** `https://your-swa-url-<pr-number>.azurestaticapps.net`
- **Lifecycle:** Auto-deleted when PR is closed
- **Testing:** Test changes before merging

### Environments

Use branch-based environments:

- **Production:** `main` branch → production SWA
- **Staging:** `staging` branch → staging SWA (optional)
- **Development:** Local dev server

### Deployment Gates

Add quality gates to GitHub Actions:

````yaml
- name: Type check
  run: npx tsc --noEmit

- name: Run tests
  run: npm test

- name: Build
  run: npx expo export --platform web
````

## Additional Resources

- [Azure Static Web Apps Docs](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Cosmos DB Docs](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [API Reference](./API.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)

## Support

For deployment issues:

- **Azure Support:** Create support ticket in Azure Portal
- **GitHub Discussions:** Ask in repository discussions
- **Issues:** Report bugs in GitHub Issues

---

**Ready to deploy?** Push to `main` and watch your app go live! 🚀
