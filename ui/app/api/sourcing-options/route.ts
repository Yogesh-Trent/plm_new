import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSourcingOptions } from "@/lib/sourcing-queries";

// GET /api/sourcing-options → vendors + templates + BOMs for the sourcing forms.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const options = await getSourcingOptions();
  return NextResponse.json({ options });
}
