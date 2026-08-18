import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { EmptyState } from "@/components/site/empty-state";
import { FaqList, type Faq } from "@/components/site/faq-list";
import { Reveal, RevealGroup } from "@/components/site/reveal";
import { Section, SectionHeading } from "@/components/site/section";
import { JsonLd } from "@/components/seo/json-ld";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { getCollection } from "@/lib/queries/locations";
import { COLLECTIONS, parseCollectionSlug } from "@/lib/seo/collections";
import {
  breadcrumbJsonLd, collectionJsonLd, faqJsonLd,
} from "@/lib/seo/jsonld";
import { slugify } from "@/lib/seo/slug";
import { formatINR } from "@/lib/format";
import { DESTINATIONS } from "../../../../prisma/seed-data";

/**
 * The whole SEO matrix — `/villas-in-indore`, `/apartments-in-goa`,
 * `/stays-in-<anywhere-we-open-next>` — is served by this one route, so a new
 * city needs a property rather than a deploy.
 *
 * Deliberately no `generateStaticParams`. Because this segment matches any
 * single path token, prerendering makes Next serve *unmatched* slugs from the
 * static cache too — `/totally-made-up` came back as a cached **200** carrying
 * the not-found body, which is a soft 404 and exactly what Google penalises.
 * Rendering per request keeps `notFound()` a real 404. Nothing is lost: these
 * pages are discovered through the sitemap and internal links, not through
 * being prerendered, and their prices and availability are live data anyway.
 */
export const dynamic = "force-dynamic";

async function load(collectionSlug: string) {
  const parsed = parseCollectionSlug(collectionSlug);
  if (!parsed) return null;
  const data = await getCollection(parsed.citySlug, parsed.kind).catch(() => null);
  if (!data) return null;
  return { ...parsed, data };
}

export async function generateMetadata({
  params,
}: PageProps<"/[collection]">): Promise<Metadata> {
  const { collection } = await params;
  const loaded = await load(collection);
  if (!loaded) return { title: "Not found", robots: { index: false, follow: false } };

  const { kind, data } = loaded;
  const spec = COLLECTIONS[kind];
  const city = data.city.name;
  const count = data.properties.length;

  // Title carries the exact query plus a differentiator, and stays inside the
  // ~60 characters Google renders before truncating.
  const title = `${spec.plural} in ${city} — ${count} to book direct`;
  // "1 villas in Goa" is what an unattended template looks like, and it goes
  // straight into the search snippet.
  const noun = (count === 1 ? spec.singular : spec.plural).toLowerCase();
  const description =
    count > 0 && data.minPrice !== null
      ? `${count} ${noun} in ${city} from ${formatINR(data.minPrice)} a night. ${
          data.rating !== null
            ? `Rated ${data.rating.toFixed(1)}/5 by ${data.reviewCount} guests. `
            : ""
        }Book direct — no channel mark-up, no booking fee.`
      : `${spec.plural} in ${city} from Lime Kraft Home Stays. Book direct for the best available price.`;

  const path = `/${kind}-in-${data.city.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    // Spread rather than assign: setting `robots: undefined` *overrides* the
    // root metadata with nothing, which silently drops the inherited
    // `max-image-preview:large` and `max-snippet:-1` that these pages benefit
    // from most. Omitting the key entirely is what inherits it.
    ...(count === 0
      ? // Nothing to show yet — keep it out of the index, but let its links
        // still be crawled.
        { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      images: data.properties[0]?.heroImage
        ? [data.properties[0].heroImage]
        : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function buildFaqs(
  kind: keyof typeof COLLECTIONS,
  data: NonNullable<Awaited<ReturnType<typeof getCollection>>>,
): Faq[] {
  const spec = COLLECTIONS[kind];
  const city = data.city.name;
  const noun = spec.plural.toLowerCase();
  const count = data.properties.length;
  const areas = data.city.areas;

  const faqs: Faq[] = [];

  if (count > 0 && data.minPrice !== null && data.maxPrice !== null) {
    faqs.push({
      question: `How much do ${noun} in ${city} cost per night?`,
      answer:
        data.minPrice === data.maxPrice
          ? `Our ${noun} in ${city} are ${formatINR(data.minPrice)} a night. Longer stays are cheaper per night, and the rate you see includes everything except the one-off cleaning fee shown at checkout.`
          : `Our ${noun} in ${city} run from ${formatINR(data.minPrice)} to ${formatINR(data.maxPrice)} a night depending on the home and the dates. Weekends cost more, long stays cost less per night, and the price never changes between search and checkout.`,
    });
  }

  faqs.push({
    question: `Is it cheaper to book ${noun} in ${city} direct?`,
    answer: `Yes. The booking channels take fourteen to sixteen percent, and we never undercut ourselves on them — booking on this site is always at least as cheap as anywhere else you will find us, and there is no booking fee on top.`,
  });

  if (areas.length > 0) {
    faqs.push({
      question: `Which parts of ${city} are your ${noun} in?`,
      answer: `${areas.slice(0, 6).join(", ")}${areas.length > 6 ? " and more" : ""}. Each listing shows its neighbourhood, and the ${city} page groups every home by area so you can pick the side of the city that suits your trip.`,
    });
  }

  faqs.push({
    question: `What is included in a Lime Kraft ${spec.singular.toLowerCase()}?`,
    answer: `Every home is fully furnished with fast Wi-Fi, air conditioning, power backup, a stocked kitchen and fresh linen. Homes are professionally cleaned between guests and checked before each arrival.`,
  });

  faqs.push({
    question: `How does check-in work?`,
    answer: `Access details arrive three days before you travel. Check-in is self-service, so late arrivals are not a problem, and someone from the team is reachable on WhatsApp throughout your stay.`,
  });

  faqs.push({
    question: `Can I book ${noun} in ${city} for a long stay?`,
    answer: `Yes — stays of a week or more are priced lower per night automatically, and monthly stays are common in our ${city} homes. Search your dates to see the exact total before you commit.`,
  });

  return faqs;
}

export default async function CollectionPage({
  params,
}: PageProps<"/[collection]">) {
  const { collection } = await params;
  const loaded = await load(collection);
  if (!loaded) notFound();

  const { kind, data } = loaded;
  const spec = COLLECTIONS[kind];
  const city = data.city;
  const count = data.properties.length;
  const heading = `${spec.plural} in ${city.name}`;
  const path = `/${kind}-in-${city.slug}`;

  const trail = [
    { name: "Home", href: "/" },
    { name: "Destinations", href: "/destinations" },
    ...(kind === "stays"
      ? [{ name: city.name, href: `/stays-in-${city.slug}` }]
      : [
          { name: city.name, href: `/stays-in-${city.slug}` },
          { name: spec.plural, href: path },
        ]),
  ];

  const faqs = buildFaqs(kind, data);

  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({
            name: heading,
            description: spec.intro.replace("{city}", city.name),
            path,
            properties: data.properties,
          }),
          breadcrumbJsonLd(trail),
          faqJsonLd(faqs),
        ]}
      />

      <SiteHeader />

      <main className="flex-1">
        <div className="border-b border-border bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:py-14">
            <Breadcrumbs trail={trail} />

            <h1 className="mt-6 font-display text-[2.25rem] text-foreground sm:text-[3rem]">
              {heading}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {spec.intro.replace("{city}", city.name)}
            </p>

            {count > 0 && data.minPrice !== null && (
              <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">{count}</span>{" "}
                  {count === 1 ? spec.singular.toLowerCase() : spec.plural.toLowerCase()}
                </span>
                <span>
                  from{" "}
                  <span className="font-semibold text-foreground">
                    {formatINR(data.minPrice)}
                  </span>{" "}
                  a night
                </span>
                {data.rating !== null && data.reviewCount > 0 && (
                  <span>
                    <span className="font-semibold text-foreground">
                      {data.rating.toFixed(1)}/5
                    </span>{" "}
                    from {data.reviewCount} reviews
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <Section>
          {count > 0 ? (
            <RevealGroup className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {data.properties.map((property, i) => (
                <PropertyCard
                  key={property.slug}
                  property={property}
                  priority={i < 3}
                />
              ))}
            </RevealGroup>
          ) : (
            <EmptyState
              title={`No ${spec.plural.toLowerCase()} in ${city.name} just yet`}
              description={`We are still adding to our ${city.name} collection. In the meantime, every other home in ${city.name} is one click away.`}
              action={{ href: `/stays-in-${city.slug}`, label: `All stays in ${city.name}` }}
            />
          )}
        </Section>

        {/* Areas: the query "villas in <area>" is a real one, and these links
            are how a crawler reaches the per-area pages at all. */}
        {city.areas.length > 0 && (
          <Section size="quiet" className="border-t border-border">
            <Reveal>
              <SectionHeading
                size="quiet"
                eyebrow="By neighbourhood"
                title={`Where our ${city.name} homes are`}
              />
            </Reveal>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {city.areas.map((area) => {
                // Prefer the indexable editorial page for this neighbourhood.
                // Falling back to `/stays?area=` is fine for a reader, but that
                // URL carries `noindex`, so sending every area link there would
                // dead-end the crawl at the exact point it should be branching.
                const areaSlug = slugify(area);
                // Matched on city as well as slug: neighbourhood slugs are
                // only unique within a city, so a slug-only match would send
                // a Goa area to another city's editorial page.
                const hasPage = DESTINATIONS.some(
                  (d) => d.slug === areaSlug && d.city === city.name,
                );
                return (
                  <Link
                    key={area}
                    href={
                      hasPage
                        ? `/destinations/${areaSlug}`
                        : `/stays?area=${encodeURIComponent(area)}`
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-brand-azure hover:text-brand-azure"
                  >
                    <MapPin className="size-3.5" />
                    {area}
                  </Link>
                );
              })}
            </div>
          </Section>
        )}

        {/* Sibling collections: every page in a city links to every other, so
            crawl equity does not dead-end wherever discovery happened to start. */}
        {data.siblings.length > 0 && (
          <Section size="quiet" className="border-t border-border">
            <Reveal>
              <SectionHeading
                size="quiet"
                eyebrow="More in this city"
                title={`Other ways to stay in ${city.name}`}
              />
            </Reveal>
            <RevealGroup className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.siblings.map((sibling) => (
                <Link
                  key={sibling.href}
                  href={sibling.href}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-brand-azure/50"
                >
                  <span>
                    <span className="block font-display-sm text-lg text-foreground">
                      {sibling.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {sibling.count} {sibling.count === 1 ? "home" : "homes"}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </RevealGroup>
          </Section>
        )}

        <Section className="border-t border-border">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <Reveal>
              <SectionHeading
                eyebrow="Good to know"
                title={`${spec.plural} in ${city.name}, answered`}
              />
              <Button
                render={<Link href="/contact" />}
                variant="outline"
                size="lg"
                className="mt-7 hidden lg:inline-flex"
              >
                Ask us anything
              </Button>
            </Reveal>
            <Reveal>
              <FaqList faqs={faqs} />
            </Reveal>
          </div>
        </Section>
      </main>
    </>
  );
}
