import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getToken, saveToken, deleteToken } from '../lib/tokenStorage';

const CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
const DEFAULT_SCOPE = process.env.EXPO_PUBLIC_GITHUB_SCOPE || 'repo';
const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

// On web: use the server's /callback relay so the redirect_uri matches what's
// registered in the GitHub OAuth app (port 3000). In production both the app
// and the API share the same origin, so window.location.origin works directly.
const REDIRECT_URI =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? API_URL && API_URL.startsWith('http://localhost')
      ? `${API_URL}/callback`
      : window.location.origin
    : AuthSession.makeRedirectUri({ preferLocalhost: true });

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [copilotAvailable, setCopilotAvailable] = useState<boolean | null>(null);

  const exchangeCodeForToken = useCallback(async (code: string) => {
    try {
      setAuthError('');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const tokenResponse = await fetch(`${apiUrl}/api/github-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        setAuthError(`Server error: ${tokenResponse.status} - ${errorText}`);
        return;
      }

      const data = await tokenResponse.json();

      if (data.error) {
        setAuthError(data.error_description || data.error || 'GitHub OAuth failed.');
        return;
      }

      if (data.session_id) {
        await saveToken(data.session_id);
        setToken(data.session_id);
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return true;
      } else {
        setAuthError('No session received from server');
      }
    } catch (error) {
      setAuthError(`Failed to connect to auth server: ${(error as Error).message}. Make sure the server is running.`);
    }
    return false;
  }, []);

  const startLogin = useCallback(async () => {
    try {
      if (!CLIENT_ID) {
        setAuthError('Missing EXPO_PUBLIC_GITHUB_CLIENT_ID env var.');
        return;
      }
      setAuthError('');

      if (Platform.OS === 'web') {
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(
          DEFAULT_SCOPE
        )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        if (typeof window !== 'undefined') {
          window.location.href = authUrl;
        } else {
          setAuthError('Unable to open GitHub login (window unavailable).');
        }
      } else {
        const redirectUri = AuthSession.makeRedirectUri({
          scheme: 'issuecrush',
          preferLocalhost: false,
        });

        const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(
          DEFAULT_SCOPE
        )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const code = url.searchParams.get('code');

          if (code) {
            await exchangeCodeForToken(code);
          } else {
            setAuthError('No authorization code received');
          }
        } else if (result.type !== 'cancel') {
          setAuthError('OAuth flow failed');
        }
      }
    } catch (error) {
      setAuthError(`Failed to start login: ${(error as Error).message}`);
    }
  }, [exchangeCodeForToken]);

  const signOut = useCallback(async () => {
    const sessionId = token;
    setToken(null);
    await deleteToken();
    if (sessionId) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      fetch(`${apiUrl}/api/logout`, {
        method: 'POST',
        headers: { 'X-Session-Token': sessionId },
      }).catch(() => {});
    }
  }, [token]);

  // Hydrate token from storage on mount
  useEffect(() => {
    const hydrate = async () => {
      const stored = await getToken();
      if (stored) setToken(stored);
    };
    hydrate();

    // Check if Copilot is available
    const checkCopilot = async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/api/health`);
        const data = await response.json();
        setCopilotAvailable(data.copilotAvailable === true);
      } catch {
        setCopilotAvailable(false);
      }
    };
    checkCopilot();
  }, []);

  // Handle OAuth callback on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code && !token) {
        exchangeCodeForToken(code);
      }
    }
  }, []);

  return {
    token,
    authError,
    setAuthError,
    copilotAvailable,
    startLogin,
    signOut,
  };
}
