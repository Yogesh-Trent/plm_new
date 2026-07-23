import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import {
  addAudit,
  deleteSeason,
  getSeasonById,
  updateSeason,
} from "@/lib/queries";
import { parseSeasonBody } from "@/lib/season-input";

// Creator-only guard: the season must exist AND belong to the caller. Only the
// All role creates seasons, and status/edit/delete are "controlled by whoever
// created it" — enforced here on the server, not just hidden in the UI.
async function requireOwnedSeason(id: string) {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  const season = await getSeasonById(id);
  if (!season) {
    return { error: NextResponse.json({ error: "Season not found" }, { status: 404 }) };
  }
  if (season.created_by_id !== session.userId) {
    return {
      error: NextResponse.json(
        { error: "Only the creator can change this season." },
        { status: 403 },
      ),
    };
  }
  return { session, season };
}

// PATCH /api/seasons/:id → edit fields or flip status (active/inactive).
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const owned = await requireOwnedSeason(id);
  if ("error" in owned) return owned.error;

  const parsed = await parseSeasonBody(request, { requireName: false });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const season = await updateSeason(id, parsed.fields);
  await addAudit(null, owned.session.name, "season.update", { id, ...parsed.fields });
  return NextResponse.json({ season });
}

// DELETE /api/seasons/:id → remove the season (creator only).
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const owned = await requireOwnedSeason(id);
  if ("error" in owned) return owned.error;

  await deleteSeason(id);
  await addAudit(null, owned.session.name, "season.delete", {
    id,
    name: owned.season.name,
  });
  return NextResponse.json({ ok: true });
}
