import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, getStyleById } from "@/lib/queries";
import { createSample, getSamples } from "@/lib/sampling-queries";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const samples = await getSamples(id);
  return NextResponse.json({ samples });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getStyleById(id))) return NextResponse.json({ error: "Style not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  if (!str(body.sealer) && !str(body.sampleType)) {
    return NextResponse.json({ error: "Pick a sealer or sample type." }, { status: 400 });
  }
  const sample = await createSample(id, {
    sealer: str(body.sealer),
    sampleType: str(body.sampleType),
    vendor: str(body.vendor),
    comments: str(body.comments),
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "sample.create", { styleId: id, code: sample.sample_code });
  return NextResponse.json({ sample }, { status: 201 });
}
