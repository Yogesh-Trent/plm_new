import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import {
  createMaterialCost,
  getMaterialCosts,
  getSupplierQuoteById,
} from "@/lib/sourcing-queries";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const lines = await getMaterialCosts(id);
  return NextResponse.json({ lines });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSupplierQuoteById(id))) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const line = await createMaterialCost(id, {
    placementName: str(body.placementName),
    mainMaterial: str(body.mainMaterial),
    bomSection: str(body.bomSection),
    product: str(body.product),
    qty: num(body.qty),
    unitCost: num(body.unitCost),
  });
  await addAudit(null, session.name, "material_cost.create", { quoteId: id });
  return NextResponse.json({ line }, { status: 201 });
}
