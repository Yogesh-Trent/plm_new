import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { getBomById, getBomCombos, getBomLines } from "@/lib/bom-queries";
import { BomDetail } from "./BomDetail";

export default async function BomDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await props.params;
  const bom = await getBomById(id);
  if (!bom) notFound();
  const [lines, combos] = await Promise.all([
    getBomLines(id),
    getBomCombos(id),
  ]);
  return (
    <WorkspaceFrame session={session}>
      <BomDetail bom={bom} initialLines={lines} combos={combos} />
    </WorkspaceFrame>
  );
}
