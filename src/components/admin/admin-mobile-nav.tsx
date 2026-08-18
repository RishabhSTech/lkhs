"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { RoleName } from "@prisma/client";
import { CalendarDays, LayoutDashboard, MoreHorizontal, Tags } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { visibleNavFor } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/reservations", label: "Bookings", icon: Tags },
];

export function AdminMobileNav({ role }: { role: RoleName }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = visibleNavFor(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-4">
        {PRIMARY.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[0.625rem] font-medium transition-colors",
                  active
                    ? "text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/55",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}

        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-1 py-2.5 text-[0.625rem] font-medium text-sidebar-foreground/55"
                >
                  <MoreHorizontal className="size-5" />
                  More
                </button>
              }
            />
            <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-heading text-xl text-brand-blue">
                  All sections
                </SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-2 gap-2 px-4 pb-8">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-3 text-sm font-medium text-foreground"
                    >
                      <item.icon className="size-4 text-brand-mist" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
