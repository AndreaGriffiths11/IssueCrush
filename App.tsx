import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState, useCallback, createContext, useContext, Component } from 'react';

// Error boundary for debugging
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 }}>
          <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
  useColorScheme,
  Appearance,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Swiper from 'react-native-deck-swiper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, Check, RotateCcw, Sparkles, ExternalLink, Github, Filter, RefreshCw, Inbox, LogOut, Moon, Sun, Heart, Tag } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  interpolate,
  interpolateColor,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Agentation } from 'agentation';
import ConfettiCannon from 'react-native-confetti-cannon';

// Theme imported from ./src/theme/themes

const ThemeContext = createContext<{
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}>({
  theme: lightTheme,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => { },
});

const useTheme = () => useContext(ThemeContext);

// Web cursor styles helper
// Add touch-action: pan-y to prevent ScrollView interference on mobile swipe
const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};
const isWeb = Platform.OS === 'web';

import { fetchIssues, GitHubIssue, updateIssueState, extractRepoPath } from './src/api/github';
import { deleteToken, getToken, saveToken } from './src/lib/tokenStorage';
import { copilotService } from './src/lib/copilotService';
import { lightTheme, darkTheme, Theme, ThemeMode } from './src/theme/themes';
import { getLabelColor } from './src/utils/colors';

const CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
const DEFAULT_SCOPE = process.env.EXPO_PUBLIC_GITHUB_SCOPE || 'repo';
const REDIRECT_URI =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : AuthSession.makeRedirectUri({ preferLocalhost: true });

function AppContent() {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  // Mobile check using new breakpoint < 1024px for Desktop vs Mobile layout switch
  const isDesktop = isWeb && SCREEN_WIDTH >= 1024;
  const isMobile = !isWeb || SCREEN_WIDTH < 768;

  const [token, setToken] = useState<string | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [repoFilter, setRepoFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [feedback, setFeedback] = useState('');
  const [authError, setAuthError] = useState('');
  const [undoBusy, setUndoBusy] = useState(false);
  const [lastClosed, setLastClosed] = useState<GitHubIssue | null>(null);
  const [lastClosedIndex, setLastClosedIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [copilotAvailable, setCopilotAvailable] = useState<boolean | null>(null);

  const swiperRef = useRef<Swiper<GitHubIssue>>(null);
  const confettiRef = useRef<any>(null);

  // Toast animation state
  const toastTranslateY = useSharedValue(100);
  const toastOpacity = useSharedValue(0);

  // Input focus animation
  const inputBorderColor = useSharedValue(0);

  // Progress bar animation
  const progressWidth = useSharedValue(0);

  // FAB button animations
  const undoScale = useSharedValue(1);
  const closeScale = useSharedValue(1);
  const keepScale = useSharedValue(1);

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
    crumbleProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    crumbleScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withTiming(0.2, { duration: 650, easing: Easing.in(Easing.cubic) })
    );
    crumbleRotate.value = withTiming(45, { duration: 800, easing: Easing.out(Easing.quad) });
    crumbleOpacity.value = withTiming(0, { duration: 800, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(setShowCrumble)(false);
    });
  }, []);

  const crumbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: crumbleOpacity.value,
    transform: [
      { scale: crumbleScale.value },
      { rotate: `${crumbleRotate.value}deg` },
      { translateY: interpolate(crumbleProgress.value, [0, 1], [0, 150]) },
    ],
  }));

  // Toast animated styles
  const toastAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
    opacity: toastOpacity.value,
  }));

  // Input border animated style
  const inputAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      inputBorderColor.value,
      [0, 1],
      [theme.border, theme.primary]
    ),
    borderWidth: interpolate(inputBorderColor.value, [0, 1], [1, 2]),
  }));

  // Progress bar animated style
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // FAB animated styles
  const undoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: undoScale.value }],
  }));

  const closeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeScale.value }],
  }));

  const keepAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: keepScale.value }],
  }));

  // Animate input focus
  useEffect(() => {
    inputBorderColor.value = withTiming(inputFocused ? 1 : 0, { duration: 200 });
  }, [inputFocused]);

  // Animate progress bar
  useEffect(() => {
    if (issues.length > 0) {
      const targetWidth = (Math.min(currentIndex + 1, issues.length) / issues.length) * 100;
      progressWidth.value = withSpring(targetWidth, { damping: 15, stiffness: 100 });
    }
  }, [currentIndex, issues.length]);

  // Animate toast entry/exit
  useEffect(() => {
    if (feedback) {
      toastTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      toastOpacity.value = withTiming(1, { duration: 200 });
    } else {
      toastTranslateY.value = withTiming(100, { duration: 300 });
      toastOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [feedback]);

  // Inject CSS for web hover effects on card stack
  useEffect(() => {
    if (isWeb && typeof document !== 'undefined') {
      const styleId = 'brutalist-card-hover-styles';

      // Create and inject style tag
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Base transitions for all card layers */
        #card-layer-three,
        #card-layer-two,
        #card-stack-container > div > div:last-child {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        /* Hover effects on the container */
        #card-stack-container:hover #card-layer-three {
          transform: rotate(-8deg) translateX(-15px) translateY(15px) !important;
        }

        #card-stack-container:hover #card-layer-two {
          transform: rotate(6deg) translateX(15px) translateY(-10px) !important;
        }

        /* Top card: straighten and grow slightly */
        #card-stack-container:hover > div > div:last-child {
          transform: scale(1.02) !important;
        }
      `;
      document.head.appendChild(style);

      // Cleanup on unmount
      return () => {
        const styleToRemove = document.getElementById(styleId);
        if (styleToRemove) {
          styleToRemove.remove();
        }
      };
    }
  }, [isWeb]);

  const exchangeCodeForToken = async (code: string) => {
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
        setFeedback('Connected to GitHub');
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setAuthError('No session received from server');
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

    // Check if Copilot is available on the backend
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

  // Handle OAuth callback from GitHub on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code && !token) {
        exchangeCodeForToken(code);
      }
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setIssues([]);
      setCurrentIndex(0);
      setLastClosed(null);
      setLastClosedIndex(null);
      return;
    }
    setLastClosed(null);
    setLastClosedIndex(null);
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
    setLastClosed(null);
    setLastClosedIndex(null);
    setLoadingIssues(true);
    setAuthError('');
    try {
      const data = await fetchIssues(token, repoFilter.trim() || undefined, labelFilter.trim() || undefined);
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
    try {
      console.log('Starting device flow...', { CLIENT_ID: CLIENT_ID ? 'Set' : 'Missing', Platform: Platform.OS });

      if (!CLIENT_ID) {
        setAuthError('Missing EXPO_PUBLIC_GITHUB_CLIENT_ID env var.');
        return;
      }
      setAuthError('');

      if (Platform.OS === 'web') {
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
        console.log('Starting mobile OAuth flow with WebBrowser...');
        const redirectUri = AuthSession.makeRedirectUri({
          scheme: 'issuecrush',
          preferLocalhost: false,
        });

        const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(
          DEFAULT_SCOPE
        )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        console.log('Opening OAuth URL:', { authUrl, redirectUri });

        try {
          const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
          console.log('OAuth result:', result);

          if (result.type === 'success' && result.url) {
            const url = new URL(result.url);
            const code = url.searchParams.get('code');

            if (code) {
              console.log('Authorization code received, exchanging for token...');
              await exchangeCodeForToken(code);
            } else {
              setAuthError('No authorization code received');
            }
          } else if (result.type === 'cancel') {
            console.log('User cancelled OAuth flow');
          } else {
            setAuthError('OAuth flow failed');
          }
        } catch (error) {
          console.error('WebBrowser OAuth error:', error);
          setAuthError(`Failed to open browser: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      console.error('Error in startDeviceFlow:', error);
      setAuthError(`Failed to start login: ${(error as Error).message}`);
    }
  };

  const signOut = async () => {
    const sessionId = token;
    setToken(null);
    setIssues([]);
    await deleteToken();
    // Destroy server-side session
    if (sessionId) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      fetch(`${apiUrl}/api/logout`, {
        method: 'POST',
        headers: { 'X-Session-Token': sessionId },
      }).catch(() => { });
    }
  };

  const handleSwipeLeft = async (cardIndex: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const issue = issues[cardIndex];
    if (!issue || !token) return;

    setFeedback(`Closed #${issue.number} · ${repoLabel(issue)}`);
    setLastClosed(issue);
    setLastClosedIndex(cardIndex);
    try {
      await updateIssueState(token, issue, 'closed');
    } catch (error) {
      setFeedback(`Close failed: ${(error as Error).message}`);
      setLastClosed(null);
      setLastClosedIndex(null);
    }
  };

  const handleSwipeRight = async (cardIndex: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const issue = issues[cardIndex];
    if (!issue) return;
    setFeedback(`Kept open · #${issue.number}`);
    setLastClosed(null);
    setLastClosedIndex(null);
  };

  const onSwiped = (idx: number) => {
    setCurrentIndex(idx + 1);
    setLoadingAiSummary(false);

    if (idx === issues.length - 1) {
      setTimeout(() => {
        confettiRef.current?.start();
      }, 300);
    }
  };

  const handleUndo = async () => {
    if (!lastClosed || !token) return;
    setUndoBusy(true);
    try {
      swiperRef.current?.swipeBack();
      setCurrentIndex((prev) => Math.max(0, lastClosedIndex ?? prev - 1));

      await updateIssueState(token, lastClosed, 'open');
      setFeedback(`Reopened #${lastClosed.number}`);
      setLastClosed(null);
      setLastClosedIndex(null);
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

    if (issue.aiSummary) return;

    setLoadingAiSummary(true);
    try {
      const result = await copilotService.summarizeIssue(issue);

      setIssues(prevIssues =>
        prevIssues.map((item, index) =>
          index === issueIndex ? { ...item, aiSummary: result.summary } : item
        )
      );
    } catch (error) {
      console.error('AI Summary error:', error);
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
            backgroundColor: theme.danger,
            color: '#ffffff',
            borderWidth: 0,
            fontSize: 24,
            fontWeight: '900',
            textAlign: 'center',
            padding: 12,
            paddingHorizontal: 24,
            borderRadius: 50,
            transform: [{ rotate: '15deg' }],
            textTransform: 'uppercase',
          },
          wrapper: {
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            marginTop: 40,
            marginLeft: -30,
          }
        },
      },
      right: {
        title: 'KEEP',
        style: {
          label: {
            backgroundColor: theme.success,
            color: '#ffffff',
            borderWidth: 0,
            fontSize: 24,
            fontWeight: '900',
            textAlign: 'center',
            padding: 12,
            paddingHorizontal: 24,
            borderRadius: 50,
            transform: [{ rotate: '-15deg' }],
            textTransform: 'uppercase',
          },
          wrapper: {
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            marginTop: 40,
            marginLeft: 30,
          }
        },
      },
    }),
    [theme]
  );

  // getLabelColor imported from ./src/utils/colors

  const openIssueLink = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      } else {
        await WebBrowser.openBrowserAsync(url, {
          controlsColor: '#38bdf8',
          toolbarColor: '#0b1224',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
      }
    } catch (error) {
      await Linking.openURL(url);
    }
  };

  const renderIssueCard = (cardIssue: GitHubIssue | null) => {
    const issue = issues.find(i => i.id === cardIssue?.id) || cardIssue;

    if (!issue) return <View style={[styles.cardBrutalist, isDesktop && styles.cardBrutalistDesktop, { backgroundColor: '#222' }]} />;
    return (
      <View style={[styles.cardBrutalist, isDesktop && styles.cardBrutalistDesktop]}>
        {/* Card Header - White with black text */}
        <View style={styles.cardHeaderBrutalist}>
          <View style={styles.issueIdBadge}>
            <Text style={styles.issueIdText}>#{issue.number}</Text>
          </View>
          <TouchableOpacity
            onPress={() => openIssueLink(issue.html_url)}
            style={[styles.headlineWrap, webCursor('pointer')]}
            activeOpacity={0.7}
          >
            <Text style={styles.headlineBrutalist} numberOfLines={2}>
              {issue.title.split(' ').map((word, i) => (
                <Text key={i} style={i % 3 === 0 ? styles.headlineHeavy : styles.headlineLight}>
                  {word}{' '}
                </Text>
              ))}
            </Text>
            <ExternalLink size={20} color="#000000" style={{ marginTop: 4, opacity: 0.6 }} />
          </TouchableOpacity>
        </View>

        {/* Cover Image */}
        {/* Card Body */}
        <View style={[styles.cardBodyBrutalist, styles.cardBodyContent]} pointerEvents="box-none">
          {/* User row */}
          {issue.user && (
            <View style={styles.userRowBrutalist}>
              <Image
                source={{ uri: issue.user.avatar_url }}
                style={styles.avatarBrutalist}
                resizeMode="cover"
              />
              <View style={styles.userMetaBrutalist}>
                <Text style={styles.userNameBrutalist}>{issue.user.login.toUpperCase()}</Text>
                <Text style={styles.repoNameBrutalist}>{repoLabel(issue)}</Text>
              </View>
            </View>
          )}

          {/* Labels */}
          <View style={styles.labelsBrutalist}>
            {issue.labels?.length ? (
              issue.labels.slice(0, 4).map((label) => (
                <View
                  key={label.id}
                  style={[styles.labelBrutalist, { backgroundColor: `#${label.color || '000000'}` }]}
                >
                  <Text style={[styles.labelTextBrutalist, { color: getLabelColor(label.color || '000000') }]}>
                    {label.name.toUpperCase()}
                  </Text>
                </View>
              ))
            ) : null}
          </View>

          {/* AI Block */}
          <View style={[styles.aiBlockBrutalist, { backgroundColor: isDark ? '#050505' : '#1a1a2e' }]}>
            <View style={styles.aiStickerBadge}>
              <Text style={styles.aiStickerText}>AI INSIGHT</Text>
            </View>
            {issue.aiSummary ? (
              <ScrollView style={styles.aiSummaryScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                <Text style={styles.aiTextBrutalist}>
                  <Text style={[styles.aiTextHighlight, { color: theme.primary }]}>// SUMMARY{'\n'}</Text>
                  {issue.aiSummary}
                </Text>
              </ScrollView>
            ) : copilotAvailable === false ? (
              <View style={styles.aiUnavailableContainer}>
                <Text style={styles.aiUnavailableText}>
                  AI summaries require running locally with GitHub Copilot.
                </Text>
                <Text style={[styles.aiUnavailableSubtext, { color: theme.textMuted }]}>
                  Clone the repo and run with: npm run dev
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.aiButtonBrutalist, webCursor(loadingAiSummary ? 'default' : 'pointer')]}
                onPress={loadingAiSummary ? undefined : handleGetAiSummary}
                disabled={loadingAiSummary}
              >
                {loadingAiSummary && currentIndex === issues.indexOf(issue) ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : (
                  <>
                    <Sparkles size={18} color={theme.primary} />
                    <Text style={styles.aiButtonTextBrutalist}>GET AI SUMMARY</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // FAB press handlers with scale animation
  const handleClosePressIn = () => {
    closeScale.value = withSpring(0.9, { damping: 15 });
  };
  const handleClosePressOut = () => {
    closeScale.value = withSpring(1, { damping: 15 });
  };
  const handleKeepPressIn = () => {
    keepScale.value = withSpring(0.9, { damping: 15 });
  };
  const handleKeepPressOut = () => {
    keepScale.value = withSpring(1, { damping: 15 });
  };
  const handleUndoPressIn = () => {
    if (lastClosed) undoScale.value = withSpring(0.9, { damping: 15 });
  };
  const handleUndoPressOut = () => {
    undoScale.value = withSpring(1, { damping: 15 });
  };

  // Toggle theme
  const cycleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIdx = modes.indexOf(themeMode);
    setThemeMode(modes[(currentIdx + 1) % modes.length]);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: token ? theme.background : '#000000' }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        <View style={[styles.container, isDesktop && styles.containerWeb]}>
          {/* Web Sidebar - Brutalist Design (Desktop Only) */}
          {isDesktop && token && (
            <View style={[styles.webSidebar, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.sidebarContent}>
                <View style={styles.sidebarBrand}>
                  <Text style={[styles.brandHeavy, { color: theme.primary }]}>ISSUE</Text>
                  <Text style={[styles.brandLight, { color: theme.primary }]}>CRUSH</Text>
                </View>

                <View style={styles.sidebarSection}>
                  <Text style={[styles.sidebarLabel, { color: theme.textMuted }]}>FILTER</Text>
                  <View style={[styles.sidebarInputWrap, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                    <Filter size={16} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      placeholder="owner/repo"
                      placeholderTextColor={theme.textMuted}
                      value={repoFilter}
                      onChangeText={setRepoFilter}
                      style={[styles.sidebarInput, { color: theme.text }, webCursor('text')]}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={[styles.sidebarInputWrap, { backgroundColor: theme.inputBackground, borderColor: theme.border, marginTop: 8 }]}>
                    <Tag size={16} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      placeholder="bug, feature, help wanted"
                      placeholderTextColor={theme.textMuted}
                      value={labelFilter}
                      onChangeText={setLabelFilter}
                      style={[styles.sidebarInput, { color: theme.text }, webCursor('text')]}
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.sidebarButtonBrutalist, loadingIssues && styles.refreshButtonDisabled, webCursor('pointer')]}
                    onPress={loadIssues}
                    disabled={loadingIssues}
                  >
                    <RefreshCw size={16} color="#000000" />
                    <Text style={styles.sidebarButtonTextBrutalist}>REFRESH</Text>
                  </TouchableOpacity>
                </View>

                {issues.length > 0 && (
                  <View style={styles.sidebarSection}>
                    <View style={styles.progressLabelRow}>
                      <Text style={[styles.progressLabelLight, { color: theme.textSecondary }]}>Triaged</Text>
                      <Text style={[styles.progressLabelHeavy, { color: theme.text }]}>{Math.round((Math.min(currentIndex + 1, issues.length) / issues.length) * 100)}%</Text>
                    </View>
                    <View style={[styles.progressBarBrutalist, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                      <Animated.View
                        style={[
                          styles.progressFillBrutalist,
                          { backgroundColor: theme.danger },
                          progressAnimatedStyle
                        ]}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.sidebarSection}>
                  <Text style={[styles.sidebarLabel, { color: theme.textMuted }]}>ACTIONS</Text>
                  <View style={styles.sidebarActions}>
                    <TouchableOpacity
                      style={[styles.actionBtnBrutalist, styles.actionBtnClose, { backgroundColor: theme.danger }, webCursor('pointer')]}
                      onPress={() => swiperRef.current?.swipeLeft()}
                    >
                      <X size={18} color="#ffffff" />
                      <Text style={styles.actionBtnText}>CLOSE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnBrutalist, styles.actionBtnKeep, { backgroundColor: theme.success }, webCursor('pointer')]}
                      onPress={() => swiperRef.current?.swipeRight()}
                    >
                      <Check size={18} color="#ffffff" />
                      <Text style={styles.actionBtnText}>KEEP</Text>
                    </TouchableOpacity>
                  </View>
                  {lastClosed && (
                    <TouchableOpacity
                      style={[styles.undoBtnBrutalist, { borderColor: theme.primary }, webCursor('pointer')]}
                      onPress={handleUndo}
                      disabled={undoBusy}
                    >
                      <RotateCcw size={16} color={theme.primary} />
                      <Text style={[styles.undoBtnText, { color: theme.primary }]}>UNDO</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={[styles.sidebarFooter, { borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.themeToggle, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }, webCursor('pointer')]}
                  onPress={cycleTheme}
                  activeOpacity={0.7}
                >
                  {themeMode === 'dark' ? (
                    <Moon size={18} color={theme.primary} />
                  ) : themeMode === 'light' ? (
                    <Sun size={18} color={theme.primary} />
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      <Sun size={12} color={theme.primary} />
                      <Moon size={12} color={theme.primary} />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.signOutBrutalist, webCursor('pointer')]} onPress={signOut}>
                  <LogOut size={18} color="#000000" />
                  <Text style={styles.signOutTextBrutalist}>Sign out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Main Content Area */}
          <View style={[styles.contentMax, isDesktop && styles.contentMaxWeb, isDesktop && !token && styles.contentMaxLogin]}>
            {!token ? (
              <ScrollView
                style={styles.authContainerScroll}
                contentContainerStyle={styles.authContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Login Card */}
                <View style={[styles.authCard, !isDesktop && styles.authCardMobile]}>
                  {/* App Icon */}
                  <View style={styles.authLogoWrap}>
                    <Image
                      source={require('./assets/icon.png')}
                      style={styles.authLogo}
                      resizeMode="cover"
                    />
                  </View>

                  <View style={styles.authCardBrand}>
                    <Text style={styles.authBrandIssue}>ISSUE</Text>
                    <Text style={styles.authBrandCrush}>CRUSH</Text>
                  </View>

                  <Text style={styles.authCardSub}>
                    Triage your GitHub issues with swipe gestures.{'\n'}Swipe left to close, right to keep.
                  </Text>

                  <TouchableOpacity
                    style={[styles.githubButton, webCursor('pointer')]}
                    onPress={startDeviceFlow}
                  >
                    <Image
                      source={require('./assets/github-invertocat.png')}
                      style={styles.githubBtnLogo}
                      resizeMode="contain"
                    />
                    <Text style={styles.githubButtonText}>CONTINUE WITH GITHUB</Text>
                  </TouchableOpacity>

                  <Text style={styles.authTrust}>No repo access until you grant permissions</Text>

                  {/* Gesture hints */}
                  <View style={styles.authGestureGuide}>
                    <View style={[styles.gesturePill, { backgroundColor: '#ffe6f2' }]}>
                      <X size={14} color="#d6006e" strokeWidth={3} />
                      <Text style={[styles.gestureLabel, { color: '#d6006e' }]}>CLOSE</Text>
                    </View>
                    <View style={[styles.gesturePill, { backgroundColor: '#e6ffe6' }]}>
                      <Check size={14} color="#007A33" strokeWidth={3} />
                      <Text style={[styles.gestureLabel, { color: '#007A33' }]}>KEEP</Text>
                    </View>
                    <View style={[styles.gesturePill, { backgroundColor: '#e6f0ff' }]}>
                      <Sparkles size={14} color="#0055cc" strokeWidth={3} />
                      <Text style={[styles.gestureLabel, { color: '#0055cc' }]}>AI SUMMARIES</Text>
                    </View>
                  </View>

                  {/* Contribute link */}
                  <TouchableOpacity
                    style={[styles.contributeLink, webCursor('pointer')]}
                    onPress={() => Linking.openURL('https://github.com/AndreaGriffiths11/IssueCrush/blob/main/CONTRIBUTING.md')}
                  >
                    <Heart size={14} color="#FF4D00" />
                    <Text style={styles.contributeLinkText}>Want to contribute?</Text>
                  </TouchableOpacity>

                  {!CLIENT_ID ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.error}>
                        Add EXPO_PUBLIC_GITHUB_CLIENT_ID to your env (see .env.example).
                      </Text>
                    </View>
                  ) : null}

                  {authError ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.error}>{authError}</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            ) : (
              <View style={[styles.triageContent, isDesktop && styles.triageContentDesktop]}>
                {authError ? <Text style={[styles.error, { color: theme.danger, padding: 16 }]}>{authError}</Text> : null}

                {loadingIssues ? (
                  <Animated.View entering={FadeIn.duration(300)} style={styles.loader}>
                    <View style={[styles.loaderCardBrutalist, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                      <ActivityIndicator color={theme.primary} size="large" />
                      <Text style={[styles.loaderTextBrutalist, { color: theme.text }]}>FETCHING ISSUES</Text>
                      <Text style={[styles.loaderSubtextBrutalist, { color: theme.textMuted }]}>Please wait...</Text>
                    </View>
                  </Animated.View>
                ) : issues.length > currentIndex ? (
                  <View
                    style={[isDesktop ? styles.cardAreaDesktop : styles.cardAreaMobile, webCursor('grab')]}
                    {...(isDesktop ? { nativeID: 'card-stack-container' } : {})}
                  >
                    {/* Stacked card layers (Desktop only) */}
                    {isDesktop && (
                      <>
                        <View style={[styles.cardLayerPink, { backgroundColor: theme.danger }]} nativeID="card-layer-three" />
                        <View style={[styles.cardLayerGreen, { backgroundColor: theme.success }]} nativeID="card-layer-two" />
                      </>
                    )}
                    <Swiper
                      key={isDesktop ? 'desktop' : 'mobile'}
                      ref={swiperRef}
                      cards={issues}
                      cardIndex={currentIndex}
                      renderCard={(card) => renderIssueCard(card)}
                      onSwiped={onSwiped}
                      onSwipedLeft={handleSwipeLeft}
                      onSwipedRight={handleSwipeRight}
                      backgroundColor="transparent"
                      stackSize={isDesktop ? 2 : 1}
                      stackSeparation={isDesktop ? 12 : 0}
                      stackScale={isDesktop ? 4 : 0}
                      animateCardOpacity
                      overlayLabels={overlayLabels}
                      cardVerticalMargin={isDesktop ? 0 : 8}
                      cardHorizontalMargin={isDesktop ? 0 : 16}
                      marginTop={0}
                      containerStyle={isDesktop
                        ? { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 10 }
                        : { flex: 1 }
                      }
                      cardStyle={isDesktop
                        ? { left: 0, top: 0, width: '100%', height: '100%' }
                        : {}}
                      verticalSwipe={false}
                      disableTopSwipe
                      disableBottomSwipe
                      horizontalThreshold={100}
                      swipeAnimationDuration={180}
                      animateOverlayLabelsOpacity
                    />
                  </View>
                ) : (
                  <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
                    <View style={[styles.emptyIconContainerBrutalist, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                      <Inbox size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyTitleBrutalist, { color: theme.text }]}>ALL CAUGHT UP</Text>
                    <Text style={[styles.emptySubtitleBrutalist, { color: theme.textMuted }]}>
                      No issues to triage. Try changing your filter.
                    </Text>
                    <TouchableOpacity style={[styles.emptyRefreshButtonBrutalist, webCursor('pointer')]} onPress={loadIssues}>
                      <RefreshCw size={16} color="#000000" />
                      <Text style={styles.emptyRefreshTextBrutalist}>REFRESH</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {/* Toast Feedback */}
                <Animated.View
                  pointerEvents="box-none"
                  style={[styles.toastWrap, isDesktop && styles.toastWrapDesktop, toastAnimatedStyle]}
                >
                  <View style={[
                    styles.toast,
                    feedback.toLowerCase().includes('closed') && { backgroundColor: theme.danger, borderColor: theme.danger },
                    feedback.toLowerCase().includes('kept') && { backgroundColor: theme.success, borderColor: theme.success },
                    feedback.toLowerCase().includes('reopened') && { backgroundColor: theme.primary, borderColor: theme.primary },
                    feedback.toLowerCase().includes('failed') && { backgroundColor: theme.danger, borderColor: theme.danger },
                    feedback.toLowerCase().includes('loaded') && { backgroundColor: theme.success, borderColor: theme.success },
                  ]}>
                    {feedback.toLowerCase().includes('closed') && <X size={16} color="#ffffff" />}
                    {feedback.toLowerCase().includes('kept') && <Check size={16} color="#ffffff" />}
                    {feedback.toLowerCase().includes('reopened') && <RotateCcw size={16} color="#000000" />}
                    {feedback.toLowerCase().includes('loaded') && <Check size={16} color="#ffffff" />}
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.toastText,
                        feedback.toLowerCase().includes('reopened') && { color: '#000000' },
                      ]}
                    >
                      {feedback}
                    </Text>
                    {lastClosed && (
                      <TouchableOpacity
                        style={[
                          styles.toastUndoButton,
                          { backgroundColor: theme.background, borderColor: theme.text },
                          undoBusy && { opacity: 0.6 },
                          webCursor('pointer'),
                        ]}
                        onPress={handleUndo}
                        disabled={undoBusy}
                      >
                        <RotateCcw size={14} color={theme.text} />
                        <Text style={[styles.toastUndoText, { color: theme.text }]}>
                          {undoBusy ? 'UNDOING' : 'UNDO'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>

                {/* Mobile Bottom Controls */}
                {!isDesktop && (
                  <View style={[styles.mobileBottomPanel, { backgroundColor: theme.background }]}>
                    {/* Filter */}
                    <View style={styles.mobileFilterRow}>
                      <View style={[styles.mobileFilterInput, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                        <Filter size={14} color={theme.textMuted} />
                        <TextInput
                          placeholder="owner/repo"
                          placeholderTextColor={theme.textMuted}
                          value={repoFilter}
                          onChangeText={setRepoFilter}
                          style={[styles.mobileFilterText, { color: theme.text }, webCursor('text')]}
                          autoCapitalize="none"
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.mobileRefreshBtn, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }, loadingIssues && { opacity: 0.5 }, webCursor('pointer')]}
                        onPress={loadIssues}
                        disabled={loadingIssues}
                      >
                        <RefreshCw size={14} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                    {/* Label Filter */}
                    <View style={[styles.mobileFilterRow, { marginTop: 8 }]}>
                      <View style={[styles.mobileFilterInput, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                        <Tag size={14} color={theme.textMuted} />
                        <TextInput
                          placeholder="bug, feature, help wanted"
                          placeholderTextColor={theme.textMuted}
                          value={labelFilter}
                          onChangeText={setLabelFilter}
                          style={[styles.mobileFilterText, { color: theme.text }, webCursor('text')]}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    {/* Progress */}
                    {issues.length > 0 && (
                      <View style={styles.mobileProgressRow}>
                        <Text style={[styles.mobileProgressLabel, { color: theme.textMuted }]}>Triaged</Text>
                        <Text style={[styles.mobileProgressValue, { color: theme.text }]}>{Math.round((Math.min(currentIndex + 1, issues.length) / issues.length) * 100)}%</Text>
                      </View>
                    )}
                    {issues.length > 0 && (
                      <View style={[styles.mobileProgressBar, { backgroundColor: theme.backgroundTertiary }]}>
                        <Animated.View style={[styles.mobileProgressFill, { backgroundColor: theme.primary }, progressAnimatedStyle]} />
                      </View>
                    )}

                    {/* Actions */}
                    {issues.length > currentIndex && (
                      <View style={styles.mobileActionsLabel}>
                        <Text style={[styles.sidebarLabel, { color: theme.textMuted }]}>ACTIONS</Text>
                      </View>
                    )}
                    {issues.length > currentIndex && (
                      <View style={styles.mobileActionRow}>
                        <Animated.View style={[closeAnimatedStyle, { flex: 1 }]}>
                          <TouchableOpacity
                            style={[styles.mobileActionBtn, { backgroundColor: theme.danger }, webCursor('pointer')]}
                            onPress={() => swiperRef.current?.swipeLeft()}
                            onPressIn={handleClosePressIn}
                            onPressOut={handleClosePressOut}
                            activeOpacity={0.8}
                          >
                            <X color="#ffffff" size={18} strokeWidth={2.5} />
                            <Text style={styles.mobileActionBtnText}>Close</Text>
                          </TouchableOpacity>
                        </Animated.View>
                        <Animated.View style={[keepAnimatedStyle, { flex: 1 }]}>
                          <TouchableOpacity
                            style={[styles.mobileActionBtn, { backgroundColor: theme.success }, webCursor('pointer')]}
                            onPress={() => swiperRef.current?.swipeRight()}
                            onPressIn={handleKeepPressIn}
                            onPressOut={handleKeepPressOut}
                            activeOpacity={0.8}
                          >
                            <Check color="#ffffff" size={18} strokeWidth={2.5} />
                            <Text style={styles.mobileActionBtnText}>Keep</Text>
                          </TouchableOpacity>
                        </Animated.View>
                      </View>
                    )}

                    {/* Footer row */}
                    <View style={styles.mobileFooterRow}>
                      <TouchableOpacity
                        style={[styles.mobileFooterBtn, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }, webCursor('pointer')]}
                        onPress={cycleTheme}
                      >
                        {themeMode === 'dark' ? <Moon size={16} color={theme.primary} /> : <Sun size={16} color={theme.primary} />}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.mobileSignOutBtn, { backgroundColor: theme.cardBackground }, webCursor('pointer')]}
                        onPress={signOut}
                      >
                        <LogOut size={16} color="#000000" />
                        <Text style={styles.mobileSignOutText}>SIGN OUT</Text>
                      </TouchableOpacity>
                      {lastClosed && (
                        <Animated.View style={undoAnimatedStyle}>
                          <TouchableOpacity
                            style={[styles.mobileFooterBtn, { borderColor: theme.primary, borderWidth: 2, backgroundColor: 'transparent' }, webCursor('pointer')]}
                            onPress={handleUndo}
                            onPressIn={handleUndoPressIn}
                            onPressOut={handleUndoPressOut}
                            disabled={undoBusy}
                          >
                            <RotateCcw color={theme.primary} size={16} />
                          </TouchableOpacity>
                        </Animated.View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
        {__DEV__ && Platform.OS === 'web' && <Agentation />}

        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
          autoStart={false}
          fadeOut
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// Theme Provider Wrapper
export default function App() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ErrorBoundary>
      <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode }}>
        <AppContent />
      </ThemeContext.Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
  container: {
    flex: 1,
    width: '100%',
  },
  containerWeb: {
    flexDirection: 'row',
    maxWidth: 1400,
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  containerWebLogin: {
    maxWidth: '100%',
  },
  webSidebar: {
    width: 280,
    borderRightWidth: 1,
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    position: 'sticky' as any,
    top: 0,
    height: '100%',
  },
  sidebarContent: {
    flex: 1,
    gap: 40,
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  brandHeavy: {
    fontSize: 28,
    fontWeight: '900',
    color: '#DFFF00',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  brandLight: {
    fontSize: 28,
    fontWeight: '300',
    color: '#DFFF00',
    letterSpacing: 0,
  },
  sidebarSection: {
    gap: 16,
  },
  sidebarLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  layoutContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  sidebarInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  sidebarInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  sidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  sidebarButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarButtonBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 50,
    backgroundColor: '#ffffff',
  },
  sidebarButtonTextBrutalist: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressLabelLight: {
    fontSize: 14,
    fontWeight: '300',
    color: '#888888',
  },
  progressLabelHeavy: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  progressBarBrutalist: {
    width: '100%',
    height: 24,
    backgroundColor: '#222222',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  progressFillBrutalist: {
    height: '100%',
    backgroundColor: '#FF1493',
    borderRadius: 12,
  },
  actionBtnBrutalist: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 50,
  },
  actionBtnClose: {
    backgroundColor: '#FF1493',
  },
  actionBtnKeep: {
    backgroundColor: '#4B9F5D',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  undoBtnBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#DFFF00',
    marginTop: 12,
  },
  undoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  signOutBrutalist: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    backgroundColor: '#ffffff',
  },
  signOutTextBrutalist: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  sidebarProgressText: {
    fontSize: 24,
    fontWeight: '700',
  },
  sidebarProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sidebarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sidebarActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  sidebarActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  sidebarUndoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
    marginTop: 12,
  },
  contentMaxWeb: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  contentWeb: {
    flex: 1,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  contentMax: {
    flex: 1,
    width: '100%',
  },
  contentMaxLogin: {
    maxWidth: '100%',
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  brandIcon: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 6,
    elevation: 0,
    borderWidth: 0,
    borderColor: '#ffffff',
  },
  brandIconImage: {
    width: 38,
    height: 38,
  },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0969da',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(9, 105, 218, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  signOutText: {
    color: '#57606a',
    fontWeight: '600',
    fontSize: 13,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  // Auth Screen Styles
  authContainerScroll: {
    flex: 1,
    backgroundColor: '#000000',
  },
  authContainer: {
    flexGrow: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    minHeight: '100%',
  },
  authHeroSection: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
    maxWidth: 440,
  },
  authIconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 4,
  },
  authHeroIcon: {
    width: 140,
    height: 140,
  },
  heroLine1: {
    fontSize: isWeb ? 64 : 48,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -3,
    lineHeight: isWeb ? 64 : 48,
  },
  heroLine2: {
    fontSize: isWeb ? 28 : 20,
    fontWeight: '300',
    marginTop: 4,
    lineHeight: isWeb ? 32 : 24,
  },
  heroLine3: {
    fontSize: isWeb ? 64 : 48,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -3,
    lineHeight: isWeb ? 64 : 48,
    marginTop: 2,
  },
  heroLine4: {
    fontSize: isWeb ? 28 : 20,
    fontWeight: '300',
    lineHeight: isWeb ? 32 : 24,
  },
  authDivider: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginVertical: 20,
  },
  hero: {
    fontSize: 32,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  heroHeavy: {
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroLight: {
    fontWeight: '300',
  },
  heroAccent: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    fontWeight: '300',
  },
  authCard: {
    width: '100%',
    maxWidth: isWeb ? 520 : '100%',
    backgroundColor: '#ffffff',
    borderRadius: isWeb ? 24 : 20,
    padding: isWeb ? 44 : 28,
    gap: isWeb ? 20 : 20,
    alignItems: 'center',
  },
  authLogoWrap: {
    width: isWeb ? 120 : 100,
    height: isWeb ? 120 : 100,
    borderRadius: isWeb ? 28 : 24,
    overflow: 'hidden',
  },
  authLogo: {
    width: isWeb ? 120 : 100,
    height: isWeb ? 120 : 100,
  },
  authCardBrand: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  authBrandIssue: {
    fontSize: isWeb ? 52 : 36,
    fontWeight: '900',
    color: '#b8cc00',
    textTransform: 'uppercase',
    letterSpacing: -2,
  },
  authBrandCrush: {
    fontSize: isWeb ? 52 : 36,
    fontWeight: '300',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  authCardSub: {
    fontSize: isWeb ? 16 : 16,
    fontWeight: '400',
    color: '#555555',
    textAlign: 'center',
    lineHeight: isWeb ? 24 : 24,
  },
  authTrust: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontWeight: '400',
  },
  authStatusBadge: {
    alignSelf: 'center',
    backgroundColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 50,
  },
  authStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#39FF14',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  authCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  scopeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scopeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textTransform: 'uppercase',
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#000000',
    paddingVertical: isWeb ? 24 : 20,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
  },
  githubBtnLogo: {
    width: isWeb ? 28 : 26,
    height: isWeb ? 28 : 26,
  },
  githubButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: isWeb ? 20 : 18,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deviceBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333333',
    backgroundColor: '#111111',
    gap: 12,
    alignItems: 'center',
  },
  codeContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#DFFF00',
    backgroundColor: '#000000',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#888888',
  },
  code: {
    fontSize: 28,
    letterSpacing: 6,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#ffffff',
  },
  openGithubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkButtonText: {
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#1a0010',
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  authFeatures: {
    marginTop: 28,
    gap: 10,
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: 440,
  },
  authGestureGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isWeb ? 12 : 8,
    flexWrap: 'wrap',
  },
  gesturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 50,
  },
  gestureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gestureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  contributeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  contributeLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 2,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Main Content Styles
  content: {
    flex: 1,
    paddingHorizontal: 0,
  },
  controlsCard: {
    backgroundColor: '#f6f8fa',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 0,
    paddingHorizontal: 14,
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
    borderRadius: 1,
    borderWidth: 1,
    borderColor: '#d0d7de',
    paddingHorizontal: 14,
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
    gap: 8,
  },
  issueCountText: {
    fontSize: 14,
    color: '#24292f',
    fontWeight: '700',
    backgroundColor: '#ddf4ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e4e8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0969da',
    borderRadius: 4,
  },

  // Card Styles
  swiperWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  swiperWrapWeb: {
    flex: 1,
    maxWidth: 900,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  // Stacked card layers for brutalist effect
  cardStackContainer: {
    position: 'relative',
    width: 480,
    height: 640,
    alignSelf: 'center',
  },
  cardStackWrapper: {
    position: 'absolute',
    width: 480,
    height: 640,
    zIndex: 0,
    pointerEvents: 'none',
  },
  cardLayerPink: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    backgroundColor: '#FF1493',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#000000',
    transform: [{ rotate: '-5deg' }],
    zIndex: -2,
    pointerEvents: 'none',
  },
  cardLayerGreen: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    backgroundColor: '#4B9F5D',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#000000',
    transform: [{ rotate: '3deg' }],
    zIndex: -1,
    pointerEvents: 'none',
  },
  cardBrutalist: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  cardBrutalistDesktop: {
    borderRadius: 24,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 10,
  },
  cardHeaderBrutalist: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    position: 'relative',
  },
  issueIdBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 50,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  issueIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
  },
  headlineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    paddingRight: 80,
  },
  headlineBrutalist: {
    fontSize: 24,
    lineHeight: 28,
    flex: 1,
  },
  headlineHeavy: {
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  headlineLight: {
    fontWeight: '300',
    color: '#000000',
  },
  cardBodyBrutalist: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  cardBodyContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 16,
  },
  userRowBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBrutalist: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
  },
  userMetaBrutalist: {
    flexDirection: 'column',
  },
  userNameBrutalist: {
    fontWeight: '900',
    fontSize: 16,
    color: '#000000',
    textTransform: 'uppercase',
  },
  repoNameBrutalist: {
    fontWeight: '300',
    fontSize: 13,
    color: '#555555',
  },
  labelsBrutalist: {
    flexDirection: 'row',
    flexWrap: 'nowrap', // Horizontal scroll on mobile
    gap: 8,
    overflow: 'visible',
    paddingBottom: 4,
  },
  labelBrutalist: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 50,
  },
  labelTextBrutalist: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  aiBlockBrutalist: {
    backgroundColor: '#050505',
    padding: 24,
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  aiSummaryScroll: {
    maxHeight: 120,
  },
  aiStickerBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 50,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
  },
  aiStickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
  },
  aiTextBrutalist: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 22,
    fontSize: 14,
    color: '#ffffff',
  },
  aiTextHighlight: {
    color: '#DFFF00',
    fontWeight: '700',
  },
  aiButtonBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiButtonTextBrutalist: {
    color: '#DFFF00',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  aiUnavailableContainer: {
    paddingVertical: 8,
  },
  aiUnavailableText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  aiUnavailableSubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
  loaderCardBrutalist: {
    backgroundColor: '#111111',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  loaderTextBrutalist: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  loaderSubtextBrutalist: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '300',
  },
  card: {
    flex: 0,
    width: '100%',
    maxWidth: 480,
    minHeight: 350,
    maxHeight: 500,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d0d7de',
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
    zIndex: 1,
  },
  cardWeb: {
    maxWidth: 600,
    minHeight: 400,
    maxHeight: 600,
    padding: 28,
  },
  cardBackgroundImage: {
    borderRadius: 16,
    opacity: 0.35,
  },
  cardEmpty: {
    backgroundColor: '#f6f8fa',
  },
  cardHeader: {
    gap: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    maxWidth: '50%',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    color: '#57606a',
    flexShrink: 1,
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
  emptyIconContainerBrutalist: {
    width: 96,
    height: 96,
    borderRadius: 50,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#24292f',
    marginBottom: 8,
  },
  emptyTitleBrutalist: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#57606a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptySubtitleBrutalist: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontWeight: '300',
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
  emptyRefreshButtonBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 50,
  },
  emptyRefreshText: {
    color: '#0969da',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyRefreshTextBrutalist: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
  },

  // Crumble Animation Styles
  crumbleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  crumbleImage: {
    width: 400,
    height: 400,
    tintColor: '#d1242f',
    opacity: 0.9,
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
    bottom: 120,
    alignItems: 'center',
    zIndex: 100,
  },
  toastWrapDesktop: {
    top: 24,
    bottom: undefined,
    left: 0,
    right: 0,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  toastClose: {
    backgroundColor: '#FF1493',
    borderColor: '#FF1493',
  },
  toastKeep: {
    backgroundColor: '#4B9F5D',
    borderColor: '#4B9F5D',
  },
  toastReopen: {
    backgroundColor: '#DFFF00',
    borderColor: '#DFFF00',
  },
  toastError: {
    backgroundColor: '#FF1493',
    borderColor: '#FF1493',
  },
  toastSuccess: {
    backgroundColor: '#4B9F5D',
    borderColor: '#4B9F5D',
  },
  toastText: {
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  toastUndoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  toastUndoText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // Action Bar Styles
  actionBar: {
    paddingTop: 16,
    paddingBottom: 34,
    paddingHorizontal: -16,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  fabClose: {
    width: 68,
    height: 68,
    backgroundColor: '#FF1493',
  },
  fabKeep: {
    width: 68,
    height: 68,
    backgroundColor: '#4B9F5D',
  },
  fabUndo: {
    width: 56,
    height: 56,
    backgroundColor: '#111111',
    borderWidth: 2,
    borderColor: '#DFFF00',
  },
  fabUndoDisabled: {
    backgroundColor: '#111111',
    borderColor: '#333333',
    shadowOpacity: 0.1,
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

  // ============================================
  // TINDER-STYLE LAYOUT STYLES
  // ============================================
  triageContent: {
    flex: 1,
    width: '100%',
  },
  triageContentDesktop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  mobileBrandHeavy: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  mobileBrandLight: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 0,
  },
  mobileTopBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileTopBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileFilterInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  mobileFilterText: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  mobileRefreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinProgressBar: {
    width: '100%',
    height: 4,
    overflow: 'hidden',
  },
  thinProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardAreaMobile: {
    width: '100%',
    height: '55%',
    minHeight: 340,
  },
  cardAreaDesktop: {
    position: 'relative',
    width: 480,
    height: 640,
  },
  mobileActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  mobileBottomPanel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
    marginTop: 'auto',
  },
  mobileProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  mobileProgressLabel: {
    fontSize: 13,
    fontWeight: '300',
  },
  mobileProgressValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  mobileProgressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mobileProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  mobileActionsLabel: {
    marginTop: 4,
  },
  mobileActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mobileActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 50,
  },
  mobileActionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  mobileFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  mobileFooterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSignOutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 50,
  },
  mobileSignOutText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  circleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  circleBtnLg: {
    width: 64,
    height: 64,
  },
  circleBtnSm: {
    width: 48,
    height: 48,
    borderWidth: 2,
  },
  authCardMobile: {
    padding: 24,
    borderRadius: 0,
    maxWidth: '100%',
  },
});
