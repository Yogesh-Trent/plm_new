import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { deleteRef, refTable, updateRef } from "@/lib/admin-data";

async function requireAdminTable(slug: string) {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (session.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin only." }, { status: 403 }) };
  }
  const table = refTable(slug);
  if (!table) {
    return { error: NextResponse.json({ error: "Unknown list" }, { status: 404 }) };
  }
  return { session, table };
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ list: string; id: string }> },
) {
  const { list, id } = await ctx.params;
  const ctxOrErr = await requireAdminTable(list);
  if ("error" in ctxOrErr) return ctxOrErr.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch: { name?: string; active?: boolean } = {};
  if (typeof body.name === "string") {
    if (!body.name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }
    patch.name = body.name.trim();
  }
  if (typeof body.active === "boolean") patch.active = body.active;

  try {
    const item = await updateRef(ctxOrErr.table, id, patch);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await addAudit(null, ctxOrErr.session.name, "ref.update", { list, id, ...patch });
    return NextResponse.json({ item });
  } catch (err) {
    if (String(err).includes("duplicate") || String(err).includes("unique")) {
      return NextResponse.json({ error: "That name already exists." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ list: string; id: string }> },
) {
  const { list, id } = await ctx.params;
  const ctxOrErr = await requireAdminTable(list);
  if ("error" in ctxOrErr) return ctxOrErr.error;
  await deleteRef(ctxOrErr.table, id);
  await addAudit(null, ctxOrErr.session.name, "ref.delete", { list, id });
  return NextResponse.json({ ok: true });
}
