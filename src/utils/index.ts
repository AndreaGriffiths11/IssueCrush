import { Platform } from 'react-native';

export { getLabelColor } from './colors';

export const webCursor = (cursor: string): any => Platform.OS === 'web' ? { cursor, touchAction: 'pan-y' } : {};
export const isWeb = Platform.OS === 'web';
