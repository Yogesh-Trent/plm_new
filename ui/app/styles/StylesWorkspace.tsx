"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ImageSquare,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  OperationalContent,
  OperationalHeader,
  OperationalPage,
  OperationalPanel,
  OperationalState,
  OperationalTableRegion,
} from "@/app/components/OperationalWorkspace";
import { ConfirmAction } from "@/app/components/ConfirmAction";

type Style = {
  id: string;
  season_id: string | null;
  season_name: string | null;
  department: string | null;
  brand: string | null;
  product_type: string | null;
  style_type: string | null;
  template: string | null;
  template_id: string | null;
  style_name: string | null;
  style_code: string | null;
  matkl_description_3: string | null;
  business_unit: string | null;
  image_url: string | null;
  pack: string | null;
  drop_name: string | null;
  supplier_request: string | null;
  issue_date: string | null;
  color_combo: string | null;
  vendors: string | null;
  status: string;
  assigned_role: string | null;
  combo_count: number;
  created_by: string | null;
  created_at: string;
};

const ASSIGN_LABELS: Record<string, string> = {
  designer: "Designer",
  buyer: "Buyer",
  technologist: "Technologist",
  sourcing: "Sourcing",
};

type Options = {
  seasons: Array<{
    id: string;
    name: string;
    generic: string | null;
    business_unit: string | null;
  }>;
  departments: string[];
  brands: string[];
  productTypes: string[];
  styleTypes: string[];
  templates: Array<{ id: string; name: string }>;
  businessUnits: string[];
};

const EMPTY = {
  seasonId: "",
  department: "",
  brand: "",
  productType: "",
  styleType: "",
  templateId: "",
  styleName: "",
  matkl: "",
  businessUnit: "",
};

function cell(value: string | null) {
  return value && value.trim() ? value : "—";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function StylesWorkspace({
  initialAssignedFilter,
}: {
  initialAssignedFilter: string;
}) {
  const router = useRouter();
  const [styles, setStyles] = useState<Style[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [assignedFilter, setAssignedFilter] = useState(initialAssignedFilter);
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    const url = assignedFilter
      ? `/api/styles?assigned=${assignedFilter}`
      : "/api/styles";
    Promise.all([
      fetch(url).then((r) => (r.ok ? r.json() : { styles: [] })),
      fetch("/api/style-options").then((r) =>
        r.ok ? r.json() : { options: null },
      ),
    ])
      .then(([s, o]) => {
        if (!active) return;
        const loaded = s.styles ?? [];
        setStyles(loaded);
        setOptions(o.options ?? null);
        // Open the create form only when the collection is empty, so the list
        // stays front-and-center once styles exist.
        if (loaded.length === 0) setShowForm(true);
      })
      .catch(() => {
        if (active)
          setLoadError("Styles could not be loaded from the workspace.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [assignedFilter]);

  const set = (patch: Partial<typeof EMPTY>) =>
    setForm((current) => ({ ...current, ...patch }));

  const templateName = useMemo(
    () =>
      options?.templates.find((t) => t.id === form.templateId)?.name ?? null,
    [options, form.templateId],
  );

  const resetForm = () => {
    setForm({ ...EMPTY });
    setError("");
  };

  // The list form creates styles; editing the full record happens on the
  // per-style detail page (/styles/[id]).
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.styleName.trim()) {
      setError("Style name is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const payload = {
      seasonId: form.seasonId || null,
      department: form.department || null,
      brand: form.brand || null,
      productType: form.productType || null,
      styleType: form.styleType || null,
      templateId: form.templateId || null,
      templateName,
      styleName: form.styleName.trim(),
      matkl: form.matkl || null,
      businessUnit: form.businessUnit || null,
    };
    try {
      const response = await fetch("/api/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save style.");
      setStyles((current) => [data.style, ...current]);
      toast.success("Style created", {
        description: `${data.style.style_name} is ready for product development.`,
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save style.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (style: Style) => {
    setBusyId(style.id);
    const next = style.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`/api/styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error ?? "Could not update status.");
      setStyles((current) =>
        current.map((s) => (s.id === style.id ? data.style : s)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (style: Style) => {
    setBusyId(style.id);
    try {
      const response = await fetch(`/api/styles/${style.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not delete style.");
      }
      setStyles((current) => current.filter((s) => s.id !== style.id));
      toast.success("Style deleted", {
        description: `${style.style_name || "The style"} was removed.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete style.");
    } finally {
      setBusyId(null);
    }
  };

  const noActiveSeasons = options && options.seasons.length === 0;

  const changeAssignmentFilter = (value: string) => {
    setLoading(true);
    setLoadError("");
    setAssignedFilter(value);
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("assigned", value);
    else params.delete("assigned");
    const query = params.toString();
    router.replace(query ? `/styles?${query}` : "/styles", { scroll: false });
  };

  return (
    <OperationalPage>
      <OperationalHeader
        eyebrow="Product development"
        title="Styles"
        description="Create and manage the product records moving through the collection."
        actions={
          <select
            value={assignedFilter}
            onChange={(e) => changeAssignmentFilter(e.target.value)}
            aria-label="Filter by assignment"
            className="worklist-filter"
          >
            <option value="">All styles</option>
            <option value="designer">Styles @ Designer</option>
            <option value="buyer">Styles @ Buyer</option>
            <option value="technologist">Styles @ Technologist</option>
            <option value="sourcing">Styles @ Sourcing</option>
          </select>
        }
      />

      <OperationalContent>
        <section className="season-create">
          <div className="flex items-center justify-between gap-4">
            <h2 className="!m-0">New style</h2>
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              aria-expanded={showForm}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[color:var(--workspace-line-strong)] bg-[color:var(--workspace-surface)] px-3.5 text-xs font-bold text-[color:var(--workspace-ink)] transition-colors hover:border-[color:var(--workspace-accent)] hover:text-[color:var(--workspace-accent-deep)]"
            >
              {showForm ? (
                <>
                  <X size={15} /> Close
                </>
              ) : (
                <>
                  <Plus size={15} /> Add a style
                </>
              )}
            </button>
          </div>
          {showForm && (
            <>
          {noActiveSeasons && (
            <p className="styles-hint">
              No active season yet. Ask an <strong>All</strong> user to create
              one (Full process → Seasons) — styles attach to an active season.
            </p>
          )}
          <form onSubmit={submit}>
            <div className="season-fields">
              <label className="season-field">
                <span>Season (active only)</span>
                <select
                  value={form.seasonId}
                  onChange={(e) => set({ seasonId: e.target.value })}
                >
                  <option value="">Select season…</option>
                  {options?.seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.generic ? ` (${s.generic})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Department</span>
                <select
                  value={form.department}
                  onChange={(e) => set({ department: e.target.value })}
                >
                  <option value="">Select department…</option>
                  {options?.departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Brand / Division</span>
                <select
                  value={form.brand}
                  onChange={(e) => set({ brand: e.target.value })}
                >
                  <option value="">Select brand…</option>
                  {options?.brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Product type</span>
                <select
                  value={form.productType}
                  onChange={(e) => set({ productType: e.target.value })}
                >
                  <option value="">Select product…</option>
                  {options?.productTypes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Style type</span>
                <select
                  value={form.styleType}
                  onChange={(e) => set({ styleType: e.target.value })}
                >
                  <option value="">Select type…</option>
                  {options?.styleTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Template</span>
                <select
                  value={form.templateId}
                  onChange={(e) => set({ templateId: e.target.value })}
                >
                  <option value="">Select template…</option>
                  {options?.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Style name *</span>
                <input
                  value={form.styleName}
                  onChange={(e) => set({ styleName: e.target.value })}
                  placeholder="e.g. AW26 Floral Pendant Chain Necklace"
                  autoFocus
                />
              </label>
              <label className="season-field">
                <span>MATKL Description 3</span>
                <input
                  value={form.matkl}
                  onChange={(e) => set({ matkl: e.target.value })}
                  placeholder="e.g. 11ACJEGOL"
                />
              </label>
              <label className="season-field">
                <span>Business unit</span>
                <select
                  value={form.businessUnit}
                  onChange={(e) => set({ businessUnit: e.target.value })}
                >
                  <option value="">Select business unit…</option>
                  {options?.businessUnits.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="styles-note">
              On save, a style code is generated and any matching template
              details pre-fill automatically. Unmatched fields stay empty to
              fill in later.
            </p>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <div className="season-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={resetForm}
              >
                Clear
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                <Plus size={16} />
                {submitting ? "Saving…" : "Create style"}
              </button>
            </div>
          </form>
            </>
          )}
        </section>

        <OperationalPanel title="Styles" count={styles.length}>
          {loadError ? (
            <OperationalState
              kind="error"
              title="Styles are unavailable"
              detail={loadError}
              action={
                <button
                  className="ghost-button"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              }
            />
          ) : loading ? (
            <OperationalState
              kind="loading"
              title="Loading styles"
              detail="Retrieving the latest product records from the workspace."
            />
          ) : styles.length === 0 ? (
            <OperationalState
              kind="empty"
              title={
                assignedFilter
                  ? "No styles in this assignment"
                  : "No styles yet"
              }
              detail={
                assignedFilter
                  ? "Choose another assignment or clear the filter to see the full collection."
                  : "Use the form above to create the first product record."
              }
            />
          ) : (
            <OperationalTableRegion>
              <table className="season-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Style name</th>
                    <th>Style code</th>
                    <th>Combos</th>
                    <th>Season</th>
                    <th>Department</th>
                    <th>Brand</th>
                    <th>Product</th>
                    <th>MATKL Desc 3</th>
                    <th>Type</th>
                    <th>Template</th>
                    <th>Business unit</th>
                    <th>Pack</th>
                    <th>Drop</th>
                    <th>Supplier request</th>
                    <th>Issue date</th>
                    <th>Color combo</th>
                    <th>Vendors</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Created by</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {styles.map((style) => (
                    <tr key={style.id}>
                      <td>
                        <Link
                          href={`/styles/${style.id}`}
                          className="season-logo"
                          aria-label="Open style"
                        >
                          {style.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={style.image_url} alt="" />
                          ) : (
                            <ImageSquare size={16} />
                          )}
                        </Link>
                      </td>
                      <td className="season-name-cell">
                        <Link
                          href={`/styles/${style.id}`}
                          className="style-name-link"
                        >
                          {cell(style.style_name)}
                        </Link>
                      </td>
                      <td>{cell(style.style_code)}</td>
                      <td>
                        <Link
                          href={`/styles/${style.id}`}
                          className="combo-count-pill"
                        >
                          {style.combo_count}
                        </Link>
                      </td>
                      <td>{cell(style.season_name)}</td>
                      <td>{cell(style.department)}</td>
                      <td>{cell(style.brand)}</td>
                      <td>{cell(style.product_type)}</td>
                      <td>{cell(style.matkl_description_3)}</td>
                      <td>{cell(style.style_type)}</td>
                      <td>{cell(style.template)}</td>
                      <td>{cell(style.business_unit)}</td>
                      <td>{cell(style.pack)}</td>
                      <td>{cell(style.drop_name)}</td>
                      <td>{cell(style.supplier_request)}</td>
                      <td>{formatDate(style.issue_date)}</td>
                      <td>{cell(style.color_combo)}</td>
                      <td>{cell(style.vendors)}</td>
                      <td>
                        <button
                          type="button"
                          className={
                            style.status === "active"
                              ? "status-pill is-active"
                              : "status-pill is-inactive"
                          }
                          onClick={() => toggleStatus(style)}
                          disabled={busyId === style.id}
                          title="Toggle status"
                        >
                          <span className="status-dot" />
                          {style.status === "active" ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td>
                        {style.assigned_role ? (
                          <span className="assign-tag">
                            {ASSIGN_LABELS[style.assigned_role] ??
                              style.assigned_role}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{cell(style.created_by)}</td>
                      <td>
                        <div className="season-row-actions">
                          <Link
                            href={`/styles/${style.id}`}
                            className="icon-action"
                            title="Open / edit style"
                            aria-label={`Open ${style.style_name}`}
                          >
                            <PencilSimple size={16} />
                          </Link>
                          <ConfirmAction
                            title={`Delete ${style.style_name || "this style"}?`}
                            description="This permanently removes the style and may affect linked colourways and sourcing records."
                            confirmLabel="Delete style"
                            destructive
                            onConfirm={() => remove(style)}
                            trigger={
                              <button
                                type="button"
                                className="icon-action is-danger"
                                disabled={busyId === style.id}
                                title="Delete style"
                                aria-label={`Delete ${style.style_name}`}
                              >
                                <Trash size={16} />
                              </button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OperationalTableRegion>
          )}
        </OperationalPanel>
      </OperationalContent>
    </OperationalPage>
  );
}
