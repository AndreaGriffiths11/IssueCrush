# How to Add Custom Swipe Actions

Learn how to extend IssueCrush with custom swipe actions beyond Close/Keep.

## Example: Add "Label" Action

### 1. Update `useIssues` Hook

Add a new handler in `src/hooks/useIssues.ts`:

````typescript
const handleSwipeUp = useCallback(async (cardIndex: number) => {
  const issue = issues[cardIndex];
  // Add label logic here
  await addLabel(token, issue, 'triaged');
  setFeedback('Issue labeled');
}, [issues, token]);
````

### 2. Update SwipeContainer

Add the action to `src/components/SwipeContainer.tsx`:

````typescript
<Swiper
  ref={swiperRef}
  cards={issues}
  onSwipedLeft={handleSwipeLeft}
  onSwipedRight={handleSwipeRight}
  onSwipedTop={handleSwipeUp}  // New action
/>
````

### 3. Add Keyboard Shortcut

Update `src/hooks/useKeyboardShortcuts.ts`:

````typescript
case 'ArrowUp':
case 'L':
  event.preventDefault();
  onSwipeUp?.(currentIndex);
  break;
````

## Related Documentation

- [Hooks API Reference](../reference/api/hooks.md)
- [GitHub Client API](../reference/api/github-client.md)
- [Architecture Overview](../reference/architecture/overview.md)
