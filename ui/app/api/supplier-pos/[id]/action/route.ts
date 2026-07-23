import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { getPoById, poAction, type PoAction } from "@/lib/po-queries";

const ACTIONS: PoAction[] = [
  "send_to_sourcing",
  "sourcing_approval",
  "submit_to_accounts",
  "accounts_approved",
  "send_to_merchandiser",
  "merchandiser_acceptance",
  "issue",
  "close",
];

// POST { action } → advance the PO's routing / approval / issue.
// The Sourcing/Accounts/Merchandiser approval stages are performed by Buyer or
// All in this build (those are not separate login roles) — server-enforced.
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!["buyer", "sourcing", "all"].includes(session.role)) {
    return NextResponse.json({ error: "Only Buyer or All can action a PO." }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!(await getPoById(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action as PoAction;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const po = await poAction(id, action, session.name);
  await addAudit(null, session.name, "po.action", { id, action });
  return NextResponse.json({ po });
}
