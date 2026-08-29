import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, Bath, MapPin, Star, Users } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Gallery } from "@/components/property/gallery";
import { BookingCard } from "@/components/property/booking-card";
import { MobileBookingBar } from "@/components/property/mobile-booking-bar";
import { PlaceOffers } from "@/components/property/place-offers";
import { ListingHighlights } from "@/components/property/listing-highlights";
import { ThingsToKnow } from "@/components/property/things-to-know";
import { ReviewsSection } from "@/components/property/reviews/reviews-section";
import { Laurel } from "@/components/property/reviews/laurel";
import { getPropertyBySlug, getPropertySlugs } from "@/lib/queries/properties";
import { breadcrumbJsonLd, lodgingJsonLd } from "@/lib/seo/jsonld";
import { COLLECTIONS, kindForType } from "@/lib/seo/collections";
import { slugify } from "@/lib/seo/slug";

/**
 * Listings are prerendered and refreshed in the background. Nothing on this
 * page is per-visitor any more — availability and the live quote are fetched
 * by the booking card, and "Write a review" resolves after hydration — so
 * serving it per request meant repeating the same large query (every review
 * body, all images, amenities, pricing rules) for identical HTML.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getPropertySlugs().catch(() => []);
  return slugs.map((property) => ({ property }));
}

export async function generateMetadata({
  params,
}: PageProps<"/stays/[property]">): Promise<Metadata> {
  const { property: slug } = await params;
  const property = await getPropertyBySlug(slug).catch(() => null);
  if (!property) {
    return { title: "Stay not found", robots: { index: false, follow: false } };
  }

  // A listing's own name only wins the branded query. The type, size and city
  // are what let it also compete for "3 bedroom villa in Goa" — so they go in
  // the title, front-loaded, rather than being left to the description alone.
  const kind = kindForType(property.propertyType);
  const noun = kind ? COLLECTIONS[kind].singular.toLowerCase() : "stay";
  // Most of our names already contain their neighbourhood ("The Vijay Nagar
  // Residence"); repeating it reads as keyword stuffing and pushes the city
  // past where Google truncates.
  const place = property.name.toLowerCase().includes(property.locationArea.toLowerCase())
    ? property.city
    : `${property.locationArea}, ${property.city}`;

  const title = `${property.name} — ${property.bedrooms}-bedroom ${noun} in ${place}`;

  const description =
    property.tagline
      ? `${property.tagline}. Sleeps ${property.maxGuests} in ${property.locationArea}, ${property.city}. Book direct — no channel mark-up, no booking fee.`
      : property.description.slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical: `/stays/${property.slug}` },
    openGraph: {
      title,
      description,
      url: `/stays/${property.slug}`,
      images: property.images[0]?.url ? [property.images[0].url] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: property.images[0]?.url ? [property.images[0].url] : undefined,
    },
  };
}

export default async function PropertyPage({
  params,
}: PageProps<"/stays/[property]">) {
  const { property: slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const facts = [
    { icon: Users, label: `${property.maxGuests} guests` },
    { icon: BedDouble, label: `${property.bedrooms} bedrooms · ${property.beds} beds` },
    { icon: Bath, label: `${property.bathrooms} bathrooms` },
  ];

  // Routed through the city hub and its type page rather than through
  // `/stays`. Listings are where inbound links and shares land, so their
  // breadcrumb is the main path by which authority reaches the collection
  // pages — pointing it at the un-indexed search surface wasted that entirely.
  const citySlug = slugify(property.city);
  const kind = kindForType(property.propertyType);

  const trail = [
    { name: "Home", href: "/" },
    { name: "Destinations", href: "/destinations" },
    { name: property.city, href: `/stays-in-${citySlug}` },
    ...(kind
      ? [{ name: COLLECTIONS[kind].plural, href: `/${kind}-in-${citySlug}` }]
      : []),
    { name: property.name, href: `/stays/${property.slug}` },
  ];

  return (
    <>
      <SiteHeader />
      <JsonLd
        data={[
          breadcrumbJsonLd(trail),
          lodgingJsonLd({
            property: {
              ...property,
              amenityNames: property.offeredAmenities
                .filter((amenity) => !amenity.isUnavailable)
                .map((amenity) => amenity.name),
            },
            // Only the reviews the page actually renders get marked up.
            reviews: property.publicReviews.slice(0, 10),
          }),
        ]}
      />

      <main className="flex-1 pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6">
          <Breadcrumbs trail={trail} />
        </div>

        <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
          <Gallery images={property.images} propertyName={property.name} />
        </div>

        <div className="mx-auto mt-8 grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:mt-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
          <div className="min-w-0">
            <header>
              <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
                {property.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {property.locationArea}, {property.city}
                </span>
                {property.rating !== null && (
                  <a
                    href="#reviews"
                    className="flex items-center gap-1.5 text-foreground underline-offset-4 hover:underline"
                  >
                    <Star className="size-4 fill-brand-gold text-brand-gold" />
                    <span className="font-medium">
                      {property.rating.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      · {property.reviewCount} reviews
                    </span>
                  </a>
                )}
                {property.showGuestFavourite && (
                  <a
                    href="#reviews"
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 font-medium text-foreground"
                  >
                    <span className="flex h-4 items-center text-brand-azure">
                      <Laurel />
                      <Laurel flipped />
                    </span>
                    Guest favourite
                  </a>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-y border-border py-4">
                {facts.map((fact) => (
                  <span
                    key={fact.label}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <fact.icon className="size-4 text-brand-mist" />
                    {fact.label}
                  </span>
                ))}
              </div>
            </header>

            {property.highlights.length > 0 && (
              <section className="mt-7">
                <ListingHighlights highlights={property.highlights} />
              </section>
            )}

            <Prose title="Overview">
              {property.tagline && (
                <p className="font-heading text-xl leading-snug text-foreground">
                  {property.tagline}
                </p>
              )}
              <p className="mt-3 whitespace-pre-line">{property.description}</p>
            </Prose>

            <Prose title="What this place offers">
              <PlaceOffers amenities={property.offeredAmenities} />
            </Prose>

            <Prose title="Sleeping arrangements">
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: property.bedrooms }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <p className="font-medium text-foreground">Bedroom {i + 1}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <BedDouble className="size-3.5" />
                      {i === 0 ? "1 king bed" : "1 queen bed"}
                    </p>
                  </div>
                ))}
              </div>
            </Prose>

            <Prose title="Location">
              <p>{property.addressLine}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Exact address and access instructions are shared once your booking
                is confirmed.
              </p>
            </Prose>

          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <BookingCard
                propertyId={property.id}
                propertySlug={property.slug}
                basePrice={property.basePriceNumber}
                maxGuests={property.maxGuests}
              />
            </div>
          </aside>
        </div>

        {/* Reviews and Things to know run the full width of the page rather
            than the narrow content column: the rating breakdown is a
            seven-column strip and the closing block is three columns, and
            neither survives being squeezed beside the booking card. */}
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <section
            id="reviews"
            className="mt-12 scroll-mt-24 border-t border-border pt-10"
          >
            <h2 className="sr-only">
              Reviews{property.reviewCount > 0 && ` (${property.reviewCount})`}
            </h2>
            <ReviewsSection
              summary={property.reviewSummary}
              reviews={property.publicReviews}
              topics={property.reviewTopics}
              isGuestFavourite={property.showGuestFavourite}
              propertyId={property.id}
            />
          </section>

          <section className="mt-12 border-t border-border pt-10 pb-16">
            <h2 className="font-heading text-2xl text-foreground">
              Things to know
            </h2>
            <div className="mt-6">
              <ThingsToKnow
                items={property.thingsToKnow}
                fallbacks={{
                  HOUSE_RULES: property.houseRules,
                  CANCELLATION: property.cancellationPolicy,
                }}
              />
            </div>
          </section>
        </div>
      </main>

      <MobileBookingBar
        propertyId={property.id}
        propertySlug={property.slug}
        basePrice={property.basePriceNumber}
        maxGuests={property.maxGuests}
      />
    </>
  );
}

function Prose({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9 border-t border-border pt-8 first:border-0">
      <h2 className="font-heading text-2xl text-foreground">{title}</h2>
      <div className="mt-4 text-[0.9375rem] leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  );
}
