import { SITE, absoluteUrl } from "@/lib/seo/site";
import type { PropertyCardData } from "@/components/property/property-card";

/**
 * Structured data builders. Everything here must describe what is actually on
 * the page — marking up a rating or a price the visitor cannot see is the
 * fastest route to a manual action, not a rich result.
 */

/**
 * `cities` comes from live inventory rather than a constant: naming the actual
 * places we operate is what ties this entity to those locations, and a bare
 * "IN" says nothing a search engine can use. It also means opening a city
 * updates the entity without anyone remembering to edit this file.
 */
export function organizationJsonLd(
  cities: { name: string; state: string }[] = [],
) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
    areaServed:
      cities.length > 0
        ? cities.map((city) => ({
            "@type": "City",
            name: city.name,
            containedInPlace: {
              "@type": "AdministrativeArea",
              name: city.state,
            },
          }))
        : { "@type": "Country", name: "India" },
  };
}

/** Enables the sitelinks search box, and tells Google how our search works. */
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE.name,
    url: SITE.url,
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/stays?area={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(trail: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.href),
    })),
  };
}

/**
 * A collection page is an ItemList of lodgings. Each entry carries its own
 * price and rating, which is what lets a listing page surface with prices in
 * the SERP rather than as a bare blue link.
 */
export function collectionJsonLd({
  name,
  description,
  path,
  properties,
}: {
  name: string;
  description: string;
  path: string;
  properties: PropertyCardData[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: properties.length,
      itemListElement: properties.map((property, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Accommodation",
          name: property.name,
          url: absoluteUrl(`/stays/${property.slug}`),
          image: property.heroImage || undefined,
          occupancy: {
            "@type": "QuantitativeValue",
            maxValue: property.maxGuests,
          },
          numberOfBedrooms: property.bedrooms,
          address: {
            "@type": "PostalAddress",
            addressLocality: property.locationArea,
            addressRegion: property.city,
            addressCountry: SITE.country,
          },
          ...(property.rating !== null && property.reviewCount > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: property.rating.toFixed(1),
                  reviewCount: property.reviewCount,
                  bestRating: 5,
                },
              }
            : {}),
          offers: {
            "@type": "Offer",
            price: property.basePrice,
            priceCurrency: SITE.currency,
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/stays/${property.slug}`),
          },
        },
      })),
    },
  };
}

/**
 * A single listing. Reviews and the aggregate rating are only emitted when the
 * page actually renders them — marking up a rating a visitor cannot see is
 * exactly what earns a structured-data manual action.
 */
export function lodgingJsonLd({
  property,
  reviews,
}: {
  property: {
    slug: string;
    name: string;
    description: string;
    addressLine: string;
    locationArea: string;
    city: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
    maxGuests: number;
    bedrooms: number;
    basePriceNumber: number;
    checkInFrom: string | null;
    checkOutBy: string | null;
    rating: number | null;
    reviewCount: number;
    images: { url: string }[];
    amenityNames: string[];
  };
  reviews: {
    name: string;
    rating: number;
    body: string;
    stayedOn: string;
  }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": absoluteUrl(`/stays/${property.slug}#lodging`),
    name: property.name,
    description: property.description,
    url: absoluteUrl(`/stays/${property.slug}`),
    image: property.images.map((image) => image.url),
    address: {
      "@type": "PostalAddress",
      streetAddress: property.addressLine,
      addressLocality: property.city,
      addressRegion: property.state,
      addressCountry: SITE.country,
    },
    ...(property.latitude != null && property.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: property.latitude,
            longitude: property.longitude,
          },
        }
      : {}),
    ...(property.checkInFrom ? { checkinTime: property.checkInFrom } : {}),
    ...(property.checkOutBy ? { checkoutTime: property.checkOutBy } : {}),
    numberOfRooms: property.bedrooms,
    petsAllowed: property.amenityNames.includes("Pets allowed"),
    amenityFeature: property.amenityNames.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    priceRange: `₹${Math.round(property.basePriceNumber)}`,
    makesOffer: {
      "@type": "Offer",
      price: property.basePriceNumber,
      priceCurrency: SITE.currency,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/stays/${property.slug}`),
    },
    ...(property.rating !== null && property.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: property.rating.toFixed(2),
            reviewCount: property.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.name },
            datePublished: review.stayedOn.slice(0, 10),
            reviewBody: review.body,
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
