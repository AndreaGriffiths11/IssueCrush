import { useState, useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  interpolateColor,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Theme } from '../theme';

export function useAnimations(theme: Theme, feedback: string, currentIndex: number, issuesLength: number, inputFocused: boolean) {
  // Toast animation
  const toastTranslateY = useSharedValue(100);
  const toastOpacity = useSharedValue(0);

  // Input focus animation
  const inputBorderColor = useSharedValue(0);

  // Progress bar animation
  const progressWidth = useSharedValue(0);

  // FAB button animations
  const undoScale = useSharedValue(1);
  const closeScale = useSharedValue(1);
  const keepScale = useSharedValue(1);

  // Crumble animation state
  const [showCrumble, setShowCrumble] = useState(false);
  const crumbleProgress = useSharedValue(0);
  const crumbleScale = useSharedValue(1);
  const crumbleRotate = useSharedValue(0);
  const crumbleOpacity = useSharedValue(0);

  const triggerCrumbleAnimation = useCallback(() => {
    setShowCrumble(true);
    crumbleOpacity.value = 1;
    crumbleProgress.value = 0;
    crumbleScale.value = 1;
    crumbleRotate.value = 0;

    crumbleProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    crumbleScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withTiming(0.2, { duration: 650, easing: Easing.in(Easing.cubic) })
    );
    crumbleRotate.value = withTiming(45, { duration: 800, easing: Easing.out(Easing.quad) });
    crumbleOpacity.value = withTiming(0, { duration: 800, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(setShowCrumble)(false);
    });
  }, []);

  const crumbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: crumbleOpacity.value,
    transform: [
      { scale: crumbleScale.value },
      { rotate: `${crumbleRotate.value}deg` },
      { translateY: interpolate(crumbleProgress.value, [0, 1], [0, 150]) },
    ],
  }));

  const toastAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
    opacity: toastOpacity.value,
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      inputBorderColor.value,
      [0, 1],
      [theme.border, theme.primary]
    ),
    borderWidth: interpolate(inputBorderColor.value, [0, 1], [1, 2]),
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const undoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: undoScale.value }],
  }));

  const closeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeScale.value }],
  }));

  const keepAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: keepScale.value }],
  }));

  // Animate input focus
  useEffect(() => {
    inputBorderColor.value = withTiming(inputFocused ? 1 : 0, { duration: 200 });
  }, [inputFocused]);

  // Animate progress bar
  useEffect(() => {
    if (issuesLength > 0) {
      const targetWidth = (Math.min(currentIndex + 1, issuesLength) / issuesLength) * 100;
      progressWidth.value = withSpring(targetWidth, { damping: 15, stiffness: 100 });
    }
  }, [currentIndex, issuesLength]);

  // Animate toast entry/exit
  useEffect(() => {
    if (feedback) {
      toastTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      toastOpacity.value = withTiming(1, { duration: 200 });
    } else {
      toastTranslateY.value = withTiming(100, { duration: 300 });
      toastOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [feedback]);

  // FAB press handlers
  const handleClosePressIn = useCallback(() => {
    closeScale.value = withSpring(0.9);
  }, []);

  const handleClosePressOut = useCallback(() => {
    closeScale.value = withSpring(1);
  }, []);

  const handleKeepPressIn = useCallback(() => {
    keepScale.value = withSpring(0.9);
  }, []);

  const handleKeepPressOut = useCallback(() => {
    keepScale.value = withSpring(1);
  }, []);

  const handleUndoPressIn = useCallback(() => {
    undoScale.value = withSpring(0.9);
  }, []);

  const handleUndoPressOut = useCallback(() => {
    undoScale.value = withSpring(1);
  }, []);

  return {
    showCrumble,
    triggerCrumbleAnimation,
    crumbleAnimatedStyle,
    toastAnimatedStyle,
    inputAnimatedStyle,
    progressAnimatedStyle,
    undoAnimatedStyle,
    closeAnimatedStyle,
    keepAnimatedStyle,
    handleClosePressIn,
    handleClosePressOut,
    handleKeepPressIn,
    handleKeepPressOut,
    handleUndoPressIn,
    handleUndoPressOut,
  };
}
