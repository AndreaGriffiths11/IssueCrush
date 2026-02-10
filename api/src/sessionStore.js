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

  if (cosmosContainer) {
    try {
      await cosmosContainer.items.create(session);
    } catch (error) {
      if (error.code === 429) {
        const retryAfterMs = error.retryAfterInMs || 1000;
        await new Promise((r) => setTimeout(r, retryAfterMs));
        await cosmosContainer.items.create(session);
      } else {
        throw error;
      }
    }
  } else {
    memoryStore.set(sessionId, session);
  }

  return sessionId;
}

export async function getSessionToken(sessionId) {
  if (!sessionId) return null;
  await initCosmos();

  if (cosmosContainer) {
    try {
      const { resource } = await cosmosContainer.item(sessionId, sessionId).read();
      if (!resource) return null;
      if (resource.expiresAt < Date.now()) {
        await destroySession(sessionId);
        return null;
      }
      return resource.githubToken;
    } catch (error) {
      if (error.code === 404) return null;
      console.error('Cosmos DB read error:', error.message);
      return null;
    }
  }

  const session = memoryStore.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    memoryStore.delete(sessionId);
    return null;
  }
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
 * Extract session ID from request Authorization header, return the GitHub token.
 */
export async function resolveSession(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const sessionId = authHeader.slice(7);
  const token = await getSessionToken(sessionId);
  return token ? { sessionId, githubToken: token } : null;
}
