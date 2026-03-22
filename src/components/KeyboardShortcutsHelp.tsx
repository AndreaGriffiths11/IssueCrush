import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { webCursor } from '../utils';

interface ShortcutRow {
  keys: string;
  action: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: '← / H', action: 'Close issue (swipe left)' },
  { keys: '→ / L', action: 'Keep issue (swipe right)' },
  { keys: 'Z / Ctrl+Z', action: 'Undo last action' },
  { keys: 'O', action: 'Open issue in GitHub' },
  { keys: '?', action: 'Toggle this help' },
  { keys: 'Esc', action: 'Close this help' },
];

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={[styles.panel, { backgroundColor: theme.cardBackground, borderColor: theme.ink }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.ink }]}>KEYBOARD SHORTCUTS</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, webCursor('pointer')]}>
            <X size={18} color={theme.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.table}>
          {SHORTCUTS.map((row) => (
            <View key={row.keys} style={[styles.row, { borderBottomColor: theme.border }]}>
              <View style={[styles.keyBadge, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                <Text style={[styles.keyText, { color: theme.text }]}>{row.keys}</Text>
              </View>
              <Text style={[styles.actionText, { color: theme.textSecondary }]}>{row.action}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.hint, { color: theme.textMuted }]}>Shortcuts are active when not typing in a filter field.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    width: 380,
    borderWidth: 2,
    padding: 24,
    gap: 16,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  closeBtn: {
    padding: 4,
  },
  table: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  keyBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 80,
    alignItems: 'center',
  },
  keyText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  actionText: {
    fontSize: 13,
    flex: 1,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
});
