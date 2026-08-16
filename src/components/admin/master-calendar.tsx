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
import type { CalendarBlock, CalendarRow } from "@/lib/queries/calendar";
import { SOURCE_LABELS, SOURCE_VAR, sourceBadgeClass } from "@/lib/admin/sources";
import { formatDateLong, formatINR } from "@/lib/format";
import type { BookingSource } from "@prisma/client";
import { cn } from "@/lib/utils";

const CELL_WIDTH = 40;

export function MasterCalendar({
  rows,
  days,
  startDate,
}: {
  rows: CalendarRow[];
  days: string[];
  startDate: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<
    (CalendarBlock & { unitName: string; propertyName: string }) | null
  >(null);

  function shift(deltaDays: number) {
    const next = new Date(`${startDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + deltaDays);
    router.push(`/admin/calendar?from=${next.toISOString().slice(0, 10)}`);
  }

  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" onClick={() => shift(-14)}>
            <ChevronLeft />
            <span className="sr-only">Previous two weeks</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => shift(0)}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => shift(14)}>
            <ChevronRight />
            <span className="sr-only">Next two weeks</span>
          </Button>
          <span className="ml-2 text-sm font-medium text-foreground">
            {formatDateLong(days[0])} – {formatDateLong(days[days.length - 1])}
          </span>
        </div>

        <ul className="flex flex-wrap items-center gap-3 text-xs">
          {(Object.keys(SOURCE_LABELS) as BookingSource[]).map((source) => (
            <li key={source} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-sm"
                style={{ background: SOURCE_VAR[source] }}
              />
              <span className="text-muted-foreground">
                {SOURCE_LABELS[source]}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-sm border border-border bg-muted"
            />
            <span className="text-muted-foreground">Blocked</span>
          </li>
        </ul>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 200 + days.length * CELL_WIDTH }}>
          <div className="flex border-b border-border bg-muted/40">
            <div className="sticky left-0 z-10 w-50 shrink-0 border-r border-border bg-muted/40 px-3 py-2 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
              Property / unit
            </div>
            {days.map((day) => {
              const date = new Date(`${day}T00:00:00Z`);
              const isWeekend = [0, 5, 6].includes(date.getUTCDay());
              return (
                <div
                  key={day}
                  style={{ width: CELL_WIDTH }}
                  className={cn(
                    "shrink-0 border-r border-border/60 py-2 text-center",
                    isWeekend && "bg-muted/50",
                    day === todayISO && "bg-brand-terracotta/10",
                  )}
                >
                  <span className="block text-[0.625rem] text-muted-foreground">
                    {date.toLocaleDateString("en-IN", {
                      weekday: "narrow",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      day === todayISO
                        ? "text-brand-terracotta"
                        : "text-foreground",
                    )}
                  >
                    {date.getUTCDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {rows.map((row) => (
            <div
              key={row.unitId}
              className="relative flex border-b border-border last:border-0"
            >
              <div className="sticky left-0 z-10 w-50 shrink-0 border-r border-border bg-card px-3 py-3">
                <Link
                  href={`/admin/properties/${row.propertyId}`}
                  className="block truncate text-sm font-medium text-foreground hover:text-brand-terracotta"
                >
                  {row.propertyName}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {row.unitName}
                </p>
              </div>

              <div className="relative flex" style={{ height: 56 }}>
                {days.map((day) => {
                  const date = new Date(`${day}T00:00:00Z`);
                  const isWeekend = [0, 5, 6].includes(date.getUTCDay());
                  return (
                    <div
                      key={day}
                      style={{ width: CELL_WIDTH }}
                      className={cn(
                        "shrink-0 border-r border-border/50",
                        isWeekend && "bg-muted/30",
                        day === todayISO && "bg-brand-terracotta/6",
                      )}
                    />
                  );
                })}

                {row.blocks.map((block) => {
                  const offset = dayIndex.get(block.startDate);
                  if (offset === undefined) return null;
                  const width =
                    Math.min(block.nights, days.length - offset) * CELL_WIDTH;
                  const isBooking = Boolean(block.reservationId);

                  return (
                    <button
                      key={`${block.startDate}-${block.reservationId ?? block.blockReason}`}
                      type="button"
                      onClick={() =>
                        setSelected({
                          ...block,
                          unitName: row.unitName,
                          propertyName: row.propertyName,
                        })
                      }
                      style={{
                        left: offset * CELL_WIDTH + 2,
                        width: width - 4,
                        background: isBooking
                          ? SOURCE_VAR[block.source as BookingSource]
                          : undefined,
                      }}
                      className={cn(
                        "absolute top-2 bottom-2 flex items-center gap-1 overflow-hidden rounded-md px-2 text-left text-xs font-medium transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        isBooking
                          ? "text-white"
                          : "border border-dashed border-border bg-muted text-muted-foreground",
                      )}
                      title={
                        isBooking
                          ? `${block.guestName} · ${block.code} · ${SOURCE_LABELS[block.source as BookingSource]}`
                          : (block.blockReason ?? "Blocked")
                      }
                    >
                      {!isBooking && <Ban className="size-3 shrink-0" />}
                      <span className="truncate">
                        {isBooking ? block.guestName : (block.blockReason ?? "Blocked")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading text-xl text-brand-green">
                  {selected.guestName ?? "Blocked dates"}
                </SheetTitle>
                <SheetDescription>
                  {selected.propertyName} · {selected.unitName}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-6">
                {selected.reservationId ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        className={sourceBadgeClass(
                          selected.source as BookingSource,
                        )}
                      >
                        {SOURCE_LABELS[selected.source as BookingSource]}
                      </Badge>
                      {selected.status && (
                        <Badge className="border-border bg-muted text-muted-foreground">
                          {selected.status.toLowerCase()}
                        </Badge>
                      )}
                    </div>

                    <dl className="space-y-2.5 text-sm">
                      <Row label="Booking ID" value={selected.code ?? "—"} mono />
                      <Row
                        label="Check-in"
                        value={formatDateLong(selected.startDate)}
                      />
                      <Row label="Nights" value={String(selected.nights)} />
                      {selected.total !== null && (
                        <Row label="Total" value={formatINR(selected.total)} />
                      )}
                    </dl>

                    <div className="flex flex-col gap-2">
                      <Button
                        render={
                          <Link
                            href={`/admin/reservations?id=${selected.reservationId}`}
                          />
                        }
                      >
                        Open full reservation
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      These dates are held and unavailable for booking.
                    </p>
                    <dl className="space-y-2.5 text-sm">
                      <Row
                        label="Reason"
                        value={selected.blockReason ?? "Blocked"}
                      />
                      <Row label="From" value={formatDateLong(selected.startDate)} />
                      <Row label="Nights" value={String(selected.nights)} />
                    </dl>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-medium text-foreground",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
