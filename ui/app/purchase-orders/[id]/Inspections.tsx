"use client";

import { useEffect, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { DatePicker } from "@/app/components/DatePicker";

type Inspection = {
  id: string;
  inspection_code: string | null;
  inspection_type: string | null;
  inspection_date: string | null;
  inspector: string | null;
  quantity_inspected: string | null;
  aql: string | null;
  result: string;
};

const RESULTS = ["pending", "pass", "fail"];
const EMPTY = { inspectionType: "", inspectionDate: "", inspector: "", quantityInspected: "", aql: "" };

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function Inspections({ poId }: { poId: string }) {
  const [rows, setRows] = useState<Inspection[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/supplier-pos/${poId}/inspections`).then((r) => (r.ok ? r.json() : { inspections: [] })),
      fetch("/api/sampling-options").then((r) => (r.ok ? r.json() : { options: null })),
    ])
      .then(([i, o]) => {
        if (!alive) return;
        setRows(i.inspections ?? []);
        if (o.options) setTypes(o.options.inspectionTypes ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [poId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.inspectionType) {
      setError("Inspection type is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/supplier-pos/${poId}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not add inspection.");
      setRows((c) => [...c, data.inspection]);
      setForm({ ...EMPTY });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add inspection.");
    } finally {
      setBusy(false);
    }
  };

  const setResult = async (insp: Inspection, result: string) => {
    const response = await fetch(`/api/inspections/${insp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.inspection) setRows((c) => c.map((r) => (r.id === insp.id ? data.inspection : r)));
  };

  const remove = async (insp: Inspection) => {
    if (!window.confirm(`Delete inspection ${insp.inspection_code}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/inspections/${insp.id}`, { method: "DELETE" });
      if (response.ok) setRows((c) => c.filter((r) => r.id !== insp.id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="season-create">
      <h2>Inspections</h2>
      <form className="combo-form" onSubmit={submit}>
        <div className="season-fields">
          <label className="season-field"><span>Type *</span>
            <select value={form.inspectionType} onChange={(e) => setForm({ ...form, inspectionType: e.target.value })}>
              <option value="">Select…</option>
              {types.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="season-field"><span>Date</span>
            <DatePicker value={form.inspectionDate} onChange={(v) => setForm({ ...form, inspectionDate: v })} ariaLabel="Inspection date" />
          </label>
          <label className="season-field"><span>Inspector</span>
            <input value={form.inspector} onChange={(e) => setForm({ ...form, inspector: e.target.value })} />
          </label>
          <label className="season-field"><span>Qty inspected</span>
            <input value={form.quantityInspected} inputMode="numeric" onChange={(e) => setForm({ ...form, quantityInspected: e.target.value })} />
          </label>
          <label className="season-field"><span>AQL</span>
            <input value={form.aql} onChange={(e) => setForm({ ...form, aql: e.target.value })} placeholder="e.g. 2.5" />
          </label>
        </div>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="season-actions">
          <button type="submit" className="ghost-button" disabled={busy}><Plus size={15} /> Add inspection</button>
        </div>
      </form>

      {loading ? (
        <p className="season-empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="season-empty">No inspections yet.</p>
      ) : (
        <div className="season-table-wrap">
          <table className="season-table">
            <thead><tr><th>Inspection</th><th>Type</th><th>Date</th><th>Inspector</th><th>Qty</th><th>AQL</th><th>Result</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="season-name-cell">{r.inspection_code}</td>
                  <td>{r.inspection_type || "—"}</td>
                  <td>{fmt(r.inspection_date)}</td>
                  <td>{r.inspector || "—"}</td>
                  <td>{r.quantity_inspected ?? "—"}</td>
                  <td>{r.aql || "—"}</td>
                  <td>
                    <select className={r.result === "pass" ? "status-select is-ok" : r.result === "fail" ? "status-select is-bad" : "status-select"} value={r.result} onChange={(e) => setResult(r, e.target.value)}>
                      {RESULTS.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    <button type="button" className="icon-action is-danger" onClick={() => remove(r)} disabled={busy} title="Delete" aria-label="Delete inspection"><Trash size={16} /></button>
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
