'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_THEME, THEMES, ThemeDefinition } from '@/config/themes';

interface ThemeContextValue {
  currentTheme: string;
  themeConfig: ThemeDefinition;
  setTheme: (themeId: string) => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<string>(DEFAULT_THEME);

  useEffect(() => {
    // Read persisted theme from localStorage if available
    try {
      const stored = localStorage.getItem('gamehub_theme');
      if (stored && THEMES.some((t) => t.id === stored)) {
        setCurrentTheme(stored);
        applyThemeClass(stored);
        return;
      }
    } catch {
      // Ignore storage access errors (private mode, SSR)
    }
    applyThemeClass(DEFAULT_THEME);
  }, []);

  const applyThemeClass = (themeId: string) => {
    const root = document.documentElement;
    // Remove all theme-* classes
    THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));
    // Add current theme class
    root.classList.add(`theme-${themeId}`);
  };

  const setTheme = (themeId: string) => {
    if (!THEMES.some((t) => t.id === themeId)) return;
    setCurrentTheme(themeId);
    applyThemeClass(themeId);
    try {
      localStorage.setItem('gamehub_theme', themeId);
    } catch {
      // Ignore storage errors
    }
  };

  const themeConfig = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeConfig,
        setTheme,
        availableThemes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
