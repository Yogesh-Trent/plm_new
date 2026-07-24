"use client";

import { FileText, Sparkle } from "@phosphor-icons/react";
import { useTheme } from "./ThemeProvider";
import { THEME_LABELS } from "@/app/lib/theme";

export function ThemeToggle({
  variant = "compact",
}: {
  variant?: "compact" | "labeled";
}) {
  const { theme, toggle } = useTheme();

  // The icon shows the theme you'll switch TO on click: sparkle → Apple Clean,
  // paper/article → Paper & Ink. The tooltip and aria-label spell it out.
  const next = theme === "apple" ? "paper" : "apple";
  const nextLabel = THEME_LABELS[next];
  const hint = `Switch to ${nextLabel}`;

  const button = (
    <button
      type="button"
      className="theme-icon-toggle"
      onClick={toggle}
      title={hint}
      aria-label={hint}
      data-theme={theme}
    >
      {theme === "apple" ? (
        <FileText size={19} weight="regular" />
      ) : (
        <Sparkle size={19} weight="fill" />
      )}
    </button>
  );

  if (variant === "labeled") {
    return (
      <div className="theme-switch-row">
        <div className="theme-switch-copy">
          <strong>Appearance</strong>
          <span>
            Currently {THEME_LABELS[theme]}. Tap to switch to {nextLabel}.
          </span>
        </div>
        {button}
      </div>
    );
  }
  return button;
}
