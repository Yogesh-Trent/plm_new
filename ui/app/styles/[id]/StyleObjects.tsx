"use client";

import { useEffect, useState } from "react";
import { ImageSquare, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import type { StyleObjectKind } from "@/lib/spec-queries";

// Artwork supports multiple reference images stored in `data.images` (base64).
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 350 * 1024;

function asImageList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

type SpecOptions = {
  specTypes: string[];
  sizeRanges: string[];
  sizeChartTemplates: string[];
  sealers: string[];
};

type FieldSpec = {
  key: string;
  label: string;
  scope: "top" | "data"; // top-level column vs `data` jsonb
  input: "text" | "select" | "checkbox";
  optionsKey?: keyof SpecOptions;
  required?: boolean;
  placeholder?: string;
};

type Config = { fields: FieldSpec[]; columns: string[] };

// One config per kind drives both the add/edit form and the table.
export const OBJECT_CONFIGS: Record<StyleObjectKind, Config> = {
  artwork: {
    fields: [
      { key: "name", label: "Artwork name", scope: "top", input: "text", required: true, placeholder: "e.g. Front chest print" },
      { key: "subtype", label: "Subtype", scope: "data", input: "text" },
      { key: "color_combos", label: "Colour combos", scope: "data", input: "text" },
      { key: "description", label: "Description", scope: "top", input: "text" },
    ],
    columns: ["code", "name", "images", "subtype", "color_combos", "state"],
  },
  size_chart: {
    fields: [
      { key: "name", label: "Size chart name", scope: "top", input: "text", required: true, placeholder: "e.g. Womenswear basic tee" },
      { key: "size_range", label: "Size range", scope: "data", input: "select", optionsKey: "sizeRanges" },
      { key: "template", label: "Template", scope: "data", input: "select", optionsKey: "sizeChartTemplates" },
      { key: "selected_sizes", label: "Selected sizes", scope: "data", input: "text", placeholder: "XS-XXXL" },
      { key: "base_size", label: "Base size", scope: "data", input: "text", placeholder: "S" },
      { key: "inspection_relevant", label: "Inspection relevant", scope: "data", input: "checkbox" },
    ],
    columns: ["code", "name", "size_range", "selected_sizes", "base_size", "state"],
  },
  spec_sheet: {
    fields: [
      { key: "name", label: "Spec sheet name", scope: "top", input: "text", required: true },
      { key: "spec_type", label: "Spec type", scope: "data", input: "select", optionsKey: "specTypes" },
      { key: "description", label: "Description", scope: "top", input: "text" },
    ],
    columns: ["code", "name", "spec_type", "description", "state"],
  },
  test_run: {
    fields: [
      { key: "name", label: "Test run name", scope: "top", input: "text", required: true },
      { key: "test_code", label: "Code", scope: "data", input: "text" },
      { key: "number_of_tests", label: "# Tests", scope: "data", input: "text" },
      { key: "product_supplier", label: "Product supplier", scope: "data", input: "text" },
      { key: "description", label: "Description", scope: "top", input: "text" },
    ],
    columns: ["code", "name", "test_code", "number_of_tests", "state"],
  },
};

type ObjRow = {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  state: string;
  data: Record<string, unknown>;
};

const COLUMN_LABELS: Record<string, string> = { code: "Code", state: "Status", name: "Name", images: "Images" };

export function StyleObjects({
  styleId,
  kind,
}: {
  styleId: string;
  kind: StyleObjectKind;
}) {
  const config = OBJECT_CONFIGS[kind];
  const isArtwork = kind === "artwork";
  const [rows, setRows] = useState<ObjRow[]>([]);
  const [options, setOptions] = useState<SpecOptions>({ specTypes: [], sizeRanges: [], sizeChartTemplates: [], sealers: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [images, setImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });

  const onPickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    const next: string[] = [];
    for (const file of picked) {
      if (file.size > MAX_IMAGE_BYTES) {
        setError("Each image must be under 350 KB.");
        continue;
      }
      try {
        next.push(await readFile(file));
      } catch {
        setError("An image could not be read.");
      }
    }
    if (next.length) setImages((current) => [...current, ...next]);
  };

  const removeImage = (index: number) =>
    setImages((current) => current.filter((_, i) => i !== index));

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/styles/${styleId}/objects?kind=${kind}`).then((r) => (r.ok ? r.json() : { objects: [] })),
      fetch("/api/spec-options").then((r) => (r.ok ? r.json() : { options: null })),
    ])
      .then(([o, opt]) => {
        if (!alive) return;
        setRows(o.objects ?? []);
        if (opt.options) setOptions(opt.options);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [styleId, kind]);

  const labelFor = (col: string) =>
    COLUMN_LABELS[col] ?? config.fields.find((f) => f.key === col)?.label ?? col;

  const valueFor = (row: ObjRow, col: string): string => {
    if (col === "code") return row.code ?? "—";
    if (col === "state") return row.state;
    if (col === "name") return row.name ?? "—";
    if (col === "description") return row.description ?? "—";
    const v = row.data?.[col];
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return v == null || v === "" ? "—" : String(v);
  };

  const reset = () => {
    setForm({});
    setImages([]);
    setEditingId(null);
    setError("");
  };

  const startEdit = (row: ObjRow) => {
    setEditingId(row.id);
    setError("");
    const next: Record<string, string | boolean> = {};
    for (const f of config.fields) {
      if (f.scope === "top") next[f.key] = (row[f.key as "name" | "description"] as string) ?? "";
      else {
        const v = row.data?.[f.key];
        next[f.key] = f.input === "checkbox" ? Boolean(v) : v == null ? "" : String(v);
      }
    }
    setForm(next);
    setImages(isArtwork ? asImageList(row.data?.images) : []);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nameField = config.fields.find((f) => f.required);
    if (nameField && !String(form[nameField.key] ?? "").trim()) {
      setError(`${nameField.label} is required.`);
      return;
    }
    setSubmitting(true);
    setError("");
    const data: Record<string, unknown> = {};
    let name = "";
    let description: string | null = null;
    for (const f of config.fields) {
      const v = form[f.key];
      if (f.key === "name") name = String(v ?? "").trim();
      else if (f.key === "description") description = v ? String(v).trim() : null;
      else if (f.scope === "data") data[f.key] = f.input === "checkbox" ? Boolean(v) : (v ? String(v) : null);
    }
    if (isArtwork) data.images = images;
    try {
      const response = await fetch(
        editingId ? `/api/style-objects/${editingId}` : `/api/styles/${styleId}/objects`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingId ? { name, description, data } : { kind, name, description, data }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not save.");
      setRows((current) =>
        editingId ? current.map((r) => (r.id === editingId ? payload.object : r)) : [...current, payload.object],
      );
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleState = async (row: ObjRow) => {
    setBusyId(row.id);
    const next = row.state === "approved" ? "draft" : "approved";
    try {
      const response = await fetch(`/api/style-objects/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not update.");
      setRows((current) => current.map((r) => (r.id === row.id ? payload.object : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: ObjRow) => {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    setBusyId(row.id);
    try {
      const response = await fetch(`/api/style-objects/${row.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete.");
      setRows((current) => current.filter((r) => r.id !== row.id));
      if (editingId === row.id) reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <form className="combo-form" onSubmit={submit}>
        <div className="season-fields">
          {config.fields.map((f) => (
            <label className="season-field" key={f.key}>
              <span>{f.label}{f.required ? " *" : ""}</span>
              {f.input === "select" ? (
                <select
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setForm((c) => ({ ...c, [f.key]: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {(f.optionsKey ? options[f.optionsKey] : []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : f.input === "checkbox" ? (
                <span className="obj-check">
                  <input
                    type="checkbox"
                    checked={Boolean(form[f.key])}
                    onChange={(e) => setForm((c) => ({ ...c, [f.key]: e.target.checked }))}
                  />
                </span>
              ) : (
                <input
                  value={String(form[f.key] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm((c) => ({ ...c, [f.key]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>

        {isArtwork && (
          <div className="artwork-images">
            <div className="artwork-images-head">
              <span>Images ({images.length}/{MAX_IMAGES})</span>
              <label className="ghost-button artwork-upload">
                <ImageSquare size={15} /> Add images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  disabled={images.length >= MAX_IMAGES}
                  onChange={(e) => {
                    void onPickImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {images.length === 0 ? (
              <p className="styles-note" style={{ margin: 0 }}>
                No images yet. Add up to {MAX_IMAGES} reference images (max 350 KB each).
              </p>
            ) : (
              <div className="artwork-thumb-grid">
                {images.map((src, index) => (
                  <div className="artwork-thumb" key={index}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Artwork ${index + 1}`} />
                    <button
                      type="button"
                      className="artwork-thumb-remove"
                      onClick={() => removeImage(index)}
                      aria-label={`Remove image ${index + 1}`}
                      title="Remove"
                    >
                      <X size={13} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="season-actions">
          {editingId && (
            <button type="button" className="ghost-button" onClick={reset}>Cancel</button>
          )}
          <button type="submit" className="primary-button" disabled={submitting}>
            <Plus size={16} /> {submitting ? "Saving…" : editingId ? "Save" : "Add"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="season-empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="season-empty">Nothing here yet. Add the first one above.</p>
      ) : (
        <div className="season-table-wrap">
          <table className="season-table">
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c}>{labelFor(c)}</th>
                ))}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={editingId === row.id ? "is-editing" : undefined}>
                  {config.columns.map((c) =>
                    c === "state" ? (
                      <td key={c}>
                        <button
                          type="button"
                          className={row.state === "approved" ? "status-pill is-active" : "status-pill is-inactive"}
                          onClick={() => toggleState(row)}
                          disabled={busyId === row.id}
                          title="Toggle draft/approved"
                        >
                          <span className="status-dot" />
                          {row.state === "approved" ? "Approved" : "Draft"}
                        </button>
                      </td>
                    ) : c === "images" ? (
                      <td key={c}>
                        {(() => {
                          const imgs = asImageList(row.data?.images);
                          if (imgs.length === 0) return <span className="artwork-nostrip">—</span>;
                          return (
                            <span className="artwork-strip" title={`${imgs.length} image${imgs.length === 1 ? "" : "s"}`}>
                              {imgs.slice(0, 3).map((src, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={src} alt="" />
                              ))}
                              {imgs.length > 3 && <span className="artwork-more">+{imgs.length - 3}</span>}
                            </span>
                          );
                        })()}
                      </td>
                    ) : (
                      <td key={c} className={c === "name" ? "season-name-cell" : undefined}>
                        {valueFor(row, c)}
                      </td>
                    ),
                  )}
                  <td>
                    <div className="season-row-actions">
                      <button type="button" className="icon-action" onClick={() => startEdit(row)} disabled={busyId === row.id} title="Edit" aria-label="Edit">
                        <PencilSimple size={16} />
                      </button>
                      <button type="button" className="icon-action is-danger" onClick={() => remove(row)} disabled={busyId === row.id} title="Delete" aria-label="Delete">
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
