"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { SearchPanel } from "@/components/site/search-panel";

export function Hero({
  image,
  stats,
}: {
  image: string;
  stats: { homes: number; rating: number | null; reviews: number };
}) {
  return (
    <section className="relative">
      <div className="relative h-[78svh] min-h-[34rem] w-full overflow-hidden lg:h-[74svh]">
        {/* One slow settle on load — enough to feel alive, no looping drift. */}
        <motion.div
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 12, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/65" />

        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-5 pb-14 sm:px-6 lg:justify-center lg:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            <p className="text-[0.6875rem] font-semibold tracking-[0.2em] text-white/70 uppercase">
              Boutique home stays · Indore
            </p>
            <h1 className="mt-3.5 font-heading text-[2.5rem] leading-[1.04] text-white sm:text-[3.25rem] lg:text-[3.75rem]">
              Stay somewhere worth remembering.
            </h1>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-white/80 sm:text-base">
              Beautiful homes, thoughtful spaces and stays made for feeling at
              home.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/75">
              <span>
                <span className="font-semibold text-white">{stats.homes}</span>{" "}
                homes across the city
              </span>
              {stats.rating !== null && (
                <span className="flex items-center gap-1.5">
                  <Star className="size-3.5 fill-white text-white" />
                  <span className="font-semibold text-white">
                    {stats.rating.toFixed(1)}
                  </span>
                  from {stats.reviews} reviews
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 -mt-10 lg:-mt-14"
        >
          <SearchPanel />
        </motion.div>
      </div>
    </section>
  );
}
