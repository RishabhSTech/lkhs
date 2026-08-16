import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

/**
 * Resolves the acting user. When no session exists, the demo environment falls
 * back to the seeded super admin so the dashboard is explorable without a
 * login wall. Real deployments should redirect to /signin instead.
 */
export const getCurrentAdminUser = cache(async () => {
  const session = await getSession();

  if (session) {
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (user) return { user, isDemoFallback: false };
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

  if (session) {
    const stakeholder = await db.stakeholder.findUnique({
      where: { userId: session.userId },
      include: { properties: { include: { property: true } } },
    });
    if (stakeholder) return { stakeholder, isDemoFallback: false };
  }

  const fallback = await db.stakeholder.findFirst({
    include: { properties: { include: { property: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) throw new Error("No stakeholder exists — run the database seed.");

  return { stakeholder: fallback, isDemoFallback: true };
});
