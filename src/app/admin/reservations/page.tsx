import type { BookingSource, Prisma, ReservationStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { QuickAddButton } from "@/components/admin/quick-add";
import { ReservationsView, type ReservationViewKey } from "@/components/admin/reservations-view";
import { db } from "@/lib/db";
import { requireAdminPage, inScope, scopeFilter, propertyScopeFilter } from "@/lib/auth/guards";
import { BOOKING_WRITE_ROLES, OFFICE_ROLES } from "@/lib/auth/roles";
import { addDays, toISODate, todayUTC } from "@/lib/dates";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/admin/sources";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;
const VIEWS = new Set<ReservationViewKey>(["all", "arrivals", "inhouse", "departures", "upcoming", "pending"]);

export default async function ReservationsPage({
  searchParams,
}: PageProps<"/admin/reservations">) {
  const { user, scope } = await requireAdminPage(OFFICE_ROLES);
  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const propertyId = str("property");
  const status = str("status") && str("status")! in STATUS_LABELS ? (str("status") as ReservationStatus) : undefined;
  const source = str("source") && str("source")! in SOURCE_LABELS ? (str("source") as BookingSource) : undefined;
  const q = str("q")?.trim().slice(0, 80) || undefined;
  const view: ReservationViewKey = VIEWS.has(str("view") as ReservationViewKey) ? (str("view") as ReservationViewKey) : "all";
  const limit = Math.min(400, Math.max(PAGE_SIZE, Number(str("limit")) || PAGE_SIZE));
  const selectedId = str("id");

  const today = todayUTC();
  const tomorrow = addDays(today, 1);
  const live: ReservationStatus[] = ["PENDING", "CONFIRMED"];

  const own = scopeFilter(scope);
  const viewWhere: Record<ReservationViewKey, Prisma.ReservationWhereInput> = {
    all: { ...own },
    arrivals: { ...own, checkIn: today, status: { in: live } },
    inhouse: { ...own, checkIn: { lte: today }, checkOut: { gt: today }, status: "CONFIRMED" },
    departures: { ...own, checkOut: today, status: { in: ["CONFIRMED", "COMPLETED"] } },
    upcoming: { ...own, checkIn: { gte: tomorrow }, status: { in: live } },
    pending: { ...own, status: "PENDING" },
  };
  const ascending = view === "upcoming" || view === "pending";

  const digits = q?.replace(/\D/g, "") ?? "";
  const where: Prisma.ReservationWhereInput = {
    AND: [
      viewWhere[view],
      propertyId ? { propertyId } : {},
      status ? { status } : {},
      source ? { source } : {},
      q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { externalReservationId: { contains: q, mode: "insensitive" } },
              { guest: { name: { contains: q, mode: "insensitive" } } },
              { guest: { email: { contains: q, mode: "insensitive" } } },
              ...(digits.length >= 4 ? [{ guest: { phone: { contains: digits } } }] : []),
            ],
          }
        : {},
    ],
  };

  const [rows, properties, arrivals, inhouse, departures, pending, matching] = await Promise.all([
    db.reservation.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        guest: { select: { name: true } },
      },
      orderBy: { checkIn: ascending ? "asc" : "desc" },
      take: limit + 1,
    }),
    db.property.findMany({ where: propertyScopeFilter(scope), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.reservation.count({ where: viewWhere.arrivals }),
    db.reservation.count({ where: viewWhere.inhouse }),
    db.reservation.count({ where: viewWhere.departures }),
    db.reservation.count({ where: viewWhere.pending }),
    // Every booking matching the filters (not just the loaded page); cancelled
    // ones never bring in money, so they stay out of the total.
    db.reservation.aggregate({
      where: { AND: [where, { status: { not: "CANCELLED" } }] },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);
  const hasMore = rows.length > limit;
  const reservations = rows.slice(0, limit);

  const selectedRow = selectedId
    ? await db.reservation.findUnique({
        where: { id: selectedId },
        include: {
          property: { select: { id: true, name: true, addressLine: true } },
          unit: { select: { id: true } },
          guest: true,
          payments: true,
          messages: { orderBy: { createdAt: "desc" } },
          auditLogs: { orderBy: { createdAt: "desc" } },
          reservationGuests: { orderBy: { isPrimary: "desc" } },
        },
      })
    : null;
  const selected = selectedRow && inScope(scope, selectedRow.propertyId) ? selectedRow : null;

  const canWrite = BOOKING_WRITE_ROLES.includes(user.role);

  return (
    <AdminPage>
      <PageHeader
        title="Bookings"
        description={`${reservations.length}${hasMore ? "+" : ""} shown${q ? ` for "${q}"` : ""}`}
        actions={
          <QuickAddButton kind="booking">
            <Plus />
            Add booking
          </QuickAddButton>
        }
      />
      <div className="mt-5">
        <ReservationsView
          reservations={reservations.map((r) => ({
            id: r.id,
            code: r.code,
            propertyName: r.property.name,
            guestName: r.guest.name,
            checkIn: r.checkIn.toISOString(),
            checkOut: r.checkOut.toISOString(),
            nights: r.nights,
            source: r.source,
            status: r.status,
            total: Number(r.total),
          }))}
          properties={properties}
          filters={{ q, view, propertyId, status, source, limit }}
          counts={{ arrivals, inhouse, departures, pending }}
          hasMore={hasMore}
          matchingTotal={{ count: matching._count._all, amount: Number(matching._sum.total ?? 0) }}
          today={toISODate(today)}
          canWrite={canWrite}
          selected={
            selected && {
              id: selected.id,
              propertyId: selected.property.id,
              unitId: selected.unit.id,
              code: selected.code,
              propertyName: selected.property.name,
              propertyAddress: selected.property.addressLine,
              guest: {
                name: selected.guest.name,
                email: selected.guest.email,
                phone: selected.guest.phone,
                notes: selected.guest.notes,
              },
              checkIn: selected.checkIn.toISOString(),
              checkOut: selected.checkOut.toISOString(),
              nights: selected.nights,
              adults: selected.adults,
              children: selected.children,
              source: selected.source,
              status: selected.status,
              subtotal: Number(selected.subtotal),
              cleaningFee: Number(selected.cleaningFee),
              taxes: Number(selected.taxes),
              discount: Number(selected.discount),
              platformFee: Number(selected.platformFee),
              hostTax: Number(selected.hostTax),
              otherCharges: Number(selected.otherCharges),
              netPayout:
                Number(selected.total) -
                Number(selected.platformFee) -
                Number(selected.hostTax) -
                Number(selected.otherCharges),
              total: Number(selected.total),
              internalNotes: selected.internalNotes,
              payments: selected.payments.map((p) => ({
                id: p.id,
                method: p.method,
                amount: Number(p.amount),
                status: p.status,
                provider: p.provider,
                createdAt: p.createdAt.toISOString(),
              })),
              messages: selected.messages.map((m) => ({
                id: m.id,
                channel: m.channel,
                subject: m.subject,
                body: m.body,
                status: m.status,
                createdAt: m.createdAt.toISOString(),
              })),
              checkinGuests: selected.reservationGuests.map((g) => ({
                id: g.id,
                name: g.name,
                isPrimary: g.isPrimary,
                idType: g.idType,
                idNumber: g.idNumber,
                idDocumentUrl: g.idDocumentUrl,
                checkedInAt: g.checkedInAt ? g.checkedInAt.toISOString() : null,
              })),
              auditLogs: selected.auditLogs.map((a) => ({
                id: a.id,
                userName: a.userName,
                summary: a.summary,
                createdAt: a.createdAt.toISOString(),
              })),
            }
          }
        />
      </div>
    </AdminPage>
  );
}
