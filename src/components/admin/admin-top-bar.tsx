"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { CommandPalette } from "@/components/admin/command-palette";
import { AskLimePanel } from "@/components/admin/ask-lime-panel";
import { formatDateLong } from "@/lib/format";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  severity: string;
  link: string | null;
  createdAt: string;
};

export function AdminTopBar({
  userName,
  notifications,
  properties,
  isDemoFallback,
}: {
  userName: string;
  notifications: NotificationItem[];
  properties: { id: string; name: string; slug: string }[];
  isDemoFallback: boolean;
}) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-brand-mist sm:max-w-sm"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search everything…</span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] sm:block">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <AskLimePanel />

          <Popover>
            <PopoverTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="relative">
                  <Bell />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-brand-azure text-[0.5625rem] font-semibold text-white">
                      {notifications.length}
                    </span>
                  )}
                  <span className="sr-only">
                    Notifications ({notifications.length} unread)
                  </span>
                </Button>
              }
            />
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  Notifications
                </p>
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  You&apos;re all caught up.
                </p>
              ) : (
                <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={
                            n.severity === "CRITICAL"
                              ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive"
                              : n.severity === "WARNING"
                                ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-chart-4"
                                : "mt-1.5 size-1.5 shrink-0 rounded-full bg-chart-3"
                          }
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {n.body}
                          </p>
                          <p className="mt-1 text-[0.6875rem] text-muted-foreground/70">
                            {formatDateLong(n.createdAt)}
                          </p>
                          {n.link && (
                            <Link
                              href={n.link}
                              className="mt-1 inline-block text-xs font-medium text-brand-azure hover:underline"
                            >
                              Open
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>

          {isDemoFallback && (
            <Badge className="hidden border-chart-4/25 bg-chart-4/10 text-chart-4 sm:inline-flex">
              Demo · {userName}
            </Badge>
          )}
        </div>
      </header>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        properties={properties}
      />
    </>
  );
}
