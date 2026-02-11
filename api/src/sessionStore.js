import crypto from 'node:crypto';

// In Azure Functions, Cosmos DB env vars come from Application Settings
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory fallback for local dev without Cosmos DB
const memoryStore = new Map();

let cosmosContainer = null;
let initialized = false;

function isCosmosConfigured() {
  return !!(process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY);
}

export async function initCosmos() {
  if (initialized) return;

  if (!isCosmosConfigured()) {
    console.log('Cosmos DB not configured — using in-memory session store');
    initialized = true;
    return;
  }

  try {
    const { CosmosClient } = await import('@azure/cosmos');
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
    });

    const dbId = process.env.COSMOS_DATABASE || 'issuecrush';
    const containerId = process.env.COSMOS_CONTAINER || 'sessions';

    const { database } = await client.databases.createIfNotExists({ id: dbId });
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ['/id'] },
      defaultTtl: Math.floor(SESSION_TTL_MS / 1000),
    });

    cosmosContainer = container;
    initialized = true;
    console.log(`Cosmos DB session store ready (${dbId}/${containerId})`);
  } catch (error) {
    console.error('Cosmos DB init failed, falling back to in-memory:', error.message);
    cosmosContainer = null;
    initialized = true;
  }
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(githubToken) {
  await initCosmos();
  const sessionId = generateSessionId();
  const now = Date.now();
  const session = {
    id: sessionId,
    githubToken,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    ttl: Math.floor(SESSION_TTL_MS / 1000),
  };

  console.log(`[SESSION] Creating session ${sessionId.slice(0, 8)}... cosmosContainer=${!!cosmosContainer}`);

  if (cosmosContainer) {
    try {
      await cosmosContainer.items.create(session);
      console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... stored in Cosmos DB`);
    } catch (error) {
      console.error(`[SESSION] Cosmos create error: ${error.message}, code=${error.code}`);
      if (error.code === 429) {
        const retryAfterMs = error.retryAfterInMs || 1000;
        await new Promise((r) => setTimeout(r, retryAfterMs));
        await cosmosContainer.items.create(session);
        console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... stored after retry`);
      } else {
        throw error;
      }
    }
  } else {
    memoryStore.set(sessionId, session);
    console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... stored in memory (Cosmos not available)`);
  }

  return sessionId;
}

export async function getSessionToken(sessionId) {
  if (!sessionId) return null;
  await initCosmos();

  console.log(`[SESSION] Looking up session ${sessionId.slice(0, 8)}... cosmosContainer=${!!cosmosContainer}`);

  if (cosmosContainer) {
    try {
      const { resource } = await cosmosContainer.item(sessionId, sessionId).read();
      if (!resource) {
        console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... not found in Cosmos`);
        return null;
      }
      if (resource.expiresAt < Date.now()) {
        console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... expired`);
        await destroySession(sessionId);
        return null;
      }
      console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... found and valid`);
      return resource.githubToken;
    } catch (error) {
      if (error.code === 404) {
        console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... 404 not found`);
        return null;
      }
      console.error('Cosmos DB read error:', error.message);
      return null;
    }
  }

  const session = memoryStore.get(sessionId);
  if (!session) {
    console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... not in memory store`);
    return null;
  }
  if (session.expiresAt < Date.now()) {
    console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... expired in memory`);
    memoryStore.delete(sessionId);
    return null;
  }
  console.log(`[SESSION] Session ${sessionId.slice(0, 8)}... found in memory`);
  return session.githubToken;
}

export async function destroySession(sessionId) {
  if (!sessionId) return;
  await initCosmos();

  if (cosmosContainer) {
    try {
      await cosmosContainer.item(sessionId, sessionId).delete();
    } catch (error) {
      if (error.code !== 404) console.error('Cosmos DB delete error:', error.message);
    }
  } else {
    memoryStore.delete(sessionId);
  }
}

/**
 * Extract session ID from request header, return the GitHub token.
 * Uses X-Session-Token header to avoid Azure SWA overwriting the Authorization header.
 */
export async function resolveSession(request) {
  // Try custom header first (preferred), then fall back to Authorization for backwards compatibility
  let sessionId = request.headers.get('x-session-token');

  if (!sessionId) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.slice(7);
    }
  }

  if (!sessionId) return null;

  const token = await getSessionToken(sessionId);
  return token ? { sessionId, githubToken: token } : null;
}
