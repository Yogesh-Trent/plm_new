import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, deleteStyle, getStyleById, updateStyle } from "@/lib/queries";
import { parseStyleBody } from "@/lib/style-input";

// Styles are collaborative across all roles, so any signed-in user may edit or
// delete. (If we later want creator-only, the created_by_id is stored.)

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getStyleById(id);
  if (!existing) {
    return NextResponse.json({ error: "Style not found" }, { status: 404 });
  }

  const parsed = await parseStyleBody(request, { requireName: false });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const style = await updateStyle(id, parsed.fields);
  await addAudit(null, session.name, "style.update", { id, ...parsed.fields });
  return NextResponse.json({ style });
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
  const existing = await getStyleById(id);
  if (!existing) {
    return NextResponse.json({ error: "Style not found" }, { status: 404 });
  }
  await deleteStyle(id);
  await addAudit(null, session.name, "style.delete", {
    id,
    style_name: existing.style_name,
  });
  return NextResponse.json({ ok: true });
}
