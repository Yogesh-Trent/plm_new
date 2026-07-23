import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/app/components/RoleHome";

export default async function TechnologistDashboard() {
  const session = await requireRole("technologist");
  return <RoleHome session={session} />;
}
