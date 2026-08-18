import { db } from "@/lib/db";
import { releasePendingReservation } from "@/lib/booking/create-reservation";
import type { ReservationExpiryJob } from "@/lib/queue";

/**
 * Fires ~20 minutes after a reservation is created against a real payment
 * provider. If payment never completed, the hold on inventory is released
 * rather than blocking those dates forever.
 */
export async function processReservationExpiry(job: ReservationExpiryJob) {
  const released = await releasePendingReservation(job.reservationId);
  if (!released) return;

  const reservation = await db.reservation.findUnique({
    where: { id: job.reservationId },
    select: { code: true },
  });
  if (!reservation) return;

  await db.notification.create({
    data: {
      type: "PAYMENT_FAILED",
      title: "Booking hold released",
      body: `${reservation.code} was never paid for and its dates have been released.`,
      severity: "WARNING",
      link: `/admin/reservations?code=${reservation.code}`,
    },
  });
}
