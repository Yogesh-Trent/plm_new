"use client";

import hot, { type Toast } from "react-hot-toast";
import {
  CheckCircle,
  Info,
  WarningCircle,
  X,
  type Icon,
} from "@phosphor-icons/react";

// Custom toast built on react-hot-toast. Same call shape as the previous library
// — toast.success(title, { description }) — so existing call sites keep working.
// Styled with Tailwind over the app's warm/paper palette (no external assets).

type ToastOptions = { description?: string };
type Variant = "success" | "error" | "info";

const VARIANTS: Record<
  Variant,
  { icon: Icon; iconClass: string; accent: string }
> = {
  success: {
    icon: CheckCircle,
    iconClass: "text-[var(--green)]",
    accent: "var(--green)",
  },
  error: {
    icon: WarningCircle,
    iconClass: "text-[var(--red)]",
    accent: "var(--red)",
  },
  info: {
    icon: Info,
    iconClass: "text-[var(--ink-soft)]",
    accent: "var(--line-strong)",
  },
};

function Card({
  t,
  variant,
  title,
  description,
}: {
  t: Toast;
  variant: Variant;
  title: string;
  description?: string;
}) {
  const { icon: Glyph, iconClass, accent } = VARIANTS[variant];
  return (
    <div
      className={`${
        t.visible ? "animate-custom-enter" : "animate-custom-leave"
      } pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_10px_34px_rgba(37,39,42,0.14)]`}
      style={{ borderLeft: `3px solid ${accent}` }}
      role="status"
      aria-live="polite"
    >
      <div className="flex w-0 flex-1 items-start gap-3 p-3.5">
        <Glyph size={20} weight="fill" className={`mt-0.5 shrink-0 ${iconClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[var(--ink)]">{title}</p>
          {description && (
            <p className="mt-0.5 text-[12px] leading-snug text-[var(--muted)]">
              {description}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => hot.dismiss(t.id)}
        aria-label="Dismiss"
        className="flex items-center justify-center border-l border-[var(--line)] px-3 text-[var(--muted)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)]"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}

function show(variant: Variant, title: string, options?: ToastOptions) {
  return hot.custom((t) => (
    <Card t={t} variant={variant} title={title} description={options?.description} />
  ));
}

export const toast = {
  success: (title: string, options?: ToastOptions) =>
    show("success", title, options),
  error: (title: string, options?: ToastOptions) => show("error", title, options),
  info: (title: string, options?: ToastOptions) => show("info", title, options),
  dismiss: hot.dismiss,
};
