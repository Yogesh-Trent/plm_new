import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { deleteBomLine, getBomLineById, updateBomLine } from "@/lib/bom-queries";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await getBomLineById(id))) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const patch: Record<string, string | null> = {};
  for (const key of ["component", "category", "material", "colour", "detail", "uom"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = str(body[key]);
  }
  if (Object.prototype.hasOwnProperty.call(body, "quantity")) {
    const q = body.quantity;
    patch.quantity =
      q === "" || q == null
        ? null
        : Number.isFinite(Number(q))
          ? String(Number(q))
          : null;
  }

  const line = await updateBomLine(id, patch);
  await addAudit(null, session.name, "bom.line.update", { id });
  return NextResponse.json({ line });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await getBomLineById(id))) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }
  await deleteBomLine(id);
  await addAudit(null, session.name, "bom.line.delete", { id });
  return NextResponse.json({ ok: true });
}
