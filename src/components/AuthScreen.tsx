import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { X, Check, Sparkles, Heart } from 'lucide-react-native';

const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};

interface AuthScreenProps {
  onLogin: () => void;
  authError: string;
  clientIdMissing: boolean;
  isDesktop: boolean;
}

export function AuthScreen({ onLogin, authError, clientIdMissing, isDesktop }: AuthScreenProps) {
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

        {clientIdMissing ? (
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    padding: 40,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    gap: 20,
  },
  authCardMobile: {
    padding: 32,
    maxWidth: 400,
  },
  authLogoWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  authLogo: {
    width: 80,
    height: 80,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
  },
  authCardBrand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 4,
  },
  authBrandIssue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -1,
  },
  authBrandCrush: {
    fontSize: 36,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: 0,
  },
  authCardSub: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555555',
    textAlign: 'center',
    fontWeight: '400',
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 3,
    borderColor: '#000000',
    marginTop: 8,
  },
  githubBtnLogo: {
    width: 24,
    height: 24,
    tintColor: '#ffffff',
  },
  githubButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  authTrust: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontWeight: '400',
  },
  authGestureGuide: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  gesturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000000',
  },
  gestureLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contributeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  contributeLinkText: {
    fontSize: 13,
    color: '#FF4D00',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorBox: {
    backgroundColor: '#ffe6e6',
    borderWidth: 2,
    borderColor: '#ff4444',
    padding: 16,
    marginTop: 8,
  },
  error: {
    color: '#cc0000',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
});
