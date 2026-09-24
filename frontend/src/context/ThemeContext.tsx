import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    
    // IF YOU WANT THE APP TO ALWAYS DEFAULT TO LIGHT MODE FOR NEW USERS:
    // Change 'system' to 'light' below.
    return 'light'; 
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    themeMode === 'system' ? getSystemPrefersDark() : themeMode === 'dark'
  );

  // 1. Handle DOM updates and System Theme listening
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      setIsDarkMode(isDark);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (themeMode === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Apply immediately based on current system state
      applyTheme(mql.matches);

      // Listen for OS theme changes while the app is open
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mql.addEventListener('change', handler);
      
      return () => mql.removeEventListener('change', handler);
    } else {
      // Apply the manual override (light or dark)
      applyTheme(themeMode === 'dark');
    }
  }, [themeMode]);

  // 2. Keep localStorage sync separate and clean
  useEffect(() => {
    localStorage.setItem('theme', themeMode);
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, isDarkMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};