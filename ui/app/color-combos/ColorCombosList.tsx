"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretLeft,
  CaretRight,
  ImageSquare,
  MagnifyingGlass,
  PencilSimple,
  Plus,
} from "@phosphor-icons/react";
import {
  OperationalContent,
  OperationalHeader,
  OperationalPage,
  OperationalPanel,
  OperationalState,
  OperationalTableRegion,
} from "@/app/components/OperationalWorkspace";

type Combo = {
  id: string;
  style_id: string;
  name: string;
  combo_code: string | null;
  colorway_selection: string | null;
  pantone_code: string | null;
  colour_family: string | null;
  generic: string | null;
  pack: string | null;
  drop_name: string | null;
  month: string | null;
  image_url: string | null;
  status: string;
  style_name: string | null;
  style_code: string | null;
  brand: string | null;
  product_type: string | null;
  season_name: string | null;
};

type StyleOption = {
  id: string;
  style_name: string | null;
  style_code: string | null;
};

const PAGE_SIZE = 20;
const MAX_IMAGE_BYTES = 350 * 1024;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Full create form — mirrors the fields on the combo detail page so a colourway
// can be created complete in one place instead of create-then-open-to-fill.
const EMPTY_COMBO = {
  styleId: "",
  name: "",
  colourFamily: "",
  generic: "",
  colorwaySelection: "",
  pantoneCode: "",
  colorPalette: "",
  pack: "",
  dropName: "",
  month: "",
};

function cell(value: string | null) {
  return value && value.trim() ? value : "—";
}

export function ColorCombosList({
  initialQuery,
  initialOffset,
}: {
  initialQuery: string;
  initialOffset: number;
}) {
  const router = useRouter();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(initialOffset);
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [adding, setAdding] = useState(false);
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [comboOptions, setComboOptions] = useState<{
    colorwaySelections: string[];
    colorPalettes: string[];
  }>({ colorwaySelections: [], colorPalettes: [] });
  const [form, setForm] = useState({ ...EMPTY_COMBO });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const setField = (patch: Partial<typeof EMPTY_COMBO>) =>
    setForm((current) => ({ ...current, ...patch }));

  // State is set only inside async callbacks (never synchronously in the effect).
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (search) params.set("q", search);
    fetch(`/api/color-combos?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { combos: [], total: 0 }))
      .then((data) => {
        if (!alive) return;
        setCombos(data.combos ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        if (alive)
          setLoadError("Colourways could not be loaded from the workspace.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [offset, search, reloadTick]);

  const openAdd = async () => {
    setAdding((v) => !v);
    setError("");
    if (styles.length === 0) {
      const [stylesData, optionsData] = await Promise.all([
        fetch("/api/styles")
          .then((r) => (r.ok ? r.json() : { styles: [] }))
          .catch(() => ({ styles: [] })),
        fetch("/api/combo-options")
          .then((r) => (r.ok ? r.json() : { options: null }))
          .catch(() => ({ options: null })),
      ]);
      setStyles(stylesData.styles ?? []);
      if (optionsData.options) setComboOptions(optionsData.options);
    }
  };

  const onPickImage = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be under 350 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.styleId) {
      setError("Pick a style for the combo.");
      return;
    }
    if (!form.name.trim()) {
      setError("Colour combo name is required.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      // The create endpoint accepts the full field set, so the colourway is
      // saved complete in one request — no create-then-open second step.
      const response = await fetch(`/api/styles/${form.styleId}/color-combos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          colourFamily: form.colourFamily || null,
          generic: form.generic || null,
          colorwaySelection: form.colorwaySelection || null,
          pantoneCode: form.pantoneCode || null,
          colorPalette: form.colorPalette || null,
          pack: form.pack || null,
          dropName: form.dropName || null,
          month: form.month || null,
          imageUrl: imageUrl || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error ?? "Could not create combo.");
      // Stay on the list; reset the form, close it, and reload the table so the
      // new row shows with its joined style/season context.
      setForm({ ...EMPTY_COMBO });
      setImageUrl(null);
      setAdding(false);
      setCreating(false);
      setLoading(true);
      setReloadTick((t) => t + 1);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create combo.");
      setCreating(false);
    }
  };

  const toggleStatus = async (combo: Combo) => {
    const next = combo.status === "active" ? "inactive" : "active";
    const response = await fetch(`/api/color-combos/${combo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data?.combo) {
        setCombos((current) =>
          current.map((c) => (c.id === combo.id ? data.combo : c)),
        );
      }
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    updateDataset(0, query.trim());
  };

  const updateDataset = (nextOffset: number, nextSearch = search) => {
    setLoading(true);
    setLoadError("");
    setOffset(nextOffset);
    setSearch(nextSearch);
    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    const page = Math.floor(nextOffset / PAGE_SIZE) + 1;
    if (page > 1) params.set("page", String(page));
    const suffix = params.toString();
    router.replace(suffix ? `/color-combos?${suffix}` : "/color-combos", {
      scroll: false,
    });
  };

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <OperationalPage>
      <OperationalHeader
        eyebrow="Product colour"
        title="Colourways"
        description="Search, create, and maintain sellable colour variations across every style."
        actions={
          <button className="primary-button" onClick={openAdd}>
            <Plus size={16} /> Add new colour combo
          </button>
        }
      />

      <OperationalContent>
        {adding && (
          <section className="season-create">
            <h2>New colour combo</h2>
            <form onSubmit={create}>
              <div className="season-fields">
                <label className="season-field">
                  <span>Style *</span>
                  <select
                    value={form.styleId}
                    onChange={(e) => setField({ styleId: e.target.value })}
                  >
                    <option value="">Select style…</option>
                    {styles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.style_name} {s.style_code ? `· ${s.style_code}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="season-field">
                  <span>Colour combo name *</span>
                  <input
                    value={form.name}
                    onChange={(e) => setField({ name: e.target.value })}
                    placeholder="e.g. BLACK"
                  />
                </label>
                <label className="season-field">
                  <span>Colour family</span>
                  <input
                    value={form.colourFamily}
                    onChange={(e) => setField({ colourFamily: e.target.value })}
                    placeholder="e.g. Blues"
                  />
                </label>
                <label className="season-field">
                  <span>Generic</span>
                  <input
                    value={form.generic}
                    onChange={(e) => setField({ generic: e.target.value })}
                    placeholder="e.g. AW26"
                  />
                </label>
                <label className="season-field">
                  <span>Colorway selection</span>
                  <select
                    value={form.colorwaySelection}
                    onChange={(e) =>
                      setField({ colorwaySelection: e.target.value })
                    }
                  >
                    <option value="">Select…</option>
                    {comboOptions.colorwaySelections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="season-field">
                  <span>Pantone code</span>
                  <input
                    value={form.pantoneCode}
                    onChange={(e) => setField({ pantoneCode: e.target.value })}
                    placeholder="e.g. 19-4052 TCX"
                  />
                </label>
                <label className="season-field">
                  <span>Colour palette</span>
                  <select
                    value={form.colorPalette}
                    onChange={(e) => setField({ colorPalette: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {comboOptions.colorPalettes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="season-field">
                  <span>Pack</span>
                  <input
                    value={form.pack}
                    onChange={(e) => setField({ pack: e.target.value })}
                    placeholder="e.g. P1"
                  />
                </label>
                <label className="season-field">
                  <span>Drop</span>
                  <input
                    value={form.dropName}
                    onChange={(e) => setField({ dropName: e.target.value })}
                    placeholder="e.g. ALL"
                  />
                </label>
                <label className="season-field">
                  <span>Month</span>
                  <select
                    value={form.month}
                    onChange={(e) => setField({ month: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="season-field">
                  <span>Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickImage(e.target.files?.[0])}
                  />
                </label>
              </div>
              {imageUrl && (
                <div className="season-logo" aria-label="Selected image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" />
                </div>
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
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create colourway"}
                </button>
              </div>
            </form>
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            {styles.length === 0 && (
              <p className="styles-hint">
                No styles yet — create a style first.
              </p>
            )}
          </section>
        )}

        <OperationalPanel
          title="Colourways"
          count={total}
          actions={
            <form className="combo-search" onSubmit={submitSearch}>
              <MagnifyingGlass size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search combo, code or style…"
              />
              <button type="submit" className="ghost-button">
                Search
              </button>
            </form>
          }
        >
          {loadError ? (
            <OperationalState
              kind="error"
              title="Colourways are unavailable"
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
              title="Loading colourways"
              detail="Retrieving colourway records and their parent style context."
            />
          ) : combos.length === 0 ? (
            <OperationalState
              kind="empty"
              title={search ? "No matching colourways" : "No colourways yet"}
              detail={
                search
                  ? "Try a broader style name, code, or colourway search."
                  : "Create the first colourway from a live style record."
              }
            />
          ) : (
            <>
              <OperationalTableRegion>
                <table className="season-table">
                  <thead>
                    <tr>
                      <th>Season</th>
                      <th>Brand/Division</th>
                      <th>Product Type</th>
                      <th>Style</th>
                      <th>Style Code</th>
                      <th>Active</th>
                      <th>Colour Combo</th>
                      <th>Colour Family</th>
                      <th>Generic</th>
                      <th>Code</th>
                      <th>Pantone</th>
                      <th>Pack</th>
                      <th>Drop</th>
                      <th>Month</th>
                      <th>Image</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map((combo) => (
                      <tr key={combo.id}>
                        <td>{cell(combo.season_name)}</td>
                        <td>{cell(combo.brand)}</td>
                        <td>{cell(combo.product_type)}</td>
                        <td className="season-name-cell">
                          {cell(combo.style_name)}
                        </td>
                        <td>{cell(combo.style_code)}</td>
                        <td>
                          <button
                            type="button"
                            className={
                              combo.status === "active"
                                ? "status-pill is-active"
                                : "status-pill is-inactive"
                            }
                            onClick={() => toggleStatus(combo)}
                            title="Toggle status"
                          >
                            <span className="status-dot" />
                            {combo.status === "active" ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="season-name-cell">
                          <Link
                            href={`/color-combos/${combo.id}`}
                            className="style-name-link"
                          >
                            {cell(combo.name)}
                          </Link>
                        </td>
                        <td>{cell(combo.colour_family)}</td>
                        <td>{cell(combo.generic)}</td>
                        <td>{cell(combo.combo_code)}</td>
                        <td>{cell(combo.pantone_code)}</td>
                        <td>{cell(combo.pack)}</td>
                        <td>{cell(combo.drop_name)}</td>
                        <td>{cell(combo.month)}</td>
                        <td>
                          <Link
                            href={`/color-combos/${combo.id}`}
                            className="season-logo"
                            aria-label="Combo image"
                          >
                            {combo.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={combo.image_url} alt="" />
                            ) : (
                              <ImageSquare size={16} />
                            )}
                          </Link>
                        </td>
                        <td>
                          <Link
                            href={`/color-combos/${combo.id}`}
                            className="icon-action"
                            title="Open / edit combo"
                            aria-label={`Open ${combo.name}`}
                          >
                            <PencilSimple size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </OperationalTableRegion>

              <div className="combo-pager">
                <span>
                  Showing {from}–{to} of {total}
                </span>
                <div className="combo-pager-buttons">
                  <button
                    className="ghost-button"
                    disabled={offset === 0}
                    onClick={() =>
                      updateDataset(Math.max(0, offset - PAGE_SIZE))
                    }
                  >
                    <CaretLeft size={15} /> Prev
                  </button>
                  <button
                    className="ghost-button"
                    disabled={to >= total}
                    onClick={() => updateDataset(offset + PAGE_SIZE)}
                  >
                    Next <CaretRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </OperationalPanel>
      </OperationalContent>
    </OperationalPage>
  );
}
