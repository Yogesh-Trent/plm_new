import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDepartments } from "@/lib/queries";

// GET /api/departments → selectable department names for the Season form.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const departments = await getDepartments();
  return NextResponse.json({ departments });
}
