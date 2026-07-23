"use client";

import {
  ArrowRight,
  ChartDonut,
  CheckCircle,
  GearSix,
  PenNib,
  Ruler,
  ShoppingBagOpen,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, ROLE_BLURBS, ROLE_LABELS, type Role } from "@/lib/roles";

const ROLE_ICONS = {
  designer: PenNib,
  buyer: ShoppingBagOpen,
  technologist: Ruler,
  all: ChartDonut,
  admin: GearSix,
} satisfies Record<Role, typeof PenNib>;

export function RolePicker() {
  const router = useRouter();
  const [pending, setPending] = useState<Role | null>(null);
  const [error, setError] = useState("");

  const choose = async (role: Role) => {
    setPending(role);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Sign-in failed");
      }
      router.push(`/${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setPending(null);
    }
  };

  return (
    <main className="auth-shell-v2" id="main-content">
      <section className="auth-story" aria-labelledby="auth-title">
        <div className="auth-brand-v2">
          <span className="auth-brand-mark">TL</span>
          <span>Threadline PLM</span>
        </div>
        <div className="auth-story-copy">
          <p className="workspace-eyebrow">
            One product record. Every decision.
          </p>
          <h1 id="auth-title">Move a collection from concept to commitment.</h1>
          <p>
            A focused operating space for style, technical, sourcing, and
            purchase-order teams.
          </p>
        </div>
        <div className="auth-proof" aria-label="Platform benefits">
          <span>
            <CheckCircle weight="fill" /> Live product record
          </span>
          <span>
            <CheckCircle weight="fill" /> Role-aware work queues
          </span>
          <span>
            <CheckCircle weight="fill" /> Traceable approvals
          </span>
        </div>
        <p className="auth-version">Product workspace · 2026</p>
      </section>

      <section className="auth-access" aria-labelledby="role-title">
        <div className="auth-access-head">
          <p className="workspace-kicker">Workspace access</p>
          <h2 id="role-title">Choose how you’re working today</h2>
          <p>Your role opens the right work queue and permissions.</p>
        </div>

        <div className="role-grid-v2">
          {ROLES.map((role) => {
            const Icon = ROLE_ICONS[role];
            return (
              <button
                key={role}
                className="role-option-v2"
                disabled={pending !== null}
                aria-busy={pending === role}
                onClick={() => choose(role)}
              >
                <span className="role-icon-v2">
                  <Icon size={21} />
                </span>
                <span className="role-copy-v2">
                  <strong>{ROLE_LABELS[role]}</strong>
                  <span>{ROLE_BLURBS[role]}</span>
                </span>
                <span className="role-arrow-v2" aria-hidden="true">
                  {pending === role ? (
                    <span className="auth-spinner" />
                  ) : (
                    <ArrowRight size={19} />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="auth-error-v2" role="alert">
            {error}
          </p>
        )}
        <p className="auth-security-note">
          This demo uses signed role sessions. Production identity can replace
          this screen without changing the workspace.
        </p>
      </section>
    </main>
  );
}
