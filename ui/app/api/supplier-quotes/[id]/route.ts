import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import {
  deleteSupplierQuote,
  getSupplierQuoteById,
  updateSupplierQuote,
} from "@/lib/sourcing-queries";

const STATES = ["draft", "approved"];

// PATCH edits the quote incl. the cost sheet (`cost` object) and state (approve).
// Approving is owned by Buyer / Sourcing (and All) — enforced here.
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSupplierQuoteById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const patch: Record<string, unknown> = {};
  for (const key of ["supplier", "countryOfOrigin", "currency", "colors", "sizes"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = str(body[key]);
  }
  if (Object.prototype.hasOwnProperty.call(body, "targetPrice")) patch.targetPrice = num(body.targetPrice);
  if (Object.prototype.hasOwnProperty.call(body, "bomId")) patch.bomId = str(body.bomId);
  if (typeof body.selected === "boolean") patch.selected = body.selected;
  if (typeof body.state === "string") {
    if (!STATES.includes(body.state)) return NextResponse.json({ error: "Invalid state." }, { status: 400 });
    if (body.state === "approved" && !["buyer", "sourcing", "all"].includes(session.role)) {
      return NextResponse.json({ error: "Only Buyer, Sourcing or All can approve a quote." }, { status: 403 });
    }
    patch.state = body.state;
  }
  if (body.cost && typeof body.cost === "object" && !Array.isArray(body.cost)) {
    const cost: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.cost as Record<string, unknown>)) {
      cost[k] = Number(v) || 0;
    }
    patch.cost = cost;
  }

  const quote = await updateSupplierQuote(id, patch);
  await addAudit(null, session.name, "supplier_quote.update", { id, state: patch.state });
  return NextResponse.json({ quote });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSupplierQuoteById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await deleteSupplierQuote(id);
  await addAudit(null, session.name, "supplier_quote.delete", { id });
  return NextResponse.json({ ok: true });
}
