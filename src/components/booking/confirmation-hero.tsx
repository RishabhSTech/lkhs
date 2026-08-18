"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function ConfirmationHero({ guestName }: { guestName: string }) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid size-14 place-items-center rounded-full bg-brand-blue"
      >
        <motion.span
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Check className="size-7 text-brand-ivory" strokeWidth={2.5} />
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="mt-6 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
          Your stay is confirmed.
        </h1>
        <p className="mt-3 text-[0.9375rem] text-muted-foreground">
          Thanks, {guestName.split(" ")[0]}. Everything&apos;s set — here are the
          details.
        </p>
      </motion.div>
    </div>
  );
}
