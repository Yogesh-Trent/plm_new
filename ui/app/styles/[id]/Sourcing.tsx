"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, Plus, Trash } from "@phosphor-icons/react";

type Request = {
  id: string;
  request_code: string | null;
  vendor: string | null;
  request_template: string | null;
  data_package_template: string | null;
  issue_date: string | null;
  state: string;
  tech_approval_status: string;
  quote_count?: number;
};
type Options = {
  vendors: string[];
  requestTemplates: string[];
  dataPackageTemplates: string[];
  boms: Array<{ id: string; name: string; code: string | null }>;
};

const EMPTY = { vendor: "", requestTemplate: "", dataPackageTemplate: "", issueDate: "" };

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

// Phase 6 — Sourcing: supplier requests raised from this style.
export function Sourcing({ styleId }: { styleId: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/styles/${styleId}/supplier-requests`).then((r) => (r.ok ? r.json() : { requests: [] })),
      fetch("/api/sourcing-options").then((r) => (r.ok ? r.json() : { options: null })),
    ])
      .then(([rq, o]) => {
        if (!alive) return;
        setRequests(rq.requests ?? []);
        setOptions(o.options ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [styleId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.vendor) {
      setError("Vendor is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/styles/${styleId}/supplier-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: form.vendor,
          requestTemplate: form.requestTemplate || null,
          dataPackageTemplate: form.dataPackageTemplate || null,
          issueDate: form.issueDate || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not create request.");
      setRequests((c) => [...c, data.request]);
      setForm({ ...EMPTY });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create request.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (req: Request) => {
    if (!window.confirm(`Delete supplier request ${req.request_code}?`)) return;
    setBusyId(req.id);
    try {
      const response = await fetch(`/api/supplier-requests/${req.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete.");
      setRequests((c) => c.filter((r) => r.id !== req.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="season-create">
      <h2>Sourcing — supplier requests</h2>
      <form className="combo-form" onSubmit={submit}>
        <div className="season-fields">
          <label className="season-field">
            <span>Vendor *</span>
            <select value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
              <option value="">Select vendor…</option>
              {options?.vendors.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="season-field">
            <span>Request template</span>
            <select value={form.requestTemplate} onChange={(e) => setForm({ ...form, requestTemplate: e.target.value })}>
              <option value="">Select…</option>
              {options?.requestTemplates.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="season-field">
            <span>Data package template</span>
            <select value={form.dataPackageTemplate} onChange={(e) => setForm({ ...form, dataPackageTemplate: e.target.value })}>
              <option value="">Select…</option>
              {options?.dataPackageTemplates.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="season-field">
            <span>Issue date</span>
            <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          </label>
        </div>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="season-actions">
          <button type="submit" className="primary-button" disabled={submitting}>
            <Plus size={16} /> {submitting ? "Creating…" : "New supplier request"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="season-empty">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="season-empty">No supplier requests yet.</p>
      ) : (
        <div className="season-table-wrap">
          <table className="season-table">
            <thead>
              <tr>
                <th>Request</th><th>Vendor</th><th>Template</th><th>Issue date</th>
                <th>Quotes</th><th>Tech approval</th><th>State</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="season-name-cell">
                    <Link href={`/supplier-requests/${r.id}`} className="style-name-link">{r.request_code}</Link>
                  </td>
                  <td>{r.vendor || "—"}</td>
                  <td>{r.request_template || "—"}</td>
                  <td>{fmt(r.issue_date)}</td>
                  <td><span className="combo-count-pill">{r.quote_count ?? 0}</span></td>
                  <td>{r.tech_approval_status}</td>
                  <td>
                    <span className={r.state === "issued" || r.state === "complete" ? "status-pill is-active" : "status-pill is-inactive"}>
                      <span className="status-dot" />{r.state}
                    </span>
                  </td>
                  <td>
                    <div className="season-row-actions">
                      <Link href={`/supplier-requests/${r.id}`} className="icon-action" title="Open" aria-label="Open request">
                        <ArrowSquareOut size={16} />
                      </Link>
                      <button type="button" className="icon-action is-danger" onClick={() => remove(r)} disabled={busyId === r.id} title="Delete" aria-label="Delete request">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
