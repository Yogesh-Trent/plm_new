import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

type RecordHeaderProps = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function RecordHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  meta,
  actions,
}: RecordHeaderProps) {
  return (
    <header className="record-header-v3">
      <Link href={backHref} className="record-back-v3">
        <ArrowLeft size={16} /> {backLabel}
      </Link>
      <div className="record-heading-v3">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {meta && <div className="record-meta-v3">{meta}</div>}
      </div>
      {actions && <div className="record-header-actions-v3">{actions}</div>}
    </header>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="field-error-v3" role="alert">
      {message}
    </span>
  );
}
