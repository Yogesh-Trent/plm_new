import { NextResponse } from "next/server";
import { requireApiRun } from "@/lib/api";
import { addAudit, patchRunState } from "@/lib/queries";

// PATCH /api/runs/state  { patch }  → merge a partial workspace-state patch into
// the caller's own run (replaces per-role localStorage). Scoped to session role.
export async function PATCH(request: Request) {
  const ctx = await requireApiRun();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch = (body as { patch?: unknown })?.patch;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return NextResponse.json({ error: "patch must be an object" }, { status: 400 });
  }

  const updated = await patchRunState(ctx.session.role, patch as Record<string, unknown>);
  await addAudit(ctx.run.id, ctx.session.name, "state.patch", patch);
  return NextResponse.json({ run: updated });
}
