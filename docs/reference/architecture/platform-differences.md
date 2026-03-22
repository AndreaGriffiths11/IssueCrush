# Platform Differences

Key differences between mobile (iOS/Android) and web implementations.

## Comparison Table

| Feature | Mobile | Web |
|---------|--------|-----|
| **OAuth Flow** | Device flow (in-app browser) | Web flow (redirect) |
| **Token Storage** | expo-secure-store (encrypted) | AsyncStorage (localStorage) |
| **Haptic Feedback** | Enabled (native) | Disabled (not supported) |
| **Keyboard Shortcuts** | Disabled | Enabled (arrow keys, X/O/Z/U) |
| **Layout** | Single column, mobile-optimized | Responsive (sidebar on desktop) |
| **Deep Links** | Supported (OAuth callback) | Not needed |
| **Navigation** | Touch gestures | Mouse/keyboard |

## OAuth Implementation

### Mobile
````typescript
const result = await WebBrowser.openAuthSessionAsync(
  'https://github.com/login/oauth/authorize?...',
  'issuecrush://callback'
);
````

### Web
````typescript
window.location.href = 'https://github.com/login/oauth/authorize?...';
````

## Haptic Feedback

Only active on mobile (`Platform.OS !== 'web'`):
````typescript
if (Platform.OS !== 'web') {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}
````

## Layout Branching

In `App.tsx`:
````typescript
const isDesktop = width >= 768;

return isDesktop ? <DesktopLayout /> : <MobileLayout />;
````

## Related Documentation

- [Architecture Overview](./overview.md)
- [Hooks API Reference](../api/hooks.md)
