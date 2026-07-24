"use client";

import { useTheme } from "./ThemeProvider";
import { THEMES, THEME_LABELS } from "@/app/lib/theme";

export function ThemeToggle({
  variant = "compact",
}: {
  variant?: "compact" | "labeled";
}) {
  const { theme, setTheme } = useTheme();

  const control = (
    <div className="theme-switch" role="group" aria-label="Appearance theme">
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          className={theme === option ? "selected" : ""}
          aria-pressed={theme === option}
          onClick={() => setTheme(option)}
          title={THEME_LABELS[option]}
        >
          {option === "paper" ? "Paper" : "Apple"}
        </button>
      ))}
    </div>
  );

  if (variant === "labeled") {
    return (
      <div className="theme-switch-row">
        <div className="theme-switch-copy">
          <strong>Appearance</strong>
          <span>Switch between the Paper &amp; Ink and Apple Clean looks.</span>
        </div>
        {control}
      </div>
    );
  }
  return control;
}
