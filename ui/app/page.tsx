import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { RolePicker } from "./RolePicker";

// Root route = login / role selection. If already signed in, go straight to that
// role's own dashboard (each role has a separate workspace).
export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(`/${session.role}`);
  return <RolePicker />;
}
