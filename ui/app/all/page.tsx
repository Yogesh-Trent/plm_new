import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/app/components/RoleHome";

export default async function AllDashboard() {
  const session = await requireRole("all");
  return <RoleHome session={session} />;
}
