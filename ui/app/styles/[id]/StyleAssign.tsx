"use client";

import { useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";

const ROLES = [
  { value: "designer", label: "Designer" },
  { value: "buyer", label: "Buyer" },
  { value: "technologist", label: "Technologist" },
  { value: "sourcing", label: "Sourcing" },
];

// Phase 5 — Style Assignment (Send To …): routes the style to a role's worklist.
export function StyleAssign({
  styleId,
  initialRole,
}: {
  styleId: string;
  initialRole: string | null;
}) {
  const [assigned, setAssigned] = useState<string | null>(initialRole);
  const [role, setRole] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const current = ROLES.find((r) => r.value === assigned)?.label ?? "Unassigned";

  const send = async (target: string | null) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/styles/${styleId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: target, comment }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not assign.");
      setAssigned(data.style?.assigned_role ?? null);
      setRole("");
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="season-create detail-meta">
      <h2>Assignment</h2>
      <dl>
        <div>
          <dt>Assigned to</dt>
          <dd>
            <span className={assigned ? "status-pill is-active" : "status-pill is-inactive"}>
              <span className="status-dot" />
              {current}
            </span>
          </dd>
        </div>
      </dl>
      <label className="season-field" style={{ marginTop: 10 }}>
        <span>Send to</span>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Select role…</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </label>
      <label className="season-field" style={{ marginTop: 8 }}>
        <span>Comment</span>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional" />
      </label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <div className="season-image-buttons" style={{ marginTop: 10 }}>
        <button type="button" className="primary-button" onClick={() => send(role)} disabled={busy || !role}>
          <PaperPlaneTilt size={15} /> Assign
        </button>
        {assigned && (
          <button type="button" className="ghost-button" onClick={() => send(null)} disabled={busy}>
            Unassign
          </button>
        )}
      </div>
    </section>
  );
}
