import React from 'react';
import {
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ExternalLink, Github, Heart, Info, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { webCursor } from '../utils';

interface AboutModalProps {
    visible: boolean;
    onClose: () => void;
}

const APP_VERSION = '1.0.0';
const REPO_URL = 'https://github.com/alacolombiadev/IssueCrush';

export function AboutModal({ visible, onClose }: AboutModalProps) {
    const { theme } = useTheme();

    const openLink = (url: string) => {
        Linking.openURL(url);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => {}}
                    style={[styles.modal, { backgroundColor: theme.background, borderColor: theme.border }]}
                >
                    {/* Header */}
                    <View style={[styles.header, { borderColor: theme.border }]}>
                        <View style={styles.headerTitle}>
                            <Text style={[styles.brandHeavy, { color: theme.primary }]}>ISSUE</Text>
                            <Text style={[styles.brandLight, { color: theme.primary }]}>CRUSH</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={webCursor('pointer')}>
                            <X size={20} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                        {/* Version */}
                        <Text style={[styles.version, { color: theme.textSecondary }]}>
                            v{APP_VERSION}
                        </Text>

                        {/* Description */}
                        <Text style={[styles.description, { color: theme.text }]}>
                            Tinder-style GitHub issue triage. Swipe right to keep, left to close. Fast, focused, fun.
                        </Text>

                        {/* How to use */}
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>HOW TO USE</Text>
                        <View style={styles.helpList}>
                            <HelpItem icon="👈" text="Swipe left or tap Close to close an issue" theme={theme} />
                            <HelpItem icon="👉" text="Swipe right or tap Keep to skip an issue" theme={theme} />
                            <HelpItem icon="↩️" text="Tap Undo to reopen the last closed issue" theme={theme} />
                            <HelpItem icon="🔍" text="Use the filter to narrow by repo or labels" theme={theme} />
                            <HelpItem icon="✨" text="Tap the sparkle icon for an AI summary" theme={theme} />
                        </View>

                        {/* Links */}
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>LINKS</Text>
                        <TouchableOpacity
                            style={[styles.linkRow, webCursor('pointer')]}
                            onPress={() => openLink(REPO_URL)}
                        >
                            <Github size={16} color={theme.text} />
                            <Text style={[styles.linkText, { color: theme.text }]}>Source on GitHub</Text>
                            <ExternalLink size={12} color={theme.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.linkRow, webCursor('pointer')]}
                            onPress={() => openLink(`${REPO_URL}/issues`)}
                        >
                            <Info size={16} color={theme.text} />
                            <Text style={[styles.linkText, { color: theme.text }]}>Report an Issue</Text>
                            <ExternalLink size={12} color={theme.textMuted} />
                        </TouchableOpacity>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <View style={styles.madeWith}>
                                <Text style={[styles.footerText, { color: theme.textMuted }]}>Made with</Text>
                                <Heart size={12} color={theme.danger} fill={theme.danger} />
                                <Text style={[styles.footerText, { color: theme.textMuted }]}>using React Native + Expo</Text>
                            </View>
                        </View>
                    </ScrollView>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

function HelpItem({ icon, text, theme }: { icon: string; text: string; theme: any }) {
    return (
        <View style={styles.helpItem}>
            <Text style={styles.helpIcon}>{icon}</Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    brandHeavy: {
        fontSize: 22,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: -1,
    },
    brandLight: {
        fontSize: 22,
        fontWeight: '300',
    },
    body: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    version: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginTop: 4,
    },
    helpList: {
        gap: 10,
        marginBottom: 20,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    helpIcon: {
        fontSize: 16,
        width: 24,
        textAlign: 'center',
    },
    helpText: {
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    footer: {
        marginTop: 24,
        paddingTop: 16,
        alignItems: 'center',
    },
    madeWith: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 12,
    },
});
