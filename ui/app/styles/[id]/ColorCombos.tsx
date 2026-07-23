"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PencilSimple, Plus, Stack, Trash } from "@phosphor-icons/react";

type Combo = {
  id: string;
  name: string;
  combo_code: string | null;
  colorway_selection: string | null;
  pantone_code: string | null;
  color_palette: string | null;
  status: string;
  created_by: string | null;
};

type ComboOptions = { colorwaySelections: string[]; colorPalettes: string[] };

const EMPTY = { name: "", colorwaySelection: "", pantoneCode: "", colorPalette: "" };

// Color combos are a separate sub-process: a style has many colourways, each with
// its own child code (<style_code>_NNN). Empty on style create, added here.
export function ColorCombos({ styleId }: { styleId: string }) {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [options, setOptions] = useState<ComboOptions>({
    colorwaySelections: [],
    colorPalettes: [],
  });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/styles/${styleId}/color-combos`).then((r) =>
        r.ok ? r.json() : { combos: [] },
      ),
      fetch("/api/combo-options").then((r) =>
        r.ok ? r.json() : { options: { colorwaySelections: [], colorPalettes: [] } },
      ),
    ])
      .then(([c, o]) => {
        if (!alive) return;
        setCombos(c.combos ?? []);
        setOptions(o.options ?? { colorwaySelections: [], colorPalettes: [] });
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [styleId]);

  const set = (patch: Partial<typeof EMPTY>) =>
    setForm((current) => ({ ...current, ...patch }));

  const reset = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setError("");
  };

  const startEdit = (combo: Combo) => {
    setEditingId(combo.id);
    setError("");
    setForm({
      name: combo.name,
      colorwaySelection: combo.colorway_selection ?? "",
      pantoneCode: combo.pantone_code ?? "",
      colorPalette: combo.color_palette ?? "",
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Colour combo name is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      colorwaySelection: form.colorwaySelection || null,
      pantoneCode: form.pantoneCode || null,
      colorPalette: form.colorPalette || null,
    };
    try {
      const response = await fetch(
        editingId
          ? `/api/color-combos/${editingId}`
          : `/api/styles/${styleId}/color-combos`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save colour combo.");
      setCombos((current) =>
        editingId
          ? current.map((c) => (c.id === editingId ? data.combo : c))
          : [...current, data.combo],
      );
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save colour combo.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (combo: Combo) => {
    setBusyId(combo.id);
    const next = combo.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`/api/color-combos/${combo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not update status.");
      setCombos((current) => current.map((c) => (c.id === combo.id ? data.combo : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (combo: Combo) => {
    if (!window.confirm(`Delete colour combo "${combo.name}"?`)) return;
    setBusyId(combo.id);
    try {
      const response = await fetch(`/api/color-combos/${combo.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not delete colour combo.");
      }
      setCombos((current) => current.filter((c) => c.id !== combo.id));
      if (editingId === combo.id) reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete colour combo.");
    } finally {
      setBusyId(null);
    }
  };


  return (
    <section className="season-create">
      <div className="combo-head">
        <h2>Colour combos</h2>
        <span className="process-count">
          <Stack size={15} /> {combos.length}
        </span>
      </div>
      <p className="styles-note" style={{ marginTop: 0 }}>
        A style can have many colourways. Combo name is required; the rest is
        optional and usually copied from the intake sheet.
      </p>

      <form className="combo-form" onSubmit={submit}>
        <div className="season-fields">
          <label className="season-field">
            <span>Colour combo name *</span>
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. COBALT"
            />
          </label>
          <label className="season-field">
            <span>Colorway selection</span>
            <select
              value={form.colorwaySelection}
              onChange={(e) => set({ colorwaySelection: e.target.value })}
            >
              <option value="">Select…</option>
              {options.colorwaySelections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="season-field">
            <span>Pantone colour code</span>
            <input
              value={form.pantoneCode}
              onChange={(e) => set({ pantoneCode: e.target.value })}
              placeholder="e.g. 19-4052 TCX"
            />
          </label>
          <label className="season-field">
            <span>Colour palette</span>
            <select
              value={form.colorPalette}
              onChange={(e) => set({ colorPalette: e.target.value })}
            >
              <option value="">
                {options.colorPalettes.length ? "Select…" : "No options yet"}
              </option>
              {options.colorPalettes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="login-error" role="alert">{error}</p>
        )}
        <div className="season-actions">
          {editingId && (
            <button type="button" className="ghost-button" onClick={reset}>
              Cancel
            </button>
          )}
          <button type="submit" className="primary-button" disabled={submitting}>
            <Plus size={16} />
            {submitting ? "Saving…" : editingId ? "Save combo" : "Add colour combo"}
          </button>
        </div>
      </form>


      {loading ? (
        <p className="season-empty">Loading colour combos…</p>
      ) : combos.length === 0 ? (
        <p className="season-empty">
          No colour combos yet. Add the first colourway above.
        </p>
      ) : (
        <div className="season-table-wrap">
          <table className="season-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Colour combo</th>
                <th>Colorway selection</th>
                <th>Pantone</th>
                <th>Palette</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {combos.map((combo) => (
                <tr key={combo.id} className={editingId === combo.id ? "is-editing" : undefined}>
                  <td>
                    <Link href={`/color-combos/${combo.id}`} className="style-name-link">
                      {combo.combo_code || "—"}
                    </Link>
                  </td>
                  <td className="season-name-cell">{combo.name}</td>
                  <td>{combo.colorway_selection || "—"}</td>
                  <td>{combo.pantone_code || "—"}</td>
                  <td>{combo.color_palette || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className={
                        combo.status === "active"
                          ? "status-pill is-active"
                          : "status-pill is-inactive"
                      }
                      onClick={() => toggleStatus(combo)}
                      disabled={busyId === combo.id}
                      title="Toggle status"
                    >
                      <span className="status-dot" />
                      {combo.status === "active" ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <div className="season-row-actions">
                      <Link
                        href={`/color-combos/${combo.id}`}
                        className="ghost-button combo-bom-btn"
                        title="Open combo to add to BOM(s)"
                      >
                        Add to BOM(s)
                      </Link>
                      <button
                        type="button"
                        className="icon-action"
                        onClick={() => startEdit(combo)}
                        disabled={busyId === combo.id}
                        title="Edit combo"
                        aria-label={`Edit ${combo.name}`}
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-action is-danger"
                        onClick={() => remove(combo)}
                        disabled={busyId === combo.id}
                        title="Delete combo"
                        aria-label={`Delete ${combo.name}`}
                      >
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
