import "server-only";
import { NextResponse } from "next/server";
import { getSession, type Session } from "@/lib/auth";
import { getRunByRole, type DbRun } from "@/lib/queries";

// Shared guard for authenticated API routes. Returns the caller's session and
// their own role-scoped run, or a ready-to-return 401/404 response. Because the
// run is always looked up from the *session* role (never a client-supplied id),
// a caller can only ever read/write their own separate workspace.
export async function requireApiRun(): Promise<
  { session: Session; run: DbRun } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  const run = await getRunByRole(session.role);
  if (!run) {
    return {
      error: NextResponse.json(
        { error: "No workspace for role. Run npm run db:seed." },
        { status: 404 },
      ),
    };
  }
  return { session, run };
}
