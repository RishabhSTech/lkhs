"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { RoleName } from "@prisma/client";
import { LogOut, MoreHorizontal, Plus } from "lucide-react";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { useQuickAdd } from "@/components/admin/quick-add";
import { isActivePath, mobileTabsFor, visibleNavFor, type MobileTab } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

export function AdminMobileNav({ role, userName, scoped }: { role: RoleName; userName: string; scoped: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { openMenu, can } = useQuickAdd();
  const tabs = mobileTabsFor(role, scoped);
  const nav = visibleNavFor(role, scoped);
  const showPlus = can.booking || can.expense || can.cleaning || can.maintenance;
  const cols = tabs.left.length + tabs.right.length + (showPlus ? 1 : 0) + (tabs.more ? 1 : 0);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="grid h-16" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {tabs.left.map((t) => (
            <Tab key={t.href} tab={t} active={isActivePath(pathname, t.href, t.exact)} />
          ))}
          {showPlus && (
            <li className="flex items-start justify-center">
              <button
                type="button"
                onClick={openMenu}
                aria-label="Add new"
                className="-mt-4 grid size-14 place-items-center rounded-full bg-brand-blue text-white shadow-lg shadow-brand-blue/30 ring-4 ring-background transition-transform active:scale-95"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </button>
            </li>
          )}
          {tabs.right.map((t) => (
            <Tab key={t.href} tab={t} active={isActivePath(pathname, t.href, t.exact)} />
          ))}
          {tabs.more && (
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground"
              >
                <MoreHorizontal className="size-[1.375rem]" />
                More
              </button>
            </li>
          )}
        </ul>
      </nav>

      <ResponsiveSheet open={moreOpen} onOpenChange={setMoreOpen} title="Menu" size="sm">
        <ul className="grid grid-cols-3 gap-2">
          {nav.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex aspect-[5/4] flex-col items-center justify-center gap-2 rounded-xl border px-2 text-center text-xs font-medium",
                    active
                      ? "border-brand-blue bg-brand-blue/8 text-brand-blue"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
            <span className="block text-xs capitalize text-muted-foreground">
              {role.replace(/_/g, " ").toLowerCase()}
            </span>
          </span>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/8"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </ResponsiveSheet>
    </>
  );
}

function Tab({ tab, active }: { tab: MobileTab; active: boolean }) {
  return (
    <li>
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
          active ? "text-brand-blue dark:text-sidebar-primary" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "grid h-7 w-12 place-items-center rounded-full transition-colors",
            active && "bg-brand-blue/10 dark:bg-sidebar-primary/15",
          )}
        >
          <tab.icon className="size-[1.375rem]" />
        </span>
        {tab.label}
      </Link>
    </li>
  );
}
