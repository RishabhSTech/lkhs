import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ADMIN_ROLES, STAKEHOLDER_ROLES } from "@/lib/auth/session-shared";

// Demo fallback is off by default. Real deployments should never set this —
// it exists only so the app is explorable without running the OTP flow first.
// src/proxy.ts enforces the same flag before these ever run, but this is the
// authoritative check: it re-verifies the session against the database and
// the required role, rather than trusting the JWT's claims alone.
const DEMO_FALLBACK_ENABLED = process.env.ALLOW_DEMO_FALLBACK === "true";

export const getCurrentAdminUser = cache(async () => {
  const session = await getSession();

  if (session && ADMIN_ROLES.includes(session.role)) {
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (user) return { user, isDemoFallback: false };
  }

  if (!DEMO_FALLBACK_ENABLED) {
    redirect(`/signin?redirect=${encodeURIComponent("/admin")}`);
  }

  const fallback = await db.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) throw new Error("No admin user exists — run the database seed.");

  return { user: fallback, isDemoFallback: true };
});

export const getCurrentStakeholder = cache(async () => {
  const session = await getSession();

  if (session && STAKEHOLDER_ROLES.includes(session.role)) {
    const stakeholder = await db.stakeholder.findUnique({
      where: { userId: session.userId },
      include: { properties: { include: { property: true } } },
    });
    if (stakeholder) return { stakeholder, isDemoFallback: false };
  }

  if (!DEMO_FALLBACK_ENABLED) {
    redirect(`/signin?redirect=${encodeURIComponent("/stakeholder")}`);
  }

  const fallback = await db.stakeholder.findFirst({
    include: { properties: { include: { property: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) throw new Error("No stakeholder exists — run the database seed.");

  return { stakeholder: fallback, isDemoFallback: true };
});
