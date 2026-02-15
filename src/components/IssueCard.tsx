import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { ExternalLink, Sparkles } from 'lucide-react-native';
import { GitHubIssue } from '../api/github';
import { Theme } from '../theme';
import { getLabelColor } from '../utils/colors';

const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};

interface IssueCardProps {
  issue: GitHubIssue | null;
  theme: Theme;
  isDark: boolean;
  isDesktop: boolean;
  repoLabel: (issue: GitHubIssue) => string;
  copilotAvailable: boolean | null;
  loadingAiSummary: boolean;
  isCurrentIssue: boolean;
  onGetAiSummary: () => void;
}

export function IssueCard({
  issue,
  theme,
  isDark,
  isDesktop,
  repoLabel,
  copilotAvailable,
  loadingAiSummary,
  isCurrentIssue,
  onGetAiSummary,
}: IssueCardProps) {
  const openIssueLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.warn(`Cannot open URL: ${url}`);
      }
    } catch (error) {
      await Linking.openURL(url);
    }
  };

  if (!issue) {
    return (
      <View
        style={[
          styles.cardBrutalist,
          isDesktop && styles.cardBrutalistDesktop,
          { backgroundColor: '#222' },
        ]}
      />
    );
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
              <Text style={styles.repoNameBrutalist}>{repoLabel(issue)}</Text>
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
              {loadingAiSummary && isCurrentIssue ? (
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
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  cardBrutalistDesktop: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  cardHeaderBrutalist: {
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
    minHeight: 120,
  },
  issueIdBadge: {
    backgroundColor: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  issueIdText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headlineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headlineBrutalist: {
    fontSize: 22,
    lineHeight: 28,
    color: '#000000',
    flex: 1,
  },
  headlineHeavy: {
    fontWeight: '900',
  },
  headlineLight: {
    fontWeight: '400',
  },
  cardBodyBrutalist: {
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  cardBodyContent: {
    gap: 16,
    flex: 1,
  },
  userRowBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBrutalist: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  userMetaBrutalist: {
    flex: 1,
    gap: 2,
  },
  userNameBrutalist: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  repoNameBrutalist: {
    fontSize: 12,
    fontWeight: '400',
    color: '#555555',
    letterSpacing: 0.2,
  },
  labelsBrutalist: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelBrutalist: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#000000',
  },
  labelTextBrutalist: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  aiBlockBrutalist: {
    borderWidth: 3,
    borderColor: '#000000',
    padding: 16,
    minHeight: 140,
    position: 'relative',
  },
  aiStickerBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: '#DFFF00',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#000000',
    zIndex: 10,
  },
  aiStickerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  aiSummaryScroll: {
    maxHeight: 180,
  },
  aiTextBrutalist: {
    fontSize: 13,
    lineHeight: 20,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  aiTextHighlight: {
    fontWeight: '700',
  },
  aiUnavailableContainer: {
    gap: 8,
  },
  aiUnavailableText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  aiUnavailableSubtext: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  aiButtonBrutalist: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#DFFF00',
  },
  aiButtonTextBrutalist: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
});
