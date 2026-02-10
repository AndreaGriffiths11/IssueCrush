import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Stores the opaque session ID (NOT the GitHub token).
// The actual GitHub token lives server-side in Cosmos DB.
const SESSION_KEY = 'issuecrush-session-id';

export async function saveToken(sessionId: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SESSION_KEY, sessionId);
  } else {
    await SecureStore.setItemAsync(SESSION_KEY, sessionId);
  }
}

export async function getToken() {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function deleteToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}
