import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { getStyleById } from "@/lib/queries";
import {
  getSupplierQuotes,
  getSupplierRequestById,
} from "@/lib/sourcing-queries";
import { SupplierRequestDetail } from "./SupplierRequestDetail";

export default async function SupplierRequestPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await props.params;
  const request = await getSupplierRequestById(id);
  if (!request) notFound();
  const [quotes, style] = await Promise.all([
    getSupplierQuotes(id),
    getStyleById(request.style_id),
  ]);
  return (
    <WorkspaceFrame session={session}>
      <SupplierRequestDetail
        request={request}
        initialQuotes={quotes}
        styleName={style?.style_name ?? null}
        styleCode={style?.style_code ?? null}
        styleId={request.style_id}
      />
    </WorkspaceFrame>
  );
}
