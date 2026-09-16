import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme, ThemeMode } from './themes';

const THEME_STORAGE_KEY = 'issuecrush-theme-mode';

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  themeMode: 'light',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function isStoredThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function getSystemThemeMode(): ThemeMode {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
}

async function persistThemeMode(mode: ThemeMode) {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Theme preference is best-effort; ignore storage failures.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getSystemThemeMode);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isMounted && isStoredThemeMode(stored)) {
          setThemeModeState(stored);
        }
      })
      .catch(() => {
        // Keep the system-default mode when storage is unavailable.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    void persistThemeMode(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((previous) => {
      const next: ThemeMode = previous === 'dark' ? 'light' : 'dark';
      void persistThemeMode(next);
      return next;
    });
  }, []);

  const isDark = themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
