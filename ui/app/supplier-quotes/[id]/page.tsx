import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { ROLE_LABELS } from "@/lib/roles";
import {
  getMaterialCosts,
  getSourcingOptions,
  getSupplierQuoteById,
} from "@/lib/sourcing-queries";
import { SupplierQuoteDetail } from "./SupplierQuoteDetail";

export default async function SupplierQuotePage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await props.params;
  const quote = await getSupplierQuoteById(id);
  if (!quote) notFound();
  const [lines, options] = await Promise.all([
    getMaterialCosts(id),
    getSourcingOptions(),
  ]);
  return (
    <WorkspaceFrame session={session}>
      <SupplierQuoteDetail
        quote={quote}
        initialLines={lines}
        boms={options.boms}
        canApprove={["buyer", "sourcing", "all"].includes(session.role)}
        roleLabel={ROLE_LABELS[session.role]}
      />
    </WorkspaceFrame>
  );
}
