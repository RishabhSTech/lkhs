"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Container, Section } from "@/components/site/section";
import { ReviewRail, type RailReview } from "@/components/site/review-rail";
import { useStayThread } from "@/components/preview/stay-thread";

/**
 * Beat six: what happened to people who did this?
 *
 * The last beat that answers to the selection. One guest, one home, set large
 * enough to actually be read, with the rest of the portfolio's reviews running
 * quietly underneath as breadth.
 *
 * A single pull quote rather than a grid of three. Three testimonial cards
 * side by side is the shape people have learned to skip, and it also forces
 * every quote down to the length of the shortest one. This gives the strongest
 * review the room to sound like a person.
 */

/** A landing-page quote is a snippet. Anything longer stops being read. */
const MAX_QUOTE = 240;

function trim(body: string): string {
  if (body.length <= MAX_QUOTE) return body;
  const cut = body.slice(0, MAX_QUOTE);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "));
  return lastStop > MAX_QUOTE * 0.5
    ? cut.slice(0, lastStop + 1)
    : `${cut.trimEnd()}...`;
}

export function AfterBeat({ portfolio }: { portfolio: RailReview[] }) {
  const { active } = useStayThread();
  const featured = active.review;

  // The rail carries everything except the quote already pulled out above it,
  // so the same review is never both the headline and a tile beside it.
  const rest = portfolio.filter((r) => r.id !== featured?.id);

  if (!featured && rest.length === 0) return null;

  return (
    <Section
      id="reviews"
      size="feature"
      bleed
      className="border-y border-border bg-brand-ivory"
    >
      <Container>
        <p className="label-eyebrow text-brand-azure">After the stay</p>

        {featured ? (
          <figure className="mt-6">
            <div
              aria-label={`Rated ${featured.rating} out of 5`}
              className="flex items-center gap-1"
            >
              {Array.from({ length: featured.rating }, (_, i) => (
                <Star
                  key={i}
                  aria-hidden
                  className="size-4 fill-brand-gold text-brand-gold"
                />
              ))}
            </div>
            <blockquote className="headline mt-5 max-w-[24ch] font-display text-[clamp(1.75rem,4vw,3rem)] text-brand-blue">
              &ldquo;{trim(featured.body)}&rdquo;
            </blockquote>
            <figcaption className="mt-7 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {featured.author}
              </span>
              <span>stayed at</span>
              <Link
                href={`/stays/${featured.propertySlug}`}
                className="font-medium text-brand-azure underline-offset-4 hover:underline"
              >
                {featured.propertyName}
              </Link>
            </figcaption>
          </figure>
        ) : (
          <h2 className="headline mt-6 max-w-[20ch] font-display text-[clamp(1.75rem,4vw,3rem)] text-brand-blue">
            What people say after.
          </h2>
        )}
      </Container>

      {rest.length > 0 && (
        <div className="mt-14">
          <ReviewRail reviews={rest} />
        </div>
      )}
    </Section>
  );
}
