import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { OAUTH_STATE_COOKIE, verifyGoogleAuthCode } from "@/lib/auth/google";
import { findOrCreateUser } from "@/lib/auth/otp";
import { createSession, redirectPathForRole } from "@/lib/auth/session";

function errorRedirect(request: Request, code: string) {
  const url = new URL("/signin", request.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const limited = await checkRateLimit(request, { bucket: "oauth-callback", limit: 20, windowSeconds: 900 });
  if (limited) return limited;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  // Consumed on first use either way - a state cookie is only ever good for
  // one round trip.
  store.delete(OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return errorRedirect(request, "google_state_mismatch");
  }

  try {
    const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
    const claims = await verifyGoogleAuthCode(code, redirectUri);

    const user = await findOrCreateUser(claims.email, claims.name, claims.picture);
    await createSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
    });

    return NextResponse.redirect(new URL(redirectPathForRole(user.role), request.url));
  } catch (error) {
    console.warn(
      "[auth/google] sign-in failed:",
      error instanceof Error ? error.message : error,
    );
    return errorRedirect(request, "google_failed");
  }
}
