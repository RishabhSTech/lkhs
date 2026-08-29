import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { FaqList, type Faq } from "@/components/site/faq-list";
import { LinkIndex, type IndexLink } from "@/components/site/link-index";
import { ProofBar } from "@/components/site/proof-bar";
import { Reveal } from "@/components/site/reveal";
import type { RailReview } from "@/components/site/review-rail";
import { Container, Section } from "@/components/site/section";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { AfterBeat } from "@/components/preview/after-beat";
import { CityStrip } from "@/components/preview/city-strip";
import { CloseBeat } from "@/components/preview/close-beat";
import { HomeBeat } from "@/components/preview/home-beat";
import { InsideBeat } from "@/components/preview/inside-beat";
import { LedgerBeat } from "@/components/preview/ledger-beat";
import { PreviewHero } from "@/components/preview/preview-hero";
import { StayThreadProvider } from "@/components/preview/stay-thread";
import type { CityBundle } from "@/components/preview/types";
import { getPropertyCards, getPropertyGallery } from "@/lib/queries/properties";
import {
  getAreasByCity, getCities, getCollectionTargets,
} from "@/lib/queries/locations";
import { JsonLd } from "@/components/seo/json-ld";
import { faqJsonLd, organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";
import { COLLECTIONS } from "@/lib/seo/collections";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";

/**
 * The narrative homepage, at a route of its own while it is being built.
 *
 * Everything here is inventory-wide and identical for every visitor, so it is
 * prerendered and refreshed in the background on the same cadence the live
 * homepage uses.
 */
export const revalidate = 300;

/**
 * Explicitly out of the index. This route renders substantially the same
 * content as `/`, and letting a search engine find both is how a redesign
 * ends up competing with the page it was meant to replace. The noindex comes
 * off in the same commit that makes this the homepage.
 */
export const metadata: Metadata = {
  title: "Homepage preview",
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

// Gandhi Hall, Indore. Every image on this site is checked by actually looking
// at the photograph before it ships.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1754245646627-855c7da68bd1?auto=format&fit=crop&w=2400&q=80";

/**
 * The three objections a first-time visitor has. They used to sit inside the
 * hero under the search control, which made five competing elements in one
 * viewport. Here they read as the first line of evidence rather than as a
 * fourth headline.
 */
const ASSURANCES = [
  {
    title: "No booking fee",
    body: "The price you see is the price. Nothing is added at the last step.",
  },
  {
    title: "Best price booked direct",
    body: "We hold the same rate everywhere, and the channels add their fee on top of it.",
  },
  {
    title: "A real person on WhatsApp",
    body: "Our own team runs these homes, so whoever answers can actually send someone round.",
  },
];

const FAQS: Faq[] = [
  {
    question: "Is it cheaper to book here than on a travel site?",
    answer:
      "It is never more expensive. We hold the same rate everywhere, and the travel sites add a service fee on top of it, so the direct price is the one without the mark-up. There is no booking fee here either.",
  },
  {
    question: "Do I need an account to book?",
    answer:
      "No. Pick your dates, enter your details, pay. We create your account afterwards so the booking, your invoice and any future stays are all in one place when you come back.",
  },
  {
    question: "When do I get the address and access details?",
    answer:
      "Three days before check-in, by message and email. If you need them sooner, for an early flight or a driver to brief, just ask and we will send them across.",
  },
  {
    question: "Are the photographs of the actual home?",
    answer:
      "Yes. Every image on a listing is shot inside the home you would be staying in. We do not use stock interiors or renders anywhere on this site.",
  },
  {
    question: "What if I need to cancel?",
    answer:
      "Each home sets its own policy and it is shown in full on the listing, before you pay, including the cancellation window and what is refunded. Nothing about it is buried in a terms page.",
  },
  {
    question: "Who do I talk to if something goes wrong during the stay?",
    answer:
      "Us. The homes are run by our own team rather than by individual hosts, so the person answering on WhatsApp can actually send someone round.",
  },
];

export default async function PreviewHomePage() {
  const [
    cities, areasByCity, collectionTargets, portfolioReviews, ratingAgg,
    propertyCount, cheapest,
  ] = await Promise.all([
    getCities(),
    getAreasByCity(),
    getCollectionTargets(),
    db.review.findMany({
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

  /**
   * One bundle per city, resolved here so the narrative can re-aim on a click
   * with no client fetch anywhere. Cities are few and this page is
   * prerendered, so the cost is a handful of build-time queries rather than
   * anything a visitor waits for.
   */
  const bundles: CityBundle[] = (
    await Promise.all(
      cities.map(async (city): Promise<CityBundle | null> => {
        // Ordered by price on the way out of the query, so the pick is made
        // here instead: the home that opens a city should be the one guests
        // rated best, not the one that happens to be cheapest.
        const candidates = await getPropertyCards({ city: city.name, limit: 8 });
        if (candidates.length === 0) return null;

        const home = [...candidates].sort(
          (a, b) =>
            (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount,
        )[0];

        const [gallery, review] = await Promise.all([
          getPropertyGallery(home.slug),
          db.review.findFirst({
            where: {
              status: "PUBLISHED",
              rating: { gte: 4 },
              property: { slug: home.slug },
            },
            include: {
              guest: { select: { name: true } },
              property: { select: { name: true, slug: true } },
            },
            orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
          }),
        ]);

        return {
          city: {
            slug: city.slug,
            name: city.name,
            state: city.state,
            propertyCount: city.propertyCount,
            minPrice: city.minPrice,
            areas: city.areas,
            image: city.image,
          },
          home,
          gallery,
          review: review && {
            id: review.id,
            title: review.title,
            body: review.body,
            rating: review.rating,
            author: review.guest?.name ?? review.authorName ?? "Verified guest",
            propertyName: review.property.name,
            propertySlug: review.property.slug,
          },
        };
      }),
    )
  )
    .filter((b): b is CityBundle => b !== null)
    // Busiest city first, which makes it the page's default subject.
    .sort((a, b) => b.city.propertyCount - a.city.propertyCount);

  const fromPrice = cheapest ? Number(cheapest.basePrice) : null;
  const locations = [...areasByCity.values()].map((entry) => ({
    city: entry.city,
    areas: entry.areas,
  }));

  const railReviews: RailReview[] = portfolioReviews.map((review) => ({
    id: review.id,
    title: review.title,
    body: review.body,
    rating: review.rating,
    author: review.guest?.name ?? review.authorName ?? "Verified guest",
    propertyName: review.property.name,
    propertySlug: review.property.slug,
  }));

  const cityNameBySlug = new Map(cities.map((c) => [c.slug, c.name]));
  const collectionLinks: IndexLink[] = collectionTargets
    .filter((t) => t.kind !== "stays" && cityNameBySlug.has(t.citySlug))
    .sort((a, b) => b.count - a.count)
    .map((t) => ({
      href: `/${t.kind}-in-${t.citySlug}`,
      label: `${COLLECTIONS[t.kind].plural} in ${cityNameBySlug.get(t.citySlug)}`,
      count: t.count,
    }));

  return (
    <>
      <JsonLd
        data={[organizationJsonLd(cities), webSiteJsonLd(), faqJsonLd(FAQS)]}
      />

      <SiteHeader transparent />

      <main className="flex-1">
        <div className="-mt-16 lg:-mt-18">
          <PreviewHero image={HERO_IMAGE} locations={locations} />
        </div>

        <ProofBar
          homes={propertyCount}
          cities={cities.length}
          rating={ratingAgg._avg.rating}
          reviews={ratingAgg._count}
          fromPrice={fromPrice}
        />

        {/* The three objections, answered on the way past. Ruled rather than
            carded: these are one line of evidence each, and three boxes here
            would out-shout the figures directly above them. */}
        <Section size="quiet" className="border-b border-border">
          <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-3">
            {ASSURANCES.map((item) => (
              <div key={item.title}>
                <dt className="text-[0.9375rem] font-semibold text-foreground">
                  {item.title}
                </dt>
                <dd className="copy mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {bundles.length > 0 ? (
          <StayThreadProvider bundles={bundles}>
            {/* ── The thread starts here ─────────────────────────────────
                Everything below reads the city chosen in this strip. */}
            <Section size="feature" bleed>
              <Container>
                <Reveal>
                  <h2 className="headline max-w-[18ch] font-display text-[clamp(2.25rem,4.4vw,3.5rem)] text-foreground">
                    Pick a city. We&apos;ll build the rest.
                  </h2>
                  <p className="copy mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                    {propertyCount} homes across {bundles.length}{" "}
                    {bundles.length === 1 ? "city" : "cities"}, each one run by
                    our own team rather than let out to individual hosts.
                    {fromPrice !== null && (
                      <> Rates start at {formatINR(fromPrice)} a night.</>
                    )}
                  </p>
                </Reveal>
              </Container>
              <div className="mt-9">
                <CityStrip />
              </div>
            </Section>

            <HomeBeat />
            <InsideBeat />
            <LedgerBeat />
            <AfterBeat portfolio={railReviews} />
            <CloseBeat homeCount={propertyCount} />
          </StayThreadProvider>
        ) : (
          <Section size="feature">
            <h2 className="headline max-w-[20ch] font-display text-[clamp(2.25rem,4.4vw,3.5rem)] text-foreground">
              New homes are on their way.
            </h2>
            <p className="copy mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Nothing is live in the booking system just yet. Tell us where you
              are headed and we will get in touch the moment there is somewhere
              to stay.
            </p>
            <Button
              render={<Link href="/contact" />}
              size="lg"
              className="mt-8"
            >
              Talk to us
              <ArrowRight />
            </Button>
          </Section>
        )}

        {/* ── Back matter ────────────────────────────────────────────────
            Deliberately outside the narrative. The questions and the link
            index are reference, not story, and numbering them into the arc
            above would claim an importance neither can cash. */}
        <Section size="feature" className="border-t border-border">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-16">
            <div>
              <h2 className="headline max-w-[16ch] font-display text-[clamp(1.75rem,2.8vw,2.375rem)] text-foreground">
                Straight answers.
              </h2>
              <p className="copy mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
                Everything below is how it actually works, not how we would like
                it to sound.
              </p>
              <div className="mt-8">
                <FaqList faqs={FAQS} />
              </div>
            </div>

            <div className="lg:pt-2">
              <MessageCircle className="size-5 text-brand-azure" />
              <p className="copy mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
                Not covered here? Ask us directly. A person on our team answers,
                usually within the hour.
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
          </div>
        </Section>

        {collectionLinks.length > 0 && (
          <Section size="quiet" className="border-t border-border">
            <p className="label-eyebrow text-muted-foreground">
              Popular searches
            </p>
            <div className="mt-7">
              <LinkIndex links={collectionLinks} />
            </div>
          </Section>
        )}
      </main>
    </>
  );
}
