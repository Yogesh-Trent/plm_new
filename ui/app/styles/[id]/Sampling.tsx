"use client";

import { useEffect, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";

type Sample = {
  id: string;
  sample_code: string | null;
  sealer: string | null;
  sample_type: string | null;
  vendor: string | null;
  status: string;
  comments: string | null;
};
type Options = { sealers: string[]; sampleTypes: string[]; inspectionTypes: string[]; vendors: string[] };

const STATUSES = ["pending", "submitted", "approved", "rejected"];
const EMPTY = { sealer: "", sampleType: "", vendor: "", comments: "" };

export function Sampling({
  styleId,
  onCount,
}: {
  styleId: string;
  onCount?: (count: number) => void;
}) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/styles/${styleId}/samples`).then((r) => (r.ok ? r.json() : { samples: [] })),
      fetch("/api/sampling-options").then((r) => (r.ok ? r.json() : { options: null })),
    ])
      .then(([s, o]) => {
        if (!alive) return;
        setSamples(s.samples ?? []);
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

  // Report the live sample count up to the parent for the tab badge.
  useEffect(() => {
    if (!loading) onCount?.(samples.length);
  }, [samples, loading, onCount]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.sealer && !form.sampleType) {
      setError("Pick a sealer or sample type.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/styles/${styleId}/samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not add sample.");
      setSamples((c) => [...c, data.sample]);
      setForm({ ...EMPTY });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add sample.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (sample: Sample, status: string) => {
    const response = await fetch(`/api/samples/${sample.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.sample) setSamples((c) => c.map((s) => (s.id === sample.id ? data.sample : s)));
  };

  const remove = async (sample: Sample) => {
    if (!window.confirm(`Delete sample ${sample.sample_code}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/samples/${sample.id}`, { method: "DELETE" });
      if (response.ok) setSamples((c) => c.filter((s) => s.id !== sample.id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="season-create">
      <h2>Sampling</h2>
      <form className="combo-form" onSubmit={submit}>
        <div className="season-fields">
          <label className="season-field"><span>Sealer</span>
            <select value={form.sealer} onChange={(e) => setForm({ ...form, sealer: e.target.value })}>
              <option value="">Select…</option>
              {options?.sealers.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="season-field"><span>Sample type</span>
            <select value={form.sampleType} onChange={(e) => setForm({ ...form, sampleType: e.target.value })}>
              <option value="">Select…</option>
              {options?.sampleTypes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="season-field"><span>Vendor</span>
            <select value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
              <option value="">Select…</option>
              {options?.vendors.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="season-field"><span>Comments</span>
            <input value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
          </label>
        </div>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="season-actions">
          <button type="submit" className="primary-button" disabled={busy}><Plus size={16} /> Add sample</button>
        </div>
      </form>

      {loading ? (
        <p className="season-empty">Loading…</p>
      ) : samples.length === 0 ? (
        <p className="season-empty">No samples yet.</p>
      ) : (
        <div className="season-table-wrap">
          <table className="season-table">
            <thead><tr><th>Sample</th><th>Sealer</th><th>Type</th><th>Vendor</th><th>Comments</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {samples.map((s) => (
                <tr key={s.id}>
                  <td className="season-name-cell">{s.sample_code}</td>
                  <td>{s.sealer || "—"}</td>
                  <td>{s.sample_type || "—"}</td>
                  <td>{s.vendor || "—"}</td>
                  <td>{s.comments || "—"}</td>
                  <td>
                    <select className={s.status === "approved" ? "status-select is-ok" : s.status === "rejected" ? "status-select is-bad" : "status-select"} value={s.status} onChange={(e) => setStatus(s, e.target.value)}>
                      {STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    <button type="button" className="icon-action is-danger" onClick={() => remove(s)} disabled={busy} title="Delete" aria-label="Delete sample"><Trash size={16} /></button>
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
