import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { deletePoOrder, getPoOrderPo } from "@/lib/po-queries";

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getPoOrderPo(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deletePoOrder(id);
  await addAudit(null, session.name, "po.order.delete", { id });
  return NextResponse.json({ ok: true });
}
