import type { PropertyCardData } from "@/components/property/property-card";
import type { TourImage } from "@/components/property/room-tour";

/**
 * The shapes the narrative runs on.
 *
 * Deliberately declared here rather than imported from `lib/queries/*`: those
 * modules are `server-only`, and every beat below the hero is a client
 * component. A type-only import would erase correctly today and break the
 * moment someone reaches for a value from the same module.
 */

export type ThreadCity = {
  slug: string;
  name: string;
  state: string;
  propertyCount: number;
  minPrice: number | null;
  areas: string[];
  image: string | null;
};

export type ThreadReview = {
  id: string;
  title: string | null;
  body: string;
  rating: number;
  author: string;
  propertyName: string;
  propertySlug: string;
};

/**
 * One city, everything the page needs to tell its story, resolved on the
 * server. Cities are few and the page is prerendered, so bundling the gallery
 * and the review up front costs a handful of build-time queries and buys a
 * narrative that re-aims instantly with no client fetch anywhere.
 */
export type CityBundle = {
  city: ThreadCity;
  home: PropertyCardData;
  gallery: TourImage[];
  review: ThreadReview | null;
};
