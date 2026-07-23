"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, Plus } from "@phosphor-icons/react";
import {
  OperationalContent,
  OperationalHeader,
  OperationalPage,
  OperationalPanel,
  OperationalState,
  OperationalTableRegion,
} from "@/app/components/OperationalWorkspace";

type Po = {
  id: string;
  po_number: string | null;
  style_name: string | null;
  supplier: string | null;
  category: string | null;
  ex_factory: string | null;
  launch_date: string | null;
  total_order_quantity: string | null;
  state: string;
};
type Options = {
  vendors: string[];
  holidayCalendars: string[];
  criticalPaths: string[];
  styles: Array<{
    id: string;
    style_name: string | null;
    style_code: string | null;
  }>;
};

const VIEWS = [
  { key: "all", label: "All POs" },
  { key: "draft", label: "Draft" },
  { key: "sourcing", label: "Pushed to Sourcing" },
  { key: "accounts", label: "Pushed to Accounts" },
  { key: "merch", label: "Pushed to Merchandisers" },
  { key: "issued", label: "Issued" },
];
const EMPTY = {
  styleId: "",
  supplier: "",
  launchDate: "",
  exFactory: "",
  holidayCalendar: "",
  criticalPath: "",
  totalOrderQuantity: "",
  vendorCapacity: "",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function PurchaseOrders({
  canAction,
  initialView,
}: {
  canAction: boolean;
  initialView: string;
}) {
  const router = useRouter();
  const [pos, setPos] = useState<Po[]>([]);
  const [view, setView] = useState(initialView);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [options, setOptions] = useState<Options | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/supplier-pos?view=${view}`)
      .then((r) => (r.ok ? r.json() : { pos: [] }))
      .then((d) => {
        if (alive) setPos(d.pos ?? []);
      })
      .catch(() => {
        if (alive)
          setLoadError(
            "Purchase orders could not be loaded from the workspace.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [view]);

  const openAdd = async () => {
    setAdding((v) => !v);
    if (!options) {
      const d = await fetch("/api/po-options")
        .then((r) => (r.ok ? r.json() : { options: null }))
        .catch(() => ({ options: null }));
      setOptions(d.options ?? null);
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.supplier) {
      setError("Supplier is required.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/supplier-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not create PO.");
      router.push(`/purchase-orders/${data.po.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create PO.");
      setCreating(false);
    }
  };

  const changeView = (nextView: string) => {
    setLoading(true);
    setLoadError("");
    setView(nextView);
    router.replace(
      nextView === "all"
        ? "/purchase-orders"
        : `/purchase-orders?view=${encodeURIComponent(nextView)}`,
      { scroll: false },
    );
  };

  return (
    <OperationalPage>
      <OperationalHeader
        eyebrow="Commercial operations"
        title="Purchase orders"
        description="Track supplier orders from draft routing through issue and close."
        actions={
          canAction ? (
            <button className="primary-button" onClick={openAdd}>
              <Plus size={16} /> New PO
            </button>
          ) : undefined
        }
      />

      <OperationalContent>
        {adding && (
          <section className="season-create">
            <h2>New supplier PO</h2>
            <form onSubmit={create}>
              <div className="season-fields">
                <label className="season-field">
                  <span>Style (products)</span>
                  <select
                    value={form.styleId}
                    onChange={(e) =>
                      setForm({ ...form, styleId: e.target.value })
                    }
                  >
                    <option value="">Select style…</option>
                    {options?.styles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.style_name} {s.style_code ? `· ${s.style_code}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="season-field">
                  <span>Supplier *</span>
                  <select
                    value={form.supplier}
                    onChange={(e) =>
                      setForm({ ...form, supplier: e.target.value })
                    }
                  >
                    <option value="">Select supplier…</option>
                    {options?.vendors.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="season-field">
                  <span>Launch date</span>
                  <input
                    type="date"
                    value={form.launchDate}
                    onChange={(e) =>
                      setForm({ ...form, launchDate: e.target.value })
                    }
                  />
                </label>
                <label className="season-field">
                  <span>Ex-factory</span>
                  <input
                    type="date"
                    value={form.exFactory}
                    onChange={(e) =>
                      setForm({ ...form, exFactory: e.target.value })
                    }
                  />
                </label>
                <label className="season-field">
                  <span>Holiday calendar</span>
                  <select
                    value={form.holidayCalendar}
                    onChange={(e) =>
                      setForm({ ...form, holidayCalendar: e.target.value })
                    }
                  >
                    <option value="">Select…</option>
                    {options?.holidayCalendars.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="season-field">
                  <span>Critical path</span>
                  <select
                    value={form.criticalPath}
                    onChange={(e) =>
                      setForm({ ...form, criticalPath: e.target.value })
                    }
                  >
                    <option value="">Select…</option>
                    {options?.criticalPaths.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="season-field">
                  <span>Total order quantity</span>
                  <input
                    value={form.totalOrderQuantity}
                    inputMode="numeric"
                    onChange={(e) =>
                      setForm({ ...form, totalOrderQuantity: e.target.value })
                    }
                  />
                </label>
                <label className="season-field">
                  <span>Vendor capacity</span>
                  <input
                    value={form.vendorCapacity}
                    inputMode="numeric"
                    onChange={(e) =>
                      setForm({ ...form, vendorCapacity: e.target.value })
                    }
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
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create & open"}
                </button>
              </div>
            </form>
          </section>
        )}

        <OperationalPanel
          title="Purchase orders"
          count={pos.length}
          actions={
            <select
              value={view}
              onChange={(e) => changeView(e.target.value)}
              className="worklist-filter"
              aria-label="PO view"
            >
              {VIEWS.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
          }
        >
          {loadError ? (
            <OperationalState
              kind="error"
              title="Purchase orders are unavailable"
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
              title="Loading purchase orders"
              detail="Retrieving the latest supplier order and routing states."
            />
          ) : pos.length === 0 ? (
            <OperationalState
              kind="empty"
              title="No purchase orders in this view"
              detail={
                view === "all"
                  ? "Create a supplier purchase order when the product is ready for commercial planning."
                  : "Choose another view to inspect orders at a different routing stage."
              }
            />
          ) : (
            <OperationalTableRegion>
              <table className="season-table">
                <thead>
                  <tr>
                    <th>PO</th>
                    <th>Style</th>
                    <th>Supplier</th>
                    <th>Category</th>
                    <th>Ex-factory</th>
                    <th>Launch</th>
                    <th>Qty</th>
                    <th>State</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {pos.map((p) => (
                    <tr key={p.id}>
                      <td className="season-name-cell">
                        <Link
                          href={`/purchase-orders/${p.id}`}
                          className="style-name-link"
                        >
                          {p.po_number}
                        </Link>
                      </td>
                      <td>{p.style_name || "—"}</td>
                      <td>{p.supplier || "—"}</td>
                      <td>{p.category || "—"}</td>
                      <td>{fmt(p.ex_factory)}</td>
                      <td>{fmt(p.launch_date)}</td>
                      <td>{p.total_order_quantity ?? "—"}</td>
                      <td>
                        <span
                          className={
                            ["issued", "ready", "closed"].includes(p.state)
                              ? "status-pill is-active"
                              : "status-pill is-inactive"
                          }
                        >
                          <span className="status-dot" />
                          {p.state}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/purchase-orders/${p.id}`}
                          className="icon-action"
                          title="Open"
                          aria-label="Open PO"
                        >
                          <ArrowSquareOut size={16} />
                        </Link>
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
