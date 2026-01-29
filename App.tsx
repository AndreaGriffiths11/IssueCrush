import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState, useCallback, createContext, useContext } from 'react';
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
import { X, Check, RotateCcw, Sparkles, ExternalLink, Github, Filter, RefreshCw, Inbox, LogOut, Moon, Sun } from 'lucide-react-native';
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

// ============================================
// THEME SYSTEM - BRUTALIST DESIGN
// ============================================
const lightTheme = {
  background: '#050505',
  backgroundSecondary: '#0a0a0a',
  backgroundTertiary: '#222222',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#666666',
  primary: '#DFFF00', // Acid green
  primaryLight: '#1a1a00',
  danger: '#FF1493', // Pink
  dangerLight: '#2a0a1a',
  dangerBorder: '#FF1493',
  success: '#4B9F5D', // Forest green
  successLight: '#0a1a0d',
  successBorder: '#4B9F5D',
  border: '#333333',
  borderLight: '#222222',
  cardBackground: '#ffffff',
  cardBorder: '#000000',
  inputBackground: '#111111',
  shadow: '#000000',
  notebookOpacity: 0,
  notebookTint: undefined,
  // Brutalist extras
  acid: '#DFFF00',
  pink: '#FF1493',
  forest: '#4B9F5D',
  void: '#050505',
  canvas: '#ffffff',
  ink: '#000000',
};

const darkTheme = {
  background: '#050505',
  backgroundSecondary: '#0a0a0a',
  backgroundTertiary: '#222222',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#666666',
  primary: '#DFFF00', // Acid green
  primaryLight: '#1a1a00',
  danger: '#FF1493', // Pink
  dangerLight: '#2a0a1a',
  dangerBorder: '#FF1493',
  success: '#4B9F5D', // Forest green
  successLight: '#0a1a0d',
  successBorder: '#4B9F5D',
  border: '#333333',
  borderLight: '#222222',
  cardBackground: '#ffffff',
  cardBorder: '#000000',
  inputBackground: '#111111',
  shadow: '#000000',
  notebookOpacity: 0,
  notebookTint: undefined,
  // Brutalist extras
  acid: '#DFFF00',
  pink: '#FF1493',
  forest: '#4B9F5D',
  void: '#050505',
  canvas: '#ffffff',
  ink: '#000000',
};

type Theme = typeof lightTheme;
type ThemeMode = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}>({
  theme: lightTheme,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
});

const useTheme = () => useContext(ThemeContext);

// Web cursor styles helper
const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor } : {};
const isWeb = Platform.OS === 'web';

import { fetchIssues, GitHubIssue, updateIssueState, extractRepoPath } from './src/api/github';
import { deleteToken, getToken, saveToken } from './src/lib/tokenStorage';
import { copilotService } from './src/lib/copilotService';

const CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
const DEFAULT_SCOPE = process.env.EXPO_PUBLIC_GITHUB_SCOPE || 'repo';
const REDIRECT_URI =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : AuthSession.makeRedirectUri({ preferLocalhost: true });

type DeviceAuthState = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

function AppContent() {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
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
  const [inputFocused, setInputFocused] = useState(false);

  const [loadingAiSummary, setLoadingAiSummary] = useState(false);

  const swiperRef = useRef<Swiper<GitHubIssue>>(null);
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    try {
      console.log('Starting device flow...', { CLIENT_ID: CLIENT_ID ? 'Set' : 'Missing', Platform: Platform.OS });

      if (!CLIENT_ID) {
        setAuthError('Missing EXPO_PUBLIC_GITHUB_CLIENT_ID env var.');
        return;
      }
      setAuthError('');
      setDeviceAuth(null);
      if (pollTimeout.current) clearTimeout(pollTimeout.current);

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
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

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

  const handleSwipeRight = async (cardIndex: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const issue = issues[cardIndex];
    if (!issue) return;
    setFeedback(`Kept open · #${issue.number}`);
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

    if (issue.aiSummary) return;

    setLoadingAiSummary(true);
    try {
      const summary = await copilotService.summarizeIssue(issue);

      setIssues(prevIssues =>
        prevIssues.map((item, index) =>
          index === issueIndex ? { ...item, aiSummary: summary } : item
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
            backgroundColor: '#FF1493',
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
            backgroundColor: '#4B9F5D',
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

  const getLabelColor = (hex: string) => {
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  };

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

    if (!issue) return <View style={[styles.card, styles.cardEmpty, isWeb && styles.cardWeb, { backgroundColor: '#222' }]} />;
    return (
      <View style={[styles.cardBrutalist, isWeb && styles.cardWebBrutalist]}>
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

        {/* Card Body - White with black text */}
        <View style={styles.cardBodyBrutalist}>
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
          <View style={styles.aiBlockBrutalist}>
            <View style={styles.aiStickerBadge}>
              <Text style={styles.aiStickerText}>AI INSIGHT</Text>
            </View>
            {issue.aiSummary ? (
              <Text style={styles.aiTextBrutalist}>
                <Text style={styles.aiTextHighlight}>// SUMMARY{'\n'}</Text>
                {issue.aiSummary}
              </Text>
            ) : (
              <TouchableOpacity
                style={[styles.aiButtonBrutalist, webCursor(loadingAiSummary ? 'default' : 'pointer')]}
                onPress={loadingAiSummary ? undefined : handleGetAiSummary}
                disabled={loadingAiSummary}
              >
                {loadingAiSummary && currentIndex === issues.indexOf(issue) ? (
                  <ActivityIndicator color="#DFFF00" size="small" />
                ) : (
                  <>
                    <Sparkles size={18} color="#DFFF00" />
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        <View style={[styles.container, isWeb && styles.containerWeb]}>
          {/* Web Sidebar - Brutalist Design */}
          {isWeb && token && (
            <View style={[styles.webSidebar, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.sidebarContent}>
                <View style={styles.sidebarBrand}>
                  <Text style={styles.brandHeavy}>ISSUE</Text>
                  <Text style={styles.brandLight}>Crush</Text>
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
                      <Text style={styles.progressLabelLight}>Triaged</Text>
                      <Text style={styles.progressLabelHeavy}>{Math.round((Math.min(currentIndex + 1, issues.length) / issues.length) * 100)}%</Text>
                    </View>
                    <View style={styles.progressBarBrutalist}>
                      <Animated.View
                        style={[
                          styles.progressFillBrutalist,
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
                      style={[styles.actionBtnBrutalist, styles.actionBtnClose, webCursor('pointer')]}
                      onPress={() => swiperRef.current?.swipeLeft()}
                    >
                      <X size={18} color="#ffffff" />
                      <Text style={styles.actionBtnText}>CLOSE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnBrutalist, styles.actionBtnKeep, webCursor('pointer')]}
                      onPress={() => swiperRef.current?.swipeRight()}
                    >
                      <Check size={18} color="#ffffff" />
                      <Text style={styles.actionBtnText}>KEEP</Text>
                    </TouchableOpacity>
                  </View>
                  {lastClosed && (
                    <TouchableOpacity
                      style={[styles.undoBtnBrutalist, webCursor('pointer')]}
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
          <View style={[styles.contentMax, isWeb && token && styles.contentMaxWeb]}>
            {/* Mobile Header (hidden on web when authenticated) */}
            {(!isWeb || !token) && (
              <View style={styles.header}>
                <View style={styles.brandContainer}>
                  <Text style={[styles.brand, { color: theme.primary }]}>IssueCrush</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.themeToggle, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }, webCursor('pointer')]}
                    onPress={cycleTheme}
                    activeOpacity={0.7}
                  >
                    {themeMode === 'dark' ? (
                      <Moon size={18} color={theme.textSecondary} />
                    ) : themeMode === 'light' ? (
                      <Sun size={18} color={theme.textSecondary} />
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        <Sun size={12} color={theme.textSecondary} />
                        <Moon size={12} color={theme.textSecondary} />
                      </View>
                    )}
                  </TouchableOpacity>
                  {token ? (
                    <TouchableOpacity style={[styles.signOutButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }, webCursor('pointer')]} onPress={signOut}>
                      <LogOut size={18} color={theme.textSecondary} />
                      <Text style={[styles.signOutText, { color: theme.textSecondary }]}>Sign out</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}

            {!token ? (
              <View style={styles.authContainer}>
                <View style={styles.authHeroSection}>
                  <View style={[styles.authIconContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.borderLight }]}>
                    <Image
                      source={require('./assets/adaptive-icon.png')}
                      style={styles.authHeroIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.hero, { color: theme.text }]}>Swipe through your</Text>
                  <Text style={[styles.heroAccent, { color: theme.primary }]}>GitHub issues</Text>
                  <Text style={[styles.authSubtitle, { color: theme.textSecondary }]}>
                    Triage your issues with simple swipe gestures. Swipe left to close, right to keep.
                  </Text>
                </View>

                <View style={[styles.authCard, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
                  <View style={styles.authCardHeader}>
                    <Github size={24} color={theme.text} />
                    <Text style={[styles.authCardTitle, { color: theme.text }]}>Connect with GitHub</Text>
                  </View>

                  <Text style={[styles.copy, { color: theme.textSecondary }]}>
                    We'll use {Platform.OS === 'web' ? 'OAuth' : 'browser-based OAuth'} to securely connect to your GitHub account.
                  </Text>

                  <View style={[styles.scopeBadge, { backgroundColor: theme.backgroundTertiary }]}>
                    <Text style={[styles.scopeLabel, { color: theme.textSecondary }]}>Required scope:</Text>
                    <Text style={[styles.scopeValue, { color: theme.text }]}>{DEFAULT_SCOPE}</Text>
                  </View>

                  {!CLIENT_ID ? (
                    <View style={[styles.errorBox, { backgroundColor: theme.dangerLight, borderColor: theme.dangerBorder }]}>
                      <Text style={[styles.error, { color: theme.danger }]}>
                        Add EXPO_PUBLIC_GITHUB_CLIENT_ID to your env (see .env.example).
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity style={[styles.githubButton, webCursor('pointer')]} onPress={startDeviceFlow}>
                    <Github size={20} color="#ffffff" />
                    <Text style={styles.githubButtonText}>Continue with GitHub</Text>
                  </TouchableOpacity>

                  {deviceAuth ? (
                    <View style={[styles.deviceBox, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                      <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>Enter this code on GitHub</Text>
                      <View style={[styles.codeContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }]}>
                        <Text style={[styles.code, { color: theme.text }]}>{deviceAuth.user_code}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.openGithubButton, webCursor('pointer')]}
                        onPress={() => Linking.openURL(deviceAuth.verification_uri)}
                      >
                        <ExternalLink size={16} color={theme.primary} />
                        <Text style={[styles.linkButtonText, { color: theme.primary }]}>Open GitHub to enter code</Text>
                      </TouchableOpacity>
                      <View style={styles.waitingIndicator}>
                        <ActivityIndicator size="small" color={theme.primary} />
                        <Text style={[styles.waitingText, { color: theme.textSecondary }]}>Waiting for authorization...</Text>
                      </View>
                    </View>
                  ) : null}

                  {authError ? (
                    <View style={[styles.errorBox, { backgroundColor: theme.dangerLight, borderColor: theme.dangerBorder }]}>
                      <Text style={[styles.error, { color: theme.danger }]}>{authError}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.authFeatures}>
                  <View style={styles.featureItem}>
                    <View style={[styles.featureIcon, { backgroundColor: theme.backgroundSecondary, borderColor: theme.borderLight }]}>
                      <X size={16} color={theme.danger} />
                    </View>
                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>Swipe left to close issues</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={[styles.featureIcon, { backgroundColor: theme.backgroundSecondary, borderColor: theme.borderLight }]}>
                      <Check size={16} color={theme.success} />
                    </View>
                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>Swipe right to keep open</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={[styles.featureIcon, { backgroundColor: theme.backgroundSecondary, borderColor: theme.borderLight }]}>
                      <Sparkles size={16} color={theme.primary} />
                    </View>
                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>AI-powered summaries</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.content, isWeb && styles.contentWeb]}>
                {/* Mobile Controls - Hidden on Web */}
                {!isWeb && (
                  <View style={[styles.controlsCard, { backgroundColor: theme.backgroundTertiary }]}>
                    <View style={styles.controlsRow}>
                      <Animated.View style={[styles.inputWrap, { backgroundColor: theme.inputBackground }, inputAnimatedStyle]}>
                        <Filter size={16} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                          placeholder="Filter by repo (owner/repo)"
                          placeholderTextColor={theme.textMuted}
                          value={repoFilter}
                          onChangeText={setRepoFilter}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          style={[styles.input, { color: theme.text }, webCursor('text')]}
                          autoCapitalize="none"
                        />
                      </Animated.View>
                      <TouchableOpacity
                        style={[styles.refreshButton, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }, loadingIssues && styles.refreshButtonDisabled, webCursor('pointer')]}
                        onPress={loadIssues}
                        disabled={loadingIssues}
                      >
                        <RefreshCw size={18} color={loadingIssues ? theme.textMuted : theme.text} />
                      </TouchableOpacity>
                    </View>
                    {issues.length > 0 && (
                      <View style={styles.issueCounter}>
                        <Animated.Text style={[styles.issueCountText, { backgroundColor: theme.primaryLight, color: theme.text }]}>
                          {Math.min(currentIndex + 1, issues.length)} of {issues.length} issues
                        </Animated.Text>
                        <View style={[styles.progressBar, { backgroundColor: theme.borderLight }]}>
                          <Animated.View
                            style={[
                              styles.progressFill,
                              { backgroundColor: theme.primary },
                              progressAnimatedStyle
                            ]}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {authError ? <Text style={[styles.error, { color: theme.danger }]}>{authError}</Text> : null}

                {loadingIssues ? (
                  <Animated.View entering={FadeIn.duration(300)} style={styles.loader}>
                    <View style={styles.loaderCardBrutalist}>
                      <ActivityIndicator color="#DFFF00" size="large" />
                      <Text style={styles.loaderTextBrutalist}>FETCHING ISSUES</Text>
                      <Text style={styles.loaderSubtextBrutalist}>Please wait...</Text>
                    </View>
                  </Animated.View>
                ) : issues.length > currentIndex ? (
                  <View 
                    style={[styles.swiperWrap, isWeb && styles.swiperWrapWeb, webCursor('grab')]}
                  >
                    {/* Card stack container for proper centering */}
                    <View 
                      style={isWeb ? styles.cardStackContainer : undefined}
                      {...(isWeb ? { nativeID: 'card-stack-container' } : {})}
                    >
                      {/* Stacked card layers for brutalist effect */}
                      {isWeb && (
                        <>
                          <View style={styles.cardLayerPink} nativeID="card-layer-three" />
                          <View style={styles.cardLayerGreen} nativeID="card-layer-two" />
                        </>
                      )}
                    <Swiper
                      key={SCREEN_WIDTH}
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
                      cardVerticalMargin={isWeb ? 0 : 0}
                      marginTop={isWeb ? 0 : undefined}
                      containerStyle={isWeb ? { position: 'absolute', left: 75, top: 25, width: 500, height: 550, zIndex: 10 } : undefined}
                      cardStyle={isWeb ? { left: 0, top: 0 } : undefined}
                      verticalSwipe={false}
                      disableTopSwipe
                      disableBottomSwipe
                      horizontalThreshold={120}
                      swipeAnimationDuration={180}
                      animateOverlayLabelsOpacity
                    />
                    </View>
                  </View>
                ) : (
                  <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
                    <View style={styles.emptyIconContainerBrutalist}>
                      <Inbox size={48} color="#DFFF00" />
                    </View>
                    <Text style={styles.emptyTitleBrutalist}>ALL CAUGHT UP</Text>
                    <Text style={styles.emptySubtitleBrutalist}>
                      No issues to triage. Try changing your filter.
                    </Text>
                    <TouchableOpacity style={[styles.emptyRefreshButtonBrutalist, webCursor('pointer')]} onPress={loadIssues}>
                      <RefreshCw size={16} color="#000000" />
                      <Text style={styles.emptyRefreshTextBrutalist}>REFRESH</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {/* Toast Feedback with Animations */}
                <Animated.View style={[styles.toastWrap, { pointerEvents: 'none' }, toastAnimatedStyle]}>
                  <View style={[
                    styles.toast,
                    feedback.toLowerCase().includes('closed') && { backgroundColor: '#FF1493', borderColor: '#FF1493' },
                    feedback.toLowerCase().includes('kept') && { backgroundColor: '#4B9F5D', borderColor: '#4B9F5D' },
                    feedback.toLowerCase().includes('reopened') && { backgroundColor: '#DFFF00', borderColor: '#DFFF00' },
                    feedback.toLowerCase().includes('failed') && { backgroundColor: '#FF1493', borderColor: '#FF1493' },
                    feedback.toLowerCase().includes('loaded') && { backgroundColor: '#4B9F5D', borderColor: '#4B9F5D' },
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
                  </View>
                </Animated.View>

                {/* Mobile Action Bar - Hidden on Web */}
                {!isWeb && (
                  <View style={styles.actionBar}>
                    <View style={styles.actionBarInner}>
                      <Animated.View style={closeAnimatedStyle}>
                        <TouchableOpacity
                          style={[styles.fab, styles.fabClose, webCursor('pointer')]}
                          onPress={() => swiperRef.current?.swipeLeft()}
                          onPressIn={handleClosePressIn}
                          onPressOut={handleClosePressOut}
                          activeOpacity={1}
                        >
                          <X color="#ffffff" size={28} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </Animated.View>

                      <Animated.View style={undoAnimatedStyle}>
                        <TouchableOpacity
                          style={[
                            styles.fab,
                            styles.fabUndo,
                            !lastClosed && styles.fabUndoDisabled,
                            webCursor(lastClosed ? 'pointer' : 'not-allowed')
                          ]}
                          onPress={handleUndo}
                          onPressIn={handleUndoPressIn}
                          onPressOut={handleUndoPressOut}
                          disabled={!lastClosed || undoBusy}
                          activeOpacity={1}
                        >
                          <RotateCcw color={!lastClosed ? '#333333' : '#DFFF00'} size={22} />
                        </TouchableOpacity>
                      </Animated.View>

                      <Animated.View style={keepAnimatedStyle}>
                        <TouchableOpacity
                          style={[styles.fab, styles.fabKeep, webCursor('pointer')]}
                          onPress={() => swiperRef.current?.swipeRight()}
                          onPressIn={handleKeepPressIn}
                          onPressOut={handleKeepPressOut}
                          activeOpacity={1}
                        >
                          <Check color="#ffffff" size={28} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </Animated.View>
                    </View>

                    <View style={[styles.actionBarHints, { display: 'none' }]}>
                      <Text style={[styles.actionHint, { color: '#FF1493' }]}>Close</Text>
                      <Text style={[styles.actionHint, { color: '#666666' }]}>Undo</Text>
                      <Text style={[styles.actionHint, { color: '#4B9F5D' }]}>Keep</Text>
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
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode }}>
      <AppContent />
    </ThemeContext.Provider>
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
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  containerWeb: {
    flexDirection: 'row',
    maxWidth: 1400,
    alignItems: 'stretch',
  },
  webSidebar: {
    width: 320,
    borderRightWidth: 1,
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 40,
    justifyContent: 'space-between',
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
    borderTopWidth: 1,
  },
  contentMaxWeb: {
    flex: 1,
    paddingHorizontal: 60,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 16,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    width: 650,
    height: 630,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    transform: [{ translateX: 80 }],
  },
  cardStackWrapper: {
    position: 'absolute',
    width: 500,
    height: 550,
    zIndex: 0,
  },
  cardLayerPink: {
    position: 'absolute',
    width: 500,
    height: 550,
    left: 75,
    top: 25,
    backgroundColor: '#FF1493',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#000000',
    transform: [{ rotate: '-5deg' }],
    zIndex: 1,
  },
  cardLayerGreen: {
    position: 'absolute',
    width: 500,
    height: 550,
    left: 75,
    top: 25,
    backgroundColor: '#4B9F5D',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#000000',
    transform: [{ rotate: '3deg' }],
    zIndex: 2,
  },
  cardBrutalist: {
    flex: 0,
    width: 500,
    height: 550,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 3,
  },
  cardWebBrutalist: {
    width: 500,
    height: 550,
    minHeight: 550,
    maxHeight: 550,
  },
  cardHeaderBrutalist: {
    backgroundColor: '#ffffff',
    padding: 32,
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
    fontSize: 28,
    lineHeight: 32,
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
    padding: 32,
    gap: 24,
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
    flexWrap: 'wrap',
    gap: 8,
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
    marginTop: 'auto',
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
    shadowOpacity: 0.08,
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
    bottom: 180,
    alignItems: 'center',
    zIndex: 100,
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
});
