import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPoOptions } from "@/lib/po-queries";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const options = await getPoOptions();
  return NextResponse.json({ options });
}
