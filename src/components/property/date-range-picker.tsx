"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarDays, Loader2 } from "lucide-react";
import { CalendarSkeleton } from "@/components/ui/calendar-skeleton";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Loaded on demand: the calendar only ever renders inside the popover
 * below, so its `react-day-picker` + `date-fns` chunk has no business in
 * the initial payload of every page carrying a booking card.
 */
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => m.Calendar),
  {
    ssr: false,
    loading: () => <CalendarSkeleton months={1} />,
  },
);

/**
 * Guest-facing date picker that greys out nights already taken, so unavailable
 * dates are visible before the guest commits rather than surfacing as an error.
 */
export function DateRangePicker({
  propertySlug,
  checkIn,
  checkOut,
  onChange,
  className,
}: {
  propertySlug: string;
  checkIn: string;
  checkOut: string;
  onChange: (next: { checkIn: string; checkOut: string }) => void;
  className?: string;
}) {
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/availability?property=${encodeURIComponent(propertySlug)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setBlocked(new Set<string>(data.blockedDates ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [propertySlug]);

  const selected: DateRange | undefined = useMemo(() => {
    if (!checkIn) return undefined;
    return {
      from: new Date(`${checkIn}T00:00:00`),
      to: checkOut ? new Date(`${checkOut}T00:00:00`) : undefined,
    };
  }, [checkIn, checkOut]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isBlocked(date: Date) {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return blocked.has(iso);
  }

  function toISO(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  /** Rejects a range that straddles a blocked night, not just blocked endpoints. */
  function rangeIsClean(from: Date, to: Date) {
    for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
      if (isBlocked(d)) return false;
    }
    return true;
  }

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from) {
      onChange({ checkIn: "", checkOut: "" });
      return;
    }
    if (!range.to) {
      onChange({ checkIn: toISO(range.from), checkOut: "" });
      return;
    }
    if (!rangeIsClean(range.from, range.to)) {
      // Restart the selection from the new check-in rather than silently
      // accepting a range that spans someone else's stay.
      onChange({ checkIn: toISO(range.to), checkOut: "" });
      return;
    }
    onChange({ checkIn: toISO(range.from), checkOut: toISO(range.to) });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2.5 text-left text-sm transition-colors hover:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              className,
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">
              {checkIn && checkOut ? (
                <span className="font-medium text-foreground">
                  {formatDateShort(checkIn)} → {formatDateShort(checkOut)}
                </span>
              ) : checkIn ? (
                <span className="text-muted-foreground">
                  {formatDateShort(checkIn)} → select checkout
                </span>
              ) : (
                <span className="text-muted-foreground">Add your dates</span>
              )}
            </span>
            {loading && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
          </button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={1}
          disabled={[{ before: today }, isBlocked]}
          defaultMonth={checkIn ? new Date(`${checkIn}T00:00:00`) : today}
          className="[--cell-size:--spacing(9)]"
        />
        <div className="flex items-center gap-4 border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full bg-primary"
            />
            Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full bg-muted line-through"
            />
            Already booked
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
