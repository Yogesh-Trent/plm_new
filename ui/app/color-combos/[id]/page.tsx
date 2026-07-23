import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { getColorComboContext, getComboOptions } from "@/lib/queries";
import { ComboDetail } from "./ComboDetail";

// Per-combo detail page — view parent context + manually add/edit combo details.
export default async function ComboDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await props.params;
  const [combo, options] = await Promise.all([
    getColorComboContext(id),
    getComboOptions(),
  ]);
  if (!combo) notFound();
  return (
    <WorkspaceFrame session={session}>
      <ComboDetail combo={combo} options={options} />
    </WorkspaceFrame>
  );
}
