# Session Management

How IssueCrush manages user sessions and token storage.

## Architecture

````
Client Storage           Server Storage
┌─────────────┐         ┌──────────────┐
│ Session ID  │ ◄────── │ GitHub Token │
│ (opaque)    │         │ + Metadata   │
└─────────────┘         └──────────────┘
     │                         │
     ▼                         ▼
Platform-specific          Cosmos DB
 SecureStore                (24h TTL)
 AsyncStorage
````

## Client-Side Storage

### Mobile (iOS/Android)

**Technology:** `expo-secure-store`

**Storage:** Device secure enclave (encrypted)

**Code:**
````typescript
await SecureStore.setItemAsync('issuecrush-session-id', sessionId);
const sessionId = await SecureStore.getItemAsync('issuecrush-session-id');
````

**Persistence:** Until app uninstall or explicit deletion

### Web (Browser)

**Technology:** `@react-native-async-storage/async-storage`

**Storage:** `localStorage`

**Code:**
````typescript
await AsyncStorage.setItem('issuecrush-session-id', sessionId);
const sessionId = await AsyncStorage.getItem('issuecrush-session-id');
````

**Persistence:** Until browser data cleared

## Server-Side Storage

### Session Schema

````json
{
  "id": "session_1a2b3c4d",
  "githubToken": "gho_xxxxx",
  "createdAt": "2026-03-22T16:00:00.000Z",
  "ttl": 86400
}
````

### Storage Options

**Development (default):**
- In-memory JavaScript Map
- Lost on server restart
- No configuration required

**Production:**
- Azure Cosmos DB NoSQL
- Persistent across restarts
- Automatic TTL cleanup
- Requires `COSMOS_*` environment variables

## Session Resolution

Every API request resolves session ID to GitHub token:

````typescript
async function resolveSession(req) {
  const sessionId = req.headers['x-session-token'];
  const session = await getSession(sessionId);
  return session.githubToken;
}
````

## Related Documentation

- [Authentication Flow](./authentication-flow.md)
- [Platform Differences](./platform-differences.md)
- [Set Up Cosmos DB](../../how-to/setup-cosmos-db.md)
