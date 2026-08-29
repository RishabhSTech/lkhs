"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/site/section";
import { useStayThread } from "@/components/preview/stay-thread";

/**
 * Beat seven: go.
 *
 * The page stops moving before it asks for the click. No animation here at
 * all, and no coloured panel either: the close is set at the scale of the
 * hero headline and lets the whitespace do the work. Repeating the page's
 * loudest treatment at three-quarters size, which is what the old closing
 * band did, is how you make a page's last word quiet.
 *
 * The button is the payoff for everything above it. It is not a generic link
 * to the catalogue; it goes to the exact home the visitor has been reading
 * about since they picked a city.
 */
export function CloseBeat({ homeCount }: { homeCount: number }) {
  const { active, bundles } = useStayThread();
  const { home, city } = active;

  const where = bundles.length > 1 ? `${bundles.length} cities` : city.name;

  return (
    <Section size="feature">
      <h2 className="headline max-w-[16ch] font-display text-[clamp(2.75rem,7.5vw,5.5rem)] text-brand-blue">
        Your stay is <em className="italic">ready</em>.
      </h2>

      <div className="mt-10 flex flex-col gap-8 border-t border-border pt-8 sm:flex-row sm:items-end sm:justify-between lg:mt-14">
        <p className="copy max-w-sm text-base leading-relaxed text-muted-foreground">
          {home.name} in {city.name}, one of {homeCount} homes across {where},
          each set up the way we would want to arrive somewhere ourselves.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            render={<Link href={`/stays/${home.slug}`} />}
            size="xl"
            className="w-full shrink-0 sm:w-auto"
          >
            Book {home.name}
            <ArrowRight />
          </Button>
          <Button
            render={<Link href="/stays" />}
            variant="outline"
            size="xl"
            className="w-full shrink-0 sm:w-auto"
          >
            See every home
          </Button>
        </div>
      </div>
    </Section>
  );
}
