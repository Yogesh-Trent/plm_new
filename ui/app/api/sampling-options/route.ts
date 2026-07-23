import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSamplingOptions } from "@/lib/sampling-queries";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const options = await getSamplingOptions();
  return NextResponse.json({ options });
}
