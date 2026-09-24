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

/**
 * One entry per place a review can come from: its display name, its real
 * logo (Airbnb's Bélo, Booking.com's mark, Google's "G", Agoda's five dots,
 * MakeMyTrip's ribbon, Vrbo's wordmark - swap the file under public/ota/ if
 * a brand ever updates theirs), and the brand-colour gradient used as a
 * light accent. This is what turns a list of reviews into a collage of the
 * sites they were collected from.
 */
export const OTA_SOURCE_META: Record<
  ReviewSource,
  { label: string; logo: string; gradient: string }
> = {
  DIRECT: {
    label: "Lime Kraft",
    logo: "/favico.png",
    gradient: "linear-gradient(135deg, #2563eb, #d99a1f)",
  },
  AIRBNB: {
    label: "Airbnb",
    logo: "/ota/airbnb.svg",
    gradient: "linear-gradient(135deg, #FF385C, #BD1E59)",
  },
  BOOKING_COM: {
    label: "Booking.com",
    logo: "/ota/booking-com.svg",
    gradient: "linear-gradient(135deg, #003580, #009fe3)",
  },
  AGODA: {
    label: "Agoda",
    logo: "/ota/agoda.svg",
    gradient: "linear-gradient(135deg, #7A0C2E, #FF4B4B)",
  },
  MAKEMYTRIP: {
    label: "MakeMyTrip",
    logo: "/ota/makemytrip.svg",
    gradient: "linear-gradient(135deg, #E9432D, #00A0DC)",
  },
  VRBO: {
    label: "Vrbo",
    logo: "/ota/vrbo.svg",
    gradient: "linear-gradient(135deg, #003B5C, #00A3E0)",
  },
  GOOGLE: {
    label: "Google",
    logo: "/ota/google.svg",
    gradient: "linear-gradient(135deg, #4285F4, #34A853 35%, #FBBC05 65%, #EA4335)",
  },
  OTHER: {
    label: "Other",
    logo: "/ota/other.svg",
    gradient: "linear-gradient(135deg, #8aa2c4, #64748b)",
  },
};

export const REVIEW_SOURCE_LABELS: Record<ReviewSource, string> = {
  ...(Object.fromEntries(
    Object.entries(OTA_SOURCE_META).map(([source, meta]) => [source, meta.label]),
  ) as Record<ReviewSource, string>),
  // Reads better than the badge's "Lime Kraft" when it stands in for a
  // location line on a guest's own review (see ReviewCard).
  DIRECT: "Booked direct",
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
