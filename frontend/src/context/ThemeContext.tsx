import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDarkMode: boolean; // the resolved, currently-applied appearance (system resolves to light/dark)
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    return 'system'; // Default to following the OS setting rather than
                      // hardcoding light, unless the user has explicitly
                      // chosen one before.
  });

  const [isDarkMode, setIsDarkMode] = useState(() =>
    themeMode === 'system' ? getSystemPrefersDark() : themeMode === 'dark'
  );

  // Applies the resolved appearance to <html>. Recomputes on every
  // themeMode change, and - only while in 'system' mode - also listens for
  // the OS's own color-scheme preference changing live (e.g. the OS
  // auto-switches to dark mode at sunset while this tab stays open).
  useEffect(() => {
    const root = document.documentElement;

    const applyResolvedTheme = () => {
      const resolvedDark = themeMode === 'system' ? getSystemPrefersDark() : themeMode === 'dark';
      setIsDarkMode(resolvedDark);
      if (resolvedDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyResolvedTheme();
    localStorage.setItem('theme', themeMode);

    if (themeMode === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', applyResolvedTheme);
      return () => mql.removeEventListener('change', applyResolvedTheme);
    }
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