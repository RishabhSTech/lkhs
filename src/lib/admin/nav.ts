import {
  BarChart3, Building2, CalendarDays, CreditCard, LayoutDashboard, MessageSquare,
  Plug, Receipt, Settings, Sparkles, Star, Tags, Users, Wrench,
} from "lucide-react";
import type { RoleName } from "@prisma/client";
import { INVENTORY_ROLES, LISTING_ROLES, SETTINGS_ROLES } from "@/lib/auth/roles";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: RoleName[];
  /** Shows the whole portfolio, so hidden from property-scoped staff. */
  portfolio?: boolean;
};

/** Everyone in the back office except cleaners, whose login is task-only. */
const OFFICE: RoleName[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE", "OPERATIONS", "MARKETING"];
const FINANCE: RoleName[] = ["SUPER_ADMIN", "ADMIN", "FINANCE"];

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Home", icon: LayoutDashboard, roles: OFFICE, portfolio: true },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, roles: OFFICE },
  { href: "/admin/reservations", label: "Bookings", icon: Tags, roles: OFFICE },
  { href: "/admin/properties", label: "Properties", icon: Building2, roles: OFFICE },
  { href: "/admin/guests", label: "Guests", icon: Users, roles: OFFICE, portfolio: true },
  { href: "/admin/reviews", label: "Reviews", icon: Star, roles: LISTING_ROLES, portfolio: true },
  { href: "/admin/pricing", label: "Pricing", icon: Sparkles, roles: INVENTORY_ROLES, portfolio: true },
  { href: "/admin/channels", label: "Booking sites", icon: Plug, roles: INVENTORY_ROLES, portfolio: true },
  { href: "/admin/finance", label: "Finance", icon: CreditCard, roles: FINANCE, portfolio: true },
  {
    href: "/admin/finance/expenses",
    label: "Expenses",
    icon: Receipt,
    // Finance reaches expenses through Finance; everyone else who can log one
    // gets a direct entry.
    roles: ["MANAGER", "OPERATIONS", "CLEANER"],
  },
  { href: "/admin/operations", label: "Cleaning", icon: Wrench },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare, roles: OFFICE, portfolio: true },
  { href: "/admin/analytics", label: "Reports", icon: BarChart3, roles: OFFICE, portfolio: true },
  { href: "/admin/stakeholders", label: "Owners", icon: Users, roles: FINANCE, portfolio: true },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: SETTINGS_ROLES, portfolio: true },
];

export function visibleNavFor(role: RoleName, scoped = false): AdminNavItem[] {
  return ADMIN_NAV.map((item) =>
    // Finance staff limited to some properties still log and approve their expenses.
    scoped && item.href === "/admin/finance"
      ? { ...item, href: "/admin/finance/expenses", label: "Expenses", portfolio: false }
      : item,
  ).filter((item) => (!item.roles || item.roles.includes(role)) && !(scoped && item.portfolio));
}

export type MobileTab = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

/**
 * Bottom-bar tabs either side of the centre "+" button. Cleaners get just
 * their two screens; everyone else gets the four places they live in.
 */
export function mobileTabsFor(
  role: RoleName,
  scoped = false,
): { left: MobileTab[]; right: MobileTab[]; more: boolean } {
  if (role === "CLEANER") {
    return {
      left: [{ href: "/admin/operations", label: "Tasks", icon: Wrench }],
      right: [{ href: "/admin/finance/expenses", label: "Expenses", icon: Receipt }],
      more: false,
    };
  }
  return {
    left: [
      scoped
        ? { href: "/admin/calendar", label: "Calendar", icon: CalendarDays }
        : { href: "/admin", label: "Home", icon: LayoutDashboard, exact: true },
      { href: "/admin/reservations", label: "Bookings", icon: Tags },
    ],
    right: [{ href: "/admin/operations", label: "Cleaning", icon: Sparkles }],
    more: true,
  };
}

export function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact || href === "/admin") return pathname === href;
  if (href === "/admin/finance") {
    return pathname.startsWith(href) && !pathname.startsWith("/admin/finance/expenses");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
