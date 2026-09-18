import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Swiper from 'react-native-deck-swiper';
import { fetchIssues, GitHubIssue, updateIssueState, extractRepoPath } from '../api/github';
import { copilotService } from '../lib/copilotService';
import { triageService } from '../lib/triageService';
import { sortIssuesByTriage, filterOutStale, type TriageSortKey } from '../lib/triageSort';

export function useIssues(token: string | null) {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [triagingAll, setTriagingAll] = useState(false);
  const [triageSort, setTriageSort] = useState<TriageSortKey>('none');
  const [hideStale, setHideStale] = useState(false);
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

  // Deck order and visibility are derived, never stored. Sorting or filtering
  // re-reads existing judgments and never re-runs inference.
  //
  // This is the array the swiper renders, so every card index below refers to
  // it, not to `issues`. Getting that wrong would close the wrong issue.
  const visibleIssues = useMemo(() => {
    const withoutStale = filterOutStale(issues, hideStale);
    return sortIssuesByTriage(withoutStale, triageSort);
  }, [issues, hideStale, triageSort]);

  const triagedCount = useMemo(
    () => issues.filter((issue) => issue.triage).length,
    [issues]
  );

  const loadIssues = useCallback(async () => {
    if (!token) return;
    setLoadingIssues(true);
    try {
      const trimmedRepo = repoFilter.trim() || undefined;
      const trimmedLabel = labelFilter.trim() || undefined;
      const data = await fetchIssues(token, trimmedRepo, trimmedLabel);
      const issueCount = data.length;
      const statusMessage = issueCount ? `Loaded ${issueCount} open issues` : 'No open issues found';
      setIssues(data);
      setCurrentIndex(0);
      setFeedback(statusMessage);
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoadingIssues(false);
    }
  }, [token, repoFilter, labelFilter]);

  const handleSwipeLeft = useCallback(async (cardIndex: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    const issue = visibleIssues[cardIndex];
    if (!issue || !token) return;

    setFeedback(`Closed #${issue.number} · ${repoLabel(issue)}`);
    setLastClosed(issue);
    try {
      await updateIssueState(token, issue, 'closed');
    } catch (error) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setFeedback(`Close failed: ${(error as Error).message}`);
      setLastClosed(null);
    }
  }, [visibleIssues, token, repoLabel]);

  const handleSwipeRight = useCallback(async (cardIndex: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const issue = visibleIssues[cardIndex];
    if (!issue) return;
    setFeedback(`Kept open · #${issue.number}`);
  }, [visibleIssues]);

  const onSwiped = useCallback((idx: number) => {
    const nextIndex = idx + 1;
    setCurrentIndex(nextIndex);
    setLoadingAiSummary(false);
    setLoadingTriage(false);

    const isLastCard = idx === visibleIssues.length - 1;
    if (isLastCard) {
      setTimeout(() => {
        confettiRef.current?.start();
      }, 300);
    }
  }, [visibleIssues.length]);

  const handleUndo = useCallback(async () => {
    if (!lastClosed || !token) return;
    setUndoBusy(true);
    try {
      swiperRef.current?.swipeBack();
      setCurrentIndex((prev) => Math.max(0, prev - 1));

      await updateIssueState(token, lastClosed, 'open');
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setFeedback(`Reopened #${lastClosed.number}`);
      setLastClosed(null);
    } catch (error) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setFeedback(`Undo failed: ${(error as Error).message}`);
    } finally {
      setUndoBusy(false);
    }
  }, [lastClosed, token]);

  const handleGetAiSummary = useCallback(async () => {
    const issue = visibleIssues[currentIndex];
    const alreadyHasSummary = issue?.aiSummary;
    if (!issue || alreadyHasSummary) return;

    setLoadingAiSummary(true);
    try {
      const result = await copilotService.summarizeIssue(issue);
      // Update by id, not index: the deck can be sorted or filtered, so a
      // position in `visibleIssues` is not a position in `issues`.
      setIssues(prevIssues =>
        prevIssues.map((item) =>
          item.id === issue.id ? { ...item, aiSummary: result.summary } : item
        )
      );
    } catch (error) {
      console.error('AI Summary error:', error);
    } finally {
      setLoadingAiSummary(false);
    }
  }, [currentIndex, visibleIssues]);

  const handleGetTriage = useCallback(async () => {
    const issue = visibleIssues[currentIndex];
    const alreadyTriaged = issue?.triage;
    if (!issue || alreadyTriaged) return;

    setLoadingTriage(true);
    try {
      const result = await triageService.triageIssue(issue);

      // The health check normally hides the button, so reaching here means the
      // key was rejected mid-session. Say why instead of failing silently.
      if (result.unavailable) {
        setFeedback(result.message || 'Structured triage is not configured.');
        return;
      }
      if (!result.triage) return;

      const triage = result.triage;
      setIssues(prevIssues =>
        prevIssues.map((item) =>
          item.id === issue.id ? { ...item, triage } : item
        )
      );
    } catch (error) {
      console.error('Triage error:', error);
      setFeedback((error as Error).message);
    } finally {
      setLoadingTriage(false);
    }
  }, [currentIndex, visibleIssues]);

  const handleTriageAll = useCallback(async () => {
    const untriaged = issues.filter((issue) => !issue.triage);
    if (untriaged.length === 0) {
      setFeedback('All loaded issues are already triaged');
      return;
    }

    setTriagingAll(true);
    try {
      const result = await triageService.triageIssues(untriaged);

      if (result.unavailable) {
        setFeedback(result.message || 'Structured triage is not configured.');
        return;
      }

      const batchResults = result.results || {};
      setIssues((prevIssues) =>
        prevIssues.map((item) => {
          const entry = batchResults[String(item.id)];
          const hasNewTriage = entry?.ok && entry.triage;
          return hasNewTriage ? { ...item, triage: entry.triage } : item;
        })
      );

      const succeeded = Object.values(batchResults).filter((entry) => entry.ok).length;
      const attempted = result.attempted ?? untriaged.length;
      const wasCapped = (result.requested ?? 0) > attempted;
      const cappedNote = wasCapped ? ` (capped at ${attempted})` : '';
      setFeedback(`Triaged ${succeeded}/${attempted}${cappedNote}`);
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setTriagingAll(false);
    }
  }, [issues]);

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
    visibleIssues,
    triagedCount,
    triageSort,
    setTriageSort,
    hideStale,
    setHideStale,
    triagingAll,
    handleTriageAll,
    loadingIssues,
    loadingAiSummary,
    loadingTriage,
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
    handleGetTriage,
  };
}
