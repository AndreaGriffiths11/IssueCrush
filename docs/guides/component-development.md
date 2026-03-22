# Component Development Guide

This guide explains how to build and style components in IssueCrush following established patterns and architecture boundaries.

## Table of Contents

- [Architecture Principles](#architecture-principles)
- [Component Patterns](#component-patterns)
- [Styling Guidelines](#styling-guidelines)
- [Platform-Specific Code](#platform-specific-code)
- [Common Patterns](#common-patterns)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Architecture Principles

### The Props/Callbacks Pattern

✅ **Correct Pattern**:

````typescript
// Component receives all data via props
function IssueCard({ issue, onGetAiSummary, loadingAiSummary }: Props) {
  return (
    <TouchableOpacity onPress={onGetAiSummary} disabled={loadingAiSummary}>
      <Text>{issue.title}</Text>
    </TouchableOpacity>
  );
}

// Parent (App.tsx) uses hooks
function App() {
  const { handleGetAiSummary, loadingAiSummary } = useIssues(token);
  const issue = issues[currentIndex];
  
  return <IssueCard issue={issue} onGetAiSummary={handleGetAiSummary} loadingAiSummary={loadingAiSummary} />;
}
````

❌ **Incorrect Pattern**:

````typescript
// DON'T: Component calls hooks or APIs directly
function IssueCard({ issue }: Props) {
  const { handleGetAiSummary, loadingAiSummary } = useIssues(token); // ❌
  
  return <TouchableOpacity onPress={handleGetAiSummary}>...</TouchableOpacity>;
}
````

### Why?

1. **Separation of Concerns**: Business logic in hooks, presentation in components
2. **Testability**: Components can be tested with mock props
3. **Reusability**: Components work with any data source
4. **Architecture Boundary**: Enforced in AGENTS.md

---

## Component Patterns

### 1. Pure Functional Components

Always use functional components with TypeScript:

````typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MyComponentProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export function MyComponent({ title, onPress, disabled = false }: MyComponentProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
````

### 2. Props Interface

Always define a TypeScript interface for props:

````typescript
interface SidebarProps {
  repoFilter: string;
  onChangeRepoFilter: (text: string) => void;
  onRefresh: () => void;
  loadingIssues: boolean;
}

export function Sidebar({ repoFilter, onChangeRepoFilter, onRefresh, loadingIssues }: SidebarProps) {
  // ...
}
````

### 3. Responsive Layout

Use `useWindowDimensions` or pass size props:

````typescript
function MyComponent({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View style={[
      styles.container,
      isDesktop && styles.containerDesktop
    ]}>
      {/* ... */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  containerDesktop: {
    padding: 24,
  },
});
````

### 4. Conditional Rendering

Use ternary or short-circuit for simple cases:

````typescript
{issues.length === 0 ? (
  <EmptyState />
) : (
  <IssueList issues={issues} />
)}

{isLoading && <ActivityIndicator />}
````

Use IIFE for complex logic:

````typescript
{(() => {
  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <ErrorMessage />;
  if (status === 'empty') return <EmptyState />;
  return <ContentView />;
})()}
````

---

## Styling Guidelines

### 1. StyleSheet API

Always use `StyleSheet.create()` (not inline styles):

✅ **Correct**:
````typescript
const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 8,
  },
});

<View style={styles.card}>...</View>
````

❌ **Incorrect**:
````typescript
<View style={{ padding: 16, borderRadius: 8 }}>...</View>
````

### 2. Brutalist Design Language

IssueCrush uses a brutalist design aesthetic:

- **Heavy borders**: `borderWidth: 2` or `borderWidth: 3`
- **High contrast**: Black borders, bold colors
- **Mixed font weights**: Heavy (900) and light (300) in same element
- **Shadow effects**: Large shadows for depth
- **Geometric shapes**: Sharp corners, rectangular badges

Example:

````typescript
const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',  // Heavy
    textTransform: 'uppercase',
  },
});
````

### 3. Theme Integration

Use the theme context for colors:

````typescript
import { useTheme } from '../theme';

function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.ink }]}>Hello</Text>
    </View>
  );
}
````

Available theme colors:
- `theme.background` - Main background
- `theme.cardBackground` - Card background
- `theme.ink` - Primary text color
- `theme.textSecondary` - Secondary text
- `theme.textMuted` - Muted text
- `theme.primary` - Primary accent
- `theme.border` - Border color
- `theme.cardBorder` - Card border color

### 4. Responsive Typography

Adjust font sizes based on screen size:

````typescript
function MyComponent({ isDesktop, screenWidth }: Props) {
  const isNarrowScreen = screenWidth < 400;
  const titleSize = isNarrowScreen ? 18 : isDesktop ? 24 : 20;
  
  return (
    <Text style={[styles.title, { fontSize: titleSize }]}>
      Title
    </Text>
  );
}
````

---

## Platform-Specific Code

### 1. Platform Checks

Use `Platform.OS` for conditional logic:

````typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  window.open(url, '_blank');
} else {
  await WebBrowser.openBrowserAsync(url);
}
````

### 2. Platform-Specific Imports

````typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

async function saveToken(sessionId: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(KEY, sessionId);
  } else {
    await SecureStore.setItemAsync(KEY, sessionId);
  }
}
````

### 3. Web-Specific Utilities

Use the `webCursor` helper for cursor styles:

````typescript
import { webCursor } from '../utils';

<TouchableOpacity
  style={[styles.button, webCursor('pointer')]}
  onPress={handlePress}
>
  <Text>Click Me</Text>
</TouchableOpacity>
````

### 4. Haptic Feedback (Mobile Only)

````typescript
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

async function handleAction() {
  if (Platform.OS !== 'web') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
  // ... rest of action
}
````

---

## Common Patterns

### 1. Loading States

Show spinners during async operations:

````typescript
<TouchableOpacity
  style={styles.button}
  onPress={handleAction}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator color={theme.primary} size="small" />
  ) : (
    <>
      <Icon name="refresh" />
      <Text>Refresh</Text>
    </>
  )}
</TouchableOpacity>
````

### 2. Empty States

Provide helpful messages when no data:

````typescript
{issues.length === 0 ? (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>No issues to triage!</Text>
    <Text style={styles.emptySub}>All caught up 🎉</Text>
  </View>
) : (
  <IssueList issues={issues} />
)}
````

### 3. Error Messages

Display errors inline or as toasts:

````typescript
{authError && (
  <Text style={styles.errorText}>{authError}</Text>
)}
````

### 4. Animated Elements

Use `react-native-reanimated` for animations:

````typescript
import Animated from 'react-native-reanimated';

function AnimatedToast({ animatedStyle, feedback }: Props) {
  return (
    <Animated.View style={[styles.toast, animatedStyle]}>
      <Text>{feedback}</Text>
    </Animated.View>
  );
}
````

### 5. Accessibility

Add accessibility labels:

````typescript
<TouchableOpacity
  accessibilityLabel="Close issue"
  accessibilityHint="Swipe left to close this issue"
  onPress={handleClose}
>
  <X size={20} />
</TouchableOpacity>
````

---

## Anti-Patterns to Avoid

### ❌ 1. Calling Hooks in Components

````typescript
// ❌ Don't do this
function MyComponent({ issue }: Props) {
  const { token } = useAuth();  // ❌ Violates architecture boundary
  // ...
}
````

### ❌ 2. Making API Calls Directly

````typescript
// ❌ Don't do this
function MyComponent({ issue }: Props) {
  const handleSummary = async () => {
    const result = await copilotService.summarizeIssue(issue);  // ❌
  };
}
````

### ❌ 3. Recreating Refs

````typescript
// ❌ Don't do this
function SwipeContainer({ issues }: Props) {
  const swiperRef = useRef(null);  // ❌ Breaks undo feature
  // Should be passed from useIssues()
}
````

### ❌ 4. Inline Styles

````typescript
// ❌ Don't do this
<View style={{ padding: 16, margin: 8 }}>  // ❌
  <Text>Content</Text>
</View>

// ✅ Do this
const styles = StyleSheet.create({
  container: { padding: 16, margin: 8 },
});

<View style={styles.container}>
  <Text>Content</Text>
</View>
````

### ❌ 5. Mutating Props

````typescript
// ❌ Don't do this
function MyComponent({ issue }: Props) {
  issue.title = 'New title';  // ❌ Never mutate props
}

// ✅ Do this (if you need to transform)
function MyComponent({ issue }: Props) {
  const displayTitle = issue.title.toUpperCase();
  return <Text>{displayTitle}</Text>;
}
````

---

## Checklist for New Components

- [ ] Component is a pure functional component
- [ ] Props interface defined with TypeScript
- [ ] Uses `StyleSheet.create()` (not inline styles)
- [ ] Integrates theme colors via `useTheme()`
- [ ] Handles responsive layout (mobile/desktop)
- [ ] Platform-specific code uses `Platform.OS` checks
- [ ] Does NOT call hooks or APIs directly (receives via props)
- [ ] Loading and error states handled gracefully
- [ ] Accessibility labels added where appropriate
- [ ] Follows brutalist design language
- [ ] Exported from `src/components/index.ts`

---

## Example: Building a New Component

Let's build a "FilterPill" component:

````typescript
// src/components/FilterPill.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { webCursor } from '../utils';

interface FilterPillProps {
  label: string;
  onRemove: () => void;
}

export function FilterPill({ label, onRemove }: FilterPillProps) {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { backgroundColor: theme.primary, borderColor: theme.cardBorder }
      ]}
      onPress={onRemove}
      accessibilityLabel={`Remove filter: ${label}`}
      activeOpacity={0.7}
      {...webCursor('pointer')}
    >
      <Text style={[styles.label, { color: theme.cardBackground }]}>
        {label.toUpperCase()}
      </Text>
      <X size={12} color={theme.cardBackground} strokeWidth={3} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
````

Export from `src/components/index.ts`:

````typescript
export { FilterPill } from './FilterPill';
````

Use in parent:

````typescript
import { FilterPill } from '@/components';

function Sidebar() {
  const filters = ['bug', 'urgent'];
  
  return (
    <View style={styles.filterList}>
      {filters.map(filter => (
        <FilterPill
          key={filter}
          label={filter}
          onRemove={() => handleRemoveFilter(filter)}
        />
      ))}
    </View>
  );
}
````

---

## See Also

- [Components API](../api/components.md)
- [Architecture Overview](../architecture/overview.md)
- [Testing Guide](./testing.md)
