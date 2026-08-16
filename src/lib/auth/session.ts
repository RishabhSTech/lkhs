import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { RoleName } from "@prisma/client";

const SESSION_COOKIE = "lk_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
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

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
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
