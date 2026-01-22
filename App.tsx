import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Swiper from 'react-native-deck-swiper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, Check, RotateCcw, Sparkles, ExternalLink, Github, Filter, RefreshCw, Inbox, LogOut } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Crumble animation state
  const [showCrumble, setShowCrumble] = useState(false);
  const crumbleProgress = useSharedValue(0);
  const crumbleScale = useSharedValue(1);
  const crumbleRotate = useSharedValue(0);
  const crumbleOpacity = useSharedValue(0);

  const triggerCrumbleAnimation = useCallback(() => {
    setShowCrumble(true);
    crumbleOpacity.value = 1;
    crumbleProgress.value = 0;
    crumbleScale.value = 1;
    crumbleRotate.value = 0;

    // Animate the crumble effect
    crumbleProgress.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    crumbleScale.value = withSequence(
      withTiming(1.1, { duration: 100 }),
      withTiming(0.3, { duration: 300, easing: Easing.in(Easing.cubic) })
    );
    crumbleRotate.value = withTiming(15, { duration: 400, easing: Easing.out(Easing.quad) });
    crumbleOpacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(setShowCrumble)(false);
    });
  }, []);

  const crumbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: crumbleOpacity.value,
    transform: [
      { scale: crumbleScale.value },
      { rotate: `${crumbleRotate.value}deg` },
      { translateY: interpolate(crumbleProgress.value, [0, 1], [0, 50]) },
    ],
  }));

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

    // Trigger the crumble animation
    triggerCrumbleAnimation();

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
              <View style={styles.brandContainer}>
                <View style={styles.brandIcon}>
                  <Image
                    source={require('./assets/icon.png')}
                    style={styles.brandIconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.brand}>IssueCrush</Text>
              </View>
              {token ? (
                <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                  <LogOut size={18} color="#57606a" />
                  <Text style={styles.signOutText}>Sign out</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {!token ? (
              <View style={styles.authContainer}>
                <View style={styles.authHeroSection}>
                  <View style={styles.authIconContainer}>
                    <Image
                      source={require('./assets/icon.png')}
                      style={styles.authHeroIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.hero}>Swipe through your</Text>
                  <Text style={styles.heroAccent}>GitHub issues</Text>
                  <Text style={styles.authSubtitle}>
                    Triage your issues with simple swipe gestures. Swipe left to close, right to keep.
                  </Text>
                </View>

                <View style={styles.authCard}>
                  <View style={styles.authCardHeader}>
                    <Github size={24} color="#24292f" />
                    <Text style={styles.authCardTitle}>Connect with GitHub</Text>
                  </View>

                  <Text style={styles.copy}>
                    We'll use {Platform.OS === 'web' ? 'OAuth' : 'device flow'} to securely connect to your GitHub account.
                  </Text>

                  <View style={styles.scopeBadge}>
                    <Text style={styles.scopeLabel}>Required scope:</Text>
                    <Text style={styles.scopeValue}>{DEFAULT_SCOPE}</Text>
                  </View>

                  {!CLIENT_ID ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.error}>
                        Add EXPO_PUBLIC_GITHUB_CLIENT_ID to your env (see .env.example).
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity style={styles.githubButton} onPress={startDeviceFlow}>
                    <Github size={20} color="#ffffff" />
                    <Text style={styles.githubButtonText}>Continue with GitHub</Text>
                  </TouchableOpacity>

                  {deviceAuth ? (
                    <View style={styles.deviceBox}>
                      <Text style={styles.codeLabel}>Enter this code on GitHub</Text>
                      <View style={styles.codeContainer}>
                        <Text style={styles.code}>{deviceAuth.user_code}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.openGithubButton}
                        onPress={() => Linking.openURL(deviceAuth.verification_uri)}
                      >
                        <ExternalLink size={16} color="#0969da" />
                        <Text style={styles.linkButtonText}>Open GitHub to enter code</Text>
                      </TouchableOpacity>
                      <View style={styles.waitingIndicator}>
                        <ActivityIndicator size="small" color="#0969da" />
                        <Text style={styles.waitingText}>Waiting for authorization...</Text>
                      </View>
                    </View>
                  ) : null}

                  {authError ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.error}>{authError}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.authFeatures}>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <X size={16} color="#d1242f" />
                    </View>
                    <Text style={styles.featureText}>Swipe left to close issues</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Check size={16} color="#2da44e" />
                    </View>
                    <Text style={styles.featureText}>Swipe right to keep open</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Sparkles size={16} color="#0969da" />
                    </View>
                    <Text style={styles.featureText}>AI-powered summaries</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.content}>
                <View style={styles.controlsCard}>
                  <View style={styles.controlsRow}>
                    <View style={styles.inputWrap}>
                      <Filter size={16} color="#57606a" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Filter by repo (owner/repo)"
                        placeholderTextColor="#8c959f"
                        value={repoFilter}
                        onChangeText={setRepoFilter}
                        style={styles.input}
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.refreshButton, loadingIssues && styles.refreshButtonDisabled]}
                      onPress={loadIssues}
                      disabled={loadingIssues}
                    >
                      <RefreshCw size={18} color={loadingIssues ? "#8c959f" : "#24292f"} />
                    </TouchableOpacity>
                  </View>
                  {issues.length > 0 && (
                    <View style={styles.issueCounter}>
                      <Text style={styles.issueCountText}>
                        {currentIndex + 1} of {issues.length} issues
                      </Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${((currentIndex + 1) / issues.length) * 100}%` }
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>

                {authError ? <Text style={styles.error}>{authError}</Text> : null}

                {loadingIssues ? (
                  <View style={styles.loader}>
                    <View style={styles.loaderCard}>
                      <ActivityIndicator color="#0969da" size="large" />
                      <Text style={styles.loaderText}>Fetching issues…</Text>
                      <Text style={styles.loaderSubtext}>This may take a moment</Text>
                    </View>
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

                    {/* Crumble animation overlay */}
                    {showCrumble && (
                      <Animated.View style={[styles.crumbleOverlay, crumbleAnimatedStyle]}>
                        <Image
                          source={require('./assets/crumpled_sheet.png')}
                          style={styles.crumbleImage}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                      <Inbox size={48} color="#8c959f" />
                    </View>
                    <Text style={styles.emptyTitle}>All caught up!</Text>
                    <Text style={styles.emptySubtitle}>
                      No issues to triage right now. Try changing your filter or check back later.
                    </Text>
                    <TouchableOpacity style={styles.emptyRefreshButton} onPress={loadIssues}>
                      <RefreshCw size={16} color="#0969da" />
                      <Text style={styles.emptyRefreshText}>Refresh issues</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Toast Feedback */}
                {feedback ? (
                  <View style={[styles.toastWrap, { pointerEvents: 'none' }]}>
                    <View style={[
                      styles.toast,
                      feedback.toLowerCase().includes('closed') && styles.toastClose,
                      feedback.toLowerCase().includes('kept') && styles.toastKeep,
                      feedback.toLowerCase().includes('reopened') && styles.toastReopen,
                      feedback.toLowerCase().includes('failed') && styles.toastError,
                      feedback.toLowerCase().includes('loaded') && styles.toastSuccess,
                    ]}>
                      {feedback.toLowerCase().includes('closed') && <X size={16} color="#d1242f" />}
                      {feedback.toLowerCase().includes('kept') && <Check size={16} color="#2da44e" />}
                      {feedback.toLowerCase().includes('reopened') && <RotateCcw size={16} color="#0969da" />}
                      {feedback.toLowerCase().includes('loaded') && <Check size={16} color="#2da44e" />}
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
                  <View style={styles.actionBarInner}>
                    <TouchableOpacity
                      style={[styles.fab, styles.fabClose]}
                      onPress={() => swiperRef.current?.swipeLeft()}
                      activeOpacity={0.7}
                    >
                      <X color="#ffffff" size={28} strokeWidth={2.5} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.fab, styles.fabUndo, !lastClosed && styles.fabUndoDisabled]}
                      onPress={handleUndo}
                      disabled={!lastClosed || undoBusy}
                      activeOpacity={0.7}
                    >
                      <RotateCcw color={!lastClosed ? "#c9d1d9" : "#57606a"} size={22} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.fab, styles.fabKeep]}
                      onPress={() => swiperRef.current?.swipeRight()}
                      activeOpacity={0.7}
                    >
                      <Check color="#ffffff" size={28} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionBarHints}>
                    <Text style={[styles.actionHint, styles.actionHintClose]}>Close</Text>
                    <Text style={styles.actionHint}>Undo</Text>
                    <Text style={[styles.actionHint, styles.actionHintKeep]}>Keep</Text>
                  </View>
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
    backgroundColor: '#f6f8fa',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  contentMax: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e6e8ec',
  },
  brandIconImage: {
    width: 38,
    height: 38,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: '#24292f',
    letterSpacing: -0.5,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  signOutText: {
    color: '#57606a',
    fontWeight: '600',
    fontSize: 13,
  },

  // Auth Screen Styles
  authContainer: {
    flex: 1,
    paddingTop: 20,
  },
  authHeroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  authIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e6e8ec',
  },
  authHeroIcon: {
    width: 72,
    height: 72,
  },
  hero: {
    fontSize: 26,
    fontWeight: '700',
    color: '#24292f',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroAccent: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0969da',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 15,
    color: '#57606a',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#d0d7de',
    gap: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  authCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  authCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#24292f',
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f6f8fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  scopeLabel: {
    fontSize: 13,
    color: '#57606a',
  },
  scopeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#24292f',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#24292f',
    paddingVertical: 14,
    borderRadius: 10,
  },
  githubButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  deviceBox: {
    backgroundColor: '#f6f8fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d7de',
    gap: 12,
    alignItems: 'center',
  },
  codeContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0969da',
    borderStyle: 'dashed',
  },
  codeLabel: {
    color: '#57606a',
    fontSize: 13,
    fontWeight: '600',
  },
  code: {
    fontSize: 28,
    letterSpacing: 4,
    color: '#24292f',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  openGithubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#0969da',
    fontWeight: '600',
    fontSize: 14,
  },
  waitingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  waitingText: {
    color: '#57606a',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#ffebe9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcecb',
  },
  error: {
    color: '#cf222e',
    fontSize: 13,
    lineHeight: 18,
  },
  authFeatures: {
    marginTop: 24,
    gap: 12,
    paddingHorizontal: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  featureText: {
    fontSize: 14,
    color: '#57606a',
    fontWeight: '500',
  },

  // Main Content Styles
  content: {
    flex: 1,
  },
  controlsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d0d7de',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f8fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    color: '#24292f',
    fontSize: 14,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f6f8fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  issueCounter: {
    marginTop: 12,
    gap: 6,
  },
  issueCountText: {
    fontSize: 12,
    color: '#57606a',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e1e4e8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0969da',
    borderRadius: 2,
  },

  // Card Styles
  swiperWrap: {
    flex: 1,
    marginHorizontal: -4,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d0d7de',
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardBackgroundImage: {
    borderRadius: 16,
    opacity: 0.12,
  },
  cardEmpty: {
    backgroundColor: '#f6f8fa',
  },
  cardHeader: {
    gap: 14,
  },
  repo: {
    color: '#0969da',
    fontWeight: '600',
    fontSize: 13,
    backgroundColor: '#ddf4ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  issueTitleButton: {
    minHeight: Platform.OS === 'ios' ? 44 : 40,
    justifyContent: 'center',
    marginVertical: 4,
  },
  title: {
    color: '#24292f',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  issueNumber: {
    color: '#57606a',
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
    marginTop: 8,
  },
  label: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  labelText: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0,
  },
  labelTextMuted: {
    color: '#8c959f',
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Loader Styles
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  loaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#d0d7de',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  loaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#24292f',
  },
  loaderSubtext: {
    fontSize: 13,
    color: '#8c959f',
  },

  // Empty State Styles
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#f6f8fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#24292f',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#57606a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  emptyRefreshText: {
    color: '#0969da',
    fontWeight: '600',
    fontSize: 14,
  },

  // Crumble Animation Styles
  crumbleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  crumbleImage: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    tintColor: '#fef2f2',
  },

  // Toast Styles
  feedbackError: {
    color: '#cf222e',
    fontWeight: '700',
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 180,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  toastClose: {
    backgroundColor: '#ffebe9',
    borderColor: '#ffcecb',
  },
  toastKeep: {
    backgroundColor: '#dafbe1',
    borderColor: '#aceebb',
  },
  toastReopen: {
    backgroundColor: '#ddf4ff',
    borderColor: '#b6e3ff',
  },
  toastError: {
    backgroundColor: '#ffebe9',
    borderColor: '#ffcecb',
  },
  toastSuccess: {
    backgroundColor: '#dafbe1',
    borderColor: '#aceebb',
  },
  toastText: {
    color: '#24292f',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },

  // Action Bar Styles
  actionBar: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1e4e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fabClose: {
    width: 64,
    height: 64,
    backgroundColor: '#d1242f',
  },
  fabKeep: {
    width: 64,
    height: 64,
    backgroundColor: '#2da44e',
  },
  fabUndo: {
    width: 52,
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d0d7de',
  },
  fabUndoDisabled: {
    backgroundColor: '#f6f8fa',
    borderColor: '#e1e4e8',
    shadowOpacity: 0.05,
  },
  actionBarHints: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 52,
  },
  actionHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c959f',
    textAlign: 'center',
    width: 52,
  },
  actionHintClose: {
    color: '#d1242f',
  },
  actionHintKeep: {
    color: '#2da44e',
  },

  // AI Summary Styles
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0969da',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    shadowColor: '#0969da',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  aiButtonActive: {
    backgroundColor: '#0550ae',
  },
  aiButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  aiSummaryText: {
    color: '#57606a',
    lineHeight: 22,
    fontSize: 14,
    letterSpacing: 0,
    backgroundColor: '#f6f8fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    overflow: 'hidden',
  },

  // Legacy styles kept for compatibility
  copy: {
    color: '#57606a',
    lineHeight: 20,
    fontSize: 14,
  },
  copyMuted: {
    color: '#8c959f',
    fontSize: 13,
  },
  meta: {
    color: '#8c959f',
    fontSize: 12,
  },
  linkButton: {
    paddingVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#2da44e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    borderColor: '#d0d7de',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#24292f',
    fontWeight: '600',
    fontSize: 14,
  },
});
