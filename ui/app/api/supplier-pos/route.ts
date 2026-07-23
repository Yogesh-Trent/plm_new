import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { createPo, getPos } from "@/lib/po-queries";

// GET /api/supplier-pos?view=all|draft|sourcing|accounts|merch|issued
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const view = request.nextUrl.searchParams.get("view") ?? "all";
  const pos = await getPos(view);
  return NextResponse.json({ pos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  if (!str(body.supplier)) {
    return NextResponse.json({ error: "Supplier is required." }, { status: 400 });
  }
  const po = await createPo({
    styleId: str(body.styleId),
    supplier: str(body.supplier),
    launchDate: str(body.launchDate),
    exFactory: str(body.exFactory),
    holidayCalendar: str(body.holidayCalendar),
    criticalPath: str(body.criticalPath),
    totalOrderQuantity: num(body.totalOrderQuantity),
    vendorCapacity: num(body.vendorCapacity),
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "po.create", { id: po.id, po: po.po_number });
  return NextResponse.json({ po }, { status: 201 });
}
