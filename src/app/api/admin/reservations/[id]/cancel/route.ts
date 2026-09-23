import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { cancelReservation } from "@/lib/booking/create-reservation";

/**
 * Cancels a PENDING request or a CONFIRMED booking the guest can no longer
 * take: releases the inventory hold and lets the guest know. Doesn't touch
 * any revenue already posted for a confirmed booking - a refund, if one's
 * owed, is recorded by hand through the finance tools.
 */
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/admin/reservations/[id]/cancel">,
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
  if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Only a pending or confirmed booking can be cancelled." },
      { status: 409 },
    );
  }

  await cancelReservation(reservation.id);

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "RESERVATION_CANCELLED",
      entityType: "Reservation",
      entityId: reservation.id,
      reservationId: reservation.id,
      summary: `${reservation.code} cancelled by ${user.name}`,
    },
  });

  return NextResponse.json({ status: "CANCELLED" });
}
