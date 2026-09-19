'use client';

import React, { createContext, useContext, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

const STORAGE_KEY = 'shareable-theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

let listeners: (() => void)[] = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void) {
  listeners.push(callback);

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };

  const mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const handleMedia = () => {
    callback();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }
  mediaQuery?.addEventListener('change', handleMedia);

  return () => {
    listeners = listeners.filter((l) => l !== callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    mediaQuery?.removeEventListener('change', handleMedia);
  };
}

function emptySubscribe() {
  return () => {};
}

function getThemeSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Ignore storage access issues
  }
  return 'system';
}

function getThemeServerSnapshot(): Theme {
  return 'system';
}

function getSystemThemeSnapshot(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSystemThemeServerSnapshot(): ResolvedTheme {
  return 'light';
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getThemeServerSnapshot);
  const systemTheme = useSyncExternalStore(subscribe, getSystemThemeSnapshot, getSystemThemeServerSnapshot);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    return theme === 'system' ? systemTheme : theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    if (mounted) {
      applyThemeClass(resolvedTheme);
    }
  }, [resolvedTheme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage access issues
    }
    emitChange();
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      mounted,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, mounted]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
