import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { CategoryRail } from "@/components/site/category-rail";
import { DestinationGrid } from "@/components/site/destination-grid";
import { DirectSavings } from "@/components/site/direct-savings";
import { FaqList, type Faq } from "@/components/site/faq-list";
import { Hero } from "@/components/site/hero";
import { HowItWorks, type HowItWorksStep } from "@/components/site/how-it-works";
import { LinkIndex, type IndexLink } from "@/components/site/link-index";
import { ProofBar } from "@/components/site/proof-bar";
import { Reveal, RevealGroup } from "@/components/site/reveal";
import { ReviewRail, type RailReview } from "@/components/site/review-rail";
import { Container, Section, SectionHeading } from "@/components/site/section";
import { SiteHeader } from "@/components/site/site-header";
import { FeaturedStay } from "@/components/property/featured-stay";
import { RoomTour } from "@/components/property/room-tour";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import {
  getPropertyCards, getPropertyGallery,
} from "@/lib/queries/properties";
import {
  getAreasByCity, getCities, getCollectionTargets,
} from "@/lib/queries/locations";
import { JsonLd } from "@/components/seo/json-ld";
import { faqJsonLd, organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";
import { COLLECTIONS } from "@/lib/seo/collections";
import { pendingCities } from "@/lib/seo/upcoming";
import { SITE } from "@/lib/seo/site";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { CATEGORIES } from "../../../prisma/seed-data";

/**
 * Prerendered and refreshed in the background. Every figure here — the homes,
 * the cities, the rating, the cheapest nightly price — is inventory-wide and
 * identical for every visitor, so this page was running seven queries per
 * request to produce the same HTML each time.
 */
export const revalidate = 300;

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

  // Serial on purpose: the gallery is keyed by the featured home's slug, which
  // is only known once the query above has resolved. One extra round trip on a
  // prerendered page is cheaper than fetching every property's photographs to
  // avoid it.
  const gallery = hero ? await getPropertyGallery(hero.slug) : [];
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
  // The count travels with the link now: the index below prints it, which is
  // what turns a list of keywords into a statement about what exists.
  const cityNameBySlug = new Map(cities.map((c) => [c.slug, c.name]));
  const collectionLinks: IndexLink[] = collectionTargets
    .filter((t) => t.kind !== "stays" && cityNameBySlug.has(t.citySlug))
    .sort((a, b) => b.count - a.count)
    .map((t) => ({
      href: `/${t.kind}-in-${t.citySlug}`,
      label: `${COLLECTIONS[t.kind].plural} in ${cityNameBySlug.get(t.citySlug)}`,
      count: t.count,
    }));

  const where =
    cities.length > 1
      ? `${cities.length} cities`
      : (cities[0]?.name ?? "India");

  // Cities we have announced but cannot sell yet. Filtered against live
  // inventory, so the moment the first Goa listing goes ACTIVE this returns
  // empty and the real, bookable Goa card takes the tile.
  const upcoming = pendingCities(cities);
  const opening = upcoming.map((c) => c.name);

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
        {/* ── Masthead figures, before inventory ───────────────────────────
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

        {/* ── 01 · Featured: the page's first real argument ──────────────
            The heading runs `aside` and the one below it runs `stack`, and so
            on down the page. Eight identical eyebrow-title-description blocks
            in the same corner of the same container is what made the old page
            read as a list of sections rather than as an argument, and no
            amount of copy fixes a shape problem. */}
        <Section size="feature">
          <Reveal>
            <SectionHeading
              index="01"
              layout="aside"
              size="feature"
              eyebrow="Featured stays"
              title="Homes we're especially proud of"
              description={
                fromPrice
                  ? `From ${formatINR(fromPrice)} a night, across ${propertyCount} homes we run ourselves — every one of them staffed, cleaned and answered for by our own team.`
                  : undefined
              }
              action={{ href: "/stays", label: "View all stays" }}
            />
          </Reveal>

          {hero && (
            <Reveal className="mt-12 lg:mt-16">
              <FeaturedStay property={hero} />
            </Reveal>
          )}

          {rest.length > 0 && (
            <RevealGroup className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 sm:items-start lg:mt-20">
              {rest.map((property, i) => (
                <div
                  key={property.slug}
                  // The second card drops half a step. Two cards pinned to the
                  // same baseline is the shape of a search result; staggering
                  // them keeps the pair reading as an editor's pick, and it
                  // gives the eye somewhere to go after the featured panel.
                  className={i === 1 ? "lg:mt-16" : undefined}
                >
                  <PropertyCard property={property} />
                </div>
              ))}
            </RevealGroup>
          )}
        </Section>

        {/* ── 02 · Step inside ─────────────────────────────────────────────
            The featured section above establishes that a home exists and what
            it costs. It cannot tell you what being in it is like, which is the
            thing actually being decided. The arc is built from CSS 3D — real
            perspective on flat photographic planes, composited on the GPU, no
            renderer shipped to the page to draw what amounts to five quads. */}
        {hero && gallery.length > 1 && (
          <Section size="feature">
            <Reveal>
              <SectionHeading
                index="02"
                size="feature"
                eyebrow="Step inside"
                title={
                  <>
                    What it&apos;s like <em className="italic">in there</em>.
                  </>
                }
                description={`Every room of ${hero.name}, in perspective — drag, swipe or use the arrow keys to move through the house.`}
              />
            </Reveal>
            <Reveal className="mt-12 lg:mt-14">
              <RoomTour
                images={gallery}
                propertyName={hero.name}
                propertySlug={hero.slug}
              />
            </Reveal>
          </Section>
        )}

        {/* ── 03 · Destinations: cities, derived from inventory ───────────
            Plus anywhere we have announced but cannot sell yet. Those come
            from `lib/seo/upcoming`, are filtered against live inventory, and
            are drawn as an announcement rather than as a card — no count, no
            rate, no link to an empty search. Saying "Goa is coming" is worth
            far more than saying nothing, and it costs nothing in trust so long
            as the tile never pretends to be bookable. */}
        <Section size="feature">
          <Reveal>
            <SectionHeading
              index="03"
              layout="aside"
              size="feature"
              eyebrow="Destinations"
              title={
                cities.length > 1
                  ? "Where you'll find us"
                  : `Where we are in ${cities[0]?.name ?? "India"}`
              }
              description={
                // Three sentences at most, and the last one only exists when
                // there is genuinely a city on the way.
                [
                  cities.length > 1
                    ? `${propertyCount} homes across ${cities.length} cities, each one run by our own team rather than let out to individual hosts.`
                    : cities.length === 1
                      ? `${propertyCount} ${propertyCount === 1 ? "home" : "homes"} in ${cities[0].name}, run by our own team rather than let out to individual hosts.`
                      : null,
                  opening.length > 0
                    ? `${opening.join(" and ")} ${opening.length === 1 ? "is" : "are"} opening next, and the dates go on sale here before they go anywhere else.`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              action={{ href: "/destinations", label: "All destinations" }}
            />
          </Reveal>
          <Reveal className="mt-10 lg:mt-14">
            <DestinationGrid cities={cities} upcoming={upcoming} />
          </Reveal>
        </Section>

        {/* ── Sub-beat, deliberately unnumbered ────────────────────────────
            A rail of six links to filtered search is texture, not a chapter,
            and giving it its own number in the spine claimed an importance it
            cannot cash. It reads far better as the second way into the same
            question the destinations grid above just asked. */}
        <Section size="quiet" bleed>
          <Container>
            <Reveal>
              <p className="label-eyebrow text-brand-azure">Or pick a vibe</p>
              {/* An h3: this is subordinate to the destinations heading it
                  sits under, and the outline should say so. */}
              <h3 className="headline mt-2.5 font-display text-[1.5rem] text-foreground sm:text-[1.75rem]">
                What kind of stay is this?
              </h3>
            </Reveal>
          </Container>
          <div className="mt-7">
            <CategoryRail categories={CATEGORIES} />
          </div>
        </Section>

        {/* ── 04 · Book direct ────────────────────────────────────────────
            The page's one saturated moment, and now genuinely the only one.
            The closing band used to run the same brand-blue field with the
            same grain and the same azure bloom, which meant the page's most
            important argument and its sign-off were competing for the same
            emphasis and neither one won. The close is set in type instead. */}
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
                    index="04"
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
                      <p className="copy mt-1.5 text-sm leading-relaxed text-white/60">
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

        {/* ── 05 · Reviews ─────────────────────────────────────────────── */}
        {railReviews.length > 0 && (
          <Section
            id="reviews"
            size="feature"
            bleed
            className="border-y border-border bg-brand-ivory"
          >
            <Container>
              <Reveal>
                <SectionHeading
                  index="05"
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

        {/* ── 06 · How it works ───────────────────────────────────────────
            Demoted from third to seventh. A process explainer is the lowest
            intent content on the page — nobody arrives wanting to read how
            booking works — and it was sitting above the inventory, the dates
            and the reviews that people actually came for. It belongs here,
            where someone has decided and wants to know what happens next. */}
        <Section size="feature">
          <Reveal>
            <SectionHeading
              index="06"
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
          <Reveal className="mt-12 lg:mt-16">
            <HowItWorks steps={steps} />
          </Reveal>
        </Section>

        {/* ── 07 · The questions people ask before they trust a page ───── */}
        <Section size="feature">
          <Reveal>
            <SectionHeading
              index="07"
              layout="aside"
              eyebrow="Before you book"
              title="Straight answers"
              description="Everything below is how it actually works, not how we would like it to sound."
            />
          </Reveal>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-16">
            <Reveal>
              <FaqList faqs={FAQS} />
            </Reveal>

            {/* Moved to the right and reduced to a note. As a bordered card on
                the left it was the first thing in the section, which put a
                prompt to go and ask us ahead of the six answers that would
                have stopped most people needing to. */}
            <Reveal delay={0.08} className="lg:pt-2">
              {/* Not sticky: `Reveal` animates a transform, and a transformed
                  ancestor is a containing block, so a sticky child inside one
                  jitters against its own parent while the reveal runs. */}
              <div>
                <MessageCircle className="size-5 text-brand-azure" />
                <p className="copy mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
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
          </div>
        </Section>

        {/* ── Back matter ─────────────────────────────────────────────────
            Unnumbered on purpose: the spine above indexes the argument, and
            this is the index at the back of it. Not decoration either — this
            is the homepage's link out to every page in the {type}×{city}
            matrix, which is how those pages get discovered and how authority
            reaches them from the strongest page we have. */}
        {collectionLinks.length > 0 && (
          <Section size="quiet" className="border-t border-border">
            <Reveal>
              <SectionHeading
                size="quiet"
                eyebrow="Popular searches"
                title="Jump straight to it"
              />
            </Reveal>
            <Reveal className="mt-7">
              <LinkIndex links={collectionLinks} />
            </Reveal>
          </Section>
        )}

        {/* ── Closing: set in type, not in a coloured box ────────────────
            The old close was a rounded brand-blue panel with grain and a bloom
            — the same three devices as section 04, at three-quarters the size.
            Repeating a page's loudest treatment is how you make it quiet. This
            says the same thing at the scale of the hero headline and lets the
            whitespace do the shouting. */}
        <Section size="feature">
          <Reveal>
            <p className="label-eyebrow text-brand-azure">Ready when you are</p>
            <h2 className="headline mt-5 max-w-[16ch] font-display text-[clamp(2.75rem,7.5vw,5.5rem)] text-brand-blue">
              Find your <em className="italic">next</em> stay.
            </h2>
            <div className="mt-10 flex flex-col gap-8 border-t border-border pt-8 sm:flex-row sm:items-end sm:justify-between lg:mt-14">
              <p className="copy max-w-sm text-base leading-relaxed text-muted-foreground">
                {propertyCount} homes across {where}, each set up the way we&apos;d
                want to arrive somewhere ourselves.
              </p>
              <Button
                render={<Link href="/stays" />}
                size="xl"
                className="w-full shrink-0 sm:w-auto"
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
