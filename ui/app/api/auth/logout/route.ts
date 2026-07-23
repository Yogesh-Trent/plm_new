import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

// POST /api/auth/logout → clears the session cookie.
export async function POST() {
  await signOut();
  return NextResponse.json({ ok: true });
}
