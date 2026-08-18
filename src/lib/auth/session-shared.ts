// Session primitives with no dependency on `next/headers` or `server-only`,
// so they can be imported from both server components (via session.ts) and
// src/proxy.ts, which runs before a request resolves and should not assume
// the same module graph as the rendered app.
import { jwtVerify } from "jose";
import type { RoleName } from "@prisma/client";

export const SESSION_COOKIE = "lk_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

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
