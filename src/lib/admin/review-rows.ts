import type { ReviewSource, ReviewStatus, TripType } from "@prisma/client";
import type { AdminReview } from "@/components/admin/review-row";
import { REVIEW_TOPIC_BY_CODE, topicsForReview } from "@/lib/property/review-topics";
import { nightsBetween } from "@/lib/property/reviews";

export type AdminReviewSource = {
  id: string;
  guestId: string | null;
  authorName: string | null;
  rating: number;
  title: string | null;
  body: string;
  nightsStayed: number | null;
  stayedOn: Date | null;
  tripType: TripType | null;
  source: ReviewSource;
  status: ReviewStatus;
  isFeatured: boolean;
  featuredOnHome: boolean;
  response: string | null;
  topics: string[];
  createdAt: Date;
  property: { id: string; name: string; slug: string };
  guest: { name: string } | null;
  reservation: { code: string; checkIn: Date; checkOut: Date } | null;
};

/** Shapes a raw Review row (with the standard property/guest/reservation
 * include) into what ReviewRow renders - shared by the global reviews page
 * and the per-property Reviews tab so the two can't drift apart. */
export function buildAdminReviewRows(reviews: AdminReviewSource[]): AdminReview[] {
  return reviews.map((review) => ({
    id: review.id,
    propertyId: review.property.id,
    propertyName: review.property.name,
    propertySlug: review.property.slug,
    author: review.guest?.name ?? review.authorName ?? "Lime Kraft guest",
    isGuestReview: review.guestId !== null,
    bookingCode: review.reservation?.code ?? null,
    rating: review.rating,
    title: review.title,
    body: review.body,
    nights: review.reservation
      ? nightsBetween(review.reservation.checkIn, review.reservation.checkOut)
      : review.nightsStayed,
    stayedOn: (review.stayedOn ?? review.reservation?.checkOut ?? review.createdAt).toISOString(),
    tripType: review.tripType,
    source: review.source,
    status: review.status,
    isFeatured: review.isFeatured,
    featuredOnHome: review.featuredOnHome,
    response: review.response,
    topics: topicsForReview(review).map((code) => {
      const topic = REVIEW_TOPIC_BY_CODE.get(code)!;
      return {
        code,
        label: topic.label,
        emoji: topic.emoji,
        inferred: (review.topics ?? []).length === 0,
      };
    }),
  }));
}
