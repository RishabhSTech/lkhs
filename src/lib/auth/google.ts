import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const OAUTH_STATE_COOKIE = "lk_oauth_state";
export const OAUTH_STATE_TTL_SECONDS = 600;

// Google's published signing keys - verifying against these (rather than
// trusting the id_token's own header) is what actually proves the token
// came from Google. jose caches and rotates this automatically.
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export class GoogleAuthError extends Error {}

type RawGoogleClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export type VerifiedGoogleProfile = {
  email: string;
  name?: string;
  picture?: string;
};

/** Exchanges an authorization code for tokens, then verifies the id_token's
 * signature, issuer, audience and expiry before trusting anything in it. */
export async function verifyGoogleAuthCode(
  code: string,
  redirectUri: string,
): Promise<VerifiedGoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleAuthError("Google sign-in isn't configured.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!tokenRes.ok) {
    throw new GoogleAuthError("Google didn't confirm that sign-in. Please try again.");
  }

  const tokenBody = (await tokenRes.json().catch(() => null)) as { id_token?: string } | null;
  if (!tokenBody?.id_token) {
    throw new GoogleAuthError("Google didn't confirm that sign-in. Please try again.");
  }

  const { payload } = await jwtVerify(tokenBody.id_token, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  }).catch(() => {
    throw new GoogleAuthError("That Google sign-in couldn't be verified.");
  });

  const claims = payload as unknown as RawGoogleClaims;
  if (!claims.email || !claims.email_verified) {
    throw new GoogleAuthError("That Google account has no verified email address.");
  }

  return { email: claims.email, name: claims.name, picture: claims.picture };
}
