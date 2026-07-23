import {
  CircleNotch,
  MagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

type OperationalPageProps = {
  children: ReactNode;
};

type OperationalHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

type OperationalPanelProps = {
  title?: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  variant?: "default" | "form";
};

type OperationalStateProps = {
  kind: "loading" | "empty" | "error";
  title: string;
  detail?: string;
  action?: ReactNode;
};

export function OperationalPage({ children }: OperationalPageProps) {
  return <main className="operational-page-v2">{children}</main>;
}

export function OperationalHeader({
  eyebrow,
  title,
  description,
  actions,
}: OperationalHeaderProps) {
  return (
    <header className="operational-header-v2">
      <div className="operational-title-v2">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {description && <span>{description}</span>}
      </div>
      {actions && (
        <div className="operational-header-actions-v2">{actions}</div>
      )}
    </header>
  );
}

export function OperationalContent({ children }: OperationalPageProps) {
  return <div className="operational-content-v2">{children}</div>;
}

export function OperationalPanel({
  title,
  count,
  actions,
  children,
  variant = "default",
}: OperationalPanelProps) {
  const labelled = title
    ? `${title.toLowerCase().replaceAll(" ", "-")}-title`
    : undefined;

  return (
    <section
      className={`operational-panel-v2${variant === "form" ? " is-form" : ""}`}
      aria-labelledby={labelled}
    >
      {(title || actions) && (
        <div className="operational-panel-head-v2">
          {title && (
            <div>
              <h2 id={labelled}>{title}</h2>
              {typeof count === "number" && (
                <span>
                  {count} {count === 1 ? "record" : "records"}
                </span>
              )}
            </div>
          )}
          {actions && <div className="operational-toolbar-v2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function OperationalState({
  kind,
  title,
  detail,
  action,
}: OperationalStateProps) {
  const Icon =
    kind === "loading"
      ? CircleNotch
      : kind === "error"
        ? WarningCircle
        : MagnifyingGlass;

  return (
    <div
      className={`operational-state-v2 is-${kind}`}
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon
        size={22}
        className={kind === "loading" ? "is-spinning" : undefined}
      />
      <div>
        <strong>{title}</strong>
        {detail && <p>{detail}</p>}
      </div>
      {action && <div className="operational-state-action-v2">{action}</div>}
    </div>
  );
}

export function OperationalTableRegion({ children }: OperationalPageProps) {
  return <div className="operational-table-region-v2">{children}</div>;
}
