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
import { Theme } from '../theme';
import { getLabelColor } from '../utils/colors';
import { webCursor } from '../utils/webCursor';

const isWeb = Platform.OS === 'web';

interface IssueCardProps {
  issue: GitHubIssue | null;
  repoLabel: string;
  theme: Theme;
  isDark: boolean;
  isDesktop: boolean;
  loadingAiSummary: boolean;
  currentIndex: number;
  issueIndex: number;
  copilotAvailable: boolean | null;
  onGetAiSummary: () => void;
}

export function IssueCard({
  issue,
  repoLabel,
  theme,
  isDark,
  isDesktop,
  loadingAiSummary,
  currentIndex,
  issueIndex,
  copilotAvailable,
  onGetAiSummary,
}: IssueCardProps) {
  const openIssueLink = async (url: string) => {
    try {
      if (isWeb && typeof document !== 'undefined') {
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
    } catch (error) {
      await Linking.openURL(url);
    }
  };

  if (!issue) {
    return <View style={[styles.cardBrutalist, isDesktop && styles.cardBrutalistDesktop, { backgroundColor: '#222' }]} />;
  }

  return (
    <View style={[styles.cardBrutalist, isDesktop && styles.cardBrutalistDesktop]}>
      {/* Card Header - White with black text */}
      <View style={styles.cardHeaderBrutalist}>
        <View style={styles.issueIdBadge}>
          <Text style={styles.issueIdText}>#{issue.number}</Text>
        </View>
        <TouchableOpacity
          onPress={() => openIssueLink(issue.html_url)}
          style={[styles.headlineWrap, webCursor('pointer')]}
          activeOpacity={0.7}
        >
          <Text style={styles.headlineBrutalist} numberOfLines={2}>
            {issue.title.split(' ').map((word, i) => (
              <Text key={i} style={i % 3 === 0 ? styles.headlineHeavy : styles.headlineLight}>
                {word}{' '}
              </Text>
            ))}
          </Text>
          <ExternalLink size={20} color="#000000" style={{ marginTop: 4, opacity: 0.6 }} />
        </TouchableOpacity>
      </View>

      {/* Card Body */}
      <View style={[styles.cardBodyBrutalist, styles.cardBodyContent]} pointerEvents="box-none">
        {/* User row */}
        {issue.user && (
          <View style={styles.userRowBrutalist}>
            <Image
              source={{ uri: issue.user.avatar_url }}
              style={styles.avatarBrutalist}
              resizeMode="cover"
            />
            <View style={styles.userMetaBrutalist}>
              <Text style={styles.userNameBrutalist}>{issue.user.login.toUpperCase()}</Text>
              <Text style={styles.repoNameBrutalist}>{repoLabel}</Text>
            </View>
          </View>
        )}

        {/* Labels */}
        <View style={styles.labelsBrutalist}>
          {issue.labels?.length ? (
            issue.labels.slice(0, 4).map((label) => (
              <View
                key={label.id}
                style={[styles.labelBrutalist, { backgroundColor: `#${label.color || '000000'}` }]}
              >
                <Text style={[styles.labelTextBrutalist, { color: getLabelColor(label.color || '000000') }]}>
                  {label.name.toUpperCase()}
                </Text>
              </View>
            ))
          ) : null}
        </View>

        {/* AI Block */}
        <View style={[styles.aiBlockBrutalist, { backgroundColor: isDark ? '#050505' : '#1a1a2e' }]}>
          <View style={styles.aiStickerBadge}>
            <Text style={styles.aiStickerText}>AI INSIGHT</Text>
          </View>
          {issue.aiSummary ? (
            <ScrollView style={styles.aiSummaryScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
              <Text style={styles.aiTextBrutalist}>
                <Text style={[styles.aiTextHighlight, { color: theme.primary }]}>// SUMMARY{'\n'}</Text>
                {issue.aiSummary}
              </Text>
            </ScrollView>
          ) : copilotAvailable === false ? (
            <View style={styles.aiUnavailableContainer}>
              <Text style={styles.aiUnavailableText}>
                AI summaries require running locally with GitHub Copilot.
              </Text>
              <Text style={[styles.aiUnavailableSubtext, { color: theme.textMuted }]}>
                Clone the repo and run with: npm run dev
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.aiButtonBrutalist, webCursor(loadingAiSummary ? 'default' : 'pointer')]}
              onPress={loadingAiSummary ? undefined : onGetAiSummary}
              disabled={loadingAiSummary}
            >
              {loadingAiSummary && currentIndex === issueIndex ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <>
                  <Sparkles size={18} color={theme.primary} />
                  <Text style={styles.aiButtonTextBrutalist}>GET AI SUMMARY</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBrutalist: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
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
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    position: 'relative',
  },
  issueIdBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 50,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  issueIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
  },
  headlineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    paddingRight: 80,
  },
  headlineBrutalist: {
    fontSize: 24,
    lineHeight: 28,
    flex: 1,
  },
  headlineHeavy: {
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  headlineLight: {
    fontWeight: '300',
    color: '#000000',
  },
  cardBodyBrutalist: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  cardBodyContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 16,
  },
  userRowBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBrutalist: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
  },
  userMetaBrutalist: {
    flexDirection: 'column',
  },
  userNameBrutalist: {
    fontWeight: '900',
    fontSize: 16,
    color: '#000000',
    textTransform: 'uppercase',
  },
  repoNameBrutalist: {
    fontWeight: '300',
    fontSize: 13,
    color: '#555555',
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
    backgroundColor: '#050505',
    padding: 24,
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  aiSummaryScroll: {
    maxHeight: 120,
  },
  aiStickerBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#000000',
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
    color: '#000000',
    textTransform: 'uppercase',
  },
  aiTextBrutalist: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 22,
    fontSize: 14,
    color: '#ffffff',
  },
  aiTextHighlight: {
    color: '#DFFF00',
    fontWeight: '700',
  },
  aiButtonBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiButtonTextBrutalist: {
    color: '#DFFF00',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  aiUnavailableContainer: {
    paddingVertical: 8,
  },
  aiUnavailableText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  aiUnavailableSubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
});
