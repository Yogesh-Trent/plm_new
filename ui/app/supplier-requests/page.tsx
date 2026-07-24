import { redirect } from "next/navigation";

// The request queue now lives in the merged Sourcing workspace.
// Per-request detail pages remain at /supplier-requests/[id].
export default function SupplierRequestsPage() {
  redirect("/sourcing");
}
