import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { createBomLine, getBomById, getBomLines } from "@/lib/bom-queries";

function parseLine(body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const qty =
    body.quantity === "" || body.quantity == null
      ? null
      : Number.isFinite(Number(body.quantity))
        ? String(Number(body.quantity))
        : null;
  return {
    component: str(body.component),
    category: str(body.category),
    material: str(body.material),
    colour: str(body.colour),
    detail: str(body.detail),
    quantity: qty,
    uom: str(body.uom),
  };
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const lines = await getBomLines(id);
  return NextResponse.json({ lines });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await getBomById(id))) {
    return NextResponse.json({ error: "BOM not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const line = await createBomLine(id, parseLine(body));
  await addAudit(null, session.name, "bom.line.create", { bomId: id, lineId: line.id });
  return NextResponse.json({ line }, { status: 201 });
}
