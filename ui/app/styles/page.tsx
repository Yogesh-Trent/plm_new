import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { requireSession } from "@/lib/auth";
import { StylesWorkspace } from "./StylesWorkspace";

const ASSIGNMENT_FILTERS = new Set([
  "designer",
  "buyer",
  "technologist",
  "sourcing",
]);

export default async function StylesPage(props: {
  searchParams: Promise<{ assigned?: string | string[] }>;
}) {
  const session = await requireSession();
  const searchParams = await props.searchParams;
  const requested = Array.isArray(searchParams.assigned)
    ? searchParams.assigned[0]
    : searchParams.assigned;
  const initialAssignedFilter = ASSIGNMENT_FILTERS.has(requested ?? "")
    ? (requested ?? "")
    : "";

  return (
    <WorkspaceFrame session={session}>
      <StylesWorkspace initialAssignedFilter={initialAssignedFilter} />
    </WorkspaceFrame>
  );
}
