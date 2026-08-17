import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BadgeIndianRupee, HeartHandshake, MessageCircle, Quote, Sparkles,
  Star,
} from "lucide-react";
import { CategoryRail } from "@/components/site/category-rail";
import { Hero } from "@/components/site/hero";
import { ProofBar } from "@/components/site/proof-bar";
import { Reveal, RevealGroup } from "@/components/site/reveal";
import { Container, Section, SectionHeading } from "@/components/site/section";
import { SiteHeader } from "@/components/site/site-header";
import { FeaturedStay } from "@/components/property/featured-stay";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { getPropertyCards } from "@/lib/queries/properties";
import {
  getAreasByCity, getCities, getCollectionTargets,
} from "@/lib/queries/locations";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";
import { COLLECTIONS } from "@/lib/seo/collections";
import { SITE } from "@/lib/seo/site";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { CATEGORIES } from "../../../prisma/seed-data";

export const dynamic = "force-dynamic";

/**
 * The homepage inherited the root layout's generic title, which named no city
 * at all. The brand query is already ours; what this recovers is the
 * "<type> in <city>" phrasing people actually search, on the strongest page we
 * have — built from live inventory, so a new city appears here on its own.
 */
export async function generateMetadata(): Promise<Metadata> {
  const cities = await getCities().catch(() => []);
  const names = cities.map((c) => c.name);
  const where =
    names.length === 0
      ? "India"
      : names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;

  const title = `Villas, apartments & homes in ${where}`;
  const homes = cities.reduce((sum, c) => sum + c.propertyCount, 0);
  const minPrice = cities.reduce<number | null>(
    (low, c) =>
      c.minPrice === null ? low : low === null ? c.minPrice : Math.min(low, c.minPrice),
    null,
  );

  const description =
    homes > 0 && minPrice !== null
      ? `${homes} boutique serviced homes in ${where}, from ${formatINR(minPrice)} a night. Book direct with Lime Kraft — no channel mark-up, no booking fee, and a real person on WhatsApp throughout.`
      : SITE.description;

  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, url: "/", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Gandhi Hall, Indore — the Indo-Gothic clock-tower building on MG Road.
// Every image on this site is checked by actually looking at the photograph
// before it ships; the placeholders this replaced were captioned as Indore
// but showed Mumbai, Agra and London.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1754245646627-855c7da68bd1?auto=format&fit=crop&w=2400&q=80";

const PROMISES = [
  { icon: HeartHandshake, title: "Feel at home", body: "Thoughtfully designed spaces." },
  { icon: Sparkles, title: "Stay worry-free", body: "Clean, secure, professionally managed." },
  { icon: BadgeIndianRupee, title: "No surprises", body: "Transparent pricing, always." },
  { icon: MessageCircle, title: "Local, not generic", body: "Where the city feels alive." },
];

const DIRECT_BENEFITS = [
  { title: "Best available price", body: "We never undercut ourselves on the channels. Booking here is always at least as cheap." },
  { title: "Direct support", body: "Message a real person on the Lime Kraft team, not a call centre queue." },
  { title: "Flexible options", body: "Early check-in and late checkout are easier when we hold the booking." },
  { title: "Member perks", body: "Returning guests get priority on dates and occasional upgrades." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Find your dates", body: "Search by neighbourhood and dates. Booked nights are greyed out, so what you see is genuinely available." },
  { step: "02", title: "Book in three steps", body: "Dates, your details, payment. No account needed — we create one for you afterwards." },
  { step: "03", title: "Arrive and settle in", body: "Access details land three days before. Someone is on WhatsApp the whole way through." },
];

export default async function HomePage() {
  const [
    featured, cities, areasByCity, collectionTargets, reviews, ratingAgg,
    propertyCount, cheapest,
  ] =
    await Promise.all([
      getPropertyCards({ limit: 3 }),
      getCities(),
      getAreasByCity(),
      getCollectionTargets(),
      db.review.findMany({
        // Only published reviews belong on a public page — the model now has
        // pending and hidden states that this query predated.
        where: { rating: { gte: 4 }, status: "PUBLISHED" },
        include: {
          guest: { select: { name: true } },
          property: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.review.aggregate({
        where: { status: "PUBLISHED" },
        _avg: { rating: true },
        _count: true,
      }),
      db.property.count({ where: { status: "ACTIVE" } }),
      db.property.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { basePrice: "asc" },
        select: { basePrice: true },
      }),
    ]);

  const [hero, ...rest] = featured;
  const fromPrice = cheapest ? Number(cheapest.basePrice) : null;
  const locations = [...areasByCity.values()].map((entry) => ({
    city: entry.city,
    areas: entry.areas,
  }));

  // Ordered by inventory so the strongest pages get the most prominent link.
  const cityNameBySlug = new Map(cities.map((c) => [c.slug, c.name]));
  const collectionLinks = collectionTargets
    .filter((t) => t.kind !== "stays" && cityNameBySlug.has(t.citySlug))
    .sort((a, b) => b.count - a.count)
    .map((t) => ({
      href: `/${t.kind}-in-${t.citySlug}`,
      label: `${COLLECTIONS[t.kind].plural} in ${cityNameBySlug.get(t.citySlug)}`,
    }));

  return (
    <>
      <JsonLd data={[organizationJsonLd(cities), webSiteJsonLd()]} />

      {/* Rendered in flow, not in an absolutely positioned wrapper — the header
          is `sticky top-0`, and an absolute parent meant it scrolled away with
          the hero instead of sticking. The hero is pulled up by exactly the
          header's height so the photograph still runs under it. */}
      <SiteHeader transparent />

      <main className="flex-1">
        <div className="-mt-16 lg:-mt-18">
          <Hero
            image={HERO_IMAGE}
            locations={locations}
            cityNames={cities.map((c) => c.name)}
          />
        </div>

        {/* ── Featured: the page's first real argument ─────────────────── */}
        <Section size="feature">
          <Reveal>
            <SectionHeading
              size="feature"
              eyebrow="Featured stays"
              title="Homes we're especially proud of"
              description={
                fromPrice
                  ? `From ${formatINR(fromPrice)} a night, across ${propertyCount} homes we run ourselves.`
                  : undefined
              }
              action={{ href: "/stays", label: "View all stays" }}
            />
          </Reveal>

          {hero && (
            <Reveal className="mt-12">
              <FeaturedStay property={hero} />
            </Reveal>
          )}

          {rest.length > 0 && (
            <RevealGroup className="mt-14 grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {rest.map((property) => (
                <PropertyCard key={property.slug} property={property} />
              ))}
            </RevealGroup>
          )}
        </Section>

        <ProofBar
          homes={propertyCount}
          cities={cities.length}
          rating={ratingAgg._avg.rating}
          reviews={ratingAgg._count}
          fromPrice={fromPrice}
        />

        {/* ── Categories: a rail, not a six-up grid ────────────────────── */}
        <Section size="quiet" bleed>
          <Container>
            <Reveal>
              <SectionHeading
                size="quiet"
                eyebrow="Pick your vibe"
                title="What kind of stay is this?"
              />
            </Reveal>
          </Container>
          <div className="mt-6">
            <CategoryRail categories={CATEGORIES} />
          </div>
        </Section>

        {/* ── How it works, with the promises folded in as texture ─────── */}
        <Section className="border-t border-border">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <Reveal>
              <SectionHeading
                eyebrow="How it works"
                title="Booking takes about two minutes"
              />
              <Button
                render={<Link href="/stays" />}
                size="lg"
                className="mt-7 hidden lg:inline-flex"
              >
                Start looking
                <ArrowRight />
              </Button>
            </Reveal>

            <RevealGroup className="grid gap-8 sm:grid-cols-3">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step}>
                  <p className="font-display text-[2rem] text-brand-sage">
                    {item.step}
                  </p>
                  <h3 className="mt-3 text-[0.9375rem] font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </RevealGroup>
          </div>

          <RevealGroup className="mt-14 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-border pt-10 lg:grid-cols-4">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="flex gap-3">
                <promise.icon className="mt-0.5 size-4 shrink-0 text-brand-terracotta" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {promise.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {promise.body}
                  </p>
                </div>
              </div>
            ))}
          </RevealGroup>
        </Section>

        {/* ── Book direct: full-bleed, the one saturated moment ────────── */}
        <Section size="feature" bleed className="bg-brand-green">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <Reveal>
                <SectionHeading
                  size="feature"
                  tone="invert"
                  eyebrow="Direct booking benefits"
                  title={
                    <>
                      Book direct.
                      <br />
                      Get <em className="italic">more</em>.
                    </>
                  }
                  description="The channels take fourteen to sixteen percent. When you book with us, some of that comes back to you."
                />
                <Button
                  render={<Link href="/stays" />}
                  variant="accent"
                  size="lg"
                  className="mt-8"
                >
                  Browse stays
                  <ArrowRight />
                </Button>
              </Reveal>

              <RevealGroup className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
                {DIRECT_BENEFITS.map((benefit) => (
                  <div key={benefit.title}>
                    <h3 className="font-display-sm text-lg text-white">
                      {benefit.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                      {benefit.body}
                    </p>
                  </div>
                ))}
              </RevealGroup>
            </div>
          </Container>
        </Section>

        {/* ── Destinations: cities, derived from inventory ────────────── */}
        <Section>
          <Reveal>
            <SectionHeading
              eyebrow="Destinations"
              title={
                cities.length > 1 ? "Where you'll find us" : `Where we are in ${cities[0]?.name ?? "India"}`
              }
              description={
                cities.length > 1
                  ? `${propertyCount} homes across ${cities.length} cities, each one run by our own team.`
                  : undefined
              }
              action={{ href: "/destinations", label: "All destinations" }}
            />
          </Reveal>
          <RevealGroup className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/stays-in-${city.slug}`}
                className="group block overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted sm:aspect-[16/12]">
                  {city.image && (
                    <Image
                      src={city.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute inset-x-5 bottom-5">
                    <h3 className="font-display text-2xl text-white">
                      {city.name}
                    </h3>
                    <p className="mt-1.5 text-sm leading-snug text-white/75">
                      {city.propertyCount}{" "}
                      {city.propertyCount === 1 ? "home" : "homes"}
                      {city.minPrice !== null &&
                        ` · from ${formatINR(city.minPrice)} a night`}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </RevealGroup>
        </Section>

        {/* ── Popular searches ─────────────────────────────────────────────
            Not decoration: this is the homepage's link out to every page in
            the {type}×{city} matrix, which is how those pages get discovered
            and how authority reaches them from the strongest page we have. */}
        {collectionLinks.length > 0 && (
          <Section size="quiet" className="border-t border-border">
            <Reveal>
              <SectionHeading
                size="quiet"
                eyebrow="Popular searches"
                title="Jump straight to it"
              />
            </Reveal>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {collectionLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-brand-terracotta hover:text-brand-terracotta"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* ── Reviews ──────────────────────────────────────────────────── */}
        {reviews.length > 0 && (
          <Section id="reviews" className="border-y border-border bg-muted/40">
            <Reveal>
              <SectionHeading
                eyebrow="Guest reviews"
                title="What people say after"
                description={
                  ratingAgg._avg.rating
                    ? `${ratingAgg._avg.rating.toFixed(1)} average across ${ratingAgg._count} reviews.`
                    : undefined
                }
              />
            </Reveal>
            <RevealGroup className="mt-9 grid gap-5 lg:grid-cols-3">
              {reviews.map((review) => (
                <figure
                  key={review.id}
                  className="flex h-full flex-col rounded-2xl border border-border bg-card p-6"
                >
                  <Quote className="size-4 text-brand-terracotta" />
                  <blockquote className="mt-4 flex-1">
                    {review.title && (
                      <span className="block font-display-sm text-xl text-foreground">
                        {review.title}
                      </span>
                    )}
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                      {review.body}
                    </span>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4 text-xs">
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {/* Imported reviews carry no guest record and use the
                            display name captured at import instead. */}
                        {review.guest?.name ?? review.authorName ?? "Verified guest"}
                      </span>
                      {" · "}
                      <Link
                        href={`/stays/${review.property.slug}`}
                        className="hover:underline"
                      >
                        {review.property.name}
                      </Link>
                    </span>
                    <span
                      className="flex shrink-0 gap-0.5"
                      aria-label={`${review.rating} out of 5`}
                    >
                      {Array.from({ length: review.rating }).map((_, s) => (
                        <Star
                          key={s}
                          className="size-3 fill-brand-terracotta text-brand-terracotta"
                        />
                      ))}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </RevealGroup>
          </Section>
        )}

        {/* ── Closing CTA ──────────────────────────────────────────────── */}
        <Section size="feature">
          <Reveal>
            <div className="rounded-3xl border border-border bg-muted/40 px-6 py-16 text-center sm:px-12 sm:py-20">
              <h2 className="mx-auto max-w-lg font-display text-[2.25rem] text-foreground sm:text-[3rem]">
                Find your <em className="italic">next</em> stay.
              </h2>
              <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
                {propertyCount} homes across{" "}
                {cities.length > 1 ? `${cities.length} cities` : cities[0]?.name ?? "India"},
                each set up the way we&apos;d want to arrive somewhere ourselves.
              </p>
              <Button
                render={<Link href="/stays" />}
                size="xl"
                className="mt-8"
              >
                Explore all stays
                <ArrowRight />
              </Button>
            </div>
          </Reveal>
        </Section>
      </main>
    </>
  );
}
