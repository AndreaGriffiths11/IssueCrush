import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { GitHubIssue } from '../api/github';
import { Theme } from '../theme';
import { IssueCard } from './IssueCard';

const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};

interface SwipeContainerProps {
  issues: GitHubIssue[];
  currentIndex: number;
  isDesktop: boolean;
  theme: Theme;
  isDark: boolean;
  loadingAiSummary: boolean;
  copilotAvailable: boolean | null;
  swiperRef: React.RefObject<Swiper<GitHubIssue>>;
  repoLabel: (issue: GitHubIssue) => string;
  onSwiped: (index: number) => void;
  onSwipedLeft: (index: number) => void;
  onSwipedRight: (index: number) => void;
  onGetAiSummary: () => void;
}

export function SwipeContainer({
  issues,
  currentIndex,
  isDesktop,
  theme,
  isDark,
  loadingAiSummary,
  copilotAvailable,
  swiperRef,
  repoLabel,
  onSwiped,
  onSwipedLeft,
  onSwipedRight,
  onGetAiSummary,
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
    [theme]
  );

  const renderCard = (cardIssue: GitHubIssue | null) => {
    const issue = issues.find(i => i.id === cardIssue?.id) || cardIssue;
    const issueIndex = issue ? issues.indexOf(issue) : -1;

    return (
      <IssueCard
        issue={issue}
        repoLabel={issue ? repoLabel(issue) : ''}
        theme={theme}
        isDark={isDark}
        isDesktop={isDesktop}
        loadingAiSummary={loadingAiSummary}
        currentIndex={currentIndex}
        issueIndex={issueIndex}
        copilotAvailable={copilotAvailable}
        onGetAiSummary={onGetAiSummary}
      />
    );
  };

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
        renderCard={renderCard}
        onSwiped={onSwiped}
        onSwipedLeft={onSwipedLeft}
        onSwipedRight={onSwipedRight}
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
});
