/**
 * Runs once when a new server instance boots (see Next.js instrumentation
 * docs). Used here purely as a production safety net: ALLOW_DEMO_FALLBACK
 * silently logs any unauthenticated visitor in as the first seeded
 * SUPER_ADMIN/stakeholder (see src/lib/auth/current-user.ts) - it exists so
 * the app is explorable without the OTP flow, and must never be true on a
 * deployment reachable by the public.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_FALLBACK === "true") {
    throw new Error(
      "ALLOW_DEMO_FALLBACK=true in a production build. This grants unauthenticated " +
        "visitors full admin/stakeholder access and must never be set on a public " +
        "deployment. Remove it (or set it to false) and redeploy.",
    );
  }
}
