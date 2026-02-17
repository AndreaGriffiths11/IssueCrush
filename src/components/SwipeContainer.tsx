import React, { RefObject, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Swiper from 'react-native-deck-swiper';
import { RefreshCw, Inbox } from 'lucide-react-native';
import { GitHubIssue } from '../api/github';
import { Theme } from '../theme';
import { IssueCard } from './IssueCard';

const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};

interface SwipeContainerProps {
  theme: Theme;
  isDark: boolean;
  isDesktop: boolean;
  issues: GitHubIssue[];
  currentIndex: number;
  swiperRef: RefObject<Swiper<GitHubIssue>>;
  onSwipeLeft: (index: number) => void;
  onSwipeRight: (index: number) => void;
  onSwiped: (index: number) => void;
  loadingIssues: boolean;
  repoLabel: (issue: GitHubIssue) => string;
  copilotAvailable: boolean | null;
  loadingAiSummary: boolean;
  onGetAiSummary: () => void;
  onRefresh: () => void;
}

export function SwipeContainer({
  theme,
  isDark,
  isDesktop,
  issues,
  currentIndex,
  swiperRef,
  onSwipeLeft,
  onSwipeRight,
  onSwiped,
  loadingIssues,
  repoLabel,
  copilotAvailable,
  loadingAiSummary,
  onGetAiSummary,
  onRefresh,
}: SwipeContainerProps) {
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
    [theme.danger, theme.success]
  );

  const renderIssueCard = (cardIssue: GitHubIssue | null) => {
    const issue = issues.find(i => i.id === cardIssue?.id) || cardIssue;
    const isCurrentIssue = issue ? currentIndex === issues.indexOf(issue) : false;

    return (
      <IssueCard
        issue={issue}
        theme={theme}
        isDark={isDark}
        isDesktop={isDesktop}
        repoLabel={repoLabel}
        copilotAvailable={copilotAvailable}
        loadingAiSummary={loadingAiSummary}
        isCurrentIssue={isCurrentIssue}
        onGetAiSummary={onGetAiSummary}
      />
    );
  };

  if (loadingIssues) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.loader}>
        <View style={[styles.loaderCardBrutalist, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={[styles.loaderTextBrutalist, { color: theme.text }]}>FETCHING ISSUES</Text>
          <Text style={[styles.loaderSubtextBrutalist, { color: theme.textMuted }]}>Please wait...</Text>
        </View>
      </Animated.View>
    );
  }

  if (issues.length <= currentIndex) {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
        <View style={[styles.emptyIconContainerBrutalist, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Inbox size={48} color={theme.primary} />
        </View>
        <Text style={[styles.emptyTitleBrutalist, { color: theme.text }]}>ALL CAUGHT UP</Text>
        <Text style={[styles.emptySubtitleBrutalist, { color: theme.textMuted }]}>
          No issues to triage. Try changing your filter.
        </Text>
        <TouchableOpacity style={[styles.emptyRefreshButtonBrutalist, webCursor('pointer')]} onPress={onRefresh}>
          <RefreshCw size={16} color="#000000" />
          <Text style={styles.emptyRefreshTextBrutalist}>REFRESH</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
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
        onSwipedLeft={onSwipeLeft}
        onSwipedRight={onSwipeRight}
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
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderCardBrutalist: {
    borderWidth: 3,
    padding: 40,
    gap: 16,
    alignItems: 'center',
    minWidth: 280,
  },
  loaderTextBrutalist: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  loaderSubtextBrutalist: {
    fontSize: 13,
    fontWeight: '400',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  emptyIconContainerBrutalist: {
    width: 120,
    height: 120,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitleBrutalist: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  emptySubtitleBrutalist: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 300,
  },
  emptyRefreshButtonBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DFFF00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#000000',
    marginTop: 16,
  },
  emptyRefreshTextBrutalist: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  cardAreaDesktop: {
    position: 'relative',
    width: 480,
    height: 640,
    overflow: 'hidden',
  },
  cardAreaMobile: {
    width: '100%',
    height: '55%',
    minHeight: 340,
  },
  cardLayerPink: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '90%',
    height: '85%',
    marginLeft: '-45%',
    marginTop: '-42.5%',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    transform: [{ rotate: '-4deg' }, { translateX: -10 }, { translateY: 10 }],
    zIndex: 1,
  },
  cardLayerGreen: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '90%',
    height: '85%',
    marginLeft: '-45%',
    marginTop: '-42.5%',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    transform: [{ rotate: '3deg' }, { translateX: 10 }, { translateY: -5 }],
    zIndex: 2,
  },
});
