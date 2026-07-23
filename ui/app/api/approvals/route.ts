import { NextResponse } from "next/server";
import { requireApiRun } from "@/lib/api";
import { addAudit, decideApproval, getApprovals } from "@/lib/queries";

// POST /api/approvals  { step, status }  → record an approval decision on the
// caller's own run. (Per-role approval *ownership* — Buyer owns Sourcing, etc. —
// is enforced in Phase 2; today any role acts only within its own workspace.)
export async function POST(request: Request) {
  const ctx = await requireApiRun();
  if ("error" in ctx) return ctx.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const step = typeof body.step === "string" ? body.step : "";
  const status = typeof body.status === "string" ? body.status : "approved";
  if (!step) {
    return NextResponse.json({ error: "step is required" }, { status: 400 });
  }

  const updated = await decideApproval(ctx.run.id, step, status, ctx.session.name);
  if (!updated) {
    return NextResponse.json({ error: "Unknown approval step" }, { status: 404 });
  }
  await addAudit(ctx.run.id, ctx.session.name, "approval", { step, status });
  const approvals = await getApprovals(ctx.run.id);
  return NextResponse.json({ approval: updated, approvals });
}
