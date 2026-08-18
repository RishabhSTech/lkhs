import {
  BarChart3, Building2, CalendarDays, CreditCard, LayoutDashboard, MessageSquare,
  Plug, Settings, Sparkles, Star, Tags, Users, Wrench,
} from "lucide-react";
import type { RoleName } from "@prisma/client";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: RoleName[];
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/reservations", label: "Reservations", icon: Tags },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/guests", label: "Guests", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/pricing", label: "Pricing", icon: Sparkles },
  { href: "/admin/channels", label: "Channels", icon: Plug },
  {
    href: "/admin/finance",
    label: "Finance",
    icon: CreditCard,
    roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
  },
  { href: "/admin/operations", label: "Operations", icon: Wrench },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  {
    href: "/admin/stakeholders",
    label: "Stakeholders",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
];

/** Bottom-bar items on mobile; everything else lives behind "More". */
export const ADMIN_MOBILE_PRIMARY = [
  "/admin",
  "/admin/calendar",
  "/admin/reservations",
];

export function visibleNavFor(role: RoleName): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => !item.roles || item.roles.includes(role));
}
