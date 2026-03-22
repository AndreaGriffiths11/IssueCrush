import React from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, Sparkles } from 'lucide-react-native';
import { GitHubIssue } from '../api/github';
import { useTheme } from '../theme';
import { getLabelColor, webCursor } from '../utils';

interface IssueCardProps {
    issue: GitHubIssue;
    isDesktop: boolean;
    /** Whether this card is the active/current card in the swiper */
    isCurrent: boolean;
    copilotAvailable: boolean | null;
    loadingAiSummary: boolean;
    /** Computed "owner/repo" label for the issue */
    repoLabel: string;
    onGetAiSummary: () => void;
}

async function openIssueLink(url: string) {
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
    } catch {
        await Linking.openURL(url);
    }
}

export function IssueCard({
    issue,
    isDesktop,
    isCurrent,
    copilotAvailable,
    loadingAiSummary,
    repoLabel,
    onGetAiSummary,
}: IssueCardProps) {
    const { theme } = useTheme();

    return (
        <View style={[styles.cardBrutalist, isDesktop && styles.cardBrutalistDesktop, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
            {/* Card Header */}
            <View style={[styles.cardHeaderBrutalist, !isDesktop && styles.cardHeaderMobile, { backgroundColor: theme.cardBackground, borderBottomColor: theme.cardBorder }]}>
                <View style={[styles.issueIdBadge, isDesktop && styles.issueIdBadgeDesktop, { borderColor: theme.cardBorder }]}>
                    <Text style={[styles.issueIdText, { color: theme.ink }]}>#{issue.number}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => openIssueLink(issue.html_url)}
                    style={[styles.headlineWrap, webCursor('pointer')]}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.headlineBrutalist, !isDesktop && styles.headlineMobile]} numberOfLines={3}>
                        {issue.title.split(' ').map((word, i) => {
                            const isHeavyWord = i % 3 === 0;
                            const wordStyle = isHeavyWord ? styles.headlineHeavy : styles.headlineLight;
                            return (
                                <Text key={i} style={[wordStyle, { color: theme.ink }]}>
                                    {word}{' '}
                                </Text>
                            );
                        })}
                    </Text>
                    <ExternalLink size={20} color={theme.ink} style={{ marginTop: 4, opacity: 0.6 }} />
                </TouchableOpacity>
            </View>

            {/* Card Body */}
            {(() => {
                const bodyContent = (
                    <>
                        {/* User row */}
                        {issue.user && (
                            <View style={styles.userRowBrutalist}>
                                <Image
                                    source={{ uri: issue.user.avatar_url }}
                                    style={[styles.avatarBrutalist, !isDesktop && styles.avatarMobile, { backgroundColor: theme.ink }]}
                                    resizeMode="cover"
                                />
                                {!isDesktop ? (
                                    <Text style={[styles.userNameBrutalist, styles.userNameMobile, { color: theme.ink }]} numberOfLines={1}>
                                        {issue.user.login.toUpperCase()} <Text style={styles.repoNameMobile}>· {repoLabel.split('/').pop()}</Text>
                                    </Text>
                                ) : (
                                    <View style={styles.userMetaBrutalist}>
                                        <Text style={[styles.userNameBrutalist, { color: theme.ink }]}>{issue.user.login.toUpperCase()}</Text>
                                        <Text style={styles.repoNameBrutalist}>{repoLabel}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Labels */}
                        <View style={styles.labelsBrutalist}>
                            {issue.labels?.length
                                ? issue.labels.slice(0, isDesktop ? 4 : 2).map((label) => (
                                    <View
                                        key={label.id}
                                        style={[
                                            styles.labelBrutalist,
                                            { backgroundColor: `#${label.color || '000000'}` },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.labelTextBrutalist,
                                                { color: getLabelColor(label.color || '000000') },
                                            ]}
                                        >
                                            {label.name.toUpperCase()}
                                        </Text>
                                    </View>
                                ))
                                : null}
                        </View>

                        {/* AI Block */}
                        <View
                            style={[
                                styles.aiBlockBrutalist,
                                !isDesktop && styles.aiBlockMobile,
                                { backgroundColor: '#1a1a2e' },
                            ]}
                        >
                            <View style={[styles.aiStickerBadge, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
                                <Text style={[styles.aiStickerText, { color: theme.ink }]}>AI INSIGHT</Text>
                            </View>
                            {issue.aiSummary ? (
                                <ScrollView
                                    style={styles.aiSummaryScroll}
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator
                                >
                                    <Text style={styles.aiTextBrutalist}>
                                        <Text style={[styles.aiTextHighlight, { color: theme.primary }]}>
                                            {'// SUMMARY\n'}
                                        </Text>
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
                                    style={[
                                        styles.aiButtonBrutalist,
                                        webCursor(loadingAiSummary ? 'default' : 'pointer'),
                                    ]}
                                    onPress={isCurrent && !loadingAiSummary ? onGetAiSummary : undefined}
                                    disabled={!isCurrent || loadingAiSummary}
                                >
                                    {loadingAiSummary && isCurrent ? (
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
                    </>
                );

                return !isDesktop ? (
                    <ScrollView style={[styles.cardBodyBrutalist, { backgroundColor: theme.cardBackground }]} contentContainerStyle={[styles.cardBodyContent, styles.cardBodyMobile]} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                        {bodyContent}
                    </ScrollView>
                ) : (
                    <View style={[styles.cardBodyBrutalist, styles.cardBodyContent, { backgroundColor: theme.cardBackground }]} pointerEvents="box-none">
                        {bodyContent}
                    </View>
                );
            })()}
        </View>
    );
}

const styles = StyleSheet.create({
    cardBrutalist: {
        flex: 1,
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
        padding: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
        position: 'relative',
    },
    issueIdBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        borderWidth: 1,
        borderColor: '#000000',
        borderRadius: 50,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    issueIdBadgeDesktop: {
        top: 24,
        right: 24,
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
        gap: 8,
        marginTop: 16,
    },
    headlineBrutalist: {
        fontSize: 24,
        lineHeight: 28,
        flex: 1,
    },
    headlineMobile: {
        fontSize: 18,
        lineHeight: 22,
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
        flex: 1,
    },
    cardBodyContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 16,
    },
    cardHeaderMobile: {
        padding: 12,
        paddingRight: 70,
    },
    cardBodyMobile: {
        padding: 12,
        gap: 8,
    },
    aiBlockMobile: {
        padding: 16,
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
    },
    avatarMobile: {
        width: 32,
        height: 32,
        borderRadius: 16,
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
    userNameMobile: {
        fontSize: 13,
    },
    repoNameBrutalist: {
        fontWeight: '300',
        fontSize: 13,
        color: '#555555',
    },
    repoNameMobile: {
        fontWeight: '300',
        fontSize: 12,
        color: '#555555',
        textTransform: 'none',
    },
    labelsBrutalist: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
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
});
