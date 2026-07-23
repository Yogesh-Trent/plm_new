import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllColorCombos } from "@/lib/queries";

// GET /api/color-combos?q=&limit=&offset= → global combos list across all styles,
// with parent style/season context, filter and pagination. Any signed-in role.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim() || undefined;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 100);
  const offset = Math.max(Number(params.get("offset")) || 0, 0);
  const { combos, total } = await getAllColorCombos({ q, limit, offset });
  return NextResponse.json({ combos, total, limit, offset });
}
