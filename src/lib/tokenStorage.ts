import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Stores the opaque session ID (NOT the GitHub token).
// The actual GitHub token lives server-side in Cosmos DB.
const SESSION_KEY = 'issuecrush-session-id';

/**
 * Saves the session ID to secure storage.
 * 
 * Platform-specific behavior:
 * - **Web**: Uses AsyncStorage (localStorage)
 * - **iOS/Android**: Uses expo-secure-store (Keychain/Keystore)
 * 
 * @param sessionId - Opaque session ID from backend authentication
 * 
 * @example
 * await saveToken("abc123-session-id-xyz789");
 */
export async function saveToken(sessionId: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SESSION_KEY, sessionId);
  } else {
    await SecureStore.setItemAsync(SESSION_KEY, sessionId);
  }
}

/**
 * Retrieves the session ID from secure storage.
 * 
 * @returns Promise resolving to session ID string, or null if not found
 * 
 * @example
 * const sessionId = await getToken();
 * if (sessionId) {
 *   // User is authenticated
 * }
 */
export async function getToken() {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

/**
 * Deletes the session ID from secure storage (logout).
 * 
 * @example
 * await deleteToken();
 */
export async function deleteToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}
