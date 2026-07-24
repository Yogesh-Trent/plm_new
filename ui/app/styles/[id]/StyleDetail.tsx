"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cards as CardsIcon,
  Image as ImageIcon,
  Rows as RowsIcon,
} from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "@/app/components/toast";
import { z } from "zod";
import { FieldError } from "@/app/components/RecordWorkspace";
import { DatePicker } from "@/app/components/DatePicker";
import { useSetRecordHeader } from "@/app/components/RecordHeaderContext";
import { ColorCombos } from "./ColorCombos";
import { SpecQuality } from "./SpecQuality";
import { StyleAssign } from "./StyleAssign";
import { Sourcing } from "./Sourcing";
import { StyleSkus } from "./StyleSkus";
import { Sampling } from "./Sampling";

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
  pack: string | null;
  drop_name: string | null;
  image_url: string | null;
  supplier_request: string | null;
  issue_date: string | null;
  color_combo: string | null;
  vendors: string | null;
  status: string;
  assigned_role: string | null;
  created_by: string | null;
  created_at: string;
  combo_count?: number;
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

const MAX_IMAGE_BYTES = 350 * 1024;

const styleFormSchema = z.object({
  seasonId: z.string(),
  department: z.string(),
  brand: z.string(),
  productType: z.string(),
  styleType: z.string(),
  templateId: z.string(),
  styleName: z
    .string()
    .trim()
    .min(1, "Enter a style name.")
    .max(160, "Keep the style name under 160 characters."),
  matkl: z.string(),
  businessUnit: z.string(),
  status: z.enum(["active", "inactive"]),
  pack: z.string(),
  dropName: z.string(),
  supplierRequest: z.string(),
  issueDate: z.string(),
  colorCombo: z.string(),
  vendors: z.string(),
});

type StyleFormValues = z.infer<typeof styleFormSchema>;

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  // Fixed locale so server and client render identically (avoids a hydration
  // mismatch when their default locales differ).
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "colourways", label: "Colourways" },
  { key: "spec", label: "Spec & Quality" },
  { key: "sourcing", label: "Sourcing" },
  { key: "skus", label: "SKUs" },
  { key: "sampling", label: "Sampling" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function StyleDetail({
  style,
  options,
}: {
  style: Style;
  options: Options;
  roleLabel?: string;
}) {
  const router = useRouter();
  const initialFormValues: StyleFormValues = {
    seasonId: style.season_id ?? "",
    department: style.department ?? "",
    brand: style.brand ?? "",
    productType: style.product_type ?? "",
    styleType: style.style_type ?? "",
    templateId: style.template_id ?? "",
    styleName: style.style_name ?? "",
    matkl: style.matkl_description_3 ?? "",
    businessUnit: style.business_unit ?? "",
    status: style.status === "inactive" ? "inactive" : "active",
    pack: style.pack ?? "",
    dropName: style.drop_name ?? "",
    supplierRequest: style.supplier_request ?? "",
    issueDate: toLocalInput(style.issue_date),
    colorCombo: style.color_combo ?? "",
    vendors: style.vendors ?? "",
  };
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<StyleFormValues>({
    resolver: zodResolver(styleFormSchema),
    mode: "onBlur",
    defaultValues: initialFormValues,
  });
  const watchedForm = useWatch({ control, defaultValue: initialFormValues });
  const form: StyleFormValues = { ...initialFormValues, ...watchedForm };
  const [imageUrl, setImageUrl] = useState<string | null>(style.image_url);
  const [imageDirty, setImageDirty] = useState(false);
  const [code, setCode] = useState(style.style_code);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Tabs keep everything on ONE page: the tab bar swaps sections in place — no
  // navigation. Each child sub-workspace fetches only once its tab is first
  // opened, then stays mounted (hidden) so switching back is instant and nothing
  // typed is lost. ?tab= is a client-side marker only (survives refresh /
  // deep-link) — it never loads a new page.
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "overview";
    const t = new URLSearchParams(window.location.search).get("tab");
    return TABS.some((tab) => tab.key === t) ? (t as TabKey) : "overview";
  });
  // Layout switch: "stacked" (default, all six sections down the page — the full
  // record at a glance) or "tabs" (one section at a time). Persisted per user.
  // Default is "stacked" so a fresh visit / refresh shows the whole form; only an
  // explicit "tabs" choice narrows it. Server render must match this default, so
  // it starts "stacked" and the effect below narrows to tabs if the user picked
  // it (avoids a hydration mismatch).
  const [layout, setLayout] = useState<"tabs" | "stacked">("stacked");
  // Stacked mounts every section, so seed all tabs as visited up front.
  const [visited, setVisited] = useState<Set<TabKey>>(
    () => new Set<TabKey>(TABS.map((t) => t.key)),
  );
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("threadline-style-layout");
    } catch {
      /* localStorage unavailable — keep stacked */
    }
    if (saved === "tabs") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayout("tabs");
    }
  }, []);
  const changeLayout = (next: "tabs" | "stacked") => {
    setLayout(next);
    if (next === "stacked") {
      // Mount every section so the whole record is visible at once.
      setVisited(new Set(TABS.map((t) => t.key)));
    }
    try {
      localStorage.setItem("threadline-style-layout", next);
    } catch {
      /* ignore */
    }
  };
  const stacked = layout === "stacked";
  // Per-tab item counts shown as badges. Colourways is seeded free from the
  // style record; the others fill in when their tab is first opened and update
  // live as items are added/removed (each child reports via onCount).
  const [counts, setCounts] = useState<Partial<Record<TabKey, number>>>({
    colourways: style.combo_count,
  });
  const makeCounter = useCallback(
    (key: TabKey) => (count: number) =>
      setCounts((current) =>
        current[key] === count ? current : { ...current, [key]: count },
      ),
    [],
  );
  const countColourways = useMemo(
    () => makeCounter("colourways"),
    [makeCounter],
  );
  const countSourcing = useMemo(() => makeCounter("sourcing"), [makeCounter]);
  const countSkus = useMemo(() => makeCounter("skus"), [makeCounter]);
  const countSampling = useMemo(() => makeCounter("sampling"), [makeCounter]);

  const selectTab = (key: TabKey) => {
    setActiveTab(key);
    setVisited((current) =>
      current.has(key) ? current : new Set(current).add(key),
    );
    // Update the URL marker without a navigation/scroll jump.
    const params = new URLSearchParams(window.location.search);
    if (key === "overview") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  };

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + dir + TABS.length) % TABS.length;
    selectTab(TABS[next].key);
  };

  const set = (patch: Partial<StyleFormValues>) => {
    for (const [key, value] of Object.entries(patch)) {
      setValue(key as keyof StyleFormValues, value as never, {
        shouldDirty: true,
        shouldValidate: key === "styleName",
      });
    }
    setSaved(false);
  };

  useEffect(() => {
    const unsaved = isDirty || imageDirty;
    if (!unsaved) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [imageDirty, isDirty]);

  // Ensure the style's own (possibly inactive) season is selectable.
  const seasonOptions = useMemo(() => {
    const list = [...options.seasons];
    if (style.season_id && !list.some((s) => s.id === style.season_id)) {
      list.unshift({
        id: style.season_id,
        name: style.season_name ?? "(current season)",
        generic: null,
        business_unit: null,
      });
    }
    return list;
  }, [options.seasons, style.season_id, style.season_name]);

  const templateName = useMemo(
    () => options.templates.find((t) => t.id === form.templateId)?.name ?? null,
    [options.templates, form.templateId],
  );

  const onPickImage = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be under 350 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result));
      setImageDirty(true);
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const save = async (values: StyleFormValues) => {
    setError("");
    try {
      const response = await fetch(`/api/styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: values.seasonId || null,
          department: values.department || null,
          brand: values.brand || null,
          productType: values.productType || null,
          styleType: values.styleType || null,
          templateId: values.templateId || null,
          templateName,
          styleName: values.styleName.trim(),
          matkl: values.matkl || null,
          businessUnit: values.businessUnit || null,
          status: values.status,
          pack: values.pack || null,
          dropName: values.dropName || null,
          supplierRequest: values.supplierRequest || null,
          issueDate: values.issueDate || null,
          colorCombo: values.colorCombo || null,
          vendors: values.vendors || null,
          imageUrl,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save style.");
      setCode(data.style?.style_code ?? code);
      reset(values);
      setImageDirty(false);
      setSaved(true);
      toast.success("Style saved", {
        description: `${values.styleName.trim()} is up to date.`,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save style.");
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/styles/${style.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not delete style.");
      }
      toast.success("Style deleted", {
        description: `${style.style_name || "The style"} was removed.`,
      });
      router.push("/styles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete style.");
      setDeleting(false);
    }
  };

  useSetRecordHeader({
    crumbs: [{ label: "Styles", href: "/styles" }],
    title: form.styleName || "Untitled style",
    status: {
      label: form.status === "active" ? "Active" : "Inactive",
      tone: form.status === "active" ? "active" : "inactive",
    },
    action: {
      label: "Save changes",
      icon: "save",
      onClick: () => void handleSubmit(save)(),
      disabled: isSubmitting,
      busy: isSubmitting,
    },
    onDelete: {
      onConfirm: remove,
      title: `Delete ${form.styleName || "this style"}?`,
      description:
        "This permanently removes the style and may affect linked colourways, BOMs, and sourcing records.",
      confirmLabel: "Delete style",
      disabled: deleting,
    },
  });

  return (
    <div className="record-page-v3">
      {/* Not a <form>: this record contains independent sub-forms (colour
          combos, artwork, sourcing, sampling). Nested forms are invalid HTML
          and break hydration, so saving is driven by the button below. */}
      <div className="styles-body detail-grid record-form-v3">
        <div className="detail-main">
          <div className="record-tabs-row">
            <div
              className="view-toggle"
              role="group"
              aria-label="Switch section layout"
            >
              <button
                type="button"
                className={`view-toggle-btn is-icon${!stacked ? " is-active" : ""}`}
                aria-pressed={!stacked}
                aria-label="Tabs — one section at a time"
                title="Tabs — one section at a time"
                onClick={() => changeLayout("tabs")}
              >
                <CardsIcon size={17} weight={!stacked ? "fill" : "regular"} />
              </button>
              <button
                type="button"
                className={`view-toggle-btn is-icon${stacked ? " is-active" : ""}`}
                aria-pressed={stacked}
                aria-label="All sections on one page"
                title="All sections on one page"
                onClick={() => changeLayout("stacked")}
              >
                <RowsIcon size={17} weight={stacked ? "fill" : "regular"} />
              </button>
            </div>
            {!stacked && (
              <div
                className="record-tabs"
                role="tablist"
                aria-label="Style sections"
              >
                {TABS.map((tab, index) => {
                  const selected = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      id={`style-tab-${tab.key}`}
                      aria-selected={selected}
                      aria-controls={`style-panel-${tab.key}`}
                      tabIndex={selected ? 0 : -1}
                      className={`record-tab${selected ? " is-active" : ""}`}
                      onClick={() => selectTab(tab.key)}
                      onKeyDown={(event) => onTabKeyDown(event, index)}
                    >
                      {tab.label}
                      {tab.key !== "overview" &&
                        typeof counts[tab.key] === "number" && (
                          <span className="record-tab-count">
                            {counts[tab.key]}
                          </span>
                        )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            role="tabpanel"
            id="style-panel-overview"
            aria-labelledby="style-tab-overview"
            hidden={!stacked && activeTab !== "overview"}
          >
          <section className="season-create">
            <h2>Identity</h2>
            <div className="season-fields">
              <label className="season-field">
                <span>Style name *</span>
                <input
                  value={form.styleName}
                  onChange={(e) => set({ styleName: e.target.value })}
                  onBlur={() =>
                    void setValue("styleName", form.styleName, {
                      shouldValidate: true,
                    })
                  }
                  aria-invalid={Boolean(errors.styleName)}
                  aria-describedby={
                    errors.styleName ? "style-name-error" : undefined
                  }
                />
                <FieldError
                  id="style-name-error"
                  message={errors.styleName?.message}
                />
              </label>
              <label className="season-field">
                <span>Style code</span>
                <input value={code ?? ""} readOnly disabled />
              </label>
              <label className="season-field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    set({ status: e.target.value as StyleFormValues["status"] })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
          </section>

          <section className="season-create">
            <h2>Classification</h2>
            <div className="season-fields">
              <label className="season-field">
                <span>Season</span>
                <select
                  value={form.seasonId}
                  onChange={(e) => set({ seasonId: e.target.value })}
                >
                  <option value="">Select season…</option>
                  {seasonOptions.map((s) => (
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
                  <option value="">Select…</option>
                  {options.departments.map((d) => (
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
                  <option value="">Select…</option>
                  {options.brands.map((b) => (
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
                  <option value="">Select…</option>
                  {options.productTypes.map((p) => (
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
                  <option value="">Select…</option>
                  {options.styleTypes.map((t) => (
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
                  <option value="">Select…</option>
                  {options.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
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
                  <option value="">Select…</option>
                  {options.businessUnits.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="season-create">
             <h2>Commercial</h2>
            <p className="styles-note" style={{ marginTop: 0 }}>
              These fill from a matching template on create; edit any of them
              here.
            </p>
            <div className="season-fields">
              <label className="season-field">
                <span>Pack</span>
                <input
                  value={form.pack}
                  onChange={(e) => set({ pack: e.target.value })}
                  placeholder="e.g. P1"
                />
              </label>
              <label className="season-field">
                <span>Drop</span>
                <input
                  value={form.dropName}
                  onChange={(e) => set({ dropName: e.target.value })}
                  placeholder="e.g. ALL"
                />
              </label>
              <label className="season-field">
                <span>Supplier request</span>
                <input
                  value={form.supplierRequest}
                  onChange={(e) => set({ supplierRequest: e.target.value })}
                  placeholder="Request reference"
                />
              </label>
              <label className="season-field">
                <span>Issue date</span>
                <DatePicker
                  withTime
                  value={form.issueDate}
                  onChange={(v) => set({ issueDate: v })}
                  ariaLabel="Issue date"
                />
              </label>
              <label className="season-field">
                <span>Colour combo</span>
                <input
                  value={form.colorCombo}
                  onChange={(e) => set({ colorCombo: e.target.value })}
                  placeholder="e.g. Blue Seal-A"
                />
              </label>
              <label className="season-field">
                <span>Vendors</span>
                <input
                  value={form.vendors}
                  onChange={(e) => set({ vendors: e.target.value })}
                  placeholder="Vendor name(s)"
                />
              </label>
            </div>
          </section>
          </div>

          <div
            role="tabpanel"
            id="style-panel-colourways"
            aria-labelledby="style-tab-colourways"
            hidden={!stacked && activeTab !== "colourways"}
          >
            {visited.has("colourways") && (
              <ColorCombos
                styleId={style.id}
                onCount={countColourways}
              />
            )}
          </div>

          <div
            role="tabpanel"
            id="style-panel-spec"
            aria-labelledby="style-tab-spec"
            hidden={!stacked && activeTab !== "spec"}
          >
            {visited.has("spec") && <SpecQuality styleId={style.id} />}
          </div>

          <div
            role="tabpanel"
            id="style-panel-sourcing"
            aria-labelledby="style-tab-sourcing"
            hidden={!stacked && activeTab !== "sourcing"}
          >
            {visited.has("sourcing") && (
              <Sourcing
                styleId={style.id}
                onCount={countSourcing}
              />
            )}
          </div>

          <div
            role="tabpanel"
            id="style-panel-skus"
            aria-labelledby="style-tab-skus"
            hidden={!stacked && activeTab !== "skus"}
          >
            {visited.has("skus") && (
              <StyleSkus
                styleId={style.id}
                onCount={countSkus}
                activeTab={activeTab}
                stacked={stacked}
              />
            )}
          </div>

          <div
            role="tabpanel"
            id="style-panel-sampling"
            aria-labelledby="style-tab-sampling"
            hidden={!stacked && activeTab !== "sampling"}
          >
            {visited.has("sampling") && (
              <Sampling
                styleId={style.id}
                onCount={countSampling}
              />
            )}
          </div>
        </div>

        <aside className="detail-aside">
          <StyleAssign styleId={style.id} initialRole={style.assigned_role} />

          <section className="season-create">
            <h2>Image</h2>
            <div className="detail-image-preview">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Style" />
              ) : (
                <ImageIcon size={30} />
              )}
            </div>
            <div className="season-image-buttons" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="ghost-button"
                onClick={() => fileRef.current?.click()}
              >
                {imageUrl ? "Change" : "Upload"}
              </button>
              {imageUrl && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setImageUrl(null);
                    setImageDirty(true);
                    setSaved(false);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPickImage(e.target.files?.[0])}
            />
          </section>

          <section className="season-create detail-meta">
            <h2>Record</h2>
            <dl>
              <div>
                <dt>Season</dt>
                <dd>{style.season_name || "—"}</dd>
              </div>
              <div>
                <dt>Created by</dt>
                <dd>{style.created_by || "—"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(style.created_at)}</dd>
              </div>
            </dl>
          </section>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          {saved && !error && !isDirty && !imageDirty && (
            <p className="detail-saved" role="status">
              All changes saved.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
