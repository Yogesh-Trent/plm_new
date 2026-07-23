import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/app/components/RoleHome";

export default async function DesignerDashboard() {
  const session = await requireRole("designer");
  return <RoleHome session={session} />;
}
