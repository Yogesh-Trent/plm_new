import { redirect } from "next/navigation";

// The quote queue now lives in the merged Sourcing workspace.
// Per-quote detail pages remain at /supplier-quotes/[id].
export default function SupplierQuotesPage() {
  redirect("/sourcing?tab=quotes");
}
