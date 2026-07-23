import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSpecOptions } from "@/lib/spec-queries";

// GET /api/spec-options → reference lists for the Phase-5 (spec/quality) forms.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const options = await getSpecOptions();
  return NextResponse.json({ options });
}
