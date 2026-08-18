"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarDays, Check, MapPin, Minus, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

const ANYWHERE = "Anywhere";

/** A city with its neighbourhoods, as supplied by the caller from live data. */
export type SearchLocation = { city: string; areas: string[] };

type WhereChoice = { label: string; city?: string; area?: string };

function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nightsBetween(checkIn: string, checkOut: string) {
  const ms =
    new Date(`${checkOut}T00:00:00`).getTime() -
    new Date(`${checkIn}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Two months side by side is the difference between "pick a date" and "plan a
 * trip" — but it does not fit a phone, so the count follows the viewport.
 */
function useMonthCount() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 40rem)");
    const sync = () => setCount(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return count;
}

export function SearchPanel({
  className,
  locations,
  defaults,
}: {
  variant?: "floating" | "inline";
  className?: string;
  /** Cities and their neighbourhoods, derived from live inventory. */
  locations?: SearchLocation[];
  defaults?: {
    city?: string;
    area?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  };
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(defaults?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults?.checkOut ?? "");
  const [guests, setGuests] = useState(defaults?.guests ?? 2);
  const [openCell, setOpenCell] = useState<"where" | "dates" | "guests" | null>(
    null,
  );

  const months = useMonthCount();

  // A flat, ordered option list: "Anywhere", then each city, then that city's
  // neighbourhoods beneath it. One list keeps keyboard order sane while still
  // reading as a grouped menu.
  const options = useMemo<WhereChoice[]>(() => {
    const list: WhereChoice[] = [{ label: ANYWHERE }];
    for (const location of locations ?? []) {
      list.push({ label: location.city, city: location.city });
      for (const area of location.areas) {
        list.push({ label: area, city: location.city, area });
      }
    }
    return list;
  }, [locations]);

  const [where, setWhere] = useState<WhereChoice>(() => {
    if (defaults?.area) return { label: defaults.area, area: defaults.area };
    if (defaults?.city) return { label: defaults.city, city: defaults.city };
    return { label: ANYWHERE };
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const selectedRange: DateRange | undefined = useMemo(() => {
    if (!checkIn) return undefined;
    return {
      from: new Date(`${checkIn}T00:00:00`),
      to: checkOut ? new Date(`${checkOut}T00:00:00`) : undefined,
    };
  }, [checkIn, checkOut]);

  function handleRange(range: DateRange | undefined) {
    if (!range?.from) {
      setCheckIn("");
      setCheckOut("");
      return;
    }
    setCheckIn(toISO(range.from));
    if (range.to) {
      setCheckOut(toISO(range.to));
      setOpenCell(null); // both ends chosen — get out of the way
    } else {
      setCheckOut("");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (where.area) params.set("area", where.area);
    else if (where.city) params.set("city", where.city);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));
    router.push(`/stays?${params.toString()}`);
  }

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const dateValue = checkIn
    ? checkOut
      ? `${formatDateShort(checkIn)} – ${formatDateShort(checkOut)}`
      : `${formatDateShort(checkIn)} – …`
    : "Any week";

  return (
    <form
      onSubmit={submit}
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-1.5 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_24px_60px_-24px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="grid gap-px overflow-hidden rounded-xl bg-border/70 sm:grid-cols-2 lg:grid-cols-[1.15fr_1.5fr_1fr_auto]">
        <Cell
          icon={MapPin}
          label="Where"
          value={where.label}
          muted={!where.city && !where.area}
          open={openCell === "where"}
          onOpenChange={(o) => setOpenCell(o ? "where" : null)}
        >
          <PopoverContent
            align="start"
            className="max-h-80 w-64 overflow-y-auto p-1.5"
          >
            <p className="px-2 pt-1 pb-2 label-eyebrow">City or area</p>
            {options.map((option) => {
              const selected =
                option.label === where.label &&
                option.area === where.area &&
                option.city === where.city;
              // A city heading sits flush; its neighbourhoods are indented so
              // the hierarchy is readable without nested markup.
              const isArea = Boolean(option.area);
              return (
                <button
                  key={`${option.city ?? ""}-${option.area ?? option.label}`}
                  type="button"
                  onClick={() => {
                    setWhere(option);
                    setOpenCell(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted",
                    isArea
                      ? "pl-5 text-sm text-muted-foreground"
                      : "text-sm font-medium text-foreground",
                  )}
                >
                  {option.label}
                  {selected && (
                    <Check className="size-3.5 shrink-0 text-brand-azure" />
                  )}
                </button>
              );
            })}
          </PopoverContent>
        </Cell>

        <Cell
          icon={CalendarDays}
          label={nights > 0 ? `${nights} ${nights === 1 ? "night" : "nights"}` : "When"}
          value={dateValue}
          muted={!checkIn}
          open={openCell === "dates"}
          onOpenChange={(o) => setOpenCell(o ? "dates" : null)}
        >
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={handleRange}
              numberOfMonths={months}
              disabled={{ before: today }}
              defaultMonth={checkIn ? new Date(`${checkIn}T00:00:00`) : today}
              className="p-3 [--cell-size:--spacing(9)]"
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">
                Availability is confirmed per home on the next step.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setCheckIn("");
                  setCheckOut("");
                }}
              >
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Cell>

        <Cell
          icon={Users}
          label="Guests"
          value={`${guests} ${guests === 1 ? "guest" : "guests"}`}
          open={openCell === "guests"}
          onOpenChange={(o) => setOpenCell(o ? "guests" : null)}
        >
          <PopoverContent align="start" className="w-64">
            <div className="flex items-center justify-between gap-4 px-1">
              <div>
                <p className="text-sm font-medium text-foreground">Guests</p>
                <p className="text-xs text-muted-foreground">
                  Up to 16 across our larger homes
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="One fewer guest"
                  disabled={guests <= 1}
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                >
                  <Minus />
                </Button>
                <span
                  aria-live="polite"
                  className="w-7 text-center text-sm font-semibold tabular-nums"
                >
                  {guests}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="One more guest"
                  disabled={guests >= 16}
                  onClick={() => setGuests((g) => Math.min(16, g + 1))}
                >
                  <Plus />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Cell>

        <div className="flex items-stretch bg-card p-1.5 sm:col-span-2 lg:col-span-1">
          <Button
            type="submit"
            size="lg"
            className="w-full gap-2 lg:aspect-square lg:w-auto lg:px-5"
          >
            <Search />
            <span className="lg:hidden">Search stays</span>
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * One search field: a full-height button that opens its own popover. Native
 * `<select>` and `<input type=date>` were doing this job before, which worked
 * but announced "form" at the exact moment the page is trying to feel like an
 * invitation.
 */
function Cell({
  icon: Icon,
  label,
  value,
  muted = false,
  open,
  onOpenChange,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  muted?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex flex-col gap-1 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
              open && "bg-muted/50",
            )}
          >
            <span className="flex items-center gap-1.5 label-eyebrow">
              <Icon className="size-3" />
              {label}
            </span>
            <span
              className={cn(
                "truncate text-sm font-medium",
                muted ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {value}
            </span>
          </button>
        }
      />
      {children}
    </Popover>
  );
}
