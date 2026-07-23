import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, getStyleById } from "@/lib/queries";
import { createSupplierRequest, getSupplierRequests } from "@/lib/sourcing-queries";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const requests = await getSupplierRequests(id);
  return NextResponse.json({ requests });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  if (!str(body.vendor)) {
    return NextResponse.json({ error: "Vendor is required." }, { status: 400 });
  }
  const issueDate = str(body.issueDate);
  const req = await createSupplierRequest(id, {
    requester: str(body.requester) ?? session.name,
    vendor: str(body.vendor),
    requestTemplate: str(body.requestTemplate),
    dataPackageTemplate: str(body.dataPackageTemplate),
    issueDate: issueDate ? new Date(issueDate).toISOString() : null,
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "supplier_request.create", { styleId: id, code: req.request_code });
  return NextResponse.json({ request: req }, { status: 201 });
}
