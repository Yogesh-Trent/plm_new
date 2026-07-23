"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowSquareOut, Plus, Trash } from "@phosphor-icons/react";

type Request = {
  id: string;
  request_code: string | null;
  vendor: string | null;
  request_template: string | null;
  data_package_template: string | null;
  issue_date: string | null;
  state: string;
  tech_approval_status: string;
};
type Quote = {
  id: string;
  quote_code: string | null;
  supplier: string | null;
  state: string;
  product_cost: string | null;
  mrp: string | null;
  margin_pct: string | null;
  selected: boolean;
};

const EMPTY = { supplier: "", countryOfOrigin: "India", currency: "INR", colors: "", sizes: "" };

function money(v: string | null) {
  return v == null || v === "" ? "—" : Number(v).toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

export function SupplierRequestDetail({
  request,
  initialQuotes,
  styleName,
  styleCode,
  styleId,
}: {
  request: Request;
  initialQuotes: Quote[];
  styleName: string | null;
  styleCode: string | null;
  styleId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(request.state);
  const [tech, setTech] = useState(request.tech_approval_status);
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [vendors, setVendors] = useState<string[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/sourcing-options")
      .then((r) => (r.ok ? r.json() : { options: null }))
      .then((o) => {
        if (alive && o.options) setVendors(o.options.vendors ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const patchRequest = async (patch: Record<string, unknown>) => {
    setError("");
    const response = await fetch(`/api/supplier-requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? "Could not update.");
      return;
    }
    if (data.request) {
      setState(data.request.state);
      setTech(data.request.tech_approval_status);
    }
    router.refresh();
  };

  const addQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.supplier) {
      setError("Supplier is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/supplier-requests/${request.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not add quote.");
      setQuotes((c) => [...c, data.quote]);
      setForm({ ...EMPTY });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add quote.");
    } finally {
      setSubmitting(false);
    }
  };

  const removeQuote = async (q: Quote) => {
    if (!window.confirm(`Delete quote ${q.quote_code}?`)) return;
    setBusyId(q.id);
    try {
      const response = await fetch(`/api/supplier-quotes/${q.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete.");
      setQuotes((c) => c.filter((x) => x.id !== q.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="styles-page">
      <header className="styles-topbar">
        <Link href={`/styles/${styleId}`} className="process-back">
          <ArrowLeft size={16} /> {styleName || "Style"}
        </Link>
        <div className="styles-title">
          <p className="process-eyebrow">Supplier request · {request.request_code} · {styleCode}</p>
          <h1>{request.vendor || "Supplier request"}</h1>
        </div>
      </header>

      <div className="styles-body">
        <section className="season-create">
          <h2>Request</h2>
          <div className="season-fields">
            <label className="season-field">
              <span>State</span>
              <select value={state} onChange={(e) => patchRequest({ state: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="complete">Complete</option>
              </select>
            </label>
            <label className="season-field">
              <span>Tech approval</span>
              <select value={tech} onChange={(e) => patchRequest({ techApprovalStatus: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="season-field">
              <span>Template</span>
              <input value={request.request_template ?? "—"} readOnly disabled />
            </label>
            <label className="season-field">
              <span>Data package</span>
              <input value={request.data_package_template ?? "—"} readOnly disabled />
            </label>
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
        </section>

        <section className="season-list">
          <h2>Supplier quotes ({quotes.length})</h2>
          <form className="combo-form" onSubmit={addQuote}>
            <div className="season-fields">
              <label className="season-field">
                <span>Supplier *</span>
                <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
                  <option value="">Select supplier…</option>
                  {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="season-field"><span>Country of origin</span>
                <input value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })} />
              </label>
              <label className="season-field"><span>Currency</span>
                <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </label>
              <label className="season-field"><span>Colours</span>
                <input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} />
              </label>
              <label className="season-field"><span>Sizes</span>
                <input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} />
              </label>
            </div>
            <div className="season-actions">
              <button type="submit" className="primary-button" disabled={submitting}>
                <Plus size={16} /> {submitting ? "Adding…" : "New supplier quote"}
              </button>
            </div>
          </form>

          {quotes.length === 0 ? (
            <p className="season-empty">No quotes yet.</p>
          ) : (
            <div className="season-table-wrap">
              <table className="season-table">
                <thead>
                  <tr>
                    <th>Quote</th><th>Supplier</th><th>Landed cost</th><th>MRP</th>
                    <th>Margin %</th><th>Selected</th><th>State</th><th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id}>
                      <td className="season-name-cell">
                        <Link href={`/supplier-quotes/${q.id}`} className="style-name-link">{q.quote_code}</Link>
                      </td>
                      <td>{q.supplier || "—"}</td>
                      <td>{money(q.product_cost)}</td>
                      <td>{money(q.mrp)}</td>
                      <td>{q.margin_pct == null ? "—" : `${Number(q.margin_pct).toFixed(1)}%`}</td>
                      <td>{q.selected ? "✓" : "—"}</td>
                      <td>
                        <span className={q.state === "approved" ? "status-pill is-active" : "status-pill is-inactive"}>
                          <span className="status-dot" />{q.state}
                        </span>
                      </td>
                      <td>
                        <div className="season-row-actions">
                          <Link href={`/supplier-quotes/${q.id}`} className="icon-action" title="Open" aria-label="Open quote">
                            <ArrowSquareOut size={16} />
                          </Link>
                          <button type="button" className="icon-action is-danger" onClick={() => removeQuote(q)} disabled={busyId === q.id} title="Delete" aria-label="Delete quote">
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
      </div>
    </div>
  );
}
