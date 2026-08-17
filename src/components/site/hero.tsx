"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  SearchPanel, type SearchLocation,
} from "@/components/site/search-panel";

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
    <section className="relative">
      <div className="relative flex h-[88svh] max-h-[54rem] min-h-[44rem] w-full flex-col overflow-hidden">
        {/* One slow settle on load — enough to feel alive, no looping drift. */}
        <motion.div
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 14, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
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
            the transparent nav — while leaving the photograph legible. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,14,12,0.86)_0%,rgba(12,14,12,0.62)_26%,rgba(12,14,12,0.12)_58%,rgba(12,14,12,0.42)_100%)]"
        />
        {/* Plus one anchor, shaped to the copy rather than to the whole frame.
            Gandhi Hall is mid-tone and heavily ornamented exactly where the
            headline sits, and a flat left-hand wash would have dulled the domes
            to get there. A radial pinned to the bottom-left corner darkens only
            the text block and falls off before it reaches the towers. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(115%_85%_at_0%_100%,rgba(12,14,12,0.72)_0%,rgba(12,14,12,0.34)_42%,transparent_72%)]"
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
            <p className="text-[0.6875rem] font-semibold tracking-[0.2em] text-white/70 uppercase">
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
