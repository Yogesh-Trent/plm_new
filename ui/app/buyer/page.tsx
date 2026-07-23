import { requireRole } from "@/lib/auth";
import { RoleHome } from "@/app/components/RoleHome";

export default async function BuyerDashboard() {
  const session = await requireRole("buyer");
  return <RoleHome session={session} />;
}
