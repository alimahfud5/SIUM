import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'kuat_pers_theme_mode_v1';
const THEME_EVENT_NAME = 'kuat-pers-theme-change';

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = mode;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', mode === 'dark' ? '#17130f' : '#f4f1ea');
  }
}

export function setStoredThemeMode(mode: ThemeMode): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Abaikan error kuota storage
    }
  }
  applyThemeMode(mode);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_EVENT_NAME, { detail: mode }));
  }
}

export function useThemeMode() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredThemeMode());

  useEffect(() => {
    applyThemeMode(theme);
  }, [theme]);

  useEffect(() => {
    const handleCustom = (e: Event) => {
      const next = (e as CustomEvent<ThemeMode>).detail;
      if (next === 'dark' || next === 'light') {
        setThemeState(next);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const next: ThemeMode = e.newValue === 'light' ? 'light' : 'dark';
        applyThemeMode(next);
        setThemeState(next);
      }
    };
    window.addEventListener(THEME_EVENT_NAME, handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(THEME_EVENT_NAME, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    setStoredThemeMode(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      setStoredThemeMode(next);
      return next;
    });
  }, []);

  return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
}
