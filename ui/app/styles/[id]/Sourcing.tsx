"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowSquareOut,
  CaretDown,
  CaretRight,
  Plus,
  Trash,
} from "@phosphor-icons/react";

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

const EMPTY = { vendor: "", requestTemplate: "", dataPackageTemplate: "", issueDate: "" };
const EMPTY_QUOTE = {
  supplier: "",
  countryOfOrigin: "India",
  currency: "INR",
  colors: "",
  sizes: "",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function money(v: string | null) {
  return v == null || v === ""
    ? "—"
    : Number(v).toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

// Inline quotes editor — add/manage a request's supplier quotes under its
// expanded row, so quotes are handled without opening the request detail page.
// Reuses /api/supplier-requests/[id]/quotes and /api/supplier-quotes/[id].
function RequestQuotesInline({
  requestId,
  vendors,
  onCountChange,
}: {
  requestId: string;
  vendors: string[];
  onCountChange: (count: number) => void;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_QUOTE });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/supplier-requests/${requestId}/quotes`)
      .then((r) => (r.ok ? r.json() : { quotes: [] }))
      .then((data) => {
        if (alive) setQuotes(data.quotes ?? []);
      })
      .catch(() => {
        if (alive) setError("Quotes could not be loaded.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [requestId]);

  const addQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.supplier) {
      setError("Supplier is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/supplier-requests/${requestId}/quotes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not add quote.");
      setQuotes((c) => {
        const next = [...c, data.quote];
        onCountChange(next.length);
        return next;
      });
      setForm({ ...EMPTY_QUOTE });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add quote.");
    } finally {
      setSubmitting(false);
    }
  };

  const removeQuote = async (q: Quote) => {
    setBusyId(q.id);
    try {
      const response = await fetch(`/api/supplier-quotes/${q.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not delete.");
      setQuotes((c) => {
        const next = c.filter((x) => x.id !== q.id);
        onCountChange(next.length);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bom-inline-lines">
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
      {error && <p className="login-error" role="alert">{error}</p>}

      {loading ? (
        <p className="season-empty">Loading quotes…</p>
      ) : quotes.length === 0 ? (
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
    </div>
  );
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) =>
    setExpandedId((current) => (current === id ? null : id));

  const setQuoteCount = (id: string, count: number) =>
    setRequests((current) =>
      current.map((r) => (r.id === id ? { ...r, quote_count: count } : r)),
    );

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
      // Expand the new request so quotes can be added right here.
      setExpandedId(data.request.id);
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
                <th aria-label="Expand" />
                <th>Request</th><th>Vendor</th><th>Template</th><th>Issue date</th>
                <th>Quotes</th><th>Tech approval</th><th>State</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const expanded = expandedId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className={expanded ? "is-expanded-row" : undefined}>
                      <td>
                        <button
                          type="button"
                          className="icon-action"
                          onClick={() => toggleExpanded(r.id)}
                          aria-expanded={expanded}
                          aria-label={expanded ? "Hide quotes" : "Show quotes"}
                          title={expanded ? "Hide quotes" : "Manage quotes"}
                        >
                          {expanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
                        </button>
                      </td>
                      <td className="season-name-cell">
                        <button type="button" className="bom-name-toggle style-name-link" onClick={() => toggleExpanded(r.id)}>
                          {r.request_code}
                        </button>
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
                          <Link href={`/supplier-requests/${r.id}`} className="icon-action" title="Open full request" aria-label="Open request">
                            <ArrowSquareOut size={16} />
                          </Link>
                          <button type="button" className="icon-action is-danger" onClick={() => remove(r)} disabled={busyId === r.id} title="Delete" aria-label="Delete request">
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="inline-expand-row">
                        <td colSpan={9}>
                          <RequestQuotesInline
                            requestId={r.id}
                            vendors={options?.vendors ?? []}
                            onCountChange={(count) => setQuoteCount(r.id, count)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
