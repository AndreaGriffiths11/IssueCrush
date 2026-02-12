import React from 'react';
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Heart, Sparkles, X } from 'lucide-react-native';

const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};
const isWeb = Platform.OS === 'web';

interface AuthScreenProps {
  isDesktop: boolean;
  clientId: string | null;
  authError: string;
  onLogin: () => void;
}

export function AuthScreen({
  isDesktop,
  clientId,
  authError,
  onLogin,
}: AuthScreenProps) {
  return (
    <ScrollView
      style={styles.authContainerScroll}
      contentContainerStyle={styles.authContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Login Card */}
      <View style={[styles.authCard, !isDesktop && styles.authCardMobile]}>
        {/* App Icon */}
        <View style={styles.authLogoWrap}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.authLogo}
            resizeMode="cover"
          />
        </View>

        <View style={styles.authCardBrand}>
          <Text style={styles.authBrandIssue}>ISSUE</Text>
          <Text style={styles.authBrandCrush}>CRUSH</Text>
        </View>

        <Text style={styles.authCardSub}>
          Triage your GitHub issues with swipe gestures.{'\n'}Swipe left to close, right to keep.
        </Text>

        <TouchableOpacity
          style={[styles.githubButton, webCursor('pointer')]}
          onPress={onLogin}
        >
          <Image
            source={require('../../assets/github-invertocat.png')}
            style={styles.githubBtnLogo}
            resizeMode="contain"
          />
          <Text style={styles.githubButtonText}>CONTINUE WITH GITHUB</Text>
        </TouchableOpacity>

        <Text style={styles.authTrust}>No repo access until you grant permissions</Text>

        {/* Gesture hints */}
        <View style={styles.authGestureGuide}>
          <View style={[styles.gesturePill, { backgroundColor: '#ffe6f2' }]}>
            <X size={14} color="#d6006e" strokeWidth={3} />
            <Text style={[styles.gestureLabel, { color: '#d6006e' }]}>CLOSE</Text>
          </View>
          <View style={[styles.gesturePill, { backgroundColor: '#e6ffe6' }]}>
            <Check size={14} color="#007A33" strokeWidth={3} />
            <Text style={[styles.gestureLabel, { color: '#007A33' }]}>KEEP</Text>
          </View>
          <View style={[styles.gesturePill, { backgroundColor: '#e6f0ff' }]}>
            <Sparkles size={14} color="#0055cc" strokeWidth={3} />
            <Text style={[styles.gestureLabel, { color: '#0055cc' }]}>AI SUMMARIES</Text>
          </View>
        </View>

        {/* Contribute link */}
        <TouchableOpacity
          style={[styles.contributeLink, webCursor('pointer')]}
          onPress={() => Linking.openURL('https://github.com/AndreaGriffiths11/IssueCrush/blob/main/CONTRIBUTING.md')}
        >
          <Heart size={14} color="#FF4D00" />
          <Text style={styles.contributeLinkText}>Want to contribute?</Text>
        </TouchableOpacity>

        {!clientId ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>
              Add EXPO_PUBLIC_GITHUB_CLIENT_ID to your env (see .env.example).
            </Text>
          </View>
        ) : null}

        {authError ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{authError}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authContainerScroll: {
    flex: 1,
    backgroundColor: '#000000',
  },
  authContainer: {
    flexGrow: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    minHeight: '100%',
  },
  authCard: {
    width: '100%',
    maxWidth: isWeb ? 520 : '100%',
    backgroundColor: '#ffffff',
    borderRadius: isWeb ? 24 : 20,
    padding: isWeb ? 44 : 28,
    gap: isWeb ? 20 : 20,
    alignItems: 'center',
  },
  authCardMobile: {
    padding: 24,
    borderRadius: 0,
    maxWidth: '100%',
  },
  authLogoWrap: {
    width: isWeb ? 120 : 100,
    height: isWeb ? 120 : 100,
    borderRadius: isWeb ? 28 : 24,
    overflow: 'hidden',
  },
  authLogo: {
    width: isWeb ? 120 : 100,
    height: isWeb ? 120 : 100,
  },
  authCardBrand: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  authBrandIssue: {
    fontSize: isWeb ? 52 : 36,
    fontWeight: '900',
    color: '#b8cc00',
    textTransform: 'uppercase',
    letterSpacing: -2,
  },
  authBrandCrush: {
    fontSize: isWeb ? 52 : 36,
    fontWeight: '300',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  authCardSub: {
    fontSize: isWeb ? 16 : 16,
    fontWeight: '400',
    color: '#555555',
    textAlign: 'center',
    lineHeight: isWeb ? 24 : 24,
  },
  authTrust: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontWeight: '400',
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#000000',
    paddingVertical: isWeb ? 24 : 20,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
  },
  githubBtnLogo: {
    width: isWeb ? 28 : 26,
    height: isWeb ? 28 : 26,
  },
  githubButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: isWeb ? 20 : 18,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  authGestureGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isWeb ? 12 : 8,
    flexWrap: 'wrap',
  },
  gesturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 50,
  },
  gestureLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  contributeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  contributeLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#1a0010',
  },
  error: {
    color: '#ff4d4d',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
