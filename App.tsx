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
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  useColorScheme,
  Appearance,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, Check, RotateCcw, Inbox } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

import { lightTheme, darkTheme, Theme, ThemeMode } from './src/theme/themes';
import { useAuth } from './src/hooks/useAuth';
import { useIssues } from './src/hooks/useIssues';
import { useAnimations } from './src/hooks/useAnimations';
import { AuthScreen } from './src/components/AuthScreen';
import { Sidebar } from './src/components/Sidebar';
import { SwipeContainer } from './src/components/SwipeContainer';

const webCursor = (cursor: string): any => 
  Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};
const isWeb = Platform.OS === 'web';

const ThemeContext = React.createContext<{
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

const useTheme = () => React.useContext(ThemeContext);

function AppContent() {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isDesktop = isWeb && SCREEN_WIDTH >= 1024;

  const { token, authError, setAuthError, copilotAvailable, startLogin, signOut } = useAuth();
  
  const {
    issues, loadingIssues, loadingAiSummary, currentIndex, lastClosed, undoBusy,
    feedback, setFeedback, repoFilter, setRepoFilter, labelFilter, setLabelFilter,
    swiperRef, confettiRef, repoLabel, loadIssues, handleSwipeLeft, handleSwipeRight,
    onSwiped, handleUndo, handleGetAiSummary,
  } = useIssues(token);

  const {
    showCrumble, triggerCrumbleAnimation, crumbleAnimatedStyle, toastAnimatedStyle,
    progressAnimatedStyle, undoAnimatedStyle, closeAnimatedStyle, keepAnimatedStyle,
    handleClosePressIn, handleClosePressOut, handleKeepPressIn, handleKeepPressOut,
    handleUndoPressIn, handleUndoPressOut,
  } = useAnimations(theme, feedback, currentIndex, issues.length, false);

  React.useEffect(() => {
    if (isWeb && typeof document !== 'undefined') {
      const styleId = 'brutalist-card-hover-styles';
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #card-layer-three, #card-layer-two, #card-stack-container > div > div:last-child {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        #card-stack-container:hover #card-layer-three {
          transform: rotate(-8deg) translateX(-15px) translateY(15px) !important;
        }
        #card-stack-container:hover #card-layer-two {
          transform: rotate(6deg) translateX(15px) translateY(-10px) !important;
        }
        #card-stack-container:hover > div > div:last-child {
          transform: scale(1.02) !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        const styleToRemove = document.getElementById(styleId);
        if (styleToRemove) styleToRemove.remove();
      };
    }
  }, [isWeb]);

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const currentIdx = modes.indexOf(themeMode);
    setThemeMode(modes[(currentIdx + 1) % modes.length]);
  };

  if (!token) {
    return <AuthScreen isDesktop={isDesktop} clientId={process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || null} authError={authError} onLogin={startLogin} />;
  }

  if (loadingIssues && issues.length === 0) {
    return (
      <View style={[appStyles.centerScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[appStyles.loadingText, { color: theme.text }]}>Loading issues...</Text>
      </View>
    );
  }

  if (issues.length === 0 && !loadingIssues) {
    return (
      <SafeAreaView style={[appStyles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {isDesktop && <Sidebar theme={theme} themeMode={themeMode} repoFilter={repoFilter} labelFilter={labelFilter} loadingIssues={loadingIssues} issues={issues} currentIndex={currentIndex} lastClosed={lastClosed} undoBusy={undoBusy} swiperRef={swiperRef} progressAnimatedStyle={progressAnimatedStyle} onRepoFilterChange={setRepoFilter} onLabelFilterChange={setLabelFilter} onRefresh={loadIssues} onUndo={handleUndo} onCycleTheme={cycleTheme} onSignOut={signOut} />}
        <View style={appStyles.emptyContainer}>
          <Inbox size={64} color={theme.textMuted} strokeWidth={1.5} />
          <Text style={[appStyles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
          <Text style={[appStyles.emptySubtitle, { color: theme.textSecondary }]}>No open issues found{repoFilter ? ` in ${repoFilter}` : ''}.</Text>
          <TouchableOpacity style={[appStyles.emptyButton, { backgroundColor: theme.primary }, webCursor('pointer')]} onPress={loadIssues}><Text style={appStyles.emptyButtonText}>REFRESH</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const allSwiped = currentIndex >= issues.length;

  return (
    <SafeAreaView style={[appStyles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isDesktop ? (
        <View style={appStyles.desktopLayout}>
          <Sidebar theme={theme} themeMode={themeMode} repoFilter={repoFilter} labelFilter={labelFilter} loadingIssues={loadingIssues} issues={issues} currentIndex={currentIndex} lastClosed={lastClosed} undoBusy={undoBusy} swiperRef={swiperRef} progressAnimatedStyle={progressAnimatedStyle} onRepoFilterChange={setRepoFilter} onLabelFilterChange={setLabelFilter} onRefresh={loadIssues} onUndo={handleUndo} onCycleTheme={cycleTheme} onSignOut={signOut} />
          <View style={appStyles.desktopCardArea}>
            {allSwiped ? (
              <View style={appStyles.completedScreen}>
                <ConfettiCannon ref={confettiRef} count={200} origin={{ x: SCREEN_WIDTH / 2, y: -10 }} fadeOut autoStart={false} />
                <Text style={[appStyles.completedEmoji, { color: theme.text }]}>🎉</Text>
                <Text style={[appStyles.completedTitle, { color: theme.text }]}>All Done!</Text>
                <Text style={[appStyles.completedSubtitle, { color: theme.textSecondary }]}>You've triaged all issues. Great work!</Text>
              </View>
            ) : (
              <SwipeContainer issues={issues} currentIndex={currentIndex} isDesktop={isDesktop} theme={theme} isDark={isDark} loadingAiSummary={loadingAiSummary} copilotAvailable={copilotAvailable} swiperRef={swiperRef} repoLabel={repoLabel} onSwiped={onSwiped} onSwipedLeft={handleSwipeLeft} onSwipedRight={handleSwipeRight} onGetAiSummary={handleGetAiSummary} />
            )}
          </View>
        </View>
      ) : (
        <View style={[appStyles.mobileContainer, { backgroundColor: theme.background }]}>
          {allSwiped ? (
            <View style={appStyles.completedScreen}>
              <ConfettiCannon ref={confettiRef} count={200} origin={{ x: SCREEN_WIDTH / 2, y: -10 }} fadeOut autoStart={false} />
              <Text style={[appStyles.completedEmoji, { color: theme.text }]}>🎉</Text>
              <Text style={[appStyles.completedTitle, { color: theme.text }]}>All Done!</Text>
              <Text style={[appStyles.completedSubtitle, { color: theme.textSecondary }]}>You've triaged all issues. Great work!</Text>
            </View>
          ) : (
            <>
              <SwipeContainer issues={issues} currentIndex={currentIndex} isDesktop={isDesktop} theme={theme} isDark={isDark} loadingAiSummary={loadingAiSummary} copilotAvailable={copilotAvailable} swiperRef={swiperRef} repoLabel={repoLabel} onSwiped={onSwiped} onSwipedLeft={handleSwipeLeft} onSwipedRight={handleSwipeRight} onGetAiSummary={handleGetAiSummary} />
              <View style={[appStyles.mobileControls, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Animated.View style={[undoAnimatedStyle]}>
                  <TouchableOpacity style={[appStyles.mobileUndoBtn, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }, webCursor('pointer')]} onPress={handleUndo} onPressIn={handleUndoPressIn} onPressOut={handleUndoPressOut} disabled={!lastClosed || undoBusy}><RotateCcw size={20} color={lastClosed ? theme.primary : theme.textMuted} /></TouchableOpacity>
                </Animated.View>
                <Animated.View style={[closeAnimatedStyle]}>
                  <TouchableOpacity style={[appStyles.mobileFabClose, { backgroundColor: theme.danger }, webCursor('pointer')]} onPress={() => swiperRef.current?.swipeLeft()} onPressIn={handleClosePressIn} onPressOut={handleClosePressOut}><X size={32} color="#ffffff" strokeWidth={3} /></TouchableOpacity>
                </Animated.View>
                <Animated.View style={[keepAnimatedStyle]}>
                  <TouchableOpacity style={[appStyles.mobileFabKeep, { backgroundColor: theme.success }, webCursor('pointer')]} onPress={() => swiperRef.current?.swipeRight()} onPressIn={handleKeepPressIn} onPressOut={handleKeepPressOut}><Check size={32} color="#ffffff" strokeWidth={3} /></TouchableOpacity>
                </Animated.View>
              </View>
            </>
          )}
        </View>
      )}
      {feedback && (
        <Animated.View style={[appStyles.toast, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }, toastAnimatedStyle]}>
          <Text style={[appStyles.toastText, { color: theme.text }]}>{feedback}</Text>
        </Animated.View>
      )}
      {isDesktop && <ConfettiCannon ref={confettiRef} count={200} origin={{ x: SCREEN_WIDTH / 2, y: -10 }} fadeOut autoStart={false} />}
      {showCrumble && <Animated.View style={[appStyles.crumbleOverlay, crumbleAnimatedStyle]} pointerEvents="none"><Text style={appStyles.crumbleEmoji}>💥</Text></Animated.View>}
    </SafeAreaView>
  );
}

export default function App() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = React.useState<ThemeMode>('system');

  const { theme, isDark } = React.useMemo(() => {
    let effectiveTheme: Theme;
    let effectiveIsDark: boolean;
    if (themeMode === 'system') {
      effectiveTheme = systemColorScheme === 'dark' ? darkTheme : lightTheme;
      effectiveIsDark = systemColorScheme === 'dark';
    } else if (themeMode === 'dark') {
      effectiveTheme = darkTheme;
      effectiveIsDark = true;
    } else {
      effectiveTheme = lightTheme;
      effectiveIsDark = false;
    }
    return { theme: effectiveTheme, isDark: effectiveIsDark };
  }, [themeMode, systemColorScheme]);

  React.useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {});
    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppContent />
        </GestureHandlerRootView>
      </ThemeContext.Provider>
    </ErrorBoundary>
  );
}

const appStyles = StyleSheet.create({
  safeArea: { flex: 1 },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  desktopLayout: { flex: 1, flexDirection: 'row' },
  desktopCardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  mobileContainer: { flex: 1, justifyContent: 'space-between' },
  mobileControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, gap: 16 },
  mobileUndoBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  mobileFabClose: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  mobileFabKeep: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  emptyTitle: { fontSize: 32, fontWeight: '900', textTransform: 'uppercase', marginTop: 16 },
  emptySubtitle: { fontSize: 16, fontWeight: '400', textAlign: 'center' },
  emptyButton: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 50 },
  emptyButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  completedScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  completedEmoji: { fontSize: 80 },
  completedTitle: { fontSize: 32, fontWeight: '900', textTransform: 'uppercase' },
  completedSubtitle: { fontSize: 16, fontWeight: '400', textAlign: 'center' },
  toast: { position: 'absolute', bottom: 20, alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 50, borderWidth: 2 },
  toastText: { fontSize: 14, fontWeight: '600' },
  crumbleOverlay: { position: 'absolute', top: '50%', left: '50%', marginLeft: -40, marginTop: -40 },
  crumbleEmoji: { fontSize: 80 },
});
