import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { getPoById, getPoOptions, getPoOrders } from "@/lib/po-queries";
import { PoDetail } from "./PoDetail";

export default async function PoDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await props.params;
  const po = await getPoById(id);
  if (!po) notFound();
  const [orders, options] = await Promise.all([
    getPoOrders(id),
    getPoOptions(),
  ]);
  return (
    <WorkspaceFrame session={session}>
      <PoDetail
        po={po}
        initialOrders={orders}
        holidayCalendars={options.holidayCalendars}
        criticalPaths={options.criticalPaths}
        canAction={["buyer", "sourcing", "all"].includes(session.role)}
      />
    </WorkspaceFrame>
  );
}
