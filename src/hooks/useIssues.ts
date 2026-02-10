import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Swiper from 'react-native-deck-swiper';
import { fetchIssues, GitHubIssue, updateIssueState, extractRepoPath } from '../api/github';
import { copilotService } from '../lib/copilotService';

export function useIssues(token: string | null) {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastClosed, setLastClosed] = useState<GitHubIssue | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [repoFilter, setRepoFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');

  const swiperRef = useRef<Swiper<GitHubIssue>>(null);
  const confettiRef = useRef<any>(null);

  const repoLabel = useCallback((issue: GitHubIssue) =>
    issue.repository?.full_name ?? extractRepoPath(issue.repository_url), []);

  const loadIssues = useCallback(async () => {
    if (!token) return;
    setLoadingIssues(true);
    try {
      const data = await fetchIssues(token, repoFilter.trim() || undefined, labelFilter.trim() || undefined);
      setIssues(data);
      setCurrentIndex(0);
      setFeedback(data.length ? `Loaded ${data.length} open issues` : 'No open issues found');
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoadingIssues(false);
    }
  }, [token, repoFilter, labelFilter]);

  const handleSwipeLeft = useCallback(async (cardIndex: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const issue = issues[cardIndex];
    if (!issue || !token) return;

    setFeedback(`Closed #${issue.number} · ${repoLabel(issue)}`);
    setLastClosed(issue);
    try {
      await updateIssueState(token, issue, 'closed');
    } catch (error) {
      setFeedback(`Close failed: ${(error as Error).message}`);
      setLastClosed(null);
    }
  }, [issues, token, repoLabel]);

  const handleSwipeRight = useCallback(async (cardIndex: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const issue = issues[cardIndex];
    if (!issue) return;
    setFeedback(`Kept open · #${issue.number}`);
  }, [issues]);

  const onSwiped = useCallback((idx: number) => {
    setCurrentIndex(idx + 1);
    setLoadingAiSummary(false);

    if (idx === issues.length - 1) {
      setTimeout(() => {
        confettiRef.current?.start();
      }, 300);
    }
  }, [issues.length]);

  const handleUndo = useCallback(async () => {
    if (!lastClosed || !token) return;
    setUndoBusy(true);
    try {
      swiperRef.current?.swipeBack();
      setCurrentIndex((prev) => Math.max(0, prev - 1));

      await updateIssueState(token, lastClosed, 'open');
      setFeedback(`Reopened #${lastClosed.number}`);
      setLastClosed(null);
    } catch (error) {
      setFeedback(`Undo failed: ${(error as Error).message}`);
    } finally {
      setUndoBusy(false);
    }
  }, [lastClosed, token]);

  const handleGetAiSummary = useCallback(async () => {
    const issueIndex = currentIndex;
    const issue = issues[issueIndex];
    if (!issue || issue.aiSummary) return;

    setLoadingAiSummary(true);
    try {
      const result = await copilotService.summarizeIssue(issue);
      setIssues(prevIssues =>
        prevIssues.map((item, index) =>
          index === issueIndex ? { ...item, aiSummary: result.summary } : item
        )
      );
    } catch (error) {
      console.error('AI Summary error:', error);
    } finally {
      setLoadingAiSummary(false);
    }
  }, [currentIndex, issues]);

  // Auto-dismiss feedback
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(''), 2200);
    return () => clearTimeout(t);
  }, [feedback]);

  // Load issues when token changes
  useEffect(() => {
    if (!token) {
      setIssues([]);
      setCurrentIndex(0);
      return;
    }
    loadIssues();
  }, [token]);

  return {
    issues,
    loadingIssues,
    loadingAiSummary,
    currentIndex,
    lastClosed,
    undoBusy,
    feedback,
    setFeedback,
    repoFilter,
    setRepoFilter,
    labelFilter,
    setLabelFilter,
    swiperRef,
    confettiRef,
    repoLabel,
    loadIssues,
    handleSwipeLeft,
    handleSwipeRight,
    onSwiped,
    handleUndo,
    handleGetAiSummary,
  };
}
