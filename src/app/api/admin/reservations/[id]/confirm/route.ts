import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { confirmReservation } from "@/lib/booking/create-reservation";

/**
 * There's no payment gateway wired up right now - bookings come in as
 * requests (PENDING) and someone on the team has to actually reach the
 * guest and arrange payment before a stay is confirmed. This is that step:
 * it flips the reservation to CONFIRMED, posts its revenue, and sends the
 * guest their confirmation email.
 */
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/admin/reservations/[id]/confirm">,
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Reservation id is required." }, { status: 400 });
  }
  const { user } = await getCurrentAdminUser();

  const reservation = await db.reservation.findUnique({
    where: { id },
    select: { id: true, code: true, status: true },
  });
  if (!reservation) {
    return NextResponse.json({ error: "That booking no longer exists." }, { status: 404 });
  }
  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only a pending booking request can be confirmed." },
      { status: 409 },
    );
  }

  await confirmReservation(reservation.id);

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "RESERVATION_CONFIRMED",
      entityType: "Reservation",
      entityId: reservation.id,
      reservationId: reservation.id,
      summary: `${reservation.code} confirmed by ${user.name}`,
    },
  });

  return NextResponse.json({ status: "CONFIRMED" });
}
