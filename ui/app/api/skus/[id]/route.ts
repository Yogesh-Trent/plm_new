import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { deleteSku, getSkuById, updateSku } from "@/lib/po-queries";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSkuById(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const sku = await updateSku(id, body);
  await addAudit(null, session.name, "sku.update", { id });
  return NextResponse.json({ sku });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSkuById(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteSku(id);
  await addAudit(null, session.name, "sku.delete", { id });
  return NextResponse.json({ ok: true });
}
