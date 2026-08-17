import "server-only";
import { db } from "@/lib/db";
import type { PropertyCardData } from "@/components/property/property-card";
import { resolveHighlight } from "@/lib/property/highlights";
import { resolveThingToKnow } from "@/lib/property/things-to-know";
import {
  qualifiesAsGuestFavourite,
  summariseReviews,
} from "@/lib/property/reviews";
import { toPublicReview } from "@/lib/property/review-display";
import { summariseReviewTopics } from "@/lib/property/review-topics";

function averageRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

export async function getPropertyCards(options?: {
  area?: string;
  city?: string;
  guests?: number;
  limit?: number;
  savedSlugs?: string[];
}): Promise<PropertyCardData[]> {
  const properties = await db.property.findMany({
    where: {
      status: "ACTIVE",
      ...(options?.area ? { locationArea: options.area } : {}),
      ...(options?.city ? { city: options.city } : {}),
      ...(options?.guests ? { maxGuests: { gte: options.guests } } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
      amenities: {
        where: { isUnavailable: false },
        include: { amenity: true },
        take: 6,
      },
    },
    orderBy: { basePrice: "asc" },
    take: options?.limit,
  });

  const saved = new Set(options?.savedSlugs ?? []);

  return properties.map((p) => ({
    slug: p.slug,
    name: p.name,
    locationArea: p.locationArea,
    city: p.city,
    heroImage: p.images[0]?.url ?? "",
    basePrice: Number(p.basePrice),
    maxGuests: p.maxGuests,
    bedrooms: p.bedrooms,
    rating: averageRating(p.reviews),
    reviewCount: p.reviews.length,
    amenityNames: p.amenities.map((a) => a.amenity.name),
    isSaved: saved.has(p.slug),
  }));
}

export async function getPropertyBySlug(slug: string) {
  const property = await db.property.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
      highlights: { orderBy: { sortOrder: "asc" } },
      thingsToKnow: { orderBy: { sortOrder: "asc" } },
      units: true,
      pricingRules: { where: { isActive: true } },
      reviews: {
        where: { status: "PUBLISHED" },
        include: {
          guest: { select: { name: true, createdAt: true } },
          reservation: { select: { checkIn: true, checkOut: true } },
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!property) return null;

  const summary = summariseReviews(property.reviews);
  const publicReviews = property.reviews.map(toPublicReview);
  const reviewTopics = summariseReviewTopics(property.reviews);

  // Sub-scores feed the dynamic highlight copy ("100% of recent guests gave
  // the location a 5-star rating"), so highlights are resolved here where
  // those numbers already exist.
  const highlights = property.highlights
    .map((row) =>
      resolveHighlight(row, {
        locationFiveStarPercent: summary.fiveStarShare.location,
        checkInFiveStarPercent: summary.fiveStarShare.checkIn,
        communicationFiveStarPercent: summary.fiveStarShare.communication,
        cleanlinessAverage:
          summary.categories.find((c) => c.key === "cleanliness")?.average ??
          null,
        cancellationPolicy: property.cancellationPolicy,
      }),
    )
    .filter((h) => h !== null);

  const thingsContext = {
    checkInFrom: property.checkInFrom,
    checkInTo: property.checkInTo,
    checkOutBy: property.checkOutBy,
    maxGuests: property.maxGuests,
  };
  // Kept flat with the group on each row; `ThingsToKnow` does the columning.
  const thingsToKnow = property.thingsToKnow.map((row) => ({
    ...resolveThingToKnow(row, thingsContext),
    group: row.group,
  }));

  // `PlaceOffers` groups and ranks these itself; it only needs them flat.
  const offeredAmenities = property.amenities.map((row) => ({
    id: row.amenity.id,
    name: row.amenity.name,
    icon: row.amenity.icon,
    category: row.amenity.category,
    isUnavailable: row.isUnavailable,
    note: row.note,
  }));

  return {
    ...property,
    basePriceNumber: Number(property.basePrice),
    cleaningFeeNumber: Number(property.cleaningFee),
    rating: summary.average,
    reviewCount: summary.count,
    reviewSummary: summary,
    publicReviews,
    reviewTopics,
    highlights,
    thingsToKnow,
    offeredAmenities,
    // The badge is an admin toggle, but it never renders on a listing whose
    // scores don't back it up.
    showGuestFavourite:
      property.isGuestFavourite && qualifiesAsGuestFavourite(summary),
  };
}

export type PropertyDetail = NonNullable<
  Awaited<ReturnType<typeof getPropertyBySlug>>
>;

export async function getPropertySlugs() {
  const properties = await db.property.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true },
  });
  return properties.map((p) => p.slug);
}

export async function getDistinctAreas() {
  const rows = await db.property.findMany({
    where: { status: "ACTIVE" },
    select: { locationArea: true },
    distinct: ["locationArea"],
  });
  return rows.map((r) => r.locationArea);
}
