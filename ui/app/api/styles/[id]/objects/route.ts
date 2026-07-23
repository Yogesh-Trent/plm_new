import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, getStyleById } from "@/lib/queries";
import {
  createStyleObject,
  getStyleObjects,
  isStyleObjectKind,
} from "@/lib/spec-queries";

// GET/POST /api/styles/[id]/objects?kind=artwork|size_chart|spec_sheet|test_run
// Generic list + create for a style's spec/quality child objects. Any role.

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const kind = request.nextUrl.searchParams.get("kind");
  if (!isStyleObjectKind(kind)) {
    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  }
  const objects = await getStyleObjects(id, kind);
  return NextResponse.json({ objects });
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
  if (!(await getStyleById(id))) {
    return NextResponse.json({ error: "Style not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const kind = body.kind;
  if (!isStyleObjectKind(kind)) {
    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const data =
    body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : {};

  const object = await createStyleObject(id, kind, {
    name,
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
    phase: typeof body.phase === "string" && body.phase.trim() ? body.phase.trim() : undefined,
    data,
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, `${kind}.create`, { styleId: id, code: object.code });
  return NextResponse.json({ object }, { status: 201 });
}
