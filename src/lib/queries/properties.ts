import "server-only";
import { db } from "@/lib/db";
import type { PropertyCardData } from "@/components/property/property-card";

function averageRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

export async function getPropertyCards(options?: {
  area?: string;
  guests?: number;
  limit?: number;
  savedSlugs?: string[];
}): Promise<PropertyCardData[]> {
  const properties = await db.property.findMany({
    where: {
      status: "ACTIVE",
      ...(options?.area ? { locationArea: options.area } : {}),
      ...(options?.guests ? { maxGuests: { gte: options.guests } } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      reviews: { select: { rating: true } },
      amenities: { include: { amenity: true }, take: 6 },
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
      units: true,
      pricingRules: { where: { isActive: true } },
      reviews: {
        include: { guest: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!property) return null;

  return {
    ...property,
    basePriceNumber: Number(property.basePrice),
    cleaningFeeNumber: Number(property.cleaningFee),
    rating: averageRating(property.reviews),
    reviewCount: property.reviews.length,
  };
}

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
