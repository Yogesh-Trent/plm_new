import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-cookie";

// Optimistic auth guard (Next.js 16 "Proxy" — formerly Middleware). It only
// checks for the presence of the session cookie and redirects to the login page
// when it is missing. The cookie's SIGNATURE is verified for real inside server
// components / route handlers (via lib/auth.getSession), not here — proxy runs in
// a limited runtime and, per the Next docs, should not be the authz source.

const PROTECTED = [
  "/designer",
  "/buyer",
  "/technologist",
  "/all",
  "/admin",
  "/styles",
  "/color-combos",
  "/boms",
  "/supplier-requests",
  "/supplier-quotes",
  "/purchase-orders",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPage = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtectedPage) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/designer/:path*",
    "/buyer/:path*",
    "/technologist/:path*",
    "/all/:path*",
    "/admin/:path*",
    "/styles/:path*",
    "/color-combos/:path*",
    "/boms/:path*",
    "/supplier-requests/:path*",
    "/supplier-quotes/:path*",
    "/purchase-orders/:path*",
  ],
};
