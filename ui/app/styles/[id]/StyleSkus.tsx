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
const SIZE_PRESETS: Array<{ label: string; value: string }> = [
  { label: "Alpha", value: "XS,S,M,L,XL,XXL" },
  { label: "Numeric", value: "28,30,32,34,36,38,40" },
  { label: "One size", value: "OS" },
];

const parseSizes = (raw: string) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function StyleSkus({
  styleId,
  onCount,
  activeTab,
  stacked = false,
}: {
  styleId: string;
  onCount?: (count: number) => void;
  activeTab?: string;
  stacked?: boolean;
}) {
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
      // Load once the section is actually visible: either its tab is active
      // (tabs mode) or the whole record is stacked (stacked mode shows every
      // section at once, so activeTab stays "overview" — don't gate on it).
      if (!stacked && activeTab !== "skus") return;
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
    }, [styleId, activeTab, stacked]);

  // Report the live SKU count up to the parent for the tab badge.
  useEffect(() => {
    if (!loading) onCount?.(skus.length);
  }, [skus, loading, onCount]);

  const toggle = (id: string) =>
    setPicked((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const sizeChips = parseSizes(sizes);
  const removeSize = (target: string) =>
    setSizes(sizeChips.filter((s) => s !== target).join(","));

  const generate = async () => {
    const sizeList = parseSizes(sizes);
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
        <div className="sku-builder">
          <div className="sku-builder-grid">
            <div className="sku-builder-axis">
              <span className="sku-builder-label">Colourways</span>
              <div className="sku-chip-row">
                {combos.map((c) => {
                  const on = picked.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`sku-toggle${on ? " is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggle(c.id)}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sku-builder-axis">
              <div className="sku-builder-labelrow">
                <span className="sku-builder-label">Sizes</span>
                <div className="sku-presets">
                  {SIZE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="sku-preset"
                      onClick={() => setSizes(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sku-chip-row">
                {sizeChips.map((s) => (
                  <span key={s} className="sku-size-chip">
                    {s}
                    <button
                      type="button"
                      aria-label={`Remove size ${s}`}
                      onClick={() => removeSize(s)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="sku-size-input"
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                  placeholder="Edit sizes, comma-separated"
                  aria-label="Sizes, comma-separated"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <div className="sku-builder-foot">
            <span className="sku-builder-count">
              {picked.size > 0 && sizeChips.length > 0
                ? `${picked.size * sizeChips.length} SKU${picked.size * sizeChips.length === 1 ? "" : "s"} — ${picked.size} colourway${picked.size === 1 ? "" : "s"} × ${sizeChips.length} size${sizeChips.length === 1 ? "" : "s"}`
                : "Pick colourways and sizes to build the matrix"}
            </span>
            <div className="sku-builder-actions">
              {note && <span className="detail-saved">{note}</span>}
              <button
                type="button"
                className="primary-button"
                onClick={generate}
                disabled={busy || picked.size === 0 || sizeChips.length === 0}
              >
                {busy ? "Generating…" : "Generate SKUs"}
              </button>
            </div>
          </div>
        </div>
      )}

      {skus.length > 0 && (
        <div className="season-table-wrap sku-sheet" style={{ marginTop: 16 }}>
          <table className="season-table">
            <thead>
              <tr>
                <th>SKU</th><th>Colour family</th><th>Store grade</th>
                <th>Pack</th><th>MATKL group</th><th>Supplier quote</th><th>MRP</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => (
                <tr key={sku.id}>
                  <td className="sku-id-cell">
                    <span className="sku-id-code">{sku.unique_id}</span>
                    {sku.size && <span className="sku-size-badge">{sku.size}</span>}
                  </td>
                  <td>{sku.colour_family || "—"}</td>
                  <td>
                    <input className="sku-cell" defaultValue={sku.store_grade ?? ""} placeholder="—" onBlur={(e) => patchSku(sku.id, { storeGrade: e.target.value })} />
                  </td>
                  <td>
                    <input className="sku-cell sku-cell-sm" defaultValue={sku.pack ?? ""} placeholder="—" onBlur={(e) => patchSku(sku.id, { pack: e.target.value })} />
                  </td>
                  <td>{sku.matkl_group || "—"}</td>
                  <td>
                    <select className="sku-cell-select" value={sku.supplier_quote_id ?? ""} onChange={(e) => patchSku(sku.id, { supplierQuoteId: e.target.value })}>
                      <option value="">— none —</option>
                      {quotes.map((q) => <option key={q.id} value={q.id}>{q.quote_code}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className="sku-mrp">
                      <span className="sku-mrp-cur">₹</span>
                      <input className="sku-cell sku-cell-sm" defaultValue={sku.mrp ?? ""} placeholder="0.00" inputMode="decimal" onBlur={(e) => patchSku(sku.id, { mrp: e.target.value })} />
                    </span>
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
