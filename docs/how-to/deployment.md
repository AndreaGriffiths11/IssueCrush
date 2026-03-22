# Deploying IssueCrush to Azure Static Web Apps

Step-by-step guide for deploying IssueCrush to Azure Static Web Apps with Azure Functions backend.

## Prerequisites

- Azure account with active subscription
- Azure CLI installed (`az --version`)
- GitHub account
- IssueCrush repository forked or cloned

## Step 1: Create Azure Resources

### Create Resource Group

````bash
az group create \
  --name issuecrush-rg \
  --location eastus
````

### Create Static Web App

````bash
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

This command:
- Creates a Static Web App resource
- Links it to your GitHub repository
- Configures GitHub Actions for CI/CD
- Sets up OAuth for deployment

## Step 2: Configure Environment Variables

### In Azure Portal

1. Navigate to your Static Web App → **Configuration**
2. Click **Application settings** tab
3. Add the following variables:

````
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
EXPO_PUBLIC_GITHUB_SCOPE=repo
GH_TOKEN=your_copilot_pat (optional)
COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

4. Click **Save**

⚠️ **Security:** Never commit these values to source control.

## Step 3: Set Up Cosmos DB (Optional but Recommended)

### Create Cosmos DB Account

````bash
az cosmosdb create \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --kind GlobalDocumentDB \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=False
````

### Get Connection Details

````bash
# Get endpoint
az cosmosdb show \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --query documentEndpoint \
  --output tsv

# Get primary key
az cosmosdb keys list \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --query primaryMasterKey \
  --output tsv
````

Add these values to your Static Web App configuration (Step 2).

**Note:** The database and container are auto-created by the application on first run.

## Step 4: Update GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Select your OAuth App
3. Update **Homepage URL:** `https://YOUR_APP.azurestaticapps.net`
4. Update **Authorization callback URL:** `https://YOUR_APP.azurestaticapps.net`
5. Click **Update application**

## Step 5: Deploy

### Automatic Deployment (Recommended)

Push to `main` branch triggers automatic deployment via GitHub Actions:

````bash
git add .
git commit -m "feat: prepare for deployment"
git push origin main
````

### Monitor Deployment

1. Go to your GitHub repository → **Actions** tab
2. Watch the "Azure Static Web Apps CI/CD" workflow
3. Deployment typically takes 3-5 minutes

### Verify Deployment

````bash
# Get your app URL
az staticwebapp show \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --query defaultHostname \
  --output tsv
````

Visit the URL to verify the app is running.

## Step 6: Verify API Functions

Test the health endpoint:

````bash
curl https://YOUR_APP.azurestaticapps.net/api/health
````

Expected response:
````json
{
  "status": "ok",
  "copilotAvailable": true,
  "message": "AI summaries powered by GitHub Copilot"
}
````

## Troubleshooting

### Build Fails: "Failed to build app"

**Cause:** Missing dependencies or build configuration.

**Fix:**
1. Run locally first: `npm run build`
2. Check `staticwebapp.config.json` is present
3. Verify `.github/workflows/azure-swa.yml` has correct paths

---

### "GitHub OAuth failed: redirect_uri_mismatch"

**Cause:** OAuth App callback URL doesn't match deployment URL.

**Fix:** Update callback URL in GitHub OAuth App settings (Step 4).

---

### "Missing GitHub credentials" in logs

**Cause:** Environment variables not set.

**Fix:** Double-check Azure Portal → Configuration (Step 2).

---

### Sessions lost between requests

**Cause:** Cosmos DB not configured or connection failing.

**Fix:**
1. Verify Cosmos DB credentials in configuration
2. Check application logs for Cosmos DB errors
3. Ensure Cosmos DB firewall allows Azure services

---

### AI summaries fail with "Failed to fetch"

**Cause:** `GH_TOKEN` or `COPILOT_PAT` missing.

**Fix:** Add token with Copilot access to configuration.

---

## Advanced Configuration

### Custom Domain

1. Go to Azure Portal → Static Web App → **Custom domains**
2. Click **Add** → **Custom domain on Azure DNS** or **Custom domain on other DNS**
3. Follow the wizard to add DNS records
4. Verify domain ownership

Update your GitHub OAuth App callback URL to the custom domain.

---

### Configure CORS (if needed)

Edit `staticwebapp.config.json`:

````json
{
  "globalHeaders": {
    "Access-Control-Allow-Origin": "https://yourdomain.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token"
  }
}
````

---

### Enable Logging

Azure Functions automatically log to Application Insights. View logs:

1. Azure Portal → Static Web App → **Monitoring** → **Logs**
2. Query with Kusto (KQL):

````kusto
traces
| where timestamp > ago(1h)
| project timestamp, message
| order by timestamp desc
````

---

### Scale Configuration

Static Web Apps scale automatically. To adjust Azure Functions:

1. Azure Portal → Static Web App → **Settings** → **Configuration**
2. Under **Function app settings**, configure:
   - **FUNCTIONS_WORKER_RUNTIME:** `node`
   - **WEBSITE_NODE_DEFAULT_VERSION:** `~20`

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/azure-swa.yml`) handles:

1. **Build** - `npm install`, `npm run build`
2. **Deploy** - Uploads static files and API functions
3. **Health Check** - Verifies deployment succeeded

### Manual Deployment

Use Azure CLI:

````bash
npm run build

az staticwebapp upload \
  --name issuecrush \
  --resource-group issuecrush-rg \
  --source ./dist \
  --api ./api
````

---

## Cost Estimation

**Static Web Apps (Free tier):**
- 100 GB bandwidth/month
- 2 custom domains
- Free SSL certificates

**Static Web Apps (Standard tier) - ~$9/month:**
- Unlimited bandwidth
- Unlimited custom domains
- SLA guarantee

**Cosmos DB (Serverless) - ~$0.25-$2/day:**
- Pay per request
- Auto-scales to zero
- Ideal for development and small apps

**Total estimated cost:** $0-$70/month depending on traffic and usage.

---

## Security Checklist

- [ ] Environment variables set in Azure Portal (not source code)
- [ ] Cosmos DB firewall configured (allow Azure services)
- [ ] GitHub OAuth App callback URL matches production URL
- [ ] HTTPS enforced (automatic with Azure SWA)
- [ ] Secrets rotated periodically
- [ ] Application Insights enabled for monitoring

---

## Next Steps

- Set up [custom domain](https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain)
- Configure [authentication providers](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- Enable [staging environments](https://learn.microsoft.com/en-us/azure/static-web-apps/review-publish-pull-requests)
- Set up [monitoring and alerts](https://learn.microsoft.com/en-us/azure/static-web-apps/monitor)

---

## See Also

- [Architecture Reference](../reference/architecture.md)
- [Environment Variables](../reference/environment-variables.md)
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Cosmos DB Documentation](https://learn.microsoft.com/en-us/azure/cosmos-db/)
