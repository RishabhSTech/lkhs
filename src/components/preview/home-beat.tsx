"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BedDouble, MapPin, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/site/section";
import { formatINR } from "@/lib/format";
import { useStayThread } from "@/components/preview/stay-thread";

/**
 * Beat three: which home?
 *
 * The first beat that answers to the selection above it. Choosing a different
 * city changes the subject of this section outright, which is the moment the
 * page stops being a list and starts being an argument about one place.
 *
 * The photograph cross-fades on a key change rather than flying out of the
 * city tile that was clicked. A genuine shared-element move across two
 * sections means animating an element the length of the viewport once the
 * source has scrolled away, and it reads as a bug at every scroll position
 * except the one it was tuned at. A clean cut into a fade says the same thing
 * and says it at every scroll position.
 */
export function HomeBeat() {
  const { active } = useStayThread();
  const reduced = useReducedMotion();
  const { home, city } = active;

  return (
    <Section size="feature">
      <h2 className="headline max-w-[18ch] font-display text-[clamp(2.25rem,4.4vw,3.5rem)] text-foreground">
        Start with{" "}
        <em className="italic">
          {/* Keyed so the city name re-enters with the photograph below it.
              The two are the same fact and should move together. */}
          <motion.span
            key={city.slug}
            // `initial={false}` renders straight at the animate state, which
            // is how this degrades under reduced motion without needing a
            // second element tree to hydrate against.
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
          >
            {city.name}
          </motion.span>
        </em>
        .
      </h2>

      <motion.div
        key={home.slug}
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-12"
      >
        <Link
          href={`/stays/${home.slug}`}
          className="group block overflow-hidden rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            {home.heroImage && (
              <Image
                src={home.heroImage}
                alt={home.name}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            )}
          </div>
        </Link>

        {/* Set as a ruled column, not a card. The photograph is already a
            rectangle with a border; putting the facts inside a second one
            beside it makes the pair read as two search results. */}
        <div className="flex flex-col justify-center">
          <h3 className="font-display text-[clamp(1.75rem,2.6vw,2.25rem)] text-foreground">
            {home.name}
          </h3>

          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {home.locationArea}, {home.city}
          </p>

          <dl className="mt-7 grid grid-cols-2 gap-y-5 border-t border-border pt-6">
            <div>
              <dt className="text-[0.8125rem] text-muted-foreground">
                From
              </dt>
              <dd className="mt-1 font-display text-2xl text-brand-blue tabular-nums">
                {formatINR(home.basePrice)}
              </dd>
            </div>
            {home.rating !== null && (
              <div>
                <dt className="text-[0.8125rem] text-muted-foreground">
                  Rated
                </dt>
                <dd className="mt-1 flex items-baseline gap-1.5 font-display text-2xl text-brand-blue tabular-nums">
                  <Star
                    aria-hidden
                    className="size-4 shrink-0 translate-y-0.5 fill-brand-gold text-brand-gold"
                  />
                  {home.rating.toFixed(1)}
                  <span className="text-[0.8125rem] font-normal text-muted-foreground">
                    ({home.reviewCount})
                  </span>
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              Sleeps {home.maxGuests}
            </span>
            <span className="flex items-center gap-1.5">
              <BedDouble className="size-3.5" />
              {home.bedrooms} {home.bedrooms === 1 ? "bedroom" : "bedrooms"}
            </span>
          </p>

          {home.amenityNames.length > 0 && (
            <p className="copy mt-3 text-sm leading-relaxed text-muted-foreground/85">
              {home.amenityNames.slice(0, 5).join(", ")}
            </p>
          )}

          <Button
            render={<Link href={`/stays/${home.slug}`} />}
            size="lg"
            className="mt-8 w-full sm:w-auto sm:self-start"
          >
            See this home
            <ArrowRight />
          </Button>
        </div>
      </motion.div>

      {/* The other homes in the same city, named rather than tiled. This is a
          beat about one place, and a second grid of cards here would undo
          that in exchange for links the catalogue already carries. */}
      {city.propertyCount > 1 && (
        <Container className="mt-10 px-0 sm:px-0">
          <p className="copy text-sm text-muted-foreground">
            {city.propertyCount - 1} more{" "}
            {city.propertyCount - 1 === 1 ? "home" : "homes"} in {city.name}
            {city.areas.length > 0 && <>, around {city.areas.slice(0, 3).join(", ")}</>}
            .{" "}
            <Link
              href={`/stays-in-${city.slug}`}
              className="font-medium text-brand-azure underline-offset-4 hover:underline"
            >
              See all of them
            </Link>
          </p>
        </Container>
      )}
    </Section>
  );
}
