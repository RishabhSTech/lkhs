"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { SearchPanel } from "@/components/site/search-panel";

export function Hero({ image }: { image: string }) {
  return (
    <section className="relative">
      <div className="relative min-h-[86svh] w-full overflow-hidden lg:min-h-[80svh]">
        {/* Slow, single-direction drift — enough to feel alive, not enough to distract. */}
        <motion.div
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 14, ease: "easeOut" }}
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

        <div className="absolute inset-0 bg-gradient-to-b from-brand-ink/55 via-brand-ink/25 to-brand-ink/70" />

        <div className="relative mx-auto flex min-h-[86svh] w-full max-w-6xl flex-col justify-end px-4 pt-24 pb-10 sm:px-6 lg:min-h-[80svh] lg:justify-center lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <p className="text-[0.6875rem] font-semibold tracking-[0.22em] text-brand-ivory/70 uppercase">
              Lime Kraft Home Stays · Indore
            </p>
            <h1 className="mt-4 font-heading text-[2.75rem] leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Stay somewhere worth remembering.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-brand-ivory/85 sm:text-lg">
              Beautiful homes, thoughtful spaces and stays made for feeling at
              home.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Desktop: panel floats over the hero edge. Mobile: stacked below it. */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 -mt-8 lg:-mt-20"
        >
          <SearchPanel />
        </motion.div>
      </div>
    </section>
  );
}
