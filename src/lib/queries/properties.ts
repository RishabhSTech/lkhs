import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
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

/**
 * The columns a card actually paints. Previously these queries used `include`,
 * which returns every scalar on `Property` - description, house rules, policy
 * text - to render a tile showing six of them.
 */
export const CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  locationArea: true,
  city: true,
  basePrice: true,
  maxGuests: true,
  bedrooms: true,
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
  amenities: {
    where: { isUnavailable: false },
    take: 6,
    select: { amenity: { select: { name: true } } },
  },
} satisfies Prisma.PropertySelect;

type CardRow = Prisma.PropertyGetPayload<{ select: typeof CARD_SELECT }>;

export type PropertyRating = { average: number | null; count: number };

/**
 * Ratings for a set of properties, averaged by the database.
 *
 * The cards used to pull `reviews: { select: { rating: true } }` through the
 * relation, which is one row per review per property - on a city page with a
 * few hundred reviews that was the bulk of the response - purely to average a
 * column Postgres can average itself. This is one extra round trip returning
 * one row per property instead.
 */
export async function ratingsByProperty(
  propertyIds: string[],
): Promise<Map<string, PropertyRating>> {
  if (propertyIds.length === 0) return new Map();

  const grouped = await db.review.groupBy({
    by: ["propertyId"],
    where: { status: "PUBLISHED", propertyId: { in: propertyIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return new Map(
    grouped.map((row) => [
      row.propertyId,
      { average: row._avg.rating, count: row._count._all },
    ]),
  );
}

/** Shared by every card surface so the shapes cannot drift apart. */
export function toPropertyCard(
  row: CardRow,
  ratings: Map<string, PropertyRating>,
  saved?: Set<string>,
): PropertyCardData {
  const rating = ratings.get(row.id);
  return {
    slug: row.slug,
    name: row.name,
    locationArea: row.locationArea,
    city: row.city,
    heroImage: row.images[0]?.url ?? "",
    basePrice: Number(row.basePrice),
    maxGuests: row.maxGuests,
    bedrooms: row.bedrooms,
    rating: rating?.average ?? null,
    reviewCount: rating?.count ?? 0,
    amenityNames: row.amenities.map((a) => a.amenity.name),
    ...(saved ? { isSaved: saved.has(row.slug) } : {}),
  };
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
    select: CARD_SELECT,
    orderBy: { basePrice: "asc" },
    take: options?.limit,
  });

  const ratings = await ratingsByProperty(properties.map((p) => p.id));
  const saved = new Set(options?.savedSlugs ?? []);

  return properties.map((p) => toPropertyCard(p, ratings, saved));
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

export const getPropertySlugs = cache(async function getPropertySlugs() {
  const properties = await db.property.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true },
  });
  return properties.map((p) => p.slug);
});

export const getDistinctAreas = cache(async function getDistinctAreas() {
  const rows = await db.property.findMany({
    where: { status: "ACTIVE" },
    select: { locationArea: true },
    distinct: ["locationArea"],
  });
  return rows.map((r) => r.locationArea);
});

/**
 * Just the photographs, hero first. `getPropertyBySlug` already returns these
 * but drags the whole listing payload - amenities, highlights, things to know,
 * reviews and topic summaries - along with them, which is far more than a
 * gallery on the homepage needs to render five images.
 */
export const getPropertyGallery = cache(async function getPropertyGallery(
  slug: string,
): Promise<{ id: string; url: string; alt: string | null }[]> {
  return db.propertyImage.findMany({
    where: { property: { slug, status: "ACTIVE" } },
    orderBy: [{ isHero: "desc" }, { sortOrder: "asc" }],
    select: { id: true, url: true, alt: true },
  });
});
