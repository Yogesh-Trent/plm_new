import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TechnologistWorkflow() {
  await requireRole("technologist");
  redirect("/technologist");
}
