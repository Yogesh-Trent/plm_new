import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getComboOptions } from "@/lib/queries";

// GET /api/combo-options → admin-managed colorway selections + colour palettes
// for the color-combo form. Any signed-in role may read.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const options = await getComboOptions();
  return NextResponse.json({ options });
}
