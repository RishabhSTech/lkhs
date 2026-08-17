import type { ReviewSource, TripType } from "@prisma/client";
import { nightsBetween } from "@/lib/property/reviews";
import { topicsForReview } from "@/lib/property/review-topics";

/**
 * Turns a stored review into the plain, serialisable shape the client review
 * components render. Two things get resolved here rather than in the database:
 *
 *  - **Identity.** A review written by one of our guests shows the guest
 *    record's name; an imported one falls back to the author fields the admin
 *    typed in.
 *  - **Stay length.** When the review is attached to one of our bookings, the
 *    nights come from that booking — a guest can't inflate how long they
 *    stayed, which is the whole point of showing the figure. `nightsStayed` is
 *    only trusted for reviews with no reservation behind them (OTA imports).
 */

export type ReviewWithContext = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  nightsStayed: number | null;
  stayedOn: Date | null;
  tripType: TripType | null;
  source: ReviewSource;
  response: string | null;
  topics?: string[] | null;
  authorName: string | null;
  authorLocation: string | null;
  authorAvatarUrl: string | null;
  authorSince: number | null;
  createdAt: Date;
  guest: { name: string; createdAt: Date } | null;
  reservation: { checkIn: Date; checkOut: Date } | null;
};

export type PublicReview = {
  id: string;
  name: string;
  location: string | null;
  since: number | null;
  avatarUrl: string | null;
  source: ReviewSource;
  rating: number;
  /** ISO string — the month is what gets rendered. */
  stayedOn: string;
  nights: number | null;
  tripType: TripType | null;
  /** Backed by a completed booking of ours. */
  isVerifiedStay: boolean;
  title: string | null;
  body: string;
  response: string | null;
  /** Resolved topic codes, for the chip filter above the list. */
  topics: string[];
};

export function toPublicReview(review: ReviewWithContext): PublicReview {
  const stayedOn =
    review.reservation?.checkOut ?? review.stayedOn ?? review.createdAt;

  return {
    id: review.id,
    name: review.guest?.name ?? review.authorName ?? "Lime Kraft guest",
    location: review.authorLocation,
    // "3 years on Lime Kraft". For our own guests that is when their profile
    // was created; imported reviews carry the year the admin typed in.
    since: review.authorSince ?? review.guest?.createdAt.getUTCFullYear() ?? null,
    avatarUrl: review.authorAvatarUrl,
    source: review.source,
    rating: review.rating,
    stayedOn: stayedOn.toISOString(),
    nights: review.reservation
      ? nightsBetween(review.reservation.checkIn, review.reservation.checkOut)
      : review.nightsStayed,
    tripType: review.tripType,
    isVerifiedStay: review.reservation != null,
    title: review.title,
    body: review.body,
    response: review.response,
    topics: topicsForReview(review),
  };
}
