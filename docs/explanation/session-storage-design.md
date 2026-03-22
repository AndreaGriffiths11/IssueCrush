# Session Storage Design

Why IssueCrush uses opaque session IDs with server-side token storage.

## Design Goals

1. **Security:** Never expose GitHub token to client
2. **Simplicity:** Single token per user
3. **Scalability:** Support multiple server instances
4. **Cost-effective:** Minimal storage overhead

## Alternative Designs Considered

### 1. Client-Side Token Storage

**Pattern:** Store GitHub token in client storage

**Rejected because:**
- Security risk (token exposed in localStorage/SecureStore)
- Token visible in browser dev tools
- XSS vulnerabilities could leak token
- Violates OAuth best practices

### 2. JWT-Based Sessions

**Pattern:** Encode GitHub token in signed JWT

**Rejected because:**
- Token still visible (base64-encoded in JWT)
- Cannot revoke sessions (JWT is stateless)
- Adds complexity (signing/verification)
- Larger token size (bandwidth overhead)

### 3. Encrypted Client-Side Tokens

**Pattern:** Encrypt GitHub token, store on client

**Rejected because:**
- Encryption key management complexity
- Still vulnerable to XSS (key must be accessible)
- Adds latency (encrypt/decrypt overhead)
- No server-side revocation

## Chosen Design: Opaque Session IDs

**Pattern:**
- Client stores: `session_abc123` (opaque ID)
- Server stores: `{ id: 'session_abc123', githubToken: 'gho_xxxxx' }`

**Advantages:**
- ✅ GitHub token never leaves server
- ✅ Server-side revocation (delete session)
- ✅ Simple client implementation
- ✅ Standard OAuth pattern
- ✅ Easy to audit (all tokens in one place)

**Disadvantages:**
- ❌ Requires session storage (Cosmos DB or in-memory)
- ❌ Server-side lookup on every request

## Implementation Details

### Session ID Generation

````typescript
const sessionId = `session_${crypto.randomBytes(16).toString('hex')}`;
````

- 32 hex characters (128 bits of entropy)
- Collision probability: ~10^-38
- Unpredictable (cryptographically secure)

### Storage Schema

````json
{
  "id": "session_abc123",          // Partition key
  "githubToken": "gho_xxxxx",      // Encrypted at rest by Cosmos DB
  "createdAt": "2026-03-22T...",   // Audit trail
  "ttl": 86400                     // Auto-deletion after 24 hours
}
````

### Session Resolution

Every API request:
1. Extract session ID from `X-Session-Token` header
2. Look up session in storage
3. Retrieve GitHub token
4. Make GitHub API call with token

**Latency:** ~10-20ms (Cosmos DB read)

## Security Properties

### Attack Scenarios

**1. XSS Attack:**
- Attacker gets session ID from client storage
- ✅ Can make API calls (limited by 24h TTL)
- ✅ Cannot extract GitHub token
- ✅ User can revoke session (logout)

**2. Session Hijacking:**
- Attacker intercepts session ID
- ✅ Mitigated by HTTPS (encryption in transit)
- ✅ Limited by TTL (expires in 24h)
- ✅ No refresh mechanism (attacker can't extend)

**3. Database Breach:**
- Attacker gains Cosmos DB access
- ❌ GitHub tokens exposed
- ✅ Mitigated by Cosmos DB encryption at rest
- ✅ Mitigated by short TTL (tokens expire quickly)

### Comparison to Alternatives

| Attack | Client-Side Token | JWT Token | Opaque Session |
|--------|-------------------|-----------|----------------|
| XSS | ❌ Token stolen | ❌ Token stolen | ✅ Session ID only |
| MITM | ✅ HTTPS protects | ✅ HTTPS protects | ✅ HTTPS protects |
| DB Breach | N/A | N/A | ⚠️ Tokens in DB |
| Token Theft | ❌ Permanent | ❌ Until expiry | ✅ Can revoke |

## Scalability Considerations

### Single-Instance Deployment

**In-memory storage:**
- Fast (no network latency)
- Simple implementation
- Lost on restart

### Multi-Instance Deployment

**Cosmos DB storage:**
- Shared across instances
- Persistent across restarts
- ~10ms read latency
- Auto-scales with RU/s

### Cost Analysis

**100 active users:**
- 100 session creates/day
- 1000 session reads/day
- 100 session deletes/day

**Cosmos DB cost:**
- ~1200 operations/day × 30 days = 36,000 ops/month
- ~36,000 RU/month × $0.00008/RU = **$2.88/month**

**Alternative (Redis):**
- Azure Cache for Redis: ~$15/month minimum

## Future Optimizations

### Session Caching

Cache sessions in-memory (per instance):
````typescript
const sessionCache = new Map<string, Session>();

async function getSession(id: string) {
  if (sessionCache.has(id)) {
    return sessionCache.get(id);  // Fast path
  }
  const session = await cosmosDB.read(id);  // Slow path
  sessionCache.set(id, session);
  return session;
}
````

**Benefit:** Reduces Cosmos DB reads by ~90%
**Trade-off:** Slightly stale data (cache TTL needed)

### Token Rotation

Rotate GitHub tokens periodically:
````typescript
if (Date.now() - session.lastRefreshed > 12 * 60 * 60 * 1000) {
  const newToken = await refreshGitHubToken(session.refreshToken);
  await updateSession(session.id, { githubToken: newToken });
}
````

**Benefit:** Limits token lifetime even if session stolen
**Complexity:** Requires refresh token support

## Related Documentation

- [Authentication Flow](../reference/architecture/authentication-flow.md)
- [Session Management](../reference/architecture/session-management.md)
- [Architecture Overview](../reference/architecture/overview.md)
