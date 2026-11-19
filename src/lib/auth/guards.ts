import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { RoleName, User } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { SCOPABLE_ROLES } from "@/lib/auth/roles";

/**
 * The property ids this user may see and change, or null for the whole
 * portfolio. Super admins and admins are never scoped.
 */
export const getPropertyScope = cache(async (user: Pick<User, "id" | "role">): Promise<string[] | null> => {
  if (!SCOPABLE_ROLES.includes(user.role)) return null;
  const rows = await db.propertyAssignment.findMany({
    where: { userId: user.id },
    select: { propertyId: true },
  });
  return rows.length ? rows.map((r) => r.propertyId) : null;
});

export function inScope(scope: string[] | null, ...propertyIds: (string | null | undefined)[]) {
  if (!scope) return true;
  return propertyIds.every((id) => !id || scope.includes(id));
}

/** Prisma filter for any model with a `propertyId` column. */
export function scopeFilter(scope: string[] | null) {
  return scope ? { propertyId: { in: scope } } : {};
}

/** Prisma filter for the Property model itself. */
export function propertyScopeFilter(scope: string[] | null) {
  return scope ? { id: { in: scope } } : {};
}

type Guarded = { user: User; scope: string[] | null };

/**
 * Route-handler guard: returns the signed-in staff member and their property
 * scope, or a ready-to-return 403 response.
 *
 *   const auth = await guardApi(INVENTORY_ROLES);
 *   if ("error" in auth) return auth.error;
 */
export async function guardApi(roles?: RoleName[], message?: string): Promise<Guarded | { error: NextResponse }> {
  const { user } = await getCurrentAdminUser();
  if (roles && !roles.includes(user.role)) {
    return {
      error: NextResponse.json({ error: message ?? "You don't have permission to do that." }, { status: 403 }),
    };
  }
  return { user, scope: await getPropertyScope(user) };
}

export function outOfScope() {
  return NextResponse.json({ error: "That property isn't one of yours." }, { status: 403 });
}

/**
 * Page guard for screens that show the whole portfolio (KPIs, analytics,
 * guest CRM, finance, pricing). Property-scoped staff go to their bookings.
 */
export async function requirePortfolioAccess(roles?: RoleName[]) {
  const { user, isDemoFallback } = await getCurrentAdminUser();
  const scope = await getPropertyScope(user);
  if (scope || user.role === "CLEANER") {
    redirect(user.role === "CLEANER" ? "/admin/operations" : "/admin/reservations");
  }
  if (roles && !roles.includes(user.role)) redirect("/admin");
  return { user, isDemoFallback };
}

/**
 * Page guard for screens that filter themselves to the viewer's properties
 * (bookings, calendar, cleaning, expenses, property pages).
 */
export async function requireAdminPage(roles?: RoleName[]) {
  const { user, isDemoFallback } = await getCurrentAdminUser();
  if (roles && !roles.includes(user.role)) {
    redirect(user.role === "CLEANER" ? "/admin/operations" : "/admin");
  }
  return { user, isDemoFallback, scope: await getPropertyScope(user) };
}
