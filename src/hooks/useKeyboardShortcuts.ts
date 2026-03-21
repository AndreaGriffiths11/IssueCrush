import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { GitHubIssue } from '../api/github';

interface UseKeyboardShortcutsOptions {
  swiperRef: React.RefObject<Swiper<GitHubIssue> | null>;
  handleUndo: () => void;
  currentIssue: GitHubIssue | null;
  hasIssues: boolean;
}

export function useKeyboardShortcuts({
  swiperRef,
  handleUndo,
  currentIssue,
  hasIssues,
}: UseKeyboardShortcutsOptions) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip shortcuts when the user is typing in an input field
      const activeElement = document.activeElement;
      const activeTag = (activeElement?.tagName ?? '').toLowerCase();
      const isTyping = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (isTyping) return;

      const pressedKey = event.key;
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;
      const isUndoShortcut = isCtrlOrMeta && pressedKey.toLowerCase() === 'z';

      if (pressedKey === '?') {
        setShowHelp((prev) => !prev);
        return;
      }

      if (pressedKey === 'Escape') {
        setShowHelp(false);
        return;
      }

      if (!hasIssues) return;

      if (pressedKey === 'ArrowLeft' || pressedKey.toLowerCase() === 'h') {
        event.preventDefault();
        swiperRef.current?.swipeLeft();
      } else if (pressedKey === 'ArrowRight' || pressedKey.toLowerCase() === 'l') {
        event.preventDefault();
        swiperRef.current?.swipeRight();
      } else if (pressedKey.toLowerCase() === 'z' || isUndoShortcut) {
        event.preventDefault();
        handleUndo();
      } else if (pressedKey.toLowerCase() === 'o' && currentIssue?.html_url) {
        Linking.openURL(currentIssue.html_url);
      }
    },
    [swiperRef, handleUndo, currentIssue, hasIssues],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
