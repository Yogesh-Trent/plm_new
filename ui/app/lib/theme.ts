export type Theme = "paper" | "apple";

export const THEME_STORAGE_KEY = "plm-theme";
export const THEMES: Theme[] = ["paper", "apple"];

export const THEME_LABELS: Record<Theme, string> = {
  paper: "Paper & Ink",
  apple: "Apple Clean",
};

export function normalizeTheme(value: unknown): Theme {
  return value === "apple" ? "apple" : "paper";
}

export function themeClass(theme: Theme): string {
  return theme === "apple" ? "theme-apple" : "theme-paper";
}
