import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, createStyle, getStyles } from "@/lib/queries";
import { parseStyleBody } from "@/lib/style-input";
import { isAssignRole } from "@/lib/spec-queries";

// Step 2: Style Create — available to ALL roles (anyone can create).
// GET ?assigned=<role> filters to that role's worklist ("Styles @ <role>").
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const assigned = request.nextUrl.searchParams.get("assigned");
  const styles = await getStyles(isAssignRole(assigned) ? assigned : undefined);
  return NextResponse.json({ styles });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = await parseStyleBody(request, { requireName: true });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const style = await createStyle({
    seasonId: parsed.fields.seasonId ?? null,
    department: parsed.fields.department ?? null,
    brand: parsed.fields.brand ?? null,
    productType: parsed.fields.productType ?? null,
    styleType: parsed.fields.styleType ?? null,
    templateId: parsed.fields.templateId ?? null,
    templateName: parsed.fields.templateName ?? null,
    styleName: parsed.fields.styleName ?? "",
    matkl: parsed.fields.matkl ?? null,
    businessUnit: parsed.fields.businessUnit ?? null,
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "style.create", {
    id: style.id,
    style_name: style.style_name,
  });
  return NextResponse.json({ style }, { status: 201 });
}
