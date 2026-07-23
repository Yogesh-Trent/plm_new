import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit } from "@/lib/queries";
import { createBom, getBoms } from "@/lib/bom-queries";

// BOMs are collaborative across all signed-in roles (like styles/combos).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const boms = await getBoms();
  return NextResponse.json({ boms });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "BOM name is required." }, { status: 400 });
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  const bom = await createBom({
    name,
    description,
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "bom.create", { id: bom.id, name: bom.name });
  return NextResponse.json({ bom }, { status: 201 });
}
