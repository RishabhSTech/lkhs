import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/session-shared";

export type { SessionPayload };
export {
  SESSION_COOKIE,
  redirectPathForRole,
  ADMIN_ROLES,
  STAKEHOLDER_ROLES,
} from "@/lib/auth/session-shared";

export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
