import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BuyerWorkflow() {
  await requireRole("buyer");
  redirect("/buyer");
}
