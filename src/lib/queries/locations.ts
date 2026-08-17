import "server-only";
import type { PropertyType } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveBySlug, slugify } from "@/lib/seo/slug";
import {
  COLLECTIONS, COLLECTION_KINDS, type CollectionKind,
} from "@/lib/seo/collections";
import type { PropertyCardData } from "@/components/property/property-card";

/**
 * Every location on the public site is derived from ACTIVE inventory rather
 * than from a hand-maintained list. Adding the first Goa property is therefore
 * the only step needed to bring `/stays-in-goa`, `/villas-in-goa`, the Goa
 * destination card and the sitemap entries into existence.
 */

export type CityRecord = {
  slug: string;
  name: string;
  state: string;
  propertyCount: number;
  minPrice: number | null;
  areas: string[];
  /** A representative photo, borrowed from one of the city's own homes. */
  image: string | null;
};

function averageRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

export async function getCities(): Promise<CityRecord[]> {
  const properties = await db.property.findMany({
    where: { status: "ACTIVE" },
    select: {
      city: true,
      state: true,
      locationArea: true,
      basePrice: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
    orderBy: { city: "asc" },
  });

  const byCity = new Map<string, CityRecord>();
  for (const p of properties) {
    const slug = slugify(p.city);
    let entry = byCity.get(slug);
    if (!entry) {
      entry = {
        slug,
        name: p.city,
        state: p.state,
        propertyCount: 0,
        minPrice: null,
        areas: [],
        image: null,
      };
      byCity.set(slug, entry);
    }
    entry.propertyCount += 1;
    const price = Number(p.basePrice);
    entry.minPrice = entry.minPrice === null ? price : Math.min(entry.minPrice, price);
    if (!entry.areas.includes(p.locationArea)) entry.areas.push(p.locationArea);
    entry.image ??= p.images[0]?.url ?? null;
  }

  return [...byCity.values()].sort((a, b) => b.propertyCount - a.propertyCount);
}

export async function getCityBySlug(slug: string) {
  const cities = await getCities();
  return resolveBySlug(cities, slug, (c) => c.name);
}

/**
 * Which {kind}×{city} pages actually have inventory. Used both for
 * `generateStaticParams` and for the sitemap, so the two can never drift.
 */
export async function getCollectionTargets() {
  const grouped = await db.property.groupBy({
    by: ["city", "propertyType"],
    where: { status: "ACTIVE" },
    _count: { _all: true },
  });

  const targets: { kind: CollectionKind; citySlug: string; count: number }[] = [];
  const cityTotals = new Map<string, number>();

  for (const row of grouped) {
    const citySlug = slugify(row.city);
    cityTotals.set(citySlug, (cityTotals.get(citySlug) ?? 0) + row._count._all);

    const kind = COLLECTION_KINDS.find(
      (k) => COLLECTIONS[k].propertyType === row.propertyType,
    );
    if (kind) targets.push({ kind, citySlug, count: row._count._all });
  }

  // The city hub always exists wherever there is any inventory at all.
  for (const [citySlug, count] of cityTotals) {
    targets.push({ kind: "stays", citySlug, count });
  }

  return targets;
}

export type CollectionData = {
  city: CityRecord;
  properties: PropertyCardData[];
  minPrice: number | null;
  maxPrice: number | null;
  rating: number | null;
  reviewCount: number;
  /** Sibling collections in the same city that have inventory. */
  siblings: { kind: CollectionKind; label: string; count: number; href: string }[];
};

export async function getCollection(
  citySlug: string,
  kind: CollectionKind,
): Promise<CollectionData | null> {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;

  const propertyType = COLLECTIONS[kind].propertyType;

  const rows = await db.property.findMany({
    where: {
      status: "ACTIVE",
      city: city.name,
      ...(propertyType ? { propertyType } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      reviews: { select: { rating: true } },
      amenities: { include: { amenity: true }, take: 6 },
    },
    orderBy: { basePrice: "asc" },
  });

  const properties: PropertyCardData[] = rows.map((p) => ({
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
  }));

  const prices = properties.map((p) => p.basePrice);
  const allReviews = rows.flatMap((r) => r.reviews);

  // Sibling links are the internal-linking spine of the matrix: every page in
  // a city points at every other page in that city, so crawl equity does not
  // dead-end on whichever page happens to get discovered first.
  const grouped = await db.property.groupBy({
    by: ["propertyType"],
    where: { status: "ACTIVE", city: city.name },
    _count: { _all: true },
  });

  const siblings: CollectionData["siblings"] = [];
  for (const k of COLLECTION_KINDS) {
    if (k === kind) continue;
    const spec = COLLECTIONS[k];
    const count =
      spec.propertyType === null
        ? city.propertyCount
        : (grouped.find((g) => g.propertyType === spec.propertyType)?._count._all ?? 0);
    if (count === 0) continue;
    siblings.push({
      kind: k,
      label: `${spec.plural} in ${city.name}`,
      count,
      href: `/${k}-in-${city.slug}`,
    });
  }

  return {
    city,
    properties,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    rating: averageRating(allReviews),
    reviewCount: allReviews.length,
    siblings,
  };
}

/** Distinct areas for a city, for internal links and search grouping. */
export async function getAreasByCity() {
  const rows = await db.property.findMany({
    where: { status: "ACTIVE" },
    select: { city: true, locationArea: true },
    distinct: ["city", "locationArea"],
    orderBy: [{ city: "asc" }, { locationArea: "asc" }],
  });

  const map = new Map<string, { city: string; areas: string[] }>();
  for (const r of rows) {
    const key = slugify(r.city);
    if (!map.has(key)) map.set(key, { city: r.city, areas: [] });
    map.get(key)!.areas.push(r.locationArea);
  }
  return map;
}

export type { PropertyType };
