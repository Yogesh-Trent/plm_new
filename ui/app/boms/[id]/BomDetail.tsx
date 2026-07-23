"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import { useSetRecordHeader } from "@/app/components/RecordHeaderContext";

type Bom = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  created_by: string | null;
};
type Line = {
  id: string;
  seq: number;
  component: string | null;
  category: string | null;
  material: string | null;
  colour: string | null;
  detail: string | null;
  quantity: string | null;
  uom: string | null;
};
type Combo = {
  combo_id: string;
  name: string;
  combo_code: string | null;
  style_id: string;
  style_name: string | null;
  style_code: string | null;
};

const EMPTY_LINE = {
  component: "",
  category: "",
  material: "",
  colour: "",
  detail: "",
  quantity: "",
  uom: "",
};

export function BomDetail({
  bom,
  initialLines,
  combos,
}: {
  bom: Bom;
  initialLines: Line[];
  combos: Combo[];
}) {
  const router = useRouter();
  const [header, setHeader] = useState({
    name: bom.name,
    description: bom.description ?? "",
    status: bom.status,
  });
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerSaved, setHeaderSaved] = useState(false);

  const [lines, setLines] = useState<Line[]>(initialLines);
  const [line, setLine] = useState({ ...EMPTY_LINE });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setL = (patch: Partial<typeof EMPTY_LINE>) =>
    setLine((current) => ({ ...current, ...patch }));

  const saveHeader = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!header.name.trim()) {
      setError("BOM name is required.");
      return;
    }
    setSavingHeader(true);
    setError("");
    try {
      const response = await fetch(`/api/boms/${bom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: header.name.trim(),
          description: header.description,
          status: header.status,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not save BOM.");
      }
      setHeaderSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save BOM.");
    } finally {
      setSavingHeader(false);
    }
  };

  const resetLine = () => {
    setLine({ ...EMPTY_LINE });
    setEditingId(null);
  };

  const submitLine = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = { ...line };
    try {
      const response = await fetch(
        editingId ? `/api/bom-lines/${editingId}` : `/api/boms/${bom.id}/lines`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save line.");
      setLines((current) =>
        editingId
          ? current.map((l) => (l.id === editingId ? data.line : l))
          : [...current, data.line],
      );
      resetLine();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save line.");
    } finally {
      setBusy(false);
    }
  };

  const editLine = (l: Line) => {
    setEditingId(l.id);
    setError("");
    setLine({
      component: l.component ?? "",
      category: l.category ?? "",
      material: l.material ?? "",
      colour: l.colour ?? "",
      detail: l.detail ?? "",
      quantity: l.quantity ?? "",
      uom: l.uom ?? "",
    });
  };

  const removeLine = async (l: Line) => {
    if (!window.confirm("Delete this material line?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/bom-lines/${l.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete line.");
      setLines((current) => current.filter((x) => x.id !== l.id));
      if (editingId === l.id) resetLine();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete line.");
    } finally {
      setBusy(false);
    }
  };

  const deleteBom = async () => {
    const response = await fetch(`/api/boms/${bom.id}`, { method: "DELETE" });
    if (response.ok) router.push("/boms");
  };

  useSetRecordHeader({
    crumbs: [{ label: "BOM library", href: "/boms" }],
    title: header.name || "Untitled BOM",
    status: {
      label: header.status === "active" ? "Active" : "Inactive",
      tone: header.status === "active" ? "active" : "inactive",
    },
    action: {
      label: "Save details",
      icon: "save",
      onClick: () => void saveHeader(),
      disabled: savingHeader,
      busy: savingHeader,
    },
    onDelete: {
      onConfirm: deleteBom,
      title: `Delete BOM "${bom.name}"?`,
      description: "This permanently removes the BOM and all of its lines.",
      confirmLabel: "Delete BOM",
    },
  });

  return (
    <div className="styles-page">
      <div className="styles-body">
        <section className="season-create">
          <h2>BOM details</h2>
          <form onSubmit={saveHeader}>
            <div className="season-fields">
              <label className="season-field">
                <span>Name *</span>
                <input value={header.name} onChange={(e) => { setHeader({ ...header, name: e.target.value }); setHeaderSaved(false); }} />
              </label>
              <label className="season-field">
                <span>Description</span>
                <input value={header.description} onChange={(e) => { setHeader({ ...header, description: e.target.value }); setHeaderSaved(false); }} />
              </label>
              <label className="season-field">
                <span>Status</span>
                <select value={header.status} onChange={(e) => { setHeader({ ...header, status: e.target.value }); setHeaderSaved(false); }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            {headerSaved && (
              <div className="season-actions">
                <span className="detail-saved">Saved.</span>
              </div>
            )}
          </form>
        </section>

        <section className="season-create">
          <h2>Material lines</h2>
          <form className="combo-form" onSubmit={submitLine}>
            <div className="season-fields">
              <label className="season-field"><span>Component</span>
                <input value={line.component} onChange={(e) => setL({ component: e.target.value })} placeholder="e.g. Full Body" />
              </label>
              <label className="season-field"><span>Category</span>
                <input value={line.category} onChange={(e) => setL({ category: e.target.value })} placeholder="e.g. Fabrics" />
              </label>
              <label className="season-field"><span>Material</span>
                <input value={line.material} onChange={(e) => setL({ material: e.target.value })} placeholder="e.g. FKn01144" />
              </label>
              <label className="season-field"><span>Colour</span>
                <input value={line.colour} onChange={(e) => setL({ colour: e.target.value })} />
              </label>
              <label className="season-field"><span>Quantity</span>
                <input value={line.quantity} onChange={(e) => setL({ quantity: e.target.value })} inputMode="decimal" />
              </label>
              <label className="season-field"><span>UOM</span>
                <input value={line.uom} onChange={(e) => setL({ uom: e.target.value })} placeholder="e.g. m, pcs" />
              </label>
              <label className="season-field"><span>Detail</span>
                <input value={line.detail} onChange={(e) => setL({ detail: e.target.value })} />
              </label>
            </div>
            <div className="season-actions">
              {editingId && (
                <button type="button" className="ghost-button" onClick={resetLine}>Cancel</button>
              )}
              <button type="submit" className="primary-button" disabled={busy}>
                <Plus size={16} /> {editingId ? "Save line" : "Add line"}
              </button>
            </div>
          </form>
          {error && <p className="login-error" role="alert">{error}</p>}

          {lines.length === 0 ? (
            <p className="season-empty">No material lines yet.</p>
          ) : (
            <div className="season-table-wrap">
              <table className="season-table">
                <thead>
                  <tr>
                    <th>#</th><th>Component</th><th>Category</th><th>Material</th>
                    <th>Colour</th><th>Qty</th><th>UOM</th><th>Detail</th><th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className={editingId === l.id ? "is-editing" : undefined}>
                      <td>{l.seq}</td>
                      <td className="season-name-cell">{l.component || "—"}</td>
                      <td>{l.category || "—"}</td>
                      <td>{l.material || "—"}</td>
                      <td>{l.colour || "—"}</td>
                      <td>{l.quantity ?? "—"}</td>
                      <td>{l.uom || "—"}</td>
                      <td>{l.detail || "—"}</td>
                      <td>
                        <div className="season-row-actions">
                          <button type="button" className="icon-action" onClick={() => editLine(l)} disabled={busy} title="Edit line" aria-label="Edit line">
                            <FloppyDisk size={16} />
                          </button>
                          <button type="button" className="icon-action is-danger" onClick={() => removeLine(l)} disabled={busy} title="Delete line" aria-label="Delete line">
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

        <section className="season-list">
          <h2>Colour combos using this BOM ({combos.length})</h2>
          {combos.length === 0 ? (
            <p className="season-empty">
              No combos attached yet. Open a colour combo and use “Add to BOM(s)”.
            </p>
          ) : (
            <div className="season-table-wrap">
              <table className="season-table">
                <thead>
                  <tr><th>Combo</th><th>Combo code</th><th>Style</th><th>Style code</th></tr>
                </thead>
                <tbody>
                  {combos.map((c) => (
                    <tr key={c.combo_id}>
                      <td className="season-name-cell">
                        <Link href={`/color-combos/${c.combo_id}`} className="style-name-link">{c.name}</Link>
                      </td>
                      <td>{c.combo_code || "—"}</td>
                      <td>{c.style_name || "—"}</td>
                      <td>{c.style_code || "—"}</td>
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
