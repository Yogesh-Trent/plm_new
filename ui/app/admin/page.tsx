import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { listRef, REF_TABLES } from "@/lib/admin-data";
import { requireRole } from "@/lib/auth";
import { AdminWorkspace } from "./AdminWorkspace";

// Admin dashboard — manage reference data used across the process.
export default async function AdminPage() {
  const session = await requireRole("admin");
  const entries = await Promise.all(
    Object.entries(REF_TABLES).map(async ([slug, table]) => {
      const items = await listRef(table);
      return [slug, items] as const;
    }),
  );

  return (
    <WorkspaceFrame session={session}>
      <AdminWorkspace initialData={Object.fromEntries(entries)} />
    </WorkspaceFrame>
  );
}
