import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import {
  createSupplierQuote,
  getSupplierQuotes,
  getSupplierRequestById,
} from "@/lib/sourcing-queries";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const quotes = await getSupplierQuotes(id);
  return NextResponse.json({ quotes });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSupplierRequestById(id))) {
    return NextResponse.json({ error: "Supplier request not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  if (!str(body.supplier)) {
    return NextResponse.json({ error: "Supplier is required." }, { status: 400 });
  }
  const quote = await createSupplierQuote(id, {
    supplier: str(body.supplier),
    countryOfOrigin: str(body.countryOfOrigin),
    currency: str(body.currency),
    colors: str(body.colors),
    sizes: str(body.sizes),
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "supplier_quote.create", { requestId: id, code: quote.quote_code });
  return NextResponse.json({ quote }, { status: 201 });
}
