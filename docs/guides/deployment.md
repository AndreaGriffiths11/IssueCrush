# Deployment Guide

This guide covers deploying IssueCrush to Azure Static Web Apps and alternative platforms.

## Prerequisites

- Azure account with active subscription
- GitHub repository with IssueCrush code
- GitHub OAuth App configured
- (Optional) GitHub Copilot subscription for AI features

## Azure Static Web Apps Deployment

### 1. Create Static Web App Resource

#### Via Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → **Static Web App**
3. Fill in the details:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing (e.g., `issuecrush-rg`)
   - **Name**: `issuecrush` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Source**: GitHub
   - **Organization**: Your GitHub username
   - **Repository**: `IssueCrush`
   - **Branch**: `main`
4. **Build Details**:
   - **Build Presets**: Custom
   - **App location**: `/`
   - **Api location**: `api`
   - **Output location**: `dist` (for Expo web build)
5. Click **Review + create** → **Create**

#### Via Azure CLI

````bash
# Login to Azure
az login

# Create resource group
az group create --name issuecrush-rg --location eastus

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

Azure automatically creates a GitHub Actions workflow at `.github/workflows/azure-static-web-apps-*.yml`.

**Verify the workflow includes**:

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
    runs_on: ubuntu-latest
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

### 3. Set Environment Variables

#### Via Azure Portal

1. Go to your Static Web App resource
2. Click **Configuration** in the left menu
3. Add these **Application settings**:

| Name                         | Value                                    |
|------------------------------|------------------------------------------|
| EXPO_PUBLIC_GITHUB_CLIENT_ID | Your GitHub OAuth App client ID          |
| GITHUB_CLIENT_SECRET         | Your GitHub OAuth App client secret      |
| EXPO_PUBLIC_GITHUB_SCOPE     | `repo`                                   |
| EXPO_PUBLIC_API_URL          | (leave empty - uses same origin)         |
| GH_TOKEN or COPILOT_PAT      | Token with Copilot access (optional)     |

#### Via Azure CLI

````bash
az staticwebapp appsettings set \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --setting-names \
    EXPO_PUBLIC_GITHUB_CLIENT_ID="your_client_id" \
    GITHUB_CLIENT_SECRET="your_client_secret" \
    EXPO_PUBLIC_GITHUB_SCOPE="repo"
````

### 4. Configure Cosmos DB (Optional)

For persistent sessions across deployments:

#### Create Cosmos DB

````bash
# Create Cosmos DB account
az cosmosdb create \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --kind GlobalDocumentDB \
  --locations regionName=eastus failoverPriority=0

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
  --partition-key-path "/id" \
  --default-ttl 86400
````

#### Add Cosmos DB Settings

1. Get connection details:

````bash
az cosmosdb show \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --query "documentEndpoint" -o tsv

az cosmosdb keys list \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --query "primaryMasterKey" -o tsv
````

2. Add to Static Web App configuration:

| Name             | Value                                    |
|------------------|------------------------------------------|
| COSMOS_ENDPOINT  | `https://issuecrush-cosmos.documents.azure.com:443/` |
| COSMOS_KEY       | Primary key from above                   |
| COSMOS_DATABASE  | `issuecrush`                             |
| COSMOS_CONTAINER | `sessions`                               |

### 5. Update GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Select your OAuth App
3. Update **Authorization callback URL** to:
   - `https://your-swa-url.azurestaticapps.net`

### 6. Deploy

Deployment happens automatically on push to `main`:

````bash
git add .
git commit -m "feat: deploy to Azure SWA"
git push origin main
````

Monitor deployment:
- GitHub Actions tab: Build progress
- Azure Portal: Deployment history

### 7. Verify Deployment

1. Visit your Static Web App URL (shown in Azure Portal)
2. Click **Start GitHub login**
3. Authorize on GitHub
4. Test swiping issues
5. Test AI summary (if configured)

## Alternative Platforms

### Vercel

#### Deploy

````bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
````

#### Configuration

Create `vercel.json`:

````json
{
  "buildCommand": "expo export --platform web",
  "outputDirectory": "dist",
  "framework": "react-native",
  "env": {
    "EXPO_PUBLIC_GITHUB_CLIENT_ID": "@github_client_id",
    "GITHUB_CLIENT_SECRET": "@github_client_secret",
    "EXPO_PUBLIC_GITHUB_SCOPE": "repo"
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
````

Set environment variables:

````bash
vercel env add EXPO_PUBLIC_GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production
vercel env add EXPO_PUBLIC_GITHUB_SCOPE production
````

### Netlify

#### Deploy

````bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
````

#### Configuration

Create `netlify.toml`:

````toml
[build]
  command = "expo export --platform web"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
````

**Note**: Azure Functions code needs adaptation for Netlify Functions.

### Docker

#### Dockerfile

````dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Build web version
RUN npx expo export --platform web

# Expose ports
EXPOSE 3000 8081

# Start server
CMD ["npm", "run", "server"]
````

#### Build and Run

````bash
# Build image
docker build -t issuecrush .

# Run container
docker run -p 3000:3000 \
  -e EXPO_PUBLIC_GITHUB_CLIENT_ID=your_id \
  -e GITHUB_CLIENT_SECRET=your_secret \
  issuecrush
````

## Environment Variables Reference

### Required

| Variable                     | Description                          | Example                      |
|------------------------------|--------------------------------------|------------------------------|
| EXPO_PUBLIC_GITHUB_CLIENT_ID | GitHub OAuth App client ID           | `Ov23liAbCdEfGhIjKlMn`       |
| GITHUB_CLIENT_SECRET         | GitHub OAuth App client secret       | `1234567890abcdef...`        |
| EXPO_PUBLIC_GITHUB_SCOPE     | OAuth scope (must be `repo`)         | `repo`                       |

### Optional

| Variable                | Description                          | Default                      |
|-------------------------|--------------------------------------|------------------------------|
| EXPO_PUBLIC_API_URL     | Backend API URL                      | Same origin                  |
| GH_TOKEN or COPILOT_PAT | Token for Copilot SDK                | None (AI disabled)           |
| COSMOS_ENDPOINT         | Azure Cosmos DB endpoint             | None (in-memory storage)     |
| COSMOS_KEY              | Azure Cosmos DB key                  | None                         |
| COSMOS_DATABASE         | Cosmos DB database name              | `issuecrush`                 |
| COSMOS_CONTAINER        | Cosmos DB container name             | `sessions`                   |

## Build Troubleshooting

### Build Fails: "Cannot find module babel-preset-expo"

````bash
npm install --save-dev babel-preset-expo
````

### Build Fails: expo export fails due to cdp.expo.dev

**Workaround**: Use type checking instead of full build:

````bash
./node_modules/.bin/tsc --noEmit
````

Update GitHub Actions workflow to skip `expo export` if needed.

### API Functions Not Working

**Check**:
1. API location is set to `api` in Static Web App config
2. `api/host.json` exists
3. Environment variables are set in Azure Portal
4. GitHub Actions deployment succeeded

**Debug**:
````bash
# Check function logs
az staticwebapp logs show \
  --name issuecrush \
  --resource-group issuecrush-rg
````

### CORS Errors

**Solution**: Verify `staticwebapp.config.json` includes correct routes:

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
  }
}
````

## Monitoring

### Application Insights

Azure Static Web Apps integrates with Application Insights:

1. Go to your Static Web App in Azure Portal
2. Click **Application Insights** → **Enable**
3. View metrics: requests, failures, response times

### Custom Logging

Add to API functions:

````javascript
context.log('Custom message', { data: value });
````

View logs:

````bash
az staticwebapp logs show \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --follow
````

## Scaling

### Static Web Apps Tiers

| Tier     | Custom Domains | API Size | Bandwidth |
|----------|----------------|----------|-----------|
| Free     | 2              | 250 MB   | 100 GB/mo |
| Standard | Unlimited      | 500 MB   | Unlimited |

**Upgrade**:

````bash
az staticwebapp update \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --sku Standard
````

### Performance Optimization

1. **Enable CDN**: Azure Static Web Apps uses global CDN automatically
2. **Compression**: Gzip enabled by default
3. **Caching**: Set cache headers in `staticwebapp.config.json`

## Security

### Secrets

**Never commit**:
- `.env` file
- GitHub OAuth client secret
- Cosmos DB keys

**Use**:
- Azure Key Vault for secrets
- GitHub Secrets for CI/CD
- Environment variables in Azure Portal

### HTTPS

Azure Static Web Apps enforces HTTPS automatically.

### Custom Domain

1. Add custom domain in Azure Portal
2. Create DNS records (CNAME or TXT for validation)
3. SSL certificate provisioned automatically

## Rollback

### Via Azure Portal

1. Go to Static Web App → **Deployments**
2. Select previous deployment
3. Click **Promote**

### Via GitHub

1. Revert commit:
   ````bash
   git revert HEAD
   git push origin main
   ````
2. GitHub Actions re-deploys automatically

## Cost Estimation

### Azure Resources

- **Static Web App (Free tier)**: $0/month
- **Static Web App (Standard tier)**: ~$9/month
- **Cosmos DB (Serverless)**: ~$0.25/million requests
- **Application Insights**: First 5 GB free, $2.30/GB after

**Estimated monthly cost** (low traffic): $0 - $15

## See Also

- [Azure Static Web Apps Documentation](https://learn.microsoft.com/azure/static-web-apps/)
- [Expo Deployment Guide](https://docs.expo.dev/distribution/introduction/)
- [Architecture Guide](architecture.md)
- [API Reference](../api/README.md)
