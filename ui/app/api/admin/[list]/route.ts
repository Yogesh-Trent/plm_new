import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { createRef, listRef, refTable } from "@/lib/admin-data";

// Admin-only reference-data CRUD. GET lists a reference table; POST adds an item.
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

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ list: string }> },
) {
  const { list } = await ctx.params;
  const ctxOrErr = await requireAdminTable(list);
  if ("error" in ctxOrErr) return ctxOrErr.error;
  const items = await listRef(ctxOrErr.table);
  return NextResponse.json({ items });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ list: string }> },
) {
  const { list } = await ctx.params;
  const ctxOrErr = await requireAdminTable(list);
  if ("error" in ctxOrErr) return ctxOrErr.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  try {
    const item = await createRef(ctxOrErr.table, name);
    await addAudit(null, ctxOrErr.session.name, "ref.create", { list, name });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (String(err).includes("duplicate") || String(err).includes("unique")) {
      return NextResponse.json({ error: `"${name}" already exists.` }, { status: 409 });
    }
    throw err;
  }
}
