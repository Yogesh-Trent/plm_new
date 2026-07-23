"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react";

type BomOption = { id: string; name: string; code: string | null };

// "Add to BOM(s)" target: attach this colour combo to one or more reusable BOMs.
export function BomPicker({ comboId }: { comboId: string }) {
  const [boms, setBoms] = useState<BomOption[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/color-combos/${comboId}/boms`)
      .then((r) => (r.ok ? r.json() : { boms: [], attachedIds: [] }))
      .then((data) => {
        if (!alive) return;
        setBoms(data.boms ?? []);
        setChecked(new Set(data.attachedIds ?? []));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [comboId]);

  const toggle = (id: string) => {
    setSaved(false);
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createBom = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/boms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not create BOM.");
      setBoms((current) => [
        { id: data.bom.id, name: data.bom.name, code: data.bom.code },
        ...current,
      ]);
      setChecked((current) => new Set(current).add(data.bom.id));
      setNewName("");
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create BOM.");
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/color-combos/${comboId}/boms`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bomIds: Array.from(checked) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save.");
      setChecked(new Set(data.attachedIds ?? []));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="season-create">
      <h2>Add to BOM(s)</h2>
      <p className="styles-note" style={{ marginTop: 0 }}>
        Attach this colour combo to reusable bills of materials. A combo can belong
        to many BOMs.
      </p>

      {loading ? (
        <p className="season-empty">Loading BOMs…</p>
      ) : boms.length === 0 ? (
        <p className="styles-hint">
          No BOMs yet — create one below or on the{" "}
          <Link href="/boms" className="style-name-link">BOMs page</Link>.
        </p>
      ) : (
        <ul className="bom-check-list">
          {boms.map((bom) => (
            <li key={bom.id}>
              <label>
                <input
                  type="checkbox"
                  checked={checked.has(bom.id)}
                  onChange={() => toggle(bom.id)}
                />
                <span>{bom.name}</span>
                {bom.code && <em>{bom.code}</em>}
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="bom-new-row">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New BOM name…"
        />
        <button type="button" className="ghost-button" onClick={createBom} disabled={creating || !newName.trim()}>
          <Plus size={15} /> Create BOM
        </button>
      </div>

      {error && <p className="login-error" role="alert">{error}</p>}

      <div className="season-actions">
        {saved && <span className="detail-saved">BOM membership saved.</span>}
        <button type="button" className="primary-button" onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save BOM membership"}
        </button>
      </div>
    </section>
  );
}
