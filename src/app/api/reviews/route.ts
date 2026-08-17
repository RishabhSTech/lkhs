import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { todayUTC } from "@/lib/dates";
import { REVIEW_TOPIC_BY_CODE } from "@/lib/property/review-topics";

const score = z.number().int().min(1).max(5);

const schema = z.object({
  reservationId: z.string().min(1),
  rating: score,
  cleanliness: score.optional(),
  accuracy: score.optional(),
  checkIn: score.optional(),
  communication: score.optional(),
  location: score.optional(),
  value: score.optional(),
  tripType: z
    .enum(["SOLO", "COUPLE", "FAMILY", "FRIENDS", "BUSINESS", "GROUP"])
    .optional(),
  topics: z.array(z.string()).max(5).optional(),
  title: z.string().max(80).optional(),
  body: z.string().min(30, "Tell future guests a little more.").max(2000),
});

/**
 * A guest reviewing their own completed stay.
 *
 * Eligibility is re-checked here rather than trusted from the client: the
 * reservation must belong to the signed-in guest, must have checked out, and
 * must not already carry a review. The nights and stay month are never taken
 * from the request — they come from the reservation, which is what makes the
 * "Verified stay · Stayed 4 nights" line on the listing worth anything.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to review your stay." },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the review details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const reservation = await db.reservation.findFirst({
    where: {
      id: data.reservationId,
      guest: { userId: session.userId },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: { review: { select: { id: true } } },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "We couldn't find that booking on your account." },
      { status: 404 },
    );
  }
  if (reservation.checkOut > todayUTC()) {
    return NextResponse.json(
      { error: "You can review this stay once you've checked out." },
      { status: 409 },
    );
  }
  if (reservation.review) {
    return NextResponse.json(
      { error: "You've already reviewed this stay." },
      { status: 409 },
    );
  }

  const review = await db.review.create({
    data: {
      propertyId: reservation.propertyId,
      guestId: reservation.guestId,
      reservationId: reservation.id,
      rating: data.rating,
      cleanliness: data.cleanliness ?? null,
      accuracy: data.accuracy ?? null,
      checkIn: data.checkIn ?? null,
      communication: data.communication ?? null,
      location: data.location ?? null,
      value: data.value ?? null,
      tripType: data.tripType ?? null,
      // Unknown codes are dropped rather than stored — an unrecognised topic
      // would silently stop the review counting towards any chip.
      topics: (data.topics ?? []).filter((code) =>
        REVIEW_TOPIC_BY_CODE.has(code),
      ),
      title: data.title?.trim() || null,
      body: data.body.trim(),
      stayedOn: reservation.checkOut,
      // Stay length is derived at render time from the linked reservation, so
      // it is deliberately left null here rather than duplicated.
      source: "DIRECT",
      status: "PUBLISHED",
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.userId,
      userName: session.name,
      action: "REVIEW_CREATED",
      entityType: "Review",
      entityId: review.id,
      reservationId: reservation.id,
      summary: `${session.name} rated ${reservation.code} ${data.rating}/5`,
      metadata: { rating: data.rating },
    },
  });

  return NextResponse.json({ id: review.id });
}
