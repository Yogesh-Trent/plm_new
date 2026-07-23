import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addAudit, createSeason, getSeasons } from "@/lib/queries";
import { deriveGeneric, parseSeasonBody } from "@/lib/season-input";

// Full PLM process — Step 1: Seasons. Owned by the "All" role (per spec).
// GET is readable by any signed-in user; POST is restricted to role "all",
// enforced here on the server so a hidden button is not the only guard.

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const seasons = await getSeasons();
  return NextResponse.json({ seasons });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.role !== "all") {
    return NextResponse.json(
      { error: "Only the All role can create seasons." },
      { status: 403 },
    );
  }

  const parsed = await parseSeasonBody(request, { requireName: true });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const name = parsed.fields.name ?? "";
  const season = await createSeason({
    name,
    // Fall back to a derived code so direct API callers match the UI behaviour.
    generic: parsed.fields.generic ?? deriveGeneric(name),
    businessUnit: parsed.fields.businessUnit ?? null,
    department: parsed.fields.department ?? null,
    imageUrl: parsed.fields.imageUrl ?? null,
    seasonCompleteDate: parsed.fields.seasonCompleteDate ?? null,
    status: parsed.fields.status ?? "active",
    createdBy: session.name,
    createdById: session.userId,
  });
  await addAudit(null, session.name, "season.create", {
    id: season.id,
    name: season.name,
  });
  return NextResponse.json({ season }, { status: 201 });
}
