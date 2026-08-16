import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, BedDouble, Bath, CalendarX2, MapPin, ShieldCheck, Star, Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Gallery } from "@/components/property/gallery";
import { BookingCard } from "@/components/property/booking-card";
import { MobileBookingBar } from "@/components/property/mobile-booking-bar";
import { AmenityList } from "@/components/property/amenity-list";
import { getPropertyBySlug, getPropertySlugs } from "@/lib/queries/properties";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await getPropertySlugs().catch(() => []);
  return slugs.map((property) => ({ property }));
}

export async function generateMetadata({
  params,
}: PageProps<"/stays/[property]">): Promise<Metadata> {
  const { property: slug } = await params;
  const property = await getPropertyBySlug(slug).catch(() => null);
  if (!property) return { title: "Stay not found" };

  return {
    title: property.name,
    description: property.tagline ?? property.description.slice(0, 155),
    alternates: { canonical: `/stays/${property.slug}` },
    openGraph: {
      title: property.name,
      description: property.tagline ?? undefined,
      images: property.images[0]?.url ? [property.images[0].url] : undefined,
      type: "website",
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.name,
    description: property.description,
    image: property.images.map((i) => i.url),
    address: {
      "@type": "PostalAddress",
      streetAddress: property.addressLine,
      addressLocality: property.city,
      addressRegion: property.state,
      addressCountry: "IN",
    },
    priceRange: `₹${property.basePriceNumber}`,
    ...(property.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: property.rating.toFixed(1),
            reviewCount: property.reviewCount,
          },
        }
      : {}),
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6">
          <Link
            href="/stays"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to stays
          </Link>
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
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Star className="size-4 fill-brand-terracotta text-brand-terracotta" />
                    <span className="font-medium">{property.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      · {property.reviewCount} reviews
                    </span>
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-y border-border py-4">
                {facts.map((fact) => (
                  <span
                    key={fact.label}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <fact.icon className="size-4 text-brand-sage" />
                    {fact.label}
                  </span>
                ))}
              </div>
            </header>

            <Prose title="Overview">
              {property.tagline && (
                <p className="font-heading text-xl leading-snug text-foreground">
                  {property.tagline}
                </p>
              )}
              <p className="mt-3 whitespace-pre-line">{property.description}</p>
            </Prose>

            <Prose title="Amenities">
              <AmenityList amenities={property.amenities.map((a) => a.amenity)} />
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

            {property.houseRules && (
              <Prose title="House rules">
                <p className="whitespace-pre-line">{property.houseRules}</p>
              </Prose>
            )}

            {property.cancellationPolicy && (
              <Prose title="Cancellation policy">
                <p className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-sage" />
                  <span>{property.cancellationPolicy}</span>
                </p>
              </Prose>
            )}

            <Prose title={`Reviews${property.reviewCount ? ` (${property.reviewCount})` : ""}`}>
              {property.reviews.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarX2 className="size-4" />
                  No reviews yet — this home is new to the collection.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {property.reviews.slice(0, 6).map((review) => (
                    <figure
                      key={review.id}
                      className="rounded-lg border border-border bg-card p-5"
                    >
                      <div
                        className="flex gap-0.5"
                        aria-label={`${review.rating} out of 5`}
                      >
                        {Array.from({ length: review.rating }).map((_, s) => (
                          <Star
                            key={s}
                            className="size-3.5 fill-brand-terracotta text-brand-terracotta"
                          />
                        ))}
                      </div>
                      {review.title && (
                        <p className="mt-3 font-heading text-lg text-foreground">
                          {review.title}
                        </p>
                      )}
                      <blockquote className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {review.body}
                      </blockquote>
                      <figcaption className="mt-4 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {review.guest.name}
                        </span>{" "}
                        · {formatDateLong(review.createdAt)}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
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
