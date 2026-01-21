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
import { copilotService } from './src/lib/copilotService';

const CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
const DEFAULT_SCOPE = process.env.EXPO_PUBLIC_GITHUB_SCOPE || 'public_repo';
const REDIRECT_URI = Platform.OS === 'web'
  ? 'http://localhost:8081'
  : AuthSession.getRedirectUrl();

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
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [copilotAvailable, setCopilotAvailable] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const swiperRef = useRef<Swiper<GitHubIssue>>(null);
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exchangeCodeForToken = async (code: string) => {
    try {
      setAuthError('');
      console.log('Exchanging code for token...');

      const tokenResponse = await fetch('http://localhost:3000/api/github-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        setAuthError(`Server error: ${tokenResponse.status} - ${errorText}`);
        return;
      }

      const data = await tokenResponse.json();
      console.log('Token exchange response:', { hasToken: !!data.access_token, hasError: !!data.error });

      if (data.error) {
        setAuthError(data.error_description || data.error || 'GitHub OAuth failed.');
        return;
      }

      if (data.access_token) {
        await saveToken(data.access_token);
        setToken(data.access_token);
        setFeedback('Connected to GitHub');
        console.log('Token saved successfully');
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setAuthError('No access token received from server');
      }
    } catch (error) {
      console.error('Exchange error:', error);
      setAuthError(`Failed to connect to auth server: ${(error as Error).message}. Make sure the server is running (npm run server).`);
    }
  };

  useEffect(() => {
    const hydrate = async () => {
      const stored = await getToken();
      if (stored) setToken(stored);

      try {
        await copilotService.initialize();
        setCopilotAvailable(true);
        console.log('Copilot service available');
      } catch (error) {
        console.log('Copilot not available:', (error as Error).message);
        setCopilotAvailable(false);
      }
    };
    hydrate();
    return () => {
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
      copilotService.cleanup();
    };
  }, []);

  // Handle OAuth callback from GitHub on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code && !token) {
        exchangeCodeForToken(code);
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setIssues([]);
      return;
    }
    setIssues([]); // Clear existing issues when reloading
    setCurrentIndex(0); // Reset index
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
      // Use Authorization Code Flow for web - redirect to GitHub
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(DEFAULT_SCOPE)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
      window.location.href = authUrl;
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
    // Don't remove from array, let Swiper handle it
    setFeedback(`Closed #${issue.number} · ${repoLabel(issue)}`);
    setLastClosed(issue);
    setAiSummary('');
    setCurrentIndex((prev) => prev + 1);
    try {
      await updateIssueState(token, issue, 'closed');
    } catch (error) {
      setFeedback(`Close failed: ${(error as Error).message}`);
      setLastClosed(null);
      // Ideally we would swipe back here automatically if it failed, but simple alert is safer
    }
  };

  const handleSwipeRight = (cardIndex: number) => {
    const issue = issues[cardIndex];
    if (!issue) return;
    // Don't remove from array
    setFeedback(`Kept open · #${issue.number}`);
    setAiSummary('');
    setLastClosed(null); // Clear undo history for "Keep" actions to avoid mismatch
    setCurrentIndex((prev) => prev + 1);
  };

  const handleUndo = async () => {
    if (!lastClosed || !token) return;
    setUndoBusy(true);
    try {
      await updateIssueState(token, lastClosed, 'open');
      setFeedback(`Reopened #${lastClosed.number}`);
      setLastClosed(null);
      swiperRef.current?.swipeBack();
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    } catch (error) {
      setFeedback(`Undo failed: ${(error as Error).message}`);
    } finally {
      setUndoBusy(false);
    }
  };

  const handleGetAiSummary = async (issue: GitHubIssue) => {
    if (!copilotAvailable) {
      setFeedback('Copilot not available. Install GitHub Copilot CLI first.');
      return;
    }

    setLoadingAiSummary(true);
    setAiSummary('');

    try {
      const summary = await copilotService.summarizeIssue(issue);
      setAiSummary(summary);
    } catch (error) {
      setFeedback(`AI summary failed: ${(error as Error).message}`);
      setAiSummary('');
    } finally {
      setLoadingAiSummary(false);
    }
  };

  const overlayLabels = useMemo(
    () => ({
      left: {
        title: 'Close',
        style: { label: styles.overlayLabel, wrapper: styles.overlayLeft },
      },
      right: {
        title: 'Keep',
        style: { label: styles.overlayLabel, wrapper: styles.overlayRight },
      },
    }),
    []
  );

  const renderIssueCard = (issue: GitHubIssue | null, cardIndex?: number) => {
    if (!issue) return <View style={[styles.card, styles.cardEmpty]} />;

    const isTopCard = cardIndex === currentIndex;

    return (
      <View style={styles.card}>
        <Text style={styles.repo}>{repoLabel(issue)}</Text>
        <Text style={styles.title} numberOfLines={3}>
          #{issue.number} · {issue.title}
        </Text>
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

        {copilotAvailable && isTopCard && (
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => handleGetAiSummary(issue)}
            disabled={loadingAiSummary}
          >
            <Text style={styles.aiButtonText}>
              {loadingAiSummary ? 'Generating AI summary...' : '✨ Get AI Summary'}
            </Text>
          </TouchableOpacity>
        )}

        {aiSummary && isTopCard ? (
          <View style={styles.aiSummaryBox}>
            <Text style={styles.aiSummaryLabel}>AI Summary:</Text>
            <Text style={styles.aiSummaryText}>{aiSummary}</Text>
          </View>
        ) : null}

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
            ) : issues.length ? (
              <View style={styles.swiperWrap}>
                <Swiper
                  ref={swiperRef}
                  cards={issues}
                  renderCard={renderIssueCard}
                  onSwipedLeft={handleSwipeLeft}
                  onSwipedRight={handleSwipeRight}
                  backgroundColor="transparent"
                  stackSize={3}
                  stackSeparation={15}
                  stackScale={5}
                  animateCardOpacity
                  overlayLabels={overlayLabels}
                  cardVerticalMargin={40}
                  cardHorizontalMargin={20}
                  verticalSwipe={false}
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
              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
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
    backgroundColor: '#010409', // GitHub Dark: Main bg
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#30363d', // GitHub Dark: Border
    backgroundColor: '#161b22', // GitHub Dark: Header bg
  },
  brand: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f0f6fc', // GitHub Dark: Headings
  },
  hero: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f0f6fc',
    marginBottom: 16,
    textAlign: 'center',
  },
  authCard: {
    backgroundColor: '#161b22',
    margin: 16,
    borderRadius: 6,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    gap: 16,
  },
  content: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#238636', // GitHub Green
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonSmall: {
    backgroundColor: '#238636',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#21262d', // GitHub Dark: Button bg
    borderColor: '#363b42', // GitHub Dark: Button border
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#c9d1d9', // GitHub Dark: Text
    fontWeight: '500',
    fontSize: 14,
  },
  undoButton: {
    alignSelf: 'center',
    marginTop: 16,
  },
  copy: {
    color: '#8b949e', // GitHub Dark: Secondary text
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  copyMuted: {
    color: '#8b949e',
    fontSize: 13,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(110,118,129,0.4)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  error: {
    color: '#f85149', // GitHub Dark: Error
    fontSize: 14,
    textAlign: 'center',
  },
  deviceBox: {
    backgroundColor: '#0d1117',
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  codeLabel: {
    color: '#8b949e',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  code: {
    fontSize: 32,
    letterSpacing: 4,
    color: '#f0f6fc',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#58a6ff', // GitHub Dark: Link
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#0d1117',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    paddingHorizontal: 12,
    height: 32,
    justifyContent: 'center',
  },
  input: {
    color: '#c9d1d9',
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  swiperWrap: {
    flex: 1,
    marginTop: -20, // Adjust for Swiper's default positioning
  },
  card: {
    flex: 0.7,
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363d',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  cardEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  repo: {
    color: '#8b949e',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '400',
  },
  title: {
    color: '#c9d1d9',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    marginBottom: 16,
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 24,
  },
  label: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  labelText: {
    color: '#000000', // Labels usually have dark text on light bg, or we calculate contrast
    fontWeight: '500',
    fontSize: 12,
  },
  labelTextMuted: {
    color: '#8b949e',
    fontSize: 12,
    fontStyle: 'italic',
  },
  meta: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 'auto', // Push to bottom
    textAlign: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#30363d',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  overlayLeft: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    paddingRight: 32,
    borderRadius: 8,
  },
  overlayRight: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    paddingLeft: 32,
    borderRadius: 8,
  },
  overlayLabel: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  feedback: {
    color: '#8b949e',
    fontSize: 14,
    marginTop: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f6feb', // GitHub Blue
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 16,
    gap: 8,
  },
  aiButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  aiSummaryBox: {
    backgroundColor: '#0d1117',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  aiSummaryLabel: {
    color: '#79c0ff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  aiSummaryText: {
    color: '#c9d1d9',
    fontSize: 14,
    lineHeight: 20,
  },
});
