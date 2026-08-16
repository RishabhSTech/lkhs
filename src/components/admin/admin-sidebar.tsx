"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoleName } from "@prisma/client";
import { LogOut } from "lucide-react";
import { LogoStacked } from "@/components/brand/logo";
import { visibleNavFor } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

export function AdminSidebar({
  role,
  userName,
}: {
  role: RoleName;
  userName: string;
}) {
  const pathname = usePathname();
  const nav = visibleNavFor(role);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="px-5 py-5">
        <Link href="/admin">
          <LogoStacked tone="light" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {nav.map((item) => {
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
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[0.6875rem] font-semibold text-sidebar-accent-foreground">
            {userName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-sidebar-foreground">
              {userName}
            </span>
            <span className="block text-[0.6875rem] text-sidebar-foreground/50">
              {role.replace("_", " ").toLowerCase()}
            </span>
          </span>
          <Link
            href="/api/auth/signout"
            aria-label="Sign out"
            className="text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
