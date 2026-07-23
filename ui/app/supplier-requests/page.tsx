import { SupplierRequestQueue } from "@/app/components/SourcingQueues";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { requireSession } from "@/lib/auth";
import { getAllSupplierRequests } from "@/lib/sourcing-queries";

export default async function SupplierRequestsPage(props: {
  searchParams: Promise<{ q?: string | string[]; state?: string | string[] }>;
}) {
  const session = await requireSession();
  const searchParams = await props.searchParams;
  const query =
    (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q) ?? "";
  const state =
    (Array.isArray(searchParams.state)
      ? searchParams.state[0]
      : searchParams.state) ?? "";
  const normalized = query.trim().toLowerCase();
  const requests = (await getAllSupplierRequests()).filter((item) => {
    const matchesState = !state || item.state === state;
    const haystack = [
      item.request_code,
      item.style_name,
      item.style_code,
      item.vendor,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesState && (!normalized || haystack.includes(normalized));
  });

  return (
    <WorkspaceFrame session={session}>
      <SupplierRequestQueue requests={requests} filters={{ query, state }} />
    </WorkspaceFrame>
  );
}
