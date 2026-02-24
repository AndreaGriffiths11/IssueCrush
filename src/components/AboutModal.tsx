import React from 'react';
import {
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ExternalLink, X } from 'lucide-react-native';
import { webCursor, isWeb } from '../utils';
import pkg from '../../package.json';

interface AboutModalProps {
    visible: boolean;
    onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.sheet, styles.sheetMaxHeight]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>About IssueCrush</Text>
                        <TouchableOpacity
                            style={[styles.closeBtn, webCursor('pointer')]}
                            onPress={onClose}
                            accessibilityLabel="Close About"
                        >
                            <X size={20} color="#000000" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
                        {/* App info */}
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>VERSION</Text>
                            <Text style={styles.value}>{pkg.version}</Text>
                        </View>
                        <View style={styles.divider} />

                        <Text style={styles.description}>
                            IssueCrush is a Tinder-style GitHub issue triage app.
                            Swipe through open issues on your repositories — swipe{' '}
                            <Text style={styles.closeText}>left to close</Text> or{' '}
                            <Text style={styles.keepText}>right to keep</Text>.
                        </Text>

                        {/* Tips */}
                        <Text style={styles.sectionTitle}>TIPS</Text>
                        {TIPS.map((tip, i) => (
                            <View key={i} style={styles.tipRow}>
                                <View style={[styles.tipBadge, { backgroundColor: tip.color }]}>
                                    <Text style={[styles.tipBadgeText, { color: tip.textColor }]}>{tip.tag}</Text>
                                </View>
                                <Text style={styles.tipText}>{tip.text}</Text>
                            </View>
                        ))}

                        {/* Links */}
                        <Text style={styles.sectionTitle}>LINKS</Text>
                        {LINKS.map((link, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.linkRow, webCursor('pointer')]}
                                onPress={() => Linking.openURL(link.url)}
                            >
                                <Text style={styles.linkText}>{link.label}</Text>
                                <ExternalLink size={14} color="#666666" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const TIPS = [
    { tag: 'SWIPE LEFT', color: '#ffe6f2', textColor: '#d6006e', text: 'Close the issue on GitHub.' },
    { tag: 'SWIPE RIGHT', color: '#e6ffe6', textColor: '#007A33', text: 'Keep the issue open and move on.' },
    { tag: 'AI ✦', color: '#e6f0ff', textColor: '#0055cc', text: 'Tap the sparkle button for an AI summary of the issue.' },
    { tag: 'UNDO', color: '#fff3e6', textColor: '#b35900', text: 'Use the undo button to reopen a closed issue.' },
    { tag: 'FILTER', color: '#f5f5f5', textColor: '#333333', text: 'Filter issues by repository or label.' },
];

const LINKS = [
    { label: 'GitHub Repository', url: 'https://github.com/AndreaGriffiths11/IssueCrush' },
    { label: 'Contributing Guide', url: 'https://github.com/AndreaGriffiths11/IssueCrush/blob/main/CONTRIBUTING.md' },
    { label: 'Report an Issue', url: 'https://github.com/AndreaGriffiths11/IssueCrush/issues/new' },
];

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    sheet: {
        width: '100%',
        maxWidth: isWeb ? 480 : undefined,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
    },
    sheetMaxHeight: {
        maxHeight: isWeb ? ('80%' as const) : ('90%' as const),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.5,
        textTransform: 'uppercase',
    },
    closeBtn: {
        padding: 4,
    },
    body: {
        padding: 24,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: '#999999',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000000',
    },
    divider: {
        height: 1,
        backgroundColor: '#eeeeee',
        marginVertical: 4,
    },
    description: {
        fontSize: 15,
        color: '#333333',
        lineHeight: 22,
    },
    closeText: {
        fontWeight: '700',
        color: '#d6006e',
    },
    keepText: {
        fontWeight: '700',
        color: '#007A33',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#999999',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginTop: 8,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    tipBadge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 50,
        flexShrink: 0,
    },
    tipBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    tipText: {
        fontSize: 14,
        color: '#444444',
        lineHeight: 20,
        flex: 1,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000000',
    },
});
