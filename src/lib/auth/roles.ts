import type { RoleName } from "@prisma/client";

/**
 * Who may do what in the back office. Kept free of server imports so client
 * components (nav, forms) can read the same rules the API routes enforce.
 */

/** Full finance access: P&L, revenue, approving and editing any expense. */
export const FINANCE_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "FINANCE"];

/**
 * Can log an expense against a property. Anyone outside FINANCE_ROLES files
 * it as PENDING so finance approves it before it counts as settled.
 */
export const EXPENSE_SUBMIT_ROLES: RoleName[] = [
  ...FINANCE_ROLES,
  "MANAGER",
  "OPERATIONS",
  "CLEANER",
];

/** Can record and edit extra income (items charged, bookings given to other flats). */
export const EXTRA_INCOME_ROLES: RoleName[] = [...FINANCE_ROLES, "MANAGER"];

/** Can create, edit, cancel and annotate bookings. */
export const BOOKING_WRITE_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "OPERATIONS",
  "FINANCE",
  "MARKETING",
];

/** Can schedule, assign and delete cleaning tasks and add cleaners. */
export const CLEANING_MANAGE_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "OPERATIONS",
];

/** Roles that show up as people a cleaning task can be assigned to. */
export const CLEANING_STAFF_ROLES: RoleName[] = ["CLEANER", "OPERATIONS", "MANAGER"];

/** Everyone in the back office except cleaners. */
export const OFFICE_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE", "OPERATIONS", "MARKETING"];

/** Integrations, mailbox, channel connections, adding/removing properties. */
export const SETTINGS_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN"];

/** Rates, pricing rules, channel sync and property setup. */
export const INVENTORY_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

/** Listing copy, photos and reviews. */
export const LISTING_ROLES: RoleName[] = [...INVENTORY_ROLES, "MARKETING"];

/** Can report a maintenance issue (anyone who's physically at a property). */
export const MAINTENANCE_REPORT_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "OPERATIONS",
  "CLEANER",
];

/**
 * These roles can be limited to specific properties via PropertyAssignment.
 * Someone with no assignments keeps portfolio-wide access, so existing logins
 * don't lose access until an admin deliberately scopes them.
 */
export const SCOPABLE_ROLES: RoleName[] = ["MANAGER", "FINANCE", "OPERATIONS", "CLEANER", "MARKETING"];

export function can(role: RoleName, roles: RoleName[]) {
  return roles.includes(role);
}

/**
 * A cleaner's login is deliberately narrow: their task list and their own
 * expenses. Everything else in /admin is someone else's job.
 */
export const CLEANER_PAGE_PREFIXES = ["/admin/operations", "/admin/finance/expenses"];
export const CLEANER_API_PREFIXES = [
  "/api/admin/operations/cleaning",
  "/api/admin/operations/maintenance",
  "/api/admin/expenses",
  "/api/admin/uploads",
  "/api/admin/push",
];

export function cleanerMayAccess(pathname: string) {
  if (pathname === "/admin") return true;
  const prefixes = pathname.startsWith("/api/") ? CLEANER_API_PREFIXES : CLEANER_PAGE_PREFIXES;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
