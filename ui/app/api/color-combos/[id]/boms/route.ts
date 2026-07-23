import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, getColorComboById } from "@/lib/queries";
import { getBomsForCombo, setComboBoms } from "@/lib/bom-queries";

// GET → all BOMs + which this combo belongs to (for the Add-to-BOM picker).
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const data = await getBomsForCombo(id);
  return NextResponse.json(data);
}

// PUT { bomIds } → set this combo's BOM memberships exactly (attach/detach).
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await getColorComboById(id))) {
    return NextResponse.json({ error: "Colour combo not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const bomIds = Array.isArray(body.bomIds)
    ? body.bomIds.filter((v): v is string => typeof v === "string")
    : [];

  await setComboBoms(id, bomIds, session.name);
  await addAudit(null, session.name, "combo.boms.set", { comboId: id, bomIds });
  const data = await getBomsForCombo(id);
  return NextResponse.json(data);
}
