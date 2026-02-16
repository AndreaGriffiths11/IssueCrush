import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { GitHubIssue, extractRepoPath } from '../api/github';
import { useTheme } from '../theme';
import { webCursor } from '../utils';
import { IssueCard } from './IssueCard';

interface SwipeContainerProps {
    issues: GitHubIssue[];
    currentIndex: number;
    isDesktop: boolean;
    copilotAvailable: boolean | null;
    loadingAiSummary: boolean;
    swiperRef: React.RefObject<Swiper<GitHubIssue> | null>;
    onSwiped: (idx: number) => void;
    onSwipeLeft: (idx: number) => void;
    onSwipeRight: (idx: number) => void;
    onGetAiSummary: () => void;
    repoLabel: (issue: GitHubIssue) => string;
}

export function SwipeContainer({
    issues,
    currentIndex,
    isDesktop,
    copilotAvailable,
    loadingAiSummary,
    swiperRef,
    onSwiped,
    onSwipeLeft,
    onSwipeRight,
    onGetAiSummary,
    repoLabel,
}: SwipeContainerProps) {
    const { theme } = useTheme();

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
                    },
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
                    },
                },
            },
        }),
        [theme]
    );

    const renderCard = (card: GitHubIssue | null) => {
        // Re-read from issues array so aiSummary updates are reflected
        const issue = issues.find((i) => i.id === card?.id) || card;
        if (!issue) {
            return <View style={[styles.cardPlaceholder, isDesktop && styles.cardPlaceholderDesktop]} />;
        }
        const label =
            issue.repository?.full_name ?? extractRepoPath(issue.repository_url);
        const isCurrent = issue.id === issues[currentIndex]?.id;
        return (
            <IssueCard
                issue={issue}
                isDesktop={isDesktop}
                isCurrent={isCurrent}
                copilotAvailable={copilotAvailable}
                loadingAiSummary={loadingAiSummary}
                repoLabel={label}
                onGetAiSummary={onGetAiSummary}
            />
        );
    };

    return (
        <View
            style={[
                isDesktop ? styles.cardAreaDesktop : styles.cardAreaMobile,
                webCursor('grab'),
            ]}
            {...(isDesktop ? { nativeID: 'card-stack-container' } : {})}
        >
            {/* Stacked background layers (desktop only) */}
            {isDesktop && (
                <>
                    <View
                        style={[styles.cardLayerPink, { backgroundColor: theme.danger }]}
                        nativeID="card-layer-three"
                    />
                    <View
                        style={[styles.cardLayerGreen, { backgroundColor: theme.success }]}
                        nativeID="card-layer-two"
                    />
                </>
            )}

            <Swiper
                key={isDesktop ? 'desktop' : 'mobile'}
                ref={swiperRef}
                cards={issues}
                cardIndex={currentIndex}
                renderCard={renderCard}
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
                containerStyle={
                    isDesktop
                        ? {
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 10,
                        }
                        : { flex: 1 }
                }
                cardStyle={isDesktop ? { left: 0, top: 0, width: '100%', height: '100%' } : {}}
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
        borderRadius: 24,
        borderWidth: 3,
        borderColor: '#000000',
        transform: [{ rotate: '3deg' }],
        zIndex: -1,
        pointerEvents: 'none',
    },
    cardPlaceholder: {
        flex: 1,
        backgroundColor: '#222',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#000000',
    },
    cardPlaceholderDesktop: {
        borderRadius: 24,
        borderWidth: 3,
    },
});
