import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle } from "lucide-react";
import { CategoryRail } from "@/components/site/category-rail";
import { DirectSavings } from "@/components/site/direct-savings";
import { FaqList, type Faq } from "@/components/site/faq-list";
import { Hero } from "@/components/site/hero";
import { HowItWorks, type HowItWorksStep } from "@/components/site/how-it-works";
import { ProofBar } from "@/components/site/proof-bar";
import { Reveal, RevealGroup } from "@/components/site/reveal";
import { ReviewRail, type RailReview } from "@/components/site/review-rail";
import { Container, Section, SectionHeading } from "@/components/site/section";
import { SiteHeader } from "@/components/site/site-header";
import { Spotlight } from "@/components/site/spotlight";
import { FeaturedStay } from "@/components/property/featured-stay";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { getPropertyCards } from "@/lib/queries/properties";
import {
  getAreasByCity, getCities, getCollectionTargets,
} from "@/lib/queries/locations";
import { JsonLd } from "@/components/seo/json-ld";
import { faqJsonLd, organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";
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

const DIRECT_BENEFITS = [
  { title: "Best available price", body: "We never undercut ourselves on the channels. Booking here is always at least as cheap." },
  { title: "Direct support", body: "Message a real person on the Lime Kraft team, not a call centre queue." },
  { title: "Flexible options", body: "Early check-in and late checkout are easier when we hold the booking." },
  { title: "Member perks", body: "Returning guests get priority on dates and occasional upgrades." },
];

// Copy only — the photographs are attached below from live inventory, so these
// steps illustrate homes we actually run rather than stock interiors.
const STEPS: Omit<HowItWorksStep, "image">[] = [
  {
    title: "Find your dates",
    body: "Search by neighbourhood and dates. Booked nights are greyed out, so everything you can click on is genuinely available.",
    caption: "Live availability, straight from our own calendar.",
  },
  {
    title: "Book in three steps",
    body: "Dates, your details, payment. No account needed — we create one for you afterwards so your booking is waiting when you come back.",
    caption: "About two minutes, no sign-up wall.",
  },
  {
    title: "Arrive and settle in",
    body: "Access details land three days before you travel. Someone from our team is on WhatsApp the whole way through, including after you arrive.",
    caption: "Address and access, three days ahead.",
  },
];

const FAQS: Faq[] = [
  {
    question: "Is it cheaper to book here than on a travel site?",
    answer:
      "It is never more expensive. We hold the same rate everywhere, and the travel sites add a service fee on top of it — so the direct price is the one without the mark-up. There is no booking fee here either.",
  },
  {
    question: "Do I need an account to book?",
    answer:
      "No. Pick your dates, enter your details, pay. We create your account afterwards so the booking, your invoice and any future stays are all in one place when you come back.",
  },
  {
    question: "When do I get the address and access details?",
    answer:
      "Three days before check-in, by message and email. If you need them sooner — an early flight, a driver to brief — just ask and we will send them across.",
  },
  {
    question: "Are the photographs of the actual home?",
    answer:
      "Yes. Every image on a listing is shot inside the home you would be staying in. We do not use stock interiors or renders anywhere on this site.",
  },
  {
    question: "What if I need to cancel?",
    answer:
      "Each home sets its own policy and it is shown in full on the listing, before you pay — including the cancellation window and what is refunded. Nothing about it is buried in a terms page.",
  },
  {
    question: "Who do I talk to if something goes wrong during the stay?",
    answer:
      "Us. The homes are run by our own team rather than by individual hosts, so the person answering on WhatsApp can actually send someone round.",
  },
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
        // pending and hidden states that this query predated. The rail can
        // carry far more than the old three-up grid could.
        where: { rating: { gte: 4 }, status: "PUBLISHED" },
        include: {
          guest: { select: { name: true } },
          property: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 9,
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

  // The stepper wants three photographs. Live inventory first; the category
  // imagery only fills in when there are fewer than three active homes, which
  // is a state this page should still render properly in.
  const stepImages = [
    ...featured.map((p) => p.heroImage).filter(Boolean),
    ...CATEGORIES.map((c) => c.image),
  ];
  const steps: HowItWorksStep[] = STEPS.map((step, index) => ({
    ...step,
    image: stepImages[index],
  }));

  const railReviews: RailReview[] = reviews.map((review) => ({
    id: review.id,
    title: review.title,
    body: review.body,
    rating: review.rating,
    // Imported reviews carry no guest record and use the display name captured
    // at import instead.
    author: review.guest?.name ?? review.authorName ?? "Verified guest",
    propertyName: review.property.name,
    propertySlug: review.property.slug,
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
      <JsonLd
        data={[organizationJsonLd(cities), webSiteJsonLd(), faqJsonLd(FAQS)]}
      />

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

        {/* ── Proof, before inventory ──────────────────────────────────────
            Deliberately the first thing under the fold. Someone who has never
            heard of us decides whether we are real before they decide whether
            a particular home is nice. */}
        <ProofBar
          homes={propertyCount}
          cities={cities.length}
          rating={ratingAgg._avg.rating}
          reviews={ratingAgg._count}
          fromPrice={fromPrice}
        />

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

        {/* ── Categories: a rail, not a six-up grid ────────────────────── */}
        <Section size="quiet" bleed className="border-t border-border pt-14">
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

        {/* ── How it works, one step at a time ─────────────────────────── */}
        <Section size="feature">
          <Reveal>
            <SectionHeading
              size="feature"
              eyebrow="How it works"
              title={
                <>
                  Booking takes about <em className="italic">two minutes</em>.
                </>
              }
              description="No sign-up wall, no waiting on a confirmation, no phone number to call."
            />
          </Reveal>
          <Reveal className="mt-12">
            <HowItWorks steps={steps} />
          </Reveal>
        </Section>

        {/* ── Book direct: full-bleed, the one saturated moment ────────── */}
        <Section
          size="feature"
          bleed
          className="grain relative overflow-hidden bg-brand-blue"
        >
          {/* A single soft light source, top-right. A flat field this large is
              the difference between a brand colour and a background colour. */}
          <div
            aria-hidden
            className="absolute -top-40 -right-32 size-[38rem] rounded-full bg-brand-azure/25 blur-[120px]"
          />
          <Container className="relative z-[2]">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
              <div>
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
                    description="The channels take fourteen to sixteen percent. When you book with us, that stays between you and the home."
                  />
                </Reveal>

                <RevealGroup className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
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

              {/* The claim, made checkable. Only rendered when there is a real
                  home and a real rate to run it against. */}
              {hero && (
                <Reveal delay={0.1}>
                  <DirectSavings
                    property={{
                      name: hero.name,
                      slug: hero.slug,
                      basePrice: hero.basePrice,
                    }}
                  />
                </Reveal>
              )}
            </div>
          </Container>
        </Section>

        {/* ── Destinations: cities, derived from inventory ────────────── */}
        <Section size="feature">
          <Reveal>
            <SectionHeading
              eyebrow="Destinations"
              title={
                cities.length > 1
                  ? "Where you'll find us"
                  : `Where we are in ${cities[0]?.name ?? "India"}`
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
              <Spotlight key={city.slug} className="rounded-2xl">
                <Link
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
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/85 via-brand-ink/15 to-transparent" />
                    <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                      <div>
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
                      <span
                        aria-hidden
                        className="grid size-9 shrink-0 translate-y-1 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                      >
                        <ArrowUpRight className="size-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Spotlight>
            ))}
          </RevealGroup>
        </Section>

        {/* ── Reviews ──────────────────────────────────────────────────── */}
        {railReviews.length > 0 && (
          <Section
            id="reviews"
            size="feature"
            bleed
            className="border-y border-border bg-muted/50"
          >
            <Container>
              <Reveal>
                <SectionHeading
                  size="feature"
                  eyebrow="Guest reviews"
                  title="What people say after"
                  description={
                    ratingAgg._avg.rating
                      ? `${ratingAgg._avg.rating.toFixed(1)} average across ${ratingAgg._count} reviews, all left by guests who actually stayed.`
                      : undefined
                  }
                />
              </Reveal>
            </Container>
            <div className="mt-10">
              <ReviewRail reviews={railReviews} />
            </div>
          </Section>
        )}

        {/* ── The questions people ask before they trust a booking page ── */}
        <Section size="feature">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <Reveal>
              <SectionHeading
                eyebrow="Before you book"
                title="Straight answers"
              />
              <div className="mt-7 rounded-2xl border border-border bg-muted/50 p-6">
                <MessageCircle className="size-5 text-brand-azure" />
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
                  Not covered here? Ask us directly — a person on our team
                  answers, usually within the hour.
                </p>
                <Button
                  render={<Link href="/contact" />}
                  variant="outline"
                  size="sm"
                  className="mt-5"
                >
                  Talk to us
                  <ArrowRight />
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <FaqList faqs={FAQS} />
            </Reveal>
          </div>
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
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-brand-azure hover:text-brand-azure"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* ── Closing CTA ──────────────────────────────────────────────── */}
        <Section size="feature">
          <Reveal>
            <div className="grain relative overflow-hidden rounded-3xl bg-brand-blue px-6 py-16 text-center sm:px-12 sm:py-24">
              <div
                aria-hidden
                className="absolute -bottom-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-brand-azure/30 blur-[110px]"
              />
              <div className="relative z-[2]">
                <h2 className="mx-auto max-w-lg font-display text-[2.25rem] text-white sm:text-[3.25rem]">
                  Find your <em className="italic">next</em> stay.
                </h2>
                <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-white/70">
                  {propertyCount} homes across{" "}
                  {cities.length > 1
                    ? `${cities.length} cities`
                    : cities[0]?.name ?? "India"}
                  , each set up the way we&apos;d want to arrive somewhere
                  ourselves.
                </p>
                <Button
                  render={<Link href="/stays" />}
                  variant="accent"
                  size="xl"
                  className="mt-9"
                >
                  Explore all stays
                  <ArrowRight />
                </Button>
              </div>
            </div>
          </Reveal>
        </Section>
      </main>
    </>
  );
}
