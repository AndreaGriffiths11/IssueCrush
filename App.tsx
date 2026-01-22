import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
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
const REDIRECT_URI =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : AuthSession.makeRedirectUri({ preferLocalhost: true, useProxy: false });

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
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(
        DEFAULT_SCOPE
      )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
      if (__DEV__) {
        console.log('GitHub auth redirect:', { authUrl, REDIRECT_URI });
      }
      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      } else {
        setAuthError('Unable to open GitHub login (window unavailable).');
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
            borderColor: '#d1242f', // GitHub red
            color: '#d1242f',
            borderWidth: 3,
            fontSize: 22,
            fontWeight: '700',
            textAlign: 'center',
            padding: 8,
            borderRadius: 6,
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
            borderColor: '#2da44e', // GitHub green
            color: '#2da44e',
            borderWidth: 3,
            fontSize: 22,
            fontWeight: '700',
            textAlign: 'center',
            padding: 8,
            borderRadius: 6,
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
      <ImageBackground
        source={require('./assets/notebook_paper_overlay.png')}
        style={styles.card}
        imageStyle={styles.cardBackgroundImage}
        resizeMode="cover"
      >
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
              <ExternalLink size={20} color="#0969da" style={{ marginTop: 4, opacity: 0.8 }} />
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
      </ImageBackground>
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
                    <ActivityIndicator color="#0969da" size="small" />
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
                    <X color="#d1242f" size={32} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.fab, styles.fabUndo]}
                    onPress={handleUndo}
                    disabled={!lastClosed || undoBusy}
                  >
                    <RotateCcw color={!lastClosed ? "#57606a" : "#24292f"} size={24} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.fab, styles.fabKeep]}
                    onPress={() => swiperRef.current?.swipeRight()}
                  >
                    <Check color="#2da44e" size={32} />
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
    backgroundColor: '#f6f8fa', // GitHub light theme background
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
    fontSize: 20,
    fontWeight: '600',
    color: '#24292f', // GitHub text color
  },
  hero: {
    fontSize: 20,
    fontWeight: '600',
    color: '#24292f',
    marginBottom: 8,
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#d0d7de',
    marginTop: 8,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  content: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#2da44e', // GitHub green
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButtonSmall: {
    backgroundColor: '#2da44e', // GitHub green
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    borderColor: '#d0d7de',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f8fa',
  },
  secondaryButtonText: {
    color: '#24292f',
    fontWeight: '600',
    fontSize: 14,
  },
  undoButton: {
    marginBottom: 8,
  },
  copy: {
    color: '#57606a', // GitHub gray
    lineHeight: 20,
  },
  copyMuted: {
    color: '#57606a',
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  error: {
    color: '#cf222e', // GitHub red
    marginTop: 4,
  },
  deviceBox: {
    backgroundColor: '#f6f8fa',
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d0d7de',
    gap: 8,
  },
  codeLabel: {
    color: '#57606a', // GitHub gray
    fontSize: 12,
    fontWeight: '600',
  },
  code: {
    fontSize: 24,
    letterSpacing: 2,
    color: '#24292f',
    fontWeight: '700',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#0969da', // GitHub blue
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d0d7de',
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  input: {
    height: 44,
    color: '#24292f',
  },
  swiperWrap: {
    flex: 1,
    // Add margins to prevent card from touching edges fully during swipe
    marginHorizontal: -8,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12, // More subtle, GitHub-style
    padding: 16,
    borderWidth: 1,
    borderColor: '#d0d7de', // GitHub border color
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden', // Ensures image respects borderRadius
  },
  cardBackgroundImage: {
    borderRadius: 12,
    opacity: 0.15, // Subtle notebook texture
  },
  cardEmpty: {
    backgroundColor: '#eef2f7',
  },
  cardHeader: {
    gap: 12,
  },
  repo: {
    color: '#0969da', // GitHub blue
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  issueTitleButton: {
    // Ensure adequate touch target for iOS (44pt minimum)
    minHeight: Platform.OS === 'ios' ? 44 : 40,
    justifyContent: 'center',
    marginVertical: 4,
  },
  title: {
    color: '#24292f', // GitHub text color
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  issueNumber: {
    color: '#57606a', // GitHub gray
    fontWeight: '600',
  },
  titleSeparator: {
    color: '#57606a',
    fontWeight: '400',
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  label: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12, // GitHub pill style
  },
  labelText: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0,
  },
  labelTextMuted: {
    color: '#57606a', // GitHub gray
    fontSize: 14,
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
    color: '#cf222e', // GitHub red
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingTop: 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#d0d7de', // GitHub border
    backgroundColor: '#f6f8fa', // Match background
    marginHorizontal: -20,
    paddingBottom: 20,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fabClose: {
    width: 64,
    height: 64,
    borderColor: '#d1242f', // GitHub red
  },
  fabKeep: {
    width: 64,
    height: 64,
    borderColor: '#2da44e', // GitHub green
  },
  fabUndo: {
    width: 48,
    height: 48,
    borderColor: '#d0d7de',
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
    borderColor: '#d0d7de',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toastText: {
    color: '#24292f',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0969da', // GitHub blue
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  aiButtonActive: {
    backgroundColor: '#0550ae', // Darker GitHub blue
    borderWidth: 1,
    borderColor: '#0969da',
  },
  aiButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  aiSummaryText: {
    color: '#57606a', // GitHub gray
    lineHeight: 22,
    fontSize: 14,
    letterSpacing: 0,
  },
});
