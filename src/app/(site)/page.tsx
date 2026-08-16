import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BadgeIndianRupee, HeartHandshake, MessageCircle, Quote, Sparkles,
  Star,
} from "lucide-react";
import { Hero } from "@/components/site/hero";
import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeading } from "@/components/site/section";
import { SiteHeader } from "@/components/site/site-header";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { getPropertyCards } from "@/lib/queries/properties";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { CATEGORIES, DESTINATIONS, JOURNAL_POSTS } from "../../../prisma/seed-data";

export const dynamic = "force-dynamic";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=80";

const PROMISES = [
  { icon: HeartHandshake, title: "Feel at home.", body: "Thoughtfully designed spaces." },
  { icon: Sparkles, title: "Stay worry-free.", body: "Clean, secure and professionally managed." },
  { icon: BadgeIndianRupee, title: "Book with confidence.", body: "Transparent pricing. No surprises." },
  { icon: MessageCircle, title: "Local, not generic.", body: "Stay where the city actually feels alive." },
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
  const [featured, reviews, ratingAgg, propertyCount, cheapest] = await Promise.all([
    getPropertyCards({ limit: 3 }),
    db.review.findMany({
      where: { rating: { gte: 4 } },
      include: {
        guest: { select: { name: true } },
        property: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.review.aggregate({ _avg: { rating: true }, _count: true }),
    db.property.count({ where: { status: "ACTIVE" } }),
    db.property.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { basePrice: "asc" },
      select: { basePrice: true },
    }),
  ]);

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-50">
        <SiteHeader transparent />
      </div>

      <main className="flex-1">
        <Hero
          image={HERO_IMAGE}
          stats={{
            homes: propertyCount,
            rating: ratingAgg._avg.rating,
            reviews: ratingAgg._count,
          }}
        />

        <Section tight>
          <Reveal>
            <SectionHeading
              eyebrow="Featured stays"
              title="Homes we're especially proud of"
              description={
                cheapest
                  ? `From ${formatINR(Number(cheapest.basePrice))} a night, across ${propertyCount} homes.`
                  : undefined
              }
              action={{ href: "/stays", label: "View all stays" }}
            />
          </Reveal>

          <div className="mt-7 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property, i) => (
              <Reveal key={property.slug} delay={i * 0.06}>
                <PropertyCard property={property} priority={i === 0} />
              </Reveal>
            ))}
          </div>
        </Section>

        <Section tight className="border-y border-border bg-muted/40">
          <Reveal>
            <SectionHeading eyebrow="Pick your vibe" title="What kind of stay is this?" />
          </Reveal>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((category, i) => (
              <Reveal key={category.slug} delay={i * 0.035}>
                <Link
                  href={`/stays?category=${category.slug}`}
                  className="group block overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 16vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <span className="absolute inset-x-2.5 bottom-2.5 text-[0.8125rem] font-medium leading-tight text-white">
                      {category.label}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section tight>
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <Reveal>
              <SectionHeading
                eyebrow="How it works"
                title="Booking takes about two minutes"
              />
              <Button
                render={<Link href="/stays" />}
                size="lg"
                className="mt-6 hidden lg:inline-flex"
              >
                Start looking
                <ArrowRight />
              </Button>
            </Reveal>

            <div className="grid gap-6 sm:grid-cols-3">
              {HOW_IT_WORKS.map((item, i) => (
                <Reveal key={item.step} delay={0.06 + i * 0.05}>
                  <p className="font-heading text-2xl text-brand-sage">{item.step}</p>
                  <h3 className="mt-2 text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>

        <Section tight className="border-y border-border bg-muted/40">
          <Reveal>
            <SectionHeading eyebrow="Why Lime Kraft" title="The short version" />
          </Reveal>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((promise, i) => (
              <Reveal key={promise.title} delay={i * 0.05}>
                <div className="h-full rounded-xl border border-border bg-card p-5">
                  <promise.icon className="size-4 text-brand-terracotta" />
                  <h3 className="mt-3.5 font-heading text-lg text-foreground">
                    {promise.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {promise.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section tight>
          <Reveal>
            <SectionHeading
              eyebrow="Destinations"
              title="Where we are in Indore"
              action={{ href: "/destinations", label: "All destinations" }}
            />
          </Reveal>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DESTINATIONS.slice(0, 3).map((destination, i) => (
              <Reveal key={destination.slug} delay={i * 0.05}>
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="group block overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={destination.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute inset-x-4 bottom-4">
                      <h3 className="font-heading text-xl text-white">
                        {destination.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-white/75">
                        {destination.blurb}
                      </p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section tight className="border-t border-border">
          <div className="overflow-hidden rounded-2xl bg-brand-green">
            <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:p-14">
              <Reveal>
                <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-white/50 uppercase">
                  Direct booking benefits
                </p>
                <h2 className="mt-2.5 font-heading text-[1.75rem] leading-[1.12] text-white sm:text-[2rem]">
                  Book direct. Get more.
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
                  The channels take fourteen to sixteen percent. When you book
                  with us, some of that comes back to you.
                </p>
                <Button
                  render={<Link href="/stays" />}
                  variant="accent"
                  size="lg"
                  className="mt-6"
                >
                  Browse stays
                  <ArrowRight />
                </Button>
              </Reveal>

              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {DIRECT_BENEFITS.map((benefit, i) => (
                  <Reveal key={benefit.title} delay={0.06 + i * 0.04}>
                    <h3 className="text-sm font-semibold text-white">
                      {benefit.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      {benefit.body}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {reviews.length > 0 && (
          <Section tight className="border-y border-border bg-muted/40">
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
            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {reviews.map((review, i) => (
                <Reveal key={review.id} delay={i * 0.05}>
                  <figure className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
                    <Quote className="size-4 text-brand-sage" />
                    <blockquote className="mt-3 flex-1">
                      {review.title && (
                        <span className="block font-heading text-lg text-foreground">
                          {review.title}
                        </span>
                      )}
                      <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                        {review.body}
                      </span>
                    </blockquote>
                    <figcaption className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-3.5 text-xs">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {review.guest.name}
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
                </Reveal>
              ))}
            </div>
          </Section>
        )}

        <Section tight>
          <Reveal>
            <SectionHeading
              eyebrow="Journal"
              title="Notes from the team"
              action={{ href: "/journal", label: "Read the journal" }}
            />
          </Reveal>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {JOURNAL_POSTS.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.05}>
                <Link href={`/journal/${post.slug}`} className="group block">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 label-eyebrow">{post.readMinutes} min read</p>
                  <h3 className="mt-1.5 font-heading text-lg leading-snug text-foreground">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {post.excerpt}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section tight className="border-t border-border">
          <Reveal>
            <div className="rounded-2xl border border-border bg-muted/40 px-6 py-12 text-center sm:px-12 sm:py-16">
              <h2 className="mx-auto max-w-md font-heading text-[1.75rem] leading-[1.12] text-foreground sm:text-[2.25rem]">
                Find your next stay.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {propertyCount} homes across Indore, each set up the way we'd want
                to arrive somewhere ourselves.
              </p>
              <Button render={<Link href="/stays" />} size="lg" className="mt-7">
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
