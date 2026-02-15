import { Platform } from 'react-native';

/**
 * Helper function to add web cursor styles and touch-action
 * Returns cursor style on web, empty object on mobile
 */
export const webCursor = (cursor: string): any =>
  Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};
