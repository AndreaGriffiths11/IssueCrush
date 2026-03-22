import React, { createContext, useContext } from 'react';
import { lightTheme, Theme, ThemeMode } from './themes';

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  themeMode: 'light',
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: lightTheme, isDark: false, themeMode: 'light', setThemeMode: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}
