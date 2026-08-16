import type { BookingSource, ReservationStatus } from "@prisma/client";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { ReservationsTable } from "@/components/admin/reservations-table";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function ReservationsPage({
  searchParams,
}: PageProps<"/admin/reservations">) {
  const params = await searchParams;
  const propertyId = typeof params.property === "string" ? params.property : undefined;
  const status = typeof params.status === "string" ? (params.status as ReservationStatus) : undefined;
  const source = typeof params.source === "string" ? (params.source as BookingSource) : undefined;
  const selectedId = typeof params.id === "string" ? params.id : undefined;

  const [reservations, properties] = await Promise.all([
    db.reservation.findMany({
      where: {
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status } : {}),
        ...(source ? { source } : {}),
      },
      include: {
        property: { select: { id: true, name: true } },
        guest: { select: { id: true, name: true, email: true, phone: true } },
        payments: true,
      },
      orderBy: { checkIn: "desc" },
      take: PAGE_SIZE,
    }),
    db.property.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const selected = selectedId
    ? await db.reservation.findUnique({
        where: { id: selectedId },
        include: {
          property: { select: { id: true, name: true, addressLine: true } },
          guest: true,
          payments: true,
          messages: { orderBy: { createdAt: "desc" } },
          auditLogs: { orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  return (
    <AdminPage>
      <PageHeader
        title="Reservations"
        description={`${reservations.length} bookings shown, newest arrivals first.`}
      />
      <div className="mt-6">
        <ReservationsTable
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
            paymentStatus: r.payments[0]?.status ?? "PENDING",
          }))}
          properties={properties}
          filters={{ propertyId, status, source }}
          selected={
            selected && {
              id: selected.id,
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
