import { NextResponse } from "next/server";
import { isRole } from "@/lib/roles";
import { signInAs } from "@/lib/auth";
import { addAudit, getRunByRole } from "@/lib/queries";

// POST /api/auth/login  { role }  → sets the signed session cookie.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const role = (body as { role?: unknown })?.role;
  if (!isRole(role)) {
    return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  }
  const session = await signInAs(role);
  const run = await getRunByRole(role);
  await addAudit(run?.id ?? null, session.name, "login", { role });
  return NextResponse.json({ ok: true, role: session.role, name: session.name });
}
