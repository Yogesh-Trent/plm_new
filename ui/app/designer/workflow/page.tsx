import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DesignerWorkflow() {
  await requireRole("designer");
  redirect("/designer");
}
