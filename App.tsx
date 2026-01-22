import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as AuthSession from 'expo-auth-session';
import Swiper from 'react-native-deck-swiper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { fetchIssues, GitHubIssue, updateIssueState, extractRepoPath } from './src/api/github';
import { deleteToken, getToken, saveToken } from './src/lib/tokenStorage';

const CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
const DEFAULT_SCOPE = process.env.EXPO_PUBLIC_GITHUB_SCOPE || 'repo';
const REDIRECT_URI = AuthSession.getRedirectUrl();

type DeviceAuthState = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [repoFilter, setRepoFilter] = useState('');
  const [feedback, setFeedback] = useState('');
  const [deviceAuth, setDeviceAuth] = useState<DeviceAuthState | null>(null);
  const [authError, setAuthError] = useState('');
  const [undoBusy, setUndoBusy] = useState(false);
  const [lastClosed, setLastClosed] = useState<GitHubIssue | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      const stored = await getToken();
      if (stored) setToken(stored);
    };
    hydrate();
    return () => {
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setIssues([]);
      setCurrentIndex(0);
      return;
    }
    loadIssues();
  }, [token]);

  const repoLabel = (issue: GitHubIssue) =>
    issue.repository?.full_name ?? extractRepoPath(issue.repository_url);

  const loadIssues = async () => {
    if (!token) return;
    setLoadingIssues(true);
    setAuthError('');
    try {
      const data = await fetchIssues(token, repoFilter.trim() || undefined);
      setIssues(data);
      setCurrentIndex(0);
      setFeedback(data.length ? `Loaded ${data.length} open issues` : 'No open issues found');
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setLoadingIssues(false);
    }
  };

  const startDeviceFlow = async () => {
    if (!CLIENT_ID) {
      setAuthError('Missing EXPO_PUBLIC_GITHUB_CLIENT_ID env var.');
      return;
    }
    setAuthError('');
    setDeviceAuth(null);
    if (pollTimeout.current) clearTimeout(pollTimeout.current);

    if (Platform.OS === 'web') {
      // Use Authorization Code Flow for web
      try {
        const result = await AuthSession.startAsync({
          authUrl: `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(DEFAULT_SCOPE)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
          returnUrl: REDIRECT_URI,
        });

        if (result.type !== 'success') {
          setAuthError('GitHub login cancelled.');
          return;
        }

        const params = new URL(result.url).searchParams;
        const code = params.get('code');

        if (!code) {
          setAuthError('No authorization code received.');
          return;
        }

        // Exchange code for token via backend
        const tokenResponse = await fetch('http://localhost:3000/api/github-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await tokenResponse.json();

        if (data.error) {
          setAuthError(data.error_description || data.error || 'GitHub OAuth failed.');
          return;
        }

        if (data.access_token) {
          await saveToken(data.access_token);
          setToken(data.access_token);
          setFeedback('Connected to GitHub');
        }
      } catch (error) {
        setAuthError((error as Error).message);
      }
    } else {
      // Use Device Flow for mobile
      const body = new URLSearchParams({
        client_id: CLIENT_ID,
        scope: DEFAULT_SCOPE,
      }).toString();

      const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
      });

      if (!response.ok) {
        setAuthError('Unable to start GitHub device login.');
        return;
      }

      const data = (await response.json()) as DeviceAuthState;
      setDeviceAuth(data);
      schedulePoll(data, data.interval || 5);
    }
  };

  const schedulePoll = (info: DeviceAuthState, intervalSeconds: number) => {
    if (pollTimeout.current) clearTimeout(pollTimeout.current);

    pollTimeout.current = setTimeout(async () => {
      try {
        const body = new URLSearchParams({
          client_id: CLIENT_ID,
          device_code: info.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }).toString();

        const response = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body,
        });

        const data = await response.json();

        if (data.error === 'authorization_pending') {
          schedulePoll(info, intervalSeconds);
          return;
        }

        if (data.error === 'slow_down') {
          schedulePoll(info, intervalSeconds + 2);
          return;
        }

        if (data.error) {
          setAuthError(data.error_description || 'GitHub OAuth failed.');
          return;
        }

        if (data.access_token) {
          await saveToken(data.access_token);
          setToken(data.access_token);
          setDeviceAuth(null);
          setFeedback('Connected to GitHub');
          return;
        }
      } catch (error) {
        setAuthError((error as Error).message);
      }
    }, intervalSeconds * 1000);
  };

  const signOut = async () => {
    setToken(null);
    setDeviceAuth(null);
    setIssues([]);
    await deleteToken();
    if (pollTimeout.current) clearTimeout(pollTimeout.current);
  };

  const handleSwipeLeft = async (cardIndex: number) => {
    const issue = issues[cardIndex];
    if (!issue || !token) return;
    // Don't remove from issues list to keep indices stable with Swiper
    setFeedback(`Closed #${issue.number} · ${repoLabel(issue)}`);
    setLastClosed(issue);
    try {
      await updateIssueState(token, issue, 'closed');
    } catch (error) {
      setFeedback(`Close failed: ${(error as Error).message}`);
      setLastClosed(null);
    }
  };

  const handleSwipeRight = (cardIndex: number) => {
    const issue = issues[cardIndex];
    if (!issue) return;
    setFeedback(`Kept open · #${issue.number}`);
  };

  const handleUndo = async () => {
    if (!lastClosed || !token) return;
    setUndoBusy(true);
    try {
      await updateIssueState(token, lastClosed, 'open');
      // To properly undo in the UI with Swiper, we'd need to decrement currentIndex
      // and swipe back. For now, we'll just re-open in backend and give feedback.
      // If we want to show it again, we might need to manipulate the stack or refresh.
      setFeedback(`Reopened #${lastClosed.number}`);
      setLastClosed(null);
    } catch (error) {
      setFeedback(`Undo failed: ${(error as Error).message}`);
    } finally {
      setUndoBusy(false);
    }
  };

  const overlayLabels = useMemo(
    () => ({
      left: {
        title: 'CLOSE',
        style: {
          label: {
            backgroundColor: 'transparent',
            borderColor: '#ef4444',
            color: '#ef4444',
            borderWidth: 4,
            fontSize: 24,
            fontWeight: '800',
            textAlign: 'center',
            padding: 10,
          },
          wrapper: {
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            marginTop: 20,
            marginLeft: -20,
          }
        },
      },
      right: {
        title: 'KEEP',
        style: {
          label: {
            backgroundColor: 'transparent',
            borderColor: '#10b981',
            color: '#10b981',
            borderWidth: 4,
            fontSize: 24,
            fontWeight: '800',
            textAlign: 'center',
            padding: 10,
          },
          wrapper: {
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            marginTop: 20,
            marginLeft: 20,
          }
        },
      },
    }),
    []
  );

  const renderIssueCard = (issue: GitHubIssue | null) => {
    if (!issue) return <View style={[styles.card, styles.cardEmpty]} />;
    return (
      <View style={styles.card}>
        <Text style={styles.repo}>{repoLabel(issue)}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(issue.html_url)}>
          <Text style={styles.title} numberOfLines={3}>
            <Text style={{ color: '#38bdf8' }}>#{issue.number}</Text> · {issue.title}
          </Text>
        </TouchableOpacity>
        <View style={styles.labels}>
          {issue.labels?.length ? (
            issue.labels.slice(0, 6).map((label) => (
              <View
                key={label.id}
                style={[styles.label, { backgroundColor: `#${label.color || '334155'}` }]}
              >
                <Text style={styles.labelText}>{label.name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.labelTextMuted}>No labels</Text>
          )}
        </View>
        <Text style={styles.meta}>Swipe right to keep · left to close</Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <RNStatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.brand}>IssueCrush</Text>
          {token ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!token ? (
          <View style={styles.authCard}>
            <Text style={styles.hero}>Swipe through your GitHub issues</Text>
            <Text style={styles.copy}>
              Login uses GitHub device flow. Approve the code to continue. Scope:{' '}
              <Text style={styles.mono}>{DEFAULT_SCOPE}</Text>
            </Text>
            {!CLIENT_ID ? (
              <Text style={styles.error}>
                Add EXPO_PUBLIC_GITHUB_CLIENT_ID to your env (see .env.example).
              </Text>
            ) : null}
            <TouchableOpacity style={styles.primaryButton} onPress={startDeviceFlow}>
              <Text style={styles.primaryButtonText}>Start GitHub login</Text>
            </TouchableOpacity>

            {deviceAuth ? (
              <View style={styles.deviceBox}>
                <Text style={styles.codeLabel}>Your code</Text>
                <Text style={styles.code}>{deviceAuth.user_code}</Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(deviceAuth.verification_uri)}
                >
                  <Text style={styles.linkButtonText}>Open {deviceAuth.verification_uri}</Text>
                </TouchableOpacity>
                <Text style={styles.copyMuted}>Waiting for approval...</Text>
              </View>
            ) : null}

            {authError ? <Text style={styles.error}>{authError}</Text> : null}
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.controls}>
              <View style={styles.inputWrap}>
                <TextInput
                  placeholder="owner/repo (leave blank for all)"
                  placeholderTextColor="#94a3b8"
                  value={repoFilter}
                  onChangeText={setRepoFilter}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={styles.primaryButtonSmall} onPress={loadIssues}>
                <Text style={styles.primaryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {authError ? <Text style={styles.error}>{authError}</Text> : null}

            {loadingIssues ? (
              <View style={styles.loader}>
                <ActivityIndicator color="#34d399" size="small" />
                <Text style={styles.copyMuted}>Fetching issues…</Text>
              </View>
            ) : issues.length > currentIndex ? (
              <View style={styles.swiperWrap}>
                <Swiper
                  cards={issues}
                  cardIndex={currentIndex}
                  renderCard={renderIssueCard}
                  onSwiped={(idx) => setCurrentIndex(idx + 1)}
                  onSwipedLeft={handleSwipeLeft}
                  onSwipedRight={handleSwipeRight}
                  backgroundColor="transparent"
                  stackSize={3}
                  stackSeparation={14}
                  animateCardOpacity
                  overlayLabels={overlayLabels}
                  cardVerticalMargin={16}
                  verticalSwipe={false}
                  animateOverlayLabelsOpacity
                />
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.copy}>Nothing to triage right now.</Text>
              </View>
            )}

            <View style={styles.footer}>
              {lastClosed ? (
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.undoButton]}
                  onPress={handleUndo}
                  disabled={undoBusy}
                >
                  <Text style={styles.secondaryButtonText}>
                    {undoBusy ? 'Undoing…' : `Undo close #${lastClosed.number}`}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {feedback ? (
                <Text style={[styles.feedback, feedback.includes('failed') && styles.feedbackError]}>
                  {feedback}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050914',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  hero: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  authCard: {
    backgroundColor: '#0b1224',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginTop: 8,
    gap: 10,
  },
  content: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonSmall: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0b1224',
    fontWeight: '700',
  },
  secondaryButton: {
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  undoButton: {
    marginBottom: 8,
  },
  copy: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  copyMuted: {
    color: '#94a3b8',
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  error: {
    color: '#f87171',
    marginTop: 4,
  },
  deviceBox: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 6,
  },
  codeLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  code: {
    fontSize: 24,
    letterSpacing: 2,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  input: {
    height: 40,
    color: '#e2e8f0',
  },
  swiperWrap: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#0b1224',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    justifyContent: 'space-between',
  },
  cardEmpty: {
    backgroundColor: '#0f172a',
  },
  repo: {
    color: '#38bdf8',
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  labelText: {
    color: '#0b1224',
    fontWeight: '700',
    fontSize: 12,
  },
  labelTextMuted: {
    color: '#94a3b8',
  },
  meta: {
    color: '#94a3b8',
    fontSize: 12,
  },
  loader: {
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  overlayLeft: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 8,
  },
  overlayRight: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 8,
  },
  overlayLabel: {
    color: '#0b1224',
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 8,
  },
  feedback: {
    color: '#cbd5e1',
  },
  feedbackError: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
