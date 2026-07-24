"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Buildings,
  CalendarBlank,
  Check,
  ClipboardText,
  Cube,
  Eye,
  FileText,
  Flask,
  Handshake,
  MagnifyingGlass,
  Package,
  Palette,
  Path,
  Pause,
  PencilSimple,
  Plus,
  Power,
  Ruler,
  SealCheck,
  ShieldCheck,
  SpinnerGap,
  Storefront,
  Swatches,
  Tag,
  Trash,
  TShirt,
  X,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/app/components/toast";
import { z } from "zod";
import { ConfirmAction } from "@/app/components/ConfirmAction";
import { useAdminSearch } from "@/app/components/AdminSearchContext";
import { FieldError } from "@/app/components/RecordWorkspace";
import type { RefItem } from "@/lib/admin-data";

type AdminMode = "view" | "edit";
type AdminGroup = "product" | "design" | "technical" | "supply";
type AdminData = Record<string, RefItem[]>;

const LISTS = [
  {
    slug: "departments",
    label: "Departments",
    description: "Ownership groups used across seasons and product records.",
    group: "product",
    tone: "sky",
    icon: Buildings,
  },
  {
    slug: "brands",
    label: "Brands & divisions",
    description: "Commercial brand and division values for product reporting.",
    group: "product",
    tone: "violet",
    icon: Tag,
  },
  {
    slug: "product-types",
    label: "Product types",
    description: "The primary product classification used by style records.",
    group: "product",
    tone: "cyan",
    icon: Cube,
  },
  {
    slug: "style-types",
    label: "Style types",
    description: "Reusable garment and style-type classifications.",
    group: "product",
    tone: "coral",
    icon: TShirt,
  },
  {
    slug: "templates",
    label: "Style templates",
    description: "Saved starting structures available to new style records.",
    group: "technical",
    tone: "violet",
    icon: FileText,
  },
  {
    slug: "colorway-selections",
    label: "Colourway selections",
    description: "Approved selection states for colourway decision making.",
    group: "design",
    tone: "sky",
    icon: Swatches,
  },
  {
    slug: "color-palettes",
    label: "Colour palettes",
    description: "Named palette sets shared by design and merchandising.",
    group: "design",
    tone: "coral",
    icon: Palette,
  },
  {
    slug: "spec-types",
    label: "Specification types",
    description: "Technical measurement and construction specification groups.",
    group: "technical",
    tone: "cyan",
    icon: Ruler,
  },
  {
    slug: "size-ranges",
    label: "Size ranges",
    description: "Standard size runs available to product and buying teams.",
    group: "design",
    tone: "violet",
    icon: Ruler,
  },
  {
    slug: "size-chart-templates",
    label: "Size chart templates",
    description: "Reusable measurement grids for technical specifications.",
    group: "technical",
    tone: "sky",
    icon: ClipboardText,
  },
  {
    slug: "sealers",
    label: "Sealers",
    description: "Quality and commercial sign-off owners for product records.",
    group: "supply",
    tone: "cyan",
    icon: SealCheck,
  },
  {
    slug: "vendors",
    label: "Vendors",
    description: "Approved vendors available in sourcing and purchase flows.",
    group: "supply",
    tone: "coral",
    icon: Storefront,
  },
  {
    slug: "supplier-request-templates",
    label: "Supplier request templates",
    description: "Standard structures for supplier outreach and quotation.",
    group: "supply",
    tone: "violet",
    icon: Handshake,
  },
  {
    slug: "data-package-templates",
    label: "Data package templates",
    description: "Controlled data bundles used for external handovers.",
    group: "technical",
    tone: "cyan",
    icon: Package,
  },
  {
    slug: "holiday-calendars",
    label: "Holiday calendars",
    description: "Planning calendars used by sourcing and critical paths.",
    group: "supply",
    tone: "sky",
    icon: CalendarBlank,
  },
  {
    slug: "critical-paths",
    label: "Critical paths",
    description: "Named delivery timelines available to planning workflows.",
    group: "technical",
    tone: "coral",
    icon: Path,
  },
  {
    slug: "sample-types",
    label: "Sample types",
    description: "Sampling stages shared by product and supplier teams.",
    group: "supply",
    tone: "cyan",
    icon: Flask,
  },
  {
    slug: "inspection-types",
    label: "Inspection types",
    description: "Quality inspection categories used on purchase orders.",
    group: "supply",
    tone: "violet",
    icon: ShieldCheck,
  },
] as const;

const GROUP_LABELS: Record<AdminGroup, string> = {
  product: "Product architecture",
  design: "Design & fit",
  technical: "Technical setup",
  supply: "Supply & quality",
};

const valueSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least two characters.")
    .max(80, "Keep the value under 80 characters."),
});

type ValueForm = z.infer<typeof valueSchema>;

export function AdminWorkspace({ initialData }: { initialData: AdminData }) {
  const [data, setData] = useState<AdminData>(initialData);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<AdminMode>("view");
  const { query: dashboardQuery, setQuery: setDashboardQuery } =
    useAdminSearch();
  const [valueQuery, setValueQuery] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const addForm = useForm<ValueForm>({
    resolver: zodResolver(valueSchema),
    defaultValues: { name: "" },
    mode: "onBlur",
  });
  const renameForm = useForm<ValueForm>({
    resolver: zodResolver(valueSchema),
    defaultValues: { name: "" },
    mode: "onBlur",
  });

  const selectedList = LISTS.find((list) => list.slug === selectedSlug);
  const selectedItems = useMemo(
    () => (selectedSlug ? (data[selectedSlug] ?? []) : []),
    [data, selectedSlug],
  );
  const visibleLists = useMemo(() => {
    const query = dashboardQuery.trim().toLowerCase();
    return LISTS.filter(
      (list) =>
        !query ||
        list.label.toLowerCase().includes(query) ||
        list.description.toLowerCase().includes(query) ||
        GROUP_LABELS[list.group].toLowerCase().includes(query),
    );
  }, [dashboardQuery]);

  const visibleValues = useMemo(() => {
    const query = valueQuery.trim().toLowerCase();
    return query
      ? selectedItems.filter((item) => item.name.toLowerCase().includes(query))
      : selectedItems;
  }, [selectedItems, valueQuery]);

  const openList = (slug: string, nextMode: AdminMode) => {
    setSelectedSlug(slug);
    setMode(nextMode);
    setValueQuery("");
    setRenameId(null);
    setError("");
    addForm.reset();
    renameForm.reset();
  };

  const closeList = () => {
    setSelectedSlug(null);
    setRenameId(null);
    setError("");
  };

  const addValue = addForm.handleSubmit(async ({ name }) => {
    if (!selectedSlug) return;
    setBusyKey("create");
    setError("");
    try {
      const response = await fetch(`/api/admin/${selectedSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not add this value.");
      }
      setData((current) => ({
        ...current,
        [selectedSlug]: [...(current[selectedSlug] ?? []), payload.item],
      }));
      addForm.reset();
      toast.success("Reference value added", {
        description: `${payload.item.name} is available to live product forms.`,
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add this value.",
      );
    } finally {
      setBusyKey(null);
    }
  });

  const beginRename = (item: RefItem) => {
    setRenameId(item.id);
    renameForm.reset({ name: item.name });
    setError("");
  };

  const saveRename = renameForm.handleSubmit(async ({ name }) => {
    if (!selectedSlug || !renameId) return;
    setBusyKey(`rename-${renameId}`);
    setError("");
    try {
      const response = await fetch(`/api/admin/${selectedSlug}/${renameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not rename this value.");
      }
      setData((current) => ({
        ...current,
        [selectedSlug]: (current[selectedSlug] ?? []).map((item) =>
          item.id === renameId ? payload.item : item,
        ),
      }));
      setRenameId(null);
      toast.success("Reference value updated", {
        description: `${payload.item.name} is now used by this reference set.`,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not rename this value.",
      );
    } finally {
      setBusyKey(null);
    }
  });

  const toggleActive = async (item: RefItem) => {
    if (!selectedSlug) return;
    setBusyKey(`toggle-${item.id}`);
    setError("");
    try {
      const response = await fetch(`/api/admin/${selectedSlug}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not change this status.");
      }
      setData((current) => ({
        ...current,
        [selectedSlug]: (current[selectedSlug] ?? []).map((entry) =>
          entry.id === item.id ? payload.item : entry,
        ),
      }));
      toast.success(payload.item.active ? "Value activated" : "Value paused", {
        description: payload.item.active
          ? `${payload.item.name} is available to live forms.`
          : `${payload.item.name} remains in history but is hidden from new selections.`,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not change this status.",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const removeValue = async (item: RefItem) => {
    if (!selectedSlug) return;
    setBusyKey(`delete-${item.id}`);
    setError("");
    try {
      const response = await fetch(`/api/admin/${selectedSlug}/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not delete this value.");
      }
      setData((current) => ({
        ...current,
        [selectedSlug]: (current[selectedSlug] ?? []).filter(
          (entry) => entry.id !== item.id,
        ),
      }));
      toast.success("Reference value deleted", {
        description: `${item.name} was removed from ${selectedList?.label.toLowerCase()}.`,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not delete this value.",
      );
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <main className="admin-command" aria-label="Reference data administration">
      {visibleLists.length ? (
        <section className="admin-card-grid" aria-label="Reference data sets">
          {visibleLists.map((list, index) => {
            const Icon = list.icon;
            const items = data[list.slug] ?? [];
            const activeCount = items.filter((item) => item.active).length;
            return (
              <article
                key={list.slug}
                className={`admin-data-card tone-${list.tone}`}
                style={{ "--card-order": index } as React.CSSProperties}
              >
                <div className="admin-data-card-head">
                  <span className="admin-data-card-icon" aria-hidden="true">
                    <Icon size={24} weight="duotone" />
                  </span>
                  <span className="admin-data-card-count">
                    {activeCount}/{items.length} live
                  </span>
                </div>
                <div className="admin-data-card-copy">
                  <span>{GROUP_LABELS[list.group]}</span>
                  <h2>{list.label}</h2>
                  <p>{list.description}</p>
                </div>
                <div className="admin-data-card-actions">
                  <button
                    type="button"
                    onClick={() => openList(list.slug, "view")}
                  >
                    <Eye size={17} /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => openList(list.slug, "edit")}
                  >
                    <PencilSimple size={17} /> Edit
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="admin-no-results" aria-live="polite">
          <MagnifyingGlass size={28} />
          <h2>No matching data sets</h2>
          <p>Clear the search or choose another group to see more options.</p>
          <button
            type="button"
            onClick={() => {
              setDashboardQuery("");
            }}
          >
            Clear search
          </button>
        </section>
      )}

      <Dialog.Root
        open={Boolean(selectedList)}
        onOpenChange={(open) => {
          if (!open) closeList();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="admin-dialog-overlay" />
          {selectedList && (
            <Dialog.Content className="admin-dialog-content">
              <header className="admin-dialog-header">
                <span className={`admin-dialog-icon tone-${selectedList.tone}`}>
                  <selectedList.icon size={26} weight="duotone" />
                </span>
                <div>
                  <p>{GROUP_LABELS[selectedList.group]}</p>
                  <Dialog.Title>{selectedList.label}</Dialog.Title>
                  <Dialog.Description className="admin-dialog-description">
                    {selectedList.description}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="admin-dialog-close"
                  aria-label="Close panel"
                >
                  <X size={20} />
                </Dialog.Close>
              </header>

              <div
                className="admin-dialog-mode"
                role="tablist"
                aria-label="Panel mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "view"}
                  className={mode === "view" ? "is-active" : ""}
                  onClick={() => {
                    setMode("view");
                    setRenameId(null);
                  }}
                >
                  <Eye size={17} /> View values
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "edit"}
                  className={mode === "edit" ? "is-active" : ""}
                  onClick={() => setMode("edit")}
                >
                  <PencilSimple size={17} /> Edit values
                </button>
              </div>

              <div className="admin-dialog-tools">
                <label className="admin-value-search">
                  <MagnifyingGlass size={18} />
                  <span className="sr-only">Search {selectedList.label}</span>
                  <input
                    type="search"
                    value={valueQuery}
                    onChange={(event) => setValueQuery(event.target.value)}
                    placeholder={`Search ${selectedList.label.toLowerCase()}`}
                  />
                </label>
                <span>
                  {selectedItems.filter((item) => item.active).length} active ·{" "}
                  {selectedItems.length} total
                </span>
              </div>

              {error && (
                <div className="admin-dialog-error" role="alert">
                  <ShieldCheck size={19} />
                  <span>{error}</span>
                  <button type="button" onClick={() => setError("")}>
                    Dismiss
                  </button>
                </div>
              )}

              {mode === "edit" && (
                <form
                  className="admin-create-value"
                  onSubmit={addValue}
                  noValidate
                >
                  <label htmlFor="admin-new-value">Add a new value</label>
                  <div>
                    <input
                      id="admin-new-value"
                      placeholder={`New ${selectedList.label.toLowerCase()} value`}
                      aria-invalid={Boolean(addForm.formState.errors.name)}
                      aria-describedby={
                        addForm.formState.errors.name
                          ? "admin-new-value-error"
                          : undefined
                      }
                      {...addForm.register("name")}
                    />
                    <button type="submit" disabled={busyKey === "create"}>
                      {busyKey === "create" ? (
                        <SpinnerGap className="is-spinning" size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                      Add value
                    </button>
                  </div>
                  <FieldError
                    id="admin-new-value-error"
                    message={addForm.formState.errors.name?.message}
                  />
                </form>
              )}

              <div
                className="admin-value-list"
                role="tabpanel"
                aria-label={`${mode === "view" ? "View" : "Edit"} ${selectedList.label}`}
              >
                {visibleValues.length ? (
                  visibleValues.map((item) => (
                    <div
                      key={item.id}
                      className={`admin-value-row${item.active ? "" : " is-inactive"}`}
                    >
                      {mode === "edit" && renameId === item.id ? (
                        <form
                          className="admin-rename-value"
                          onSubmit={saveRename}
                          noValidate
                        >
                          <label
                            className="sr-only"
                            htmlFor={`rename-${item.id}`}
                          >
                            Rename {item.name}
                          </label>
                          <input
                            id={`rename-${item.id}`}
                            autoFocus
                            aria-invalid={Boolean(
                              renameForm.formState.errors.name,
                            )}
                            aria-describedby={
                              renameForm.formState.errors.name
                                ? `rename-${item.id}-error`
                                : undefined
                            }
                            {...renameForm.register("name")}
                          />
                          <button
                            type="submit"
                            disabled={busyKey === `rename-${item.id}`}
                            aria-label={`Save ${item.name}`}
                          >
                            {busyKey === `rename-${item.id}` ? (
                              <SpinnerGap className="is-spinning" size={17} />
                            ) : (
                              <Check size={17} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenameId(null)}
                            aria-label="Cancel rename"
                          >
                            <X size={17} />
                          </button>
                          <FieldError
                            id={`rename-${item.id}-error`}
                            message={renameForm.formState.errors.name?.message}
                          />
                        </form>
                      ) : (
                        <>
                          <div className="admin-value-identity">
                            <span>{item.name}</span>
                            <small>
                              Order {item.sort} · {item.id.slice(0, 8)}
                            </small>
                          </div>
                          <span
                            className={`admin-value-status${item.active ? " is-active" : ""}`}
                          >
                            {item.active ? (
                              <Power size={14} />
                            ) : (
                              <Pause size={14} />
                            )}
                            {item.active ? "Active" : "Inactive"}
                          </span>
                          {mode === "edit" && (
                            <div className="admin-value-actions">
                              <button
                                type="button"
                                onClick={() => toggleActive(item)}
                                disabled={busyKey === `toggle-${item.id}`}
                                aria-label={
                                  item.active
                                    ? `Deactivate ${item.name}`
                                    : `Activate ${item.name}`
                                }
                              >
                                {busyKey === `toggle-${item.id}` ? (
                                  <SpinnerGap
                                    className="is-spinning"
                                    size={17}
                                  />
                                ) : item.active ? (
                                  <Pause size={17} />
                                ) : (
                                  <Power size={17} />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => beginRename(item)}
                                aria-label={`Rename ${item.name}`}
                              >
                                <PencilSimple size={17} />
                              </button>
                              <ConfirmAction
                                title={`Delete ${item.name}?`}
                                description="This value will no longer be available to product forms. Deletion can fail when live records still reference it."
                                confirmLabel="Delete value"
                                destructive
                                onConfirm={() => removeValue(item)}
                                trigger={
                                  <button
                                    type="button"
                                    className="is-danger"
                                    disabled={busyKey === `delete-${item.id}`}
                                    aria-label={`Delete ${item.name}`}
                                  >
                                    <Trash size={17} />
                                  </button>
                                }
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="admin-values-empty">
                    <MagnifyingGlass size={26} />
                    <strong>No matching values</strong>
                    <p>
                      Try a different search or add a new value in Edit mode.
                    </p>
                  </div>
                )}
              </div>

              <footer className="admin-dialog-footer">
                <p>
                  Changes update the live selections used throughout Threadline.
                </p>
                {mode === "view" ? (
                  <button type="button" onClick={() => setMode("edit")}>
                    Edit this set <ArrowRight size={17} />
                  </button>
                ) : (
                  <button type="button" onClick={() => setMode("view")}>
                    Return to view
                  </button>
                )}
              </footer>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
