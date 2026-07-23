import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { deleteMaterialCost, getMaterialCostById } from "@/lib/sourcing-queries";

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getMaterialCostById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await deleteMaterialCost(id);
  await addAudit(null, session.name, "material_cost.delete", { id });
  return NextResponse.json({ ok: true });
}
