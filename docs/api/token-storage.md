# Token Storage

The Token Storage module (`src/lib/tokenStorage.ts`) provides secure, platform-aware session token storage.

## Overview

- **Location**: `src/lib/tokenStorage.ts`
- **Purpose**: Securely store session IDs (not GitHub tokens)
- **Platforms**: 
  - Mobile (iOS/Android): Uses `expo-secure-store` (encrypted keychain)
  - Web: Uses `@react-native-async-storage/async-storage` (localStorage)

## Important: What Gets Stored

⚠️ **Session IDs only** - This module stores opaque session IDs, NOT GitHub access tokens.

The actual GitHub tokens are stored server-side in Cosmos DB. The client only knows the session ID, which the server uses to look up the real token.

## Functions

### `saveToken()`

Saves a session ID to secure storage.

````typescript
async function saveToken(sessionId: string): Promise<void>
````

**Parameters:**
- `sessionId` - Opaque session identifier from server

**Returns:** Promise that resolves when saved

**Example:**

````typescript
import { saveToken } from './lib/tokenStorage';

// After successful OAuth exchange
const response = await fetch('/api/github-token', {
  method: 'POST',
  body: JSON.stringify({ code }),
});
const { session_id } = await response.json();

await saveToken(session_id);
````

---

### `getToken()`

Retrieves the stored session ID.

````typescript
async function getToken(): Promise<string | null>
````

**Returns:** Session ID if found, `null` if not found

**Example:**

````typescript
import { getToken } from './lib/tokenStorage';

const sessionId = await getToken();

if (sessionId) {
  // User is authenticated
  const issues = await fetchIssues(sessionId);
} else {
  // User needs to sign in
  showLoginScreen();
}
````

---

### `deleteToken()`

Removes the stored session ID.

````typescript
async function deleteToken(): Promise<void>
````

**Returns:** Promise that resolves when deleted

**Example:**

````typescript
import { deleteToken } from './lib/tokenStorage';

// On sign out
await deleteToken();
setToken(null);
````

## Platform Implementation

### Mobile (iOS/Android)

Uses `expo-secure-store` which leverages platform-native secure storage:

- **iOS**: Keychain Services
- **Android**: EncryptedSharedPreferences (backed by Keystore)

````typescript
import * as SecureStore from 'expo-secure-store';

// Save
await SecureStore.setItemAsync(SESSION_KEY, sessionId);

// Get
const sessionId = await SecureStore.getItemAsync(SESSION_KEY);

// Delete
await SecureStore.deleteItemAsync(SESSION_KEY);
````

### Web

Uses `@react-native-async-storage/async-storage` which uses `localStorage`:

````typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save
await AsyncStorage.setItem(SESSION_KEY, sessionId);

// Get
const sessionId = await AsyncStorage.getItem(SESSION_KEY);

// Delete
await AsyncStorage.removeItem(SESSION_KEY);
````

## Storage Key

The module uses a consistent key across platforms:

````typescript
const SESSION_KEY = 'issuecrush-session-id';
````

## Security Considerations

### What's Stored
- ✅ Opaque session IDs (UUIDs)
- ❌ GitHub access tokens (stored server-side only)
- ❌ User credentials (OAuth only, never stored)

### Platform Security

| Platform | Storage Mechanism | Encryption |
|----------|-------------------|------------|
| iOS | Keychain Services | Hardware-backed (Secure Enclave on newer devices) |
| Android | EncryptedSharedPreferences | Hardware-backed Keystore |
| Web | localStorage | None (stored in plaintext) |

**Web Limitation**: `localStorage` is not encrypted. This is acceptable because:
1. Session IDs are opaque and time-limited
2. Actual GitHub tokens never reach the client
3. Sessions have 24-hour TTL in Cosmos DB

### Best Practices

1. **Always clear on sign out** - Call `deleteToken()` when user signs out
2. **Handle expiration** - Check for 401 responses and prompt re-authentication
3. **Don't log tokens** - Never log session IDs in production

## Usage Pattern

This module is typically used by the `useAuth` hook:

````typescript
import { getToken, saveToken, deleteToken } from '../lib/tokenStorage';

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);

  // Hydrate on mount
  useEffect(() => {
    const hydrate = async () => {
      const stored = await getToken();
      if (stored) setToken(stored);
    };
    hydrate();
  }, []);

  // Save after login
  const handleLogin = async (code: string) => {
    const { session_id } = await exchangeCode(code);
    await saveToken(session_id);
    setToken(session_id);
  };

  // Clear on logout
  const signOut = async () => {
    await deleteToken();
    setToken(null);
  };

  return { token, handleLogin, signOut };
}
````

## Testing

See `src/lib/tokenStorage.test.ts` for unit tests with platform-specific mocks.

## Related

- [useAuth Hook](../hooks/README.md#useauth) - Authentication hook that uses this module
- [Server Endpoints](./server-endpoints.md) - Backend session management
