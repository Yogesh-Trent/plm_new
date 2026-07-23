import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { deleteBom, getBomById, updateBom } from "@/lib/bom-queries";

const STATUSES = ["active", "inactive"];

export async function PATCH(
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
  const patch: { name?: string; description?: string | null; status?: string } = {};
  if (typeof body.name === "string") {
    if (!body.name.trim()) {
      return NextResponse.json({ error: "BOM name cannot be empty." }, { status: 400 });
    }
    patch.name = body.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    patch.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status must be active or inactive." }, { status: 400 });
    }
    patch.status = body.status;
  }

  const bom = await updateBom(id, patch);
  await addAudit(null, session.name, "bom.update", { id, ...patch });
  return NextResponse.json({ bom });
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
  if (!(await getBomById(id))) {
    return NextResponse.json({ error: "BOM not found" }, { status: 404 });
  }
  await deleteBom(id);
  await addAudit(null, session.name, "bom.delete", { id });
  return NextResponse.json({ ok: true });
}
