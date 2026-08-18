"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion, useReducedMotion, useScroll, useTransform,
} from "framer-motion";
import {
  SearchPanel, type SearchLocation,
} from "@/components/site/search-panel";

/** Three claims, each one made good elsewhere on the page. */
const ASSURANCES = [
  "No booking fee",
  "Best price booked direct",
  "A real person on WhatsApp",
];

export function Hero({
  image,
  locations,
  cityNames,
}: {
  image: string;
  locations?: SearchLocation[];
  /** Where we currently operate, for the eyebrow. Never hard-coded. */
  cityNames: string[];
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Parallax: the photograph leaves at roughly four-fifths of the page's speed
  // and dims as it goes, so the section below arrives over it rather than
  // after it. Small numbers on purpose — anything larger reads as a broken
  // sticky header rather than depth.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const dim = useTransform(scrollYProgress, [0, 1], [0, 0.35]);

  // "Indore" → "Indore"; "Indore", "Goa" → "Indore & Goa"; four or more falls
  // back to a count so the line cannot run away as the portfolio grows.
  const where =
    cityNames.length === 0
      ? "India"
      : cityNames.length <= 3
        ? cityNames.slice(0, -1).join(", ") +
          (cityNames.length > 1 ? " & " : "") +
          cityNames[cityNames.length - 1]
        : `${cityNames.length} cities across India`;

  return (
    <section ref={ref} className="relative">
      <div className="relative flex h-[92svh] max-h-[56rem] min-h-[44rem] w-full flex-col overflow-hidden">
        {/* One slow settle on load — enough to feel alive, no looping drift —
            and the scroll parallax layered on top of it. */}
        <motion.div
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 14, ease: [0.16, 1, 0.3, 1] }}
          style={reduced ? undefined : { y }}
          // Deliberately oversized and hung above the frame: the parallax
          // translates this layer down by 12% of its own height, and without
          // the overflow that would drag a bare edge into the top of the hero.
          className="absolute inset-x-0 -top-[20%] h-[140%] will-change-transform"
        >
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_45%]"
          />
        </motion.div>

        {/* One scrim, not three. The old stack (floor + left anchor + top wash)
            was compensating for an un-art-directed photo and turned it to mud;
            a single multi-stop gradient does the same three jobs — dark floor
            for the copy, mid clearing so the image survives, light top wash for
            the transparent nav — while leaving the photograph legible. It is
            mixed toward the brand blue rather than neutral black, which is what
            makes a stock photograph look commissioned. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,20,45,0.88)_0%,rgba(6,20,45,0.64)_26%,rgba(6,20,45,0.12)_58%,rgba(6,20,45,0.44)_100%)]"
        />
        {/* Plus one anchor, shaped to the copy rather than to the whole frame.
            Gandhi Hall is mid-tone and heavily ornamented exactly where the
            headline sits, and a flat left-hand wash would have dulled the domes
            to get there. A radial pinned to the bottom-left corner darkens only
            the text block and falls off before it reaches the towers. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(115%_85%_at_0%_100%,rgba(6,20,45,0.74)_0%,rgba(6,20,45,0.36)_42%,transparent_72%)]"
        />
        {/* Deepens as the hero leaves, so the copy never fights the section
            scrolling in over it. */}
        <motion.div
          aria-hidden
          style={reduced ? undefined : { opacity: dim }}
          className="absolute inset-0 bg-brand-blue-deep"
        />
        {/* Dissolves the photograph into the page rather than cutting it off. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent"
        />

        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-5 pb-10 sm:px-6 lg:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <p className="flex items-center gap-2.5 text-[0.6875rem] font-semibold tracking-[0.2em] text-white/70 uppercase">
              <span
                aria-hidden
                className="inline-block h-px w-8 bg-brand-gold"
              />
              Boutique home stays · {where}
            </p>
            {/* Fluid rather than three fixed steps: the headline is the one
                element on the page allowed to fill the viewport, and clamp lets
                it do that continuously instead of jumping at two breakpoints. */}
            <h1 className="mt-4 max-w-[14ch] font-display text-[clamp(2.5rem,7.2vw,5.5rem)] text-white">
              Stay somewhere worth <em className="italic">remembering</em>.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">
              Beautiful homes, thoughtful spaces and stays made for feeling at
              home.
            </p>
          </motion.div>

          {/* Inside the hero, not hanging off its edge. This is the primary
              action on the page and it should look like it. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 lg:mt-12"
          >
            <SearchPanel locations={locations} />

            {/* The three objections a first-time visitor has, answered before
                they have to scroll to find out. Small on purpose: this is a
                reassurance under the control, not a fourth headline. */}
            <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-white/70">
              {ASSURANCES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-brand-gold"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
