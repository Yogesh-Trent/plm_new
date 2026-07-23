import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { deleteSample, getSampleById, updateSample } from "@/lib/sampling-queries";

const STATUS = ["pending", "submitted", "approved", "rejected"];

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSampleById(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const patch: Record<string, unknown> = {};
  for (const [k, col] of [["sealer", "sealer"], ["sampleType", "sampleType"], ["vendor", "vendor"], ["comments", "comments"]] as const) {
    if (Object.prototype.hasOwnProperty.call(body, k)) patch[col] = str(body[k]);
  }
  if (typeof body.status === "string") {
    if (!STATUS.includes(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    patch.status = body.status;
  }
  const sample = await updateSample(id, patch);
  await addAudit(null, session.name, "sample.update", { id, status: patch.status });
  return NextResponse.json({ sample });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSampleById(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteSample(id);
  await addAudit(null, session.name, "sample.delete", { id });
  return NextResponse.json({ ok: true });
}
