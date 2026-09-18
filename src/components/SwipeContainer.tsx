import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Inbox, RefreshCw } from 'lucide-react-native';
import { GitHubIssue, extractRepoPath } from '../api/github';
import { useTheme } from '../theme';
import { webCursor } from '../utils';
import { IssueCard } from './IssueCard';

interface SwipeContainerProps {
    issues: GitHubIssue[];
    currentIndex: number;
    isDesktop: boolean;
    isTablet?: boolean;
    cardWidth?: number;
    cardHeight?: number;
    copilotAvailable: boolean | null;
    loadingAiSummary: boolean;
    triageAvailable: boolean | null;
    loadingTriage: boolean;
    loadingIssues: boolean;
    swiperRef: React.RefObject<Swiper<GitHubIssue> | null>;
    onSwiped: (idx: number) => void;
    onSwipeLeft: (idx: number) => void;
    onSwipeRight: (idx: number) => void;
    onGetAiSummary: () => void;
    onGetTriage: () => void;
    onRefresh: () => void;
    repoLabel: (issue: GitHubIssue) => string;
}

export function SwipeContainer({
    issues,
    currentIndex,
    isDesktop,
    isTablet = false,
    cardWidth = 480,
    cardHeight = 640,
    copilotAvailable,
    loadingAiSummary,
    triageAvailable,
    loadingTriage,
    loadingIssues,
    swiperRef,
    onSwiped,
    onSwipeLeft,
    onSwipeRight,
    onGetAiSummary,
    onGetTriage,
    onRefresh,
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
                        borderWidth: 3,
                        borderColor: '#ffffff',
                        fontSize: 28,
                        fontWeight: '900',
                        textAlign: 'center',
                        padding: 12,
                        paddingHorizontal: 28,
                        borderRadius: 12,
                        transform: [{ rotate: '12deg' }],
                        textTransform: 'uppercase',
                        letterSpacing: 3,
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
                        borderWidth: 3,
                        borderColor: '#ffffff',
                        fontSize: 28,
                        fontWeight: '900',
                        textAlign: 'center',
                        padding: 12,
                        paddingHorizontal: 28,
                        borderRadius: 12,
                        transform: [{ rotate: '-12deg' }],
                        textTransform: 'uppercase',
                        letterSpacing: 3,
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
        const matchingIssue = issues.find((i) => i.id === card?.id);
        const issue = matchingIssue || card;
        if (!issue) {
            const isLargeScreen = isDesktop || isTablet;
            return <View style={[styles.cardPlaceholder, isLargeScreen && styles.cardPlaceholderDesktop, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]} />;
        }
        const label =
            issue.repository?.full_name ?? extractRepoPath(issue.repository_url);
        const currentIssue = issues[currentIndex];
        const isCurrent = issue.id === currentIssue?.id;
        return (
            <IssueCard
                issue={issue}
                isDesktop={isDesktop || isTablet}
                isCurrent={isCurrent}
                copilotAvailable={copilotAvailable}
                loadingAiSummary={loadingAiSummary}
                triageAvailable={triageAvailable}
                loadingTriage={loadingTriage}
                repoLabel={label}
                onGetAiSummary={onGetAiSummary}
                onGetTriage={onGetTriage}
            />
        );
    };

    return (
        <View
            style={[
                (isDesktop || isTablet) ? [styles.cardAreaDesktop, { maxWidth: cardWidth + 40, maxHeight: cardHeight + 40 }] : styles.cardAreaMobile,
                webCursor('grab'),
            ]}
            {...((isDesktop || isTablet) ? { nativeID: 'card-stack-container' } : {})}
        >
            {/* Loading state */}
            {loadingIssues && issues.length === 0 && (
                <View style={styles.centeredState}>
                    <View style={[styles.loaderCard, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loaderText, { color: theme.text }]}>LOADING ISSUES</Text>
                        <Text style={[styles.loaderSubtext, { color: theme.textMuted }]}>Fetching from GitHub...</Text>
                    </View>
                </View>
            )}

            {/* Empty state */}
            {!loadingIssues && issues.length === 0 && (
                <View style={styles.centeredState}>
                    <View style={[styles.emptyIcon, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
                        <Inbox size={40} color={theme.textMuted} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>ALL CLEAR</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                        No open issues found. Try a different repo or refresh.
                    </Text>
                    <TouchableOpacity
                        style={[styles.refreshButton, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }, webCursor('pointer')]}
                        onPress={onRefresh}
                    >
                        <RefreshCw size={16} color={theme.ink} />
                        <Text style={[styles.refreshText, { color: theme.ink }]}>REFRESH</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Card stack */}
            {issues.length > 0 && (
                <>
                    {/* Stacked background layers (desktop only) */}
                    {(isDesktop || isTablet) && (
                        <>
                            <View
                                style={[styles.cardLayerPink, { backgroundColor: theme.danger, borderColor: theme.cardBorder }]}
                                nativeID="card-layer-three"
                            />
                            <View
                                style={[styles.cardLayerGreen, { backgroundColor: theme.success, borderColor: theme.cardBorder }]}
                                nativeID="card-layer-two"
                            />
                        </>
                    )}

                    <Swiper
                        key={(isDesktop || isTablet) ? 'desktop' : 'mobile'}
                        ref={swiperRef}
                        cards={issues}
                        cardIndex={currentIndex}
                        renderCard={renderCard}
                        onSwiped={onSwiped}
                        onSwipedLeft={onSwipeLeft}
                        onSwipedRight={onSwipeRight}
                        backgroundColor="transparent"
                        stackSize={(isDesktop || isTablet) ? 2 : 1}
                        stackSeparation={(isDesktop || isTablet) ? 12 : 0}
                        stackScale={(isDesktop || isTablet) ? 4 : 0}
                        animateCardOpacity
                        overlayLabels={overlayLabels}
                        cardVerticalMargin={(isDesktop || isTablet) ? 0 : 8}
                        cardHorizontalMargin={(isDesktop || isTablet) ? 0 : 16}
                        marginTop={0}
                        containerStyle={
                            (isDesktop || isTablet)
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
                        cardStyle={(isDesktop || isTablet) ? { left: 0, top: 0, width: '100%', height: '100%' } : {}}
                        verticalSwipe={false}
                        disableTopSwipe
                        disableBottomSwipe
                        horizontalThreshold={100}
                        swipeAnimationDuration={180}
                        animateOverlayLabelsOpacity
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardAreaMobile: {
        width: '100%',
        flex: 1,
    },
    cardAreaDesktop: {
        position: 'relative',
        flex: 1,
        maxWidth: 520,
        maxHeight: 680,
        width: '100%',
        height: '100%',
        alignSelf: 'center',
        overflow: 'visible',
    },
    cardLayerPink: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: 0,
        top: 0,
        borderRadius: 24,
        borderWidth: 3,
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
        transform: [{ rotate: '3deg' }],
        zIndex: -1,
        pointerEvents: 'none',
    },
    cardPlaceholder: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 2,
    },
    cardPlaceholderDesktop: {
        borderRadius: 24,
        borderWidth: 3,
    },
    centeredState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    loaderCard: {
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        gap: 16,
        borderWidth: 2,
    },
    loaderText: {
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    loaderSubtext: {
        fontSize: 13,
        fontWeight: '300',
    },
    emptyIcon: {
        width: 96,
        height: 96,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 2,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: -1,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        fontWeight: '300',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 50,
        borderWidth: 2,
    },
    refreshText: {
        fontWeight: '700',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
