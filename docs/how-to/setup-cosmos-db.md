# How to Set Up Cosmos DB Session Storage

This guide shows you how to configure Azure Cosmos DB for persistent session storage in IssueCrush.

## Why Use Cosmos DB?

**Without Cosmos DB:**
- Sessions stored in memory
- Lost on server restart or cold start
- Users must re-authenticate frequently
- Not suitable for production

**With Cosmos DB:**
- Sessions persist across restarts
- Automatic 24-hour TTL (time-to-live)
- Scales to multiple server instances
- Production-ready

## Prerequisites

- **Azure Account:** [Create a free account](https://azure.microsoft.com/free/)
- **Azure CLI:** (optional) [Install Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- **IssueCrush deployed** (local or Azure)

## Step 1: Create Cosmos DB Account

### Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → search for "Azure Cosmos DB"
3. Select **Azure Cosmos DB for NoSQL** → **Create**
4. Fill in the details:
   - **Subscription:** Your Azure subscription
   - **Resource Group:** Use existing `issuecrush-rg` or create new
   - **Account Name:** `issuecrush-cosmos` (must be globally unique)
   - **Location:** Same as your Static Web App (for low latency)
   - **Capacity mode:** Serverless (recommended for dev/small scale)
   - **Apply Free Tier Discount:** Yes (if available)
5. Click **Review + Create** → **Create**
6. Wait 2-5 minutes for deployment

### Using Azure CLI

````bash
# Login to Azure
az login

# Create Cosmos DB account (NoSQL API, serverless mode)
az cosmosdb create \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --kind GlobalDocumentDB \
  --default-consistency-level Session \
  --enable-automatic-failover false \
  --capabilities EnableServerless
````

## Step 2: Get Connection Details

### Get Endpoint and Key

**Azure Portal:**
1. Go to your Cosmos DB account → **Settings** → **Keys**
2. Copy the **URI** (endpoint)
3. Copy the **PRIMARY KEY**

**Azure CLI:**
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
  --type keys \
  --query primaryMasterKey \
  --output tsv
````

## Step 3: Configure Environment Variables

### Local Development

Edit `.env`:

````bash
# Cosmos DB Configuration
COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
COSMOS_KEY=your_primary_key_here
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

**Restart your server** for changes to take effect:

````bash
npm run server
````

### Azure Static Web Apps

1. Azure Portal → Static Web App → **Settings** → **Configuration**
2. Add these variables:

| Name | Value |
|------|-------|
| `COSMOS_ENDPOINT` | `https://issuecrush-cosmos.documents.azure.com:443/` |
| `COSMOS_KEY` | Your primary key from Step 2 |
| `COSMOS_DATABASE` | `issuecrush` |
| `COSMOS_CONTAINER` | `sessions` |

3. Click **Save**
4. Wait 2-3 minutes for SWA to restart

## Step 4: Initialize Database and Container

**The database and container are auto-created** on first session creation.

The `sessionStore.js` code automatically:

1. Creates database `issuecrush` if it doesn't exist
2. Creates container `sessions` with:
   - Partition key: `/id`
   - TTL enabled (24 hours)
   - Automatic indexing

**Manual creation** (optional, via Azure Portal):

1. Cosmos DB account → **Data Explorer**
2. **New Database:**
   - Database id: `issuecrush`
   - Throughput: (not applicable in Serverless mode)
3. **New Container:**
   - Database id: `issuecrush`
   - Container id: `sessions`
   - Partition key: `/id`
   - Analytical store: Off
4. **Settings → Configure:**
   - Enable TTL: On
   - Default TTL: `86400` (24 hours in seconds)

## Step 5: Verify Connection

### Test Locally

1. Start your server:
   ````bash
   npm run server
   ````

2. Check server logs for:
   ````
   ✅ Connected to Cosmos DB: issuecrush/sessions
   ````

3. Sign in to IssueCrush
4. Check Cosmos DB Data Explorer:
   - Navigate to `issuecrush` → `sessions` → **Items**
   - You should see your session document

### Test in Azure

1. Visit your deployed app
2. Sign in with GitHub
3. Azure Portal → Cosmos DB → **Data Explorer** → `issuecrush` → `sessions` → **Items**
4. Verify session appears

## Session Schema

Each session is stored as a JSON document:

````json
{
  "id": "session_1a2b3c4d5e6f",
  "githubToken": "gho_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "createdAt": "2026-03-22T16:00:00.000Z",
  "ttl": 86400,
  "_rid": "...",
  "_self": "...",
  "_etag": "...",
  "_attachments": "...",
  "_ts": 1711123200
}
````

**Key Fields:**
- `id` - Session ID (partition key)
- `githubToken` - User's GitHub OAuth token
- `createdAt` - ISO timestamp
- `ttl` - Time-to-live in seconds (auto-deletion after 24 hours)

## Cost Considerations

### Serverless Mode (Recommended)

**Pricing:** Pay per request (RU/s consumed)

**Typical Usage (per user):**
- Session creation: 1 write (≈ 5 RU)
- Session reads: ~10 reads/day (≈ 1 RU each)
- Session deletion: 1 write (≈ 5 RU)

**Monthly cost for 100 active users:**
- ~15,000 RU/month
- ≈ **$0.30/month** (as of 2026 pricing)

### Provisioned Throughput Mode

**Not recommended** for IssueCrush unless you have 10,000+ active users.

Minimum cost: ~$25/month for 400 RU/s.

## Troubleshooting

### Connection Errors

**Error:** "Failed to connect to Cosmos DB"

**Solutions:**
1. Verify `COSMOS_ENDPOINT` is correct (must include `https://` and `:443/`)
2. Check `COSMOS_KEY` is the **Primary Key** (not Secondary or Read-Only)
3. Ensure Cosmos DB account is in the same region as your app (or allowed in firewall)

### Firewall Issues

If your Cosmos DB has firewall enabled:

1. Azure Portal → Cosmos DB → **Settings** → **Networking**
2. **Firewall and virtual networks:**
   - Allow access from: **All networks** (recommended for SWA)
   - OR: Add your Static Web App's IP ranges
3. Check **Allow access from Azure Portal** (for debugging)
4. Click **Save**

### Session Not Persisting

**Issue:** Users re-authenticate on every visit

**Solutions:**
1. Check TTL is set to `86400` (24 hours, not 24)
2. Verify `ttl` field is present in session documents
3. Check client-side storage:
   - Web: localStorage in browser (may be cleared)
   - Mobile: Expo SecureStore (should persist)

### Permission Denied

**Error:** "AuthorizationFailure" or "Forbidden"

**Solutions:**
1. Use **Primary Key**, not Read-Only Key
2. Verify the key hasn't been regenerated (regenerating invalidates old keys)
3. Ensure the key is correctly copied (no extra spaces or newlines)

## Monitoring

### Query Usage

Azure Portal → Cosmos DB → **Metrics:**
- **Total Requests:** See session create/read/delete operations
- **Total Request Units:** Monitor RU consumption
- **Server Side Latency:** Check query performance

### View Sessions

Azure Portal → Cosmos DB → **Data Explorer:**
- Navigate to `issuecrush` → `sessions` → **Items**
- Click on a session to view full document
- Use SQL queries to analyze:

````sql
SELECT * FROM c
WHERE c.createdAt > '2026-03-22T00:00:00.000Z'
ORDER BY c.createdAt DESC
````

## Backup and Recovery

### Automatic Backups

Cosmos DB automatically backs up your data:
- **Frequency:** Every 4 hours
- **Retention:** 8-30 days (depending on tier)
- **Restore:** Contact Azure support

For IssueCrush, backups are **not critical** (sessions are temporary, 24-hour TTL).

## Advanced Configuration

### Multi-Region Replication

For global users:

1. Azure Portal → Cosmos DB → **Replicate data globally**
2. Click **+ Add region**
3. Select additional regions
4. Enable **Multi-region writes** (increases cost)

**Note:** Probably overkill for IssueCrush unless you have users in multiple continents.

### Increase TTL

To keep sessions alive longer:

1. Azure Portal → Cosmos DB → Data Explorer → `sessions` → **Settings**
2. **Time to Live:** Change from `86400` to desired seconds
   - 7 days: `604800`
   - 30 days: `2592000`
3. **Save**

**Recommendation:** Keep at 24 hours for security (require re-auth daily).

## Related Documentation

- [Deploy to Azure Static Web Apps](./deploy-azure.md)
- [Architecture Overview](../reference/architecture/overview.md)
- [Session Management](../reference/architecture/session-management.md)
- [Backend Endpoints Reference](../reference/api/backend-endpoints.md)
