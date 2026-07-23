import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import {
  deleteSupplierRequest,
  getSupplierRequestById,
  updateSupplierRequest,
} from "@/lib/sourcing-queries";

const STATES = ["draft", "issued", "complete"];
const TECH = ["pending", "approved", "rejected"];

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSupplierRequestById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const patch: Record<string, unknown> = {};
  for (const [key, col] of [
    ["requester", "requester"],
    ["vendor", "vendor"],
    ["requestTemplate", "requestTemplate"],
    ["dataPackageTemplate", "dataPackageTemplate"],
  ] as const) {
    if (Object.prototype.hasOwnProperty.call(body, key)) patch[col] = str(body[key]);
  }
  if (Object.prototype.hasOwnProperty.call(body, "issueDate")) {
    const d = str(body.issueDate);
    patch.issueDate = d ? new Date(d).toISOString() : null;
  }
  if (typeof body.state === "string") {
    if (!STATES.includes(body.state)) return NextResponse.json({ error: "Invalid state." }, { status: 400 });
    patch.state = body.state;
  }
  if (typeof body.techApprovalStatus === "string") {
    if (!TECH.includes(body.techApprovalStatus)) return NextResponse.json({ error: "Invalid tech status." }, { status: 400 });
    patch.techApprovalStatus = body.techApprovalStatus;
  }

  const req = await updateSupplierRequest(id, patch);
  await addAudit(null, session.name, "supplier_request.update", { id });
  return NextResponse.json({ request: req });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await getSupplierRequestById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await deleteSupplierRequest(id);
  await addAudit(null, session.name, "supplier_request.delete", { id });
  return NextResponse.json({ ok: true });
}
