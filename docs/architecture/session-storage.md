# Session Storage Architecture

This document explains how IssueCrush manages user sessions using Azure Cosmos DB.

## Overview

IssueCrush uses a session-based architecture where:
1. GitHub OAuth tokens are stored server-side in Azure Cosmos DB
2. Clients receive and store only an opaque session ID
3. All API requests use the session ID to retrieve the actual GitHub token

This architecture enhances security by never exposing GitHub tokens to the client.

---

## Architecture Diagram

````
┌──────────────────┐
│                  │
│   Client App     │
│                  │
│  Stores:         │
│  • session_id    │
│  (opaque ID)     │
│                  │
└────────┬─────────┘
         │
         │ X-Session-Token: abc123...
         │
         ▼
┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │
│  Azure Functions │────────>│   Cosmos DB      │
│  (Backend API)   │         │   NoSQL API      │
│                  │         │                  │
│  Stores:         │         │  Container:      │
│  Nothing         │         │  "sessions"      │
│                  │         │                  │
│  Resolves:       │         │  Documents:      │
│  session_id →    │         │  {               │
│  githubToken     │         │    id,           │
│                  │         │    githubToken,  │
│                  │         │    createdAt,    │
│                  │         │    ttl: 86400    │
│                  │         │  }               │
└──────────────────┘         └──────────────────┘
````

---

## Session Storage

### Cosmos DB Configuration

**Account:** `issuecrush-cosmos` (or your account name)  
**Database:** `issuecrush`  
**Container:** `sessions`  
**Partition Key:** `/id`  
**Default TTL:** 86400 seconds (24 hours)

### Session Document Structure

````javascript
{
  id: "a1b2c3d4e5f6...",           // 64-char hex string (session ID)
  githubToken: "gho_...",          // User's GitHub OAuth token
  createdAt: 1705320000000,        // Unix timestamp (milliseconds)
  expiresAt: 1705406400000,        // Unix timestamp (milliseconds)
  ttl: 86400                       // Time-to-live in seconds
}
````

**Field Descriptions:**
- `id` - Session identifier (also partition key)
- `githubToken` - User's GitHub OAuth access token
- `createdAt` - Session creation timestamp
- `expiresAt` - Session expiration timestamp
- `ttl` - Cosmos DB TTL (automatic deletion after 24 hours)

---

## Session Lifecycle

### 1. Session Creation

**Trigger:** User completes OAuth flow

**Implementation:** `api/src/sessionStore.js` - `createSession()`

````javascript
import crypto from 'node:crypto';

async function createSession(githubToken) {
  // Generate unique session ID
  const sessionId = crypto.randomBytes(32).toString('hex');
  
  // Create session document
  const session = {
    id: sessionId,
    githubToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000),
    ttl: 86400  // 24 hours
  };
  
  // Store in Cosmos DB
  await cosmosContainer.items.create(session);
  
  // Return session ID to client (NOT the token!)
  return sessionId;
}
````

**Result:**
- Session stored in Cosmos DB
- Client receives session ID
- GitHub token never leaves the backend

---

### 2. Session Resolution

**Trigger:** Client makes authenticated API request

**Implementation:** `api/src/sessionStore.js` - `resolveSession()`

````javascript
async function resolveSession(request) {
  // 1. Extract session ID from header
  let sessionId = request.headers.get('x-session-token');
  
  // Fallback to Authorization header (backwards compatibility)
  if (!sessionId) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionId = authHeader.slice(7);
    }
  }
  
  if (!sessionId) return null;
  
  // 2. Look up session in Cosmos DB
  const { resource: session } = await cosmosContainer
    .item(sessionId, sessionId)
    .read();
  
  // 3. Check expiration
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }
  
  // 4. Return session data
  return {
    sessionId,
    githubToken: session.githubToken
  };
}
````

**Headers:**
- Primary: `X-Session-Token: <session_id>`
- Fallback: `Authorization: Bearer <session_id>`

**Why X-Session-Token?**  
Azure Static Web Apps intercepts the `Authorization` header for its own authentication middleware.

---

### 3. Session Usage

**Flow:**

````javascript
// Backend API endpoint
app.http('issues', {
  handler: async (request) => {
    // 1. Resolve session
    const session = await resolveSession(request);
    
    if (!session) {
      return { 
        status: 401, 
        jsonBody: { error: 'Session expired or invalid' } 
      };
    }
    
    // 2. Use GitHub token
    const response = await fetch('https://api.github.com/user/issues', {
      headers: {
        'Authorization': `Bearer ${session.githubToken}`
      }
    });
    
    return { jsonBody: await response.json() };
  }
});
````

---

### 4. Session Expiration

**Automatic Expiration:**
- Cosmos DB TTL automatically deletes sessions after 24 hours
- No cleanup code required

**Manual Expiration Check:**
- Backend checks `expiresAt` on every session lookup
- Returns `null` for expired sessions
- Deletes expired sessions from Cosmos DB

**Behavior:**
````javascript
if (session.expiresAt < Date.now()) {
  await destroySession(sessionId);
  return null;  // Client gets 401 Unauthorized
}
````

---

### 5. Session Destruction (Sign Out)

**Trigger:** User clicks "Sign Out"

**Implementation:** `api/src/sessionStore.js` - `destroySession()`

````javascript
async function destroySession(sessionId) {
  if (!sessionId) return;
  
  try {
    await cosmosContainer
      .item(sessionId, sessionId)
      .delete();
  } catch (error) {
    // 404 is OK (session already gone)
    if (error.code !== 404) {
      console.error('Delete error:', error.message);
    }
  }
}
````

**Client Flow:**
````javascript
async function signOut() {
  // 1. Notify backend
  await fetch('/api/logout', {
    method: 'POST',
    headers: { 'X-Session-Token': sessionId }
  });
  
  // 2. Clear local storage
  await deleteToken();
  
  // 3. Update UI state
  setToken(null);
}
````

---

## Storage Modes

### Production: Cosmos DB

**When:** Environment variables configured

````bash
COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
COSMOS_KEY=your_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

**Features:**
- ✅ Persistent across server restarts
- ✅ Shared across multiple backend instances
- ✅ Automatic TTL cleanup
- ✅ Scalable and durable

**Initialization:**

````javascript
const { CosmosClient } = await import('@azure/cosmos');

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY
});

// Create database and container if they don't exist
const { database } = await client.databases
  .createIfNotExists({ id: 'issuecrush' });

const { container } = await database.containers
  .createIfNotExists({
    id: 'sessions',
    partitionKey: { paths: ['/id'] },
    defaultTtl: 86400  // 24 hours
  });
````

---

### Development: In-Memory Fallback

**When:** Cosmos DB credentials not configured

````javascript
const memoryStore = new Map();

async function createSession(githubToken) {
  const sessionId = generateSessionId();
  memoryStore.set(sessionId, {
    id: sessionId,
    githubToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  });
  return sessionId;
}
````

**Features:**
- ✅ No setup required for local development
- ✅ Fast (no network calls)
- ⚠️ Lost on server restart
- ⚠️ Not shared across instances

**Use Case:** Local testing without Azure infrastructure

---

## Security Considerations

### Token Isolation

````
Client Side          Backend Side         Database
────────────        ────────────         ────────────

Session ID    ────> Session ID    ────>  GitHub Token
(opaque)             ↓ Resolve           (encrypted at rest)
                     │
                     ↓
                  GitHub API Call
                  with token
````

**Security Benefits:**

1. **Client Compromise:** Even if the client is compromised, the attacker only gets the session ID, not the GitHub token
2. **Token Rotation:** GitHub tokens can be rotated without affecting client storage
3. **Revocation:** Sessions can be revoked instantly (unlike tokens stored client-side)
4. **Audit Trail:** All GitHub API calls go through the backend (logging/monitoring)

---

### Session ID Generation

````javascript
import crypto from 'node:crypto';

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
  // Returns 64-character hex string (256 bits of entropy)
}
````

**Properties:**
- **Length:** 64 characters (128 hex digits = 256 bits)
- **Entropy:** 256 bits (2^256 possible values)
- **Collision Resistance:** Cryptographically secure random bytes
- **Unpredictability:** Cannot be guessed or predicted

---

### Cosmos DB Security

**Encryption:**
- Data encrypted at rest by default
- Transport encrypted via HTTPS
- Keys managed by Azure

**Access Control:**
- Backend uses primary key (full access)
- Keys stored in Azure SWA Application Settings (encrypted)
- Keys never exposed to client

**Network Security:**
- Firewall rules can restrict access to specific IP ranges
- Private endpoints available for VNet isolation

---

## Error Handling

### Session Not Found

**Cause:** Session ID doesn't exist in Cosmos DB

````javascript
const session = await getSessionToken(sessionId);
if (!session) {
  return {
    status: 401,
    jsonBody: { error: 'Session expired or invalid. Please sign in again.' }
  };
}
````

**Client Handling:**
````typescript
if (response.status === 401) {
  await signOut();  // Clear local session
  navigate('/login');
}
````

---

### Session Expired

**Cause:** Session TTL exceeded or manual expiration check failed

````javascript
if (session.expiresAt < Date.now()) {
  await destroySession(sessionId);  // Clean up
  return null;
}
````

**Same client handling as "Session Not Found"**

---

### Cosmos DB Unavailable

**Cause:** Network error, throttling, or service outage

````javascript
try {
  await cosmosContainer.items.create(session);
} catch (error) {
  // Retry for throttling (429)
  if (error.code === 429) {
    const retryAfterMs = error.retryAfterInMs || 1000;
    await new Promise(resolve => setTimeout(resolve, retryAfterMs));
    await cosmosContainer.items.create(session);
  } else {
    // Fail or fallback to in-memory
    throw error;
  }
}
````

---

## Performance Considerations

### Cosmos DB Request Units (RUs)

**Operations:**
- **Create:** ~10 RUs per session
- **Read:** ~1 RU per session lookup
- **Delete:** ~10 RUs per session

**Typical Usage:**
- 1000 logins/hour: 10,000 RUs/hour
- 10,000 API calls/hour: 10,000 RUs/hour
- **Total:** ~20,000 RUs/hour (~6 RUs/second)

**Provisioning:**
- Minimum: 400 RUs/second (auto-scale)
- Production: 1000 RUs/second recommended
- Serverless: Pay-per-request (good for low traffic)

---

### Caching Strategy

**No Caching Implemented:**
- Every API request looks up the session in Cosmos DB
- Acceptable latency (<10ms for most regions)

**Future Optimization (Optional):**
````javascript
const sessionCache = new Map();  // Backend memory cache

async function getSessionToken(sessionId) {
  // Check cache first
  const cached = sessionCache.get(sessionId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.githubToken;
  }
  
  // Cache miss - read from Cosmos DB
  const session = await cosmosContainer.item(sessionId, sessionId).read();
  sessionCache.set(sessionId, session);
  
  return session.githubToken;
}
````

**Trade-offs:**
- ✅ Reduced Cosmos DB costs
- ✅ Lower latency
- ⚠️ Memory usage increases
- ⚠️ Cache invalidation complexity

---

## Monitoring & Debugging

### Logging

**Session Creation:**
````javascript
console.log(`[SESSION] Creating session ${sessionId.slice(0, 8)}...`);
console.log(`[SESSION] Session stored in Cosmos DB`);
````

**Session Lookup:**
````javascript
console.log(`[SESSION] Looking up session ${sessionId.slice(0, 8)}...`);
console.log(`[SESSION] Session found and valid`);
// OR
console.log(`[SESSION] Session not found`);
console.log(`[SESSION] Session expired`);
````

### Azure Portal Metrics

**Cosmos DB Metrics:**
- Total Requests
- Request Units
- Throttled Requests (429 errors)
- Availability
- Latency (P50, P99)

**Azure Functions Metrics:**
- Invocation Count
- Execution Time
- Errors

---

## Local Development Setup

### Without Cosmos DB (In-Memory)

````bash
# Just start the server - no config needed
npm run server
````

**Limitations:**
- Sessions lost on server restart
- Must sign in again after restart

---

### With Cosmos DB (Persistent)

1. **Create Cosmos DB Account:**

````bash
# Using Azure CLI
az cosmosdb create \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --locations regionName=eastus failoverPriority=0
````

2. **Get Connection Details:**

````bash
# Get endpoint
az cosmosdb show --name issuecrush-cosmos --resource-group issuecrush-rg \
  --query documentEndpoint -o tsv

# Get key
az cosmosdb keys list --name issuecrush-cosmos --resource-group issuecrush-rg \
  --query primaryMasterKey -o tsv
````

3. **Configure Environment:**

````bash
# .env
COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
COSMOS_KEY=your_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

4. **Start Server:**

````bash
npm run server
# Database and container auto-created on first run
````

---

## Production Deployment

### Azure Static Web Apps Configuration

1. **Set Application Settings in Azure Portal:**

````
Configuration → Application settings:

COSMOS_ENDPOINT=https://issuecrush-cosmos.documents.azure.com:443/
COSMOS_KEY=<from_azure_portal>
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

2. **Verify Deployment:**

````bash
# Check health endpoint
curl https://your-app.azurestaticapps.net/api/health

# Sign in and test session
# Should persist across backend restarts
````

---

## Troubleshooting

### "Cosmos DB not configured — using in-memory session store"

**Cause:** Missing environment variables

**Solution:** Set `COSMOS_ENDPOINT` and `COSMOS_KEY`

---

### "Session expired or invalid"

**Causes:**
- Session TTL exceeded (24 hours)
- Server restart (in-memory mode)
- Session manually deleted

**Solution:** Sign out and sign in again

---

### "Cosmos DB init failed"

**Causes:**
- Invalid endpoint or key
- Network connectivity issue
- Cosmos DB account doesn't exist

**Solution:**
1. Verify connection details in Azure Portal
2. Check firewall rules
3. Test connectivity: `curl https://your-account.documents.azure.com`

---

## See Also

- [OAuth Flow Guide](./oauth-flow.md) - Authentication flow details
- [Backend API Reference](../api/backend-api.md) - API endpoint documentation
- [Deployment Guide](../guides/azure-deployment.md) - Production setup
