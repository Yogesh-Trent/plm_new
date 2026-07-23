import { requireRole } from "@/lib/auth";
import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { AdminWorkspace } from "./AdminWorkspace";

// Admin dashboard — manage reference data used across the process.
export default async function AdminPage() {
  const session = await requireRole("admin");
  return (
    <WorkspaceFrame session={session}>
      <AdminWorkspace />
    </WorkspaceFrame>
  );
}
