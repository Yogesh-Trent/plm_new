import { requireRole } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { ProcessWorkspace } from "./ProcessWorkspace";

// Full PLM process — owned by the All role (per spec). Step 1: Seasons.
export default async function ProcessPage() {
  const session = await requireRole("all");
  return (
    <WorkspaceFrame session={session}>
      <ProcessWorkspace userName={session.name} />
    </WorkspaceFrame>
  );
}
