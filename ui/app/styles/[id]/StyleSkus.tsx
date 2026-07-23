"use client";

import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";

type Sku = {
  id: string;
  unique_id: string | null;
  size: string | null;
  colour_family: string | null;
  store_grade: string | null;
  pack: string | null;
  matkl_group: string | null;
  supplier_quote_id: string | null;
  quote_code: string | null;
  mrp: string | null;
};
type Combo = { id: string; name: string };
type Quote = { id: string; quote_code: string | null };

const DEFAULT_SIZES = "XS,S,M,L,XL,XXL";

export function StyleSkus({ styleId }: { styleId: string }) {
  const [skus, setSkus] = useState<Sku[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sizes, setSizes] = useState(DEFAULT_SIZES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/styles/${styleId}/skus`)
      .then((r) => (r.ok ? r.json() : { skus: [], combos: [], approvedQuotes: [] }))
      .then((d) => {
        if (!alive) return;
        setSkus(d.skus ?? []);
        setCombos(d.combos ?? []);
        setQuotes(d.approvedQuotes ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [styleId]);

  const toggle = (id: string) =>
    setPicked((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const generate = async () => {
    const sizeList = sizes.split(",").map((s) => s.trim()).filter(Boolean);
    if (picked.size === 0 || sizeList.length === 0) {
      setError("Pick at least one colour combo and one size.");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      const response = await fetch(`/api/styles/${styleId}/skus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboIds: Array.from(picked), sizes: sizeList }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not generate SKUs.");
      setSkus(data.skus ?? []);
      setNote(`${data.created} SKU(s) created.`);
      setPicked(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate SKUs.");
    } finally {
      setBusy(false);
    }
  };

  const patchSku = async (id: string, patch: Record<string, unknown>) => {
    const response = await fetch(`/api/skus/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.sku) setSkus((c) => c.map((s) => (s.id === id ? data.sku : s)));
  };

  const remove = async (sku: Sku) => {
    if (!window.confirm(`Delete SKU ${sku.unique_id}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/skus/${sku.id}`, { method: "DELETE" });
      if (response.ok) setSkus((c) => c.filter((s) => s.id !== sku.id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="season-create">
      <h2>SKUs</h2>
      <p className="styles-note" style={{ marginTop: 0 }}>
        Generate a colour × size matrix, then link an approved supplier quote to price each SKU.
      </p>

      {loading ? (
        <p className="season-empty">Loading…</p>
      ) : combos.length === 0 ? (
        <p className="styles-hint">Add colour combos first — SKUs are per colour × size.</p>
      ) : (
        <div className="sku-matrix">
          <div className="sku-combo-picks">
            {combos.map((c) => (
              <label key={c.id} className="sku-pick">
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
          <label className="season-field" style={{ maxWidth: 360 }}>
            <span>Sizes (comma-separated)</span>
            <input value={sizes} onChange={(e) => setSizes(e.target.value)} />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <div className="season-actions" style={{ justifyContent: "flex-start" }}>
            {note && <span className="detail-saved">{note}</span>}
            <button type="button" className="primary-button" onClick={generate} disabled={busy}>
              Generate SKUs
            </button>
          </div>
        </div>
      )}

      {skus.length > 0 && (
        <div className="season-table-wrap" style={{ marginTop: 16 }}>
          <table className="season-table">
            <thead>
              <tr>
                <th>Unique id</th><th>Size</th><th>Colour family</th><th>Store grade</th>
                <th>Pack</th><th>MATKL group</th><th>Supplier quote</th><th>MRP</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => (
                <tr key={sku.id}>
                  <td className="season-name-cell">{sku.unique_id}</td>
                  <td>{sku.size || "—"}</td>
                  <td>{sku.colour_family || "—"}</td>
                  <td>
                    <input className="sku-inline" defaultValue={sku.store_grade ?? ""} onBlur={(e) => patchSku(sku.id, { storeGrade: e.target.value })} />
                  </td>
                  <td>
                    <input className="sku-inline sku-inline-sm" defaultValue={sku.pack ?? ""} onBlur={(e) => patchSku(sku.id, { pack: e.target.value })} />
                  </td>
                  <td>{sku.matkl_group || "—"}</td>
                  <td>
                    <select value={sku.supplier_quote_id ?? ""} onChange={(e) => patchSku(sku.id, { supplierQuoteId: e.target.value })}>
                      <option value="">— none —</option>
                      {quotes.map((q) => <option key={q.id} value={q.id}>{q.quote_code}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="sku-inline sku-inline-sm" defaultValue={sku.mrp ?? ""} inputMode="decimal" onBlur={(e) => patchSku(sku.id, { mrp: e.target.value })} />
                  </td>
                  <td>
                    <button type="button" className="icon-action is-danger" onClick={() => remove(sku)} disabled={busy} title="Delete SKU" aria-label="Delete SKU">
                      <Trash size={16} />
                    </button>
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
