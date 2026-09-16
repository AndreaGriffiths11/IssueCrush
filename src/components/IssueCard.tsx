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

function UserRow({ issue, isDesktop, repoLabel }: { issue: GitHubIssue; isDesktop: boolean; repoLabel: string }) {
    const { theme } = useTheme();
    if (!issue.user) {
        return null;
    }
    const repoShortName = repoLabel.split('/').pop();
    return (
        <View style={styles.userRowBrutalist}>
            <Image
                source={{ uri: issue.user.avatar_url }}
                style={[styles.avatarBrutalist, !isDesktop && styles.avatarMobile, { backgroundColor: theme.backgroundTertiary }]}
                resizeMode="cover"
            />
            {!isDesktop ? (
                <Text style={[styles.userNameBrutalist, styles.userNameMobile, { color: theme.ink }]} numberOfLines={1}>
                    {issue.user.login.toUpperCase()} <Text style={styles.repoNameMobile}>· {repoShortName}</Text>
                </Text>
            ) : (
                <View style={styles.userMetaBrutalist}>
                    <Text style={[styles.userNameBrutalist, { color: theme.ink }]}>{issue.user.login.toUpperCase()}</Text>
                    <Text style={[styles.repoNameBrutalist, { color: theme.textSecondary }]}>{repoLabel}</Text>
                </View>
            )}
        </View>
    );
}

function LabelRow({ issue, isDesktop }: { issue: GitHubIssue; isDesktop: boolean }) {
    if (!issue.labels?.length) {
        return null;
    }
    const visibleLabelCount = isDesktop ? 4 : 2;
    const visibleLabels = issue.labels.slice(0, visibleLabelCount);
    return (
        <View style={styles.labelsBrutalist}>
            {visibleLabels.map((label) => (
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
            ))}
        </View>
    );
}

function AiBlock({
    issue,
    isDesktop,
    isCurrent,
    copilotAvailable,
    loadingAiSummary,
    onGetAiSummary,
}: {
    issue: GitHubIssue;
    isDesktop: boolean;
    isCurrent: boolean;
    copilotAvailable: boolean | null;
    loadingAiSummary: boolean;
    onGetAiSummary: () => void;
}) {
    const { theme } = useTheme();
    const canRequestSummary = isCurrent && !loadingAiSummary;
    const showSummary = Boolean(issue.aiSummary);
    const showUnavailable = !showSummary && copilotAvailable === false;
    const showButton = !showSummary && !showUnavailable;
    const showSpinner = loadingAiSummary && isCurrent;

    return (
        <View
            style={[
                styles.aiBlockBrutalist,
                !isDesktop && styles.aiBlockMobile,
                { backgroundColor: theme.aiBackground },
            ]}
        >
            <View style={[styles.aiStickerBadge, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
                <Text style={[styles.aiStickerText, { color: theme.ink }]}>AI INSIGHT</Text>
            </View>
            {showSummary && (
                <ScrollView
                    style={styles.aiSummaryScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                >
                    <Text style={[styles.aiTextBrutalist, { color: theme.aiText }]}>
                        <Text style={[styles.aiTextHighlight, { color: theme.aiAccent }]}>
                            {'// SUMMARY\n'}
                        </Text>
                        {issue.aiSummary}
                    </Text>
                </ScrollView>
            )}
            {showUnavailable && (
                <View style={styles.aiUnavailableContainer}>
                    <Text style={[styles.aiUnavailableText, { color: theme.textMuted }]}>
                        AI summaries require running locally with GitHub Copilot.
                    </Text>
                    <Text style={[styles.aiUnavailableSubtext, { color: theme.textMuted }]}>
                        Clone the repo and run with: npm run dev
                    </Text>
                </View>
            )}
            {showButton && (
                <TouchableOpacity
                    style={[
                        styles.aiButtonBrutalist,
                        webCursor(loadingAiSummary ? 'default' : 'pointer'),
                    ]}
                    onPress={canRequestSummary ? onGetAiSummary : undefined}
                    disabled={!canRequestSummary}
                >
                    {showSpinner ? (
                        <ActivityIndicator color={theme.aiAccent} size="small" />
                    ) : (
                        <>
                            <Sparkles size={18} color={theme.aiAccent} />
                            <Text style={[styles.aiButtonTextBrutalist, { color: theme.aiAccent }]}>GET AI SUMMARY</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
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

    const body = (
        <>
            <UserRow issue={issue} isDesktop={isDesktop} repoLabel={repoLabel} />
            <LabelRow issue={issue} isDesktop={isDesktop} />
            <AiBlock
                issue={issue}
                isDesktop={isDesktop}
                isCurrent={isCurrent}
                copilotAvailable={copilotAvailable}
                loadingAiSummary={loadingAiSummary}
                onGetAiSummary={onGetAiSummary}
            />
        </>
    );

    return (
        <View style={[styles.cardBrutalist, isDesktop && styles.cardBrutalistDesktop, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
            {/* Card Header */}
            <View style={[styles.cardHeaderBrutalist, !isDesktop && styles.cardHeaderMobile, { borderBottomColor: theme.cardBorder }]}>
                <View style={[styles.issueIdBadge, isDesktop && styles.issueIdBadgeDesktop, { borderColor: theme.cardBorder }]}>
                    <Text style={[styles.issueIdText, { color: theme.textSecondary }]}>#{issue.number}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => openIssueLink(issue.html_url)}
                    style={[styles.headlineWrap, webCursor('pointer')]}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[styles.headlineBrutalist, !isDesktop && styles.headlineMobile, { color: theme.ink }]}
                        numberOfLines={3}
                    >
                        {issue.title}
                    </Text>
                    <ExternalLink size={20} color={theme.textMuted} style={styles.headlineIcon} />
                </TouchableOpacity>
            </View>

            {/* Card Body */}
            {isDesktop ? (
                <View style={[styles.cardBodyBrutalist, styles.cardBodyContent]} pointerEvents="box-none">
                    {body}
                </View>
            ) : (
                <ScrollView
                    style={[styles.cardBodyBrutalist, { backgroundColor: theme.cardBackground }]}
                    contentContainerStyle={[styles.cardBodyContent, styles.cardBodyMobile]}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                >
                    {body}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardBrutalist: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 2,
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
        position: 'relative',
    },
    issueIdBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
        borderWidth: 1,
        borderRadius: 50,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    issueIdBadgeDesktop: {
        top: 22,
        right: 22,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    issueIdText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headlineWrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 20,
        paddingRight: 64,
    },
    headlineBrutalist: {
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        flex: 1,
    },
    headlineMobile: {
        fontSize: 17,
        lineHeight: 23,
    },
    headlineIcon: {
        marginTop: 4,
        opacity: 0.7,
        flexShrink: 0,
    },
    cardBodyBrutalist: {
        flex: 1,
    },
    cardBodyContent: {
        padding: 20,
        gap: 14,
        paddingBottom: 20,
    },
    cardHeaderMobile: {
        padding: 14,
        paddingRight: 70,
    },
    cardBodyMobile: {
        padding: 14,
        gap: 10,
    },
    aiBlockMobile: {
        padding: 18,
    },
    userRowBrutalist: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarBrutalist: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarMobile: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    userMetaBrutalist: {
        flexDirection: 'column',
        gap: 2,
    },
    userNameBrutalist: {
        fontWeight: '900',
        fontSize: 15,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    userNameMobile: {
        fontSize: 13,
    },
    repoNameBrutalist: {
        fontWeight: '400',
        fontSize: 13,
    },
    repoNameMobile: {
        fontWeight: '400',
        fontSize: 12,
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
        padding: 22,
        borderRadius: 16,
        position: 'relative',
        justifyContent: 'center',
        marginTop: 4,
    },
    aiSummaryScroll: {
        maxHeight: 140,
    },
    aiStickerBadge: {
        position: 'absolute',
        top: -12,
        right: 20,
        borderWidth: 1,
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
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    aiTextBrutalist: {
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        lineHeight: 22,
        fontSize: 14,
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
        fontWeight: '700',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    aiUnavailableContainer: {
        paddingVertical: 8,
        gap: 4,
    },
    aiUnavailableText: {
        fontSize: 13,
        fontWeight: '500',
    },
    aiUnavailableSubtext: {
        fontSize: 12,
        fontWeight: '400',
    },
});
