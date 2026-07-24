"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Plus, Trash } from "@phosphor-icons/react";
import { useSetRecordHeader } from "@/app/components/RecordHeaderContext";
import { DatePicker } from "@/app/components/DatePicker";
import { Inspections } from "./Inspections";

type Po = {
  id: string;
  po_number: string | null;
  style_id: string | null;
  style_name?: string | null;
  supplier: string | null;
  brand: string | null;
  category: string | null;
  launch_date: string | null;
  ex_factory: string | null;
  shipment_date: string | null;
  holiday_calendar: string | null;
  critical_path: string | null;
  total_order_quantity: string | null;
  vendor_capacity: string | null;
  validation_status: string | null;
  mandatory_check: boolean;
  reason_for_po_delay: string | null;
  state: string;
  send_to_sourcing: boolean;
  sourcing_approval: boolean;
  sourcing_approval_user: string | null;
  submit_to_accounts: boolean;
  accounts_approved: boolean;
  send_to_merchandiser: boolean;
  merchandiser_acceptance: boolean;
  issued_on: string | null;
  issued_by: string | null;
  sap_po_number: string | null;
  total_split_qty?: number;
  quantity_difference?: number;
  remaining_capacity?: number;
};
type Order = { id: string; seq: number; colour_combo: string | null; size: string | null; qty: string | null };

function toDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function PoDetail({
  po: initialPo,
  initialOrders,
  holidayCalendars,
  criticalPaths,
  canAction,
}: {
  po: Po;
  initialOrders: Order[];
  holidayCalendars: string[];
  criticalPaths: string[];
  canAction: boolean;
}) {
  const router = useRouter();
  const [po, setPo] = useState<Po>(initialPo);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [form, setForm] = useState({
    supplier: initialPo.supplier ?? "",
    launchDate: toDateInput(initialPo.launch_date),
    exFactory: toDateInput(initialPo.ex_factory),
    shipmentDate: toDateInput(initialPo.shipment_date),
    holidayCalendar: initialPo.holiday_calendar ?? "",
    criticalPath: initialPo.critical_path ?? "",
    totalOrderQuantity: initialPo.total_order_quantity ?? "",
    vendorCapacity: initialPo.vendor_capacity ?? "",
    reasonForPoDelay: initialPo.reason_for_po_delay ?? "",
    mandatoryCheck: initialPo.mandatory_check,
  });
  const [order, setOrder] = useState({ colourCombo: "", size: "", qty: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const saveProps = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/supplier-pos/${po.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save.");
      if (data.po) setPo(data.po);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const doAction = async (action: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/supplier-pos/${po.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Action failed.");
      if (data.po) setPo(data.po);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  // Walk the whole approval route in order, then issue — one click for the
  // linear happy path instead of six sequential "Do" clicks + Issue.
  const ROUTE_KEYS = [
    "send_to_sourcing",
    "sourcing_approval",
    "submit_to_accounts",
    "accounts_approved",
    "send_to_merchandiser",
    "merchandiser_acceptance",
    "issue",
  ] as const;

  const approveAllAndIssue = async () => {
    setBusy(true);
    setError("");
    try {
      let current = po;
      for (const action of ROUTE_KEYS) {
        // Skip steps already completed (their boolean flag is set).
        if (action !== "issue" && (current as Record<string, unknown>)[action]) {
          continue;
        }
        if (action === "issue" && (current.state === "issued" || current.state === "closed")) {
          break;
        }
        const response = await fetch(`/api/supplier-pos/${po.id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error ?? "Action failed.");
        if (data.po) current = data.po;
      }
      setPo(current);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete routing.");
    } finally {
      setBusy(false);
    }
  };

  const addOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/supplier-pos/${po.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not add.");
      setOrders((c) => [...c, data.order]);
      if (data.po) setPo(data.po);
      setOrder({ colourCombo: "", size: "", qty: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add.");
    } finally {
      setBusy(false);
    }
  };

  const removeOrder = async (o: Order) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/po-orders/${o.id}`, { method: "DELETE" });
      if (response.ok) {
        setOrders((c) => c.filter((x) => x.id !== o.id));
        setPo((p) => {
          const split = (p.total_split_qty ?? 0) - Number(o.qty ?? 0);
          return { ...p, total_split_qty: split, quantity_difference: Number(p.total_order_quantity ?? 0) - split };
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { key: "send_to_sourcing", label: "Send to Sourcing", done: po.send_to_sourcing },
    { key: "sourcing_approval", label: "Sourcing approval", done: po.sourcing_approval, prereq: po.send_to_sourcing },
    { key: "submit_to_accounts", label: "Submit to Accounts", done: po.submit_to_accounts, prereq: po.sourcing_approval },
    { key: "accounts_approved", label: "Accounts approved", done: po.accounts_approved, prereq: po.submit_to_accounts },
    { key: "send_to_merchandiser", label: "Send to Merchandiser", done: po.send_to_merchandiser, prereq: po.accounts_approved },
    { key: "merchandiser_acceptance", label: "Merchandiser acceptance", done: po.merchandiser_acceptance, prereq: po.send_to_merchandiser },
  ];

  useSetRecordHeader({
    crumbs: [{ label: "Purchase orders", href: "/purchase-orders" }],
    title: po.po_number ?? "Purchase order",
    status: {
      label: po.state,
      tone: ["issued", "ready", "closed"].includes(po.state)
        ? "active"
        : "neutral",
    },
    action: {
      label: "Save properties",
      icon: "save",
      onClick: () => void saveProps(),
      disabled: saving,
      busy: saving,
    },
  });

  return (
    <div className="styles-page">
      <div className="styles-body detail-grid">
        <div className="detail-main">
          <form className="season-create" onSubmit={saveProps}>
            <h2>PO properties</h2>
            <div className="season-fields">
              <label className="season-field"><span>Supplier</span>
                <input value={form.supplier} onChange={(e) => { setForm({ ...form, supplier: e.target.value }); setSaved(false); }} />
              </label>
              <label className="season-field"><span>Launch date</span>
                <DatePicker value={form.launchDate} onChange={(v) => { setForm({ ...form, launchDate: v }); setSaved(false); }} ariaLabel="Launch date" />
              </label>
              <label className="season-field"><span>Ex-factory</span>
                <DatePicker value={form.exFactory} onChange={(v) => { setForm({ ...form, exFactory: v }); setSaved(false); }} ariaLabel="Ex-factory date" />
              </label>
              <label className="season-field"><span>Shipment date</span>
                <DatePicker value={form.shipmentDate} onChange={(v) => { setForm({ ...form, shipmentDate: v }); setSaved(false); }} ariaLabel="Shipment date" />
              </label>
              <label className="season-field"><span>Holiday calendar</span>
                <select value={form.holidayCalendar} onChange={(e) => { setForm({ ...form, holidayCalendar: e.target.value }); setSaved(false); }}>
                  <option value="">Select…</option>
                  {holidayCalendars.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="season-field"><span>Critical path</span>
                <select value={form.criticalPath} onChange={(e) => { setForm({ ...form, criticalPath: e.target.value }); setSaved(false); }}>
                  <option value="">Select…</option>
                  {criticalPaths.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="season-field"><span>Total order quantity</span>
                <input value={form.totalOrderQuantity} inputMode="numeric" onChange={(e) => { setForm({ ...form, totalOrderQuantity: e.target.value }); setSaved(false); }} />
              </label>
              <label className="season-field"><span>Vendor capacity</span>
                <input value={form.vendorCapacity} inputMode="numeric" onChange={(e) => { setForm({ ...form, vendorCapacity: e.target.value }); setSaved(false); }} />
              </label>
              <label className="season-field"><span>Reason for PO delay</span>
                <input value={form.reasonForPoDelay} onChange={(e) => { setForm({ ...form, reasonForPoDelay: e.target.value }); setSaved(false); }} />
              </label>
              <label className="season-field"><span>Mandatory check</span>
                <span className="obj-check"><input type="checkbox" checked={form.mandatoryCheck} onChange={(e) => { setForm({ ...form, mandatoryCheck: e.target.checked }); setSaved(false); }} /></span>
              </label>
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            {saved && (
              <div className="season-actions">
                <span className="detail-saved">Saved.</span>
              </div>
            )}
          </form>

          <section className="season-create">
            <h2>Orders (split quantities)</h2>
            <form className="combo-form" onSubmit={addOrder}>
              <div className="season-fields">
                <label className="season-field"><span>Colour combo</span>
                  <input value={order.colourCombo} onChange={(e) => setOrder({ ...order, colourCombo: e.target.value })} />
                </label>
                <label className="season-field"><span>Size</span>
                  <input value={order.size} onChange={(e) => setOrder({ ...order, size: e.target.value })} />
                </label>
                <label className="season-field"><span>Qty</span>
                  <input value={order.qty} inputMode="numeric" onChange={(e) => setOrder({ ...order, qty: e.target.value })} />
                </label>
              </div>
              <div className="season-actions">
                <button type="submit" className="ghost-button" disabled={busy}><Plus size={15} /> Add split</button>
              </div>
            </form>
            {orders.length === 0 ? (
              <p className="season-empty">No split lines.</p>
            ) : (
              <div className="season-table-wrap">
                <table className="season-table">
                  <thead><tr><th>#</th><th>Colour combo</th><th>Size</th><th>Qty</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.seq}</td><td className="season-name-cell">{o.colour_combo || "—"}</td><td>{o.size || "—"}</td><td>{o.qty ?? "—"}</td>
                        <td><button type="button" className="icon-action is-danger" onClick={() => removeOrder(o)} disabled={busy} title="Delete" aria-label="Delete split"><Trash size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <Inspections poId={po.id} />
        </div>

        <aside className="detail-aside">
          <section className="season-create detail-meta">
            <h2>Quantities</h2>
            <dl>
              <div><dt>Order qty</dt><dd>{po.total_order_quantity ?? "—"}</dd></div>
              <div><dt>Split total</dt><dd>{po.total_split_qty ?? 0}</dd></div>
              <div><dt>Difference</dt><dd>{po.quantity_difference ?? "—"}</dd></div>
              <div><dt>Remaining capacity</dt><dd>{po.remaining_capacity ?? "—"}</dd></div>
              <div><dt>Validation</dt><dd>{po.validation_status || "—"}</dd></div>
            </dl>
          </section>

          <section className="season-create detail-meta">
            <h2>Approval routing</h2>
            {!canAction && <p className="styles-note" style={{ marginTop: 0 }}>Only Buyer / All can action this PO.</p>}
            {canAction &&
              po.state !== "issued" &&
              po.state !== "closed" &&
              !po.merchandiser_acceptance && (
                <button
                  type="button"
                  className="primary-button po-approve-all"
                  onClick={approveAllAndIssue}
                  disabled={busy}
                  title="Run every remaining approval step and issue the PO"
                >
                  <CheckCircle size={16} weight="fill" />{" "}
                  {busy ? "Working…" : "Approve all remaining & issue"}
                </button>
              )}
            <ul className="po-steps">
              {steps.map((s) => (
                <li key={s.key} className={s.done ? "po-step is-done" : "po-step"}>
                  <span>{s.done ? <CheckCircle size={16} weight="fill" /> : "○"} {s.label}</span>
                  {canAction && !s.done && (s.prereq ?? true) && (
                    <button type="button" className="ghost-button po-step-btn" onClick={() => doAction(s.key)} disabled={busy}>Do</button>
                  )}
                </li>
              ))}
            </ul>
            {canAction && (
              <div className="season-image-buttons" style={{ marginTop: 10 }}>
                <button type="button" className="primary-button" disabled={busy || !po.merchandiser_acceptance || po.state === "issued" || po.state === "closed"} onClick={() => doAction("issue")}>
                  Issue PO
                </button>
                {po.state === "issued" && (
                  <button type="button" className="ghost-button" disabled={busy} onClick={() => doAction("close")}>Close</button>
                )}
              </div>
            )}
            {po.sap_po_number && <p className="styles-note" style={{ marginTop: 10 }}>SAP PO: <strong>{po.sap_po_number}</strong>{po.issued_by ? ` · issued by ${po.issued_by}` : ""}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
