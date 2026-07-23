import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, getStyleById } from "@/lib/queries";
import { assignStyle, isAssignRole } from "@/lib/spec-queries";

// POST /api/styles/[id]/assign { role, comment } → route the style to a role's
// worklist (Send To Designer/Buyer/Technologist/Sourcing). role null = unassign.
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await getStyleById(id))) {
    return NextResponse.json({ error: "Style not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const role = body.role === null || body.role === "" ? null : body.role;
  if (role !== null && !isAssignRole(role)) {
    return NextResponse.json({ error: "Unknown assignment role" }, { status: 400 });
  }
  const comment =
    typeof body.comment === "string" && body.comment.trim() ? body.comment.trim() : null;

  await assignStyle(id, role, comment);
  await addAudit(null, session.name, "style.assign", { styleId: id, role });
  const style = await getStyleById(id);
  return NextResponse.json({ style });
}
