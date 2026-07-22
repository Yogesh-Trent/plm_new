import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRole, type Role } from "@/lib/roles";
import { getUserByRole } from "@/lib/queries";
import { SESSION_COOKIE } from "@/lib/auth-cookie";

// Signed httpOnly session cookie. The role is authenticated on the server via
// this HMAC signature — the client can read nothing sensitive and cannot forge a
// role. AUTH_SECRET lives in .env (git-ignored) and never reaches the browser.

export { SESSION_COOKIE };
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Session = { userId: string; role: Role; name: string };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set. Add it to ui/.env.");
  return value;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function serializeSession(session: Session): string {
  const payload = b64url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

function verify(token: string | undefined): Session | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(payload);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (parsed && isRole(parsed.role) && typeof parsed.userId === "string") {
      return { userId: parsed.userId, role: parsed.role, name: String(parsed.name ?? "") };
    }
  } catch {
    /* fall through */
  }
  return null;
}

// Read + verify the current session (server components, route handlers).
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verify(store.get(SESSION_COOKIE)?.value);
}

// Set the session cookie for a role's demo user (used by the login route).
export async function signInAs(role: Role): Promise<Session> {
  const user = await getUserByRole(role);
  if (!user) throw new Error(`No seeded user for role "${role}". Run npm run db:seed.`);
  const session: Session = { userId: user.id, role: user.role, name: user.name };
  const store = await cookies();
  store.set(SESSION_COOKIE, serializeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return session;
}

export async function signOut() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

// Guard a page/route: must be signed in.
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

// Guard a role-specific dashboard: the session must match that exact role
// (each role has its own separate workspace). Mismatches bounce to their own.
export async function requireRole(role: Role): Promise<Session> {
  const session = await requireSession();
  if (session.role !== role) redirect(`/${session.role}`);
  return session;
}
