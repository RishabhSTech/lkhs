"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { RoleName } from "@prisma/client";
import { LogOut, MoreHorizontal, Plus } from "lucide-react";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { useQuickAdd } from "@/components/admin/quick-add";
import { PushAlertButton } from "@/components/admin/push-alert-button";
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
            <li className="flex flex-col items-center">
              <button
                type="button"
                onClick={openMenu}
                aria-label="Add new"
                className="-mt-4 grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 ring-4 ring-background transition-transform active:scale-95"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </button>
              <span className="mt-0.5 text-xs font-medium text-primary">Add</span>
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
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground"
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
                    "flex aspect-[5/4] flex-col items-center justify-center gap-2 rounded-2xl px-2 text-center text-[0.8125rem] font-medium transition-colors",
                    active ? "bg-primary/10 text-primary" : "bg-muted/70 text-foreground active:bg-muted",
                  )}
                >
                  <item.icon className="size-5" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-muted/70 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Alerts on this phone</span>
          <PushAlertButton />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-muted/70 px-4 py-3">
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
          "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
          active ? "text-primary dark:text-sidebar-primary" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "grid h-7 w-12 place-items-center rounded-full transition-colors",
            active && "bg-primary/10 dark:bg-sidebar-primary/15",
          )}
        >
          <tab.icon className="size-[1.375rem]" />
        </span>
        {tab.label}
      </Link>
    </li>
  );
}
