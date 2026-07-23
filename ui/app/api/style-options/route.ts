import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStyleOptions } from "@/lib/queries";

// GET /api/style-options → everything the Style form needs (active seasons +
// admin-managed reference lists). Any signed-in role may read it.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const options = await getStyleOptions();
  return NextResponse.json({ options });
}
