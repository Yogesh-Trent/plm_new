"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "@phosphor-icons/react";
import { useSetRecordHeader } from "@/app/components/RecordHeaderContext";
import { BomPicker } from "./BomPicker";

type Combo = {
  id: string;
  style_id: string;
  name: string;
  combo_code: string | null;
  colorway_selection: string | null;
  pantone_code: string | null;
  color_palette: string | null;
  colour_family: string | null;
  generic: string | null;
  pack: string | null;
  drop_name: string | null;
  month: string | null;
  image_url: string | null;
  status: string;
  created_by: string | null;
  style_name: string | null;
  style_code: string | null;
  brand: string | null;
  product_type: string | null;
  season_name: string | null;
};

type ComboOptions = { colorwaySelections: string[]; colorPalettes: string[] };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MAX_IMAGE_BYTES = 350 * 1024;

export function ComboDetail({
  combo,
  options,
}: {
  combo: Combo;
  options: ComboOptions;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: combo.name ?? "",
    colourFamily: combo.colour_family ?? "",
    generic: combo.generic ?? "",
    colorwaySelection: combo.colorway_selection ?? "",
    pantoneCode: combo.pantone_code ?? "",
    colorPalette: combo.color_palette ?? "",
    pack: combo.pack ?? "",
    dropName: combo.drop_name ?? "",
    month: combo.month ?? "",
    status: combo.status,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(combo.image_url);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

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
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!form.name.trim()) {
      setError("Colour combo name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/color-combos/${combo.id}`, {
        method: "PATCH",
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
          status: form.status,
          imageUrl,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save combo.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save combo.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete colour combo "${combo.name}"?`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/color-combos/${combo.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not delete combo.");
      }
      router.push("/color-combos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete combo.");
      setDeleting(false);
    }
  };

  useSetRecordHeader({
    crumbs: [{ label: "Colourways", href: "/color-combos" }],
    title: form.name || "Untitled combo",
    status: {
      label: form.status === "active" ? "Active" : "Inactive",
      tone: form.status === "active" ? "active" : "inactive",
    },
    action: {
      label: "Save changes",
      icon: "save",
      onClick: () => void save(),
      disabled: saving,
      busy: saving,
    },
    onDelete: {
      onConfirm: remove,
      title: `Delete ${form.name || "this combo"}?`,
      description:
        "This permanently removes the colourway and its links to BOMs and orders.",
      confirmLabel: "Delete combo",
      disabled: deleting,
    },
  });

  return (
    <div className="styles-page">
      <form className="styles-body detail-grid" onSubmit={save}>
        <div className="detail-main">
          <section className="season-create">
            <h2>Combo details</h2>
            <div className="season-fields">
              <label className="season-field">
                <span>Colour combo name *</span>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} />
              </label>
              <label className="season-field">
                <span>Colour family</span>
                <input
                  value={form.colourFamily}
                  onChange={(e) => set({ colourFamily: e.target.value })}
                  placeholder="e.g. Black"
                />
              </label>
              <label className="season-field">
                <span>Generic</span>
                <input
                  value={form.generic}
                  onChange={(e) => set({ generic: e.target.value })}
                  placeholder="e.g. 301069926"
                />
              </label>
              <label className="season-field">
                <span>Colorway selection</span>
                <select
                  value={form.colorwaySelection}
                  onChange={(e) => set({ colorwaySelection: e.target.value })}
                >
                  <option value="">Select…</option>
                  {options.colorwaySelections.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Pantone colour code</span>
                <input
                  value={form.pantoneCode}
                  onChange={(e) => set({ pantoneCode: e.target.value })}
                  placeholder="e.g. 19-4052 TCX"
                />
              </label>
              <label className="season-field">
                <span>Colour palette</span>
                <select
                  value={form.colorPalette}
                  onChange={(e) => set({ colorPalette: e.target.value })}
                >
                  <option value="">
                    {options.colorPalettes.length ? "Select…" : "No options yet"}
                  </option>
                  {options.colorPalettes.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Pack</span>
                <input value={form.pack} onChange={(e) => set({ pack: e.target.value })} placeholder="e.g. Pack 4" />
              </label>
              <label className="season-field">
                <span>Drop</span>
                <input value={form.dropName} onChange={(e) => set({ dropName: e.target.value })} />
              </label>
              <label className="season-field">
                <span>Month</span>
                <select value={form.month} onChange={(e) => set({ month: e.target.value })}>
                  <option value="">Select…</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="season-field">
                <span>Status</span>
                <select value={form.status} onChange={(e) => set({ status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
          </section>

          <BomPicker comboId={combo.id} />
        </div>

        <aside className="detail-aside">
          <section className="season-create">
            <h2>Image</h2>
            <div className="detail-image-preview">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Colour combo" />
              ) : (
                <ImageIcon size={30} />
              )}
            </div>
            <div className="season-image-buttons" style={{ marginTop: 10 }}>
              <button type="button" className="ghost-button" onClick={() => fileRef.current?.click()}>
                {imageUrl ? "Change" : "Upload"}
              </button>
              {imageUrl && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setImageUrl(null);
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
            <h2>Parent style</h2>
            <dl>
              <div><dt>Style</dt><dd>{combo.style_name || "—"}</dd></div>
              <div><dt>Style code</dt><dd>{combo.style_code || "—"}</dd></div>
              <div><dt>Season</dt><dd>{combo.season_name || "—"}</dd></div>
              <div><dt>Brand</dt><dd>{combo.brand || "—"}</dd></div>
              <div><dt>Product</dt><dd>{combo.product_type || "—"}</dd></div>
              <div><dt>Combo code</dt><dd>{combo.combo_code || "—"}</dd></div>
            </dl>
            <Link href={`/styles/${combo.style_id}`} className="ghost-button" style={{ marginTop: 10 }}>
              Open parent style
            </Link>
          </section>

          {error && <p className="login-error" role="alert">{error}</p>}
          {saved && !error && <p className="detail-saved" role="status">Saved.</p>}
        </aside>
      </form>
    </div>
  );
}
