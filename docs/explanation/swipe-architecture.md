# Swipe Architecture

Deep dive into the Tinder-style swipe card implementation.

## Component Hierarchy

````
SwipeContainer
  ├── Swiper (react-native-deck-swiper)
  │   └── IssueCard (rendered for each issue)
  │       ├── Title, description, labels
  │       ├── AI summary button
  │       └── Repository badge
  ├── Swipe overlays (CLOSED/KEPT stamps)
  └── Action buttons (Close/Undo/Keep)
````

## Swiper Library

**Package:** `react-native-deck-swiper`

**Why this library:**
- ✅ Built for React Native
- ✅ Smooth animations (native driver)
- ✅ Configurable swipe directions
- ✅ Programmatic control (swipeBack for undo)
- ✅ Works on web + mobile

**Alternatives considered:**
- `react-swipeable` - Web only
- `react-native-gesture-handler` - Too low-level
- Custom implementation - Too complex

## Ref Pattern (Critical for Undo)

The `swiperRef` from `useIssues` **must** be passed to `<Swiper>`:

````typescript
// useIssues.ts
const swiperRef = useRef<Swiper<GitHubIssue>>(null);

// SwipeContainer.tsx
<Swiper ref={swiperRef} ... />
````

**Why:** `swipeBack()` method requires ref to swiper instance

**Undo flow:**
1. User swipes left → issue closes → `lastClosed` saved
2. User clicks undo
3. `handleUndo()` calls `swiperRef.current?.swipeBack()`
4. Swiper animates card return
5. Issue reopens on GitHub

**Common mistake:**
````typescript
// ❌ WRONG: Creates new ref, breaks undo
const localRef = useRef<Swiper>(null);
return <Swiper ref={localRef} />;
````

## Animation Layers

### 1. Swipe Animation (Swiper library)

- Card translate X/Y
- Card rotation
- Card opacity (fade out)
- Next card scale (zoom in)

**Performance:** Uses native driver (60fps)

### 2. Overlay Stamps (react-native-reanimated)

"CLOSED" and "KEPT" stamps appear during swipe:

````typescript
const overlayOpacity = interpolate(
  swipeX.value,
  [-100, 0, 100],
  [1, 0, 1]  // Fade in as swipe progresses
);
````

### 3. Confetti (react-native-confetti-cannon)

Triggered on successful close:

````typescript
confettiRef.current?.start();
````

## Gesture Handling

### Mobile (Touch)

Swiper library handles gestures natively:
- Pan gesture (finger drag)
- Release velocity (fling detection)
- Threshold (50% card width for commit)

### Web (Mouse)

Same gestures via pointer events:
- mousedown → pointerdown
- mousemove → pointermove
- mouseup → pointerup

### Keyboard (Web Only)

Custom implementation in `useKeyboardShortcuts`:

````typescript
case 'ArrowLeft':
  swiperRef.current?.swipeLeft();
  break;
case 'ArrowRight':
  swiperRef.current?.swipeRight();
  break;
````

## State Management

### Card Index Tracking

````typescript
const [currentIndex, setCurrentIndex] = useState(0);

<Swiper
  onSwiped={(index) => setCurrentIndex(index + 1)}
  onSwipedLeft={(index) => setCurrentIndex(index + 1)}
  onSwipedRight={(index) => setCurrentIndex(index + 1)}
/>
````

**Why separate handlers:** Different actions (close vs. keep)

### Last Closed Tracking

````typescript
const [lastClosed, setLastClosed] = useState<GitHubIssue | null>(null);

const handleSwipeLeft = async (index: number) => {
  const issue = issues[index];
  setLastClosed(issue);  // Save for undo
  await closeIssue(issue);
};
````

**Depth:** Single level (can only undo most recent close)

## Performance Considerations

### Card Rendering

- **Lazy:** Only current + next 2 cards rendered
- **Virtualized:** Old cards removed from DOM
- **Optimized:** PureComponent for IssueCard

### Image Loading

````typescript
<Image
  source={{ uri: issue.user.avatar_url }}
  loadingIndicatorSource={require('./assets/default-avatar.png')}
/>
````

### AI Summary Caching

Once loaded, summary stored in issue object:
````typescript
const issueWithSummary = { ...issue, aiSummary: result.summary };
````

No re-fetch needed when card returns (undo).

## Edge Cases

### Last Card

When no more issues:
````typescript
{issues.length === 0 && (
  <Text>No more issues! 🎉</Text>
)}
````

### Rapid Swipes

Debounced to prevent double-close:
````typescript
const [swiping, setSwiping] = useState(false);

const handleSwipeLeft = async (index: number) => {
  if (swiping) return;  // Guard
  setSwiping(true);
  await closeIssue(issue);
  setSwiping(false);
};
````

### Failed Close

Card doesn't disappear if API fails:
````typescript
try {
  await closeIssue(issue);
  // Card already swiped away by library
} catch (error) {
  // TODO: Card should return (not implemented)
  setFeedback(`Error: ${error.message}`);
}
````

## Related Documentation

- [Hooks API Reference](../reference/api/hooks.md)
- [IssueCard Component](../reference/components/IssueCard.md)
- [SwipeContainer Component](../reference/components/SwipeContainer.md)
