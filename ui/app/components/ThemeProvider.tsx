"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type Theme,
  THEME_STORAGE_KEY,
  normalizeTheme,
  themeClass,
} from "@/app/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "paper";
  }
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-paper", "theme-apple");
  root.classList.add(themeClass(theme));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with "paper" for SSR; the pre-paint script already set the real class,
  // and the effect below syncs React state to the stored value on mount.
  const [theme, setThemeState] = useState<Theme>("paper");

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore — theme still applies for this session */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "apple" ? "paper" : "apple");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
