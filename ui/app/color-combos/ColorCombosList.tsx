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
  const [newStyleId, setNewStyleId] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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
  }, [offset, search]);

  const openAdd = async () => {
    setAdding((v) => !v);
    setError("");
    if (styles.length === 0) {
      const data = await fetch("/api/styles")
        .then((r) => (r.ok ? r.json() : { styles: [] }))
        .catch(() => ({ styles: [] }));
      setStyles(data.styles ?? []);
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newStyleId) {
      setError("Pick a style for the combo.");
      return;
    }
    if (!newName.trim()) {
      setError("Colour combo name is required.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const response = await fetch(`/api/styles/${newStyleId}/color-combos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error ?? "Could not create combo.");
      // Jump to the new combo's detail page to fill in the rest.
      router.push(`/color-combos/${data.combo.id}`);
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
            <form className="combo-add-form" onSubmit={create}>
              <label className="season-field">
                <span>Style *</span>
                <select
                  value={newStyleId}
                  onChange={(e) => setNewStyleId(e.target.value)}
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
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. BLACK"
                />
              </label>
              <div className="season-actions" style={{ marginTop: 0 }}>
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
                  {creating ? "Creating…" : "Create & open"}
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
