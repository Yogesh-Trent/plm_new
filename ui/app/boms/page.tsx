import { requireSession } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { getBoms } from "@/lib/bom-queries";
import { BomsList } from "./BomsList";

// Phase 4 — Bill of Materials list (reusable BOMs across styles/combos).
export default async function BomsPage() {
  const session = await requireSession();
  const boms = await getBoms();
  return (
    <WorkspaceFrame session={session}>
      <BomsList initialBoms={boms} />
    </WorkspaceFrame>
  );
}
