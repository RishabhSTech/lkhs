"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion, useReducedMotion, useScroll, useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/section";
import { cn } from "@/lib/utils";
import { useStayThread } from "@/components/preview/stay-thread";

/**
 * Beat four: what is it like in there?
 *
 * The page's one saturated moment, and the only place it changes theme. You
 * are indoors now, so the ground goes dark, once, and then never again. A
 * page that flips between light and dark repeatedly does not read as
 * atmosphere, it reads as two websites.
 *
 * Scroll drives lateral movement through the rooms: the frame pins, and the
 * track pans. That is the one animation on this page that is doing real
 * narrative work rather than decorating an entrance, because moving through a
 * house is literally what the section is about.
 *
 * Built on `position: sticky` and a scroll-linked transform rather than GSAP.
 * ScrollTrigger would be a new dependency and several tens of kilobytes to
 * translate one flex track sideways, which `useScroll` already does without
 * a scroll listener anywhere.
 */

/** Past this the pan outstays its welcome and the page feels held hostage. */
const MAX_PANELS = 6;

export function InsideBeat() {
  const { active } = useStayThread();
  const wrap = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const panels = active.gallery.slice(0, MAX_PANELS);
  const count = panels.length;

  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start start", "end end"],
  });

  // Each panel is exactly 78vw with no gap between tracks, so the distance
  // from the first panel to the last is exactly (count - 1) / count of the
  // track's own width. Any gap utility here would silently break that
  // identity and leave the last photograph short of the frame.
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", `-${count > 1 ? ((count - 1) / count) * 100 : 0}%`],
  );

  if (count === 0) return null;

  return (
    // `overflow-x-clip`, never `overflow-hidden`. An ancestor with
    // `overflow: hidden` becomes the scroll container for any `sticky`
    // descendant, and a container with no scrollable overflow simply never
    // pins: the track scrolls away at the top and leaves the rest of the
    // wrapper empty. `clip` does not establish a scroll container, so it
    // still contains the pan horizontally without breaking the pin.
    <section className="grain relative overflow-x-clip bg-brand-blue-deep">
      <Container className="relative z-[2] pt-20 lg:pt-28">
        <p className="label-eyebrow text-white/55">Step inside</p>
        <h2 className="headline mt-2.5 max-w-[16ch] font-display text-[clamp(2.25rem,4.4vw,3.5rem)] text-white">
          What it&apos;s like <em className="italic">in there</em>.
        </h2>
        <p className="copy mt-4 max-w-md text-base leading-relaxed text-white/60">
          Every room of {active.home.name}, in the order you would walk them.
        </p>
      </Container>

      <div
        ref={wrap}
        // The wrapper's height is the pan's scroll budget: one viewport to pin
        // in, then 70vh per remaining panel, which lands close to a one-to-one
        // feel between scroll travelled and photograph travelled.
        //
        // Two cases opt out and share the same plain un-pinned frame: reduced
        // motion, and a home with a single photograph, which has nothing to pan
        // to and whose wrapper would end up shorter than its own sticky child
        // (a wrapper with no scrollable overflow never pins). Only the height
        // and the overflow differ, so there is no second tree to hydrate.
        style={
          reduced || count < 2
            ? undefined
            : { height: `${100 + (count - 1) * 70}vh` }
        }
        className={cn(
          "relative z-[2] mt-10 lg:mt-14",
          (reduced || count < 2) && "h-auto",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            reduced || count < 2
              ? "overflow-x-auto px-5 pb-6 sm:px-6"
              : "sticky top-0 h-[100dvh] overflow-hidden",
          )}
        >
          <motion.div
            style={reduced || count < 2 ? undefined : { x }}
            className={cn(
              "flex",
              !reduced && count >= 2 && "will-change-transform",
            )}
          >
            {panels.map((image, i) => (
              <figure
                key={image.id}
                className={cn(
                  "shrink-0",
                  reduced || count < 2 ? "w-[82vw] max-w-[34rem]" : "w-[78vw]",
                )}
              >
                {/* The padding lives inside the panel rather than as a gap on
                    the track, so the track's width stays exactly count * 78vw
                    and the percentage transform above stays exact. A `gap`
                    utility here would silently leave the last photograph short
                    of the frame. */}
                <div className="px-3 sm:px-5">
                  <div className="relative h-[46vh] overflow-hidden rounded-xl bg-white/5 sm:h-[58vh]">
                    <Image
                      src={image.url}
                      alt={image.alt ?? `${active.home.name}, room ${i + 1}`}
                      fill
                      sizes="80vw"
                      className="object-cover"
                    />
                  </div>
                  {image.alt && (
                    <figcaption className="mt-3 text-[0.8125rem] text-white/50">
                      {image.alt}
                    </figcaption>
                  )}
                </div>
              </figure>
            ))}
          </motion.div>
        </div>
      </div>

      <Container className="relative z-[2] pb-20 lg:pb-28">
        <Button
          render={<Link href={`/stays/${active.home.slug}`} />}
          variant="accent"
          size="lg"
        >
          See the whole home
          <ArrowRight />
        </Button>
      </Container>
    </section>
  );
}
