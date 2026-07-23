import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import {
  addAudit,
  createColorCombo,
  getColorCombos,
  getStyleById,
} from "@/lib/queries";
import { parseComboBody } from "@/lib/combo-input";

// Color combos are a separate sub-process of a style (a style has many). Open to
// all signed-in roles, like styles themselves.

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const combos = await getColorCombos(id);
  return NextResponse.json({ combos });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const style = await getStyleById(id);
  if (!style) {
    return NextResponse.json({ error: "Style not found" }, { status: 404 });
  }

  const parsed = await parseComboBody(request, { requireName: true });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const combo = await createColorCombo(id, {
    name: parsed.fields.name ?? "",
    colorwaySelection: parsed.fields.colorwaySelection ?? null,
    pantoneCode: parsed.fields.pantoneCode ?? null,
    colorPalette: parsed.fields.colorPalette ?? null,
    colourFamily: parsed.fields.colourFamily ?? null,
    generic: parsed.fields.generic ?? null,
    pack: parsed.fields.pack ?? null,
    dropName: parsed.fields.dropName ?? null,
    month: parsed.fields.month ?? null,
    imageUrl: parsed.fields.imageUrl ?? null,
    status: parsed.fields.status,
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "combo.create", {
    styleId: id,
    combo: combo.combo_code,
  });
  return NextResponse.json({ combo }, { status: 201 });
}
