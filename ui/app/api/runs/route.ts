import { NextResponse } from "next/server";
import { requireApiRun } from "@/lib/api";
import { getApprovals } from "@/lib/queries";

// GET /api/runs → the caller's own role-scoped run + its approvals.
export async function GET() {
  const ctx = await requireApiRun();
  if ("error" in ctx) return ctx.error;
  const approvals = await getApprovals(ctx.run.id);
  return NextResponse.json({ run: ctx.run, approvals });
}
