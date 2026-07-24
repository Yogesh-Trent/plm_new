import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import {
  deleteStyleObject,
  getStyleObjectById,
  updateStyleObject,
  validateArtworkImages,
} from "@/lib/spec-queries";

const STATES = ["draft", "approved", "issued"];

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await getStyleObjectById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    if (!body.name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }
    patch.name = body.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    patch.description =
      typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
  }
  if (typeof body.state === "string") {
    if (!STATES.includes(body.state)) {
      return NextResponse.json({ error: "Invalid state." }, { status: 400 });
    }
    patch.state = body.state;
  }
  if (body.data && typeof body.data === "object" && !Array.isArray(body.data)) {
    const imageError = validateArtworkImages(body.data as Record<string, unknown>);
    if (imageError) {
      return NextResponse.json({ error: imageError.error }, { status: imageError.status });
    }
    patch.data = body.data;
  }

  const object = await updateStyleObject(id, patch);
  await addAudit(null, session.name, "style_object.update", { id });
  return NextResponse.json({ object });
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
  if (!(await getStyleObjectById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await deleteStyleObject(id);
  await addAudit(null, session.name, "style_object.delete", { id });
  return NextResponse.json({ ok: true });
}
