import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { PropertyCard } from "@/components/property/property-card";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/seo/json-ld";
import { getPropertyCards } from "@/lib/queries/properties";
import { getCityBySlug } from "@/lib/queries/locations";
import { breadcrumbJsonLd, collectionJsonLd } from "@/lib/seo/jsonld";
import { slugify } from "@/lib/seo/slug";
import { formatINR } from "@/lib/format";
import { DESTINATIONS } from "../../../../../prisma/seed-data";

/** Prerendered from `DESTINATIONS`, refreshed in the background. */
export const revalidate = 300;

/**
 * The slug set comes from a code constant, so it is fully known at build time
 * and cannot grow between deploys. Closing it off is what makes an unknown
 * neighbourhood a real 404 rather than a soft one: `notFound()` can only ever
 * return 200, because by the time it is thrown the response has started
 * streaming and the status is already sent. `dynamicParams = false` is decided
 * during routing instead, before any rendering, so Next can still set a 404 —
 * verified against a built server.
 *
 * Next never re-runs `generateStaticParams` during revalidation, so this is
 * only safe on a route whose params are static. That is exactly this one, and
 * not the routes whose params come from the database: closing those off would
 * turn every newly-published listing into a 404 until the next deploy.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ slug: d.slug }));
}

/**
 * These are neighbourhood pages. A slug that names a *city* is a different
 * thing entirely and already has a canonical home at `/stays-in-<city>`, so it
 * is redirected rather than served here — two URLs describing the same city
 * would split their own ranking signals.
 */
async function resolve(slug: string) {
  const city = await getCityBySlug(slug).catch(() => null);
  if (city) permanentRedirect(`/stays-in-${city.slug}`);
  return DESTINATIONS.find((d) => d.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/destinations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const destination = await resolve(slug);
  if (!destination) {
    return {
      title: "Destination not found",
      robots: { index: false, follow: false },
    };
  }

  // The neighbourhood alone is too thin a query to compete for; the city is
  // what disambiguates it. "Stays in Assagao, Goa" also matches how people
  // actually type a neighbourhood search.
  const properties = await getPropertyCards({
    area: destination.name,
    city: destination.city,
  }).catch(() => []);

  const title = `Stays in ${destination.name}, ${destination.city}`;
  const minPrice = properties.length
    ? Math.min(...properties.map((p) => p.basePrice))
    : null;

  return {
    title,
    description:
      minPrice !== null
        ? `${properties.length} ${properties.length === 1 ? "home" : "homes"} in ${destination.name}, ${destination.city} from ${formatINR(minPrice)} a night. ${destination.blurb} Book direct — no channel mark-up.`
        : destination.blurb,
    alternates: { canonical: `/destinations/${destination.slug}` },
    // An empty neighbourhood page is a thin page. Keep it crawlable for its
    // links but out of the index until it has something to show.
    ...(properties.length === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description: destination.blurb,
      url: `/destinations/${destination.slug}`,
      type: "website",
      images: [destination.image],
    },
    twitter: { card: "summary_large_image", title, description: destination.blurb },
  };
}

export default async function DestinationPage({
  params,
}: PageProps<"/destinations/[slug]">) {
  const { slug } = await params;
  const destination = await resolve(slug);
  if (!destination) notFound();

  // Scoped by city as well as area: area names are only unique within a city,
  // and an unscoped match would pull another city's homes onto this page.
  const properties = await getPropertyCards({
    area: destination.name,
    city: destination.city,
  });

  const citySlug = slugify(destination.city);

  // Sibling neighbourhoods in the same city. Without these the page is a leaf:
  // a crawler arrives, sees a handful of listings and has nowhere lateral to
  // go, so the rest of the city's areas are only ever reachable from one place.
  const siblings = DESTINATIONS.filter(
    (d) => d.city === destination.city && d.slug !== destination.slug,
  );

  const trail = [
    { name: "Home", href: "/" },
    { name: "Destinations", href: "/destinations" },
    { name: destination.city, href: `/stays-in-${citySlug}` },
    { name: destination.name, href: `/destinations/${destination.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(trail),
          collectionJsonLd({
            name: `Stays in ${destination.name}, ${destination.city}`,
            description: destination.blurb,
            path: `/destinations/${destination.slug}`,
            properties,
          }),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <div className="relative h-64 sm:h-80">
          <Image
            src={destination.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/80 to-brand-ink/25" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
              <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-white/70 uppercase">
                {destination.city}
              </p>
              <h1 className="mt-2 font-heading text-4xl leading-tight text-white sm:text-5xl">
                {destination.name}
              </h1>
              <p className="mt-2 max-w-lg text-sm text-white/80">
                {destination.blurb}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <Breadcrumbs trail={trail} />

          <h2 className="mt-6 font-heading text-2xl text-foreground">
            {properties.length} {properties.length === 1 ? "home" : "homes"} in{" "}
            {destination.name}
          </h2>

          {properties.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="No homes here yet"
              description={`We're still looking in this neighbourhood. Every other ${destination.city} home is one click away.`}
              action={{
                href: `/stays-in-${citySlug}`,
                label: `All stays in ${destination.city}`,
              }}
            />
          ) : (
            <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, i) => (
                <PropertyCard
                  key={property.slug}
                  property={property}
                  priority={i < 3}
                />
              ))}
            </div>
          )}

          {siblings.length > 0 && (
            <div className="mt-14 border-t border-border pt-10">
              <h2 className="font-heading text-xl text-foreground">
                Other parts of {destination.city}
              </h2>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {siblings.map((sibling) => (
                  <Link
                    key={sibling.slug}
                    href={`/destinations/${sibling.slug}`}
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-brand-azure hover:text-brand-azure"
                  >
                    {sibling.name}
                  </Link>
                ))}
              </div>

              <Link
                href={`/stays-in-${citySlug}`}
                className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-brand-azure"
              >
                All stays in {destination.city}
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
