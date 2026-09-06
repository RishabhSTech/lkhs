import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_ROLES,
  SESSION_COOKIE,
  STAKEHOLDER_ROLES,
  verifySessionToken,
} from "@/lib/auth/session-shared";

// Optimistic gate in front of /admin and /stakeholder: reject requests with
// no valid session before they render. The authoritative check still lives
// in getCurrentAdminUser / getCurrentStakeholder (src/lib/auth/current-user.ts),
// which re-verifies against the database - proxy alone is not a substitute
// for that per Next's guidance on Proxy as an optimistic check only.
const DEMO_FALLBACK_ENABLED = process.env.ALLOW_DEMO_FALLBACK === "true";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiAdminPath = pathname.startsWith("/api/admin");
  const isAdminPath = isApiAdminPath || pathname.startsWith("/admin");
  const isStakeholderPath = pathname.startsWith("/stakeholder");

  if (!isAdminPath && !isStakeholderPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const allowedRoles = isAdminPath ? ADMIN_ROLES : STAKEHOLDER_ROLES;
  if (session && allowedRoles.includes(session.role)) {
    return NextResponse.next();
  }

  if (!session && DEMO_FALLBACK_ENABLED) {
    return NextResponse.next();
  }

  if (isApiAdminPath) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/signin", request.url);
  signInUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/stakeholder/:path*"],
};
