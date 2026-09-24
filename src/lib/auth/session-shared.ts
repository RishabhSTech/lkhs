// Session primitives with no dependency on `next/headers` or `server-only`,
// so they can be imported from both server components (via session.ts) and
// src/proxy.ts, which runs before a request resolves and should not assume
// the same module graph as the rendered app.
import { SignJWT, jwtVerify } from "jose";
import type { RoleName } from "@prisma/client";

export const SESSION_COOKIE = "lk_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
// Once a session's remaining life drops below this, proxy.ts re-signs it -
// sliding expiration so an actively-browsing user is never cut off by the
// fixed 30-day timer set at login (there was previously no renewal at all).
export const SESSION_RENEWAL_THRESHOLD_SECONDS = SESSION_TTL_SECONDS / 2;

export function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: RoleName;
  name: string;
  email?: string | null;
  phone?: string | null;
  exp?: number;
  iat?: number;
};

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function redirectPathForRole(role: RoleName) {
  switch (role) {
    case "OWNER":
    case "INVESTOR":
      return "/stakeholder";
    case "GUEST":
      return "/account";
    default:
      return "/admin";
  }
}

export const ADMIN_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "FINANCE",
  "OPERATIONS",
  "CLEANER",
  "MARKETING",
];

export const STAKEHOLDER_ROLES: RoleName[] = ["OWNER", "INVESTOR"];

/** Roles allowed to create/edit budgets and expenses. Narrower than
 * ADMIN_ROLES - Cleaner/Marketing/Operations/Manager logins can use the
 * rest of the admin console but shouldn't be able to write financial
 * transactions. */
export const FINANCE_WRITE_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "FINANCE"];
