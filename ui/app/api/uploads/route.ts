import { NextResponse } from "next/server";
import { requireApiRun } from "@/lib/api";
import { addAudit, addUpload } from "@/lib/queries";

// POST /api/uploads  { filename, size, rowCount, readyCount, raw? }
// Records a parsed intake batch against the caller's own run.
export async function POST(request: Request) {
  const ctx = await requireApiRun();
  if ("error" in ctx) return ctx.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const filename = typeof body.filename === "string" ? body.filename : "";
  if (!filename) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }
  const toInt = (v: unknown) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);

  const upload = await addUpload(ctx.run.id, {
    filename,
    size: toInt(body.size),
    rowCount: toInt(body.rowCount),
    readyCount: toInt(body.readyCount),
    raw: body.raw ?? null,
  });
  await addAudit(ctx.run.id, ctx.session.name, "upload", {
    filename,
    readyCount: toInt(body.readyCount),
  });
  return NextResponse.json({ upload }, { status: 201 });
}
