"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoleName } from "@prisma/client";
import { LogOut } from "lucide-react";
import { LogoStacked } from "@/components/brand/logo";
import { visibleNavFor } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

/** Groups keep a thirteen-item nav scannable instead of one long list. */
const GROUPS: { label: string | null; hrefs: string[] }[] = [
  { label: null, hrefs: ["/admin"] },
  {
    label: "Bookings",
    hrefs: ["/admin/calendar", "/admin/reservations", "/admin/guests"],
  },
  {
    label: "Inventory",
    hrefs: ["/admin/properties", "/admin/pricing", "/admin/channels"],
  },
  { label: "Money", hrefs: ["/admin/finance", "/admin/stakeholders"] },
  {
    label: "Running it",
    hrefs: ["/admin/operations", "/admin/messages", "/admin/analytics", "/admin/settings"],
  },
];

export function AdminSidebar({
  role,
  userName,
}: {
  role: RoleName;
  userName: string;
}) {
  const pathname = usePathname();
  const nav = visibleNavFor(role);
  const byHref = new Map(nav.map((item) => [item.href, item]));

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="px-4 py-4">
        <Link href="/admin">
          <LogoStacked tone="light" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
        {GROUPS.map((group) => {
          const items = group.hrefs
            .map((href) => byHref.get(href))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
          if (items.length === 0) return null;

          return (
            <div key={group.label ?? "root"} className="mb-4 last:mb-0">
              {group.label && (
                <p className="px-2.5 pb-1.5 text-[0.625rem] font-semibold tracking-[0.14em] text-sidebar-foreground/35 uppercase">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}
                      >
                        {active && (
                          <span
                            aria-hidden
                            className="absolute inset-y-1.5 -left-2.5 w-0.5 rounded-full bg-sidebar-primary"
                          />
                        )}
                        <item.icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2.5">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[0.625rem] font-semibold text-sidebar-accent-foreground">
            {userName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8125rem] font-medium text-sidebar-foreground">
              {userName}
            </span>
            <span className="block text-[0.625rem] capitalize text-sidebar-foreground/45">
              {role.replace(/_/g, " ").toLowerCase()}
            </span>
          </span>
          <Link
            href="/api/auth/signout"
            aria-label="Sign out"
            className="text-sidebar-foreground/45 transition-colors hover:text-sidebar-foreground"
          >
            <LogOut className="size-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
