import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { createInspection, getInspections } from "@/lib/sampling-queries";
import { getPoById } from "@/lib/po-queries";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const inspections = await getInspections(id);
  return NextResponse.json({ inspections });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getPoById(id))) return NextResponse.json({ error: "PO not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  if (!str(body.inspectionType)) {
    return NextResponse.json({ error: "Inspection type is required." }, { status: 400 });
  }
  const insp = await createInspection(id, {
    inspectionType: str(body.inspectionType),
    inspectionDate: str(body.inspectionDate) ? new Date(str(body.inspectionDate)!).toISOString() : null,
    inspector: str(body.inspector),
    quantityInspected: num(body.quantityInspected),
    aql: str(body.aql),
    comments: str(body.comments),
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "inspection.create", { poId: id, code: insp.inspection_code });
  return NextResponse.json({ inspection: insp }, { status: 201 });
}
