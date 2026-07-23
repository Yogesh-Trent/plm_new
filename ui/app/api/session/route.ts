import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET /api/session → the current session (or null). Read-only, no DB write.
export async function GET() {
  const session = await getSession();
  return NextResponse.json({ session });
}
