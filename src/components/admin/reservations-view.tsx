"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BookingSource, ReservationStatus } from "@prisma/client";
import {
  Ban, CalendarCheck, CheckCircle2, Loader2, Mail, MessageCircle, Pencil, Phone, Plus, RotateCcw,
  Search, Trash2, UserX, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/site/empty-state";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { NativeSelect } from "@/components/admin/form-fields";
import { useQuickAdd } from "@/components/admin/quick-add";
import type { BookingRecord } from "@/components/admin/booking-sheet";
import {
  SOURCE_LABELS, STATUS_LABELS, sourceBadgeClass, statusBadgeClass,
} from "@/lib/admin/sources";
import { formatDateLong, formatDateRange, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { safeHttpUrl } from "@/lib/safe-url";
import { toast } from "sonner";

const ID_TYPE_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar",
  PASSPORT: "Passport",
  DRIVING_LICENCE: "Driving Licence",
  VOTER_ID: "Voter ID",
  OTHER: "Other ID",
};

export type ReservationRow = {
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
};

export type ReservationDetail = {
  id: string;
  propertyId: string;
  unitId: string;
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
  platformFee: number;
  hostTax: number;
  otherCharges: number;
  netPayout: number;
  total: number;
  internalNotes: string | null;
  payments: { id: string; method: string; amount: number; status: string; provider: string; createdAt: string }[];
  messages: { id: string; channel: string; subject: string | null; body: string; status: string; createdAt: string }[];
  auditLogs: { id: string; userName: string; summary: string; createdAt: string }[];
  checkinGuests: {
    id: string;
    name: string;
    isPrimary: boolean;
    idType: string | null;
    idNumber: string | null;
    idDocumentUrl: string | null;
    checkedInAt: string | null;
  }[];
};

export type ReservationViewKey = "all" | "arrivals" | "inhouse" | "departures" | "upcoming" | "pending";

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

export function ReservationsView({
  reservations,
  properties,
  filters,
  counts,
  hasMore,
  matchingTotal,
  selected,
  today,
  canWrite,
}: {
  reservations: ReservationRow[];
  properties: { id: string; name: string }[];
  filters: { q?: string; view: ReservationViewKey; propertyId?: string; status?: string; source?: string; limit: number };
  counts: Record<"arrivals" | "inhouse" | "departures" | "pending", number>;
  hasMore: boolean;
  /** All bookings matching the filters, cancelled excluded. */
  matchingTotal: { count: number; amount: number };
  selected: ReservationDetail | null;
  today: string;
  canWrite: boolean;
}) {
  const router = useRouter();

  // Totals for the rows on screen; cancelled bookings bring in no money.
  const counted = reservations.filter((r) => r.status !== "CANCELLED");
  const shownTotal = counted.reduce((sum, r) => sum + r.total, 0);
  const cancelledShown = reservations.length - counted.length;
  const totalLabel = `Total · ${counted.length} ${counted.length === 1 ? "booking" : "bookings"}${
    cancelledShown ? ` (excl. ${cancelledShown} cancelled)` : ""
  }`;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openBooking } = useQuickAdd();
  const [query, setQuery] = useState(filters.q ?? "");

  function pushParams(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }
  function setParam(key: string, value: string) {
    pushParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
      if (key !== "id" && key !== "limit") p.delete("limit");
    });
  }

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (query.trim() === current) return;
    const t = window.setTimeout(() => setParam("q", query.trim()), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const chips: { key: ReservationViewKey; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "arrivals", label: "Arriving today", count: counts.arrivals },
    { key: "inhouse", label: "In-house", count: counts.inhouse },
    { key: "departures", label: "Leaving today", count: counts.departures },
    { key: "upcoming", label: "Upcoming" },
    { key: "pending", label: "Requests", count: counts.pending },
  ];

  return (
    <>
      <div className="relative lg:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Guest name, phone, email or booking code"
          className="h-11 w-full rounded-full border border-border bg-card pr-10 pl-10 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-10 lg:text-sm"
          enterKeyHint="search"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {chips.map((c) => {
          const active = filters.view === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setParam("view", c.key === "all" ? "" : c.key)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "border-brand-blue bg-brand-blue text-white" : "border-border bg-card text-foreground",
              )}
            >
              {c.label}
              {c.count !== undefined && c.count > 0 && (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-xs tabular-nums",
                    active ? "bg-white/20" : "bg-muted text-muted-foreground",
                  )}
                >
                  {c.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <div className="col-span-2 sm:w-56">
          <NativeSelect
            value={filters.propertyId ?? ""}
            onChange={(e) => setParam("property", e.target.value)}
            aria-label="Filter by property"
            className="h-10 lg:h-9"
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="sm:w-44">
          <NativeSelect
            value={filters.status ?? ""}
            onChange={(e) => setParam("status", e.target.value)}
            aria-label="Filter by status"
            className="h-10 lg:h-9"
          >
            <option value="">Any status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="sm:w-44">
          <NativeSelect
            value={filters.source ?? ""}
            onChange={(e) => setParam("source", e.target.value)}
            aria-label="Filter by channel"
            className="h-10 lg:h-9"
          >
            <option value="">Any channel</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={filters.q ? `Nothing matches "${filters.q}"` : "No bookings here"}
            description={filters.q ? "Try part of the name, or the last digits of their phone." : "Try another view or clear a filter."}
          />
          {canWrite && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => openBooking({})}>
                <Plus />
                Add booking
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {["Booking", "Property", "Guest", "Dates", "Channel", "Status", "Amount"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-2.5 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reservations.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setParam("id", r.id)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/40",
                      selected?.id === r.id && "bg-muted/50",
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.code}</td>
                    <td className="px-4 py-2.5 text-foreground">{r.propertyName}</td>
                    <td className="px-4 py-2.5 text-foreground">{r.guestName}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {formatDateRange(r.checkIn, r.checkOut)}
                      <span className="ml-1.5 text-xs">({r.nights}n)</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={sourceBadgeClass(r.source)}>{SOURCE_LABELS[r.source]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeClass(r.status)}>{STATUS_LABELS[r.status]}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground">{formatINR(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40">
                  <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-foreground">
                    {totalLabel}
                    {hasMore && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        All {matchingTotal.count} matching: {formatINR(matchingTotal.amount)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatINR(shownTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Phone list */}
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:hidden">
            {reservations.map((r) => {
              const arriving = r.checkIn.slice(0, 10) === today;
              const leaving = r.checkOut.slice(0, 10) === today;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setParam("id", r.id)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-muted/60"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ background: `var(--chart-${["DIRECT", "AIRBNB", "BOOKING_COM", "AGODA", "OTHER"].indexOf(r.source) + 1})` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[0.9375rem] font-semibold text-foreground">{r.guestName}</span>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">{formatINR(r.total)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {r.propertyName} · {SOURCE_LABELS[r.source]}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-foreground">
                          {formatDateRange(r.checkIn, r.checkOut)} · {r.nights}n
                        </span>
                        {r.status !== "CONFIRMED" && (
                          <Badge className={statusBadgeClass(r.status)}>{STATUS_LABELS[r.status]}</Badge>
                        )}
                        {arriving && r.status !== "CANCELLED" && (
                          <Badge className="border-chart-1/25 bg-chart-1/10 text-chart-1">Arrives today</Badge>
                        )}
                        {leaving && r.status !== "CANCELLED" && (
                          <Badge className="border-chart-4/25 bg-chart-4/10 text-chart-4">Leaves today</Badge>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Phone total */}
          <div className="mt-3 rounded-xl border border-border bg-muted/40 px-4 py-3 lg:hidden">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">{totalLabel}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatINR(shownTotal)}</span>
            </div>
            {hasMore && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                All {matchingTotal.count} matching: {formatINR(matchingTotal.amount)}
              </p>
            )}
          </div>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="lg" className="w-full sm:w-auto lg:h-10" onClick={() => setParam("limit", String(filters.limit + 40))}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}

      <ReservationDetailSheet
        selected={selected}
        today={today}
        canWrite={canWrite}
        onClose={() => setParam("id", "")}
        onEdit={(booking) => {
          setParam("id", "");
          window.setTimeout(
            () =>
              openBooking({
                booking,
                onSaved: (id) => pushParams((p) => p.set("id", id)),
              }),
            220,
          );
        }}
      />
    </>
  );
}

function ReservationDetailSheet({
  selected,
  today,
  canWrite,
  onClose,
  onEdit,
}: {
  selected: ReservationDetail | null;
  today: string;
  canWrite: boolean;
  onClose: () => void;
  onEdit: (booking: BookingRecord) => void;
}) {
  const router = useRouter();
  // Keep the last booking on screen while the sheet animates closed.
  const [shown, setShown] = useState(selected);
  if (selected && selected !== shown) setShown(selected);
  const r = selected ?? shown;

  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(r?.internalNotes ?? "");
  const [notesFor, setNotesFor] = useState(r?.id);
  if (r && r.id !== notesFor) {
    setNotesFor(r.id);
    setNotes(r.internalNotes ?? "");
    setError(null);
  }

  async function call(label: string, url: string, init: RequestInit, confirmText?: string, after?: () => void) {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(label);
    setError(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "That didn't work.");
      after?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setPending(null);
    }
  }

  const json = (body: unknown): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r) return null;

  const started = r.checkIn.slice(0, 10) <= today;
  const isOpen = r.status === "PENDING" || r.status === "CONFIRMED";
  const notesDirty = (notes.trim() || null) !== (r.internalNotes?.trim() || null);

  type Action = { key: string; label: string; icon: typeof Pencil; tone?: "primary" | "danger"; run: () => void };
  const actions: Action[] = !canWrite
    ? []
    : ([
        r.status === "PENDING" && {
          key: "confirm",
          label: "Confirm",
          icon: CalendarCheck,
          tone: "primary",
          run: () =>
            call("confirm", `/api/admin/reservations/${r.id}/confirm`, { method: "POST" }, undefined, () =>
              toast.success("Booking confirmed", { description: "Revenue posted and guest emailed." }),
            ),
        },
        r.status !== "CANCELLED" && {
          key: "edit",
          label: "Edit",
          icon: Pencil,
          run: () =>
            onEdit({
              id: r.id,
              propertyId: r.propertyId,
              unitId: r.unitId,
              checkIn: r.checkIn.slice(0, 10),
              checkOut: r.checkOut.slice(0, 10),
              adults: r.adults,
              children: r.children,
              name: r.guest.name,
              email: r.guest.email,
              phone: r.guest.phone,
              source: r.source,
              total: r.total,
              platformFee: r.platformFee,
              hostTax: r.hostTax,
              otherCharges: r.otherCharges,
            }),
        },
        r.status === "CONFIRMED" && started && {
          key: "complete",
          label: "Completed",
          icon: CheckCircle2,
          run: () => call("complete", `/api/admin/reservations/${r.id}/manage`, json({ action: "status", status: "COMPLETED" })),
        },
        r.status === "CONFIRMED" && started && {
          key: "noshow",
          label: "No-show",
          icon: UserX,
          run: () =>
            call(
              "noshow",
              `/api/admin/reservations/${r.id}/manage`,
              json({ action: "status", status: "NO_SHOW" }),
              "Mark this guest as a no-show?",
            ),
        },
        (r.status === "COMPLETED" || r.status === "NO_SHOW") && {
          key: "reopen",
          label: "Reopen",
          icon: RotateCcw,
          run: () => call("reopen", `/api/admin/reservations/${r.id}/manage`, json({ action: "status", status: "CONFIRMED" })),
        },
        isOpen && {
          key: "cancel",
          label: "Cancel",
          icon: Ban,
          tone: "danger",
          run: () =>
            call(
              "cancel",
              `/api/admin/reservations/${r.id}/cancel`,
              { method: "POST" },
              "Cancel this booking? The guest is emailed and the dates are freed up.",
              () => toast.success("Booking cancelled"),
            ),
        },
        r.status === "CANCELLED" && {
          key: "delete",
          label: "Delete",
          icon: Trash2,
          tone: "danger",
          run: () =>
            call(
              "delete",
              `/api/admin/reservations/${r.id}`,
              { method: "DELETE" },
              "Permanently delete this cancelled booking? This can't be undone.",
              () => {
                toast.success("Booking deleted");
                onClose();
              },
            ),
        },
      ].filter(Boolean) as Action[]);

  return (
    <ResponsiveSheet
      open={Boolean(selected)}
      onOpenChange={(open) => !open && onClose()}
      desktop="side"
      title={r.guest.name}
      description={
        <>
          <span className="font-mono">{r.code}</span> · {r.propertyName}
        </>
      }
      headerExtra={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={sourceBadgeClass(r.source)}>{SOURCE_LABELS[r.source]}</Badge>
          <Badge className={statusBadgeClass(r.status)}>{STATUS_LABELS[r.status]}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDateRange(r.checkIn, r.checkOut)} · {r.nights}n
          </span>
        </div>
      }
    >
      {(r.guest.phone || r.guest.email) && (
        <div className="grid grid-cols-3 gap-2">
          {r.guest.phone ? (
            <ContactButton href={`tel:${r.guest.phone}`} icon={Phone} label="Call" />
          ) : (
            <span />
          )}
          {r.guest.phone ? (
            <ContactButton href={waLink(r.guest.phone)} icon={MessageCircle} label="WhatsApp" external />
          ) : (
            <span />
          )}
          {r.guest.email ? <ContactButton href={`mailto:${r.guest.email}`} icon={Mail} label="Email" /> : <span />}
        </div>
      )}

      {actions.length > 0 && (
        <div className={cn("grid gap-2", (r.guest.phone || r.guest.email) && "mt-3", actions.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={a.run}
              disabled={pending !== null}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50",
                a.tone === "primary" && "border-brand-blue bg-brand-blue text-white",
                a.tone === "danger" && "border-destructive/25 bg-destructive/8 text-destructive",
                !a.tone && "border-border bg-card text-foreground active:bg-muted",
              )}
            >
              {pending === a.key ? <Loader2 className="size-4 animate-spin" /> : <a.icon className="size-4" />}
              {a.label}
            </button>
          ))}
        </div>
      )}
      {r.status === "PENDING" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Awaiting payment. Confirm once you&apos;ve reached the guest and arranged it - that posts revenue and emails
          their confirmation.
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-destructive/8 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Tabs defaultValue="details" className="mt-4">
        <TabsList className="w-full justify-start overflow-x-auto [scrollbar-width:none]">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="payment">Money</TabsTrigger>
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-5">
          <Section title="Internal notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              readOnly={!canWrite}
              rows={3}
              placeholder="Only the team sees this - early check-in, advance paid, special requests…"
              className="text-base lg:text-sm"
            />
            {canWrite && notesDirty && (
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setNotes(r.internalNotes ?? "")}>
                  Discard
                </Button>
                <Button
                  size="sm"
                  disabled={pending !== null}
                  onClick={() =>
                    call("notes", `/api/admin/reservations/${r.id}/manage`, json({ action: "notes", internalNotes: notes }), undefined, () =>
                      toast.success("Notes saved"),
                    )
                  }
                >
                  {pending === "notes" && <Loader2 className="animate-spin" />}
                  Save notes
                </Button>
              </div>
            )}
          </Section>

          <Section title="Stay">
            <Row label="Property" value={r.propertyName} />
            <Row label="Address" value={r.propertyAddress} />
            <Row label="Dates" value={formatDateRange(r.checkIn, r.checkOut)} />
            <Row label="Nights" value={String(r.nights)} />
            <Row label="Guests" value={`${r.adults} adults${r.children ? `, ${r.children} children` : ""}`} />
          </Section>

          <Section title="Guest">
            <Row label="Name" value={r.guest.name} />
            {r.guest.email && <Row label="Email" value={r.guest.email} />}
            {r.guest.phone && <Row label="Phone" value={r.guest.phone} />}
            {r.guest.notes && <Row label="Guest notes" value={r.guest.notes} />}
          </Section>

          <Link
            href={`/admin/operations`}
            className="block text-center text-xs font-medium text-brand-azure"
          >
            Turnover cleaning is scheduled automatically for checkout
          </Link>
        </TabsContent>

        <TabsContent value="payment" className="mt-4 space-y-5">
          <Section title="Price breakdown">
            <Row label="Subtotal" value={formatINR(r.subtotal)} />
            {r.discount > 0 && <Row label="Discount" value={`− ${formatINR(r.discount)}`} />}
            <Row label="Cleaning fee" value={formatINR(r.cleaningFee)} />
            <Row label="Taxes" value={formatINR(r.taxes)} />
            <Row label="Total" value={formatINR(r.total)} strong />
            <Row label="Platform fee" value={`− ${formatINR(r.platformFee)}`} />
            <Row label="Host tax" value={`− ${formatINR(r.hostTax)}`} />
            <Row label="Other charges" value={`− ${formatINR(r.otherCharges)}`} />
            <Row label="Final payout" value={formatINR(r.netPayout)} strong />
          </Section>

          <Section title="Payments">
            {r.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {r.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
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
                      <span className="font-medium tabular-nums text-foreground">{formatINR(p.amount)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="checkin" className="mt-4">
          <Section title={`Digital check-in · ${r.checkinGuests.filter((g) => g.checkedInAt).length} of ${r.adults} adults`}>
            {Array.from({ length: r.adults }, (_, i) => r.checkinGuests[i]).map((g, i) =>
              g ? (
                <div key={g.id} className="flex flex-col gap-1 border-b border-border py-2 text-sm last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">
                      {g.name}
                      {g.isPrimary && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(primary)</span>}
                    </span>
                    <Badge
                      className={
                        g.checkedInAt
                          ? "border-chart-1/25 bg-chart-1/10 text-chart-1"
                          : "border-chart-4/25 bg-chart-4/10 text-chart-4"
                      }
                    >
                      {g.checkedInAt ? "checked in" : "pending"}
                    </Badge>
                  </div>
                  {g.idType && g.idNumber && (
                    <p className="text-xs text-muted-foreground">
                      {ID_TYPE_LABELS[g.idType] ?? g.idType} · {g.idNumber}
                      {safeHttpUrl(g.idDocumentUrl) && (
                        <>
                          {" · "}
                          <a href={safeHttpUrl(g.idDocumentUrl)!} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                            view ID
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <div key={`pending-${i}`} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
                  <span className="text-muted-foreground">Guest {i + 1}</span>
                  <Badge className="border-border bg-muted text-muted-foreground">not submitted</Badge>
                </div>
              ),
            )}
          </Section>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          {r.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages sent for this booking yet.</p>
          ) : (
            <ul className="space-y-3">
              {r.messages.map((m) => (
                <li key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="border-border bg-muted text-muted-foreground">{m.channel.toLowerCase()}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateLong(m.createdAt)}</span>
                  </div>
                  {m.subject && <p className="mt-2 text-sm font-medium text-foreground">{m.subject}</p>}
                  <p className="mt-1 line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {r.auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded against this booking.</p>
          ) : (
            <ul className="space-y-3">
              {r.auditLogs.map((a) => (
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
    </ResponsiveSheet>
  );
}

function ContactButton({
  href,
  icon: Icon,
  label,
  external,
}: {
  href: string;
  icon: typeof Phone;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-muted text-xs font-semibold text-foreground active:bg-muted/70"
    >
      <Icon className="size-4" />
      {label}
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{title}</h3>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={strong ? "text-right font-semibold text-foreground" : "text-right text-foreground"}>{value}</span>
    </div>
  );
}
