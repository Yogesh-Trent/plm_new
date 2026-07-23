import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, getColorCombos, getStyleById } from "@/lib/queries";
import {
  createSkuMatrix,
  getStyleApprovedQuotes,
  getStyleSkus,
} from "@/lib/po-queries";

// GET → SKUs + combos (for the matrix) + approved quotes (for pricing).
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const [skus, combos, approvedQuotes] = await Promise.all([
    getStyleSkus(id),
    getColorCombos(id),
    getStyleApprovedQuotes(id),
  ]);
  return NextResponse.json({
    skus,
    combos: combos.map((c) => ({ id: c.id, name: c.name })),
    approvedQuotes,
  });
}

// POST { comboIds, sizes } → bulk create the colour×size matrix.
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getStyleById(id))) {
    return NextResponse.json({ error: "Style not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const comboIds = Array.isArray(body.comboIds) ? body.comboIds.filter((v): v is string => typeof v === "string") : [];
  const sizes = Array.isArray(body.sizes)
    ? body.sizes.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim())
    : [];
  if (comboIds.length === 0 || sizes.length === 0) {
    return NextResponse.json({ error: "Pick at least one colour combo and one size." }, { status: 400 });
  }
  const created = await createSkuMatrix(id, comboIds, sizes, {
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "sku.matrix", { styleId: id, created });
  const skus = await getStyleSkus(id);
  return NextResponse.json({ created, skus }, { status: 201 });
}
