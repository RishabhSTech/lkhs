import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_SECONDS } from "@/lib/auth/google";

/**
 * Starts the Google sign-in redirect. GET (not POST) because this has to be
 * a full top-level navigation to accounts.google.com - it can't go through
 * fetch() the way the OTP endpoints do.
 */
export async function GET(request: Request) {
  const limited = await checkRateLimit(request, { bucket: "oauth-start", limit: 20, windowSeconds: 900 });
  if (limited) return limited;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  // Bound to this browser via an httpOnly cookie and echoed back by Google,
  // so the callback can reject a code/state pair that didn't originate from
  // a redirect this server issued (CSRF on the OAuth handshake).
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
  return response;
}
