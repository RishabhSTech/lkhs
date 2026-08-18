"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BookingSource, ReservationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/site/empty-state";
import {
  SOURCE_LABELS, STATUS_LABELS, sourceBadgeClass, statusBadgeClass,
} from "@/lib/admin/sources";
import { formatDateLong, formatDateRange, formatINR } from "@/lib/format";

type Row = {
  id: string;
  code: string;
  propertyName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  source: BookingSource;
  status: ReservationStatus;
  total: number;
  paymentStatus: string;
};

type Detail = {
  id: string;
  code: string;
  propertyName: string;
  propertyAddress: string;
  guest: { name: string; email: string | null; phone: string | null; notes: string | null };
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  source: BookingSource;
  status: ReservationStatus;
  subtotal: number;
  cleaningFee: number;
  taxes: number;
  discount: number;
  total: number;
  internalNotes: string | null;
  payments: { id: string; method: string; amount: number; status: string; provider: string; createdAt: string }[];
  messages: { id: string; channel: string; subject: string | null; body: string; status: string; createdAt: string }[];
  auditLogs: { id: string; userName: string; summary: string; createdAt: string }[];
};

export function ReservationsTable({
  reservations,
  properties,
  filters,
  selected,
}: {
  reservations: Row[];
  properties: { id: string; name: string }[];
  filters: { propertyId?: string; status?: string; source?: string };
  selected: Detail | null | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closeDrawer() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const selectClass =
    "h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.propertyId ?? ""}
          onChange={(e) => setParam("property", e.target.value)}
          className={selectClass}
          aria-label="Filter by property"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.source ?? ""}
          onChange={(e) => setParam("source", e.target.value)}
          className={selectClass}
          aria-label="Filter by channel"
        >
          <option value="">All channels</option>
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {reservations.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No reservations match those filters"
          description="Try clearing a filter to widen the search."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {["Booking", "Property", "Guest", "Dates", "Channel", "Status", "Amount"].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-2.5 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase last:text-right"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reservations.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setParam("id", r.id)}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {r.code}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{r.propertyName}</td>
                    <td className="px-4 py-2.5 text-foreground">{r.guestName}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {formatDateRange(r.checkIn, r.checkOut)}
                      <span className="ml-1.5 text-xs">({r.nights}n)</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={sourceBadgeClass(r.source)}>
                        {SOURCE_LABELS[r.source]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeClass(r.status)}>
                        {STATUS_LABELS[r.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground">
                      {formatINR(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="mt-4 space-y-2.5 lg:hidden">
            {reservations.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setParam("id", r.id)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {r.guestName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.propertyName}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {formatINR(r.total)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateRange(r.checkIn, r.checkOut)} · {r.nights}n
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge className={sourceBadgeClass(r.source)}>
                      {SOURCE_LABELS[r.source]}
                    </Badge>
                    <Badge className={statusBadgeClass(r.status)}>
                      {STATUS_LABELS[r.status]}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && closeDrawer()}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading text-xl text-brand-blue">
                  {selected.guest.name}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selected.code}
                </SheetDescription>
              </SheetHeader>

              <div className="overflow-y-auto px-4 pb-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className={sourceBadgeClass(selected.source)}>
                    {SOURCE_LABELS[selected.source]}
                  </Badge>
                  <Badge className={statusBadgeClass(selected.status)}>
                    {STATUS_LABELS[selected.status]}
                  </Badge>
                </div>

                <Tabs defaultValue="details" className="mt-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-4 space-y-4">
                    <Section title="Stay">
                      <Row label="Property" value={selected.propertyName} />
                      <Row label="Address" value={selected.propertyAddress} />
                      <Row
                        label="Dates"
                        value={formatDateRange(selected.checkIn, selected.checkOut)}
                      />
                      <Row label="Nights" value={String(selected.nights)} />
                      <Row
                        label="Guests"
                        value={`${selected.adults} adults${
                          selected.children ? `, ${selected.children} children` : ""
                        }`}
                      />
                    </Section>

                    <Section title="Guest">
                      <Row label="Name" value={selected.guest.name} />
                      {selected.guest.email && (
                        <Row label="Email" value={selected.guest.email} />
                      )}
                      {selected.guest.phone && (
                        <Row label="Phone" value={selected.guest.phone} />
                      )}
                    </Section>

                    <Section title="Internal notes">
                      <p className="text-sm text-muted-foreground">
                        {selected.internalNotes ?? "No notes on this booking."}
                      </p>
                    </Section>
                  </TabsContent>

                  <TabsContent value="payment" className="mt-4 space-y-4">
                    <Section title="Price breakdown">
                      <Row label="Subtotal" value={formatINR(selected.subtotal)} />
                      {selected.discount > 0 && (
                        <Row
                          label="Discount"
                          value={`− ${formatINR(selected.discount)}`}
                        />
                      )}
                      <Row
                        label="Cleaning fee"
                        value={formatINR(selected.cleaningFee)}
                      />
                      <Row label="Taxes" value={formatINR(selected.taxes)} />
                      <Row label="Total" value={formatINR(selected.total)} strong />
                    </Section>

                    <Section title="Payments">
                      {selected.payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No payment recorded yet.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {selected.payments.map((p) => (
                            <li
                              key={p.id}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="text-muted-foreground">
                                {p.method} · {p.provider.toLowerCase()}
                              </span>
                              <span className="flex items-center gap-2">
                                <Badge
                                  className={
                                    p.status === "SUCCEEDED"
                                      ? "border-chart-1/25 bg-chart-1/10 text-chart-1"
                                      : "border-chart-4/25 bg-chart-4/10 text-chart-4"
                                  }
                                >
                                  {p.status.toLowerCase()}
                                </Badge>
                                <span className="font-medium tabular-nums text-foreground">
                                  {formatINR(p.amount)}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Section>
                  </TabsContent>

                  <TabsContent value="messages" className="mt-4">
                    {selected.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No messages sent for this booking yet.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {selected.messages.map((m) => (
                          <li
                            key={m.id}
                            className="rounded-lg border border-border p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge className="border-border bg-muted text-muted-foreground">
                                {m.channel.toLowerCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDateLong(m.createdAt)}
                              </span>
                            </div>
                            {m.subject && (
                              <p className="mt-2 text-sm font-medium text-foreground">
                                {m.subject}
                              </p>
                            )}
                            <p className="mt-1 line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">
                              {m.body}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="mt-4">
                    {selected.auditLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No changes recorded against this booking.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {selected.auditLogs.map((a) => (
                          <li key={a.id} className="text-sm">
                            <p className="text-foreground">{a.summary}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {a.userName} · {formatDateLong(a.createdAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={
          strong
            ? "text-right font-semibold text-foreground"
            : "text-right text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
