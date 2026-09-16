import React from 'react';
import {
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Check, Heart, Sparkles, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { webCursor, isWeb } from '../utils';

const CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';

interface AuthScreenProps {
    onLogin: () => void;
    authError: string;
    isDesktop: boolean;
    isTablet?: boolean;
    screenWidth?: number;
}

export function AuthScreen({ onLogin, authError, isDesktop, isTablet = false, screenWidth = 400 }: AuthScreenProps) {
    const { theme } = useTheme();

    // Responsive brand font size
    const isNarrowScreen = screenWidth < 400;
    const brandFontSize = isNarrowScreen ? 36 : isWeb ? 56 : 40;
    const isMobile = !isDesktop && !isTablet;

    const gesturePills = [
        {
            key: 'close',
            label: 'SWIPE LEFT TO CLOSE',
            backgroundColor: theme.dangerLight,
            color: theme.danger,
            icon: <X size={14} color={theme.danger} strokeWidth={3} />,
        },
        {
            key: 'keep',
            label: 'SWIPE RIGHT TO KEEP',
            backgroundColor: theme.successLight,
            color: theme.success,
            icon: <Check size={14} color={theme.success} strokeWidth={3} />,
        },
        {
            key: 'ai',
            label: 'AI SUMMARIES',
            backgroundColor: theme.primaryLight,
            color: theme.primary,
            icon: <Sparkles size={14} color={theme.primary} strokeWidth={3} />,
        },
    ];

    return (
        <ScrollView
            style={[styles.authContainerScroll, { backgroundColor: theme.background }]}
            contentContainerStyle={[styles.authContainer, isTablet && styles.authContainerTablet]}
            showsVerticalScrollIndicator={false}
        >
            {/* Hero */}
            <View style={styles.authHero}>
                <View style={[styles.authLogoWrap, { borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }]}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.authLogo}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.authCardBrand}>
                    <Text style={[styles.authBrandIssue, { fontSize: brandFontSize, color: theme.primary }]}>ISSUE</Text>
                    <Text style={[styles.authBrandCrush, { fontSize: brandFontSize, color: theme.ink }]}>CRUSH</Text>
                </View>
                <Text style={[styles.authTagline, { color: theme.textSecondary }]}>
                    Triage your GitHub issues at the speed of swipe.
                </Text>
            </View>

            {/* Login card */}
            <View style={[
                styles.authCard,
                isMobile && styles.authCardMobile,
                isTablet && styles.authCardTablet,
                { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder },
            ]}>
                <TouchableOpacity
                    style={[styles.githubButton, { backgroundColor: theme.ink }, webCursor('pointer')]}
                    onPress={onLogin}
                    activeOpacity={0.85}
                >
                    <Image
                        source={require('../../assets/github-invertocat.png')}
                        style={styles.githubBtnLogo}
                        resizeMode="contain"
                    />
                    <Text style={[styles.githubButtonText, { color: theme.cardBackground }]}>CONTINUE WITH GITHUB</Text>
                </TouchableOpacity>

                <Text style={[styles.authTrust, { color: theme.textMuted }]}>
                    No repo access until you grant permissions
                </Text>

                {/* Gesture hints */}
                <View style={styles.authGestureGuide}>
                    {gesturePills.map((pill) => (
                        <View key={pill.key} style={[styles.gesturePill, { backgroundColor: pill.backgroundColor }]}>
                            {pill.icon}
                            <Text style={[styles.gestureLabel, { color: pill.color }]}>{pill.label}</Text>
                        </View>
                    ))}
                </View>

                {!CLIENT_ID ? (
                    <View style={[styles.errorBox, { backgroundColor: theme.dangerLight, borderColor: theme.dangerBorder }]}>
                        <Text style={[styles.error, { color: theme.danger }]}>
                            Add EXPO_PUBLIC_GITHUB_CLIENT_ID to your env (see .env.example).
                        </Text>
                    </View>
                ) : null}

                {authError ? (
                    <View style={[styles.errorBox, { backgroundColor: theme.dangerLight, borderColor: theme.dangerBorder }]}>
                        <Text style={[styles.error, { color: theme.danger }]}>{authError}</Text>
                    </View>
                ) : null}
            </View>

            {/* Contribute link */}
            <TouchableOpacity
                style={[styles.contributeLink, webCursor('pointer')]}
                onPress={() =>
                    Linking.openURL(
                        'https://github.com/AndreaGriffiths11/IssueCrush/blob/main/CONTRIBUTING.md'
                    )
                }
            >
                <Heart size={14} color={theme.primary} />
                <Text style={[styles.contributeLinkText, { color: theme.textMuted }]}>Want to contribute?</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    authContainerScroll: {
        flex: 1,
    },
    authContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 48,
        minHeight: '100%',
        gap: 28,
    },
    authContainerTablet: {
        justifyContent: 'center',
        minHeight: '100%',
    },
    authHero: {
        alignItems: 'center',
        gap: 16,
        width: '100%',
        maxWidth: 480,
    },
    authLogoWrap: {
        width: isWeb ? 112 : 96,
        height: isWeb ? 112 : 96,
        borderRadius: isWeb ? 28 : 24,
        borderWidth: 3,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    authLogo: {
        width: isWeb ? 112 : 96,
        height: isWeb ? 112 : 96,
    },
    authCardBrand: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 10,
        justifyContent: 'center',
        flexWrap: 'nowrap',
    },
    authBrandIssue: {
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: -2,
    },
    authBrandCrush: {
        fontWeight: '300',
        textTransform: 'uppercase',
        letterSpacing: -1,
    },
    authTagline: {
        fontSize: 16,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 24,
    },
    authCard: {
        width: '100%',
        maxWidth: isWeb ? 480 : '100%',
        borderRadius: 24,
        borderWidth: 3,
        padding: isWeb ? 36 : 28,
        gap: 18,
        alignItems: 'center',
    },
    authCardMobile: {
        padding: 24,
        borderRadius: 20,
        maxWidth: '100%',
    },
    authCardTablet: {
        maxWidth: 480,
        justifyContent: 'center',
    },
    authTrust: {
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '400',
    },
    githubButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingVertical: isWeb ? 22 : 18,
        paddingHorizontal: 32,
        borderRadius: 50,
        width: '100%',
    },
    githubBtnLogo: {
        width: isWeb ? 28 : 26,
        height: isWeb ? 28 : 26,
        borderRadius: 6,
    },
    githubButtonText: {
        fontWeight: '900',
        fontSize: isWeb ? 18 : 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    authGestureGuide: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isWeb ? 10 : 8,
        flexWrap: 'wrap',
        marginTop: 4,
    },
    gesturePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 50,
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
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    contributeLinkText: {
        fontSize: 13,
        fontWeight: '500',
    },
    errorBox: {
        width: '100%',
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
    },
    error: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
});
