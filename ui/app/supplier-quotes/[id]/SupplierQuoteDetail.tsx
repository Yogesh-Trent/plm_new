"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import { useSetRecordHeader } from "@/app/components/RecordHeaderContext";

type Quote = {
  id: string;
  quote_code: string | null;
  supplier: string | null;
  country_of_origin: string | null;
  currency: string | null;
  state: string;
  target_price: string | null;
  bom_id: string | null;
  material_total: string | null;
  product_cost: string | null;
  mrp: string | null;
  margin_pct: string | null;
  colors: string | null;
  sizes: string | null;
  selected: boolean;
  cost: Record<string, unknown>;
};
type Line = {
  id: string;
  placement_name: string | null;
  main_material: string | null;
  bom_section: string | null;
  product: string | null;
  qty: string | null;
  unit_cost: string | null;
  material_total: string | null;
};

// Editable cost-sheet keys (numbers). Roll-up is computed server-side.
const COST_FIELDS: Array<{ key: string; label: string; suffix?: string }> = [
  { key: "raw_material_total", label: "Raw material total" },
  { key: "trim_total", label: "Trim total" },
  { key: "packaging_total", label: "Packaging total" },
  { key: "services_total", label: "Services / details total" },
  { key: "cmp", label: "CMP" },
  { key: "overhead_pct", label: "Overhead", suffix: "%" },
  { key: "profit_margin_pct", label: "Profit margin", suffix: "%" },
  { key: "bed_pct", label: "BED", suffix: "%" },
  { key: "cvd_pct", label: "CVD", suffix: "%" },
  { key: "sad_pct", label: "SAD", suffix: "%" },
  { key: "zswc_pct", label: "ZSWC", suffix: "%" },
  { key: "mrp", label: "MRP" },
];
const EMPTY_LINE = { placementName: "", mainMaterial: "", bomSection: "", product: "", qty: "", unitCost: "" };

function money(v: string | null) {
  return v == null || v === "" ? "—" : Number(v).toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

export function SupplierQuoteDetail({
  quote,
  initialLines,
  boms,
  canApprove,
}: {
  quote: Quote;
  initialLines: Line[];
  boms: Array<{ id: string; name: string; code: string | null }>;
  canApprove: boolean;
  roleLabel: string;
}) {
  const router = useRouter();
  const [header, setHeader] = useState({
    supplier: quote.supplier ?? "",
    countryOfOrigin: quote.country_of_origin ?? "",
    currency: quote.currency ?? "",
    targetPrice: quote.target_price ?? "",
    bomId: quote.bom_id ?? "",
    selected: quote.selected,
  });
  const initCost: Record<string, string> = {};
  for (const f of COST_FIELDS) initCost[f.key] = quote.cost?.[f.key] != null ? String(quote.cost[f.key]) : "";
  const [cost, setCost] = useState<Record<string, string>>(initCost);
  const [summary, setSummary] = useState({
    material_total: quote.material_total,
    product_cost: quote.product_cost,
    margin_pct: quote.margin_pct,
    state: quote.state,
  });
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [line, setLine] = useState({ ...EMPTY_LINE });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const patchQuote = async (patch: Record<string, unknown>, note = false) => {
    setError("");
    const response = await fetch(`/api/supplier-quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? "Could not save.");
      return false;
    }
    if (data.quote) {
      setSummary({
        material_total: data.quote.material_total,
        product_cost: data.quote.product_cost,
        margin_pct: data.quote.margin_pct,
        state: data.quote.state,
      });
    }
    if (note) setSaved(true);
    router.refresh();
    return true;
  };

  const saveCost = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const costNums: Record<string, number> = {};
    for (const f of COST_FIELDS) costNums[f.key] = Number(cost[f.key]) || 0;
    await patchQuote(
      {
        supplier: header.supplier || null,
        countryOfOrigin: header.countryOfOrigin || null,
        currency: header.currency || null,
        targetPrice: header.targetPrice === "" ? null : Number(header.targetPrice),
        bomId: header.bomId || null,
        selected: header.selected,
        cost: costNums,
      },
      true,
    );
    setSaving(false);
  };

  const addLine = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/supplier-quotes/${quote.id}/material-costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(line),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not add line.");
      setLines((c) => [...c, data.line]);
      setLine({ ...EMPTY_LINE });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add line.");
    } finally {
      setBusy(false);
    }
  };

  const removeLine = async (l: Line) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/quote-material-costs/${l.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete.");
      setLines((c) => c.filter((x) => x.id !== l.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  };

  const approved = summary.state === "approved";

  useSetRecordHeader({
    crumbs: [{ label: "Supplier quotes", href: "/supplier-quotes" }],
    title: header.supplier || "Supplier quote",
    status: {
      label: summary.state,
      tone: approved ? "active" : "neutral",
    },
    action: canApprove
      ? {
          label: approved ? "Un-approve" : "Approve quote",
          icon: "approve",
          ghost: approved,
          onClick: () =>
            patchQuote({ state: approved ? "draft" : "approved" }),
        }
      : undefined,
  });

  return (
    <div className="styles-page">

      {/* A <div>, not a <form>: the Material costs sub-form below would
          otherwise be an invalid nested form and break hydration. */}
      <div className="styles-body detail-grid">
        <div className="detail-main">
          <section className="season-create">
            <h2>Quote</h2>
            <div className="season-fields">
              <label className="season-field"><span>Supplier</span>
                <input value={header.supplier} onChange={(e) => setHeader({ ...header, supplier: e.target.value })} />
              </label>
              <label className="season-field"><span>Country of origin</span>
                <input value={header.countryOfOrigin} onChange={(e) => setHeader({ ...header, countryOfOrigin: e.target.value })} />
              </label>
              <label className="season-field"><span>Currency</span>
                <input value={header.currency} onChange={(e) => setHeader({ ...header, currency: e.target.value })} />
              </label>
              <label className="season-field"><span>Target price</span>
                <input value={header.targetPrice} inputMode="decimal" onChange={(e) => setHeader({ ...header, targetPrice: e.target.value })} />
              </label>
              <label className="season-field"><span>BOM</span>
                <select value={header.bomId} onChange={(e) => setHeader({ ...header, bomId: e.target.value })}>
                  <option value="">None</option>
                  {boms.map((b) => <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ""}</option>)}
                </select>
              </label>
              <label className="season-field"><span>Selected</span>
                <span className="obj-check"><input type="checkbox" checked={header.selected} onChange={(e) => setHeader({ ...header, selected: e.target.checked })} /></span>
              </label>
            </div>
          </section>

          <section className="season-create">
            <h2>Cost sheet</h2>
            <div className="season-fields">
              {COST_FIELDS.map((f) => (
                <label className="season-field" key={f.key}>
                  <span>{f.label}{f.suffix ? ` (${f.suffix})` : ""}</span>
                  <input
                    value={cost[f.key] ?? ""}
                    inputMode="decimal"
                    onChange={(e) => { setCost({ ...cost, [f.key]: e.target.value }); setSaved(false); }}
                  />
                </label>
              ))}
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="season-actions">
              {saved && <span className="detail-saved">Saved.</span>}
              <button type="button" className="primary-button" onClick={saveCost} disabled={saving}>
                <FloppyDisk size={16} /> {saving ? "Saving…" : "Save cost sheet"}
              </button>
            </div>
          </section>

          <section className="season-create">
            <h2>Material costs</h2>
            <form className="combo-form" onSubmit={addLine}>
              <div className="season-fields">
                <label className="season-field"><span>Placement</span>
                  <input value={line.placementName} onChange={(e) => setLine({ ...line, placementName: e.target.value })} />
                </label>
                <label className="season-field"><span>Main material</span>
                  <input value={line.mainMaterial} onChange={(e) => setLine({ ...line, mainMaterial: e.target.value })} />
                </label>
                <label className="season-field"><span>BOM section</span>
                  <input value={line.bomSection} onChange={(e) => setLine({ ...line, bomSection: e.target.value })} />
                </label>
                <label className="season-field"><span>Qty</span>
                  <input value={line.qty} inputMode="decimal" onChange={(e) => setLine({ ...line, qty: e.target.value })} />
                </label>
                <label className="season-field"><span>Unit cost</span>
                  <input value={line.unitCost} inputMode="decimal" onChange={(e) => setLine({ ...line, unitCost: e.target.value })} />
                </label>
              </div>
              <div className="season-actions">
                <button type="submit" className="ghost-button" disabled={busy}>
                  <Plus size={15} /> Add material cost
                </button>
              </div>
            </form>
            {lines.length === 0 ? (
              <p className="season-empty">No material cost lines.</p>
            ) : (
              <div className="season-table-wrap">
                <table className="season-table">
                  <thead><tr><th>Placement</th><th>Main material</th><th>BOM section</th><th>Qty</th><th>Unit cost</th><th>Total</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td className="season-name-cell">{l.placement_name || "—"}</td>
                        <td>{l.main_material || "—"}</td>
                        <td>{l.bom_section || "—"}</td>
                        <td>{l.qty ?? "—"}</td>
                        <td>{money(l.unit_cost)}</td>
                        <td>{money(l.material_total)}</td>
                        <td>
                          <button type="button" className="icon-action is-danger" onClick={() => removeLine(l)} disabled={busy} title="Delete" aria-label="Delete line">
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
        </div>

        <aside className="detail-aside">
          <section className="season-create detail-meta">
            <h2>Roll-up</h2>
            <dl>
              <div><dt>Material total</dt><dd>{money(summary.material_total)}</dd></div>
              <div><dt>Landed cost</dt><dd>{money(summary.product_cost)}</dd></div>
              <div><dt>MRP</dt><dd>{money(quote.mrp)}</dd></div>
              <div><dt>Margin</dt><dd>{summary.margin_pct == null ? "—" : `${Number(summary.margin_pct).toFixed(1)}%`}</dd></div>
              <div><dt>State</dt><dd>
                <span className={approved ? "status-pill is-active" : "status-pill is-inactive"}>
                  <span className="status-dot" />{summary.state}
                </span>
              </dd></div>
            </dl>
            <p className="styles-note" style={{ marginTop: 12 }}>
              Landed = (materials + overhead + CMP) + margin, then + BED/CVD/SAD/ZSWC
              duties. Simplified roll-up (see PHASES_5_7.md).
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
