import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { ROLE_LABELS } from "@/lib/roles";
import { getStyleById, getStyleOptions } from "@/lib/queries";
import { StyleDetail } from "./StyleDetail";

// Id-based detail page for a single style — view + edit the full record.
export default async function StyleDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await props.params;
  const [style, options] = await Promise.all([
    getStyleById(id),
    getStyleOptions(),
  ]);
  if (!style) notFound();
  return (
    <WorkspaceFrame session={session}>
      <StyleDetail
        style={style}
        options={options}
        roleLabel={ROLE_LABELS[session.role]}
      />
    </WorkspaceFrame>
  );
}
