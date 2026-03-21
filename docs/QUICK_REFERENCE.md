# Quick Reference

Quick lookup for common tasks and patterns in IssueCrush.

## Common Tasks

### Adding a New Component

1. Create file in `src/components/`
2. Make it presentational (props + callbacks only)
3. Receive `theme` as prop
4. Use `StyleSheet.create` for styles
5. Export from `src/components/index.ts`

````typescript
// src/components/MyComponent.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';

interface MyComponentProps {
  title: string;
  onPress: () => void;
  theme: Theme;
}

export function MyComponent({ title, onPress, theme }: MyComponentProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text }}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
````

### Adding a New Hook

1. Create file in `src/hooks/`
2. Encapsulate related business logic
3. Use `useCallback` and `useMemo` for optimization
4. Return stable references
5. Export from `src/hooks/index.ts`

````typescript
// src/hooks/useMyFeature.ts
import { useState, useCallback } from 'react';

export function useMyFeature() {
  const [data, setData] = useState<string[]>([]);
  
  const loadData = useCallback(async () => {
    const result = await fetchData();
    setData(result);
  }, []);
  
  return {
    data,
    loadData,
  };
}
````

### Making an API Call

Use the GitHub API client:

````typescript
import { fetchIssues, updateIssueState } from './src/api/github';

// Fetch issues
const issues = await fetchIssues(token, 'facebook/react', 'bug');

// Close an issue
await updateIssueState(token, 'facebook/react', 42, 'closed');

// Reopen an issue
await updateIssueState(token, 'facebook/react', 42, 'open');
````

### Adding Haptic Feedback

Always guard with platform check:

````typescript
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Impact feedback (for physical actions)
if (Platform.OS !== 'web') {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

// Notification feedback (for success/error)
if (Platform.OS !== 'web') {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
````

### Storing Data Securely

Use platform-specific storage:

````typescript
import { getToken, saveToken, deleteToken } from './src/lib/tokenStorage';

// Save
await saveToken('my-session-id');

// Retrieve
const token = await getToken();

// Delete
await deleteToken();
````

### Using Animations

Get animation styles from `useAnimations` and apply to `Animated.View`:

````typescript
import Animated from 'react-native-reanimated';

function MyComponent() {
  const animatedStyles = useAnimations(theme, feedback, currentIndex, issuesLength, false);
  
  return (
    <Animated.View style={[styles.container, animatedStyles.toastStyle]}>
      <Text>{feedback}</Text>
    </Animated.View>
  );
}
````

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Component | PascalCase.tsx | `IssueCard.tsx` |
| Hook | camelCase.ts | `useAuth.ts` |
| Util | camelCase.ts | `tokenStorage.ts` |
| API Client | camelCase.ts | `github.ts` |
| Test | *.test.ts(x) | `github.test.ts` |

## Import Order

1. React
2. React Native
3. Third-party libraries
4. Internal modules (alphabetical)
5. Relative imports
6. Types

````typescript
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { X, Check } from 'lucide-react-native';

import { fetchIssues, GitHubIssue } from './src/api/github';
import { useTheme } from './src/theme';
import { Theme } from './src/theme/themes';
````

## TypeScript Patterns

### Component Props

Always define an interface:

````typescript
interface MyComponentProps {
  title: string;
  count: number;
  onPress: () => void;
  optional?: string;
}

export function MyComponent({ title, count, onPress, optional }: MyComponentProps) {
  // ...
}
````

### Hook Return Type

Let TypeScript infer, or define explicitly for complex cases:

````typescript
// Inferred (preferred)
export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  return { token, setToken };
}

// Explicit (for documentation)
interface UseAuthReturn {
  token: string | null;
  setToken: (value: string | null) => void;
}

export function useAuth(): UseAuthReturn {
  // ...
}
````

## Environment Variables

### Naming

- Client-side: `EXPO_PUBLIC_*`
- Server-side: No prefix

### Accessing

````typescript
// Client (App.tsx, hooks, components)
const clientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';

// Server (server.js, api/src/app.js)
const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? '';
````

### Required Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `EXPO_PUBLIC_GITHUB_CLIENT_ID` | Client | GitHub OAuth App Client ID |
| `EXPO_PUBLIC_GITHUB_SCOPE` | Client | OAuth scope (use `repo`) |
| `GITHUB_CLIENT_SECRET` | Server | GitHub OAuth App Secret |
| `GH_TOKEN` or `COPILOT_PAT` | Server | Token for AI features |
| `COSMOS_ENDPOINT` | Server | Cosmos DB endpoint (optional) |
| `COSMOS_KEY` | Server | Cosmos DB key (optional) |

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Commit Messages

Use conventional commits:

````
feat: add label filtering to Sidebar
fix: resolve swiper ref not updating
docs: add hooks API reference
refactor: extract animation logic to hook
chore: update dependencies
test: add tests for tokenStorage
````

### Before Committing

1. Run type check: `npx tsc --noEmit`
2. Run tests: `npm test`
3. Test on web: `npm run web-dev`

## Testing

### Unit Test

````typescript
// src/lib/tokenStorage.test.ts
import { saveToken, getToken, deleteToken } from './tokenStorage';

describe('tokenStorage', () => {
  it('saves and retrieves token', async () => {
    await saveToken('test-token');
    const token = await getToken();
    expect(token).toBe('test-token');
  });
  
  it('deletes token', async () => {
    await saveToken('test-token');
    await deleteToken();
    const token = await getToken();
    expect(token).toBeNull();
  });
});
````

### Component Test

````typescript
// src/components/IssueCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { IssueCard } from './IssueCard';
import { lightTheme } from '../theme/themes';

const mockIssue = {
  id: 1,
  number: 42,
  title: 'Test Issue',
  // ... other required fields
};

test('calls onGetAISummary when button pressed', () => {
  const mockHandler = jest.fn();
  const { getByText } = render(
    <IssueCard
      issue={mockIssue}
      onGetAISummary={mockHandler}
      loadingAiSummary={false}
      theme={lightTheme}
    />
  );
  
  fireEvent.press(getByText('✨ Get AI Summary'));
  expect(mockHandler).toHaveBeenCalled();
});
````

### Integration Test

````typescript
// server.test.js
const request = require('supertest');
const app = require('./server');

test('POST /api/github-token returns session', async () => {
  const response = await request(app)
    .post('/api/github-token')
    .send({ code: 'test-code' })
    .expect(200);
  
  expect(response.body).toHaveProperty('session_id');
});
````

## Debugging

### React Native Debugger

Web only:

1. Open Chrome DevTools (Cmd+Option+I)
2. Console shows all `console.log()` output
3. React DevTools available in Chrome extensions

### Network Requests

````typescript
// Add logging to API calls
console.log('Fetching issues with filter:', repoFilter);
const response = await fetch(url);
console.log('Response status:', response.status);
const data = await response.json();
console.log('Issues loaded:', data.length);
````

### Animation Debugging

````typescript
// Log shared value changes
console.log('Progress width:', progressWidth.value);

// Disable animations for debugging
const progressWidth = useSharedValue(100); // Skip animation
````

## Common Errors

### "bad_verification_code"

**Cause:** OAuth code expired or already used

**Fix:** Click "Start GitHub login" again to get a new code

### "Failed to connect to auth server"

**Cause:** Server not running

**Fix:** Run `npm run server` in a separate terminal

### "Issues won't close"

**Cause:** OAuth scope is `public_repo` instead of `repo`

**Fix:**
1. Update `.env`: `EXPO_PUBLIC_GITHUB_SCOPE=repo`
2. Restart server
3. Sign out and sign in again

### "AI summary failed: Failed to fetch"

**Cause:** Missing `GH_TOKEN` or `COPILOT_PAT` in server environment

**Fix:**
1. Add token to `.env`
2. Restart server

### "Cannot find module 'vscode-jsonrpc'"

**Cause:** Postinstall script didn't run

**Fix:** Run `npm install` again

### Swiper Undo Doesn't Work

**Cause:** `swiperRef` not passed correctly

**Fix:** Ensure `swiperRef` comes from `useIssues` and is passed to `<SwipeContainer />`

## Performance Tips

### Optimize Re-renders

Use `React.memo` for expensive components:

````typescript
export const IssueCard = React.memo(({ issue, theme }: IssueCardProps) => {
  // ...
});
````

### Memoize Callbacks

Always use `useCallback` for callbacks passed to children:

````typescript
const handlePress = useCallback(() => {
  console.log('Pressed');
}, []); // Empty deps = stable reference
````

### Optimize FlatList

For long lists:

````typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id.toString()}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
````

## Useful Links

- **[Expo Docs](https://docs.expo.dev)** - Expo SDK documentation
- **[React Native Docs](https://reactnative.dev)** - React Native API reference
- **[GitHub API](https://docs.github.com/rest)** - GitHub REST API docs
- **[Copilot SDK](https://github.com/github/copilot-sdk)** - GitHub Copilot SDK
- **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** - Animation library

## Related Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Hooks API Reference](./HOOKS.md)
- [Component API Reference](./COMPONENTS.md)
- [Contributing Guide](../CONTRIBUTING.md)
