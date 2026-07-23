"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CalendarBlank,
  CheckCircle,
  Image as ImageIcon,
  PencilSimple,
  Plus,
  Stack,
  Trash,
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

type Season = {
  id: string;
  name: string;
  generic: string | null;
  business_unit: string | null;
  department: string | null;
  image_url: string | null;
  season_complete_date: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  number_of_styles: number;
};

const MAX_IMAGE_BYTES = 350 * 1024;

// Best-effort short code from a season name, e.g. "Burnt Toast AW 26" → "AW26".
function deriveGeneric(name: string) {
  const match = name.match(/\b(SS|AW|SP|FW|PF|RS)\s*'?\s*(\d{2,4})\b/i);
  if (match) return `${match[1].toUpperCase()}${match[2]}`;
  return "";
}

function formatDate(iso: string | null, withTime = true) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// ISO → value for <input type="datetime-local"> in the viewer's local time.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

const EMPTY = {
  name: "",
  generic: "",
  businessUnit: "",
  department: "",
  completeDate: "",
  status: "active",
  imageUrl: null as string | null,
};

export function ProcessWorkspace({ userName }: { userName: string }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [genericTouched, setGenericTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/seasons").then((r) => (r.ok ? r.json() : { seasons: [] })),
      fetch("/api/departments").then((r) =>
        r.ok ? r.json() : { departments: [] },
      ),
    ])
      .then(([s, d]) => {
        if (!active) return;
        setSeasons(s.seasons ?? []);
        setDepartments(d.departments ?? []);
      })
      .catch(() => {
        if (active)
          setLoadError("Seasons could not be loaded from the workspace.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const set = (patch: Partial<typeof EMPTY>) =>
    setForm((current) => ({ ...current, ...patch }));

  const onNameChange = (value: string) => {
    set({
      name: value,
      ...(genericTouched ? {} : { generic: deriveGeneric(value) }),
    });
  };

  const onPickImage = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Logo must be under 350 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set({ imageUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setGenericTouched(false);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (season: Season) => {
    setEditingId(season.id);
    setGenericTouched(true);
    setError("");
    setForm({
      name: season.name,
      generic: season.generic ?? "",
      businessUnit: season.business_unit ?? "",
      department: season.department ?? "",
      completeDate: toLocalInput(season.season_complete_date),
      status: season.status,
      imageUrl: season.image_url,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Season name is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      generic: form.generic.trim(),
      businessUnit: form.businessUnit.trim(),
      department: form.department,
      seasonCompleteDate: form.completeDate || null,
      status: form.status,
      imageUrl: form.imageUrl,
    };
    try {
      const response = await fetch(
        editingId ? `/api/seasons/${editingId}` : "/api/seasons",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error ?? "Could not save season.");
      setSeasons((current) =>
        editingId
          ? current.map((s) => (s.id === editingId ? data.season : s))
          : [data.season, ...current],
      );
      toast.success(editingId ? "Season updated" : "Season created", {
        description: `${data.season.name} is available to live product records.`,
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save season.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (season: Season) => {
    setBusyId(season.id);
    const next = season.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`/api/seasons/${season.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error ?? "Could not update status.");
      setSeasons((current) =>
        current.map((s) => (s.id === season.id ? data.season : s)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (season: Season) => {
    setBusyId(season.id);
    try {
      const response = await fetch(`/api/seasons/${season.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not delete season.");
      }
      setSeasons((current) => current.filter((s) => s.id !== season.id));
      if (editingId === season.id) resetForm();
      toast.success("Season deleted", {
        description: `${season.name} was removed from the collection workspace.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete season.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <OperationalPage>
      <OperationalHeader
        eyebrow="Collection setup"
        title="Seasons"
        description="Define a season; its style count updates automatically as product records are added."
        actions={
          <span className="process-count">
            <Stack size={16} /> {seasons.length} season
            {seasons.length === 1 ? "" : "s"}
          </span>
        }
      />

      <OperationalContent>
        <section className="season-create" ref={formRef}>
          <h2>{editingId ? "Edit season" : "New season"}</h2>
          <form onSubmit={submit}>
            <div className="season-fields">
              <label className="season-field">
                <span>Season name *</span>
                <input
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="e.g. Burnt Toast AW 26"
                  autoFocus
                />
              </label>
              <label className="season-field">
                <span>Business unit</span>
                <input
                  value={form.businessUnit}
                  onChange={(e) => set({ businessUnit: e.target.value })}
                  placeholder="Brand name (full)"
                />
              </label>
              <label className="season-field">
                <span>Department</span>
                <select
                  value={form.department}
                  onChange={(e) => set({ department: e.target.value })}
                >
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Generic season</span>
                <input
                  value={form.generic}
                  onChange={(e) => {
                    setGenericTouched(true);
                    set({ generic: e.target.value });
                  }}
                  placeholder="Short form, e.g. AW26"
                />
              </label>
              <label className="season-field">
                <span>Season complete date</span>
                <input
                  type="datetime-local"
                  value={form.completeDate}
                  onChange={(e) => set({ completeDate: e.target.value })}
                />
              </label>
              <label className="season-field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="season-field">
                <span>Number of styles</span>
                <input
                  value="0"
                  readOnly
                  disabled
                  title="Grows as styles are created"
                />
              </label>
              <label className="season-field">
                <span>Created by</span>
                <input value={userName} readOnly disabled />
              </label>
              <label className="season-field">
                <span>Created</span>
                <input value="Set automatically on save" readOnly disabled />
              </label>
            </div>

            <div className="season-image-row">
              <div
                className="season-image-preview"
                aria-hidden={!form.imageUrl}
              >
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="Season logo preview" />
                ) : (
                  <ImageIcon size={22} />
                )}
              </div>
              <div className="season-image-controls">
                <span className="field-label">Image / logo</span>
                <div className="season-image-buttons">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => fileRef.current?.click()}
                  >
                    {form.imageUrl ? "Change logo" : "Upload logo"}
                  </button>
                  {form.imageUrl && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        set({ imageUrl: null });
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
              </div>
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
                onClick={resetForm}
              >
                {editingId ? "Cancel" : "Clear"}
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                <Plus size={16} />
                {submitting
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Create season"}
              </button>
            </div>
          </form>
        </section>

        <OperationalPanel title="Seasons" count={seasons.length}>
          {loadError ? (
            <OperationalState
              kind="error"
              title="Seasons are unavailable"
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
              title="Loading seasons"
              detail="Retrieving the latest collection setup and style counts."
            />
          ) : seasons.length === 0 ? (
            <OperationalState
              kind="empty"
              title="No seasons yet"
              detail="Use the form above to establish the first collection season."
            />
          ) : (
            <OperationalTableRegion>
              <table className="season-table">
                <thead>
                  <tr>
                    <th>Logo</th>
                    <th>Season</th>
                    <th>Department</th>
                    <th>Generic</th>
                    <th>Business unit</th>
                    <th># Styles</th>
                    <th>Complete date</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Created by</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((season) => (
                    <tr
                      key={season.id}
                      className={
                        editingId === season.id ? "is-editing" : undefined
                      }
                    >
                      <td>
                        <span className="season-logo">
                          {season.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={season.image_url} alt="" />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </span>
                      </td>
                      <td className="season-name-cell">{season.name}</td>
                      <td>{season.department || "—"}</td>
                      <td>{season.generic || "—"}</td>
                      <td>{season.business_unit || "—"}</td>
                      <td>
                        <span className="season-styles">
                          {season.number_of_styles === 0 ? (
                            <>0</>
                          ) : (
                            <>
                              <CheckCircle size={14} weight="fill" />
                              {season.number_of_styles}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="season-date">
                        {formatDate(season.season_complete_date, false)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={
                            season.status === "active"
                              ? "status-pill is-active"
                              : "status-pill is-inactive"
                          }
                          onClick={() => toggleStatus(season)}
                          disabled={busyId === season.id}
                          title="Toggle status (creator only)"
                          aria-label={`Status ${season.status}, click to toggle`}
                        >
                          <span className="status-dot" />
                          {season.status === "active" ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="season-date">
                        <CalendarBlank size={13} />{" "}
                        {formatDate(season.created_at)}
                      </td>
                      <td>{season.created_by || "—"}</td>
                      <td>
                        <div className="season-row-actions">
                          <button
                            type="button"
                            className="icon-action"
                            onClick={() => startEdit(season)}
                            disabled={busyId === season.id}
                            title="Edit season"
                            aria-label={`Edit ${season.name}`}
                          >
                            <PencilSimple size={16} />
                          </button>
                          <ConfirmAction
                            title={`Delete ${season.name}?`}
                            description="This permanently removes the season. Styles already linked to it may prevent deletion."
                            confirmLabel="Delete season"
                            destructive
                            onConfirm={() => remove(season)}
                            trigger={
                              <button
                                type="button"
                                className="icon-action is-danger"
                                disabled={busyId === season.id}
                                title="Delete season"
                                aria-label={`Delete ${season.name}`}
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
