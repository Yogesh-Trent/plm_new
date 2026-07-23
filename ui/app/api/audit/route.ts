import { NextResponse } from "next/server";
import { requireApiRun } from "@/lib/api";
import { getAudit } from "@/lib/queries";

// GET /api/audit → audit trail for the caller's own run (newest first).
export async function GET() {
  const ctx = await requireApiRun();
  if ("error" in ctx) return ctx.error;
  const entries = await getAudit(ctx.run.id);
  return NextResponse.json({ entries });
}
