import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Check, Filter, LogOut, Moon, RefreshCw, RotateCcw, Sun, Tag, X } from 'lucide-react-native';
import { GitHubIssue } from '../api/github';
import { useTheme } from '../theme';
import { ThemeMode } from '../theme/themes';
import { webCursor } from '../utils';

interface SidebarProps {
    repoFilter: string;
    labelFilter: string;
    issues: GitHubIssue[];
    currentIndex: number;
    lastClosed: GitHubIssue | null;
    undoBusy: boolean;
    loadingIssues: boolean;
    progressAnimatedStyle: any;
    themeMode: ThemeMode;
    onChangeRepoFilter: (text: string) => void;
    onChangeLabelFilter: (text: string) => void;
    onRefresh: () => void;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    onUndo: () => void;
    onSignOut: () => void;
    onCycleTheme: () => void;
}

export function Sidebar({
    repoFilter,
    labelFilter,
    issues,
    currentIndex,
    lastClosed,
    undoBusy,
    loadingIssues,
    progressAnimatedStyle,
    themeMode,
    onChangeRepoFilter,
    onChangeLabelFilter,
    onRefresh,
    onSwipeLeft,
    onSwipeRight,
    onUndo,
    onSignOut,
    onCycleTheme,
}: SidebarProps) {
    const { theme } = useTheme();

    const progressPercent = issues.length > 0
        ? Math.round((Math.min(currentIndex + 1, issues.length) / issues.length) * 100)
        : 0;

    return (
        <View
            style={[styles.webSidebar, { backgroundColor: theme.background, borderColor: theme.border }]}
        >
            <View style={styles.sidebarContent}>
                {/* Brand */}
                <View style={styles.sidebarBrand}>
                    <Text style={[styles.brandHeavy, { color: theme.primary }]}>ISSUE</Text>
                    <Text style={[styles.brandLight, { color: theme.primary }]}>CRUSH</Text>
                </View>

                {/* Filter section */}
                <View style={styles.sidebarSection}>
                    <Text style={[styles.sidebarLabel, { color: theme.textMuted }]}>FILTER</Text>
                    <View
                        style={[
                            styles.sidebarInputWrap,
                            { backgroundColor: theme.inputBackground, borderColor: theme.border },
                        ]}
                    >
                        <Filter size={16} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            placeholder="owner/repo"
                            placeholderTextColor={theme.textMuted}
                            value={repoFilter}
                            onChangeText={onChangeRepoFilter}
                            style={[styles.sidebarInput, { color: theme.text }, webCursor('text')]}
                            autoCapitalize="none"
                        />
                    </View>
                    <View
                        style={[
                            styles.sidebarInputWrap,
                            { backgroundColor: theme.inputBackground, borderColor: theme.border, marginTop: 8 },
                        ]}
                    >
                        <Tag size={16} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            placeholder="bug, feature, help wanted"
                            placeholderTextColor={theme.textMuted}
                            value={labelFilter}
                            onChangeText={onChangeLabelFilter}
                            style={[styles.sidebarInput, { color: theme.text }, webCursor('text')]}
                            autoCapitalize="none"
                        />
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.sidebarButtonBrutalist,
                            loadingIssues && styles.refreshButtonDisabled,
                            webCursor('pointer'),
                        ]}
                        onPress={onRefresh}
                        disabled={loadingIssues}
                    >
                        <RefreshCw size={16} color="#000000" />
                        <Text style={styles.sidebarButtonTextBrutalist}>REFRESH</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress section */}
                {issues.length > 0 && (
                    <View style={styles.sidebarSection}>
                        <View style={styles.progressLabelRow}>
                            <Text style={[styles.progressLabelLight, { color: theme.textSecondary }]}>Triaged</Text>
                            <Text style={[styles.progressLabelHeavy, { color: theme.text }]}>
                                {progressPercent}%
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.progressBarBrutalist,
                                { backgroundColor: theme.backgroundTertiary, borderColor: theme.border },
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.progressFillBrutalist,
                                    { backgroundColor: theme.danger },
                                    progressAnimatedStyle,
                                ]}
                            />
                        </View>
                    </View>
                )}

                {/* Actions section */}
                <View style={styles.sidebarSection}>
                    <Text style={[styles.sidebarLabel, { color: theme.textMuted }]}>ACTIONS</Text>
                    <View style={styles.sidebarActions}>
                        <TouchableOpacity
                            style={[
                                styles.actionBtnBrutalist,
                                styles.actionBtnClose,
                                { backgroundColor: theme.danger },
                                webCursor('pointer'),
                            ]}
                            onPress={onSwipeLeft}
                        >
                            <X size={18} color="#ffffff" />
                            <Text style={styles.actionBtnText}>CLOSE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.actionBtnBrutalist,
                                styles.actionBtnKeep,
                                { backgroundColor: theme.success },
                                webCursor('pointer'),
                            ]}
                            onPress={onSwipeRight}
                        >
                            <Check size={18} color="#ffffff" />
                            <Text style={styles.actionBtnText}>KEEP</Text>
                        </TouchableOpacity>
                    </View>
                    {lastClosed && (
                        <TouchableOpacity
                            style={[styles.undoBtnBrutalist, { borderColor: theme.primary }, webCursor('pointer')]}
                            onPress={onUndo}
                            disabled={undoBusy}
                        >
                            <RotateCcw size={16} color={theme.primary} />
                            <Text style={[styles.undoBtnText, { color: theme.primary }]}>UNDO</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Footer */}
            <View style={[styles.sidebarFooter, { borderColor: theme.border }]}>
                <TouchableOpacity
                    style={[
                        styles.themeToggle,
                        { backgroundColor: theme.backgroundTertiary, borderColor: theme.border },
                        webCursor('pointer'),
                    ]}
                    onPress={onCycleTheme}
                    activeOpacity={0.7}
                >
                    {themeMode === 'dark' ? (
                        <Moon size={18} color={theme.primary} />
                    ) : themeMode === 'light' ? (
                        <Sun size={18} color={theme.primary} />
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                            <Sun size={12} color={theme.primary} />
                            <Moon size={12} color={theme.primary} />
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.signOutBrutalist, webCursor('pointer')]}
                    onPress={onSignOut}
                >
                    <LogOut size={18} color="#000000" />
                    <Text style={styles.signOutTextBrutalist}>Sign out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    webSidebar: {
        width: 280,
        borderRightWidth: 1,
        paddingTop: 40,
        paddingBottom: 24,
        paddingHorizontal: 32,
        justifyContent: 'space-between',
        position: 'sticky' as any,
        top: 0,
        height: '100%',
    },
    sidebarContent: {
        flex: 1,
        gap: 40,
    },
    sidebarBrand: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 20,
    },
    brandHeavy: {
        fontSize: 28,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: -1,
    },
    brandLight: {
        fontSize: 28,
        fontWeight: '300',
        letterSpacing: 0,
    },
    sidebarSection: {
        gap: 16,
    },
    sidebarLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    sidebarInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 44,
    },
    inputIcon: {
        marginRight: 8,
    },
    sidebarInput: {
        flex: 1,
        height: 44,
        fontSize: 14,
    },
    sidebarButtonBrutalist: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        borderRadius: 50,
        backgroundColor: '#ffffff',
    },
    refreshButtonDisabled: {
        opacity: 0.5,
    },
    sidebarButtonTextBrutalist: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000000',
        textTransform: 'uppercase',
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    progressLabelLight: {
        fontSize: 14,
        fontWeight: '300',
    },
    progressLabelHeavy: {
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    progressBarBrutalist: {
        width: '100%',
        height: 24,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
    },
    progressFillBrutalist: {
        height: '100%',
        borderRadius: 12,
    },
    sidebarActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtnBrutalist: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 50,
    },
    actionBtnClose: {
        backgroundColor: '#FF1493',
    },
    actionBtnKeep: {
        backgroundColor: '#4B9F5D',
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
        textTransform: 'uppercase',
    },
    undoBtnBrutalist: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 50,
        borderWidth: 1,
        marginTop: 12,
    },
    undoBtnText: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    sidebarFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 20,
        marginTop: 12,
    },
    themeToggle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    signOutBrutalist: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 50,
        backgroundColor: '#ffffff',
    },
    signOutTextBrutalist: {
        color: '#000000',
        fontWeight: '700',
        fontSize: 13,
        textTransform: 'uppercase',
    },
});
