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
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Swiper from 'react-native-deck-swiper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, Check, RotateCcw, Sparkles, ExternalLink } from 'lucide-react-native';

import { fetchIssues, GitHubIssue, updateIssueState, extractRepoPath } from './src/api/github';
import { deleteToken, getToken, saveToken } from './src/lib/tokenStorage';
import { copilotService } from './src/lib/copilotService';

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

  // AI Summary State
  // Stored within issues array now
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);

  const swiperRef = useRef<Swiper<GitHubIssue>>(null);
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exchangeCodeForToken = async (code: string) => {
    try {
      setAuthError('');
      const tokenResponse = await fetch('http://localhost:3000/api/github-token', {
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

      if (data.access_token) {
        await saveToken(data.access_token);
        setToken(data.access_token);
        setFeedback('Connected to GitHub');
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setAuthError('No access token received from server');
      }
    } catch (error) {
      setAuthError(`Failed to connect to auth server: ${(error as Error).message}. Make sure the server is running (npm run server).`);
    }
  };

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
      setCurrentIndex(0);
      return;
    }
    loadIssues();
  }, [token]);

  // Auto-dismiss feedback
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(''), 2200);
    return () => clearTimeout(t);
  }, [feedback]);

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
      // Use Authorization Code Flow for web - redirect to GitHub
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(DEFAULT_SCOPE)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      }
    } else {
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
    // Swiper owns the index, we just handle the data logic
    const issue = issues[cardIndex];
    if (!issue || !token) return;

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

  const onSwiped = (idx: number) => {
    setCurrentIndex(idx + 1);
    setLoadingAiSummary(false);
  };

  const handleUndo = async () => {
    if (!lastClosed || !token) return;
    setUndoBusy(true);
    try {
      swiperRef.current?.swipeBack();
      // Swiper's internal index decrements on swipeBack, we sync our state
      setCurrentIndex((prev) => Math.max(0, prev - 1));

      await updateIssueState(token, lastClosed, 'open');
      setFeedback(`Reopened #${lastClosed.number}`);
      setLastClosed(null);
    } catch (error) {
      setFeedback(`Undo failed: ${(error as Error).message}`);
    } finally {
      setUndoBusy(false);
    }
  };

  const handleGetAiSummary = async () => {
    const issueIndex = currentIndex;
    const issue = issues[issueIndex];
    if (!issue) return;

    // If we already have a summary, don't fetch again
    if (issue.aiSummary) return;

    setLoadingAiSummary(true);
    try {
      // Pass the fully typed issue including optional body/etc
      const summary = await copilotService.summarizeIssue(issue);
      
      // Update the issue in the list to trigger re-render
      setIssues(prevIssues => 
        prevIssues.map((item, index) => 
          index === issueIndex ? { ...item, aiSummary: summary } : item
        )
      );
    } catch (error) {
      console.error('AI Summary error:', error);
      // Optional: show error toast here using setFeedback
    } finally {
      setLoadingAiSummary(false);
    }
  };

  const overlayLabels = useMemo(
    () => ({
      left: {
        title: 'CLOSE',
        style: {
          label: {
            borderColor: '#ef4444',
            color: '#ef4444',
            borderWidth: 4,
            fontSize: 24,
            fontWeight: '800',
            textAlign: 'center',
            padding: 8,
            borderRadius: 8,
            transform: [{ rotate: '15deg' }],
          },
          wrapper: {
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            marginTop: 30,
            marginLeft: -30,
          }
        },
      },
      right: {
        title: 'KEEP',
        style: {
          label: {
            borderColor: '#10b981',
            color: '#10b981',
            borderWidth: 4,
            fontSize: 24,
            fontWeight: '800',
            textAlign: 'center',
            padding: 8,
            borderRadius: 8,
            transform: [{ rotate: '-15deg' }],
          },
          wrapper: {
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            marginTop: 30,
            marginLeft: 30,
          }
        },
      },
    }),
    []
  );

  const getLabelColor = (hex: string) => {
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  };

  const openIssueLink = async (url: string) => {
    try {
      // Use WebBrowser for in-app browsing on mobile, fallback to Linking on web
      if (Platform.OS === 'web') {
        // On web, open in a new tab
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      } else {
        // On mobile (iOS/Android), use WebBrowser for in-app browsing
        await WebBrowser.openBrowserAsync(url, {
          controlsColor: '#38bdf8',
          toolbarColor: '#0b1224',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
      }
    } catch (error) {
      // Fallback to Linking if WebBrowser fails
      await Linking.openURL(url);
    }
  };

  const renderIssueCard = (cardIssue: GitHubIssue | null) => {
    // Look up the freshest version of the issue from state to ensure AI summary updates appear
    const issue = issues.find(i => i.id === cardIssue?.id) || cardIssue;
    
    if (!issue) return <View style={[styles.card, styles.cardEmpty]} />;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.repo}>{repoLabel(issue)}</Text>
          <TouchableOpacity
            onPress={() => openIssueLink(issue.html_url)}
            style={styles.issueTitleButton}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={[styles.title, { flex: 1 }]} numberOfLines={3}>
                <Text style={styles.issueNumber}>#{issue.number}</Text>
                <Text style={styles.titleSeparator}> · </Text>
                <Text>{issue.title}</Text>
              </Text>
              <ExternalLink size={20} color="#38bdf8" style={{ marginTop: 4, opacity: 0.8 }} />
            </View>
          </TouchableOpacity>
          <View style={styles.labels}>
            {issue.labels?.length ? (
              issue.labels.slice(0, 6).map((label) => (
                <View
                  key={label.id}
                  style={[styles.label, { backgroundColor: `#${label.color || '334155'}` }]}
                >
                  <Text style={[styles.labelText, { color: getLabelColor(label.color || '334155') }]}>
                    {label.name}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.labelTextMuted}>No labels</Text>
            )}
          </View>

          {/* AI Summary Section */}
          <TouchableOpacity
            style={[styles.aiButton, issue.aiSummary ? styles.aiButtonActive : null]}
            onPress={loadingAiSummary ? undefined : handleGetAiSummary}
            disabled={loadingAiSummary || !!issue.aiSummary}
          >
            {loadingAiSummary && currentIndex === issues.indexOf(issue) ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Sparkles size={18} color="#ffffff" />
                <Text style={styles.aiButtonText}>
                  {issue.aiSummary ? "AI Summary" : "Get AI Summary"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {issue.aiSummary ? (
            <Text style={styles.aiSummaryText} numberOfLines={3} ellipsizeMode="tail">
              {issue.aiSummary}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.tapHint}>Tap card for details</Text>
        </View>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <RNStatusBar barStyle="dark-content" />

        <View style={styles.container}>
          <View style={styles.contentMax}>
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
                      ref={swiperRef}
                      cards={issues}
                      cardIndex={currentIndex}
                      renderCard={renderIssueCard}
                      onSwiped={onSwiped}
                      onSwipedLeft={handleSwipeLeft}
                      onSwipedRight={handleSwipeRight}
                      backgroundColor="transparent"
                      stackSize={2}
                      stackSeparation={12}
                      stackScale={4}
                      animateCardOpacity
                      overlayLabels={overlayLabels}
                      cardVerticalMargin={16}
                      verticalSwipe={false}
                      disableTopSwipe
                      disableBottomSwipe
                      horizontalThreshold={120}
                      swipeAnimationDuration={180}
                      animateOverlayLabelsOpacity
                    />
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.copy}>Nothing to triage right now.</Text>
                  </View>
                )}

                {/* Toast Feedback */}
                {feedback ? (
                  <View style={[styles.toastWrap, { pointerEvents: 'none' }]}>
                    <View style={styles.toast}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                          styles.toastText,
                          feedback.toLowerCase().includes('failed') && styles.feedbackError,
                        ]}
                      >
                        {feedback}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.actionBar}>
                  <TouchableOpacity
                    style={[styles.fab, styles.fabClose]}
                    onPress={() => swiperRef.current?.swipeLeft()}
                  >
                    <X color="#ef4444" size={32} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.fab, styles.fabUndo]}
                    onPress={handleUndo}
                    disabled={!lastClosed || undoBusy}
                  >
                    <RotateCcw color={!lastClosed ? "#334155" : "#e2e8f0"} size={24} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.fab, styles.fabKeep]}
                    onPress={() => swiperRef.current?.swipeRight()}
                  >
                    <Check color="#10b981" size={32} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  contentMax: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
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
    color: '#0f172a',
  },
  hero: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
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
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    borderColor: '#cbd5e1',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  undoButton: {
    marginBottom: 8,
  },
  copy: {
    color: '#1f2937',
    lineHeight: 20,
  },
  copyMuted: {
    color: '#6b7280',
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  error: {
    color: '#b91c1c',
    marginTop: 4,
  },
  deviceBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  codeLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  code: {
    fontSize: 24,
    letterSpacing: 2,
    color: '#0f172a',
    fontWeight: '700',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 12,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 44,
    justifyContent: 'center',
  },
  input: {
    height: 44,
    color: '#0f172a',
  },
  swiperWrap: {
    flex: 1,
    // Add margins to prevent card from touching edges fully during swipe
    marginHorizontal: -8,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: Platform.OS === 'ios' ? 24 : 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 12 : 10 },
    shadowOpacity: Platform.OS === 'ios' ? 0.14 : 0.12,
    shadowRadius: Platform.OS === 'ios' ? 18 : 16,
    elevation: 8,
  },
  cardEmpty: {
    backgroundColor: '#eef2f7',
  },
  cardHeader: {
    gap: Platform.OS === 'ios' ? 12 : 8,
  },
  cardBody: {
    gap: Platform.OS === 'ios' ? 16 : 12,
  },
  repo: {
    color: '#0ea5e9',
    fontWeight: '700',
    marginBottom: 4,
    fontSize: 13,
  },
  issueTitleButton: {
    // Ensure adequate touch target for iOS (44pt minimum)
    minHeight: Platform.OS === 'ios' ? 44 : 40,
    justifyContent: 'center',
    marginVertical: 4,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: Platform.OS === 'ios' ? 28 : 26,
  },
  issueNumber: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  titleSeparator: {
    color: '#64748b',
    fontWeight: '400',
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.OS === 'ios' ? 8 : 6,
    marginTop: Platform.OS === 'ios' ? 12 : 8,
  },
  label: {
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    paddingHorizontal: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: Platform.OS === 'ios' ? 12 : 10,
  },
  labelText: {
    fontWeight: '700',
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    letterSpacing: Platform.OS === 'ios' ? 0.2 : 0,
  },
  labelTextMuted: {
    color: '#94a3b8',
  },
  meta: {
    color: '#6b7280',
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
    backgroundColor: '#fecdd3',
    borderRadius: 10,
    padding: 8,
  },
  overlayRight: {
    backgroundColor: '#bbf7d0',
    borderRadius: 10,
    padding: 8,
  },
  overlayLabel: {
    color: '#0f172a',
    fontWeight: '700',
  },
  feedbackError: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Platform.OS === 'ios' ? 40 : 30,
    paddingTop: Platform.OS === 'ios' ? 24 : 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginHorizontal: -20, // Bleed full width in container
    // Add proper spacing for iOS devices with home indicator
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    borderWidth: Platform.OS === 'ios' ? 1.5 : 1,
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 6 : 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.25 : 0.2,
    shadowRadius: Platform.OS === 'ios' ? 10 : 8,
    elevation: 4,
  },
  fabClose: {
    width: Platform.OS === 'ios' ? 68 : 64,
    height: Platform.OS === 'ios' ? 68 : 64,
    borderColor: '#f87171',
  },
  fabKeep: {
    width: Platform.OS === 'ios' ? 68 : 64,
    height: Platform.OS === 'ios' ? 68 : 64,
    borderColor: '#22c55e',
  },
  fabUndo: {
    width: Platform.OS === 'ios' ? 52 : 48,
    height: Platform.OS === 'ios' ? 52 : 48,
    borderColor: '#cbd5e1',
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 160, // Increased to ensure clearing action bar completely
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14, // Increased padding
    paddingHorizontal: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row', // Ensure layout allows for text growth
    justifyContent: 'center',
  },
  toastText: {
    color: '#0f172a',
    fontWeight: '600',
    textAlign: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  aiButtonActive: {
    backgroundColor: '#0284c7',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  aiButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  aiSummaryText: {
    color: '#1f2937',
    lineHeight: Platform.OS === 'ios' ? 22 : 20,
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    letterSpacing: Platform.OS === 'ios' ? 0.3 : 0,
  },
  tapHint: {
    color: '#94a3b8',
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    fontStyle: 'italic',
    marginTop: Platform.OS === 'ios' ? 8 : 4,
    letterSpacing: Platform.OS === 'ios' ? 0.2 : 0,
  },
});
