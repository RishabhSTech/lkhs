"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion, useReducedMotion, useScroll, useTransform,
} from "framer-motion";
import {
  SearchPanel, type SearchLocation,
} from "@/components/site/search-panel";

/**
 * Beat one: where are you going?
 *
 * Three text elements and the search control, and nothing else. The version
 * this replaces also carried an eyebrow naming the cities and a row of three
 * gold-dotted assurances, which made five things competing inside one
 * viewport. The assurances now sit in the figure band below, where they read
 * as evidence rather than as a fourth headline; the city list is the whole
 * subject of the beat directly underneath, so saying it twice bought nothing.
 *
 * The scrim work and the parallax are carried over unchanged. They were the
 * best thing about the old hero and there was no argument for redoing them.
 */
export function PreviewHero({
  image,
  locations,
}: {
  image: string;
  locations?: SearchLocation[];
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // The photograph leaves at roughly four-fifths of the page's speed and dims
  // as it goes, so the beat below arrives over it rather than after it. Small
  // numbers on purpose: anything larger reads as a broken sticky header.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const dim = useTransform(scrollYProgress, [0, 1], [0, 0.35]);

  return (
    <section ref={ref} className="relative">
      <div className="relative flex h-[92svh] max-h-[56rem] min-h-[44rem] w-full flex-col overflow-hidden">
        <motion.div
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 14, ease: [0.16, 1, 0.3, 1] }}
          style={reduced ? undefined : { y }}
          // Oversized and hung above the frame: the parallax translates this
          // layer down by 12% of its own height, and without the overflow that
          // would drag a bare edge into the top of the hero.
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

        {/* One multi-stop scrim doing three jobs at once: a dark floor for the
            copy, a mid clearing so the photograph survives, and a light top
            wash for the transparent nav. Mixed toward the brand blue rather
            than neutral black, which is what makes a stock photograph look
            commissioned rather than dimmed. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,20,45,0.88)_0%,rgba(6,20,45,0.64)_26%,rgba(6,20,45,0.12)_58%,rgba(6,20,45,0.44)_100%)]"
        />
        {/* Plus one anchor shaped to the copy rather than to the whole frame,
            so the building keeps its detail while the headline gets its
            ground. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(115%_85%_at_0%_100%,rgba(6,20,45,0.74)_0%,rgba(6,20,45,0.36)_42%,transparent_72%)]"
        />
        <motion.div
          aria-hidden
          style={reduced ? undefined : { opacity: dim }}
          className="absolute inset-0 bg-brand-blue-deep"
        />
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
            <h1 className="max-w-[14ch] font-display text-[clamp(2.5rem,7.2vw,5.5rem)] text-white">
              Stay somewhere worth <em className="italic">remembering</em>.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">
              Beautiful homes, thoughtful spaces and stays made for feeling at
              home.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 lg:mt-12"
          >
            <SearchPanel locations={locations} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
