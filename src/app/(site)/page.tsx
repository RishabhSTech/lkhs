import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, HeartHandshake, MessageCircle, Sparkles, Star } from "lucide-react";
import { Hero } from "@/components/site/hero";
import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeading } from "@/components/site/section";
import { SiteHeader } from "@/components/site/site-header";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { getPropertyCards } from "@/lib/queries/properties";
import { db } from "@/lib/db";
import { CATEGORIES, DESTINATIONS } from "../../../prisma/seed-data";

export const dynamic = "force-dynamic";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=80";

const PROMISES = [
  {
    icon: HeartHandshake,
    title: "Feel at home.",
    body: "Thoughtfully designed spaces.",
  },
  {
    icon: Sparkles,
    title: "Stay worry-free.",
    body: "Clean, secure and professionally managed.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Book with confidence.",
    body: "Transparent pricing. No surprises.",
  },
  {
    icon: MessageCircle,
    title: "Local, not generic.",
    body: "Stay where the city actually feels alive.",
  },
];

const DIRECT_BENEFITS = [
  {
    title: "Best available price",
    body: "We never undercut ourselves on the channels. Booking here is always at least as cheap.",
  },
  {
    title: "Direct support",
    body: "Message a real person on the Lime Kraft team, not a call centre queue.",
  },
  {
    title: "Flexible options",
    body: "Early check-in and late checkout are easier to arrange when we hold the booking.",
  },
  {
    title: "Member perks",
    body: "Returning guests get priority on dates and occasional upgrades.",
  },
];

export default async function HomePage() {
  const [featured, reviews] = await Promise.all([
    getPropertyCards({ limit: 3 }),
    db.review.findMany({
      where: { rating: { gte: 4 } },
      include: { guest: { select: { name: true } }, property: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-50">
        <SiteHeader transparent />
      </div>

      <main className="flex-1">
        <Hero image={HERO_IMAGE} />

        <Section>
          <Reveal>
            <SectionHeading
              eyebrow="Featured stays"
              title="Homes we're especially proud of"
              description="Every Lime Kraft home is set up, styled and maintained by our own team."
              action={{ href: "/stays", label: "View all stays" }}
            />
          </Reveal>

          <div className="mt-9 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property, i) => (
              <Reveal key={property.slug} delay={i * 0.07}>
                <PropertyCard property={property} priority={i === 0} />
              </Reveal>
            ))}
          </div>
        </Section>

        <Section className="bg-white">
          <Reveal>
            <SectionHeading
              eyebrow="Pick your vibe"
              title="What kind of stay is this?"
            />
          </Reveal>
          <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((category, i) => (
              <Reveal key={category.slug} delay={i * 0.04}>
                <Link
                  href={`/stays?category=${category.slug}`}
                  className="group block overflow-hidden rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 16vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/75 via-brand-ink/10 to-transparent" />
                    <span className="absolute inset-x-3 bottom-3 font-heading text-base leading-tight text-white">
                      {category.label}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section>
          <Reveal>
            <SectionHeading eyebrow="Why Lime Kraft" title="The short version" />
          </Reveal>
          <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((promise, i) => (
              <Reveal key={promise.title} delay={i * 0.06}>
                <div className="h-full rounded-xl border border-border bg-white p-6">
                  <promise.icon className="size-5 text-brand-terracotta" />
                  <h3 className="mt-4 font-heading text-xl text-brand-green">
                    {promise.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {promise.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section className="bg-white">
          <Reveal>
            <SectionHeading
              eyebrow="Destinations"
              title="Where we are in Indore"
              action={{ href: "/destinations", label: "All destinations" }}
            />
          </Reveal>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DESTINATIONS.slice(0, 3).map((destination, i) => (
              <Reveal key={destination.slug} delay={i * 0.06}>
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="group block overflow-hidden rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="relative aspect-[16/11] overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={destination.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/80 via-brand-ink/15 to-transparent" />
                    <div className="absolute inset-x-5 bottom-5">
                      <h3 className="font-heading text-2xl text-white">
                        {destination.name}
                      </h3>
                      <p className="mt-1 text-sm text-white/80">
                        {destination.blurb}
                      </p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section>
          <div className="overflow-hidden rounded-2xl bg-brand-green">
            <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:p-16">
              <Reveal>
                <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-brand-sage uppercase">
                  Direct booking benefits
                </p>
                <h2 className="mt-3 font-heading text-3xl leading-tight text-white sm:text-4xl">
                  Book direct. Get more.
                </h2>
                <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-brand-ivory/70">
                  The channels take fourteen to sixteen percent. When you book
                  with us, some of that comes back to you.
                </p>
                <Button
                  render={<Link href="/stays" />}
                  variant="accent"
                  size="lg"
                  className="mt-7"
                >
                  Browse stays
                  <ArrowRight />
                </Button>
              </Reveal>

              <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {DIRECT_BENEFITS.map((benefit, i) => (
                  <Reveal key={benefit.title} delay={0.08 + i * 0.05}>
                    <h3 className="font-sans text-sm font-semibold text-white">
                      {benefit.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-brand-ivory/65">
                      {benefit.body}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {reviews.length > 0 && (
          <Section className="bg-white">
            <Reveal>
              <SectionHeading eyebrow="Guest reviews" title="What people say after" />
            </Reveal>
            <div className="mt-9 grid gap-5 lg:grid-cols-3">
              {reviews.map((review, i) => (
                <Reveal key={review.id} delay={i * 0.06}>
                  <figure className="flex h-full flex-col rounded-xl border border-border bg-brand-ivory p-6">
                    <div
                      className="flex gap-0.5"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {Array.from({ length: review.rating }).map((_, s) => (
                        <Star
                          key={s}
                          className="size-3.5 fill-brand-terracotta text-brand-terracotta"
                        />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-brand-ink">
                      {review.title && (
                        <span className="block font-heading text-lg text-brand-green">
                          {review.title}
                        </span>
                      )}
                      <span className="mt-2 block text-muted-foreground">
                        {review.body}
                      </span>
                    </blockquote>
                    <figcaption className="mt-5 text-xs text-muted-foreground">
                      <span className="font-medium text-brand-ink">
                        {review.guest.name}
                      </span>{" "}
                      · {review.property.name}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </Section>
        )}

        <Section>
          <Reveal>
            <div className="rounded-2xl border border-border bg-white px-6 py-14 text-center sm:px-12 sm:py-20">
              <h2 className="mx-auto max-w-lg font-heading text-3xl leading-tight text-brand-green sm:text-5xl">
                Find your next stay.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
                Five homes across Indore, each one set up the way we'd want to
                arrive somewhere ourselves.
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
