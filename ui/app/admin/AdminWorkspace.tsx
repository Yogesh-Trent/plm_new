"use client";

import { useEffect, useRef, useState } from "react";
import { Check, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ConfirmAction } from "@/app/components/ConfirmAction";
import {
  OperationalContent,
  OperationalHeader,
  OperationalPage,
} from "@/app/components/OperationalWorkspace";

type RefItem = { id: string; name: string; sort: number; active: boolean };

// Slug → label. Slugs map to fixed tables on the server (whitelisted).
const LISTS = [
  { slug: "departments", label: "Departments" },
  { slug: "brands", label: "Brands / Divisions" },
  { slug: "product-types", label: "Product types" },
  { slug: "style-types", label: "Style types" },
  { slug: "templates", label: "Templates" },
  { slug: "colorway-selections", label: "Colorway selections" },
  { slug: "color-palettes", label: "Colour palettes" },
  { slug: "spec-types", label: "Spec types" },
  { slug: "size-ranges", label: "Size ranges" },
  { slug: "size-chart-templates", label: "Size chart templates" },
  { slug: "sealers", label: "Sealers" },
  { slug: "vendors", label: "Vendors" },
  { slug: "supplier-request-templates", label: "Supplier request templates" },
  { slug: "data-package-templates", label: "Data package templates" },
  { slug: "holiday-calendars", label: "Holiday calendars" },
  { slug: "critical-paths", label: "Critical paths" },
  { slug: "sample-types", label: "Sample types" },
  { slug: "inspection-types", label: "Inspection types" },
] as const;

export function AdminWorkspace() {
  const [active, setActive] = useState<string>(LISTS[0].slug);
  const [items, setItems] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  // Fetch the active list. State is only touched inside async callbacks (never
  // synchronously in the effect body) to avoid cascading-render lint/perf issues.
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/${active}`)
      .then((response) =>
        response.json().then((data) => ({ ok: response.ok, data })),
      )
      .then(({ ok, data }) => {
        if (!alive) return;
        if (!ok) throw new Error(data?.error ?? "Could not load list.");
        setItems(data.items ?? []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Could not load list.");
        setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [active]);

  const chooseList = (slug: string) => {
    setActive(slug);
    setEditingId(null);
    setNewName("");
    setError("");
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${active}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not add item.");
      setItems((current) => [...current, data.item]);
      setNewName("");
      addRef.current?.focus();
      toast.success("Reference value added", {
        description: `${data.item.name} is now available to live forms.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item.");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${active}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not rename.");
      setItems((current) => current.map((i) => (i.id === id ? data.item : i)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (item: RefItem) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/${active}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not update.");
      setItems((current) =>
        current.map((i) => (i.id === item.id ? data.item : i)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: RefItem) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${active}/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not delete.");
      }
      setItems((current) => current.filter((i) => i.id !== item.id));
      toast.success("Reference value deleted", {
        description: `${item.name} was removed from ${activeLabel.toLowerCase()}.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  };

  const activeLabel = LISTS.find((l) => l.slug === active)?.label ?? "";

  return (
    <OperationalPage>
      <OperationalHeader
        eyebrow="Administration"
        title="Reference data"
        description="Manage the controlled values used across live product records."
      />

      <OperationalContent>
        <div className="admin-body">
          <aside className="admin-rail">
            <p className="process-rail-title">Lists</p>
            <nav className="admin-nav">
              {LISTS.map((list) => (
                <button
                  key={list.slug}
                  className={
                    active === list.slug
                      ? "admin-nav-item is-active"
                      : "admin-nav-item"
                  }
                  onClick={() => chooseList(list.slug)}
                >
                  {list.label}
                </button>
              ))}
            </nav>
            <p className="admin-hint">
              These lists feed the Style form. Templates hold saved defaults
              (the full template builder comes later).
            </p>
          </aside>

          <main className="admin-main">
            <h2>{activeLabel}</h2>

            <form className="admin-add" onSubmit={add}>
              <input
                ref={addRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`Add ${activeLabel.toLowerCase()}…`}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={busy || !newName.trim()}
              >
                <Plus size={16} /> Add
              </button>
            </form>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            {loading ? (
              <p className="season-empty">Loading…</p>
            ) : items.length === 0 ? (
              <p className="season-empty">
                Nothing here yet. Add the first item above.
              </p>
            ) : (
              <ul className="admin-list">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={item.active ? "" : "is-inactive"}
                  >
                    {editingId === item.id ? (
                      <>
                        <input
                          className="admin-edit-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(item.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <div className="admin-item-actions">
                          <button
                            className="icon-action"
                            onClick={() => saveEdit(item.id)}
                            disabled={busy}
                            title="Save"
                            aria-label="Save name"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className="icon-action"
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                            aria-label="Cancel edit"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="admin-item-name">{item.name}</span>
                        <div className="admin-item-actions">
                          <button
                            className={
                              item.active
                                ? "status-pill is-active"
                                : "status-pill is-inactive"
                            }
                            onClick={() => toggleActive(item)}
                            disabled={busy}
                            title="Toggle active"
                          >
                            <span className="status-dot" />
                            {item.active ? "Active" : "Inactive"}
                          </button>
                          <button
                            className="icon-action"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditName(item.name);
                            }}
                            disabled={busy}
                            title="Rename"
                            aria-label={`Rename ${item.name}`}
                          >
                            <PencilSimple size={16} />
                          </button>
                          <ConfirmAction
                            title={`Delete ${item.name}?`}
                            description="This value will no longer be available to product forms. Deletion can fail when live records still reference it."
                            confirmLabel="Delete value"
                            destructive
                            onConfirm={() => remove(item)}
                            trigger={
                              <button
                                className="icon-action is-danger"
                                disabled={busy}
                                title="Delete"
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash size={16} />
                              </button>
                            }
                          />
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </main>
        </div>
      </OperationalContent>
    </OperationalPage>
  );
}
