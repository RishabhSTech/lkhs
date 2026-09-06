"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Portfolio-wide availability, as a thing you can plan against.
 *
 * The hero asks for dates and the rest of the page then argues about price,
 * quality and trust without ever coming back to the only question that decides
 * whether a trip happens: is anything actually free when I want to go. This
 * section answers it against live inventory - every cell is a real count of
 * homes with a free unit that night and the real cheapest rate among exactly
 * those homes, with the weekend and festive uplifts already applied.
 *
 * Selecting a range does not approximate. `rates[i] === null` marks home `i`
 * as taken for that night, so a home qualifies for a stay only when none of
 * its nights is null, and the total is the sum of the surviving numbers. The
 * count under the calendar is therefore the same count /stays will show.
 */

export type NightAvailability = {
  /** UTC calendar date, "YYYY-MM-DD". */
  date: string;
  /**
   * One entry per home, positionally aligned with `PortfolioAvailability.homes`.
   * A number is that home's rate for this night; `null` means it is already
   * taken. Encoding availability as the absence of a price rather than as a
   * second parallel array is what lets the client answer a *range* question
   * exactly - a home is offerable for a stay only where none of its nights is
   * null, and the stay's price is the sum of the numbers that survive.
   */
  rates: (number | null)[];
};

export type PortfolioAvailability = {
  /** Positional index for every `rates` array above. */
  homes: { slug: string; name: string }[];
  nights: NightAvailability[];
  /** Cheapest single night anywhere in the window, for the summary line. */
  floorPrice: number | null;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** One decimal at thousands: a cell has room for ₹6.5k, not for ₹6,500. */
function compactRate(value: number): string {
  if (value < 1000) return `₹${value}`;
  const k = value / 1000;
  return `₹${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
}

/**
 * Month and day names from a fixed table rather than `toLocaleDateString`.
 * This component is server-rendered and then hydrated, and Intl output can
 * differ between the Node build and the browser (ICU version, locale data,
 * timezone) - which surfaces as a hydration mismatch on a calendar, the one
 * place a mismatch is guaranteed to be visible.
 */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function dayLabel(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTH_SHORT[month - 1]}`;
}

type Month = { key: string; days: (string | null)[] };

/**
 * Every month in the window as a Monday-first grid, with `null` only for the
 * leading blanks before the 1st. Days the window does not cover - the current
 * month starts today, not on the 1st - are still emitted, because the renderer
 * has to draw them as ordinary past dates. Dropping them made the first month
 * appear two-thirds empty, which reads as a broken calendar rather than as a
 * month already underway. Nothing in the past is "sold out".
 */
function buildMonths(dates: string[]): Month[] {
  const months: Month[] = [];
  const keys = [...new Set(dates.map((d) => d.slice(0, 7)))];

  for (const key of keys) {
    const [year, month] = key.split("-").map(Number);
    const first = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    // getUTCDay() is Sunday-0; the grid is Monday-first.
    const lead = (first.getUTCDay() + 6) % 7;

    const days: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${key}-${String(d).padStart(2, "0")}`);
    }
    months.push({ key, days });
  }
  return months;
}

export function AvailabilityExplorer({
  data,
}: {
  data: PortfolioAvailability;
}) {
  const { homes, nights } = data;
  const [monthIndex, setMonthIndex] = useState(0);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  const byDate = useMemo(
    () => new Map(nights.map((n) => [n.date, n])),
    [nights],
  );
  const months = useMemo(
    () => buildMonths(nights.map((n) => n.date)),
    [nights],
  );

  const month = months[monthIndex];

  /**
   * The stay's occupied nights are check-in through the night *before*
   * check-out, which is why the end date is excluded here. Getting this
   * boundary wrong is how a calendar ends up charging for a night nobody
   * sleeps in.
   */
  const stay = useMemo(() => {
    if (!start) return null;

    // One tapped day quotes that single night; a completed range quotes
    // check-in through the night before check-out.
    const span = end
      ? nights.filter((n) => n.date >= start && n.date < end)
      : nights.filter((n) => n.date === start);
    if (span.length === 0) return null;

    const available = homes
      .map((_, i) => i)
      .filter((i) => span.every((n) => n.rates[i] !== null));

    let cheapest: number | null = null;
    for (const i of available) {
      const total = span.reduce((sum, n) => sum + (n.rates[i] ?? 0), 0);
      if (cheapest === null || total < cheapest) cheapest = total;
    }

    return {
      from: start,
      to: end,
      nights: span.length,
      count: available.length,
      total: cheapest,
    };
  }, [start, end, nights, homes]);

  function pick(iso: string) {
    // Second click completes a forward range; anything else restarts from the
    // day just tapped, which is what people expect from every date picker they
    // have already used.
    if (start && !end && iso > start) setEnd(iso);
    else {
      setStart(iso);
      setEnd(null);
    }
  }

  if (homes.length === 0 || months.length === 0) return null;

  const href = start
    ? `/stays?checkIn=${start}&checkOut=${end ?? start}`
    : "/stays";

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
            disabled={monthIndex === 0}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-[9.5rem] text-center font-display-sm text-lg text-foreground">
            {monthLabel(month.key)}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            onClick={() =>
              setMonthIndex((i) => Math.min(months.length - 1, i + 1))
            }
            disabled={monthIndex === months.length - 1}
            aria-label="Next month"
          >
            <ChevronRight />
          </Button>
        </div>

        {/* The meter is length-encoded on a single hue, so this legend explains
            a scale rather than a colour key - and every cell repeats the count
            in its accessible name, because availability must never be carried
            by the bar alone. */}
        <p className="flex items-center gap-2.5 text-[0.8125rem] text-muted-foreground">
          <span aria-hidden className="flex items-end gap-[3px]">
            {[0.3, 0.55, 0.8, 1].map((h) => (
              <span
                key={h}
                className="w-[3px] rounded-[1px] bg-brand-azure"
                style={{ height: `${h * 12}px` }}
              />
            ))}
          </span>
          homes free that night
        </p>
      </div>

      <div className="px-3 py-4 sm:px-5 sm:py-6">
        <div
          aria-hidden
          className="grid grid-cols-7 gap-1 px-1 pb-2 text-center text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
        >
          {WEEKDAYS.map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {month.days.map((iso, i) => {
            if (!iso) return <span key={`blank-${i}`} aria-hidden />;

            // Outside the window: a date earlier today or before it. Drawn
            // as a plain date so the month keeps its shape, but it carries no
            // meter, no price and no interaction.
            const night = byDate.get(iso);
            if (!night) {
              return (
                <span
                  key={iso}
                  aria-hidden
                  className="flex aspect-square items-center justify-center text-[0.8125rem] text-muted-foreground/35 tabular-nums"
                >
                  {Number(iso.slice(8))}
                </span>
              );
            }

            const rates = night.rates.filter((r): r is number => r !== null);
            const free = rates.length;
            const low = free > 0 ? Math.min(...rates) : null;
            const soldOut = free === 0;
            const density = free / homes.length;

            const selected = start === iso || end === iso;
            const inRange =
              start !== null && end !== null && iso > start && iso < end;
            const day = Number(iso.slice(8));

            return (
              <button
                key={iso}
                type="button"
                disabled={soldOut}
                onClick={() => pick(iso)}
                aria-pressed={selected}
                aria-label={
                  soldOut
                    ? `${dayLabel(iso)} - fully booked`
                    : `${dayLabel(iso)} - ${free} of ${homes.length} homes free, from ${low !== null ? formatINR(low) : "-"} a night`
                }
                className={cn(
                  "group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-center transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  soldOut && "cursor-not-allowed opacity-45",
                  !soldOut && !selected && !inRange && "hover:bg-secondary",
                  inRange && "bg-secondary",
                  selected && "bg-brand-blue text-white",
                )}
              >
                <span
                  className={cn(
                    "text-[0.8125rem] font-medium tabular-nums",
                    selected ? "text-white" : "text-foreground",
                  )}
                >
                  {day}
                </span>

                {/* Length on one hue: magnitude is a sequential job, and a
                    bar that grows is read faster and more accurately than a
                    colour that darkens. */}
                <span
                  aria-hidden
                  className={cn(
                    "h-[3px] w-6 overflow-hidden rounded-full",
                    selected ? "bg-white/25" : "bg-brand-mist/25",
                  )}
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      selected ? "bg-white" : "bg-brand-azure",
                    )}
                    style={{ width: `${Math.round(density * 100)}%` }}
                  />
                </span>

                <span
                  className={cn(
                    "text-[0.625rem] tabular-nums",
                    selected ? "text-white/80" : "text-muted-foreground",
                  )}
                >
                  {soldOut || low === null ? "-" : compactRate(low)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The answer, stated in words. Everything here is computed from the
          same arrays the grid is drawn from, so the count cannot drift away
          from what the cells above are showing. */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-brand-ivory px-5 py-4 sm:px-7 sm:py-5">
        {stay ? (
          <div>
            <p className="text-[0.9375rem] font-medium text-foreground">
              {stay.count === 0
                ? "Nothing free across those nights"
                : `${stay.count} ${stay.count === 1 ? "home" : "homes"} free for all ${stay.nights} ${stay.nights === 1 ? "night" : "nights"}`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {dayLabel(stay.from)}
              {stay.to ? ` → ${dayLabel(stay.to)}` : ""}
              {stay.total !== null &&
                ` · from ${formatINR(stay.total)} total, before fees and tax`}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[0.9375rem] font-medium text-foreground">
              Pick a night to start
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap a second night to price the whole stay.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {start && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStart(null);
                setEnd(null);
              }}
            >
              Clear
            </Button>
          )}
          {/* `disabled` on an anchor does nothing - it stays focusable and
              still navigates. When there is nothing to see, this has to be a
              real button element that is really disabled. */}
          {stay?.count === 0 ? (
            <Button size="sm" disabled>
              Nothing available
            </Button>
          ) : (
            <Button render={<Link href={href} />} size="sm">
              {stay && stay.count > 0
                ? `See ${stay.count === 1 ? "the home" : `all ${stay.count}`}`
                : "Browse all stays"}
              <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
