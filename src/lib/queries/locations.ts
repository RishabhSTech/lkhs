import "server-only";
import { cache } from "react";
import type { PropertyType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  CARD_SELECT,
  ratingsByProperty,
  toPropertyCard,
} from "@/lib/queries/properties";
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

export const getCities = cache(async function getCities(): Promise<CityRecord[]> {
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
});

export async function getCityBySlug(slug: string) {
  const cities = await getCities();
  return resolveBySlug(cities, slug, (c) => c.name);
}

/**
 * Which {kind}×{city} pages actually have inventory. Used both for
 * `generateStaticParams` and for the sitemap, so the two can never drift.
 */
export const getCollectionTargets = cache(async function getCollectionTargets() {
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
});

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

  // The card rows and the sibling counts are independent queries against the
  // same city; only the ratings have to wait, since they key off the ids the
  // first query returns.
  const [rows, grouped] = await Promise.all([
    db.property.findMany({
      where: {
        status: "ACTIVE",
        city: city.name,
        ...(propertyType ? { propertyType } : {}),
      },
      select: CARD_SELECT,
      orderBy: { basePrice: "asc" },
    }),
    db.property.groupBy({
      by: ["propertyType"],
      where: { status: "ACTIVE", city: city.name },
      _count: { _all: true },
    }),
  ]);

  const ratings = await ratingsByProperty(rows.map((r) => r.id));
  const properties = rows.map((row) => toPropertyCard(row, ratings));

  const prices = properties.map((p) => p.basePrice);

  // Collection-wide rating, recombined from the per-property averages. Summing
  // `average x count` and dividing by the total is exactly the mean over every
  // individual review, so this matches what the old flatMap produced - minus
  // the unpublished reviews it used to silently fold in, which the card query
  // beside it had always excluded.
  const reviewCount = properties.reduce((n, p) => n + p.reviewCount, 0);
  const ratingTotal = properties.reduce(
    (sum, p) => sum + (p.rating === null ? 0 : p.rating * p.reviewCount),
    0,
  );

  // Sibling links are the internal-linking spine of the matrix: every page in
  // a city points at every other page in that city, so crawl equity does not
  // dead-end on whichever page happens to get discovered first.
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
    rating: reviewCount === 0 ? null : ratingTotal / reviewCount,
    reviewCount,
    siblings,
  };
}

/** Distinct areas for a city, for internal links and search grouping. */
export const getAreasByCity = cache(async function getAreasByCity() {
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
});

export type { PropertyType };
