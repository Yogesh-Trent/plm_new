"use client";

import { Fragment, useEffect, useState } from "react";
import {
  CaretDown,
  CaretRight,
  FloppyDisk,
  Plus,
  Stack,
  Trash,
} from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "@/app/components/toast";
import { z } from "zod";
import {
  OperationalContent,
  OperationalHeader,
  OperationalPage,
  OperationalPanel,
  OperationalState,
  OperationalTableRegion,
} from "@/app/components/OperationalWorkspace";
import { FieldError } from "@/app/components/RecordWorkspace";

type Bom = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  created_by: string | null;
  line_count: number;
  combo_count: number;
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

const EMPTY_LINE = {
  component: "",
  category: "",
  material: "",
  colour: "",
  detail: "",
  quantity: "",
  uom: "",
};

// Inline material-lines editor — the same add/edit/delete flow as the BOM detail
// page, embedded under an expanded BOM row so lines are managed without leaving
// the list. Reuses the exact endpoints (/api/boms/[id]/lines, /api/bom-lines/[id]).
function BomLinesInline({
  bomId,
  onCountChange,
}: {
  bomId: string;
  onCountChange: (count: number) => void;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [line, setLine] = useState({ ...EMPTY_LINE });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/boms/${bomId}/lines`)
      .then((r) => (r.ok ? r.json() : { lines: [] }))
      .then((data) => {
        if (alive) setLines(data.lines ?? []);
      })
      .catch(() => {
        if (alive) setError("Lines could not be loaded.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [bomId]);

  const setL = (patch: Partial<typeof EMPTY_LINE>) =>
    setLine((current) => ({ ...current, ...patch }));

  const resetLine = () => {
    setLine({ ...EMPTY_LINE });
    setEditingId(null);
  };

  const submitLine = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        editingId ? `/api/bom-lines/${editingId}` : `/api/boms/${bomId}/lines`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(line),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save line.");
      setLines((current) => {
        const next = editingId
          ? current.map((l) => (l.id === editingId ? data.line : l))
          : [...current, data.line];
        onCountChange(next.length);
        return next;
      });
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
    setBusy(true);
    try {
      const response = await fetch(`/api/bom-lines/${l.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not delete line.");
      setLines((current) => {
        const next = current.filter((x) => x.id !== l.id);
        onCountChange(next.length);
        return next;
      });
      if (editingId === l.id) resetLine();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete line.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bom-inline-lines">
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

      {loading ? (
        <p className="season-empty">Loading lines…</p>
      ) : lines.length === 0 ? (
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
    </div>
  );
}

const bomFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a BOM name.")
    .max(120, "Keep the BOM name under 120 characters."),
  description: z
    .string()
    .trim()
    .max(280, "Keep the description under 280 characters."),
});

type BomFormValues = z.infer<typeof bomFormSchema>;

export function BomsList({ initialBoms }: { initialBoms: Bom[] }) {
  const [boms, setBoms] = useState<Bom[]>(initialBoms);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BomFormValues>({
    resolver: zodResolver(bomFormSchema),
    mode: "onBlur",
    defaultValues: { name: "", description: "" },
  });

  const toggleExpanded = (id: string) =>
    setExpandedId((current) => (current === id ? null : id));

  const setLineCount = (id: string, count: number) =>
    setBoms((current) =>
      current.map((b) => (b.id === id ? { ...b, line_count: count } : b)),
    );

  const create = async (values: BomFormValues) => {
    setError("");
    try {
      const response = await fetch("/api/boms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          description: values.description.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not create BOM.");
      reset();
      setAdding(false);
      toast.success("BOM created", {
        description: `${values.name.trim()} is ready for material lines.`,
      });
      // Stay on the list: add the new BOM and expand it so lines can be added
      // right here, instead of navigating to its detail page.
      const newBom: Bom = { ...data.bom, line_count: 0, combo_count: 0 };
      setBoms((current) => [newBom, ...current]);
      setExpandedId(data.bom.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create BOM.");
    }
  };

  return (
    <OperationalPage>
      <OperationalHeader
        eyebrow="Materials engineering"
        title="BOM library"
        description="Reuse controlled material structures across styles and colourways."
        actions={
          <button
            className="primary-button"
            onClick={() => setAdding((value) => !value)}
          >
            <Plus size={16} /> New BOM
          </button>
        }
      />

      <OperationalContent>
        {adding && (
          <section className="season-create">
            <h2>New BOM</h2>
            <form onSubmit={handleSubmit(create)} noValidate>
              <div className="season-fields">
                <label className="season-field">
                  <span>BOM name *</span>
                  <input
                    {...register("name")}
                    placeholder="e.g. Menswear Core BOM"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? "bom-name-error" : undefined
                    }
                  />
                  <FieldError
                    id="bom-name-error"
                    message={errors.name?.message}
                  />
                </label>
                <label className="season-field">
                  <span>Description</span>
                  <input
                    {...register("description")}
                    placeholder="Optional"
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description ? "bom-description-error" : undefined
                    }
                  />
                  <FieldError
                    id="bom-description-error"
                    message={errors.description?.message}
                  />
                </label>
              </div>
              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}
              <div className="season-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating…" : "Create BOM"}
                </button>
              </div>
            </form>
          </section>
        )}

        <OperationalPanel title="Bills of materials" count={boms.length}>
          {boms.length === 0 ? (
            <OperationalState
              kind="empty"
              title="No BOMs yet"
              detail="Create the first controlled material structure for reuse across products."
            />
          ) : (
            <OperationalTableRegion>
              <table className="season-table">
                <thead>
                  <tr>
                    <th aria-label="Expand" />
                    <th>Code</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Lines</th>
                    <th>Combos</th>
                    <th>Status</th>
                    <th>Created by</th>
                  </tr>
                </thead>
                <tbody>
                  {boms.map((bom) => {
                    const expanded = expandedId === bom.id;
                    return (
                      <Fragment key={bom.id}>
                        <tr className={expanded ? "is-expanded-row" : undefined}>
                          <td>
                            <button
                              type="button"
                              className="icon-action"
                              onClick={() => toggleExpanded(bom.id)}
                              aria-expanded={expanded}
                              aria-label={
                                expanded ? "Hide material lines" : "Show material lines"
                              }
                              title={expanded ? "Hide lines" : "Manage lines"}
                            >
                              {expanded ? (
                                <CaretDown size={16} />
                              ) : (
                                <CaretRight size={16} />
                              )}
                            </button>
                          </td>
                          <td>{bom.code || "—"}</td>
                          <td className="season-name-cell">
                            <button
                              type="button"
                              className="style-name-link bom-name-toggle"
                              onClick={() => toggleExpanded(bom.id)}
                            >
                              {bom.name}
                            </button>
                          </td>
                          <td>{bom.description || "—"}</td>
                          <td>
                            <span className="combo-count-pill">
                              {bom.line_count}
                            </span>
                          </td>
                          <td>
                            <span className="season-styles">
                              <Stack size={14} /> {bom.combo_count}
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                bom.status === "active"
                                  ? "status-pill is-active"
                                  : "status-pill is-inactive"
                              }
                            >
                              <span className="status-dot" />
                              {bom.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{bom.created_by || "—"}</td>
                        </tr>
                        {expanded && (
                          <tr className="inline-expand-row">
                            <td colSpan={8}>
                              <BomLinesInline
                                bomId={bom.id}
                                onCountChange={(count) =>
                                  setLineCount(bom.id, count)
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </OperationalTableRegion>
          )}
        </OperationalPanel>
      </OperationalContent>
    </OperationalPage>
  );
}
