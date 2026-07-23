import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { requireSession } from "@/lib/auth";
import { PurchaseOrders } from "./PurchaseOrders";

const PO_VIEWS = new Set([
  "all",
  "draft",
  "sourcing",
  "accounts",
  "merch",
  "issued",
]);

export default async function PurchaseOrdersPage(props: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const session = await requireSession();
  const searchParams = await props.searchParams;
  const requestedView = Array.isArray(searchParams.view)
    ? searchParams.view[0]
    : searchParams.view;
  const initialView = PO_VIEWS.has(requestedView ?? "")
    ? (requestedView ?? "all")
    : "all";

  return (
    <WorkspaceFrame session={session}>
      <PurchaseOrders
        canAction={["buyer", "sourcing", "all"].includes(session.role)}
        initialView={initialView}
      />
    </WorkspaceFrame>
  );
}
