import type { ReviewSource, TripType } from "@prisma/client";

/**
 * Review scoring, shaped the way Airbnb presents it: one headline average, a
 * 5→1 distribution, and six category sub-scores.
 *
 * Sub-scores are optional on a review - an older or imported review may only
 * carry an overall rating - so every average here is computed over the reviews
 * that actually answered that category, never over the whole set.
 */

export const REVIEW_CATEGORIES = [
  { key: "cleanliness", label: "Cleanliness", icon: "Sparkles" },
  { key: "accuracy", label: "Accuracy", icon: "BadgeCheck" },
  { key: "checkIn", label: "Check-in", icon: "KeyRound" },
  { key: "communication", label: "Communication", icon: "MessageSquare" },
  { key: "location", label: "Location", icon: "MapPin" },
  { key: "value", label: "Value", icon: "Tag" },
] as const;

export type ReviewCategoryKey = (typeof REVIEW_CATEGORIES)[number]["key"];

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  SOLO: "Solo trip",
  COUPLE: "Trip with a partner",
  FAMILY: "Family trip",
  FRIENDS: "Trip with friends",
  BUSINESS: "Work trip",
  GROUP: "Group trip",
};

export const REVIEW_SOURCE_LABELS: Record<ReviewSource, string> = {
  DIRECT: "Booked direct",
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  GOOGLE: "Google",
  OTHER: "Other",
};

/** The minimum a review needs to carry for the maths below. */
export type ScorableReview = {
  rating: number;
  cleanliness: number | null;
  accuracy: number | null;
  checkIn: number | null;
  communication: number | null;
  location: number | null;
  value: number | null;
};

export type ReviewSummary = {
  count: number;
  average: number | null;
  /** Index 0 = one star, index 4 = five stars. */
  distribution: number[];
  categories: { key: ReviewCategoryKey; label: string; icon: string; average: number | null }[];
  /** Share of reviews awarding this category a full 5, for listing highlights. */
  fiveStarShare: Record<ReviewCategoryKey, number | null>;
};

function mean(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function summariseReviews(reviews: ScorableReview[]): ReviewSummary {
  const distribution = [0, 0, 0, 0, 0];
  for (const review of reviews) {
    const bucket = Math.min(5, Math.max(1, Math.round(review.rating))) - 1;
    distribution[bucket] += 1;
  }

  const fiveStarShare = {} as Record<ReviewCategoryKey, number | null>;
  const categories = REVIEW_CATEGORIES.map((category) => {
    const scores = reviews
      .map((r) => r[category.key])
      .filter((v): v is number => v != null);

    fiveStarShare[category.key] =
      scores.length === 0
        ? null
        : (scores.filter((s) => s >= 5).length / scores.length) * 100;

    return { ...category, average: mean(scores) };
  });

  return {
    count: reviews.length,
    average: mean(reviews.map((r) => r.rating)),
    distribution,
    categories,
    fiveStarShare,
  };
}

/**
 * A "Guest favourite" on Airbnb is a listing in the most-loved band. We can't
 * copy their model, so the badge is an explicit admin toggle - but this guard
 * stops it showing on a listing whose numbers plainly don't support it.
 */
export function qualifiesAsGuestFavourite(summary: ReviewSummary) {
  return summary.count >= 3 && (summary.average ?? 0) >= 4.7;
}

/**
 * Nights stayed is the trust signal here, so it is derived from the booking
 * whenever the review is attached to one and can't be typed in by hand. Only
 * reviews the admin enters manually (imported from an OTA, say) carry a
 * self-declared figure.
 */
export function nightsBetween(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function formatStayLength(nights: number | null) {
  if (!nights) return null;
  return nights === 1 ? "Stayed 1 night" : `Stayed ${nights} nights`;
}

/** "August 2026" - Airbnb dates reviews by month, not to the day. */
export function formatReviewMonth(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
