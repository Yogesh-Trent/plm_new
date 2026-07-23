import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import {
  deleteInspection,
  getInspectionById,
  updateInspection,
} from "@/lib/sampling-queries";

const RESULTS = ["pending", "pass", "fail"];

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getInspectionById(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  for (const key of ["inspectionType", "inspector", "aql", "comments"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key];
  }
  if (typeof body.result === "string") {
    if (!RESULTS.includes(body.result)) return NextResponse.json({ error: "Invalid result." }, { status: 400 });
    patch.result = body.result;
  }
  const inspection = await updateInspection(id, patch);
  await addAudit(null, session.name, "inspection.update", { id, result: patch.result });
  return NextResponse.json({ inspection });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getInspectionById(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteInspection(id);
  await addAudit(null, session.name, "inspection.delete", { id });
  return NextResponse.json({ ok: true });
}
