const { CosmosClient } = require('@azure/cosmos');
const crypto = require('crypto');

// Singleton CosmosClient (reuse per Azure SDK best practices)
let client = null;
let container = null;
let initialized = false;

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory fallback for local development without Cosmos DB
const memoryStore = new Map();

function isCosmosConfigured() {
  return !!(process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY);
}

async function initCosmos() {
  if (initialized) return;

  if (!isCosmosConfigured()) {
    console.log('⚠️  Cosmos DB not configured — using in-memory session store');
    console.log('   Set COSMOS_ENDPOINT and COSMOS_KEY for persistent sessions');
    initialized = true;
    return;
  }

  try {
    client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
    });

    const dbId = process.env.COSMOS_DATABASE || 'issuecrush';
    const containerId = process.env.COSMOS_CONTAINER || 'sessions';

    // Create database and container if they don't exist
    const { database } = await client.databases.createIfNotExists({ id: dbId });
    const { container: c } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ['/id'] },
      defaultTtl: Math.floor(SESSION_TTL_MS / 1000), // Cosmos TTL is in seconds
    });

    container = c;
    initialized = true;
    console.log(`✅ Cosmos DB session store ready (${dbId}/${containerId})`);
  } catch (error) {
    console.error('❌ Cosmos DB init failed, falling back to in-memory:', error.message);
    container = null;
    initialized = true;
  }
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new session storing the GitHub token server-side.
 * Returns the session ID (safe to send to the client).
 */
async function createSession(githubToken) {
  await initCosmos();

  const sessionId = generateSessionId();
  const now = Date.now();
  const session = {
    id: sessionId,
    githubToken,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    // Cosmos TTL field (seconds until expiry)
    ttl: Math.floor(SESSION_TTL_MS / 1000),
  };

  if (container) {
    try {
      await container.items.create(session);
    } catch (error) {
      if (error.code === 429) {
        // Handle rate limiting with retry-after
        const retryAfterMs = (error.retryAfterInMs || 1000);
        console.warn(`Cosmos DB rate limited, retrying after ${retryAfterMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
        await container.items.create(session);
      } else {
        throw error;
      }
    }
  } else {
    memoryStore.set(sessionId, session);
  }

  return sessionId;
}

/**
 * Retrieve the GitHub token for a given session ID.
 * Returns null if session doesn't exist or is expired.
 */
async function getSessionToken(sessionId) {
  if (!sessionId) return null;
  await initCosmos();

  if (container) {
    try {
      const { resource } = await container.item(sessionId, sessionId).read();
      if (!resource) return null;
      if (resource.expiresAt < Date.now()) {
        // Expired — clean up
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

  // In-memory fallback
  const session = memoryStore.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    memoryStore.delete(sessionId);
    return null;
  }
  return session.githubToken;
}

/**
 * Destroy a session (logout).
 */
async function destroySession(sessionId) {
  if (!sessionId) return;
  await initCosmos();

  if (container) {
    try {
      await container.item(sessionId, sessionId).delete();
    } catch (error) {
      if (error.code !== 404) {
        console.error('Cosmos DB delete error:', error.message);
      }
    }
  } else {
    memoryStore.delete(sessionId);
  }
}

/**
 * Express middleware: extracts session ID from Authorization header,
 * looks up the GitHub token, attaches it to req.githubToken.
 */
function sessionMiddleware() {
  return async (req, res, next) => {
    // Read X-Session-Token first (Azure SWA intercepts Authorization header),
    // fall back to Authorization: Bearer for compatibility
    let sessionId = req.headers['x-session-token'];
    if (!sessionId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.slice(7);
      }
    }

    if (sessionId) {
      const token = await getSessionToken(sessionId);
      if (token) {
        req.githubToken = token;
        req.sessionId = sessionId;
      }
    }
    next();
  };
}

/**
 * Express middleware: requires a valid session (returns 401 if missing).
 */
function requireSession() {
  return (req, res, next) => {
    if (!req.githubToken) {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
    next();
  };
}

module.exports = {
  initCosmos,
  createSession,
  getSessionToken,
  destroySession,
  sessionMiddleware,
  requireSession,
};
