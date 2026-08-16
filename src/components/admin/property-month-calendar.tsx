"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import type { PropertyDay } from "@/lib/queries/property-calendar";
import { SOURCE_LABELS, SOURCE_VAR, sourceBadgeClass } from "@/lib/admin/sources";
import { formatDateLong, formatINR, formatPercent } from "@/lib/format";
import type { BookingSource } from "@prisma/client";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PropertyMonthCalendar({
  property,
  month,
  unitRows,
  occupancyPercent,
  nightsBooked,
  capacity,
  navigation,
}: {
  property: { id: string; name: string; locationArea: string; basePrice: number };
  month: string;
  unitRows: { unitId: string; unitName: string; days: PropertyDay[] }[];
  occupancyPercent: number;
  nightsBooked: number;
  capacity: number;
  navigation: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<PropertyDay | null>(null);

  const index = navigation.findIndex((p) => p.id === property.id);
  const prevProperty = navigation[index - 1] ?? navigation[navigation.length - 1];
  const nextProperty = navigation[index + 1] ?? navigation[0];

  const monthDate = new Date(`${month}T00:00:00Z`);

  function goMonth(delta: number) {
    const next = new Date(
      Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + delta, 1),
    );
    router.push(
      `/admin/calendar?property=${property.id}&month=${next.toISOString().slice(0, 7)}`,
    );
  }

  function goProperty(id: string) {
    router.push(`/admin/calendar?property=${id}&month=${month.slice(0, 7)}`);
  }

  return (
    <div className="space-y-4">
      {/* Property stepper */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => goProperty(prevProperty.id)}
          aria-label={`Previous property: ${prevProperty.name}`}
        >
          <ChevronLeft />
        </Button>

        <div className="min-w-0 text-center">
          <h2 className="truncate font-heading text-lg text-foreground">
            {property.name}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {property.locationArea} · {index + 1} of {navigation.length}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => goProperty(nextProperty.id)}
          aria-label={`Next property: ${nextProperty.name}`}
        >
          <ChevronRight />
        </Button>
      </div>

      {/* Month header + stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" onClick={() => goMonth(-1)}>
            <ChevronLeft />
            <span className="sr-only">Previous month</span>
          </Button>
          <span className="min-w-40 text-center text-sm font-medium text-foreground">
            {monthDate.toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => goMonth(1)}>
            <ChevronRight />
            <span className="sr-only">Next month</span>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatPercent(occupancyPercent, 0)}
          </span>{" "}
          occupancy · {nightsBooked}/{capacity} nights sold
        </p>
      </div>

      {unitRows.map((row) => (
        <MonthGrid
          key={row.unitId}
          unitName={unitRows.length > 1 ? row.unitName : null}
          days={row.days}
          onSelect={setSelected}
        />
      ))}

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading text-xl text-foreground">
                  {formatDateLong(selected.date)}
                </SheetTitle>
                <SheetDescription>{property.name}</SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-6">
                <div className="rounded-lg border border-border p-4">
                  <p className="label-eyebrow">Rate that night</p>
                  <p className="mt-1 font-heading text-2xl text-foreground">
                    {formatINR(selected.price)}
                  </p>
                  {selected.appliedRules.length > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {selected.appliedRules.join(" · ")}
                    </p>
                  )}
                </div>

                {selected.reservation ? (
                  <div>
                    <p className="label-eyebrow">Booking</p>
                    <div className="mt-2 space-y-2.5">
                      <p className="text-sm font-medium text-foreground">
                        {selected.reservation.guestName}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {selected.reservation.code}
                      </p>
                      <Badge
                        className={sourceBadgeClass(
                          selected.reservation.source as BookingSource,
                        )}
                      >
                        {SOURCE_LABELS[selected.reservation.source as BookingSource]}
                      </Badge>
                      <Button
                        render={
                          <Link
                            href={`/admin/reservations?id=${selected.reservation.id}`}
                          />
                        }
                        size="sm"
                        className="w-full"
                      >
                        Open reservation
                      </Button>
                    </div>
                  </div>
                ) : selected.blockReason ? (
                  <div>
                    <p className="label-eyebrow">Blocked</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {selected.blockReason}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This night is available to book.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MonthGrid({
  unitName,
  days,
  onSelect,
}: {
  unitName: string | null;
  days: PropertyDay[];
  onSelect: (day: PropertyDay) => void;
}) {
  const todayISO = new Date().toISOString().slice(0, 10);

  // Pad so the first day lands under the right weekday (Monday-first).
  const firstDay = new Date(`${days[0].date}T00:00:00Z`);
  const leadingBlanks = (firstDay.getUTCDay() + 6) % 7;

  return (
    <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
      {unitName && (
        <h3 className="mb-3 text-sm font-medium text-foreground">{unitName}</h3>
      )}

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="pb-1 text-center text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase"
          >
            {day}
          </div>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {days.map((day) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          const booked = Boolean(day.reservation);
          const blocked = Boolean(day.blockReason) && !booked;
          const isToday = day.date === todayISO;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "relative flex min-h-16 flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-20 sm:p-2",
                booked
                  ? "border-transparent text-white"
                  : blocked
                    ? "border-dashed border-border bg-muted text-muted-foreground"
                    : "border-border bg-background hover:border-ring",
              )}
              style={
                booked
                  ? {
                      background:
                        SOURCE_VAR[day.reservation!.source as BookingSource],
                    }
                  : undefined
              }
            >
              <span
                className={cn(
                  "text-xs font-semibold",
                  isToday &&
                    !booked &&
                    "grid size-5 place-items-center rounded-full bg-brand-terracotta text-white",
                )}
              >
                {date.getUTCDate()}
              </span>

              {booked ? (
                <span className="line-clamp-2 text-[0.625rem] leading-tight opacity-95">
                  {day.reservation!.isArrival && "→ "}
                  {day.reservation!.guestName}
                </span>
              ) : blocked ? (
                <Ban className="size-3" />
              ) : (
                <span className="mt-auto text-[0.625rem] tabular-nums text-muted-foreground">
                  {formatINR(day.price)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
