import type { PropertyType } from "@prisma/client";
import { slugify } from "@/lib/seo/slug";

/**
 * The SEO surface is a matrix of {stay type} × {city}, addressed by
 * keyword-exact URLs — `/villas-in-indore`, `/apartments-in-goa`. One dynamic
 * route serves the whole matrix, so a new city needs no new files: the moment a
 * property in that city goes ACTIVE, its pages exist and enter the sitemap.
 */

export type CollectionKind = "stays" | "villas" | "apartments" | "homes" | "cottages";

type CollectionSpec = {
  /** null means "every type" — the city hub page. */
  propertyType: PropertyType | null;
  /** Used in the H1: "Villas in Indore". */
  plural: string;
  singular: string;
  /** Synonyms a searcher might use. These go into body copy and FAQs rather
   *  than into separate near-duplicate pages, which would compete with each
   *  other and dilute both. */
  synonyms: string[];
  intro: string;
};

export const COLLECTIONS: Record<CollectionKind, CollectionSpec> = {
  stays: {
    propertyType: null,
    plural: "Stays",
    singular: "Stay",
    synonyms: ["places to stay", "holiday rentals", "vacation rentals", "homestays", "accommodation"],
    intro:
      "Every home we run in {city} — booked direct, with no channel mark-up and a real person on the other end of the message.",
  },
  villas: {
    propertyType: "VILLA",
    plural: "Villas",
    singular: "Villa",
    synonyms: ["private villas", "luxury villas", "villas with garden", "villa rentals"],
    intro:
      "Standalone villas in {city} with the whole place to yourself — space for a group, private outdoor room, and none of the shared-corridor feeling of a hotel.",
  },
  apartments: {
    propertyType: "APARTMENT",
    plural: "Apartments",
    singular: "Apartment",
    synonyms: ["serviced apartments", "flats", "self-catering apartments", "furnished apartments"],
    intro:
      "Fully furnished, self-contained apartments in {city}. A kitchen, a proper desk and a working washing machine — the things that matter past night three.",
  },
  homes: {
    propertyType: "HOME",
    plural: "Homes",
    singular: "Home",
    synonyms: ["holiday homes", "entire homes", "family homes", "guest houses"],
    intro:
      "Entire homes in {city}, rented whole. Best for families and groups who want to cook, spread out and keep their own hours.",
  },
  cottages: {
    propertyType: "COTTAGE",
    plural: "Cottages",
    singular: "Cottage",
    synonyms: ["cottages with garden", "quiet cottages", "weekend cottages"],
    intro:
      "Smaller, quieter cottages around {city} — the ones people book when the point of the trip is to slow down.",
  },
};

export const COLLECTION_KINDS = Object.keys(COLLECTIONS) as CollectionKind[];

/**
 * "VILLA" → "villas". Lets a single listing page describe itself in the same
 * nouns — and link to the same URL — as its collection page, so
 * `/stays/assagao-garden-villa` and `/villas-in-goa` reinforce one vocabulary
 * instead of two.
 */
export function kindForType(type: PropertyType): CollectionKind | null {
  return (
    COLLECTION_KINDS.find((k) => COLLECTIONS[k].propertyType === type) ?? null
  );
}

/** `/villas-in-indore` → { kind: "villas", citySlug: "indore" } */
export function parseCollectionSlug(
  slug: string,
): { kind: CollectionKind; citySlug: string } | null {
  const match = /^([a-z]+)-in-(.+)$/.exec(slug.toLowerCase());
  if (!match) return null;
  const [, kindPart, citySlug] = match;
  if (!COLLECTION_KINDS.includes(kindPart as CollectionKind)) return null;
  // Guard against a doubled slug like `villas-in-` with nothing after it.
  if (!citySlug || slugify(citySlug) !== citySlug) return null;
  return { kind: kindPart as CollectionKind, citySlug };
}

export function collectionPath(kind: CollectionKind, citySlug: string) {
  return `/${kind}-in-${citySlug}`;
}
