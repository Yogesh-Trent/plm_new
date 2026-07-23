import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import {
  addAudit,
  deleteColorCombo,
  getColorComboById,
  updateColorCombo,
} from "@/lib/queries";
import { parseComboBody } from "@/lib/combo-input";

// Edit / delete a single color combo. Collaborative across roles (like styles).

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getColorComboById(id);
  if (!existing) {
    return NextResponse.json({ error: "Colour combo not found" }, { status: 404 });
  }

  const parsed = await parseComboBody(request, { requireName: false });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const combo = await updateColorCombo(id, parsed.fields);
  await addAudit(null, session.name, "combo.update", { id, ...parsed.fields });
  return NextResponse.json({ combo });
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
  const existing = await getColorComboById(id);
  if (!existing) {
    return NextResponse.json({ error: "Colour combo not found" }, { status: 404 });
  }
  await deleteColorCombo(id);
  await addAudit(null, session.name, "combo.delete", {
    id,
    combo: existing.combo_code,
  });
  return NextResponse.json({ ok: true });
}
