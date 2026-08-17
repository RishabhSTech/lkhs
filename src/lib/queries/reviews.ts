import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { todayUTC } from "@/lib/dates";
import { nightsBetween } from "@/lib/property/reviews";
import type { ReviewableStay } from "@/components/property/reviews/write-review";

/**
 * The signed-in guest's most recent completed stay at this property that they
 * haven't reviewed yet — the thing that unlocks "Write a review".
 *
 * Eligibility is checked here and again in the POST handler; this call only
 * decides whether to render the button.
 */
export async function getReviewableStay(
  propertyId: string,
): Promise<ReviewableStay | null> {
  const session = await getSession();
  if (!session) return null;

  const reservation = await db.reservation.findFirst({
    where: {
      propertyId,
      guest: { userId: session.userId },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      // Reviews open once the guest has actually checked out.
      checkOut: { lte: todayUTC() },
      review: null,
    },
    include: { property: { select: { name: true } } },
    orderBy: { checkOut: "desc" },
  });
  if (!reservation) return null;

  return {
    reservationId: reservation.id,
    code: reservation.code,
    propertyName: reservation.property.name,
    checkOut: reservation.checkOut.toISOString(),
    nights: nightsBetween(reservation.checkIn, reservation.checkOut),
  };
}
