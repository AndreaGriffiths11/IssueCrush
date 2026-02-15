import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Filter, RefreshCw, X, Check, RotateCcw, LogOut, Moon, Sun, Tag } from 'lucide-react-native';
import { Theme, ThemeMode } from '../theme';

const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};

interface SidebarProps {
  theme: Theme;
  themeMode: ThemeMode;
  repoFilter: string;
  setRepoFilter: (filter: string) => void;
  labelFilter: string;
  setLabelFilter: (filter: string) => void;
  loadingIssues: boolean;
  onRefresh: () => void;
  issuesCount: number;
  currentIndex: number;
  progressAnimatedStyle: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  lastClosed: any;
  onUndo: () => void;
  undoBusy: boolean;
  onCycleTheme: () => void;
  onSignOut: () => void;
}

export function Sidebar({
  theme,
  themeMode,
  repoFilter,
  setRepoFilter,
  labelFilter,
  setLabelFilter,
  loadingIssues,
  onRefresh,
  issuesCount,
  currentIndex,
  progressAnimatedStyle,
  onSwipeLeft,
  onSwipeRight,
  lastClosed,
  onUndo,
  undoBusy,
  onCycleTheme,
  onSignOut,
}: SidebarProps) {
  return (
    <View style={[styles.webSidebar, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.sidebarContent}>
        <View style={styles.sidebarBrand}>
          <Text style={[styles.brandHeavy, { color: theme.primary }]}>ISSUE</Text>
          <Text style={[styles.brandLight, { color: theme.primary }]}>CRUSH</Text>
        </View>

        <View style={styles.sidebarSection}>
          <Text style={[styles.sidebarLabel, { color: theme.textMuted }]}>FILTER</Text>
          <View style={[styles.sidebarInputWrap, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Filter size={16} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="owner/repo"
              placeholderTextColor={theme.textMuted}
              value={repoFilter}
              onChangeText={setRepoFilter}
              style={[styles.sidebarInput, { color: theme.text }, webCursor('text')]}
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.sidebarInputWrap, { backgroundColor: theme.inputBackground, borderColor: theme.border, marginTop: 8 }]}>
            <Tag size={16} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="bug, feature, help wanted"
              placeholderTextColor={theme.textMuted}
              value={labelFilter}
              onChangeText={setLabelFilter}
              style={[styles.sidebarInput, { color: theme.text }, webCursor('text')]}
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity
            style={[styles.sidebarButtonBrutalist, loadingIssues && styles.refreshButtonDisabled, webCursor('pointer')]}
            onPress={onRefresh}
            disabled={loadingIssues}
          >
            <RefreshCw size={16} color="#000000" />
            <Text style={styles.sidebarButtonTextBrutalist}>REFRESH</Text>
          </TouchableOpacity>
        </View>

        {issuesCount > 0 && (
          <View style={styles.sidebarSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabelLight, { color: theme.textSecondary }]}>Triaged</Text>
              <Text style={[styles.progressLabelHeavy, { color: theme.text }]}>
                {Math.round((Math.min(currentIndex + 1, issuesCount) / issuesCount) * 100)}%
              </Text>
            </View>
            <View style={[styles.progressBarBrutalist, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
              <Animated.View
                style={[
                  styles.progressFillBrutalist,
                  { backgroundColor: theme.danger },
                  progressAnimatedStyle
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.sidebarSection}>
          <Text style={[styles.sidebarLabel, { color: theme.textMuted }]}>ACTIONS</Text>
          <View style={styles.sidebarActions}>
            <TouchableOpacity
              style={[styles.actionBtnBrutalist, styles.actionBtnClose, { backgroundColor: theme.danger }, webCursor('pointer')]}
              onPress={onSwipeLeft}
            >
              <X size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>CLOSE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnBrutalist, styles.actionBtnKeep, { backgroundColor: theme.success }, webCursor('pointer')]}
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

      <View style={[styles.sidebarFooter, { borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }, webCursor('pointer')]}
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
        <TouchableOpacity style={[styles.signOutBrutalist, webCursor('pointer')]} onPress={onSignOut}>
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
    gap: 12,
  },
  sidebarLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sidebarInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  inputIcon: {
    opacity: 0.6,
  },
  sidebarInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
    outlineStyle: 'none' as any,
  },
  sidebarButtonBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DFFF00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#000000',
    marginTop: 4,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  sidebarButtonTextBrutalist: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressLabelLight: {
    fontSize: 13,
    fontWeight: '400',
  },
  progressLabelHeavy: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  progressBarBrutalist: {
    height: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  progressFillBrutalist: {
    height: '100%',
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
    gap: 6,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000000',
  },
  actionBtnClose: {},
  actionBtnKeep: {},
  actionBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  undoBtnBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  undoBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sidebarFooter: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 24,
    marginTop: 24,
  },
  themeToggle: {
    width: 48,
    height: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBrutalist: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DFFF00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#000000',
  },
  signOutTextBrutalist: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
});
