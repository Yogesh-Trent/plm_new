import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AllWorkflow() {
  await requireRole("all");
  redirect("/all");
}
